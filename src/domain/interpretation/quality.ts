import type { InterpretationRule } from './schema';
import { hasBatchim } from '@/lib/korean';
import { interpretationBases,appliedFact } from './knowledge';
import { sharedExplanations } from './shared';

// Deliberately limited to vocabulary used in these manuscripts; not a grammar checker.
const terms=['갑','을','병','정','무','기','경','신','임','계','갑목','을목','병화','정화','무토','기토','경금','신금','임수','계수','목','화','토','금','수','비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인','관리','사이','돌봄','표현','관계','직업','재물'];
export function particleErrors(text:string):string[]{
  const errors:string[]=[];
  for(const term of terms){
    const wrong=hasBatchim(term)?['가','는','를','예요']:['이','은','을','이에요'];
    for(const particle of wrong){
      const pattern=new RegExp(`(?:^|[\\s“‘(])${term}${particle}(?=[\\s.,!?…'”’)]|$)`,'g');
      if(pattern.test(text))errors.push(`${term}${particle}`);
    }
  }
  return errors;
}
/** Selected-vocabulary grammar audit. Context and factual truth require separate review. */
export function languageAudit(rules:InterpretationRule[]):string[]{
  const fields:{id:string;text:string}[]=[];
  for(const r of rules){
    fields.push({id:`${r.id}.title`,text:r.title});
    r.paragraphs.forEach((text,i)=>fields.push({id:`${r.id}.paragraphs.${i}`,text}));
    r.practicalTips.forEach((text,i)=>fields.push({id:`${r.id}.tips.${i}`,text}));
    if(r.evidence)for(const [key,text] of Object.entries(r.evidence))fields.push({id:`${r.id}.evidence.${key}`,text});
    if(r.reasoning)for(const c of r.reasoning.interpretations)fields.push({id:c.id,text:c.text});
  }
  for(const s of sharedExplanations)fields.push({id:s.id,text:s.text});
  for(const b of interpretationBases){
    for(const key of ['fact','editorialTheme','scope'] as const)fields.push({id:`${b.id}.${key}`,text:b[key]});
    fields.push({id:`${b.id}.generated`,text:appliedFact(b,{[b.feature]:b.value})});
  }
  return fields.flatMap(({id,text})=>particleErrors(text).map(e=>`${id}: ${e}`));
}
const topicNames=['나의 생활 전체','반복되는 나의 습관','관계에서 주고받는 표현','일의 과정과 비용','사람 사이의 역할','새로운 인연을 대하는 준비','하루를 보내는 리듬','정통사주','성격풀이','연애사주','직업·재물','대인관계','솔로사주','마음돌봄'];
export function normalizeTemplate(text:string):string{
  for(const name of topicNames)text=text.replaceAll(name,'주제');
  return text.replace(/\b(?:general|personality|love|careerMoney|relationships|single|mind)\b/g,'주제').replace(/(?:목|화|토|금|수)(?=[이가은는의를]|\s)/g,'오행').replace(/[\s\p{P}\p{S}]+/gu,'');
}
function shingles(text:string){return new Set(Array.from({length:Math.max(0,text.length-11)},(_,i)=>text.slice(i,i+12)));}
/** Editorial warning promoted to a failure for the 35 topic supplements. */
export function templateDuplicates(rules:Pick<InterpretationRule,'id'|'paragraphs'>[]):string[]{
  const errors:string[]=[];
  const prepared=rules.map(r=>({id:r.id,text:normalizeTemplate(r.paragraphs.join(' ')),grams:shingles(normalizeTemplate(r.paragraphs.join(' ')))}));
  for(let i=0;i<prepared.length;i++)for(let j=i+1;j<prepared.length;j++){
    const a=prepared[i],b=prepared[j];
    const intersection=[...a.grams].filter(g=>b.grams.has(g)).length;
    const union=a.grams.size+b.grams.size-intersection;
    if(a.text===b.text||(union>0&&intersection/union>=0.75))errors.push(`${a.id} / ${b.id}`);
  }
  return errors;
}
