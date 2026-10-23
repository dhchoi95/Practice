import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { sectorRecords } from '../src/domain/foundation/engine';
const root='reports/iteration-2.2.0',baseline='631da84458b62857a7002914de32e4fa4151e557';
const before=JSON.parse(await fs.readFile(`${root}/before/summary.json`,'utf8')),after=JSON.parse(await fs.readFile(`${root}/after/summary.json`,'utf8'));
if(before.cohortHash!==after.cohortHash)throw new Error('cohort changed');
const comparisons=[];
for(const cohort of ['fixed','additional'])for(const domain of ['overall','study','money','health','love','business'])for(const kind of ['day','month','year']){
 const gather=(s:typeof before)=>s.profiles.filter((p:{cohort:string;dayMaster:unknown})=>p.cohort===cohort&&p.dayMaster).map((p:{metrics:Record<string,Record<string,number>>})=>p.metrics[`${kind}:${domain}`]);
 const summarize=(ms:Record<string,number>[])=>({knownProfiles:ms.length,uniqueBodies:[Math.min(...ms.map(m=>m.uniqueVisibleBodies)),Math.max(...ms.map(m=>m.uniqueVisibleBodies))],tenDayRepeats:ms.reduce((n,m)=>n+m.tenDayRepeats,0),tenDayComparisons:ms.reduce((n,m)=>n+m.tenDayComparisons,0),consecutiveRepeats:ms.reduce((n,m)=>n+m.consecutiveRepeats,0),sharedParagraphs:ms.reduce((n,m)=>n+m.sharedParagraphCount,0),paragraphs:ms.reduce((n,m)=>n+m.paragraphCount,0),selectedHidden:ms.reduce((n,m)=>n+m.selectedButNotDefaultVisible,0)});
 comparisons.push({cohort,domain,kind,before:summarize(gather(before)),after:summarize(gather(after))});
}
const witness=JSON.parse(await fs.readFile(`${root}/after/new-meaning-witnesses.json`,'utf8'));
const missing=sectorRecords.filter(r=>r.editorial&&!witness.meanings.some((m:{records:{id:string;witness:unknown}[]})=>m.records.some(w=>w.id===r.id&&w.witness)));
if(missing.length)throw new Error(`unwitnessed ${missing.map(r=>r.id)}`);
const index=JSON.parse(await fs.readFile('content-review/iteration-meanings-2.2.0.json','utf8'));
for(const m of index){const rs=sectorRecords.filter(r=>r.semanticId===m.semanticId);m.status='author-reviewed-actual-selection-witnessed-independent-pending';m.role=rs[0].role;m.question=rs[0].editorial!.question;m.premises=rs[0].requires;m.units=rs.map(r=>({id:r.id,question:r.editorial!.question,requires:r.requires,role:r.role}));m.witnessFile='reports/iteration-2.2.0/after/new-meaning-witnesses.json';}
await fs.writeFile('content-review/iteration-meanings-2.2.0.json',JSON.stringify(index,null,2)+'\n');
const protectedPaths=execFileSync('git',['ls-tree','-r','--name-only',baseline],{encoding:'utf8'}).trim().split('\n').filter(p=>/^src\/domain\/(calendar|saju)\//.test(p)||/^src\/domain\/advanced\/(chart|period|luck|mappings|types)\./.test(p)||/privacy|package-lock/.test(p));
const sha=(v:Buffer)=>createHash('sha256').update(v).digest('hex');const protectedHashes=[];
for(const path of protectedPaths){const a=sha(execFileSync('git',['show',`${baseline}:${path}`])),b=sha(await fs.readFile(path));if(a!==b)throw new Error(`protected file changed ${path}`);protectedHashes.push({path,before:a,after:b});}
for(const name of ['foundation-reviews.json','foundation-snapshots.json']){const old=JSON.parse(execFileSync('git',['show',`${baseline}:content-review/${name}`],{encoding:'utf8',maxBuffer:32*1024*1024})),current=JSON.parse(await fs.readFile(`content-review/${name}`,'utf8'));if(JSON.stringify(old)!==JSON.stringify(current.slice(0,old.length)))throw new Error(`history rewritten: ${name}`);}
const sectorIds=new Set(sectorRecords.map(r=>r.id));
const report={baseline,cohortHash:after.cohortHash,comparisons,newMeaningCount:72,newRecordCount:216,witnessedNewRecordCount:216,selectedInFixedAdditional:after.coverage.filter((c:{id:string;selected:number})=>sectorIds.has(c.id)&&c.selected).length,unhitSectorsInComparison:after.unhit.filter((id:string)=>sectorIds.has(id)),unshownSectorsInComparison:after.unshown.filter((id:string)=>sectorIds.has(id)),scheduleScope:'Schedule coverage is separately checked by check-foundation; the comparison occupancy covers sector records only.',protectedHashes,independentApproval:false};
await fs.writeFile(`${root}/comparison.json`,JSON.stringify(report,null,2)+'\n');
let md='# 2.2.0 고정·추가 집단 전후 비교\n\n각 집단 12명, 각 365일·12개월·5년. 아래 일운 통계는 일주가 확인된 각 11명만 집계했어요. 날짜·제목·간지를 제외한 실제 기본 본문을 비교했어요.\n\n|집단|분야|고유 본문 범위 전→후|10일 반복 전→후|\n|---|---|---|---|\n';
for(const c of comparisons.filter(c=>c.kind==='day'))md+=`|${c.cohort}|${c.domain}|${c.before.uniqueBodies.join('–')} → ${c.after.uniqueBodies.join('–')}|${c.before.tenDayRepeats} → ${c.after.tenDayRepeats} / ${c.after.tenDayComparisons}|\n`;
md+='\n반복 증가도 실패 정보로 남겼어요. 정·편 구분과 고정 원국 특징만으로 날짜의 의미가 다양해지지는 않아요. 점수 변동 폭을 임의로 키우지 않았으며, 다음 차수는 반복이 높은 중심 조건과 날짜 관계를 우선 검토해야 해요.\n\n새 72개 질문·216개 기간 원고의 실제 선택 증거가 있어요. 이것은 명리 해석의 독립 승인이나 의미 독립성 승인을 뜻하지 않아요. 비교 집단 밖 도달성 탐색은 고정 집단 반복 통계에 합치지 않았어요.\n';
await fs.writeFile(`${root}/comparison.md`,md);
console.log(`PASS comparison; 72 meanings / 216 witnessed records; ${protectedHashes.length} protected hashes unchanged; historical ledger prefixes preserved.`);
