import fs from 'node:fs/promises';
import { calculateAdvanced } from '../src/domain/advanced/chart';
import { calculatePeriod } from '../src/domain/advanced/period';
import { sectorFacts,judgeSector } from '../src/domain/foundation/engine';
import { domains } from '../src/domain/foundation/types';
import type { BirthInput } from '../src/domain/saju/types';
const dir='reports/foundation-2.1.0';const inventory=JSON.parse(await fs.readFile(`${dir}/inventory.json`,'utf8')) as {coverage:{id:string;selected:number}[]};
const missing=new Set(inventory.coverage.filter(r=>!r.selected).map(r=>r.id));const original=[...missing],witnesses:unknown[]=[];
for(let i=0;i<12&&missing.size;i++){
 const input:BirthInput={year:1990,month:i+1,day:5+i,hour:10,minute:30,calendar:'solar',leap:false,unknownTime:false,nickname:''};const options={enabled:true,timePolicy:'standard' as const,luckClass:'male' as const},chart=calculateAdvanced(input,options);
 for(let year=1962;year<=2050&&missing.size;year++)for(const unit of ['month','year'] as const){
  if(![...missing].some(id=>id.startsWith(`sector:${unit}:`)))continue;
  for(let month=1;month<=(unit==='year'?1:12)&&missing.size;month++){
   const target=`${year}-${String(month).padStart(2,'0')}-01`;
   for(const segment of calculatePeriod(chart,unit,target).segments){const facts=sectorFacts(chart,segment);for(const domain of domains){const core=judgeSector(domain,unit,facts).records[0];if(core&&missing.delete(core.id))witnesses.push({id:core.id,input,options,target,unit,segmentStart:segment.start,segmentEnd:segment.end,requires:core.requires,facts});}}
  }
 }
}
const report={cohortUnselected:original.length,cohortScope:'12 profiles × 365 days/12 months/5 years; unchanged by this additional search',additionalSearch:'up to 12 other natal charts across 1962..2050; actual valid pillars, conditions and priority selector; not prediction validation',reachableOutsideCohort:witnesses,unresolved:[...missing],independentApproval:false};
await fs.writeFile(`${dir}/reachability.json`,JSON.stringify(report,null,2)+'\n');console.log(`${original.length} unhit in main cohort; ${witnesses.length} actual additional witnesses; ${missing.size} unresolved.`);
