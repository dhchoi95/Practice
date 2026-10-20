import { seoulDate, type Clock } from '@/lib/clock';
import { solarTerms } from '../calendar/terms';
import { standardParts } from '../calendar/timezone';
import { pillarsAt } from '../saju/calculate';
import { tenGod } from '../saju/tables';
import type { Features, Pillar } from '../saju/types';
export type PeriodKind='year'|'month'|'day';
export interface PeriodSegment {start:number;end:number;label:string;pillar:Pillar;features:Features}
export interface TargetPeriod {kind:PeriodKind;label:string;date:string;segments:PeriodSegment[]}
const dateLabel=(ms:number)=>{const p=standardParts(ms);return `${p.year}년 ${p.month}월 ${p.day}일 ${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`;};
export function targetPeriod(kind:PeriodKind,dayStem:number|null,clock?:Clock):TargetPeriod {
  const today=seoulDate(clock),[year,month,day]=today.split('-').map(Number);
  if(year<1962||year>2050) throw new Error('기간 운세는 한국시간 1962~2050년을 지원해요. 기본 사주풀이는 계속 볼 수 있어요.');
  const start=Date.UTC(year,kind==='year'?0:month-1,kind==='day'?day:1,-9);
  const end=kind==='year'?Date.UTC(year+1,0,1,-9):kind==='month'?Date.UTC(year,month,1,-9):start+86400000;
  const boundaries=solarTerms(year).filter(t=>t.instant>start&&t.instant<end&&(kind==='year'?t.name==='입춘':kind==='month')).map(t=>t.instant);
  const points=[start,...boundaries,end];
  const segments=points.slice(0,-1).map((ms,i)=>{
    const pillars=pillarsAt(ms);
    const pillar=pillars[kind];
    return {start:ms,end:points[i+1],label:`${dateLabel(ms)}부터 ${dateLabel(points[i+1])} 전까지`,pillar,
      features:{'period.kind':kind,'period.relation':dayStem===null?null:tenGod(dayStem,pillar.stem)} satisfies Features};
  });
  return {kind,date:today,label:kind==='year'?`${year}년`:kind==='month'?`${year}년 ${month}월`:`${year}년 ${month}월 ${day}일`,segments};
}
