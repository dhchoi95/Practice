import type { InterpretationRule,ContentCategory } from './schema';
import type { Features,BirthInput } from '../saju/types';
import { calculateSaju } from '../saju/calculate';
import { interpret } from './engine';
export interface EditorialCase {id:string;category:ContentCategory;birth?:Partial<BirthInput>;features?:Features;expectedRuleIds:string[];forbiddenRuleIds?:string[];forbiddenRulePrefixes?:string[];expectedClaimIds?:string[];forbiddenClaimIds?:string[];forbiddenClaimPrefixes?:string[];limited?:boolean;reviewSource?:string;issueIds?:string[];inputKind?:'synthetic-birth-runtime'|'partial-features'}
/** Only for complete output from calculateSaju; never fills partial test fixtures with zero. */
export function runtimeFeatureErrors(features:Features):string[]{
  const errors:string[]=[],count=features['natal.knownCount'];
  const counts=['목','화','토','금','수'].map(e=>features[`elements.${e}` as keyof Features]);
  if(counts.some(n=>typeof n!=='number'||!Number.isInteger(n)||n<0)||counts.reduce<number>((a,n)=>a+Number(n),0)!==count)errors.push('확정 글자 수와 오행 집계 불일치');
  const groups=(['peer','output','wealth','order','resource'] as const).map(g=>features[`relations.${g}`]);
  if(features['natal.dayStem']==null){if(groups.some(g=>g!==null))errors.push('미확정 일간의 관계 집계');}
  else if(groups.some(g=>typeof g!=='number'||!Number.isInteger(g)||g<0)||groups.reduce<number>((a,g)=>a+Number(g),0)!==Number(count)/2-1)errors.push('확정 천간의 관계 집계 불일치');
  return errors;
}
export function evaluateEditorialCase(c:EditorialCase,rules:InterpretationRule[]){
  const features=c.birth?calculateSaju({year:1992,month:5,day:15,calendar:'solar',leap:false,unknownTime:false,hour:10,minute:30,nickname:'',...c.birth},{now:()=>new Date('2026-10-20T03:00:00Z')}).features:c.features??{};
  const repo={all:()=>rules,find:(system:string,categories:ContentCategory[])=>rules.filter(r=>r.system===system&&categories.includes(r.category))};
  const reading=interpret('saju',c.category,features,repo);
  const reversed=interpret('saju',c.category,features,{...repo,find:(s,cats)=>repo.find(s,cats).reverse()});
  const errors:string[]=[];
  if(c.birth)errors.push(...runtimeFeatureErrors(features));
  for(const id of c.expectedRuleIds)if(!reading.appliedRuleIds.includes(id))errors.push(`미선택: ${id}`);
  for(const id of c.forbiddenRuleIds??[])if(reading.appliedRuleIds.includes(id))errors.push(`잘못 선택: ${id}`);
  for(const prefix of c.forbiddenRulePrefixes??[])if(reading.appliedRuleIds.some(id=>id.startsWith(prefix)))errors.push(`금지 계열 선택: ${prefix}`);
  const claims=[...new Set(reading.ruleTraces.flatMap(t=>t.claimIds))];
  for(const id of c.expectedClaimIds??[])if(!claims.includes(id))errors.push(`미선택 주장: ${id}`);
  for(const id of c.forbiddenClaimIds??[])if(claims.includes(id))errors.push(`금지 주장: ${id}`);
  for(const prefix of c.forbiddenClaimPrefixes??[])if(claims.some(id=>id.startsWith(prefix)))errors.push(`금지 주장 계열: ${prefix}`);
  if(c.limited!==undefined&&Boolean(reading.limitations.length)!==c.limited)errors.push('제한 안내 불일치');
  if(JSON.stringify(reading)!==JSON.stringify(reversed))errors.push('배열 순서에 따른 결과 변화');
  const irrelevant=interpret('saju',c.category,{...features,'light.variant':'unused-evaluation-token'},repo);
  if(JSON.stringify(reading)!==JSON.stringify(irrelevant))errors.push('무관 feature에 따른 결과 변화');
  return {id:c.id,inputKind:c.birth?'synthetic-birth-runtime':'partial-features',reviewSource:c.reviewSource??'implementation-author',issueIds:c.issueIds??[],passed:errors.length===0,errors,dayStem:features['natal.dayStem'],ruleIds:reading.appliedRuleIds,claimIds:claims,bodyLength:reading.sections.flatMap(s=>s.paragraphs).join('').length};
}
