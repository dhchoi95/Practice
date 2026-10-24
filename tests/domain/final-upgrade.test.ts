import {describe,it,expect} from 'vitest';
import {calculateAdvanced} from '@/domain/advanced/chart';
import {buildAdvancedReport} from '@/domain/advanced/report';
import {lifeStage,lifeStages} from '@/domain/advanced/life-stage';
import {compareBirths} from '@/domain/advanced/compatibility';
import {toLunar,toSolar} from '@/domain/calendar/korean';
import {buildSectorReading} from '@/domain/foundation/engine';
import {solarTerms} from '@/domain/calendar/terms';
import {advancedPillarsAt} from '@/domain/advanced/time';
import type {BirthInput} from '@/domain/saju/types';
const birth=(year:number,month:number,day:number,hour=0,minute=0):BirthInput=>({year,month,day,hour,minute,unknownTime:false,calendar:'solar',leap:false,nickname:''});
const fixtures=[
 {input:birth(1994,3,31),pillars:[[0,10],[3,3],[2,4],[4,0]],lunar:[1994,2,20,false]},
 {input:birth(1996,1,5),pillars:[[1,11],[4,0],[7,1],[4,0]],lunar:[1995,11,15,false]},
 {input:birth(1998,8,11,15),pillars:[[4,2],[6,8],[6,2],[0,8]],lunar:[1998,6,20,false]},
 {input:birth(1995,10,22),pillars:[[1,11],[2,10],[2,10],[4,0]],lunar:[1995,8,28,true]},
 {input:birth(1995,11,8,15,3),pillars:[[1,11],[3,11],[9,3],[6,8]],lunar:[1995,9,16,false]},
];
describe('사진의 관찰과 입력 조건을 나누어 검증',()=>{
 it.each(fixtures)('$input.year-$input.month-$input.day standard pillars and Korean lunar date',({input,pillars,lunar})=>{
  const c=calculateAdvanced(input,{enabled:true,timePolicy:'standard'});
  expect(['year','month','day','hour'].map(k=>{const p=c.pillars[k as keyof typeof c.pillars]!;return [p.stem,p.branch];})).toEqual(pillars);
  const l=toLunar(input);expect([l.year,l.month,l.day,l.leap]).toEqual(lunar);expect(toSolar(l)).toEqual({year:input.year,month:input.month,day:input.day});
 });
 it.each([fixtures[0],fixtures[1],fixtures[3]])('00:00 is distinct from unknown time for $input.year',({input})=>{
  const known=calculateAdvanced(input),unknown=calculateAdvanced({...input,unknownTime:true,hour:undefined,minute:undefined});
  expect(known.pillars.hour).not.toBeNull();expect(unknown.pillars.hour).toBeNull();expect(unknown.instant).toBeNull();expect(unknown.luck).toHaveLength(0);
 });
 it('reproduces the two mean-solar hours without equating mean and true solar policies',()=>{
  const a=calculateAdvanced(fixtures[2].input,{enabled:true,timePolicy:'mean-solar',cityId:'seoul'}),b=calculateAdvanced(fixtures[4].input,{enabled:true,timePolicy:'mean-solar',cityId:'seoul'}),c=calculateAdvanced(fixtures[4].input,{enabled:true,timePolicy:'true-solar',cityId:'seoul'});
  expect(a.pillars.hour).toEqual({stem:9,branch:7});expect(b.pillars.hour).toEqual({stem:5,branch:7});expect(c.pillars.hour).toEqual(b.pillars.hour);expect(c.time.final).not.toBe(b.time.final);expect(b.time.longitudeMinutes).toBeCloseTo(-32.1,1);
 });
 it('keeps full precision around actual solar-term instants',()=>{
  const t=solarTerms(1998).find(t=>t.name==='입추')!;const a=advancedPillarsAt(t.instant-1,'standard'),b=advancedPillarsAt(t.instant,'standard');expect(a.month).not.toEqual(b.month);expect(a.year).toEqual(b.year);
 });
});
describe('12운성 채택표와 두 사람 비교',()=>{
 it('follows all ten starting positions and both directions with no photo hardcoding',()=>{
  const starts=[11,6,2,9,2,9,5,0,8,3];for(let s=0;s<10;s++){expect(lifeStage(s,starts[s])).toBe('장생');expect(new Set(Array.from({length:12},(_,b)=>lifeStage(s,b))).size).toBe(12);expect(lifeStage(s,(starts[s]+(s%2?-1:1)+12)%12)).toBe('목욕');}expect(lifeStages).toHaveLength(12);
  expect(lifeStage(6,7)).toBe('관대');expect(lifeStage(6,8)).toBe('건록');expect(lifeStage(9,7)).toBe('묘');expect(lifeStage(9,8)).toBe('사');expect(lifeStage(null,7)).toBeNull();
 });
 it('changes each natal independently and does not use names',()=>{
  const a=fixtures[0].input,b=fixtures[2].input,original=compareBirths(a,b),renamed=compareBirths({...a,nickname:'A 이름'},{...b,nickname:'B 이름'});
  expect(renamed.relations).toEqual(original.relations);expect(renamed.aToB).toBe(original.aToB);
  expect(compareBirths({...a,day:30},b).charts[1].pillars).toEqual(original.charts[1].pillars);expect(compareBirths(a,{...b,day:12}).charts[0].pillars).toEqual(original.charts[0].pillars);
  const unknown=compareBirths({...a,unknownTime:true},b);expect(unknown.charts[0].pillars.hour).toBeNull();expect(unknown.relations.every(r=>!r.positions.includes('A 시주'))).toBe(true);
 });
 it('keeps detailed annual interpretation within the supported upper year',()=>{const c=calculateAdvanced(fixtures[4].input);expect(buildAdvancedReport(c,2049).years).toHaveLength(2);expect(buildAdvancedReport(c,2050).years).toHaveLength(1);expect(()=>buildAdvancedReport(c,2051)).toThrow('1962~2050');});
 it('year queries reuse the same reading without changing the natal chart',()=>{
  const c=calculateAdvanced(fixtures[4].input),before=JSON.stringify(c.pillars);expect(buildSectorReading(c,'year','2026-01-01').sectors).toEqual(buildSectorReading(c,'year','2026-10-24').sectors);buildSectorReading(c,'year','2027-01-01');expect(JSON.stringify(c.pillars)).toBe(before);
 });
});
