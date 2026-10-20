import { describe,it,expect } from 'vitest';
import { appliedFact,interpretationBases } from '@/domain/interpretation/knowledge';
import { particleErrors } from '@/domain/interpretation/quality';
import raw from '@/content/rules.json';
import bases from '@/content/interpretation-bases.json';

describe('CR-01 independent review regressions',()=>{
  it('audits evidence and reference prose, not only body paragraphs',()=>{
    const errors=raw.flatMap(r=>Object.values(r.evidence??{}).flatMap(text=>particleErrors(text)));
    expect(errors).toEqual([]);
    expect(bases.flatMap(b=>particleErrors(b.fact))).toEqual([]);
  });
  it('generates vowel-ending Korean copulas for actual visible explanations',()=>{
    expect(appliedFact(interpretationBases.find(b=>b.id==='stem-2')!,{'natal.dayStem':2})).toContain('병화예요');
    expect(appliedFact(interpretationBases.find(b=>b.id==='god-4')!,{'period.relation':'편재'})).toContain('편재예요');
  });
});
