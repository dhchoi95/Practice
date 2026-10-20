import type { InterpretationRule } from './schema';

// Deliberately limited to vocabulary used in these manuscripts; not a grammar checker.
const terms=['목','화','토','금','수','비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
export function particleErrors(text:string):string[]{
  const errors:string[]=[];
  for(const term of terms){
    const final=term.charCodeAt(term.length-1)-0xac00;
    const hasBatchim=final%28!==0;
    const wrong=hasBatchim?['가','는','를']:['이','은','을'];
    for(const particle of wrong){
      const pattern=new RegExp(`(?:^|[\\s“‘(])${term}${particle}(?=[\\s.,!?…'”’)]|$)`,'g');
      if(pattern.test(text))errors.push(`${term}${particle}`);
    }
  }
  return errors;
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
