import type { CivilDate } from './korean';
const formatter=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
export interface CivilTime extends CivilDate {hour:number; minute:number}
export function seoulParts(ms:number):CivilTime {
  const parts=formatter.formatToParts(new Date(ms));
  const n=(type:string)=>Number(parts.find(p=>p.type===type)!.value);
  return {year:n('year'),month:n('month'),day:n('day'),hour:n('hour'),minute:n('minute')};
}
// 1962년 이후 한국은 UTC+9, 1987·1988 서머타임에는 UTC+10.
// 실제 IANA 왕복값으로 후보를 검증하므로 gap/fold를 임의 선택하지 않는다.
export function possibleInstants(time:CivilTime):number[] {
  const naive=Date.UTC(time.year,time.month-1,time.day,time.hour,time.minute);
  return [9,10].map(offset=>naive-offset*3600000).filter(ms=>{
    const p=seoulParts(ms);
    return Object.keys(time).every(k=>p[k as keyof CivilTime]===time[k as keyof CivilTime]);
  });
}
export function wallTimeToInstant(time:CivilTime):number {
  const candidates=possibleInstants(time);
  if(candidates.length===0) throw new Error('서머타임 전환으로 존재하지 않는 시각이에요. 기록을 확인하거나 시간 모름을 선택해 주세요.');
  if(candidates.length>1) throw new Error('서머타임 종료로 두 번 존재하는 시각이에요. 이 시각은 정확 계산을 제한해요. 시간 모름으로 기본 풀이를 볼 수 있어요.');
  return candidates[0];
}
export function standardParts(ms:number):CivilTime {
  const d=new Date(ms+9*3600000);
  return {year:d.getUTCFullYear(),month:d.getUTCMonth()+1,day:d.getUTCDate(),hour:d.getUTCHours(),minute:d.getUTCMinutes()};
}
