import type { Features } from '../saju/types';
import type { Condition, ContentCategory, ContentSystem, InterpretationRule } from './schema';
import { contentRepository,type ContentRepository } from './repository';
import { siteConfig } from '@/config/site';
import { sharedExplanations } from './shared';
export interface InterpretationSection {id:string;title:string;paragraphs:string[];tips:string[];basis:string[]}
export interface InterpretationResult {headline:string;keywords:string[];sections:InterpretationSection[];practicalTips:string[];appliedRuleIds:string[];sharedExplanationIds:string[];skippedRuleReasons:{id:string;reason:string}[];limitations:string[];contentVersion:string}
export function evaluate(c:Condition,f:Features):boolean {
  if('all'in c)return c.all.every(x=>evaluate(x,f));
  if('any'in c)return c.any.some(x=>evaluate(x,f));
  const actual=f[c.feature];
  if(actual===null||actual===undefined)return false;
  switch(c.op){
    case'eq':return actual===c.value;
    case'in':return Array.isArray(c.value)&&c.value.includes(actual);
    case'gte':return typeof actual==='number'&&typeof c.value==='number'&&actual>=c.value;
    case'lte':return typeof actual==='number'&&typeof c.value==='number'&&actual<=c.value;
  }
}
export function selectRules(candidates:InterpretationRule[],features:Features) {
  const skipped:{id:string;reason:string}[]=[],selected:InterpretationRule[]=[];
  const groups=new Set<string>(),axes=new Map<string,string>();
  const sorted=[...candidates].sort((a,b)=>b.priority-a.priority||b.specificity-a.specificity||a.id.localeCompare(b.id,'en'));
  for(const r of sorted){
    let reason='';
    if(r.requires.some(k=>features[k]===null||features[k]===undefined))reason='필수 정보 미확정';
    else if(!evaluate(r.conditions,features))reason='조건 불일치';
    else if(r.exclusions&&evaluate(r.exclusions,features))reason='제외 조건';
    else if(r.exclusiveGroup&&groups.has(r.exclusiveGroup))reason='독점 그룹';
    else if(r.semanticAxis&&r.stance&&axes.has(r.semanticAxis)&&axes.get(r.semanticAxis)!==r.stance)reason='의미 충돌';
    if(reason){skipped.push({id:r.id,reason});continue;}
    selected.push(r);
    if(r.exclusiveGroup)groups.add(r.exclusiveGroup);
    if(r.semanticAxis&&r.stance)axes.set(r.semanticAxis,r.stance);
  }
  return {selected,skipped};
}
const sectionOrder=['overview','detail','balance','context','practice'];
function basisFor(rule:InterpretationRule):string[] {
  if(rule.provenance.kind==='calculation-rule')return ['알려진 계산 항목의 범위와 개수를 설명해요.'];
  if(rule.requires.includes('period.relation'))return ['내 일간과 해당 기간 천간의 십성 관계를 해석의 소재로 삼았어요.'];
  if(rule.requires.includes('natal.dayStem'))return ['일간에 연결한 전통적 상징을 출발점으로 쓴 창작 풀이예요. 개인 전체를 설명하지 않아요.'];
  if(rule.system!=='saju')return ['직접 선택하거나 달력으로 분류한 유형에 맞춘 가벼운 창작 읽을거리예요.'];
  return ['확인 가능한 원국 feature에 맞춘 보완 설명이에요.'];
}
export function interpret(system:ContentSystem,category:ContentCategory,features:Features,repo:ContentRepository=contentRepository):InterpretationResult {
  const cats:ContentCategory[]=category==='general'?['general','personality','careerMoney','love','relationships']:[category];
  const candidates=repo.find(system,cats).filter(r=>category!=='general'||r.category==='general'||r.section==='overview');
  const {selected,skipped}=selectRules(candidates,features);
  const ordered=selected.sort((a,b)=>sectionOrder.indexOf(a.section)-sectionOrder.indexOf(b.section)||cats.indexOf(a.category)-cats.indexOf(b.category)||a.id.localeCompare(b.id,'en'));
  const seen=new Set<string>();
  let length=0;
  const sections=ordered.map(r=>({id:r.id,title:r.title,paragraphs:[...(r.sharedExplanationId?[sharedExplanations.find(s=>s.id===r.sharedExplanationId)!.text]:[]),...(category==='general'&&r.category!=='general'?r.paragraphs.slice(1,3):r.paragraphs)].filter(p=>{if(seen.has(p))return false;seen.add(p);return true;}),tips:r.practicalTips,basis:basisFor(r)})).filter(s=>{
    if(!s.paragraphs.length)return false;
    const size=s.paragraphs.join('').length;
    if(category==='general'&&length+size>1800)return false;
    length+=size;return true;
  });
  const insufficient=sections.length===0;
  const missingDay=system==='saju'&&(features['natal.dayStem']===null||features['natal.dayStem']===undefined);
  if(missingDay)sections.unshift({id:'unknown-day',title:'일간을 정하지 않고 읽는 안내',paragraphs:['입력한 날짜는 출생 시각에 따라 표준시의 날짜가 달라질 수 있어 일주와 일간을 확정하지 않았어요. 일간을 전제로 한 기본 성향·관계·기간 해석은 적용하지 않아요. 아래에 남은 내용은 확정된 글자의 집계 설명과 일반적인 생활 안내예요.'],tips:['출생 시각을 확인할 수 있다면 시·분을 보완하고 사주표의 미확정 표시가 바뀌는지 확인해 주세요.'],basis:['일간 미확정에 따른 계산 범위 안내이며 개별 성향 해석이 아니에요.']});
  if(insufficient&&!missingDay)sections.push({id:'neutral',title:'확정된 정보부터 살펴볼게요',paragraphs:['지금 확인한 정보로 적용할 수 있는 풀이가 충분하지 않아요. 계산표의 미확정 항목을 확인하거나 출생 시각을 보완해 주세요. 특별한 사주라서 풀이가 안 되는 것은 아니에요.'],tips:['입력 날짜와 시간 모름 선택을 확인해 보세요.'],basis:['필수 feature가 없거나 준비된 콘텐츠와 일치하지 않아 중립 안내를 보여드려요.']});
  const stemKeywords=[['성장','나의 기준','꾸준함'],['유연함','연결','나의 뜻'],['표현','활기','듣는 여유'],['집중','세심함','온기'],['안정','나의 속도','작은 변화'],['돌봄','구체적인 실천','균형'],['결정','분명함','대화'],['섬세함','마무리','적정선'],['탐색','넓은 관점','작은 시작'],['관찰','맥락','마음 표현']];
  const keywords=system!=='saju'?['가벼운 이야기','나의 경험','작은 실천']:missingDay?['확정된 정보','입력 확인']:['year','month','day'].includes(category)?['관계의 균형','일상의 계획','작은 실천']:(stemKeywords[Number(features['natal.dayStem'])]??['확정된 정보','입력 확인']);
  return {headline:missingDay?'일간이 미확정이라 기본 성향 풀이는 제한해요':sections[0].title,keywords,sections,practicalTips:[...new Set(sections.flatMap(r=>r.tips))].slice(0,5),appliedRuleIds:sections.filter(s=>s.id!=='neutral'&&s.id!=='unknown-day').map(r=>r.id),sharedExplanationIds:[...new Set(ordered.filter(r=>sections.some(s=>s.id===r.id)).flatMap(r=>r.sharedExplanationId?[r.sharedExplanationId]:[]))],skippedRuleReasons:skipped,limitations:[...(insufficient&&!missingDay?['풀이 콘텐츠가 부족해 중립 안내를 보여드려요.']:[]),...(missingDay?['일주를 확정할 수 없어 일간에 의존하는 문장은 제외했어요. 알려진 글자의 설명만 참고해 주세요.'] :[])],contentVersion:siteConfig.contentVersion};
}
