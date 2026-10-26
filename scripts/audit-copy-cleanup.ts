import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {natalModules} from '../src/content/advanced/natal';
import {sectorRecords,buildSectorReading} from '../src/domain/foundation/engine';
import {generalChart} from '../src/domain/fortune/general-policy';
import {presentSector} from '../src/domain/foundation/presentation';
import {domains,domainNames} from '../src/domain/foundation/types';
import {canonicalContent} from '../src/domain/interpretation/review';
import type {BirthInput} from '../src/domain/saju/types';
const base='b90a452f954e3bcd00e6ac4c0c925cea50a3bbf5',dir='content-review/copy-cleanup';
await fs.mkdir(dir,{recursive:true});
const old=(path:string)=>execFileSync('git',['show',`${base}:${path}`],{encoding:'utf8',maxBuffer:32*1024*1024});
const hash=(v:unknown)=>createHash('sha256').update(canonicalContent(v)).digest('hex');
const omit=(r:Record<string,unknown>,keys:string[])=>Object.fromEntries(Object.entries(r).filter(([k])=>!keys.includes(k)));
const oldLedger=JSON.parse(old('content-review/advanced-reviews.json')) as {id:string;ruleId:string;hash:string;supersedes?:string}[];
const oldSnapshots=JSON.parse(old('content-review/advanced-snapshots.json')) as {hash:string;record:typeof natalModules[number]}[];
const edits:unknown[]=[],errors:string[]=[];
for(const record of natalModules){
 const head=oldLedger.find(r=>r.ruleId===record.id&&!oldLedger.some(n=>n.supersedes===r.id));
 const before=oldSnapshots.find(s=>s.hash===head?.hash)?.record;
 if(!before)throw new Error(`No baseline ${record.id}`);
 const nonCopy=(r:typeof record)=>({...omit(r as unknown as Record<string,unknown>,['title','text','version','updatedAt','claim']),claim:omit(r.claim,['text'])});
 if(hash(nonCopy(before))!==hash(nonCopy(record)))errors.push(`natal selection/claim scope ${record.id}`);
 if(hash(before)!==hash(record))edits.push({group:'natal',id:record.id,before,after:record,beforeHash:hash(before),afterHash:hash(record),status:'author-edited-pending-independent'});
}
const oldSectors=JSON.parse(old('src/content/foundation/sectors.json')) as typeof sectorRecords;
for(const record of sectorRecords){
 const before=oldSectors.find(r=>r.id===record.id)!;
 if(hash(omit(before as unknown as Record<string,unknown>,['title','paragraphs','proposal','version']))!==hash(omit(record as unknown as Record<string,unknown>,['title','paragraphs','proposal','version'])))errors.push(`sector selection/score ${record.id}`);
 if(hash(before)!==hash(record))edits.push({group:'sector',id:record.id,before,after:record,beforeHash:hash(before),afterHash:hash(record),status:'author-edited-pending-independent'});
}
// Ordinary-input policy changes live above the engine. Preserve every existing engine,
// calendar, astronomical table, scorer and selection rule except the accepted copy version.
const protectedPaths=execFileSync('git',['ls-tree','-r','--name-only',base,'src/domain','src/content/advanced/period.ts','src/content/foundation/schedules.json','src/content/foundation/period-notes.json','src/content/rules.json','src/app/globals.css'],{encoding:'utf8'}).trim().split('\n').filter(p=>!['src/domain/foundation/presentation.ts','src/domain/foundation/types.ts'].includes(p));
const engineChecks=[];
for(const path of protectedPaths){let current=await fs.readFile(path,'utf8');if(path==='src/domain/foundation/engine.ts')current=current.replaceAll(", '2.4.0'",'').replaceAll(",'2.4.0'",'');const passed=current===old(path);engineChecks.push({path,passed});if(!passed)errors.push(`protected engine/source ${path}`);}
const input:BirthInput={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''};
const fixtures=[{id:'year-2027',input,kind:'year',target:'2027-01-01'},{id:'day-2026-10-25',input,kind:'day',target:'2026-10-25'},{id:'month-2026-10',input,kind:'month',target:'2026-10-01'},{id:'lichun-boundary',input,kind:'day',target:'2026-02-04'},{id:'unknown-hour',input:{...input,unknownTime:true},kind:'day',target:'2026-10-25'},{id:'unknown-day',input:{...input,year:1987,month:6,day:1,unknownTime:true},kind:'year',target:'2027-01-01'}] as const;
const examples=[];
for(const fixture of fixtures){
 const reading=buildSectorReading(generalChart(fixture.input),fixture.kind,fixture.target);
 const assembled=domains.map(d=>({domain:d,label:domainNames[d],score:reading.sectors[d].score,...presentSector(reading,d)}));
 examples.push({fixture,internalSegments:reading.segments.length,assembled});
 let md=`# ${fixture.id}: ${reading.label}\n\n出生정보: 양력 ${fixture.input.year}-${fixture.input.month}-${fixture.input.day}, ${fixture.input.unknownTime?'시간 모름':`${fixture.input.hour}:${fixture.input.minute}`} / 한국 표준시 / 대운 분류 미선택\n\n`.replace('出生정보','출생정보');
 for(const field of assembled){md+=`## ${field.label} · ${field.score??'산출 보류'}\n\n`;if(field.primary)md+=`${field.primary.title}\n\n`;for(const p of field.paragraphs)md+=`${p.text}\n\n`;if(!field.paragraphs.length)md+='일간이 미확정이라 지수와 풀이를 정하지 않았어요.\n\n';}
 await fs.writeFile(`docs/copy-cleanup/${fixture.id}.md`,md);
}
await fs.writeFile(`${dir}/manuscript-edits.json`,JSON.stringify({baseline:base,counts:{natal:edits.filter(e=>(e as {group:string}).group==='natal').length,sector:edits.filter(e=>(e as {group:string}).group==='sector').length},edits},null,2)+'\n');
await fs.writeFile(`${dir}/preservation-audit.json`,JSON.stringify({baseline:base,passed:!errors.length,engineChecks,errors,unchangedSectorSelectorsAndScores:sectorRecords.length,unchangedNatalSelectors:natalModules.length},null,2)+'\n');
await fs.writeFile(`${dir}/assembled-examples.json`,JSON.stringify(examples,null,2)+'\n');
if(errors.length)throw new Error(errors.join('\n'));console.log(`PASS: ${engineChecks.length} protected files; ${natalModules.length} natal and ${sectorRecords.length} sector selection/score fields unchanged; ${edits.length} edited manuscripts; ${examples.length} assembled readings.`);
