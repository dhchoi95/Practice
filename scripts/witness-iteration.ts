import fs from 'node:fs/promises';
import cohorts from '../tests/fixtures/iteration-cohorts.json';
import { calculateAdvanced } from '../src/domain/advanced/chart';
import { buildSectorReading,sectorRecords,matches } from '../src/domain/foundation/engine';
import { domains } from '../src/domain/foundation/types';
import type { BirthInput } from '../src/domain/saju/types';
import type { AdvancedOptions } from '../src/domain/advanced/types';
const dir='reports/iteration-2.2.0/after';
const witnesses=JSON.parse(await fs.readFile(`${dir}/witnesses.json`,'utf8'));
const pending=new Set(sectorRecords.filter(r=>r.editorial&&!witnesses[r.id]).map(r=>r.id));
let calculations=0;
outer:for(const p of [...cohorts.fixed,...cohorts.additional]){
 const chart=calculateAdvanced(p.input as BirthInput,p.options as AdvancedOptions);if(!chart.pillars.day)continue;
 for(let year=1962;year<=2050;year++)for(const kind of ['year','month'] as const){
  if(![...pending].some(id=>id.startsWith(`sector:${kind}:`)))continue;
  for(let month=1;month<=(kind==='year'?1:12);month++){
   const target=`${year}-${String(month).padStart(2,'0')}-01`,r=buildSectorReading(chart,kind,target);calculations++;
   for(const s of r.segments)for(const d of domains)for(const record of s.sectors[d].records)if(pending.has(record.id)){
    if(!matches(record.requires,s.sectors[d].facts))throw new Error('Invalid witness');
    witnesses[record.id]={profile:p.id,input:p.input,options:p.options,kind,target,range:[s.start,s.end],facts:s.sectors[d].facts,score:s.sectors[d].score,scope:'separate reachability search, outside fixed comparison'};pending.delete(record.id);
   }
   if(!pending.size)break outer;
  }
 }
}
const meanings=[...new Set(sectorRecords.filter(r=>r.editorial).map(r=>r.semanticId))].map(id=>({semanticId:id,records:sectorRecords.filter(r=>r.semanticId===id).map(r=>({id:r.id,role:r.role,witness:witnesses[r.id]??null})),independentApproval:false}));
await fs.writeFile(`${dir}/new-meaning-witnesses.json`,JSON.stringify({calculations,pending:[...pending],meanings},null,2)+'\n');
console.log(`Actual new meanings witnessed: ${meanings.filter(m=>m.records.some(r=>r.witness)).length}/72; period records: ${216-pending.size}/216; separate calculations ${calculations}; pending ${[...pending]}`);
