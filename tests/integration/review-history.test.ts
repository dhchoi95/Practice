import { describe,it,expect } from 'vitest';
import { createHash } from 'node:crypto';
import { auditReviewHistory,canonicalContent } from '@/domain/interpretation/review';
import { contentRepository } from '@/domain/interpretation/repository';
import { reasoningFor } from '@/domain/interpretation/reasoning';
import reviews from '../../content-review/reviews.json';
import snapshots from '../../content-review/review-snapshots.json';
import { ruleSchema } from '@/domain/interpretation/schema';
const hash=(v:unknown)=>createHash('sha256').update(canonicalContent(v)).digest('hex');
const base=ruleSchema.parse(snapshots.find(r=>r.id==='core-general-7'));
const old=reviews.find(r=>r.ruleId===base.id)!;
const edited={...base,contentVersion:'1.3.0',paragraphs:[...base.paragraphs,'이전'+' 기록을 보존하는 합성 교정 문장이에요.']};
const reasoning=reasoningFor(edited);
const next={...old,id:'current-correction',contentVersion:edited.contentVersion,contentHash:hash(edited),date:'2026-10-21',claims:[...reasoning.interpretations,...reasoning.proposals].map(c=>({id:c.id,hash:hash(c)})),supersedes:old.id};
describe('KR-04 immutable historical review and current decision',()=>{
  it('accepts unchanged baseline records',()=>expect(auditReviewHistory([base],[old],hash).errors).toEqual([]));
  it('detects an edited source with only an old review',()=>expect(auditReviewHistory([edited],[old],hash,[base]).errors.join('')).toContain('재검토 필요'));
  it('preserves old record verbatim and accepts the explicit replacement without granting independent review',()=>{
    const frozen=JSON.stringify(old),result=auditReviewHistory([edited],[old,next],hash,[base],[base.id]);
    expect(result.errors).toEqual([]);expect(JSON.stringify(old)).toBe(frozen);
    expect(result.records[0]).toMatchObject({historical:true,staleAgainstCurrent:true,current:false});
    expect(result.records[1]).toMatchObject({historical:false,current:true,status:'implemented-pending-independent-review'});
  });
  it('requires a current record for an edited rule',()=>expect(auditReviewHistory([edited],[],hash,[base],[base.id]).errors.join('')).toContain('현재 검토 기록 누락'));
  it('does not silently ignore an old unsuperseded record beside a new one',()=>expect(auditReviewHistory([edited],[old,{...next,supersedes:undefined}],hash,[base]).errors.join('')).toContain('재검토 필요'));
  it('rejects incorrect hashes, missing archives and changed claim hashes',()=>{
    expect(auditReviewHistory([edited],[old,next],hash).passed).toBe(false);
    expect(auditReviewHistory([edited],[{...next,supersedes:undefined,contentHash:'f'.repeat(64)}],hash).passed).toBe(false);
    expect(auditReviewHistory([edited],[{...next,supersedes:undefined,claims:[{...next.claims[0],hash:'f'.repeat(64)}]}],hash).passed).toBe(false);
  });
  it('rejects a claim belonging to another rule even with a valid global claim hash',()=>{
    const foreign=reasoningFor(contentRepository.all().find(r=>r.id==='core-love-7')!).interpretations[0];
    expect(auditReviewHistory([edited],[{...next,supersedes:undefined,claims:[{id:foreign.id,hash:hash(foreign)}]}],hash).errors.join('')).toContain('해당 원고의 주장');
  });
  it('rejects missing parent, other-rule replacement, cycles, forks and reversed dates',()=>{
    expect(()=>auditReviewHistory([edited],[{...next,supersedes:''}],hash,[base])).toThrow();
    const foreign={...old,id:'foreign',ruleId:'core-love-7'};
    for(const ledger of [[{...next,supersedes:'missing'}],[old,foreign,{...next,supersedes:'foreign'}],[{...old,supersedes:next.id},next],[old,next,{...next,id:'fork'}],[old,{...next,date:'2026-10-19'}]])expect(auditReviewHistory([edited],ledger,hash,[base]).passed).toBe(false);
  });
});
