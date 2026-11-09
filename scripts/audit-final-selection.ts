import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {calculateAdvanced} from '../src/domain/advanced/chart';
import {buildSectorReading,selectSectorRecords} from '../src/domain/foundation/engine';
import {domains,type SectorRecord} from '../src/domain/foundation/types';
import cohorts from '../tests/fixtures/iteration-cohorts.json';
import type {BirthInput} from '../src/domain/saju/types';
import type {AdvancedOptions} from '../src/domain/advanced/types';
const previous:SectorRecord[]=JSON.parse(execFileSync('git',['show','407f6e9:src/content/foundation/sectors.json'],{encoding:'utf8',maxBuffer:16*1024**2}));
const buckets=new Map<string,SectorRecord[]>();for(const r of previous)buckets.set(r.unit+':'+r.domain,[...buckets.get(r.unit+':'+r.domain)??[],r]);
let checked=0;const errors:string[]=[],hit=new Set<string>();
for(const p of cohorts.fixed){const c=calculateAdvanced(p.input as BirthInput,p.options as AdvancedOptions);for(const[kind,dates]of[['day',Array.from({length:365},(_,i)=>new Date(Date.UTC(2026,0,1+i)).toISOString().slice(0,10))],['month',Array.from({length:12},(_,i)=>`2026-${String(i+1).padStart(2,'0')}-01`)],['year',Array.from({length:5},(_,i)=>`${2026+i}-01-01`)]]as const)for(const target of dates){const r=buildSectorReading(c,kind,target);for(const s of r.segments)for(const d of domains){const j=s.sectors[d],before=j.facts['known.day']?selectSectorRecords(buckets.get(kind+':'+d)!,j.facts).selected:[];if(JSON.stringify(before.map(r=>r.id))!==JSON.stringify(j.records.map(r=>r.id)))errors.push(`${p.id}/${target}/${d}: selection`);if(d!=='overall'&&j.score!==null&&j.rawScore!==50+Math.max(-25,Math.min(25,j.contributions.reduce((v,c)=>v+c.delta,0))))errors.push(`${p.id}/${target}/${d}: raw score trace`);for(const record of j.records)hit.add(record.id);checked++;}}}
await fs.mkdir('reports/final-2.3.0',{recursive:true});await fs.writeFile('reports/final-2.3.0/selection-audit.json',JSON.stringify({passed:!errors.length,baseline:'407f6e9',comparisons:checked,selectedIdsUnchanged:true,nonOverallSegmentRawScoresTraceChecked:true,observedRecords:hit.size,unobservedRecords:540-hit.size,errors,meaning:'고정 집단에서 선택 보존과 변경된 원점수의 기여 내역 대조. 미선정 원고를 읽지 않은 것으로 취급하지 않으며 새 해석 상황이나 정확도로 세지 않음.'},null,2)+'\n');if(errors.length)throw new Error(errors.slice(0,20).join('\n'));console.log(`${checked} selections unchanged, non-overall raw score traces checked, ${hit.size}/540 records selected in fixed cohort.`);
