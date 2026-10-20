import { z } from 'zod';
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
