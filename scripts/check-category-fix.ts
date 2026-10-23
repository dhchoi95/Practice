import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {calculateAdvanced} from '../src/domain/advanced/chart';
import {buildSectorReading,selectSectorRecords,sectorRecords} from '../src/domain/foundation/engine';
import {domains,type SectorRecord} from '../src/domain/foundation/types';
import cohorts from '../tests/fixtures/iteration-cohorts.json';
import type {BirthInput} from '../src/domain/saju/types';
import type {AdvancedOptions} from '../src/domain/advanced/types';
await fs.mkdir('reports/category-clarity-fix',{recursive:true});
const base='1c9f24e',old:SectorRecord[]=JSON.parse(execFileSync('git',['show',`${base}:src/content/foundation/sectors.json`],{encoding:'utf8',maxBuffer:16*1024**2}));
const allowed=new Set(['title','paragraphs','version']);let edited=0;
for(const r of sectorRecords){const before=old.find(o=>o.id===r.id);if(!before)throw new Error(`New unexpected record ${r.id}`);for(const key of Object.keys(r) as (keyof SectorRecord)[])if(!allowed.has(key)&&JSON.stringify(r[key])!==JSON.stringify(before[key]))throw new Error(`Changed calculation/selection premise: ${r.id}/${key}`);if(JSON.stringify(r)!==JSON.stringify(before))edited++;}
const buckets=new Map<string,SectorRecord[]>();for(const r of old){const key=r.unit+':'+r.domain;buckets.set(key,[...buckets.get(key)??[],r]);}
let comparisons=0;
for(const p of cohorts.fixed){const c=calculateAdvanced(p.input as BirthInput,p.options as AdvancedOptions);for(const [kind,targets] of [['day',Array.from({length:365},(_,i)=>new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10))],['month',Array.from({length:12},(_,i)=>`2026-${String(i+1).padStart(2,'0')}-01`)],['year',Array.from({length:5},(_,i)=>`${2026+i}-01-01`)]] as const)for(const target of targets){const reading=buildSectorReading(c,kind,target);for(const s of reading.segments)for(const d of domains){const judgment=s.sectors[d];const previous=judgment.facts['known.day']?selectSectorRecords(buckets.get(kind+':'+d)!,judgment.facts).selected:[];if(JSON.stringify(previous.map(r=>r.id))!==JSON.stringify(judgment.records.map(r=>r.id)))throw new Error(`Copy changed actual selection: ${p.id}/${target}/${d}`);comparisons++;}}}
const report={passed:true,baseline:base,records:sectorRecords.length,changedCopyRecords:edited,premisePriorityContributionChanges:0,actualSegmentDomainComparisons:comparisons,cohort:'retained fixed12; each365 days,12 months,5years',selectionChanges:0};
await fs.writeFile('reports/category-clarity-fix/premise-score-invariance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
