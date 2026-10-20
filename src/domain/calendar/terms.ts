import { Solar } from 'lunar-typescript';
export const termDefinitions=[
  ['小寒','소한',1,11],['立春','입춘',2,0],['惊蛰','경칩',3,1],['清明','청명',4,2],['立夏','입하',5,3],['芒种','망종',6,4],
  ['小暑','소서',7,5],['立秋','입추',8,6],['白露','백로',9,7],['寒露','한로',10,8],['立冬','입동',11,9],['大雪','대설',12,10],
] as const;
export interface SolarTerm {name:string; instant:number; monthIndex:number; solarYear:number}
const cache=new Map<number,SolarTerm[]>();
export function solarTerms(year:number):SolarTerm[] {
  if(year<1961 || year>2051) throw new Error('절기 계산 범위는 1961~2051년이에요.');
  const existing=cache.get(year); if(existing) return existing;
  const table=Solar.fromYmd(year,6,1).getLunar().getJieQiTable();
  const result=termDefinitions.map(([key,name,,monthIndex])=>{
    const s=table[key];
    if(!s || s.getYear()!==year) throw new Error('절기 자료를 읽지 못했어요. 입력 날짜를 확인해 주세요.');
    // ShouXingUtil.qiAccurate: TT→UT 후 +ONE_THIRD. 원자료 UTC+8 시계를 UTC로 변환.
    const instant=Date.UTC(s.getYear(),s.getMonth()-1,s.getDay(),s.getHour()-8,s.getMinute(),s.getSecond());
    return {name,instant,monthIndex,solarYear:year};
  }).sort((a,b)=>a.instant-b.instant);
  cache.set(year,result);
  return result;
}
