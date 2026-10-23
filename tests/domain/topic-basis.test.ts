import { it,expect } from 'vitest';
import { calculateSaju } from '../../src/domain/saju/calculate';
import { topicBasis } from '../../src/domain/fortune/topic-basis';
import type { BirthInput } from '../../src/domain/saju/types';
const compatible=(b:BirthInput)=>{const {advanced,...base}=b;void advanced;return calculateSaju(base);};
const input:BirthInput={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''};
it('retains standard topic features exactly for full, partial and boundary births',()=>{
 for(const b of [input,{...input,unknownTime:true},{...input,year:2024,month:2,day:4,unknownTime:true}]){const old=compatible(b);expect(topicBasis(b,old).features).toEqual(old.features);}
});
it('uses corrected pillars for topic premises as well as the displayed chart',()=>{
 const b={...input,hour:0,minute:3,advanced:{enabled:true,timePolicy:'true-solar' as const,cityId:'suwon'}};const old=compatible(b),selected=topicBasis(b,old);expect(selected.chart.pillars.day).not.toEqual(old.pillars.day);expect(selected.features['natal.dayStem']).toBe(selected.chart.pillars.day!.stem);expect(selected.features['natal.dayStem']).not.toBe(old.dayMaster);
});
it('does not infer a known day for unknown-time true-solar topics',()=>{
 const b={...input,unknownTime:true,advanced:{enabled:true,timePolicy:'true-solar' as const,cityId:'suwon'}},basis=topicBasis(b,compatible(b));expect(basis.chart.pillars.day).toBeNull();expect(basis.features['natal.dayStem']).toBeNull();expect(basis.features['relations.wealth']).toBeNull();
});
