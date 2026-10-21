import { z } from 'zod';
import type { InterpretationRule } from './schema';
import { reasoningFor } from './reasoning';
export const sourceRecordSchema=z.object({
  id:z.string(),kind:z.enum(['internal-policy','software','external-reference']),title:z.string().min(1),author:z.string().nullable(),url:z.url().nullable(),identifier:z.string().nullable(),
  checkedLocation:z.string().nullable(),checkedAt:z.iso.date().nullable(),applicablePolicy:z.string().min(1),usageScope:z.string().min(1),reviewer:z.string().nullable(),
  status:z.enum(['internal-policy','pending-external-check','verified-reference']),
}).strict().superRefine((r,ctx)=>{
  if(r.status==='verified-reference'&&(!r.author||!r.checkedLocation||!r.checkedAt||!r.reviewer||(!r.url&&!r.identifier)))ctx.addIssue({code:'custom',message:'확인 완료 출처는 저자·확인 위치·날짜·확인자·식별자가 필요합니다.'});
});
export const reviewRecordSchema=z.object({
  id:z.string(),ruleId:z.string(),contentVersion:z.string(),contentHash:z.string().regex(/^[0-9a-f]{64}$/),
  reviewer:z.object({role:z.enum(['implementation-author','automated-audit','independent-editor','domain-reviewer']),name:z.string().nullable()}).strict(),
  date:z.iso.date(),claims:z.array(z.object({id:z.string(),hash:z.string().regex(/^[0-9a-f]{64}$/)}).strict()),
  corrections:z.array(z.string()),counterexamples:z.array(z.string()),issueIds:z.array(z.string()),
  status:z.enum(['implemented-pending-independent-review','pending','reviewed-with-corrections','accepted-for-editorial-use']),
  supersedes:z.string().min(1).optional(),
}).strict().superRefine((r,ctx)=>{
  if(['reviewed-with-corrections','accepted-for-editorial-use'].includes(r.status)&&(!['independent-editor','domain-reviewer'].includes(r.reviewer.role)||!r.reviewer.name))ctx.addIssue({code:'custom',message:'독립 검토 완료에는 실제 검토자의 역할과 이름이 필요합니다.'});
});
export const semanticCaseSchema=z.object({
  id:z.string(),claimIds:z.array(z.string()).min(1),scenario:z.string().min(20),question:z.string().min(15),missingPremise:z.string(),suggestedRevision:z.string(),
  reviewer:z.string().nullable(),status:z.literal('pending'),source:z.string(),issueIds:z.array(z.string()),
}).strict();
/** Canonical content serialization for local hashes. No visitor identifiers are accepted. */
export function canonicalContent(value:unknown):string {
  if(Array.isArray(value))return `[${value.map(canonicalContent).join(',')}]`;
  if(value!==null&&typeof value==='object')return `{${Object.entries(value).filter(([,v])=>v!==undefined).sort(([a],[b])=>a.localeCompare(b,'en')).map(([k,v])=>`${JSON.stringify(k)}:${canonicalContent(v)}`).join(',')}}`;
  return JSON.stringify(value);
}
/** Immutable review history. Archived source snapshots verify historical ownership and hashes. */
export function auditReviewHistory(rules:InterpretationRule[],input:unknown,hash:(v:unknown)=>string,archivedRules:InterpretationRule[]=[],requiredRuleIds:string[]=[]){
  const ledger=z.array(reviewRecordSchema).parse(input),errors:string[]=[],byId=new Map(ledger.map(r=>[r.id,r]));
  if(byId.size!==ledger.length)errors.push('검토 ID 중복');
  const successors=new Map<string,string[]>();
  for(const r of ledger)if(r.supersedes){
    const parent=byId.get(r.supersedes);
    if(!parent)errors.push(`대체 대상 없음: ${r.id}`);
    else if(parent.ruleId!==r.ruleId)errors.push(`다른 원고 대체 금지: ${r.id}`);
    else if(parent.date>r.date)errors.push(`대체 기록 날짜 역전: ${r.id}`);
    successors.set(r.supersedes,[...(successors.get(r.supersedes)??[]),r.id]);
  }
  for(const [id,next] of successors)if(next.length>1)errors.push(`대체 이력 분기: ${id}`);
  for(const r of ledger){
    const seen=new Set<string>();let current:typeof r|undefined=r;
    while(current){if(seen.has(current.id)){errors.push(`대체 이력 순환: ${r.id}`);break;}seen.add(current.id);current=current.supersedes?byId.get(current.supersedes):undefined;}
  }
  const snapshots=new Map([...archivedRules,...rules].map(r=>[hash(r),r]));
  const records=ledger.map(review=>{
    const live=rules.find(r=>r.id===review.ruleId),target=snapshots.get(review.contentHash),historical=successors.has(review.id);
    if(!target||target.id!==review.ruleId||target.contentVersion!==review.contentVersion)errors.push(`검토 원문 스냅샷·버전 확인: ${review.id}`);
    if(target){
      const reasoning=reasoningFor(target),owned=[...reasoning.interpretations,...reasoning.proposals];
      if(new Set(review.claims.map(c=>c.id)).size!==review.claims.length)errors.push(`검토 주장 ID 중복: ${review.id}`);
      for(const c of review.claims){const claim=owned.find(x=>x.id===c.id);if(!claim||hash(claim)!==c.hash)errors.push(`해당 원고의 주장·해시 확인: ${review.id}/${c.id}`);}
    }
    const stale=!live||hash(live)!==review.contentHash||live.contentVersion!==review.contentVersion;
    if(!historical&&stale)errors.push(`현재 원고 재검토 필요: ${review.id}`);
    return {...review,historical,staleAgainstCurrent:stale,current:!historical&&!stale};
  });
  for(const id of requiredRuleIds)if(!records.some(r=>r.ruleId===id&&r.current))errors.push(`현재 검토 기록 누락: ${id}`);
  return {passed:!errors.length,records,errors:[...new Set(errors)]};
}
