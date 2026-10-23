import fs from 'node:fs/promises';
import { calculateAdvanced } from '../src/domain/advanced/chart';
import { buildSectorReading } from '../src/domain/foundation/engine';
import { presentSector } from '../src/domain/foundation/presentation';
import { domains } from '../src/domain/foundation/types';
const chart=calculateAdvanced({year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''},{enabled:true,timePolicy:'true-solar',cityId:'suwon'});
const expected=[];
for(const name of ['day','date','month','year'] as const){const reading=buildSectorReading(chart,name==='date'?'day':name,name==='date'?'2026-10-24':'2026-10-23');expected.push({name,paragraphs:domains.flatMap(d=>presentSector(reading,d).paragraphs.map(p=>({domain:d,id:p.recordId,text:p.text}))),contributionTitles:reading.segments.flatMap(s=>domains.filter(d=>d!=='overall').flatMap(d=>s.sectors[d].contributions.map(c=>s.sectors[d].records.find(r=>r.id===c.recordId)!.title)))});}
await fs.writeFile('reports/iteration-2.2.0/pdf-expected.json',JSON.stringify(expected,null,2)+'\n');
