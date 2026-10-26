import {describe,it,expect} from 'vitest';
import {particleErrors,languageAudit} from '@/domain/interpretation/quality';
import {validateRules} from '@/domain/interpretation/repository';
import {interpret} from '@/domain/interpretation/engine';
import {calculateSaju} from '@/domain/saju/calculate';
import {topicBasis} from '@/domain/fortune/topic-basis';
import {generalChart} from '@/domain/fortune/general-policy';
import {buildSectorReading,sectorRecords} from '@/domain/foundation/engine';
import {presentSector} from '@/domain/foundation/presentation';
import {domains} from '@/domain/foundation/types';
import rules from '@/content/rules.json';
import type {BirthInput} from '@/domain/saju/types';
const input:BirthInput={year:1990,month:1,day:9,hour:12,minute:0,unknownTime:false,calendar:'solar',leap:false,nickname:''};
describe('문장 오류와 조립 과정의 반복 회귀',()=>{
 it('rejects the malformed standalone form but accepts the valid noun 근거',()=>{
  expect(particleErrors('알게 된 일도 있을 거입니다.')).toContain('거입니다 → 것입니다');
  expect(particleErrors('알게 된 일도 있을 것입니다. 외부 검토 근거입니다.')).toEqual([]);
 });
 it('checks all active legacy prose including evidence, and all sector manuscripts',()=>{
  expect(languageAudit(validateRules(rules))).toEqual([]);
  for(const record of sectorRecords)expect(particleErrors([record.title,...record.paragraphs,record.proposal].join(' ')),record.id).toEqual([]);
 });
 it('reproduces the reported 1990-01-09 12:00 personality reading with corrected prose',()=>{
  const basis=topicBasis(input,calculateSaju(input)),reading=interpret('saju','personality',basis.features);
  const text=reading.sections.flatMap(s=>s.paragraphs).join('\n');
  expect(text).toContain('해보았기에 알게 된 일도 있을 것입니다.');expect(particleErrors(text)).toEqual([]);
 });
 it.each(['day','month','year'] as const)('never injects a stock connector into any %s paragraph, while preserving its provenance',kind=>{
  const chart=generalChart({...input,year:1995,month:11,day:8,hour:15,minute:3});let secondary=0;
  for(const target of ['2026-02-04','2026-10-01','2027-01-01']){
   const reading=buildSectorReading(chart,kind,target);
   for(const domain of domains){const plan=presentSector(reading,domain);
    for(const paragraph of plan.paragraphs){
     const record=reading.sectors[domain].records.find(r=>r.id===paragraph.recordId)!;
     expect(record.domain).toBe(domain);expect([...record.paragraphs,record.proposal]).toContain(paragraph.text);
     if(paragraph.role==='other-segment'){secondary++;expect(plan.trace.find(t=>t.recordId===paragraph.recordId)?.segments.length).toBeGreaterThan(0);}
    }
   }
  }
  if(kind!=='day')expect(secondary).toBeGreaterThan(0);
 });
});
