/** Reproducible checks of distinct inputs; synthetic data only, no network or AI. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {validateBirth} from '../src/lib/validation';
import {generalChart} from '../src/domain/fortune/general-policy';
import {toLunar,toSolar,isoDate} from '../src/domain/calendar/korean';
import {solarTerms} from '../src/domain/calendar/terms';
import {standardParts} from '../src/domain/calendar/timezone';
import {buildSectorReading,matches,matchesTest,scheduleFor} from '../src/domain/foundation/engine';
import {presentSector} from '../src/domain/foundation/presentation';
import {domains} from '../src/domain/foundation/types';
import type {BirthInput} from '../src/domain/saju/types';

const directory='reports/exploratory-saju',seed=20261031,clock={now:()=>new Date('2026-10-31T03:00:00Z')};
let state=seed;
const random=(max:number)=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state%max;};
const base:BirthInput={year:1995,month:11,day:8,unknownTime:true,calendar:'solar',leap:false,nickname:''};
const cases:{id:string;input:BirthInput;purpose:string}[]=[];
for(let i=0;i<72;i++){
 const solar={year:1962+random(64),month:1+i%12,day:1+random(28)};
 const unknownTime=i%6===0;
 const useLunar=i%4===0,lunar=toLunar(solar);
 cases.push({id:`SEED-${String(i+1).padStart(2,'0')}`,input:{...base,...(useLunar?lunar:solar),calendar:useLunar?'lunar':'solar',unknownTime,...(!unknownTime?{hour:random(24),minute:random(60)}:{})},purpose:'seeded seasons, known/unknown time, solar/lunar'});
}
for(const term of solarTerms(2024)){
 for(const offset of [-3,3]){
  const p=standardParts(term.instant+offset*60_000);
  cases.push({id:`TERM-${term.name}-${offset<0?'before':'after'}`,input:{...base,...p,unknownTime:false},purpose:'three minutes either side of a calculated monthly solar term; not an independent timestamp proof'});
 }
 const p=standardParts(term.instant);
 cases.push({id:`TERM-${term.name}-unknown`,input:{...base,year:p.year,month:p.month,day:p.day},purpose:'unknown birth time on a real term date'});
}
for(const [h,m] of [[0,0],[0,1],[22,59],[23,0],[23,1],[23,59],[1,0],[1,1]])cases.push({id:`HOUR-${h}-${m}`,input:{...base,year:2001,month:9,day:19,unknownTime:false,hour:h,minute:m},purpose:'fixed standard midnight and hour boundaries'});
for(const unknownTime of [true,false])cases.push({id:`DST-${unknownTime?'unknown':'known'}`,input:{...base,year:1987,month:6,day:1,unknownTime,...(!unknownTime?{hour:0,minute:30}:{})},purpose:'summer wall-clock midnight maps to previous fixed-standard day'});
interface CheckedCase {id:string;input:BirthInput;solar:string;natal:ReturnType<typeof generalChart>['pillars'];[key:string]:unknown}
const results:(CheckedCase|{id:string;status:string;expected:string})[]=[],failures:unknown[]=[];
for(const [index,c] of cases.entries()){
 try{
  const input=validateBirth(c.input,clock),before=JSON.stringify(input),chart=generalChart(input);
  assert.equal(JSON.stringify(input),before,'calculation must not mutate input');
  const solar=input.calendar==='lunar'?toSolar(input):{year:input.year,month:input.month,day:input.day};
  const lunar=toLunar(solar),equivalent=generalChart({...input,...lunar,calendar:'lunar'});
  assert.deepEqual(equivalent.pillars,chart.pillars,'solar/lunar equivalent inputs');
  if(input.unknownTime)assert.equal(chart.pillars.hour,null,'unknown time is not midnight');
  const kind=(['day','month','year'] as const)[index%3],target=kind==='year'?'2028-01-01':kind==='month'?'2027-02-01':'2027-02-14';
  const reading=buildSectorReading(chart,kind,target),again=buildSectorReading(chart,kind,target);
  assert.deepEqual(reading,again,'same input, target, and version is stable');
  for(const segment of reading.segments)for(const domain of domains)for(const record of segment.sectors[domain].records){
   assert(matches(record.requires,segment.sectors[domain].facts),'selection premise');
   assert(!record.exclusions.some(t=>matchesTest(t,segment.sectors[domain].facts)),'no selected exclusion');
  }
  const fields=domains.map(domain=>{
   const sector=reading.sectors[domain],plan=presentSector(reading,domain);
   if(chart.pillars.day){assert(sector.score!==null&&sector.score>=0&&sector.score<=100&&sector.score%5===0);assert(plan.primary);}
   else {assert.equal(sector.score,null);assert.equal(plan.paragraphs.length,0);}
   for(const p of plan.paragraphs){const source=sector.records.find(r=>r.id===p.recordId);assert(source&&[...source.paragraphs,source.proposal].includes(p.text),'visible prose has a real selected owner');}
   assert(!/오늘|내일|올해/.test(plan.paragraphs.map(p=>p.text).join(' ')),'future selected period is not called today or this year');
   return {domain,score:sector.score,ids:plan.paragraphs.map(p=>p.recordId)};
  });
  if(kind==='day'){
   const snapshot=JSON.stringify(reading);
   for(const context of ['general','interview','exam','presentation','contract','meeting'] as const)scheduleFor(reading,context);
   assert.equal(JSON.stringify(reading),snapshot,'schedule does not change core scores/reading');
  }
  results.push({...c,status:'passed',solar:isoDate(solar),natal:chart.pillars,kind,target,fields});
 }catch(error){failures.push({id:c.id,error:String(error)});}
}
const invalid:[string,Partial<BirthInput>][]=[['below-range',{year:1961,month:12,day:31}],['future',{year:2027}],['non-leap-february',{year:2001,month:2,day:29}],['day-zero',{day:0}],['month-thirteen',{month:13}],['hour-24',{unknownTime:false,hour:24,minute:0}],['minute-60',{unknownTime:false,hour:12,minute:60}],['missing-known-minute',{unknownTime:false,hour:12}],['missing-known-hour',{unknownTime:false,minute:0}],['solar-leap-flag',{leap:true}],['nonexistent-lunar-leap',{calendar:'lunar',year:2024,month:2,day:1,leap:true}],['long-name',{nickname:'가'.repeat(21)}]];
for(const [id,patch] of invalid){try{assert.throws(()=>validateBirth({...base,...patch},clock));results.push({id:`INVALID-${id}`,status:'passed',expected:'reject'});}catch(error){failures.push({id,error:String(error)});}}
const report={seed,clock:clock.now().toISOString(),validInputs:cases.length,invalidInputs:invalid.length,distinctCases:cases.length+invalid.length,passed:!failures.length,failures,results,limits:'Selection, stability and round-trip checks are internal invariants. Independent astronomical checks are reported separately. Counts do not measure narrative quality or predictive accuracy.'};
await fs.mkdir(directory,{recursive:true});await fs.writeFile(`${directory}/seeded-checks.json`,JSON.stringify(report,null,2)+'\n');
await fs.writeFile(`${directory}/seeded-common-facts.json`,JSON.stringify(results.filter((r):r is CheckedCase=>'solar'in r).map(r=>({id:r.id,input:r.input,solar:r.solar,natal:r.natal})),null,2)+'\n');
console.log(JSON.stringify({distinctCases:report.distinctCases,valid:cases.length,invalid:invalid.length,passed:report.passed,failures}));
if(failures.length)process.exitCode=1;
