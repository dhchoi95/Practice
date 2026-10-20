import { describe,it,expect } from 'vitest';
import { koreanEnding } from '@/lib/korean';
import { appliedFact,interpretationBases,validateBasisDefinitions } from '@/domain/interpretation/knowledge';
import { languageAudit } from '@/domain/interpretation/quality';
import { contentRepository,validateRules } from '@/domain/interpretation/repository';
import { interpret } from '@/domain/interpretation/engine';
import { composePeriodReading } from '@/domain/interpretation/period-reading';
import { reasoningFor } from '@/domain/interpretation/reasoning';
import { calculateSaju } from '@/domain/saju/calculate';
import { targetPeriod } from '@/domain/fortune/period';
import type { InterpretationRule } from '@/domain/interpretation/schema';
const clock={now:()=>new Date('2026-10-20T03:00:00Z')};
const birth={year:1992,month:5,day:15,calendar:'solar' as const,leap:false,unknownTime:false,hour:10,minute:30,nickname:''};
const natal=calculateSaju(birth,clock);
const table=[['갑목','은','이','을','이에요'],['을목','은','이','을','이에요'],['병화','는','가','를','예요'],['정화','는','가','를','예요'],['무토','는','가','를','예요'],['기토','는','가','를','예요'],['경금','은','이','을','이에요'],['신금','은','이','을','이에요'],['임수','는','가','를','예요'],['계수','는','가','를','예요'],['비견','은','이','을','이에요'],['겁재','는','가','를','예요'],['식신','은','이','을','이에요'],['상관','은','이','을','이에요'],['편재','는','가','를','예요'],['정재','는','가','를','예요'],['편관','은','이','을','이에요'],['정관','은','이','을','이에요'],['편인','은','이','을','이에요'],['정인','은','이','을','이에요']];
describe('CR-01 complete supported-term table',()=>{
  for(const [term,...suffixes] of table)it(term,()=>{
    (['topic','subject','object','copula'] as const).forEach((kind,i)=>expect(koreanEnding(term,kind)).toBe(term+suffixes[i]));
    const basis=interpretationBases.find(b=>b.kind===(table.findIndex(t=>t[0]===term)<10?'day-symbol':'period-relation')&&(b.kind==='day-symbol'?b.value===table.findIndex(t=>t[0]===term):b.value===term))!;
    expect(appliedFact(basis,{[basis.feature]:basis.value})).toContain(term+suffixes[3]);
  });
  it('does not guess pronunciation for numbers, Latin, empty strings or punctuation',()=>{
    for(const s of ['','123','AI','갑목)'])expect(()=>koreanEnding(s,'topic')).toThrow(RangeError);
  });
  it('audits titles, evidence and actual generated basis prose',()=>{
    expect(languageAudit(contentRepository.all())).toEqual([]);
    const r=contentRepository.all()[0];
    expect(languageAudit([{...r,title:'병화이에요',evidence:{...r.evidence!,limitation:'편재을 설명하는 한계 문장을 검사하기 위한 충분히 긴 예문입니다.'}}])).toEqual(expect.arrayContaining([expect.stringContaining('title'),expect.stringContaining('limitation')]));
  });
});
describe('CR-02 pure period composition and trace',()=>{
  for(const kind of ['year','month','day'] as const)it(`${kind} includes every displayed segment and its versions`,()=>{
    const period=targetPeriod(kind,natal.dayMaster,clock),r=composePeriodReading(period,natal.features);
    expect(r.segmentTraces).toHaveLength(period.segments.length);
    expect(r.appliedRuleIds).toEqual([...new Set(r.sections.filter(s=>!['neutral','unknown-day'].includes(s.id)).map(s=>s.id))]);
    expect(r.appliedRuleIds).toEqual([...new Set(r.segmentTraces.flatMap(s=>s.appliedRuleIds))]);
    for(const [i,s] of r.segmentTraces.entries()){
      expect(s.start).toBe(period.segments[i].start);expect(s.end).toBe(period.segments[i].end);
      expect(s.features['period.relation']).toBe(period.segments[i].features['period.relation']);
      expect(s.ruleTraces.every(t=>t.contentVersion&&t.basisIds.length&&t.usedFeatures['period.relation']===s.features['period.relation'])).toBe(true);
      expect(s.appliedRuleIds.some(id=>s.skippedRuleReasons.some(x=>x.id===id))).toBe(false);
    }
    expect(r.skippedRuleReasons).toEqual([]);
    if(kind==='year')expect(r.appliedRuleIds).toEqual(['period-year-4','period-year-7']);
  });
  it('references a shared displayed rule in both segments without duplicating its prose',()=>{
    const period=targetPeriod('month',natal.dayMaster,clock);
    period.segments[1].features={...period.segments[0].features};
    const r=composePeriodReading(period,natal.features);
    expect(r.sections).toHaveLength(1);
    expect(r.segmentTraces[0].appliedRuleIds).toEqual(r.segmentTraces[1].appliedRuleIds);
    expect(r.segmentTraces[1].ruleTraces[0].displayedParagraphIndexes.length).toBeGreaterThan(0);
  });
  it('keeps an unknown day neutral and does not invent period relationships',()=>{
    const unknown=calculateSaju({...birth,year:1987,month:6,day:1,unknownTime:true},clock);
    const r=composePeriodReading(targetPeriod('year',null,clock),unknown.features);
    expect(r.appliedRuleIds).toEqual([]);expect(r.limitations.length).toBeGreaterThan(0);
    expect(r.segmentTraces.every(s=>s.features['period.relation']===null&&s.ruleTraces.length===0)).toBe(true);
  });
  it('truncation leaves no trace or basis for omitted paragraphs',()=>{
    const r=composePeriodReading(targetPeriod('year',natal.dayMaster,clock),natal.features,contentRepository,500);
    expect(r.sections.flatMap(s=>s.paragraphs).join('').length).toBeLessThanOrEqual(500);
    expect(r.appliedRuleIds).toEqual(r.sections.map(s=>s.id));
    expect(r.appliedRuleIds).toHaveLength(1);
    expect(r.segmentTraces[1].skippedRuleReasons).toContainEqual({id:'period-year-7',reason:'기간 출력 길이 제한'});
    expect(r.basisGroups?.[1].basis).toEqual([]);
  });
  it('all-pruned output gives neutral guidance and never keeps an unseen rule headline',()=>{
    const period=targetPeriod('year',natal.dayMaster,clock),r=composePeriodReading(period,natal.features,contentRepository,1);
    expect(r.appliedRuleIds).toEqual([]);expect(r.ruleTraces).toEqual([]);
    expect(r.headline).toBe('이 기간의 요약 범위를 확인해 주세요');expect(r.sections[0].id).toBe('neutral');
    expect(r.limitations.join('')).toContain('길이 제한');
    for(const limit of [0,-1,NaN,Infinity,1.5])expect(()=>composePeriodReading(period,natal.features,contentRepository,limit)).toThrow(/양의 정수/);
  });
});
describe('typed premises and legacy migration',()=>{
  it('validates basis kind, feature, operator and domain rather than source existence alone',()=>{
    const b=interpretationBases[0];
    for(const patch of [{kind:'visible-stems'},{feature:'period.relation'},{op:'gte'},{value:10}])expect(()=>validateBasisDefinitions([{...b,...patch}])).toThrow(/근거 종류/);
    expect(()=>validateBasisDefinitions([{...b,sourceIds:['missing']}])).toThrow(/출처/);
  });
  it('adapts legacy prose without pretending it was independently reviewed',()=>{
    const r=contentRepository.all()[0],structured=reasoningFor(r);
    expect(structured.origin).toBe('legacy-adapter');expect(structured.interpretations[0].status).toBe('internal-policy');
    expect(structured.proposals[0].status).toBe('suggestion');expect(r.reviewStatus).toBe('automated-checked');
    expect(structured.premises[0].basisKey).toBe(r.evidence?.basisKey);
  });
  it('rejected long sections do not poison deduplication for a later short section',()=>{
    const base=contentRepository.all()[0];
    const rule=(id:string,paragraphs:string[],section:InterpretationRule['section']):InterpretationRule=>({...base,id,paragraphs,section,exclusiveGroup:undefined,conditions:{feature:'natal.dayStem',op:'eq',value:0}});
    const repeated='나중에도 표시되어야 할 짧은 문단입니다.';
    const rules=[rule('a',['첫 문단입니다.'.repeat(160)],'overview'),rule('b',[repeated,'길어서 빠질 문단입니다.'.repeat(90)],'detail'),rule('c',[repeated],'practice')];
    const r=interpret('saju','general',{'natal.dayStem':0},{all:()=>rules,find:()=>rules});
    expect(r.appliedRuleIds).toEqual(['a','c']);expect(r.sections[1].paragraphs).toEqual([repeated]);
    expect(r.ruleTraces.map(t=>t.ruleId)).toEqual(r.appliedRuleIds);
  });
  it('does not accept a compound factual premise omitted from any branch',()=>{
    const base=contentRepository.all().find(r=>r.id==='relation-love-output')!;
    const reasoning={schemaVersion:2,premises:[{id:'p',basisKey:'group-output',feature:'relations.output',op:'gte',value:2}],interpretations:[{id:'c',text:'두 개 이상 확인한 식상 집계로 표현과 시도의 조건을 함께 관찰하는 내부 편집 정책입니다.',sourceIds:['original-editorial'],status:'internal-policy'}],proposals:[{id:'a',tipIndexes:[0],status:'suggestion'}]};
    expect(()=>validateRules([{...base,reasoning}])).toThrow(/복합 전제/);
    expect(()=>validateRules([{...base,reasoning,conditions:{any:[{feature:'relations.output',op:'gte',value:2},{feature:'relations.wealth',op:'gte',value:1}]}}])).toThrow();
  });
});
