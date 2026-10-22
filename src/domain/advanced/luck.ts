import { solarTerms } from '../calendar/terms';
import type { Pillar } from '../saju/types';
import type { Luck } from './types';
export function addCalendar(ms:number,years:number,months=0){
 const d=new Date(ms+9*3600000),y=d.getUTCFullYear()+years,m=d.getUTCMonth()+months;
 const first=new Date(Date.UTC(y,m,1,d.getUTCHours(),d.getUTCMinutes(),d.getUTCSeconds(),d.getUTCMilliseconds()));
 const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 first.setUTCDate(Math.min(d.getUTCDate(),last));return first.getTime()-9*3600000;
}
export function calculateLuck(instant:number,yearStem:number,month:Pillar,classification:'male'|'female'|undefined):Luck[]{
 const y=new Date(instant).getUTCFullYear();
 const terms=[...solarTerms(Math.max(1961,y-1)),...solarTerms(y),...solarTerms(Math.min(2051,y+1))];
 const forward=classification===undefined?undefined:(yearStem%2===0)===(classification==='male');
 return (forward===undefined?[true,false]:[forward]).map(f=>{
  // Equality belongs to the birth boundary and has zero gap in BOTH directions.
  const term=f?terms.find(t=>t.instant>=instant)!:terms.filter(t=>t.instant<=instant).at(-1)!;
  const gapMilliseconds=Math.abs(term.instant-instant),symbolic=Math.round(gapMilliseconds*120);
  const years=Math.floor(symbolic/(360*86400000)),months=Math.floor(symbolic/(30*86400000))%12,days=Math.floor(symbolic/86400000)%30,remainderMilliseconds=symbolic%86400000;
  const start=addCalendar(instant,years,months)+days*86400000+remainderMilliseconds;
  const cycles=Array.from({length:10},(_,i)=>({index:i+1,pillar:{stem:(month.stem+(f?1:-1)*(i+1)+110)%10,branch:(month.branch+(f?1:-1)*(i+1)+132)%12},start:addCalendar(start,i*10),end:addCalendar(start,(i+1)*10)}));
  return {direction:f?'forward' as const:'reverse' as const,term:{name:term.name,instant:term.instant},gapMilliseconds,conversion:{years,months,days,remainderMilliseconds},start,cycles,method:'YEAR-POLARITY-12JIE-3D1Y-CALENDAR-1.0'};
 });
}
export function activeLuck(luck:Luck,date:number){return luck.cycles.find(c=>c.start<=date&&date<c.end)??null;}
