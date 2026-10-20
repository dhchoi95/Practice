import { isoDate, toLunar, toSolar, type CivilDate } from '../calendar/korean';
import { possibleInstants, standardParts, wallTimeToInstant } from '../calendar/timezone';
import { solarTerms } from '../calendar/terms';
import { branchElements, elements, relationGroup, stemElements } from './tables';
import type { BirthInput, NormalizedBirthInput, Pillar, SajuCalculationResult } from './types';
import { validateBirth } from '@/lib/validation';
import type { Clock } from '@/lib/clock';
const mod=(v:number,n:number)=>(v%n+n)%n;
export function dayPillar(date:CivilDate):Pillar {
  // Gregorian JDN 정수. 2000-01-07=갑자(독립 고정 기준)와 JDN+49의 합동식.
  const jdn=Math.floor(Date.UTC(date.year,date.month-1,date.day)/86400000)+2440588;
  return {stem:mod(jdn+49,10),branch:mod(jdn+49,12)};
}
export function pillarsAt(instant:number) {
  const t=standardParts(instant);
  const terms=[...solarTerms(t.year-1),...solarTerms(t.year)];
  const lichun=terms.find(s=>s.solarYear===t.year&&s.name==='입춘')!;
  const y=t.year-(instant<lichun.instant?1:0);
  const year={stem:mod(y-4,10),branch:mod(y-4,12)};
  const latest=terms.filter(s=>s.instant<=instant).at(-1)!;
  const month={stem:mod((year.stem%5+1)*2+latest.monthIndex,10),branch:mod(latest.monthIndex+2,12)};
  const day=dayPillar(t);
  const hourBranch=Math.floor((t.hour+1)/2)%12;
  const hour={stem:(day.stem%5*2+hourBranch)%10,branch:hourBranch};
  return {year,month,day,hour};
}
const equal=(a:Pillar|null,b:Pillar)=>a!==null&&a.stem===b.stem&&a.branch===b.branch;
export function calculateSaju(value:BirthInput,clock?:Clock):SajuCalculationResult {
  const input=validateBirth(value,clock);
  const solar=input.calendar==='lunar'?toSolar(input):{year:input.year,month:input.month,day:input.day};
  const lunar=toLunar(solar);
  const limitations:string[]=[];
  let normalizedInput:NormalizedBirthInput;
  let pillars:SajuCalculationResult['pillars'];
  if(!input.unknownTime){
    const instant=wallTimeToInstant({...solar,hour:input.hour!,minute:input.minute!});
    const standardTime=standardParts(instant);
    const dstAdjusted=standardTime.hour!==input.hour || isoDate(standardTime)!==isoDate(solar);
    normalizedInput={solar,lunar,instant,standardTime,unknownTime:false,dstAdjusted};
    pillars=pillarsAt(instant);
    if(dstAdjusted) limitations.push('출생 당시 서머타임 시계에서 1시간을 빼 한국 표준시로 계산했어요. 날짜도 달라질 수 있어요.');
  }else{
    // 가능한 하루 전체를 검사: 30분 표본 + 절입 직전·정확한 절입 + 자정 양쪽.
    const samples:number[]=[];
    for(let min=0;min<1440;min+=30) samples.push(...possibleInstants({...solar,hour:Math.floor(min/60),minute:min%60}));
    samples.push(...possibleInstants({...solar,hour:23,minute:59}));
    const first=Math.min(...samples),last=Math.max(...samples);
    for(const term of [...solarTerms(solar.year-1),...solarTerms(solar.year)]) if(term.instant>=first&&term.instant<=last) samples.push(term.instant-1,term.instant);
    const all=samples.map(pillarsAt);
    pillars={year:all[0].year,month:all[0].month,day:all[0].day,hour:null};
    for(const key of ['year','month','day'] as const) if(!all.every(p=>equal(pillars[key],p[key]))) pillars[key]=null;
    normalizedInput={solar,lunar,instant:null,standardTime:null,unknownTime:true,dstAdjusted:false};
    limitations.push('태어난 시간을 몰라 시주를 제외한 기본 풀이를 보여드려요.');
    if(!pillars.year||!pillars.month) limitations.push('절입 경계 날짜여서 출생 시각에 따라 연주·월주가 달라질 수 있어요. 미확정 기둥은 집계와 풀이에서 제외해요.');
    if(!pillars.day) limitations.push('서머타임을 표준시로 환산하면 날짜가 달라질 수 있어 일주도 미확정이에요. 정확한 출생 시각을 입력하면 더 살펴볼 수 있어요.');
  }
  const known=Object.values(pillars).filter((p):p is Pillar=>p!==null);
  const counts=Object.fromEntries(elements.map(e=>[e,0])) as Record<typeof elements[number],number>;
  for(const p of known){counts[stemElements[p.stem]]++;counts[branchElements[p.branch]]++;}
  const features:SajuCalculationResult['features']={
    'natal.dayStem':pillars.day?.stem??null,'natal.dayElement':pillars.day?stemElements[pillars.day.stem]:null,
    'natal.knownCount':known.length*2,'natal.hourKnown':pillars.hour!==null,
    'natal.boundary':!pillars.year||!pillars.month||!pillars.day,'natal.dstAdjusted':normalizedInput.dstAdjusted,
  };
  for(const e of elements) features[`elements.${e}`]=counts[e];
  for(const group of ['peer','output','wealth','order','resource'] as const){
    features[`relations.${group}`]=pillars.day?known.filter(p=>p!==pillars.day&&relationGroup(pillars.day!.stem,p.stem)===group).length:null;
  }
  return {normalizedInput,pillars,dayMaster:pillars.day?.stem??null,features,limitations,policyVersion:'KST-MIDNIGHT-1.0',engineVersion:'haru-1.0 / lunar-typescript-1.8.6 / korean-lunar-calendar-0.4.0'};
}
