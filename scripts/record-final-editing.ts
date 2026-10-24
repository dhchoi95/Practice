import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {canonicalContent} from '../src/domain/interpretation/review';
import {validateRules} from '../src/domain/interpretation/repository';
import {sharedExplanations} from '../src/domain/interpretation/shared';
import {interpretationBases} from '../src/domain/interpretation/knowledge';
import rules from '../src/content/rules.json';
import drafts from '../content-review/compound-drafts.json';
const dir='content-review/final-editing';
const hash=(v:unknown)=>createHash('sha256').update(canonicalContent(v)??'undefined').digest('hex');
const before=JSON.parse(await fs.readFile('content-review/editorial-baseline-1.3.0.json','utf8'));
const log=JSON.parse(await fs.readFile('content-review/korean-edit-log-1.4.0.json','utf8'));
for(const r of [...rules,...drafts])log.push({ruleId:r.id,field:'본문·생활 제안·근거 / 현재 원고 버전',reason:`${r.title}: 상황과 적용 범위를 유지하고 합니다체와 자연스러운 표기를 확인. 계산 조건·우선순위·제외 조건은 보존.`});
await fs.writeFile(`${dir}/legacy-edit-log.json`,JSON.stringify(log,null,2)+'\n');
const edits=[...sharedExplanations,...interpretationBases].map(r=>({id:r.id,beforeHash:hash([...before.shared,...before.bases].find((b:{id:string})=>b.id===r.id)),afterHash:hash(r),status:'implemented-pending-independent-review',reason:'오행·천간의 사실 관계를 보존하고 본문 설명의 말투·버전을 정리'}));
await fs.writeFile(`${dir}/public-text-edits.json`,JSON.stringify(edits,null,2)+'\n');
const historical=JSON.parse(await fs.readFile('content-review/compatibility-baseline-1.4.0.json','utf8')).sources;
const protectedRows=JSON.parse(await fs.readFile('content-review/protected-source-hashes-1.3.0.json','utf8'));
const paths=[...new Set([...historical,...protectedRows].map(r=>r.path))] as string[];
const sources=[];
for(const path of paths){const bytes=await fs.readFile(path),afterHash=createHash('sha256').update(bytes).digest('hex'),beforeHashes=[...new Set([...historical,...protectedRows].filter(r=>r.path===path).map(r=>r.hash??r.sha256))];if(beforeHashes.some(h=>h!==afterHash))sources.push({path,beforeHashes,afterHash,reason:path.includes('SessionProvider')?'승인된 두 사람 궁합과 선택 연도를 별도 브라우저 메모리에 보관. 기존 출생정보·삭제 정책 유지.':'전수 문장 교정 및 현재 해시 재검토 이력. 과거 이력은 수정하지 않음.'});}
await fs.writeFile(`${dir}/source-migrations.json`,JSON.stringify({version:'2.3.0',historicalBaselinesRetained:true,sources},null,2)+'\n');
// Fixed engine/copy boundary: all non-prose keys of legacy and foundation remain identical.
const oldRules=JSON.parse(execFileSync('git',['show','407f6e9:src/content/rules.json'],{encoding:'utf8',maxBuffer:16*1024*1024}));
const omit=(r:Record<string,unknown>,keys:string[])=>Object.fromEntries(Object.entries(r).filter(([k])=>!keys.includes(k)));
const errors:string[]=[];
for(const r of validateRules(rules)){const b=oldRules.find((x:{id:string})=>x.id===r.id);if(hash(omit(r,['title','paragraphs','practicalTips','evidence','reasoning','contentVersion','updatedAt']))!==hash(omit(b,['title','paragraphs','practicalTips','evidence','reasoning','contentVersion','updatedAt'])))errors.push(`legacy reserved fields ${r.id}`);if(hash(r.reasoning?.premises)!==hash(b.reasoning?.premises)||r.evidence?.basisKey!==b.evidence?.basisKey)errors.push(`legacy premise ${r.id}`);}
const current=JSON.parse(await fs.readFile('src/content/foundation/sectors.json','utf8')),old=JSON.parse(execFileSync('git',['show','407f6e9:src/content/foundation/sectors.json'],{encoding:'utf8',maxBuffer:16*1024*1024}));
for(const r of current){const b=old.find((x:{id:string})=>x.id===r.id);if(hash(omit(r,['title','paragraphs','proposal','version']))!==hash(omit(b,['title','paragraphs','proposal','version'])))errors.push(`sector reserved fields ${r.id}`);}
await fs.writeFile(`${dir}/reserved-field-audit.json`,JSON.stringify({passed:!errors.length,legacy:rules.length,sectors:current.length,errors},null,2)+'\n');
if(errors.length)throw new Error(errors.join('\n'));
console.log('Current editorial migrations recorded; historical sources retained; reserved fields unchanged.');
