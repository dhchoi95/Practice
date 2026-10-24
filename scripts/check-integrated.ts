import {recordedMigration} from './source-continuity';
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { calculateAdvanced } from '../src/domain/advanced/chart';
import { buildAdvancedReport,comparePolicies } from '../src/domain/advanced/report';
import { calculatePeriod } from '../src/domain/advanced/period';
import { validateManuscripts,selectManuscripts } from '../src/domain/advanced/modules';
import { natalModules } from '../src/content/advanced/natal';
import { periodModules } from '../src/content/advanced/period';
import { mbtiContent,mbtiBasicContent } from '../src/content/advanced/mbti';
import { canonicalContent } from '../src/domain/interpretation/review';
import { particleErrors } from '../src/domain/interpretation/quality';
import type { BirthInput } from '../src/domain/saju/types';
import { LunarUtil } from 'lunar-typescript';
import { hiddenStems } from '../src/domain/advanced/mappings';
import { stemNames,stemHanja,branchNames } from '../src/domain/saju/tables';
const dir='reports/integrated-2.0.0';await fs.mkdir(`${dir}/baseline`,{recursive:true});
const hash=(v:unknown)=>createHash('sha256').update(canonicalContent(v)).digest('hex');
const records=validateManuscripts([...natalModules,...periodModules]);
const errors:string[]=[], warnings:string[]=[];
for(const r of records){const issues=particleErrors([r.title,r.text,r.proposal].join(' '));if(issues.length)errors.push(`${r.id}: ${issues.join('/')}`);}
const baseline:{path:string;hash:string}[]=JSON.parse(await fs.readFile('content-review/compatibility-baseline-1.4.0.json','utf8')).sources;
for(const b of baseline)if(createHash('sha256').update(await fs.readFile(b.path)).digest('hex')!==b.hash&&!recordedMigration(b.path,b.hash))errors.push(`호환 소스 변경 ${b.path}`);
await fs.writeFile(`${dir}/baseline/manifest.json`,JSON.stringify({commit:'eee3ef1c9d6d3a1bf65085d0a989fb94499135e7',sources:baseline,compatibilityPolicy:'KST-MIDNIGHT-1.0',compatibilityContent:'1.4.0'},null,2)+'\n');
// Cross-table agreement with the installed software, not an independent classical-source verification.
const hiddenComparison=hiddenStems.map((stems,b)=>{const app=stems.map(s=>stemHanja[s]),software=LunarUtil.ZHI_HIDE_GAN[LunarUtil.ZHI[b+1]];return {branch:branchNames[b],app:stems.map(s=>stemNames[s]),appHanja:app,software,mainMatches:app[0]===software[0],membersMatch:JSON.stringify([...app].sort())===JSON.stringify([...software].sort()),orderMatches:JSON.stringify(app)===JSON.stringify(software)};});
for(const r of hiddenComparison){if(!r.mainMatches||!r.membersMatch)errors.push(`지장간 본기·구성 차이 ${r.branch}`);if(!r.orderMatches)warnings.push(`지장간 보조 순서 차이: ${r.branch}, 서비스 ${r.appHanja.join('·')} / 소프트웨어 ${r.software.join('·')}. 서비스 고정 순서·가중치이며 원전 검토 대기.`);}
await fs.writeFile(`${dir}/hidden-table-software-comparison.json`,JSON.stringify(hiddenComparison,null,2)+'\n');
const example:BirthInput={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''};
const scenarios=[{id:'city-unknown-standard',options:{enabled:true,timePolicy:'standard' as const,luckClass:'male' as const}},{id:'city-unknown-solar-request',options:{enabled:true,timePolicy:'true-solar' as const,luckClass:'male' as const}},...['suwon','seongnam','anyang'].flatMap(cityId=>(['standard','mean-solar','true-solar'] as const).map(timePolicy=>({id:`${cityId}-${timePolicy}`,options:{enabled:true,cityId,timePolicy,luckClass:'male' as const}})))];
for(const s of scenarios){const chart=calculateAdvanced(example,s.options),selectedPeriod=calculatePeriod(chart,'year','2026-10-22');await fs.writeFile(`${dir}/example-${s.id}.json`,JSON.stringify({...buildAdvancedReport(chart,2026,selectedPeriod),selectedPeriod,queryDate:'2026-10-22',menu:'saju'},null,2)+'\n');}
await fs.writeFile(`${dir}/example-policy-comparison.json`,JSON.stringify(comparePolicies(calculateAdvanced(example,scenarios.at(-1)!.options)),null,2)+'\n');
const coverage=new Map(records.map(r=>[r.id,0]));
const profiles:BirthInput[]=Array.from({length:30},(_,i)=>({year:[1972,1987,1995,2000,2002][i%5],month:[1,3,6,8,11,12][i%6],day:1+i%27,hour:[0,1,10,15,23][i%5],minute:3,unknownTime:i%7===0,calendar:'solar',leap:false,nickname:''}));
profiles.push(example);
const profileOptions=(i:number)=>({enabled:true,timePolicy:i<31&&i%2?'true-solar' as const:'standard' as const,cityId:'suwon',luckClass:i%3===0?undefined:i%2?'female' as const:'male' as const});
const represented=new Set(profiles.map((input,i)=>calculateAdvanced(input,profileOptions(i)).pillars.day?.stem));
for(let day=1;day<=28;day++){const input={...example,year:2000,month:1,day};const stem=calculateAdvanced(input,profileOptions(profiles.length)).pillars.day!.stem;if(!represented.has(stem)){profiles.push(input);represented.add(stem);}}
const repeats:unknown[]=[],readSamples:unknown[]=[],pairs:unknown[]=[];
for(const [i,input] of profiles.entries()){
 const chart=calculateAdvanced(input,profileOptions(i));
 const natal=selectManuscripts(natalModules,chart.facts,'natal');for(const r of natal.applied)coverage.set(r.id,coverage.get(r.id)!+1);
 const ids=new Map<string,number>(),texts=new Map<string,number>(),consecutive:{first:string;again:string}[]=[],last=new Map<string,string>();
 for(let d=0;d<365;d++){
  const date=new Date(Date.UTC(2026,0,1+d)).toISOString().slice(0,10),p=calculatePeriod(chart,'day',date);
  for(const s of p.segments)for(const r of s.selection.applied)coverage.set(r.id,coverage.get(r.id)!+1);
  const body=p.segments.map(s=>s.selection.applied.map(r=>r.text)),combo=p.segments.map(s=>s.selection.applied.map(r=>r.id)),bh=hash(body),ih=hash(combo);
  ids.set(ih,(ids.get(ih)??0)+1);texts.set(bh,(texts.get(bh)??0)+1);
  if(last.has(bh)&&consecutive.length<5)consecutive.push({first:last.get(bh)!,again:date});last.set(bh,date);
  if([0,10,60,180,364].includes(d)&&i<5)readSamples.push({profile:i,date,chart,natal,period:p});
 }
 for(let m=1;m<=12;m++){const p=calculatePeriod(chart,'month',`2026-${String(m).padStart(2,'0')}-01`);for(const s of p.segments)for(const r of s.selection.applied)coverage.set(r.id,coverage.get(r.id)!+1);}
 for(let y=2025;y<=2030;y++){const p=calculatePeriod(chart,'year',`${y}-01-01`);for(const s of p.segments)for(const r of s.selection.applied)coverage.set(r.id,coverage.get(r.id)!+1);}
 repeats.push({profile:i,input,policy:chart.time.effective,dayStem:chart.pillars.day?.stem??null,strength:chart.strength.label,fullTextUnique:texts.size,ruleCombinationUnique:ids.size,exactRepeatExamples:consecutive,meaning:'같은 조건의 재사용은 허용하며 반복 0을 목표로 삼지 않아요.'});
 if(i<5){const outputs=Object.fromEntries(['2026-10-22','2026-10-23'].map(date=>[date,calculatePeriod(chart,'day',date)]));pairs.push({profile:i,natal,days:outputs,months:[10,11].map(m=>calculatePeriod(chart,'month',`2026-${m}-01`)),years:[2026,2027].map(y=>calculatePeriod(chart,'year',`${y}-01-01`))});}
}
const unhit=records.filter(r=>!coverage.get(r.id));warnings.push(...unhit.map(r=>`합성 프로필 미선정: ${r.id}`));
const inventory={legacy:{retained:210,shared:5,bases:25,drafts:4},advanced:{active:natalModules.length,uniqueBodies:new Set(natalModules.map(r=>r.text)).size},period:{legacyRetained:30,newActive:periodModules.length,uniqueBodies:new Set(periodModules.map(r=>r.text)).size},mbti:{basicDescriptions:mbtiBasicContent.length,active:mbtiContent.length,uniqueBodies:new Set(mbtiContent.map(r=>r.text)).size},independentStatus:'pending',coverage:records.map(r=>({id:r.id,role:r.role,units:r.units,requires:r.requires,premises:r.premises,selected:coverage.get(r.id)}))};
await fs.writeFile(`${dir}/coverage.json`,JSON.stringify(inventory,null,2)+'\n');await fs.writeFile(`${dir}/longitudinal.json`,JSON.stringify({profiles:profiles.length,daysPerProfile:365,monthsPerProfile:12,yearsPerProfile:6,results:repeats,warnings},null,2)+'\n');await fs.writeFile(`${dir}/reading-samples.json`,JSON.stringify(readSamples,null,2)+'\n');await fs.writeFile(`${dir}/before-after-periods.json`,JSON.stringify(pairs,null,2)+'\n');
// Immutable per-source snapshots and append-only author review records for the new schemas.
const ledgerPath='content-review/advanced-reviews.json',snapshotPath='content-review/advanced-snapshots.json';
const ledger: {id:string;ruleId:string;hash:string;supersedes?:string;claimHashes:{id:string;hash:string}[];reviewer:string;status:string;date:string;corrections:string[]}[]=JSON.parse(await fs.readFile(ledgerPath,'utf8').catch(()=>'[]'));
const snapshots:{hash:string;record:unknown}[]=JSON.parse(await fs.readFile(snapshotPath,'utf8').catch(()=>'[]'));
for(const r of [...records,...mbtiContent,...mbtiBasicContent]){
 const h=hash(r),history=ledger.filter(l=>l.ruleId===r.id),head=history.filter(l=>!ledger.some(n=>n.supersedes===l.id));if(head.length>1)errors.push(`검토 이력 분기 ${r.id}`);
 if(head[0]?.hash!==h&&process.argv.includes('--record')){
  if(!snapshots.some(s=>s.hash===h))snapshots.push({hash:h,record:r});
  const claims='claim'in r?[{id:r.claim.id,hash:hash(r.claim)}]:[{id:r.id+':editorial',hash:hash(r.text)}];
  ledger.push({id:`author-2-0-${r.id}-${h.slice(0,12)}-${history.length+1}`,ruleId:r.id,hash:h,...(head[0]?{supersedes:head[0].id}:{}),claimHashes:claims,reviewer:'implementation-author',status:'implemented-pending-independent-review',date:new Date().toISOString().slice(0,10),corrections:['authoringIntent'in r?r.authoringIntent:`${r.type}의 ${r.title} 상황을 다른 95개 글과 구분해 직접 쓰고 고정관념을 확정하지 않도록 조건부 제안으로 편집했어요.`]});
 }
 const current=ledger.find(l=>l.ruleId===r.id&&l.hash===h&&!ledger.some(n=>n.supersedes===l.id));if(!current)errors.push(`현재 해시 검토 누락 ${r.id}`);
}
for(const l of ledger){const s=snapshots.find(s=>s.hash===l.hash);if(!s||hash(s.record)!==l.hash||(s.record as {id:string}).id!==l.ruleId)errors.push(`원문 소유·해시 불일치 ${l.id}`);if(s){const raw=s.record as {id:string;text:string;claim?:{id:string}};const expected=raw.claim?[{id:raw.claim.id,hash:hash(raw.claim)}]:[{id:raw.id+':editorial',hash:hash(raw.text)}];if(canonicalContent(expected)!==canonicalContent(l.claimHashes))errors.push(`주장 소유·해시 불일치 ${l.id}`);}
 if(l.supersedes){const parent=ledger.find(p=>p.id===l.supersedes);if(!parent||parent.ruleId!==l.ruleId||parent.date>l.date)errors.push(`잘못된 대체 이력 ${l.id}`);}
 if(l.reviewer!=='implementation-author'||l.status!=='implemented-pending-independent-review')errors.push(`자동 독립 승인 금지 ${l.id}`);}
const byReview=new Map(ledger.map(r=>[r.id,r]));if(byReview.size!==ledger.length)errors.push('검토 ID 중복');
for(const r of ledger){if(ledger.filter(n=>n.supersedes===r.id).length>1)errors.push(`검토 대체 분기 ${r.id}`);const visited=new Set<string>();let current:typeof r|undefined=r;while(current){if(visited.has(current.id)){errors.push(`검토 순환 ${r.id}`);break;}visited.add(current.id);current=current.supersedes?byReview.get(current.supersedes):undefined;}}
const activeIds=new Set([...records,...mbtiContent,...mbtiBasicContent].map(r=>r.id));const historicalOnlyRuleIds=[...new Set(ledger.map(r=>r.ruleId))].filter(id=>!activeIds.has(id));
await fs.writeFile(`${dir}/historical-only-rules.json`,JSON.stringify({meaning:'과거 집필 기록을 남기되 현재 활성 원고로 세지 않음',ids:historicalOnlyRuleIds},null,2)+'\n');
if(process.argv.includes('--record')&&!errors.length){await fs.writeFile(ledgerPath,JSON.stringify(ledger,null,2)+'\n');await fs.writeFile(snapshotPath,JSON.stringify(snapshots,null,2)+'\n');}
await fs.writeFile(`${dir}/audit.json`,JSON.stringify({passed:!errors.length,errors,warnings,inventory,reviewRecords:ledger.length},null,2)+'\n');
console.log(`${errors.length?'FAIL':'PASS'} · 호환 기준 ${baseline.length}개 대조(명시한 편집·입력 분리 이행 포함) · 고급 ${natalModules.length} / 기간 ${periodModules.length} / MBTI ${mbtiContent.length} · ${profiles.length}명 × 365일·12개월·6년 · 독립 검토 대기`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
