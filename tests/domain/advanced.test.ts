import { describe,it,expect } from 'vitest';
import { HourAngle,Observer,Body } from 'astronomy-engine';
import { calculateAdvanced } from '@/domain/advanced/chart';
import { advancedPillarsAt,correction,equationOfTime } from '@/domain/advanced/time';
import { hiddenStems,hiddenFor } from '@/domain/advanced/mappings';
import { tenGod,tenGodNames } from '@/domain/saju/tables';
import { calculateSaju,pillarsAt } from '@/domain/saju/calculate';
import { solarTerms } from '@/domain/calendar/terms';
import { calculateLuck,activeLuck,addCalendar } from '@/domain/advanced/luck';
import { findRelations } from '@/domain/advanced/relations';
import { calculatePeriod,fiveYears } from '@/domain/advanced/period';
import { selectManuscripts,validateManuscripts } from '@/domain/advanced/modules';
import { natalModules } from '@/content/advanced/natal';
import { periodModules } from '@/content/advanced/period';
import { mbtiContent,mbtiFor } from '@/content/advanced/mbti';
import { comparePolicies,buildAdvancedReport } from '@/domain/advanced/report';
import { dailyEditorial } from '@/content/editorial';
import type { BirthInput } from '@/domain/saju/types';
const input:BirthInput={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''};
const standard={enabled:true,timePolicy:'standard' as const,luckClass:'male' as const,cityId:'suwon'},solar={...standard,timePolicy:'true-solar' as const};
describe('new time profiles preserve the actual time axis',()=>{
 it('preserves compatibility output and does not feed options to strict legacy validation',()=>{
  const c=calculateAdvanced({...input,advanced:solar});expect(c.compatibility).toEqual(calculateSaju(input));expect(c.pillars.year).toEqual(c.compatibility.pillars.year);
 });
 it('reproduces the example without hardcoding and propagates the hour difference',()=>{
  const a=calculateAdvanced(input,standard),b=calculateAdvanced(input,solar);
  expect(a.pillars).toEqual({year:{stem:1,branch:11},month:{stem:3,branch:11},day:{stem:9,branch:3},hour:{stem:6,branch:8}});
  expect(b.pillars.hour).toEqual({stem:5,branch:7});expect(b.time.final).toContain('14:47');
  expect(a.relations.some(r=>r.kind==='삼합')).toBe(false);expect(b.relations.filter(r=>r.kind==='삼합')).toHaveLength(1);
  expect(a.strength.label).not.toBe(b.strength.label);expect(a.luck).toEqual(b.luck);
  const comp=comparePolicies(b)!;expect(comp.changed).toEqual(['hour']);expect(comp.standardOnly.length).toBeGreaterThan(0);expect(comp.solarOnly.length).toBeGreaterThan(0);
 });
 it('does not guess a city or classification',()=>{
  const c=calculateAdvanced(input,{enabled:true,timePolicy:'true-solar'});
  expect(c.time.effective).toBe('standard');expect(c.luck.map(l=>l.direction)).toEqual(['forward','reverse']);expect(c.options.cityId).toBeUndefined();
  expect(()=>calculateAdvanced(input,{...solar,cityId:'gyeonggi'})).toThrow('도시');
 });
 it('separates longitude and EOT instead of subtracting a fixed thirty minutes',()=>{
  const ms=Date.parse('1995-11-08T06:03:00Z');const a=correction(ms,'true-solar',127.03),b=correction(ms,'true-solar',129.08);
  expect(a.longitudeMinutes).toBeCloseTo(-31.88,8);expect(a.equationMinutes).toBeCloseTo(16.1137286,5);expect(b.total-a.total).toBeCloseTo(8.2,8);
  expect(correction(ms,'mean-solar',127.03).equationMinutes).toBe(0);
 });
 it('checks EOT sign and observed approximation error against another astronomical model over 365 days',()=>{
  let max=0;for(let i=0;i<365;i++){
   const ms=Date.UTC(2026,0,1+i,12),d=new Date(ms),ha=HourAngle(Body.Sun,d,new Observer(0,0,0));
   const oracle=((((ha+12)%24)*60-720+720)%1440+1440)%1440-720;
   max=Math.max(max,Math.abs(equationOfTime(ms)-oracle));
  }expect(max).toBeLessThan(1); // observed comparison tolerance, not a universal error guarantee
 });
 for(const [time,branch] of [['14:59',7],['15:00',8],['15:01',8],['22:59',11],['23:00',0],['23:01',0]] as const)it(`standard hour boundary ${time}`,()=>{
  const ms=Date.parse(`2000-01-07T${time}:00+09:00`);expect(advancedPillarsAt(ms,'standard').hour.branch).toBe(branch);expect(advancedPillarsAt(ms,'standard')).toEqual(pillarsAt(ms));
 });
 it('moves the day at corrected midnight while 23h remains the same-day stem policy',()=>{
  const ms=Date.parse('2000-01-08T00:05:00+09:00');const c=advancedPillarsAt(ms,'mean-solar',127.03);
  expect(c.day).toEqual({stem:0,branch:0});expect(c.hour).toEqual({stem:0,branch:0});
  expect(advancedPillarsAt(Date.parse('2000-01-08T00:32:00+09:00'),'mean-solar',127.03).day).toEqual({stem:1,branch:1});
 });
 for(const name of ['입춘','입동'])it(`term ${name} uses actual UTC for both policies`,()=>{
  const t=solarTerms(1995).find(t=>t.name===name)!;
  for(const delta of [-1,0,1]){const a=advancedPillarsAt(t.instant+delta,'standard'),b=advancedPillarsAt(t.instant+delta,'true-solar',127.03);expect(a.year).toEqual(b.year);expect(a.month).toEqual(b.month);}
  expect(advancedPillarsAt(t.instant-1,'standard').month).not.toEqual(advancedPillarsAt(t.instant,'standard').month);
 });
 it('propagates unknown time to strength, pattern, structures, luck and dependent copy',()=>{
  const c=calculateAdvanced({...input,unknownTime:true},solar);
  expect(c.pillars.hour).toBeNull();expect(c.strength.score).toBeNull();expect(c.facts['strength']).toBeNull();expect(c.facts['structure.foodKill']).toBeNull();expect(c.luck).toEqual([]);
  expect(selectManuscripts(natalModules,c.facts,'natal').applied.every(r=>!r.requires.includes('known.complete'))).toBe(true);
 });
 it('keeps DST gap/fold errors and lunar leap validation',()=>{
  expect(()=>calculateAdvanced({...input,year:1988,month:5,day:8,hour:2,minute:30},solar)).toThrow('존재하지');
  expect(()=>calculateAdvanced({...input,year:1988,month:10,day:9,hour:2,minute:30},solar)).toThrow('두 번');
  expect(()=>calculateAdvanced({...input,year:2024,month:2,day:1,calendar:'lunar',leap:true},solar)).toThrow();
  const a=calculateAdvanced({...input,year:2017,month:5,day:1,calendar:'lunar',leap:true},solar);expect(a.compatibility.normalizedInput.solar).toEqual({year:2017,month:6,day:24});
 });
});
describe('central mappings and relationship levels',()=>{
 it('checks all hidden stems, including the corrected 未, and all 100 god relations',()=>{
  expect(hiddenStems).toEqual([[9],[5,9,7],[0,2,4],[1],[4,1,9],[2,4,6],[3,5],[5,3,1],[6,8,4],[7],[4,7,3],[8,0]]);
  expect(hiddenFor(7,9).map(h=>h.god)).toEqual(['편관','편재','식신']);expect(hiddenFor(11,9).map(h=>h.god)).toEqual(['겁재','상관']);
  for(let d=0;d<10;d++)for(let s=0;s<10;s++){const diff=(Math.floor(s/2)-Math.floor(d/2)+5)%5;expect(tenGod(d,s)).toBe(tenGodNames[diff*2+Number(d%2!==s%2)]);}
 });
 it('deduplicates triple candidates while preserving repeated positions, and never assumes transformation',()=>{
  const placed=[11,11,3,7].map((b,i)=>({position:String(i),pillar:{stem:1,branch:b}}));const r=findRelations(placed,'test',11).filter(r=>r.kind==='삼합');
  expect(r).toHaveLength(1);expect(r[0].positions).toHaveLength(4);expect(r[0].transformation).toBe(false);expect(r[0].level).toBe('candidate');
  expect(findRelations(placed.slice(0,3),'test',11).some(r=>r.kind==='삼합')).toBe(false);
 });
 it('only upgrades to supported conditions with season, exposure and no interfering clash',()=>{
  const p=[11,3,7].map((b,i)=>({position:String(i),pillar:{stem:1,branch:b}}));expect(findRelations(p,'test',3).find(r=>r.kind==='삼합')?.level).toBe('supported');
  p.push({position:'extra',pillar:{stem:0,branch:9}});expect(findRelations(p,'test',3).find(r=>r.kind==='삼합')?.level).toBe('candidate');
 });
});
describe('actual luck dates and deterministic context',()=>{
 it('checks direction, month progression, exact active start/end, and zero gap equality',()=>{
  const c=calculateAdvanced(input,standard),l=c.luck[0];expect(l.direction).toBe('reverse');expect(l.gapMilliseconds).toBe(30445000);
  expect(l.cycles.slice(0,4).map(c=>c.pillar)).toEqual([{stem:2,branch:10},{stem:1,branch:9},{stem:0,branch:8},{stem:9,branch:7}]);
  expect(activeLuck(l,l.start-1)).toBeNull();expect(activeLuck(l,l.start)?.index).toBe(1);expect(activeLuck(l,l.cycles[0].end)?.index).toBe(2);
  expect(calculateAdvanced(input,{...standard,luckClass:'female'}).luck[0].direction).toBe('forward');
  const t=solarTerms(1995).find(t=>t.name==='입동')!;for(const x of calculateLuck(t.instant,1,{stem:3,branch:11},undefined)){expect(x.gapMilliseconds).toBe(0);expect(x.start).toBe(t.instant);}
 });
 it('calendar addition clamps Feb 29 explicitly',()=>{expect(new Date(addCalendar(Date.UTC(2000,1,29),10)).toISOString()).toBe('2010-02-28T00:00:00.000Z');});
 it('splits years at actual luck change and never pins future years to the current cycle',()=>{
  const c=calculateAdvanced(input,standard),p=calculatePeriod(c,'year','2025-01-01'),transition=c.luck[0].cycles[3].start;
  expect(p.segments.some(s=>s.start===transition)).toBe(true);expect(p.segments.at(-1)?.luck[0].pillarLabel).not.toBe(p.segments[0].luck[0].pillarLabel);
  const a=calculatePeriod(c,'year','2026-01-02'),b=calculatePeriod(c,'year','2026-12-31');expect(a).toEqual(b);
 });
 it('checks 2026–2030 effective year pillars and intraday term boundaries',()=>{
  const c=calculateAdvanced(input,standard);expect(fiveYears(c,2026).map(y=>y.segments.at(-1)!.pillars.year)).toEqual([{stem:2,branch:6},{stem:3,branch:7},{stem:4,branch:8},{stem:5,branch:9},{stem:6,branch:10}]);
  expect(calculatePeriod(c,'day','2026-02-04').segments).toHaveLength(2);
 });
 it('is deterministic across rule order and irrelevant features, and keeps relevant premises in trace',()=>{
  const c=calculateAdvanced(input,solar),a=calculatePeriod(c,'day','2026-10-22'),b=calculatePeriod(c,'day','2026-10-22',[...periodModules].reverse());
  expect(a).toEqual(b);const f={...c,facts:{...c.facts,'not.used':42}};expect(calculatePeriod(f,'day','2026-10-22').segments.map(s=>s.selection)).toEqual(a.segments.map(s=>s.selection));
  for(const s of a.segments)for(const t of s.selection.trace)expect(t.premises.every(p=>p.actual!==null&&p.actual!==undefined)).toBe(true);
 });
 it('does not reuse the entire day reading every ten days and retains stable natal topics',()=>{
  const c=calculateAdvanced(input,standard),a=calculatePeriod(c,'day','2026-10-01'),b=calculatePeriod(c,'day','2026-10-11');
  expect(a.segments[0].facts['period.god']).toBe(b.segments[0].facts['period.god']);expect(a.segments[0].pillars.day.branch).not.toBe(b.segments[0].pillars.day.branch);
  expect(a.segments[0].selection.applied.map(r=>r.text)).not.toEqual(b.segments[0].selection.applied.map(r=>r.text));
 });
 it('rejects out of range and impossible query dates without clamping',()=>{const c=calculateAdvanced(input,standard);for(const s of ['2051-01-01','2026-02-30','abc'])expect(()=>calculatePeriod(c,'day',s)).toThrow();expect(()=>fiveYears(c,2047)).toThrow();});
});
describe('content contracts without automatic independent approval',()=>{
 it('validates real modules and rejects missing premises/claims',()=>{
  expect(validateManuscripts([...natalModules,...periodModules]).length).toBe(natalModules.length+periodModules.length);
  expect(()=>validateManuscripts([{...periodModules[0],requires:[]}])).toThrow('전제');expect(()=>validateManuscripts([{...periodModules[0],claim:{...periodModules[0].claim,text:'other'}}])).toThrow('주장');
 });
 it('does not imply whole-chart strength from the same simple element counts',()=>{
  const a=calculateAdvanced({...input,year:2000,month:1,day:16,hour:10,minute:30},standard),b=calculateAdvanced({...input,year:2000,month:2,day:5,hour:10,minute:30},standard);
  for(const e of ['목','화','토','금','수'])expect(a.compatibility.features[`elements.${e}` as keyof typeof a.compatibility.features]).toBe(b.compatibility.features[`elements.${e}` as keyof typeof b.compatibility.features]);
  expect(a.pillars.day?.stem).toBe(b.pillars.day?.stem);expect(a.facts['season.element']).not.toBe(b.facts['season.element']);expect(a.strength.score).not.toBe(b.strength.score);
  const f={...a.facts,'known.complete':null};expect(selectManuscripts(natalModules,f,'natal').applied.every(r=>!r.requires.includes('known.complete'))).toBe(true);
 });
 it('provides all 96 individually authored MBTI scenarios and 31 non-astronomical editorial items',()=>{
  expect(mbtiContent).toHaveLength(96);expect(new Set(mbtiContent.map(r=>r.text)).size).toBe(96);expect(dailyEditorial).toHaveLength(31);
  expect(()=>mbtiFor('unknown',0)).toThrow();expect(mbtiFor('INTP',2).text).not.toEqual(mbtiFor('ESFJ',2).text);
 });
});
describe('rendered trace and cross-layer ownership',()=>{
 it('records repeated paragraphs as references to a real earlier displayed segment',()=>{
  const period=calculatePeriod(calculateAdvanced(input,standard),'year','2026-01-01');
  period.display.forEach((traces,i)=>traces.forEach(t=>{if(t.reference){expect(t.paragraphIndexes).toEqual([]);expect(t.proposalIds).toEqual([]);expect(t.reference.segment).toBeLessThan(i);expect(period.display[t.reference.segment].some(owner=>owner.ruleId===t.ruleId&&owner.paragraphIndexes.includes(0))).toBe(true);}else expect(t.paragraphIndexes).toEqual([0]);}));
 });
 it('does not claim a natal clash from only two period positions',()=>{
  const c=calculateAdvanced(input,standard);for(const date of ['2026-02-04','2026-06-09','2027-01-01'])for(const s of calculatePeriod(c,'day',date).segments){
   for(const r of s.selection.applied)for(const p of r.premises)if(p.feature==='cross.충')expect(s.relations.some(rel=>rel.kind==='충'&&rel.positions.some(pos=>pos.startsWith('원국')))).toBe(true);
  }
 });
 it('shares identical year paragraphs through references across the five-year report',()=>{
  const report=buildAdvancedReport(calculateAdvanced(input,standard),2026),shown=new Set<string>();let refs=0;
  for(const year of report.years)for(const segment of year.display)for(const t of segment){if(t.reference){refs++;expect(shown.has(t.ruleId)).toBe(true);}else{expect(shown.has(t.ruleId)).toBe(false);shown.add(t.ruleId);}}
  expect(refs).toBeGreaterThan(0);
 });
 it('prevents contradictory stances on the same meaning axis even across different roles',()=>{
  const a={...periodModules[0],id:'first',priority:20,semanticAxis:'same-action',stance:'proceed'},b={...periodModules[0],id:'second',role:'other',exclusiveGroup:'other',semanticAxis:'same-action',stance:'pause'};
  const f={'period.god':'비견','known.day':true};const selected=selectManuscripts([b,a],f,'day');expect(selected.applied.map(r=>r.id)).toEqual(['first']);expect(selected.skipped.some(r=>r.reason==='의미 충돌')).toBe(true);
 });
});
describe('topic menus keep their own displayed claims',()=>{
 it('keeps career and love natal topics distinct with exact displayed trace ownership',()=>{
  const c=calculateAdvanced(input,standard),career=buildAdvancedReport(c,2026,undefined,'career-money'),love=buildAdvancedReport(c,2026,undefined,'love');
  expect(career.natal.applied.some(r=>r.role==='career')).toBe(true);expect(career.natal.applied.some(r=>r.role==='love')).toBe(false);expect(love.natal.applied.some(r=>r.role==='love')).toBe(true);expect(love.natal.applied.some(r=>r.role==='career')).toBe(false);
  for(const report of [career,love])expect(report.natal.trace.map(t=>t.ruleId)).toEqual(report.natal.applied.map(r=>r.id));
 });
});
