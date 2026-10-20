/** 현대 한글 음절로 끝나는 용어만 지원한다. 숫자·라틴 문자 발음은 추측하지 않는다. */
export function hasBatchim(term:string):boolean {
  const last=term.charCodeAt(term.length-1);
  if(!Number.isFinite(last)||last<0xac00||last>0xd7a3)throw new RangeError('어미 결합은 한글 음절로 끝나는 용어만 지원합니다.');
  return (last-0xac00)%28!==0;
}
export function koreanEnding(term:string,kind:'topic'|'subject'|'object'|'copula'):string {
  const endings={topic:['은','는'],subject:['이','가'],object:['을','를'],copula:['이에요','예요']} as const;
  return term+endings[kind][hasBatchim(term)?0:1];
}
