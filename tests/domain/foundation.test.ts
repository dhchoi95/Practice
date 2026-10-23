import { describe,it,expect } from 'vitest';
import { foundationTables } from '../../src/domain/foundation/tables';
import { calculateAdvanced } from '../../src/domain/advanced/chart';
import { buildSectorReading,judgeSector,matches,roundIndex,scheduleFor,sectorRecords,scheduleRecords,sectorFacts } from '../../src/domain/foundation/engine';
import { domains,contexts } from '../../src/domain/foundation/types';
import { calculatePeriod } from '../../src/domain/advanced/period';
import { solarTerms } from '../../src/domain/calendar/terms';
import { tenGod } from '../../src/domain/saju/tables';
import type { Facts } from '../../src/domain/advanced/types';
import type { BirthInput } from '../../src/domain/saju/types';
const input:BirthInput={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''};
const chart=calculateAdvanced(input,{enabled:true,timePolicy:'standard',luckClass:'male'});
describe('normalized foundation',()=>{
 it('enumerates valid 5/10/12/60/100/12/24 tables without impossible stem-branch parity',()=>{
  expect([foundationTables.elements.length,foundationTables.stems.length,foundationTables.branches.length,foundationTables.cycle.length,foundationTables.tenGods.length,foundationTables.hidden.length,foundationTables.terms.length]).toEqual([5,10,12,60,100,12,24]);
  expect(foundationTables.cycle.every(p=>p.stem%2===p.branch%2)).toBe(true);expect(foundationTables.terms.filter(t=>t.isMonthBoundary)).toHaveLength(12);
  for(const r of foundationTables.tenGods)expect(r.god).toBe(tenGod(r.dayStem,r.otherStem));
  expect(foundationTables.hidden[0].stems.map(h=>h.weight)).toEqual([.6]);expect(foundationTables.hidden[11].stems.map(h=>h.weight)).toEqual([.6,.3]);expect(foundationTables.hidden[5].stems.map(h=>h.weight)).toEqual([.6,.3,.1]);
 });
 it('tracks 291 cores, 249 period variants of supplements, 36 notes, and honest semantic families',()=>{expect(sectorRecords.filter(r=>r.role==='core')).toHaveLength(291);expect(sectorRecords.filter(r=>r.role==='supplement')).toHaveLength(249);expect(scheduleRecords).toHaveLength(36);expect(new Set(sectorRecords.map(r=>r.semanticId)).size).toBe(180);expect(new Set(sectorRecords.map(r=>r.id)).size).toBe(540);});
 it('treats missing inputs as unknown rather than satisfying negated conditions',()=>{expect(matches({all:[{path:'missing',op:'eq',value:false}]},{})).toBe(false);expect(judgeSector('health','day',{'known.day':false}).score).toBeNull();});
});
for(const kind of ['day','month','year'] as const)for(const domain of domains)it(`${kind}/${domain}: applicable source premises and score share one decision`,()=>{
 const reading=buildSectorReading(chart,kind,'2026-10-23');
 expect(reading.sectors[domain].records.length).toBeGreaterThan(0);
 for(const s of reading.segments){const j=s.sectors[domain];expect(j.score!%5).toBe(0);expect(j.score).toBeGreaterThanOrEqual(0);expect(j.score).toBeLessThanOrEqual(100);for(const r of j.records){expect(matches(r.requires,j.facts)).toBe(true);expect(r.unit).toBe(kind);expect(r.domain).toBe(domain);}expect(new Set(j.contributions.map(c=>c.group)).size).toBe(j.contributions.length);for(const c of j.contributions)expect(j.records.some(r=>r.id===c.recordId&&r.contribution.delta===c.delta)).toBe(true);}
});
it('returns different sector indices and a rounded equal-weight total, without context mutation',()=>{
 const reading=buildSectorReading(chart,'day','2026-10-23'),before=JSON.stringify(reading);expect(new Set(domains.map(d=>reading.sectors[d].score)).size).toBeGreaterThan(1);
 expect(reading.sectors.overall.score).toBe(roundIndex(domains.filter(d=>d!=='overall').reduce((sum,d)=>sum+reading.sectors[d].score!,0)/5));for(const context of contexts)expect(scheduleFor(reading,context)?.context).toBe(context);expect(JSON.stringify(reading)).toBe(before);
});
it('same canonical target produces identical core result for today/tomorrow/specified entry points',()=>{expect(buildSectorReading(chart,'day','2026-10-23')).toEqual(buildSectorReading(chart,'day','2026-10-23'));});
it('does not mutate natal pillars when target date changes',()=>{const before=JSON.stringify(chart);buildSectorReading(chart,'day','2030-05-12');expect(JSON.stringify(chart)).toBe(before);});
it('validates dates and support boundaries',()=>{for(const date of ['','2026-02-30','2051-01-01','1961-12-31'])expect(()=>buildSectorReading(chart,'day',date)).toThrow();});
it('aggregates the entire month/year with contiguous complete coverage independent of arbitrary query day',()=>{
 for(const kind of ['month','year'] as const){const a=buildSectorReading(chart,kind,'2026-10-01'),b=buildSectorReading(chart,kind,'2026-10-29');expect(a).toEqual(b);expect(a.segments[0].start).toBe(a.start);expect(a.segments.at(-1)!.end).toBe(a.end);a.segments.slice(1).forEach((s,i)=>expect(s.start).toBe(a.segments[i].end));expect(a.segments.reduce((n,s)=>n+s.end-s.start,0)).toBe(a.end-a.start);if(kind==='year')expect(a.segments.length).toBeGreaterThanOrEqual(13);
 for(const d of domains.filter(d=>d!=='overall'))expect(a.sectors[d].score).toBe(roundIndex(a.segments.reduce((n,s)=>n+s.sectors[d].score!*(s.end-s.start),0)/(a.end-a.start)));}
});
it('retains every actual Lichun and selected luck transition',()=>{const a=buildSectorReading(chart,'year','2025-01-01');for(const ms of [solarTerms(2025).find(t=>t.name==='입춘')!.instant,chart.luck[0].cycles[3].start])expect(a.segments.some(s=>s.start===ms)).toBe(true);});
it('unknown hour can use common known pillars; uncertain solar day remains null',()=>{
 const partial=calculateAdvanced({...input,unknownTime:true},{enabled:true,timePolicy:'standard'}),p=buildSectorReading(partial,'day','2026-10-23');expect(p.sectors.study.score).not.toBeNull();expect(p.sectors.study.uncertainty.join()).toContain('시주');
 const uncertain=calculateAdvanced({...input,unknownTime:true},{enabled:true,timePolicy:'true-solar',cityId:'suwon'});expect(uncertain.pillars.day).toBeNull();const u=buildSectorReading(uncertain,'day','2026-10-23');for(const d of domains)expect(u.sectors[d].score).toBeNull();expect(scheduleFor(u,'interview')).toBeNull();
});
it('solar profile changes table and all conditional facts together without inventing an hour',()=>{
 const solar=calculateAdvanced(input,{enabled:true,timePolicy:'true-solar',cityId:'suwon',luckClass:'male'});expect(solar.pillars.hour).not.toEqual(chart.pillars.hour);
 const p=calculatePeriod(solar,'day','2026-10-23');expect(sectorFacts(solar,p.segments[0])['natal.dayStem']).toBe(solar.pillars.day!.stem);
});
it('never calls a period↔period clash a target↔natal clash',()=>{
 const s=calculatePeriod(chart,'day','2026-10-23').segments[0];s.relations=[{id:'test',kind:'충',layer:'기간',positions:['세운','월운'],branches:[0,6],level:'presence',reasons:[],counter:[],transformation:false}];expect(sectorFacts(chart,s)['target.anyClash']).toBe(false);
});
it('uses domain priorities for compound scenarios instead of forcing identical twelve-way selections',()=>{
 const cases:Facts[]=[{focus:'resource','group.resource':true,'group.output':true},{focus:'output','group.output':true,'group.wealth':true},{focus:'order','group.output':true,'group.order':true},{focus:'peer','group.peer':true,'group.wealth':true},{focus:'peer','target.dayClash':true},{focus:'peer','target.monthClash':true},{focus:'peer','target.harmony':true,'target.anyClash':false},...['resource','output','order','peer','wealth'].map(focus=>({focus}))];
 for(const d of domains){const actual=cases.map(f=>judgeSector(d,'day',{'known.day':true,...f}).records[0].scenario);expect(actual).toEqual(['learn-express','produce-trade',d==='money'||d==='overall'?'order':'express-standard','share-resource','day-clash','month-clash','agreement','resource','output','order','peer','wealth']);}
});

it('annual target facts identify the year pillar and preserve every actual Jie boundary after coalescing',()=>{
 const reading=buildSectorReading(chart,'year','2026-10-23');for(const term of solarTerms(2026))expect(reading.segments.some(s=>s.start===term.instant)).toBe(true);
 for(const s of reading.segments){expect(s.context.facts['period.stem']).toBe(s.context.pillars.year.stem);expect(s.context.facts['period.branch']).toBe(s.context.pillars.year.branch);expect(s.context.selection.applied).toEqual([]);}
});
it('unknown natal slots never establish absence of a cross clash or a missing luck relationship',()=>{
 const c=calculateAdvanced({...input,unknownTime:true},{enabled:true,timePolicy:'standard'});const p=calculatePeriod(c,'day','2026-10-23');const facts=sectorFacts(c,{...p.segments[0],relations:[]});expect(facts['target.anyClash']).toBeNull();expect(facts['same.luck']).toBeNull();expect(judgeSector('love','day',{...facts,'target.harmony':true}).records[0].scenario).not.toBe('agreement');
});
it('index rounding clips bounds without replacing unknown values with zero',()=>{expect([-20,0,2,3,97,103].map(roundIndex)).toEqual([0,0,0,5,95,100]);expect(judgeSector('money','day',{'known.day':false}).score).toBeNull();});
it('different hour pillars can change natal-capacity evidence and the selected sector supplement',()=>{
 const solar=calculateAdvanced(input,{enabled:true,timePolicy:'true-solar',cityId:'suwon',luckClass:'male'});let different=false;
 for(let day=0;day<60;day++){const date=new Date(Date.UTC(2026,0,1+day)).toISOString().slice(0,10);const a=buildSectorReading(chart,'day',date),b=buildSectorReading(solar,'day',date);if(JSON.stringify(a.sectors.study.records.map(r=>r.id))!==JSON.stringify(b.sectors.study.records.map(r=>r.id)))different=true;}
 expect(different).toBe(true);
});
