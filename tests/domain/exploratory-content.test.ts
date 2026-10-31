import {describe,it,expect} from 'vitest';
import {generalChart} from '@/domain/fortune/general-policy';
import {selectManuscripts} from '@/domain/advanced/modules';
import {natalModules} from '@/content/advanced/natal';
import {calculatePeriod} from '@/domain/advanced/period';
import type {BirthInput} from '@/domain/saju/types';

const input:BirthInput={year:1962,month:8,day:22,hour:0,minute:0,unknownTime:false,calendar:'solar',leap:false,nickname:''};
describe('exploratory factual-copy regressions',()=>{
 it('does not claim the wood triple for a confirmed water triple',()=>{
  const chart=generalChart(input);
  expect(chart.relations.filter(r=>r.kind==='삼합').map(r=>r.element)).toEqual(['수']);
  const branches=Object.values(chart.pillars).flatMap(p=>p?[p.branch]:[]);
  expect([11,3,7].every(b=>branches.includes(b))).toBe(false);
  const reading=selectManuscripts(natalModules,chart.facts,'natal');
  for(const record of reading.applied){
   expect(record.text).not.toContain('해·묘·미가 모두');
   expect(record.claim.text).toBe(record.text);
  }
 });
 it('keeps the existing confirmed wood-triple case readable',()=>{
  const chart=generalChart({...input,year:1963,month:4,day:10,hour:21});
  expect(chart.relations.some(r=>r.kind==='삼합'&&r.element==='목')).toBe(true);
  const record=selectManuscripts(natalModules,chart.facts,'natal').applied.find(r=>r.id==='natal-triple-wood');
  expect(record?.text).toContain('삼합');
  expect(record?.text).not.toContain('모두 목으로 바뀌었습니다');
 });
 it('never fills a complete-chart triple interpretation from an unknown hour',()=>{
  const chart=generalChart({...input,unknownTime:true});
  expect(chart.pillars.hour).toBeNull();
  expect(selectManuscripts(natalModules,chart.facts,'natal').applied.some(r=>r.id==='natal-triple-wood')).toBe(false);
 });
 it.each(['day','month','year'] as const)('advanced %s context keeps the selected future period',kind=>{
  const chart=generalChart(input),period=calculatePeriod(chart,kind,'2028-02-14');
  expect(period.segments.length).toBeGreaterThan(0);
  for(const segment of period.segments)for(const record of segment.selection.applied){
   expect(record.text,record.id).not.toMatch(/오늘|내일|올해/);
   expect(record.claim.text).toBe(record.text);
  }
 });
});
