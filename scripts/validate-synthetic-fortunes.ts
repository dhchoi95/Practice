import { mkdirSync, writeFileSync, appendFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { calculateAdvanced } from '../src/domain/advanced/chart';
import { buildSectorReading, sectorRecords } from '../src/domain/foundation/engine';
import { presentSector } from '../src/domain/foundation/presentation';
import { domains } from '../src/domain/foundation/types';
import { elements, stemElements, branchElements } from '../src/domain/saju/tables';
import type { BirthInput } from '../src/domain/saju/types';

// Deterministic generated inputs; all seven dates are evaluated for each same person.
const size=Number(process.env.SAJU_CASES??1000), output=process.env.SAJU_OUTPUT??'reports/synthetic-validation';
if(!Number.isInteger(size)||size<10)throw new Error('SAJU_CASES must be an integer >= 10');
const dates=['2026-01-15','2026-02-04','2026-03-21','2026-06-21','2026-09-23','2026-11-08','2026-12-31'];
const options={enabled:true,timePolicy:'standard' as const};
let seed=0x59214a3b; const next=(n:number)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return Math.floor(seed/0x100000000*n);};
const candidates:BirthInput[]=[],seenInputs=new Set<string>();
while(candidates.length<size+100){const input:BirthInput={year:1965+next(41),month:1+next(12),day:1+next(28),hour:next(24),minute:next(60),unknownTime:candidates.length%5===0,calendar:'solar',leap:false,nickname:''};const key=JSON.stringify(input);if(!seenInputs.has(key)){seenInputs.add(key);candidates.push(input);}}
const pilotIndexes:number[]=[],pilotStems=new Set<number>();
for(const [i,input] of candidates.entries()){const stem=calculateAdvanced(input,options).pillars.day?.stem;if(stem!==undefined&&!pilotStems.has(stem)){pilotIndexes.push(i);pilotStems.add(stem);}if(pilotStems.size===10)break;}
if(pilotIndexes.length!==10)throw new Error('Unable to cover all ten day stems in pilot');
const people=[...pilotIndexes.map(i=>candidates[i]),...candidates.filter((_,i)=>!pilotIndexes.includes(i))].slice(0,size);
mkdirSync(output,{recursive:true});writeFileSync(`${output}/cases.jsonl`,'');writeFileSync(`${output}/inputs.json`,JSON.stringify({dates,options,people:people.map((input,i)=>({id:`synthetic-${String(i+1).padStart(4,'0')}`,input}))},null,2)+'\n');
const started=performance.now(),hits=new Map<string,number>(),skips=new Map<string,number>(),scores=Object.fromEntries(domains.map(d=>[d,[] as number[]])) as Record<typeof domains[number],number[]>;
const bodies=Object.fromEntries(domains.map(d=>[d,new Map<string,number>()])) as Record<typeof domains[number],Map<string,number>>;
const stems=new Set<number>(),months=new Set<number>(),strengths:Record<string,number>={},missing:Record<string,number>=Object.fromEntries(elements.map(e=>[e,0]));
const failures:string[]=[],pilot:unknown[]=[];let equal=0,processed=0,unknown=0,changes=0,comparisons=0,segments=0,duplicateContributionGroups=0,opposingContributionGroups=0;
for(const [i,input] of people.entries()){
 try{
  const chart=calculateAdvanced(input,options), pillars=Object.values(chart.pillars).filter(p=>p!==null),counts=Object.fromEntries(elements.map(e=>[e,0])) as Record<typeof elements[number],number>;
  for(const p of pillars){counts[stemElements[p.stem]]++;counts[branchElements[p.branch]]++;}
  if(Object.values(counts).reduce((a,b)=>a+b,0)!==pillars.length*2)throw new Error('element count');
  if(input.unknownTime&&chart.pillars.hour)throw new Error('unknown hour populated');
  if(chart.pillars.day)stems.add(chart.pillars.day.stem);if(chart.pillars.month)months.add(chart.pillars.month.branch);strengths[chart.strength.label]=(strengths[chart.strength.label]??0)+1;for(const e of elements)if(!counts[e])missing[e]++;
  const results=[];let last='';
  for(const date of dates){const reading=buildSectorReading(chart,'day',date),items=Object.fromEntries(domains.map(d=>{const shown=presentSector(reading,d),sector=reading.sectors[d];if(sector.score!==null&&(sector.score<0||sector.score>100))throw new Error(`${d} score range`);if(sector.score!==null)scores[d].push(sector.score);else unknown++;
    const body=shown.paragraphs.map(p=>p.text).join('\n'),counts=bodies[d];counts.set(body,(counts.get(body)??0)+1);
    return [d,{rawScore:sector.rawScore,score:sector.score,band:sector.band,title:shown.primary?.title??null,paragraphs:shown.paragraphs,ids:sector.records.map(r=>r.id)}];}));
   if(domains.every(d=>items[d].score===items.overall.score))equal++;
   const signature=JSON.stringify(reading.segments.map(s=>s.context.pillars.day));if(last){comparisons++;if(signature!==last)changes++;}last=signature;
   for(const s of reading.segments){segments++;for(const d of domains){const selected=s.sectors[d].records;for(const rec of selected)hits.set(rec.id,(hits.get(rec.id)??0)+1);for(const t of s.sectors[d].selectionTrace)if(t.decision==='skipped')skips.set(t.reason,(skips.get(t.reason)??0)+1);
    for(let a=0;a<selected.length;a++)for(let b=a+1;b<selected.length;b++){const x=selected[a],y=selected[b];if(x.contribution.group===y.contribution.group){duplicateContributionGroups++;if(x.contribution.delta*y.contribution.delta<0)opposingContributionGroups++;}if(x.conflictGroup===y.conflictGroup||x.duplicateGroup===y.duplicateGroup||x.meaningAxis===y.meaningAxis||x.incompatibleWith?.includes(y.semanticId)||y.incompatibleWith?.includes(x.semanticId)||x.paragraphs.some(p=>y.paragraphs.includes(p)))throw new Error(`${d} conflict ${x.id}/${y.id}`);}
   }}
   const detailed=reading.segments.map(s=>({start:s.start,end:s.end,period:s.context.pillars.day,relations:s.context.relations,domains:Object.fromEntries(domains.map(d=>[d,{facts:s.sectors[d].facts,rawScore:s.sectors[d].rawScore,score:s.sectors[d].score,contributions:s.sectors[d].contributions.map(c=>({recordId:c.recordId,group:c.group,delta:c.delta})),ids:s.sectors[d].records.map(r=>r.id)}]))}));
   results.push({date,policy:reading.policy,contentVersion:reading.contentVersion,scoreVersion:reading.scoreVersion,items,segments:detailed});processed++;
   if(i<10&&date===dates[0]){const repeat=buildSectorReading(chart,'day',date);if(JSON.stringify(reading)!==JSON.stringify(repeat))throw new Error('nondeterministic');}
  }
  const person={id:`synthetic-${String(i+1).padStart(4,'0')}`,input,calculationVersion:chart.policyVersion,interpretationVersion:chart.interpretationVersion,pillars:chart.pillars,elementCounts:counts,strength:chart.strength,results,validation:'automated-only; independent editorial and classical review pending'};
  appendFileSync(`${output}/cases.jsonl`,JSON.stringify(person)+'\n');if(i<10)pilot.push(person);
 }catch(e){failures.push(`${i+1}: ${String(e)}`);}
 if((i+1)%100===0)console.log(`${i+1}/${size} people, ${processed} readings, ${((performance.now()-started)/1000).toFixed(1)}s`);
}
const stats=Object.fromEntries(domains.map(d=>{const a=scores[d].sort((x,y)=>x-y),freq=bodies[d];return [d,{count:a.length,min:a[0]??null,max:a.at(-1)??null,median:a.length?a[Math.floor((a.length-1)/2)]:null,near50:a.filter(n=>n>=45&&n<=55).length,low:a.filter(n=>n<=20).length,high:a.filter(n=>n>=80).length,uniqueBodies:freq.size,repeatOccurrences:[...freq.values()].reduce((sum,n)=>sum+Math.max(0,n-1),0)}];}));
const eligible=sectorRecords.filter(r=>r.unit==='day');const report={sample:'deterministic synthetic solar births; standard time; 20% unknown birth time; not representative population',seed:'0x59214a3b',requestedPeople:size,completedPeople:size-failures.length,dates,completedReadings:processed,expectedReadings:size*dates.length,expectedSectorResults:size*dates.length*domains.length,unknownScores:unknown,segments,duplicateContributionGroups,opposingContributionGroups,equalSixSectorReadings:equal,consecutiveDifferentDayPillar:{changes,comparisons},coveredDayStems:[...stems].sort((a,b)=>a-b),coveredMonthBranches:[...months].sort((a,b)=>a-b),strengths,absentElementPeople:missing,stats,selectedDayRecords:hits.size,eligibleDayRecords:eligible.length,unselectedDayRecords:eligible.filter(r=>!hits.has(r.id)).map(r=>r.id),selectionSkipReasons:Object.fromEntries(skips),failures,elapsedSeconds:(performance.now()-started)/1000,apiCostUsd:0,aggregationNote:'Overall and period raw/display values are aggregated separately, with 5-point display rounding; displayScore(aggregate raw) need not equal aggregate displayed score.',limits:'Automated rules and exact text duplicates only; no independent accuracy, qualitative similarity, prose quality or UI review. Baseline or changed version must be identified by invocation.'};
writeFileSync(`${output}/summary.json`,JSON.stringify(report,null,2)+'\n');writeFileSync(`${output}/pilot-10.json`,JSON.stringify(pilot,null,2)+'\n');console.log(JSON.stringify(report,null,2));if(failures.length||processed!==size*dates.length)process.exitCode=1;
