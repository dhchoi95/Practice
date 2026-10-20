import type { InterpretationRule,ContentCategory } from './schema';
import type { Features,BirthInput } from '../saju/types';
import { calculateSaju } from '../saju/calculate';
import { interpret } from './engine';
export interface EditorialCase {id:string;category:ContentCategory;birth?:Partial<BirthInput>;features?:Features;expectedRuleIds:string[];forbiddenRuleIds?:string[];forbiddenRulePrefixes?:string[];limited?:boolean}
export function evaluateEditorialCase(c:EditorialCase,rules:InterpretationRule[]){
  const features=c.birth?calculateSaju({year:1992,month:5,day:15,calendar:'solar',leap:false,unknownTime:false,hour:10,minute:30,nickname:'',...c.birth},{now:()=>new Date('2026-10-20T03:00:00Z')}).features:c.features??{};
  const repo={all:()=>rules,find:(system:string,categories:ContentCategory[])=>rules.filter(r=>r.system===system&&categories.includes(r.category))};
  const reading=interpret('saju',c.category,features,repo);
  const reversed=interpret('saju',c.category,features,{...repo,find:(s,cats)=>repo.find(s,cats).reverse()});
  const errors:string[]=[];
  for(const id of c.expectedRuleIds)if(!reading.appliedRuleIds.includes(id))errors.push(`미선택: ${id}`);
  for(const id of c.forbiddenRuleIds??[])if(reading.appliedRuleIds.includes(id))errors.push(`잘못 선택: ${id}`);
  for(const prefix of c.forbiddenRulePrefixes??[])if(reading.appliedRuleIds.some(id=>id.startsWith(prefix)))errors.push(`금지 계열 선택: ${prefix}`);
  if(c.limited!==undefined&&Boolean(reading.limitations.length)!==c.limited)errors.push('제한 안내 불일치');
  if(JSON.stringify(reading)!==JSON.stringify(reversed))errors.push('배열 순서에 따른 결과 변화');
  return {id:c.id,passed:errors.length===0,errors,dayStem:features['natal.dayStem'],ruleIds:reading.appliedRuleIds,bodyLength:reading.sections.flatMap(s=>s.paragraphs).join('').length};
}
