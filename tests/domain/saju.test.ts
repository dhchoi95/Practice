import { describe,it,expect } from 'vitest';
import KoreanLunarCalendar from 'korean-lunar-calendar';
import { dayPillar,calculateSaju,pillarsAt } from '@/domain/saju/calculate';
import { elements,stemNames,branchNames,stemElements,branchElements,tenGod,tenGodNames } from '@/domain/saju/tables';
import { targetPeriod } from '@/domain/fortune/period';
describe('separate table-based day-cycle oracle',()=>{
  // 한국 달력의 일진 테이블과 앱의 독자 JDN 합동식을 비교한다.
  // 음력 변환과는 독립성을 주장하지 않으며 사주 연·월주의 근거로도 쓰지 않는다.
  for(const year of [1962,1972,1987,1988,1992,2000,2002,2017,2024,2026])for(const month of [1,5,12])it(`day cycle ${year}/${month}/7`,()=>{
    const c=new KoreanLunarCalendar();c.setSolarDate(year,month,7);const p=dayPillar({year,month,day:7});
    expect(stemNames[p.stem]+branchNames[p.branch]+'일').toBe(c.getKoreanGapja().day);
  });
});
describe('midnight policy hand-calculated fixtures',()=>{
  const times=[['2000-01-07T22:59:00+09:00',0,0,1,11],['2000-01-07T23:00:00+09:00',0,0,0,0],['2000-01-07T23:59:00+09:00',0,0,0,0],['2000-01-08T00:00:00+09:00',1,1,2,0],['2000-01-08T00:59:00+09:00',1,1,2,0],['2000-01-08T01:00:00+09:00',1,1,3,1]] as const;
  for(const [time,ds,db,hs,hb] of times)it(time,()=>{
    const p=pillarsAt(Date.parse(time));expect(p.day).toEqual({stem:ds,branch:db});expect(p.hour).toEqual({stem:hs,branch:hb});
  });
});
describe('mapping and relations',()=>{
  it('mapping completeness and 100 ten-god combinations',()=>{
    expect(stemNames).toHaveLength(10);expect(branchNames).toHaveLength(12);expect(stemElements).toHaveLength(10);expect(branchElements).toHaveLength(12);
    for(let day=0;day<10;day++){
      expect(new Set(Array.from({length:10},(_,other)=>tenGod(day,other))).size).toBe(10);
      expect(tenGod(day,day)).toBe('비견');
      for(let other=0;other<10;other++)expect(tenGodNames).toContain(tenGod(day,other));
    }
    expect(tenGod(0,2)).toBe('식신');expect(tenGod(0,5)).toBe('정재');expect(tenGod(0,7)).toBe('정관');expect(tenGod(0,9)).toBe('정인');
  });
  it('known-character totals and no hidden unknown-hour values',()=>{
    const input={year:1992,month:5,day:15,calendar:'solar' as const,leap:false,unknownTime:false,hour:10,minute:30,nickname:''};
    for(const unknownTime of [false,true]){
      const r=calculateSaju({...input,unknownTime});
      expect(elements.reduce((sum,e)=>sum+Number(r.features[`elements.${e}`]),0)).toBe(unknownTime?6:8);
      if(unknownTime){expect(r.pillars.hour).toBeNull();expect(r.normalizedInput.instant).toBeNull();expect(r.normalizedInput.standardTime).toBeNull();}
    }
  });
  it('year and month split at actual terms rather than first day',()=>{
    const clock={now:()=>new Date('2024-02-15T03:00:00Z')};
    const year=targetPeriod('year',0,clock),month=targetPeriod('month',0,clock);
    expect(year.segments).toHaveLength(2);expect(month.segments).toHaveLength(2);
    expect(year.segments[0].pillar).toEqual({stem:9,branch:3});expect(year.segments[1].pillar).toEqual({stem:0,branch:4});
    expect(year.segments[0].features['period.relation']).not.toBe(year.segments[1].features['period.relation']);
  });
  it('target time remains separate from natal facts',()=>{
    const birth=calculateSaju({year:1990,month:6,day:1,calendar:'solar',leap:false,unknownTime:true,nickname:''});
    const snapshot=JSON.stringify(birth.features);
    const first=targetPeriod('day',birth.dayMaster,{now:()=>new Date('2026-10-20T03:00:00Z')});
    const second=targetPeriod('day',birth.dayMaster,{now:()=>new Date('2026-10-21T03:00:00Z')});
    expect(JSON.stringify(birth.features)).toBe(snapshot);expect(first.segments[0].features).not.toEqual(second.segments[0].features);
    expect(()=>targetPeriod('year',0,{now:()=>new Date('2051-01-01T03:00:00Z')})).toThrow(/2050/);
  });
});
