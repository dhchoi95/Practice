import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {canonicalContent} from '../src/domain/interpretation/review';
import {sectorRecords,scheduleRecords} from '../src/domain/foundation/engine';
import {natalModules} from '../src/content/advanced/natal';
import {periodModules} from '../src/content/advanced/period';
import {mbtiContent,mbtiBasicContent} from '../src/content/advanced/mbti';
import rules from '../src/content/rules.json';
import drafts from '../content-review/compound-drafts.json';
import {dailyEditorial} from '../src/content/editorial';
import {interpretationBases} from '../src/domain/interpretation/knowledge';
import {sharedExplanations} from '../src/domain/interpretation/shared';
import {glossary} from '../src/content/glossary';
import {infoPages} from '../src/content/pages';
import {sources} from '../src/content/sources';
import {cities} from '../src/content/advanced/cities';
import notes from '../src/content/foundation/period-notes.json';
import {particleErrors} from '../src/domain/interpretation/quality';
const hash=(v:unknown)=>createHash('sha256').update(canonicalContent(v)).digest('hex');
const groups={sectors:sectorRecords,schedules:scheduleRecords,natal:natalModules,advancedPeriods:periodModules,legacy:rules,experimentalDrafts:drafts,mbti:mbtiContent,mbtiBasics:mbtiBasicContent,dailyEditorial:dailyEditorial,interpretationBases,elementExplanations:sharedExplanations,glossary,infoSections:Object.entries(infoPages).flatMap(([page,p])=>p.sections.map((s,i)=>({id:`${page}:${i}`,...s}))),sourceNotes:sources,periodNotes:Object.entries(notes).map(([id,n])=>({id,...n}))};
const entries=Object.entries(groups).flatMap(([group,rows])=>rows.map((r,i)=>({group,id:'id'in r?r.id:'key'in r?r.key:`${group}:${i}`,hash:hash(r),review:'implementation-author',styleReview:'문맥·조사·표기와 읽기 순서 점검. 본문은 합니다체, 짧은 안내는 자연스러운 해요체 유지.',meaningReview:'선정 전제·예외·불확실성을 보존. 계산·추정·제안을 구별. 독립 전문가 승인 아님.',record:r})));
const fields:string[]=['title','text','paragraphs','practicalTips','proposal','checks','fact','scope','preferenceReason','counterExample'];
const errors:string[]=[];
for(const e of entries){const r=e.record as Record<string,unknown>;for(const key of fields){const value=r[key];for(const text of typeof value==='string'?[value]:Array.isArray(value)?value.filter((v):v is string=>typeof v==='string'):[]){for(const error of particleErrors(text))errors.push(`${e.id}.${key}: ${error}`);if(/섬세한 기준을 나에게도 다정하게|가능한 시간과 어려운 조건을 나누어 말하면 서로 선택할 범위가 보여|계획을 다시 살필 때 계획/.test(text))errors.push(`어색한 기존 문장 ${e.id}`);}}}
async function files(dir:string):Promise<string[]>{return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).map(d=>d.isDirectory()?files(`${dir}/${d.name}`):[`${dir}/${d.name}`]))).flat();}
const publicSources=[...(await files('src/components')),...(await files('src/app')),...(await files('src/config')),...(await files('src/domain')),...(await files('src/lib'))].filter(f=>/\.tsx?$/.test(f));
const literals=[];
for(const file of publicSources){const source=await fs.readFile(file,'utf8'),ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,file.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);const rows:{line:number;text:string}[]=[];
 function visit(n:ts.Node){if((ts.isStringLiteral(n)||ts.isNoSubstitutionTemplateLiteral(n)||ts.isTemplateHead(n)||ts.isTemplateMiddle(n)||ts.isTemplateTail(n)||ts.isJsxText(n))&&/[가-힣]/.test(n.text)){rows.push({line:ast.getLineAndCharacterOfPosition(n.getStart(ast)).line+1,text:n.text.trim()});}ts.forEachChild(n,visit);}visit(ast);
 literals.push({file,sha256:createHash('sha256').update(source).digest('hex'),review:'UI·오류·공유·계산 설명을 별도 점검. 자연스러운 짧은 해요체와 사실 라벨은 유지.',strings:rows});}
const reviewPath='content-review/final-editing/full-reviewed-hashes.json';
const reviews: {key:string;hash:string;reviewer:string;status:string;date:string}[]=JSON.parse(await fs.readFile(reviewPath,'utf8').catch(()=>'[]'));
const subjects=[...entries.map(e=>({key:`${e.group}:${e.id}`,hash:e.hash})),...literals.map(e=>({key:e.file,hash:e.sha256}))];
for(const subject of subjects){if(!reviews.some(r=>r.key===subject.key&&r.hash===subject.hash)){
 if(process.argv.includes('--record-author-review'))reviews.push({...subject,reviewer:'implementation-author',status:'author-edited-pending-independent',date:new Date().toISOString().slice(0,10)});
 else errors.push(`현재 전수 교정 기록 누락: ${subject.key}`);
}}
if(process.argv.includes('--record-author-review')&&!errors.length)await fs.writeFile(reviewPath,JSON.stringify(reviews,null,2)+'\n');
await fs.mkdir('reports/final-2.3.0',{recursive:true});
await fs.writeFile('content-review/final-editing/full-inventory.json',JSON.stringify({version:'2.3.0',counts:Object.fromEntries(Object.entries(groups).map(([k,rs])=>[k,rs.length])),entries,geographicReference:{file:'src/content/advanced/cities.ts',records:cities.length,hash:hash(cities),status:'도시명·중심 좌표를 원고 수에 합산하지 않음. 변경·추정 없음.'},sourceLiteralReview:literals,errors,independentApproval:false},null,2)+'\n');
await fs.writeFile('reports/final-2.3.0/writing-summary.json',JSON.stringify({counts:Object.fromEntries(Object.entries(groups).map(([k,rs])=>[k,rs.length])),totalRecords:entries.length,publicCodeFiles:literals.length,passed:!errors.length,errors,meaning:'전체 범위 목록과 구현자 교정 기록. 원고 수·문자열 수로 정확도·다양성·독립 승인을 주장하지 않음.'},null,2)+'\n');
if(errors.length)throw new Error(errors.join('\n'));console.log(`전체 원고·설명 ${entries.length}레코드 / UI·생성 설명 ${literals.length}파일 목록. 한정 어휘 조사 검사 통과; 독립 의미 승인 아님.`);
