/** Local implementation-author records only. Never grants independent editorial/domain approval. */
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import raw from '../src/content/rules.json';
import drafts from '../content-review/compound-drafts.json';
import archived from '../content-review/review-snapshots.json';
import existing from '../content-review/reviews.json';
import semantic from '../content-review/semantic-cases.json';
import { validateRules } from '../src/domain/interpretation/repository';
import { canonicalContent,auditReviewHistory } from '../src/domain/interpretation/review';
import { reasoningFor } from '../src/domain/interpretation/reasoning';
import { siteConfig } from '../src/config/site';
if(!process.argv.includes('--all-current-edition'))throw new Error('명시적으로 --all-current-edition을 지정하세요. 로컬 구현자 교정 기록만 추가합니다.');
const hash=(v:unknown)=>createHash('sha256').update(canonicalContent(v)).digest('hex');
const rules=validateRules([...raw,...drafts]),archive=archived.map(r=>validateRules([r])[0]);
const records=[...existing] as unknown[],ledger=[...existing] as (typeof existing[number]&{supersedes?:string})[];
const targets=rules.filter(r=>r.contentVersion.startsWith(siteConfig.contentVersion));
for(const rule of targets){
  const history=ledger.filter(r=>r.ruleId===rule.id);
  const heads=history.filter(r=>!ledger.some(next=>next.supersedes===r.id));
  if(heads.length>1)throw new Error(`현재 이력 분기를 먼저 해결하세요: ${rule.id}`);
  if(heads[0]?.contentHash===hash(rule))continue;
  if(heads[0]&&!archive.some(r=>hash(r)===heads[0].contentHash))throw new Error(`이전 원문 스냅샷을 먼저 보존하세요: ${heads[0].id}`);
  const reasoning=reasoningFor(rule),claims=[...reasoning.interpretations,...reasoning.proposals];
  const record={id:`editorial-${siteConfig.contentVersion.replaceAll('.','-')}-${rule.id}-${hash(rule).slice(0,12)}`,ruleId:rule.id,contentVersion:rule.contentVersion,contentHash:hash(rule),
    reviewer:{role:'implementation-author',name:null},date:new Date().toISOString().slice(0,10),claims:claims.map(c=>({id:c.id,hash:hash(c)})),
    corrections:['한국어 본문·제목·생활 제안·근거 중 필요한 문장을 교정. 계산과 선택 조건 보존. 독립 편집·명리 검토는 대기.'],
    counterexamples:semantic.filter(c=>c.claimIds.some(id=>claims.some(claim=>claim.id===id))).map(c=>c.id),
    issueIds:['KR-01','KR-02','KR-05',...(rule.category==='love'?['KR-06']:[]),...(['year','month','day'].includes(rule.category)?['KR-03']:[])],status:'implemented-pending-independent-review',...(heads[0]?{supersedes:heads[0].id}:{})};
  records.push(record);ledger.push(record as typeof ledger[number]);
  if(!archive.some(r=>hash(r)===hash(rule)))archive.push(rule);
}
const result=auditReviewHistory(rules,records,hash,archive,targets.map(r=>r.id));
if(!result.passed)throw new Error(result.errors.join('\n'));
// The validation is complete before either local file is changed. Existing entries retain exact values.
await fs.writeFile('content-review/review-snapshots.json',JSON.stringify(archive,null,2)+'\n');
await fs.writeFile('content-review/reviews.json',JSON.stringify(records,null,2)+'\n');
console.log(`PASS · ${records.length-existing.length}개 교정 기록 추가 · 과거 ${existing.length}개 보존 · 독립 승인 부여 없음`);
