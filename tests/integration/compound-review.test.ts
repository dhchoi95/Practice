import { describe,it,expect } from 'vitest';
import { experimentalRepository } from '@/domain/interpretation/experimental';
import { contentRepository,validateRules } from '@/domain/interpretation/repository';
import { interpret } from '@/domain/interpretation/engine';
import { runtimeFeatureErrors } from '@/domain/interpretation/evaluation';
import { canonicalContent,sourceRecordSchema,reviewRecordSchema } from '@/domain/interpretation/review';
import { calculateSaju } from '@/domain/saju/calculate';
import { reasoningFor } from '@/domain/interpretation/reasoning';
const normal=experimentalRepository(),experimental=experimentalRepository({includeDrafts:true});
const features={'natal.dayStem':7,'relations.output':2,'relations.wealth':1} as const;
describe('explicit local pilot gate and multiple factual premises',()=>{
  it('never includes drafts in the ordinary repository or default tooling',()=>{
    expect(normal.all()).toEqual(contentRepository.all());expect(normal.all()).toHaveLength(210);
    expect(experimental.all().filter(r=>r.reviewStatus==='draft')).toHaveLength(4);
    expect(interpret('saju','love',features).appliedRuleIds).toContain('relation-love-output');
    expect(interpret('saju','love',features).appliedRuleIds.some(id=>id.startsWith('pilot-'))).toBe(false);
  });
  for(const category of ['love','careerMoney'] as const)for(const aux of ['wealth','resource'] as const)it(`${category} output + ${aux} replaces single context only in explicit experiment`,()=>{
    const f={'natal.dayStem':7,'relations.output':2,[`relations.${aux}`]:1};
    const r=interpret('saju',category,f,experimental),id=`pilot-${category.toLowerCase()}-output-${aux}`;
    expect(r.appliedRuleIds).toContain(id);expect(r.appliedRuleIds).not.toContain(`relation-${category.toLowerCase()}-output`);
    const trace=r.ruleTraces.find(t=>t.ruleId===id)!;
    expect(trace.premises).toHaveLength(3);expect(trace.usedFeatures).toEqual(f);
    expect(trace.basisIds).toEqual(['stem-7','group-output',`group-${aux}`]);
    expect(interpret('saju',category,f,{all:experimental.all,find:(s,c)=>experimental.find(s,c).reverse()})).toEqual(r);
    expect(interpret('saju',category,{...f,'light.variant':'irrelevant'},experimental)).toEqual(r);
  });
  it('both premise thresholds, the day and missing values block an unearned compound claim',()=>{
    for(const f of [{...features,'relations.output':1},{...features,'relations.wealth':0},{...features,'relations.wealth':null},{'natal.dayStem':7,'relations.output':2},{...features,'natal.dayStem':null}]){
      expect(interpret('saju','love',f,experimental).appliedRuleIds.some(id=>id.startsWith('pilot-'))).toBe(false);
    }
  });
  it('records every factual condition including stronger thresholds and all any branches',()=>{
    const draft=experimental.all().find(r=>r.id==='pilot-love-output-wealth')!;
    for(const premises of [draft.reasoning!.premises.slice(0,2),draft.reasoning!.premises.map(p=>p.feature==='relations.output'?{...p,value:1}:p)])expect(()=>validateRules([{...draft,reasoning:{...draft.reasoning!,premises}}])).toThrow(/전제 기록/);
    expect(()=>validateRules([{...draft,conditions:{any:[draft.conditions,{feature:'natal.dayStem',op:'eq',value:7}]}}])).toThrow(/근거|전제/);
    expect(()=>validateRules([{...draft,reasoning:{...draft.reasoning!,premises:draft.reasoning!.premises.map(p=>p.feature==='relations.wealth'?{...p,basisKey:'group-resource'}:p)}}])).toThrow(/복합 전제/);
  });
  it('ties are stable even for a partial impossible runtime combination',()=>{
    const f={...features,'relations.resource':1}; // Sum 4: deliberately partial, never labeled a complete runtime calculation.
    expect(interpret('saju','love',f,experimental)).toEqual(interpret('saju','love',f,{all:experimental.all,find:(s,c)=>experimental.find(s,c).reverse()}));
    expect(runtimeFeatureErrors(f).length).toBeGreaterThan(0);
  });
});
describe('review provenance and diagnostic fidelity',()=>{
  it('complete runtime counts differ from partial fixtures without coercion',()=>{
    const result=calculateSaju({year:1992,month:5,day:15,calendar:'solar',leap:false,unknownTime:false,hour:10,minute:30,nickname:''});
    expect(runtimeFeatureErrors(result.features)).toEqual([]);
    expect(runtimeFeatureErrors({...result.features,'relations.output':99})).not.toEqual([]);
    expect(interpret('saju','love',{'natal.dayStem':7}).ruleTraces.every(t=>!Object.hasOwn(t.usedFeatures,'relations.output'))).toBe(true);
  });
  it('does not claim tips beyond the four visible suggestions',()=>{
    const r=interpret('saju','general',{'natal.dayStem':7,'relations.output':2,'elements.목':2});
    expect(r.practicalTips).toHaveLength(4);
    for(const trace of r.ruleTraces){
      const rule=contentRepository.all().find(x=>x.id===trace.ruleId)!;
      for(const proposal of reasoningFor(rule).proposals)expect(trace.claimIds.includes(proposal.id)).toBe(proposal.tipIndexes.some(i=>r.practicalTips.includes(rule.practicalTips[i])));
    }
  });
  it('does not promote an unverified source by filling only an ID',()=>{
    expect(()=>sourceRecordSchema.parse({id:'fake',kind:'external-reference',title:'후보',author:null,url:null,identifier:null,checkedLocation:null,checkedAt:null,applicablePolicy:'pending',usageScope:'not used',reviewer:null,status:'verified-reference'})).toThrow(/확인 완료/);
  });
  it('requires an identified independent reviewer for editorial acceptance',()=>{
    expect(()=>reviewRecordSchema.parse({id:'fake',ruleId:'core-love-7',contentVersion:'1.1.0',contentHash:'a'.repeat(64),reviewer:{role:'implementation-author',name:null},date:'2026-10-20',claims:[],corrections:[],counterexamples:[],issueIds:[],status:'accepted-for-editorial-use'})).toThrow(/실제 검토자/);
    expect(canonicalContent({b:1,a:[{z:2,c:3}]})).toBe(canonicalContent({a:[{c:3,z:2}],b:1}));
  });
});
