import { describe,it,expect } from 'vitest';
import cases from '../fixtures/editorial-evaluation.json';
import { contentRepository,validateRules } from '@/domain/interpretation/repository';
import { evaluateEditorialCase,type EditorialCase } from '@/domain/interpretation/evaluation';
import { interpretationBases,impliesBasis } from '@/domain/interpretation/knowledge';
import { interpret,selectRules } from '@/domain/interpretation/engine';
import { tenGod } from '@/domain/saju/tables';

describe('retained editorial acceptance cases (not predictive accuracy labels)',()=>{
  for(const c of cases as EditorialCase[])it(c.id,()=>expect(evaluateEditorialCase(c,contentRepository.all()).errors).toEqual([]));
});
describe('traceable facts, uncertainty and contextual selection',()=>{
  it('all 135 revised/added interpretation records carry linked evidence',()=>{
    const targeted=contentRepository.all().filter(r=>/^(core|period|relation)-/.test(r.id));
    expect(targeted).toHaveLength(135);expect(interpretationBases).toHaveLength(25);
    for(const r of targeted){
      expect(r.evidence?.counterExample.length).toBeGreaterThan(30);
      expect(r.evidence?.limitation.length).toBeGreaterThan(30);
      const basis=interpretationBases.find(b=>b.id===r.evidence?.basisKey)!;
      expect(impliesBasis(r.conditions,basis)).toBe(true);
    }
  });
  it('does not accept any-branches that omit the factual premise',()=>{
    const rule=contentRepository.all().find(r=>r.id==='core-love-0')!;
    expect(()=>validateRules([{...rule,conditions:{any:[rule.conditions,{feature:'natal.hourKnown',op:'eq',value:true}]}}])).toThrow(/근거와 적용 조건/);
    expect(()=>validateRules([{...rule,evidence:{...rule.evidence!,basisKey:'stem-1'}}])).toThrow(/근거와 적용 조건/);
  });
  it('fails malformed ranking metadata instead of inventing a count',()=>{
    const rule=contentRepository.all().find(r=>r.id==='relation-love-output')!;
    expect(()=>validateRules([{...rule,rankingFeature:'relations.wealth'}])).toThrow(/선택 기준/);
  });
  it('higher visible count wins; ties and reverse input remain deterministic',()=>{
    const rules=contentRepository.find('saju',['love']).filter(r=>r.id.startsWith('relation-'));
    const f={'natal.dayStem':0,'relations.peer':1,'relations.output':2,'relations.order':1} as const;
    expect(selectRules(rules,f).selected.map(r=>r.id)).toEqual(['relation-love-output']);
    expect(selectRules([...rules].reverse(),f)).toEqual(selectRules(rules,f));
    const result=interpret('saju','love',f);
    expect(result.sections.find(s=>s.id==='relation-love-output')?.basis.join(' ')).toContain('식상 관계가 2개');
    expect(result.sections.find(s=>s.id==='relation-love-output')?.basis.join(' ')).toContain('개수는 강약이 아니에요');
  });
  it('same stem with a different visible-stem relation gets a different actual contextual reading',()=>{
    const results=(cases.slice(0,2) as EditorialCase[]).map(c=>evaluateEditorialCase(c,contentRepository.all()));
    expect(results[0].dayStem).toBe(results[1].dayStem);expect(results[0].ruleIds).not.toEqual(results[1].ruleIds);
  });
});

// Hand-written application-policy matrix. This checks correspondence definitions,
// not the truth of personality or event predictions.
const matrix=[
  ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'],
  ['겁재','비견','상관','식신','정재','편재','정관','편관','정인','편인'],
  ['편인','정인','비견','겁재','식신','상관','편재','정재','편관','정관'],
  ['정인','편인','겁재','비견','상관','식신','정재','편재','정관','편관'],
  ['편관','정관','편인','정인','비견','겁재','식신','상관','편재','정재'],
  ['정관','편관','정인','편인','겁재','비견','상관','식신','정재','편재'],
  ['편재','정재','편관','정관','편인','정인','비견','겁재','식신','상관'],
  ['정재','편재','정관','편관','정인','편인','겁재','비견','상관','식신'],
  ['식신','상관','편재','정재','편관','정관','편인','정인','비견','겁재'],
  ['상관','식신','정재','편재','정관','편관','정인','편인','겁재','비견'],
];
describe('explicit yin/yang and generation/control relation matrix',()=>{
  for(let day=0;day<10;day++)it(`all ten other stems against day stem ${day}`,()=>{
    for(let other=0;other<10;other++)expect(tenGod(day,other)).toBe(matrix[day][other]);
  });
});
