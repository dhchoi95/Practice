import { dayPillar,pillarsAt } from '../saju/calculate';
import { standardParts } from '../calendar/timezone';
import type { TimePolicy } from './types';
import { isoDate } from '../calendar/korean';
export const timePolicyNames:Record<TimePolicy,string>={standard:'한국 표준시', 'mean-solar':'지방평균태양시','true-solar':'진태양시'};
/** NOAA short Fourier approximation. Positive E = apparent minus mean solar time.
 * gamma uses 365 days, as in the published short formula; UTC fractional day.
 * Not the high-precision astronomical definition or a certified minute error bound. */
export function equationOfTime(instant:number):number {
 const d=new Date(instant),day=(instant-Date.UTC(d.getUTCFullYear(),0,1))/86400000;
 const gamma=2*Math.PI/365*(day-.5);
 return 229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
}
export function correction(instant:number,policy:TimePolicy,longitude?:number){
 if(policy==='standard')return {longitudeMinutes:0,equationMinutes:0,total:0};
 if(longitude===undefined||!Number.isFinite(longitude)||longitude<124||longitude>132)throw new Error('태양시를 계산하려면 국내 출생 도시를 선택해 주세요.');
 const longitudeMinutes=4*(longitude-135),equationMinutes=policy==='true-solar'?equationOfTime(instant):0;
 return {longitudeMinutes,equationMinutes,total:longitudeMinutes+equationMinutes};
}
export function advancedPillarsAt(instant:number,policy:TimePolicy,longitude?:number){
 const base=pillarsAt(instant); // year/month always compare the SAME actual UTC instant to terms.
 const shift=correction(instant,policy,longitude),shifted=instant+shift.total*60000;
 const t=standardParts(shifted),day=dayPillar(t),hourBranch=Math.floor((t.hour+1)/2)%12;
 return {...base,day,hour:{stem:(day.stem%5*2+hourBranch)%10,branch:hourBranch}};
}
export function timeText(ms:number){const t=standardParts(ms);return `${isoDate(t)} ${String(t.hour).padStart(2,'0')}:${String(t.minute).padStart(2,'0')}`;}
