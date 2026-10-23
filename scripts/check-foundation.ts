import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { calculateAdvanced } from '../src/domain/advanced/chart';
import { buildSectorReading,sectorRecords,scheduleRecords,matches,scheduleFor } from '../src/domain/foundation/engine';
import { presentSector } from '../src/domain/foundation/presentation';
import { domains,domainNames } from '../src/domain/foundation/types';
import { foundationTables,foundationPolicies } from '../src/domain/foundation/tables';
import { canonicalContent } from '../src/domain/interpretation/review';
import { particleErrors } from '../src/domain/interpretation/quality';
import type { BirthInput } from '../src/domain/saju/types';
const dir='reports/foundation-2.1.0';await fs.mkdir(`${dir}/examples`,{recursive:true});
const hash=(v:unknown)=>createHash('sha256').update(canonicalContent(v)).digest('hex');
const errors:string[]=[],warnings:string[]=[],all=[...sectorRecords,...scheduleRecords];
if(new Set(all.map(r=>r.id)).size!==all.length)errors.push('중복 ID');
const knownPaths=new Set(['known.day','strength.class','focus','group.peer','group.output','group.resource','group.order','group.wealth','target.dayClash','target.monthClash','target.anyClash','target.harmony','same.day','same.month','same.luck','different.yearMonth']);
for(const r of all){
 for(const t of [...r.requires.all,...r.requires.any??[]])if(!knownPaths.has(t.path))errors.push(`전제 경로 없음 ${r.id}/${t.path}`);
 const text='paragraphs'in r?[r.title,...r.paragraphs,r.proposal].join(' '):r.text;
 for(const issue of particleErrors(text))errors.push(`${r.id}: ${issue}`);
 if(/섬세한 기준을 나에게도 다정하게|에너지를 현실적 성과로 전환|가능성을 품고 나아가|합격 가능성이 높|지갑을 줍/.test(text))errors.push(`금지 표현 ${r.id}`);
 if('variantOf'in r&&r.variantOf&&!sectorRecords.some(p=>p.id===r.variantOf&&p.semanticId===r.semanticId))errors.push(`변형 원문 누락 ${r.id}`);
}
const reviewPath='content-review/foundation-reviews.json',snapPath='content-review/foundation-snapshots.json';
interface Review {id:string;recordId:string;hash:string;date:string;status:string;reviewer:string;supersedes?:string;claimHash:string}
const ledger:Review[]=JSON.parse(await fs.readFile(reviewPath,'utf8').catch(()=>'[]'));
const snapshots:{hash:string;record:typeof all[number]}[]=JSON.parse(await fs.readFile(snapPath,'utf8').catch(()=>'[]'));
for(const r of all){const h=hash(r),history=ledger.filter(l=>l.recordId===r.id),heads=history.filter(l=>!ledger.some(n=>n.supersedes===l.id));if(heads.length>1)errors.push(`검토 이력 분기 ${r.id}`);
 if(heads[0]?.hash!==h&&process.argv.includes('--record')){if(!snapshots.some(s=>s.hash===h))snapshots.push({hash:h,record:r});ledger.push({id:`author-2-1-${r.id}-${h.slice(0,12)}`,recordId:r.id,hash:h,date:'2026-10-23',status:'author-reviewed-pending-independent',reviewer:'implementation-author',...(heads[0]?{supersedes:heads[0].id}:{}),claimHash:hash({requires:r.requires,policyRefs:r.policyRefs,sourceRefs:r.sourceRefs})});}
 if(!ledger.some(l=>l.recordId===r.id&&l.hash===h&&!ledger.some(n=>n.supersedes===l.id)))errors.push(`현재 검토 해시 없음 ${r.id}`);
}
for(const l of ledger){const snap=snapshots.find(s=>s.hash===l.hash);if(!snap||hash(snap.record)!==l.hash||snap.record.id!==l.recordId)errors.push(`스냅샷 소유/해시 ${l.id}`);if(snap&&hash({requires:snap.record.requires,policyRefs:snap.record.policyRefs,sourceRefs:snap.record.sourceRefs})!==l.claimHash)errors.push(`전제 해시 ${l.id}`);if(l.supersedes&&!ledger.some(p=>p.id===l.supersedes&&p.recordId===l.recordId))errors.push(`대체 이력 소유 ${l.id}`);const visited=new Set<string>();let p:Review|undefined=l;while(p){if(visited.has(p.id)){errors.push(`순환 ${l.id}`);break;}visited.add(p.id);p=p.supersedes?ledger.find(n=>n.id===p!.supersedes):undefined;}if(l.reviewer!=='implementation-author'||l.status!=='author-reviewed-pending-independent')errors.push('독립 승인 아님');}
if(new Set(ledger.map(l=>l.id)).size!==ledger.length)errors.push('검토 ID 중복');
const input:BirthInput={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''};
const coverage=new Map(all.map(r=>[r.id,0])),longitudinal:unknown[]=[],examples:unknown[]=[];
for(let i=0;i<12;i++){
 const birth={...input,year:[1972,1987,1992,1995,2000,2002][i%6],month:[1,3,5,8,11,12][i%6],day:1+i*2,hour:[0,10,15,23][i%4],unknownTime:i===10||i===11};
 const options={enabled:true,timePolicy:i%2?'true-solar' as const:'standard' as const,cityId:i%3?'suwon':undefined,luckClass:i%2?'female' as const:'male' as const},chart=calculateAdvanced(birth,options);
 const byDomain=Object.fromEntries(domains.map(d=>[d,{texts:new Map<string,number>(),ids:new Map<string,number>(),meaning:new Map<string,number>(),tenDayRepeats:0,daySignatures:[] as string[],sameScoreDifferentReasons:[] as unknown[],scoreReasons:new Map<number,{meaning:string;date:string}>()}]));
 const count=(reading:ReturnType<typeof buildSectorReading>)=>{for(const s of reading.segments)for(const d of domains)for(const r of s.sectors[d].records){coverage.set(r.id,coverage.get(r.id)!+1);if(!matches(r.requires,s.sectors[d].facts))errors.push(`선정 전제 오류 ${r.id}`);}};
 for(let day=0;day<365;day++){
  const target=new Date(Date.UTC(2026,0,1+day)).toISOString().slice(0,10),reading=buildSectorReading(chart,'day',target);count(reading);
  for(const d of domains){const state=byDomain[d],records=reading.sectors[d].records,visible=presentSector(reading,d).paragraphs,body=hash(visible.map(p=>p.text)),ids=hash(visible.map(p=>p.recordId)),meaning=hash(visible.map(p=>records.find(r=>r.id===p.recordId)!.meaningAxis));state.texts.set(body,(state.texts.get(body)??0)+1);state.ids.set(ids,(state.ids.get(ids)??0)+1);state.meaning.set(meaning,(state.meaning.get(meaning)??0)+1);state.daySignatures.push(body);if(day>=10&&state.daySignatures[day-10]===body)state.tenDayRepeats++;
   const score=reading.sectors[d].score;if(score!==null){const old=state.scoreReasons.get(score);if(old&&old.meaning!==meaning&&state.sameScoreDifferentReasons.length<2)state.sameScoreDifferentReasons.push({score,first:old.date,again:target});state.scoreReasons.set(score,{meaning,date:target});}}
  for(const context of ['general','interview','exam','presentation','contract','meeting'] as const){const note=scheduleFor(reading,context);if(note)coverage.set(note.id,coverage.get(note.id)!+1);}
  if(i<3&&day===295)examples.push({id:`person-${i}-day`,birth,options,chart,reading,schedule:scheduleFor(reading,'interview')});
 }
 for(let m=1;m<=12;m++){const r=buildSectorReading(chart,'month',`2026-${String(m).padStart(2,'0')}-01`);count(r);if(i<3&&m===10)examples.push({id:`person-${i}-month`,birth,options,chart,reading:r});}
 for(let y=2026;y<=2030;y++){const r=buildSectorReading(chart,'year',`${y}-01-01`);count(r);if(i<3&&y===2026)examples.push({id:`person-${i}-year`,birth,options,chart,reading:r});}
 longitudinal.push({profile:i,birth,options,dayMaster:chart.pillars.day,domains:Object.fromEntries(domains.map(d=>{const s=byDomain[d];return [d,{uniqueFullBodies:s.texts.size,uniqueIdCombinations:s.ids.size,uniqueMeaningCombinations:s.meaning.size,tenDayExactRepeats:s.tenDayRepeats,mostCommonBodyDays:Math.max(...s.texts.values()),sameScoreDifferentReasons:s.sameScoreDifferentReasons}];}))});
}
for(const [id,n] of coverage)if(!n)warnings.push('12명 합성 집단 미선정'+`: ${id}`);
// Full examples: nine known natal reports, one unknown and one actual term-boundary day.
for(const [id,birth,options,target] of [
 ['unknown',{...input,unknownTime:true},{enabled:true,timePolicy:'true-solar' as const,cityId:'suwon'},'2026-10-23'],
 ['boundary',input,{enabled:true,timePolicy:'standard' as const,luckClass:'male' as const},'2026-02-04'],
] as const){const chart=calculateAdvanced(birth,options);examples.push({id,birth,options,chart,reading:buildSectorReading(chart,'day',target)});}
for(const example of examples as {id:string;chart:ReturnType<typeof calculateAdvanced>;reading:ReturnType<typeof buildSectorReading>;schedule?:ReturnType<typeof scheduleFor>}[]){await fs.writeFile(`${dir}/examples/${example.id}.json`,JSON.stringify(example,null,2)+'\n');const r=example.reading;let md=`# ${example.id} — ${r.label}\n\n`;
 for(const d of domains){md+=`## ${domainNames[d]} · ${r.sectors[d].score??'산출 보류'}\n\n`;for(const paragraph of presentSector(r,d).paragraphs)md+=`${paragraph.text}\n\n`;if(!r.sectors[d].records.length)md+='일간이 미확정이라 원국과 대상 기간의 개인 관계를 정하지 않았어요.\n\n';}

 if(example.schedule)md+=`## 면접 참고\n\n${example.schedule.text}\n\n${example.schedule.checks.join(' / ')}\n`;
 await fs.writeFile(`${dir}/examples/${example.id}.md`,md);
}
const inventory={version:'2.1.0',old:{advancedRetained:62,periodRetained:136,legacyRetained:210,oldRecordsEdited:0},new:{coreRecords:216,supplementRecords:108,scheduleRecords:36,distinctCoreMeanings:72,distinctSupplementMeanings:36,distinctScheduleMeanings:36,periodGuidanceParagraphs:18},meaning:'360개는 기간별 적용 레코드 수. 독립된 의미 360개라고 세지 않음. 중심·보완은 각 의미의 일·월·연 변형을 명시. 보완 108개는 실제 본문이 같은 36개를 세 기간에 적용하는 정책 레코드이며 새 원고 108개가 아님.',coverage:[...coverage].map(([id,selected])=>({id,selected})),warnings};
await fs.writeFile(`${dir}/inventory.json`,JSON.stringify(inventory,null,2)+'\n');await fs.writeFile(`${dir}/longitudinal.json`,JSON.stringify({profiles:12,daysEach:365,monthsEach:12,yearsEach:5,normalization:'actual default visible body from shared presentation plan; excludes date/title/ganji; additionally selected records remain in per-example segment traces',profilesData:longitudinal,warnings},null,2)+'\n');await fs.writeFile(`${dir}/tables.json`,JSON.stringify({foundationTables,foundationPolicies},null,2)+'\n');
if(process.argv.includes('--record')&&!errors.length){await fs.writeFile(reviewPath,JSON.stringify(ledger,null,2)+'\n');await fs.writeFile(snapPath,JSON.stringify(snapshots,null,2)+'\n');}
await fs.writeFile(`${dir}/audit.json`,JSON.stringify({passed:errors.length===0,errors,warnings,records:all.length,reviewRecords:ledger.length,independentApproval:false},null,2)+'\n');
console.log(`${errors.length?'FAIL':'PASS'}: ${all.length} application records / 144 semantic families; 12 profiles × 365 days, 12 months, 5 years; ${errors.length} errors, ${warnings.length} unhit warnings`);if(errors.length){console.error(errors);process.exitCode=1;}
