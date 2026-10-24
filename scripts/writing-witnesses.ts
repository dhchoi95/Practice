import fs from 'node:fs/promises';
import {calculateAdvanced} from '../src/domain/advanced/chart';
import {buildSectorReading} from '../src/domain/foundation/engine';
import {domains} from '../src/domain/foundation/types';
import cohorts from '../tests/fixtures/iteration-cohorts.json';
import type {BirthInput} from '../src/domain/saju/types';
import type {AdvancedOptions} from '../src/domain/advanced/types';
const audit=JSON.parse(await fs.readFile('reports/writing-reset/audit.json','utf8'));const pending=new Set<string>(audit.unhitEdited);const witnesses:Record<string,unknown>={};let calculations=0;
outer:for(const p of [...cohorts.additional,...cohorts.fixed]){const c=calculateAdvanced(p.input as BirthInput,p.options as AdvancedOptions);if(!c.pillars.day)continue;for(let y=2026;y<=2050;y++)for(const kind of ['day','year']as const){if(![...pending].some(id=>id.includes(':'+kind+':')))continue;for(let day=1;day<=(kind==='day'?31:1);day++){const target=`${y}-01-${String(day).padStart(2,'0')}`,r=buildSectorReading(c,kind,target);calculations++;for(const s of r.segments)for(const d of domains)for(const rec of s.sectors[d].records)if(pending.has(rec.id)){witnesses[rec.id]={input:p.input,options:p.options,kind,target,range:[s.start,s.end],facts:s.sectors[d].facts,score:s.sectors[d].score};pending.delete(rec.id);}if(!pending.size)break outer;}}}
await fs.writeFile('reports/writing-reset/separate-witnesses.json',JSON.stringify({scope:'Separate reachability search; never merged into fixed-cohort occupancy',calculations,witnesses,pending:[...pending],independentApproval:false},null,2)+'\n');console.log(`Separate real-selection witnesses: ${Object.keys(witnesses).length}/${audit.unhitEdited.length}; pending ${[...pending]}`);
