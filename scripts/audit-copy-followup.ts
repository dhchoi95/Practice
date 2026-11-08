import fs from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import rules from '../src/content/rules.json';
import type {InterpretationRule} from '../src/domain/interpretation/schema';
import {sectorRecords,buildSectorReading} from '../src/domain/foundation/engine';
import {mbtiContent,mbtiBasicContent} from '../src/content/advanced/mbti';
import {generalChart} from '../src/domain/fortune/general-policy';
import {presentSector} from '../src/domain/foundation/presentation';
import {domains,domainNames} from '../src/domain/foundation/types';
import {particleErrors} from '../src/domain/interpretation/quality';
import {canonicalContent} from '../src/domain/interpretation/review';
import type {BirthInput} from '../src/domain/saju/types';
const dir='content-review/copy-followup',base='b90a452',errors:string[]=[];
const hash=(v:unknown)=>createHash('sha256').update(canonicalContent(v)??'undefined').digest('hex');
const omit=(v:Record<string,unknown>,keys:string[])=>Object.fromEntries(Object.entries(v).filter(([k])=>!keys.includes(k)));
const read=async(path:string)=>JSON.parse(await fs.readFile(path,'utf8'));
const edits:unknown[]=[];
for(const [group,before,after,prose] of [
 ['legacy',await read(`${dir}/content-rules-before.json`),rules,['title','paragraphs','practicalTips','evidence','reasoning','contentVersion','updatedAt']],
 ['sector',await read(`${dir}/foundation-sectors-before.json`),sectorRecords,['title','paragraphs','proposal','version']],
 ['mbti',await read(`${dir}/mbti-before.json`),[...mbtiContent,...mbtiBasicContent],['title','text','version','updatedAt']],
] as const){
 for(const r of after){const b=before.find((b:{id:string})=>b.id===r.id);if(!b)throw new Error(`missing baseline ${r.id}`);
  if(hash(omit(b,prose as unknown as string[]))!==hash(omit(r as unknown as Record<string,unknown>,prose as unknown as string[])))errors.push(`selector/score/scope changed ${r.id}`);
  if(group==='legacy'){
   const legacy=r as unknown as InterpretationRule;
   if(hash(legacy.reasoning?.premises)!==hash(b.reasoning?.premises)||legacy.evidence?.basisKey!==b.evidence?.basisKey)errors.push(`legacy premise ${r.id}`);
  }
  if(hash(b)!==hash(r))edits.push({group,id:r.id,beforeHash:hash(b),afterHash:hash(r),before:b,after:r,status:'author-reviewed-pending-independent'});
 }
 if(before.length!==after.length)errors.push(`record count ${group}`);
}
// Calendar, astronomical, natal, segmentation and score algorithms are unchanged.
const protectedPaths=execFileSync('git',['ls-tree','-r','--name-only',base,'src/domain'],{encoding:'utf8'}).trim().split('\n').filter(p=>!['src/domain/interpretation/quality.ts','src/domain/foundation/presentation.ts','src/domain/foundation/types.ts'].includes(p));
const engineChecks=[];
for(const path of protectedPaths){let current=await fs.readFile(path,'utf8');if(path==='src/domain/foundation/engine.ts')current=current.replaceAll(",'2.4.0'",'').replaceAll(",'2.4.1'",'').replaceAll(",'2.4.2'",'').replaceAll(",'2.4.3'",'');const before=execFileSync('git',['show',`${base}:${path}`],{encoding:'utf8'}),passed=current===before;engineChecks.push({path,passed});if(!passed)errors.push(`engine ${path}`);}
const inventory=await read('content-review/final-editing/full-inventory.json');let checkedStrings=0;
function check(value:unknown,context:string){if(typeof value==='string'){checkedStrings++;for(const error of particleErrors(value))errors.push(`${context}: ${error}`);}else if(Array.isArray(value))value.forEach((v,i)=>check(v,`${context}[${i}]`));else if(value&&typeof value==='object')Object.entries(value).forEach(([k,v])=>check(v,`${context}.${k}`));}
for(const row of inventory.entries)check(row.record,`${row.group}:${row.id}`);
const publicFiles=inventory.sourceLiteralReview.filter((r:{file:string})=>/^src\/(components|app|config|lib)\//.test(r.file));
for(const file of publicFiles)for(const row of file.strings)check(row.text,`${file.file}:${row.line}`);
const crossDomainCopies=[];
for(const kind of ['day','month','year']){
 const sentences=new Map<string,Set<string>>();
 for(const r of sectorRecords.filter(r=>r.unit===kind))for(const p of r.paragraphs)for(const sentence of p.split(/(?<=[.!?])\s+/)){const seen=sentences.get(sentence)??new Set<string>();seen.add(r.domain);sentences.set(sentence,seen);}
 for(const [text,domains] of sentences)if(domains.size>1)crossDomainCopies.push({kind,text,domains:[...domains]});
}
if(crossDomainCopies.length)errors.push('exact sentences shared across domains: manual correction required');
const input:BirthInput={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''};
const cohorts=[input,{...input,year:1990,month:1,day:9,hour:12,minute:0},{...input,year:1994,month:3,day:31,hour:0,minute:0},{...input,unknownTime:true},{...input,year:1987,month:6,day:1,unknownTime:true}];
const outputs=[];
await fs.mkdir('docs/copy-followup',{recursive:true});
for(const [index,birth] of cohorts.entries())for(const kind of ['day','month','year'] as const){
 const target=kind==='year'?'2027-01-01':'2026-10-26',reading=buildSectorReading(generalChart(birth),kind,target),fields=[];
 let md=`# 프로필 ${index+1} · ${reading.label}\n\n양력 ${birth.year}-${birth.month}-${birth.day}, ${birth.unknownTime?'시간 모름':`${birth.hour}:${birth.minute}`} / 한국 표준시\n\n`;
 for(const d of domains){const plan=presentSector(reading,d);for(const p of plan.paragraphs){const source=reading.sectors[d].records.find(r=>r.id===p.recordId)!;if(![...source.paragraphs,source.proposal].includes(p.text))errors.push(`unwritten added prose ${index}/${kind}/${d}`);}
  fields.push({domain:d,title:plan.primary?.title??null,score:reading.sectors[d].score,paragraphs:plan.paragraphs,trace:plan.trace});md+=`## ${domainNames[d]} · ${reading.sectors[d].score??'산출 보류'}\n\n${plan.primary?.title??'일간 미확정'}\n\n${plan.paragraphs.map(p=>p.text).join('\n\n')}\n\n`;
 }
 outputs.push({index,birth,kind,target,label:reading.label,internalSegments:reading.segments.length,fields});await fs.writeFile(`docs/copy-followup/profile-${index+1}-${kind}.md`,md);
}
await fs.writeFile(`${dir}/edits.json`,JSON.stringify({baseline:'previous local 2.4.0 snapshot',counts:Object.fromEntries(['legacy','sector','mbti'].map(group=>[group,edits.filter(e=>(e as {group:string}).group===group).length])),edits},null,2)+'\n');
await fs.writeFile(`${dir}/assembled-examples.json`,JSON.stringify(outputs,null,2)+'\n');
const report={version:'2.4.1',passed:!errors.length,records:inventory.entries.length,corpusCounts:inventory.counts,publicCodeFiles:publicFiles.length,checkedStrings,protectedEngineFiles:engineChecks.length,engineChecks,fieldsPreserved:{legacy:rules.length,sector:sectorRecords.length,mbti:mbtiContent.length+mbtiBasicContent.length},crossDomainCopies,assembledReadings:outputs.length,independentApproval:false,errors,limits:'Known grammar/particle forms, exact duplicated sentences and source ownership checks do not certify all Korean or semantic quality. Read field-specific narratives separately. Immutable historical snapshots/quoted errors are excluded from active prose.'};
await fs.writeFile(`${dir}/audit.json`,JSON.stringify(report,null,2)+'\n');
if(errors.length)throw new Error(errors.slice(0,30).join('\n'));console.log(`PASS: ${report.records} active content/description records; ${publicFiles.length} public code files; ${outputs.length} complete readings; ${engineChecks.length} unchanged engine files; ${edits.length} corrected manuscripts.`);
