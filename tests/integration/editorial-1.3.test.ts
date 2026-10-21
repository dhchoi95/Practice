import { describe,it,expect } from 'vitest';
import { contentRepository } from '@/domain/interpretation/repository';
import { interpret } from '@/domain/interpretation/engine';
import { calculateSaju } from '@/domain/saju/calculate';
import { targetPeriod } from '@/domain/fortune/period';
import { segmentDateRange } from '@/domain/fortune/period-label';
import { composePeriodReading } from '@/domain/interpretation/period-reading';
const clock={now:()=>new Date('2026-10-20T03:00:00Z')};
const natal=calculateSaju({year:1992,month:5,day:15,calendar:'solar',leap:false,unknownTime:false,hour:10,minute:30,nickname:''},clock);
describe('KR-01/02/03/05/06 authored output regressions',()=>{
  it('keeps the specific love scene conditional and out of implementation jargon',()=>{
    const r=interpret('saju','love',natal.features),body=r.sections.flatMap(s=>s.paragraphs).join('');
    expect(body).toContain('만나는 사람이 있다면');
    expect(body).toContain('내게 당연한 일도 상대는 모를 수 있어요');
    expect(body).not.toContain('기대의 세밀함');expect(body).not.toContain('천간 집계 조합');
  });
  it('general sections have distinct authored roles and tips refer to visible suggestions',()=>{
    const r=interpret('saju','general',natal.features),find=(id:string)=>r.sections.find(s=>s.id===id)!.paragraphs.join('');
    expect(find('core-general-7')).toContain('쉬려던 시간');expect(find('core-personality-7')).toContain('작은 실수');
    expect(find('core-careermoney-7')).toContain('수정 부탁');expect(find('core-love-7')).toContain('바라는 걸');
    expect(r.practicalTips.join('')).not.toMatch(/완료 조건 세 개|반드시 확인할 두 가지/);
    expect(r.sections.flatMap(s=>s.paragraphs).join('').length).toBeLessThanOrEqual(1800);
    for(const trace of r.ruleTraces)expect(trace.displayedTipIndexes.every(i=>r.practicalTips.includes(contentRepository.all().find(rule=>rule.id===trace.ruleId)!.practicalTips[i]))).toBe(true);
  });
  it('feedback follows essential error correction and does not require finishing every extra request first',()=>{
    const r=interpret('saju','careerMoney',natal.features);
    const context=r.sections.find(s=>s.id==='relation-careermoney-output')!.paragraphs.join(' ');
    expect(context).toMatch(/꼭 필요한 오류를 고친 뒤 작은 초안/);
    expect(r.sections.find(s=>s.id==='core-careermoney-7')!.paragraphs.join(' ')).toContain('일정도 보수도 달라질 수 있어요');
  });
  it('all year/month manuscripts fit either short boundary segment without fixed quarter or full-month plans',()=>{
    for(const kind of ['year','month'] as const){
      const r=composePeriodReading(targetPeriod(kind,natal.dayMaster,clock),natal.features);
      expect(r.appliedRuleIds.length).toBeGreaterThan(0);
      for(const rule of contentRepository.all().filter(r=>r.category===kind))expect(rule.paragraphs.join('')).not.toMatch(/분기마다|첫 분기|연간 총비용|월초|월말|첫 주|두 주간/);
      expect(r.segmentTraces.flatMap(s=>s.appliedRuleIds)).toEqual(r.appliedRuleIds);
    }
  });
  it('labels actual Seoul dates, including end-exclusive midnight and non-current years',()=>{
    const year=targetPeriod('year',natal.dayMaster,clock);
    expect(segmentDateRange(year.segments[0])).toBe('2026년 1월 1일 ~ 2026년 2월 4일');
    expect(segmentDateRange(year.segments[1])).toBe('2026년 2월 4일 ~ 2026년 12월 31일');
    const day=targetPeriod('day',7,{now:()=>new Date('2027-01-01T03:00:00Z')});
    expect(segmentDateRange(day.segments[0])).toBe('2027년 1월 1일');
    // Period boundaries use UTC+9 standard time, including historical summer-time dates.
    const summer=targetPeriod('month',7,{now:()=>new Date('1987-05-20T03:00:00Z')});
    expect(segmentDateRange(summer.segments.at(-1)!)).toContain('1987년 5월 31일');
    expect(()=>segmentDateRange({start:1,end:1})).toThrow();
  });
});
