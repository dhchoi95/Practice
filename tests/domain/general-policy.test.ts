import {describe,it,expect} from 'vitest';
import {generalInput,generalSession,generalChart,hasLegacyCorrection} from '@/domain/fortune/general-policy';
import {calculateAdvanced} from '@/domain/advanced/chart';
import {calculateSaju} from '@/domain/saju/calculate';
import type {BirthInput} from '@/domain/saju/types';
const input:BirthInput={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:'',advanced:{enabled:true,timePolicy:'true-solar',cityId:'seoul',luckClass:'male'}};
const base=()=>{const {advanced,...b}=input;void advanced;return b;};
describe('일반 입력 표준시 정책과 이전 메모리 상태 전환',()=>{
 it('recomputes a legacy solar session, removes city and retains explicit luck classification',()=>{
  const legacy={input,calculation:calculateSaju(base())},snapshot=JSON.stringify(legacy),next=generalSession(legacy)!;
  expect(hasLegacyCorrection(legacy.input)).toBe(true);expect(next.input.advanced).toEqual({enabled:true,timePolicy:'standard',luckClass:'male'});expect(generalChart(next.input).pillars.hour).toEqual({stem:6,branch:8});expect(JSON.stringify(legacy)).toBe(snapshot);expect(generalSession(next)).toBe(next);
 });
 it.each(['mean-solar','true-solar'] as const)('keeps the %s engine available without allowing it into ordinary output',timePolicy=>{
  const original=calculateAdvanced({...input,advanced:{...input.advanced!,timePolicy}});expect(original.pillars.hour).toEqual({stem:5,branch:7});expect(generalChart({...input,advanced:{...input.advanced!,timePolicy}}).pillars.hour).toEqual({stem:6,branch:8});
 });
 it('normalizes the two people separately without inventing a city or sex',()=>{
  const a=generalInput(input),b=generalInput({...base(),unknownTime:true});expect(a.advanced?.luckClass).toBe('male');expect(b.advanced).toEqual({enabled:true,timePolicy:'standard'});expect(generalChart(b).pillars.hour).toBeNull();expect(generalChart({...base(),hour:0,minute:0}).pillars.hour).not.toBeNull();expect(generalSession(null)).toBeNull();
 });
 it('keeps truly uncertain standard-time days unresolved',()=>{
  const c=generalChart({...base(),year:1987,month:6,day:1,unknownTime:true});expect(c.pillars.day).toBeNull();expect(c.strength.score).toBeNull();expect(c.luck).toHaveLength(0);
 });
});
