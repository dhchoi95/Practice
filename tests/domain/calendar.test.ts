import { describe,it,expect } from 'vitest';
import calendarFixtures from '../fixtures/calendar-golden.json';
import astronomyFixtures from '../fixtures/astronomy-golden.json';
import kasiReport from '../fixtures/kasi-2017-report-golden.json';
import { toLunar,toSolar,isoDate,constellationForDate,zodiacForDate } from '@/domain/calendar/korean';
import { solarTerms } from '@/domain/calendar/terms';
import { wallTimeToInstant,standardParts } from '@/domain/calendar/timezone';
import { validateBirth } from '@/lib/validation';
import { seoulDate } from '@/lib/clock';
import { calculateSaju,pillarsAt } from '@/domain/saju/calculate';
const clock={now:()=>new Date('2026-10-20T03:00:00Z')};
const base={calendar:'solar' as const,leap:false,unknownTime:true,nickname:''};
describe('KASI dates transcribed from the independent review, including ICU exceptions',()=>{
  for(const f of kasiReport.cases)it(`KASI report ${isoDate(f.solar)} lunar conversion and reverse`,()=>{
    expect(toLunar(f.solar)).toEqual(f.lunar);
    expect(toSolar(f.lunar)).toEqual(f.solar);
  });
});
describe('independent ICU Dangi calendar goldens',()=>{
  for(const f of calendarFixtures)it(`${f.id}: ${f.normalizedSolar}`,()=>{
    expect(toLunar(f.input)).toEqual(f.expected);
    expect(isoDate(toSolar(f.expected))).toBe(f.normalizedSolar);
  });
  it('rejects nonexistent leap month without normalizing it',()=>expect(()=>toSolar({year:2024,month:2,day:1,leap:true})).toThrow(/윤달/));
  it('rejects invalid solar/lunar days',()=>{
    expect(()=>toLunar({year:2023,month:2,day:29})).toThrow();
    expect(()=>toSolar({year:2017,month:5,day:30,leap:true})).toThrow();
    expect(toSolar({year:2017,month:5,day:29,leap:true})).toEqual({year:2017,month:7,day:22});
  });
  it('birth range min, fixed current maximum, future and invalid hours',()=>{
    expect(validateBirth({...base,year:1962,month:1,day:1},clock).year).toBe(1962);
    expect(validateBirth({...base,year:2026,month:10,day:20},clock).day).toBe(20);
    expect(()=>validateBirth({...base,year:1961,month:12,day:31},clock)).toThrow(/1962/);
    expect(()=>validateBirth({...base,year:2026,month:10,day:21},clock)).toThrow(/미래/);
    expect(()=>validateBirth({...base,year:2000,month:1,day:1,unknownTime:false,hour:24,minute:0},clock)).toThrow();
    expect(()=>validateBirth({...base,year:2000,month:1,day:1,unknownTime:false,hour:12,minute:60},clock)).toThrow();
    expect(validateBirth({...base,year:2000,month:1,day:1,hour:12,minute:30},clock).hour).toBeUndefined();
  });
});
describe('independent astronomical solar longitude',()=>{
  for(const f of astronomyFixtures)it(f.id,()=>{
    const actual=solarTerms(f.input.year).find(t=>t.name===f.input.term)!;
    expect(Math.abs(actual.instant-Date.parse(f.expectedInstant))/1000).toBeLessThan(f.toleranceSeconds);
  });
});
describe('IANA Asia/Seoul normalization',()=>{
  it('normalizes standard and summer wall time',()=>{
    expect(standardParts(wallTimeToInstant({year:1987,month:6,day:1,hour:10,minute:30}))).toEqual({year:1987,month:6,day:1,hour:9,minute:30});
    expect(standardParts(wallTimeToInstant({year:1988,month:1,day:1,hour:10,minute:30}))).toEqual({year:1988,month:1,day:1,hour:10,minute:30});
  });
  it('rejects spring gap and fall fold',()=>{
    expect(()=>wallTimeToInstant({year:1987,month:5,day:10,hour:2,minute:30})).toThrow(/존재하지/);
    expect(()=>wallTimeToInstant({year:1988,month:10,day:9,hour:2,minute:30})).toThrow(/두 번/);
  });
  it('marks unknown day when DST midnight can normalize to two dates',()=>{
    const r=calculateSaju({...base,year:1987,month:6,day:1},clock);
    expect(r.pillars.day).toBeNull();expect(r.dayMaster).toBeNull();expect(r.pillars.hour).toBeNull();
    expect(r.features['natal.knownCount']).toBe(4);
  });
  it('does not mistake UTC date for Seoul today',()=>{
    expect(seoulDate({now:()=>new Date('2026-10-19T16:00:00Z')})).toBe('2026-10-20');
    expect(seoulDate({now:()=>new Date('2026-10-19T14:59:00Z')})).toBe('2026-10-19');
  });
});
describe('application policy boundary regressions (not independent astronomical proof)',()=>{
  for(const name of ['입춘','경칩','대설'])it(`before/exact/after ${name} in KST`,()=>{
    const t=solarTerms(2024).find(t=>t.name===name)!;
    const before=pillarsAt(t.instant-1),exact=pillarsAt(t.instant),after=pillarsAt(t.instant+1);
    expect(before.month).not.toEqual(exact.month);expect(exact.month).toEqual(after.month);
    if(name==='입춘'){expect(before.year).toEqual({stem:9,branch:3});expect(exact.year).toEqual({stem:0,branch:4});}
    if(name==='대설')expect(standardParts(t.instant).day).toBe(7); // 원자료 중국 날짜는 12/6.
  });
  it('unknown-time lichun date leaves year/month unknown',()=>{
    const r=calculateSaju({...base,year:2024,month:2,day:4},clock);
    expect(r.pillars.year).toBeNull();expect(r.pillars.month).toBeNull();expect(r.pillars.day).not.toBeNull();expect(r.features['natal.knownCount']).toBe(2);
  });
  it('same solar moment through valid lunar input yields same pillars',()=>{
    const solar={...base,year:2017,month:6,day:24,unknownTime:false,hour:10,minute:0};
    const lunar={...solar,calendar:'lunar' as const,month:5,day:1,leap:true};
    expect(calculateSaju(solar,clock).pillars).toEqual(calculateSaju(lunar,clock).pillars);
  });
});
describe('independent light systems',()=>{
  it('zodiac changes at Korean lunar New Year, not January 1 or lichun',()=>{
    expect(zodiacForDate({year:2024,month:2,day:9})).toBe(3);
    expect(zodiacForDate({year:2024,month:2,day:10})).toBe(4);
  });
  const starts=[[1,20],[2,19],[3,21],[4,20],[5,21],[6,22],[7,23],[8,23],[9,23],[10,24],[11,23],[12,22]];
  for(const [i,[month,day]] of starts.entries())it(`constellation boundary ${month}/${day}`,()=>{
    expect(constellationForDate({year:2000,month,day})).toBe((i+1)%12);
    const d=new Date(Date.UTC(2000,month-1,day-1));
    expect(constellationForDate({year:2000,month:d.getUTCMonth()+1,day:d.getUTCDate()})).toBe(i);
  });
  it('handles year seam',()=>{expect(constellationForDate({year:2000,month:1,day:1})).toBe(0);expect(constellationForDate({year:2000,month:12,day:31})).toBe(0);});
});
