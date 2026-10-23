import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import cohortRaw from '../tests/fixtures/iteration-cohorts.json';
import { calculateAdvanced } from '../src/domain/advanced/chart';
import { buildSectorReading,sectorRecords,scheduleRecords } from '../src/domain/foundation/engine';
import { presentSector } from '../src/domain/foundation/presentation';
import { domains,domainNames } from '../src/domain/foundation/types';
import type { BirthInput } from '../src/domain/saju/types';
import type { AdvancedOptions } from '../src/domain/advanced/types';
import type { PeriodKind } from '../src/domain/fortune/period';
const phase=process.argv.includes('--before')?'before':'after';const dir=`reports/iteration-2.2.0/${phase}`;await fs.mkdir(`${dir}/examples`,{recursive:true});
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const sourceRecords=[...sectorRecords,...scheduleRecords];
const factPaths=[...new Set(sectorRecords.flatMap(r=>[...r.requires.all,...r.requires.any??[],...r.exclusions].map(t=>t.path)))].sort();
const cohorts=cohortRaw as unknown as {fixed:{id:string;input:BirthInput;options:AdvancedOptions}[];additional:{id:string;input:BirthInput;options:AdvancedOptions}[]};
const owners=new Map<string,Set<string>>();for(const r of sectorRecords)for(const p of r.paragraphs){const set=owners.get(p)??new Set();set.add(r.semanticId);owners.set(p,set);}
const pool=new Map<string,string>(),runs:unknown[]=[],summaries:unknown[]=[],occupancy=new Map<string,{selected:number;visible:number;core:number;supplement:number;units:Set<string>}>(),paragraphUse=new Map<string,number>(),scoreExamples=new Map<string,{profile:string;target:string;meaning:string}>();
const allWitnesses=new Map<string,unknown>();
for(const r of sourceRecords)occupancy.set(r.id,{selected:0,visible:0,core:0,supplement:0,units:new Set()});
for(const [cohort,profiles] of Object.entries({fixed:cohorts.fixed,additional:cohorts.additional}))for(const [index,profile] of profiles.entries()){
 const chart=calculateAdvanced(profile.input,profile.options);
 const metrics=new Map<string,{bodies:Map<string,number>;ids:Set<string>;meanings:Set<string>;daily:string[];tenDay:number;consecutive:number;paragraphs:number;commonParagraphs:number;maxCore:Map<string,number>;selectedHidden:number;scoreDifferent:unknown[]}>();
 const targets:{kind:PeriodKind;target:string}[]=[...Array.from({length:365},(_,d)=>({kind:'day' as const,target:new Date(Date.UTC(2026,0,1+d)).toISOString().slice(0,10)})),...Array.from({length:12},(_,m)=>({kind:'month' as const,target:`2026-${String(m+1).padStart(2,'0')}-01`})),...Array.from({length:5},(_,y)=>({kind:'year' as const,target:`${2026+y}-01-01`}))];
 for(const {kind,target} of targets){
  const reading=buildSectorReading(chart,kind,target),display=Object.fromEntries(domains.map(d=>[d,presentSector(reading,d)]));
  const compact={profile:profile.id,cohort,kind,target,period:[reading.start,reading.end],segments:reading.segments.map(s=>({range:[s.start,s.end],facts:Object.fromEntries(factPaths.map(p=>[p,s.sectors.overall.facts[p]??null])),sectors:Object.fromEntries(domains.map(d=>[d,{score:s.sectors[d].score,ids:s.sectors[d].records.map(r=>r.id)}]))})),visible:Object.fromEntries(domains.map(d=>[d,display[d].paragraphs.map(p=>{const h=hash(p.text);pool.set(h,p.text);return {hash:h,id:p.recordId,role:p.role};})]))};runs.push(compact);
  for(const d of domains){const key=`${kind}:${d}`,m:NonNullable<ReturnType<typeof metrics.get>>=metrics.get(key)??{bodies:new Map(),ids:new Set(),meanings:new Set(),daily:[],tenDay:0,consecutive:0,paragraphs:0,commonParagraphs:0,maxCore:new Map(),selectedHidden:0,scoreDifferent:[]};metrics.set(key,m);
   const plan=display[d],visibleIds=new Set(plan.paragraphs.map(p=>p.recordId)),body=hash(plan.paragraphs.map(p=>p.text)),ids=hash(plan.paragraphs.map(p=>p.recordId)),meaning=hash(plan.paragraphs.map(p=>sectorRecords.find(r=>r.id===p.recordId)?.semanticId));
   m.bodies.set(body,(m.bodies.get(body)??0)+1);m.ids.add(ids);m.meanings.add(meaning);
   if(kind==='day'){const n=m.daily.length;if(n>=10&&m.daily[n-10]===body)m.tenDay++;if(n&&m.daily[n-1]===body)m.consecutive++;m.daily.push(body);}
   for(const s of reading.segments)for(const r of s.sectors[d].records){const o=occupancy.get(r.id)!;o.selected++;o[r.role]++;o.units.add(`${cohort}:${profile.id}:${kind}`);if(visibleIds.has(r.id))o.visible++;else m.selectedHidden++;if(!allWitnesses.has(r.id))allWitnesses.set(r.id,{profile:profile.id,cohort,kind,target,range:[s.start,s.end],facts:s.sectors[d].facts,score:s.sectors[d].score});}
   if(plan.primary)m.maxCore.set(plan.primary.id,(m.maxCore.get(plan.primary.id)??0)+1);
   for(const p of plan.paragraphs){const h=hash(p.text);paragraphUse.set(h,(paragraphUse.get(h)??0)+1);m.paragraphs++;if((owners.get(p.text)?.size??0)>1)m.commonParagraphs++;}
   const score=reading.sectors[d].score,scoreKey=`${cohort}:${profile.id}:${d}:${score}`;const old=scoreExamples.get(scoreKey);if(old&&old.meaning!==meaning&&m.scoreDifferent.length<2)m.scoreDifferent.push({score,first:old.target,again:target});if(score!==null)scoreExamples.set(scoreKey,{profile:profile.id,target,meaning});
  }
  if((index<3&&['2026-10-23','2026-10-01','2026-01-01'].includes(target))||(index>=10&&target==='2026-02-04')){
   const id=`${profile.id}-${kind}-${target}`;await fs.writeFile(`${dir}/examples/${id}.json`,JSON.stringify({profile,chart,reading,display},null,2)+'\n');
   await fs.writeFile(`${dir}/examples/${id}.md`,`# ${id}\n\n`+domains.map(d=>`## ${domainNames[d]} · ${reading.sectors[d].score??'보류'}\n\n`+display[d].paragraphs.map(p=>p.text).join('\n\n')).join('\n\n')+'\n');
  }
 }
 summaries.push({profile:profile.id,cohort,input:profile.input,options:profile.options,dayMaster:chart.pillars.day,metrics:Object.fromEntries([...metrics].map(([key,m])=>[key,{uniqueVisibleBodies:m.bodies.size,uniqueDisplayedIdCombinations:m.ids.size,uniqueMeaningCombinations:m.meanings.size,tenDayRepeats:m.tenDay,tenDayComparisons:m.daily.length?355:0,consecutiveRepeats:m.consecutive,consecutiveComparisons:m.daily.length?364:0,mostCommonBodyCount:Math.max(...m.bodies.values()),mostCommonCore:[...m.maxCore].sort((a,b)=>b[1]-a[1]).slice(0,3),paragraphCount:m.paragraphs,sharedParagraphCount:m.commonParagraphs,selectedButNotDefaultVisible:m.selectedHidden,sameScoreDifferentMeaning:m.scoreDifferent}]))});
}
const families=new Map<string,typeof sectorRecords>();for(const r of sectorRecords)families.set(`${r.domain}:${r.unit}`, [...families.get(`${r.domain}:${r.unit}`)??[],r]);
const inventory=[...families].map(([key,rs])=>({key,records:rs.length,core:rs.filter(r=>r.role==='core').length,supplements:rs.filter(r=>r.role==='supplement').length,semanticIds:new Set(rs.map(r=>r.semanticId)).size,uniqueBodies:new Set(rs.map(r=>JSON.stringify(r.paragraphs))).size,paragraphs:new Set(rs.flatMap(r=>r.paragraphs)).size}));
const coverage=[...occupancy].map(([id,o])=>({id,...o,units:[...o.units]}));
await fs.writeFile(`${dir}/summary.json`,JSON.stringify({phase,version:sectorRecords[0].version,cohortHash:hash(cohortRaw),sourceHashes:Object.fromEntries(['src/content/foundation/sectors.json','src/content/foundation/schedules.json','src/domain/foundation/engine.ts','src/domain/foundation/presentation.ts'].map(p=>[p,'pending-file-hash'])),inventory,profiles:summaries,coverage,unhit:coverage.filter(c=>!c.selected).map(c=>c.id),unshown:coverage.filter(c=>c.selected&&!c.visible).map(c=>c.id),commonParagraphs:[...paragraphUse].sort((a,b)=>b[1]-a[1]).slice(0,24).map(([h,count])=>({hash:h,text:pool.get(h),count})),witnessIds:[...allWitnesses.keys()],independentApproval:false},null,2)+'\n');
const summary=JSON.parse(await fs.readFile(`${dir}/summary.json`,'utf8'));for(const p of Object.keys(summary.sourceHashes))summary.sourceHashes[p]=createHash('sha256').update(await fs.readFile(p)).digest('hex');await fs.writeFile(`${dir}/summary.json`,JSON.stringify(summary,null,2)+'\n');
await fs.writeFile(`${dir}/all-results.json.gz`,gzipSync(JSON.stringify({profiles:cohorts,textPool:Object.fromEntries(pool),records:sourceRecords,runs})));await fs.writeFile(`${dir}/witnesses.json`,JSON.stringify(Object.fromEntries(allWitnesses),null,2)+'\n');
console.log(`PASS ${phase}: fixed 12 + additional 12; each 365 days, 12 months, 5 years; ${runs.length} complete compact results; ${allWitnesses.size} records selected.`);
