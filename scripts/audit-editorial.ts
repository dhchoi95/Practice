import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import raw from '../src/content/rules.json';
import drafts from '../content-review/compound-drafts.json';
import reviews from '../content-review/reviews.json';
import { validateRules } from '../src/domain/interpretation/repository';
import { canonicalContent } from '../src/domain/interpretation/review';
import { reasoningFor } from '../src/domain/interpretation/reasoning';
import { sharedExplanations } from '../src/domain/interpretation/shared';
import { interpretationBases } from '../src/domain/interpretation/knowledge';
import { interpret,selectRules } from '../src/domain/interpretation/engine';
import { targetPeriod } from '../src/domain/fortune/period';
import { categories } from '../src/config/site';
import type { Features } from '../src/domain/saju/types';
import type { ContentCategory } from '../src/domain/interpretation/schema';
const baseline=JSON.parse(await fs.readFile('content-review/editorial-baseline-1.2.0.json','utf8'));
const before=validateRules(baseline.rules),rules=validateRules(raw),oldDrafts=validateRules(baseline.drafts),newDrafts=validateRules(drafts);
const hash=(v:unknown)=>createHash('sha256').update(canonicalContent(v)).digest('hex');
const protectedKeys=['id','system','category','section','conditions','requires','exclusions','priority','specificity','rankingFeature','exclusiveGroup','semanticAxis','stance','sharedExplanationId','relatedGlossaryKeys','reviewStatus','provenance'] as const;
const errors:string[]=[];
const changes:{id:string;system:string;category:ContentCategory;changed:boolean;changedFields:string[];beforeVersion:string;afterVersion:string;beforeHash:string;afterHash:string;editorialStatus:string;reason:string}[]=[];
for(const [i,rule] of [...rules,...newDrafts].entries()){
  const old=i<rules.length?before.find(r=>r.id===rule.id):oldDrafts.find(r=>r.id===rule.id);
  if(!old){errors.push(`ID 변경: ${rule.id}`);continue;}
  for(const key of protectedKeys)if(canonicalContent(rule[key])!==canonicalContent(old[key]))errors.push(`보존 필드 변경: ${rule.id}.${key}`);
  if(rule.evidence?.basisKey!==old.evidence?.basisKey||canonicalContent(rule.reasoning?.premises)!==canonicalContent(old.reasoning?.premises))errors.push(`계산 전제 변경: ${rule.id}`);
  const fields=Object.keys(rule).filter(key=>canonicalContent(rule[key as keyof typeof rule])!==canonicalContent(old[key as keyof typeof old]));
  changes.push({id:rule.id,system:rule.system,category:rule.category,changed:fields.length>0,changedFields:fields,beforeVersion:old.contentVersion,afterVersion:rule.contentVersion,beforeHash:hash(old),afterHash:hash(rule),editorialStatus:fields.length?'implementation-edited-pending-independent-editor':'read-retained-not-new-review',reason:fields.length?'생활 장면을 먼저 쓰고 추상적 설명·중복·상황 전제를 교정. 계산·선택 필드는 보존.':'짧고 필요한 설명이나 정확한 안내여서 유지. 검토한 수와 수정한 수를 구분.'});
}
if(before.length!==rules.length||oldDrafts.length!==newDrafts.length)errors.push('원고 수 변경');
if(JSON.stringify(reviews.slice(0,baseline.reviews.length))!==JSON.stringify(baseline.reviews))errors.push('기존 검토 기록 변경');
const words=['보세요','수 있어요','확인','상징','살펴','조건','소재','관점'];
const counts=(rows:typeof rules)=>Object.fromEntries(words.map(word=>[word,{occurrences:rows.reduce((n,r)=>n+r.paragraphs.join(' ').split(word).length-1,0),records:rows.filter(r=>r.paragraphs.join(' ').includes(word)).length}]));
const publicEdits=JSON.parse(await fs.readFile('content-review/public-text-edits-1.3.0.json','utf8'));
for(const edit of publicEdits){
  const live=[...sharedExplanations,...interpretationBases].find(r=>r.id===edit.id);
  const old=[...baseline.shared,...baseline.bases].find((r:{id:string})=>r.id===edit.id);
  if(!live||hash(live)!==edit.afterHash||hash(old)!==edit.beforeHash||edit.status!=='implemented-pending-independent-review')errors.push(`공개 설명 편집 해시 확인: ${edit.id}`);
}
const menus=categories.map(c=>({slug:c.slug,contentCategory:c.content,system:c.system,reviewed:true,uniqueRecords:changes.filter(r=>r.system===c.system&&r.category===c.content).map(r=>r.id),note:'메뉴 포함 여부와 고유 원고 변경 수를 별도로 집계. 독립 승인 아님.'}));
const assembled=JSON.parse(await fs.readFile('reports/content-improvement-1.3.0/assembled-evaluation.json','utf8'));
const selectionChecks=assembled.profiles.map((profile:{profileId:string;features:Features;reading:ReturnType<typeof interpret>;})=>{
  const cat:ContentCategory=profile.profileId.includes('annual')?'year':profile.profileId.includes('general')?'general':profile.profileId.includes('career')?'careerMoney':'love';
  const cats:ContentCategory[]=cat==='general'?['general','personality','careerMoney','love','relationships']:[cat];
  const candidate=(data:typeof rules)=>data.filter(r=>r.system==='saju'&&cats.includes(r.category)&&(cat!=='general'||r.category==='general'||r.section==='overview'));
  const features=cat==='year'?{...profile.features,...targetPeriod('year',Number(profile.features['natal.dayStem']),{now:()=>new Date('2026-10-20T03:00:00Z')}).segments[0].features}:profile.features;
  const a=selectRules(candidate(before),features).selected.map(r=>r.id),b=selectRules(candidate(rules),features).selected.map(r=>r.id);
  if(JSON.stringify(a)!==JSON.stringify(b))errors.push(`후보 선택 변화: ${profile.profileId}`);
  const r=profile.reading;
  for(const trace of r.ruleTraces){
    const rule=rules.find(x=>x.id===trace.ruleId)!;
    const text=[...(rule.sharedExplanationId?[sharedExplanations.find(s=>s.id===rule.sharedExplanationId)!.text]:[]),...rule.paragraphs];
    const section=r.sections.find(s=>s.id===trace.ruleId);
    if(!section||trace.displayedParagraphIndexes.some(i=>!section.paragraphs.includes(text[i])))errors.push(`표시 문단 이력: ${trace.ruleId}`);
    if(trace.displayedTipIndexes.some(i=>!r.practicalTips.includes(rule.practicalTips[i])))errors.push(`표시 조언 이력: ${trace.ruleId}`);
    const reasoning=reasoningFor(rule),claims=[...reasoning.interpretations.map(c=>c.id),...reasoning.proposals.filter(c=>c.tipIndexes.some(i=>trace.displayedTipIndexes.includes(i))).map(c=>c.id)];
    if(JSON.stringify(claims)!==JSON.stringify(trace.claimIds))errors.push(`표시 주장 이력: ${trace.ruleId}`);
  }
  return {profileId:profile.profileId,selectedBefore:a,selectedAfter:b,renderedAfter:r.appliedRuleIds,traceChecked:true};
});
const exampleIds=['core-general-7','core-personality-7','core-love-7','core-careermoney-7','core-relationships-7','core-single-7','core-mind-7','period-year-4','period-month-4','period-day-4','light-zodiac-0','light-constellation-0','light-bloodtype-0','element-0-love','relation-careermoney-output','unknown-love','core-general-0','core-personality-0','core-love-3','element-1-love','absence-2','relation-love-output','period-year-8','relation-output'];
const examples=exampleIds.map(id=>{const old=before.find(r=>r.id===id)!,r=rules.find(r=>r.id===id)!;return {id,field:'title / paragraphs / practicalTips',before:{title:old.title,paragraphs:old.paragraphs,tips:old.practicalTips},after:{title:r.title,paragraphs:r.paragraphs,tips:r.practicalTips},reason:'생활 장면'+'·행동을 쉽게 설명하고 역할·상황·시간 범위를 구분. 제목은 필요한 곳만 줄임.',meaningAndLimitsPreserved:'보존 필드 대조 통과. 전통 상징·집계는 해석의 소재이며 실제 행동·미래를 알아낸 사실이 아님. 독립 의미 검토 대기.'};});
const report={passed:!errors.length,baselineVersion:baseline.version,releaseVersion:'1.3.0',scope:{normal:rules.length,shared:sharedExplanations.length,bases:interpretationBases.length,drafts:newDrafts.length},normalChanged:changes.slice(0,210).filter(r=>r.changed).length,normalRetained:changes.slice(0,210).filter(r=>!r.changed).length,frequencyScope:'210 normal records; body paragraphs only; excludes titles/tips/evidence/shared policy; identical substring method before and after',frequency:{before:counts(before),after:counts(rules)},menus,changes,examples,selectionChecks,publicTextEdits:publicEdits,history:{originalRecordsPreserved:baseline.reviews.length,allRecords:reviews.length},errors,meaning:'편집 증거·구조 검사입니다. 문체 점수·AI 판별·독립 의미 승인·예측 적중률이 아닙니다.'};
await fs.mkdir('reports/content-improvement-1.3.0',{recursive:true});
await fs.writeFile('reports/content-improvement-1.3.0/editorial-audit.json',JSON.stringify(report,null,2)+'\n');
await fs.writeFile('reports/content-improvement-1.3.0/editorial-before-after.md',examples.map(e=>`## ${e.id}\n\n필드: ${e.field}\n\n수정 전: ${e.before.title}\n\n${e.before.paragraphs.join('\n\n')}\n\n제안: ${e.before.tips.join(' / ')}\n\n수정 후: ${e.after.title}\n\n${e.after.paragraphs.join('\n\n')}\n\n제안: ${e.after.tips.join(' / ')}\n\n이유: ${e.reason}\n\n뜻과 한계: ${e.meaningAndLimitsPreserved}`).join('\n\n')+'\n');
console.log(`${report.passed?'PASS':'FAIL'} · 정상 수정 ${report.normalChanged} / 유지 ${report.normalRetained} · 메뉴 ${menus.length} · 전후 ${examples.length}쌍 · 원래 검토 ${baseline.reviews.length}개 보존`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
