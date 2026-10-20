import { describe,it,expect } from 'vitest';
import { evaluate,selectRules,interpret } from '@/domain/interpretation/engine';
import { contentRepository,validateRules } from '@/domain/interpretation/repository';
import type { InterpretationRule,Condition } from '@/domain/interpretation/schema';
import { calculateSaju } from '@/domain/saju/calculate';
import { categories } from '@/config/site';
import { targetPeriod } from '@/domain/fortune/period';
import { particleErrors,templateDuplicates } from '@/domain/interpretation/quality';
import { sharedExplanations } from '@/domain/interpretation/shared';
const base=contentRepository.all()[0];
function testRule(overrides:Partial<InterpretationRule>):InterpretationRule{return {...base,id:'test',requires:[],conditions:{feature:'natal.hourKnown',op:'eq',value:true},exclusiveGroup:undefined,semanticAxis:undefined,stance:undefined,...overrides};}
const f={'natal.hourKnown':true,'elements.목':2,'natal.dayStem':0} as const;
describe('declarative DSL and safe schema',()=>{
  it('evaluates all/any, eq/in/gte/lte',()=>{
    expect(evaluate({all:[{feature:'elements.목',op:'gte',value:2},{any:[{feature:'natal.dayStem',op:'in',value:[0,1]},{feature:'natal.hourKnown',op:'eq',value:false}]}]},f)).toBe(true);
    expect(evaluate({feature:'elements.목',op:'lte',value:1},f)).toBe(false);
    expect(evaluate({feature:'natal.hourKnown',op:'eq',value:false},f)).toBe(false);
  });
  it('does not convert unknown to false or zero',()=>{
    expect(evaluate({feature:'natal.hourKnown',op:'eq',value:false},{})).toBe(false);
    expect(evaluate({feature:'elements.목',op:'lte',value:0},{'elements.목':null})).toBe(false);
    expect(selectRules([testRule({requires:['period.relation']})],f).selected).toHaveLength(0);
  });
  it('exclusion blocks a matching rule',()=>expect(selectRules([testRule({exclusions:{feature:'elements.목',op:'gte',value:1}})],f).selected).toHaveLength(0));
  it('rejects duplicates, missing glossary, blank text, feature typos',()=>{
    expect(()=>validateRules([base,base])).toThrow(/중복/);
    expect(()=>validateRules([{...base,relatedGlossaryKeys:['missing']}])).toThrow(/용어/);
    expect(()=>validateRules([{...base,paragraphs:['']}])).toThrow();
    expect(()=>validateRules([{...base,conditions:{feature:'evil',op:'eq',value:0}}])).toThrow();
  });
  it('rejects deep/long DSL and invalid operators without evaluating code',()=>{
    let condition:Condition={feature:'natal.dayStem',op:'eq',value:0};
    for(let i=0;i<5;i++)condition={all:[condition]};
    expect(()=>validateRules([{...base,conditions:condition}])).toThrow();
    expect(()=>validateRules([{...base,conditions:{feature:'natal.dayStem',op:'eval',value:'process.exit()'}}])).toThrow();
    expect(()=>validateRules([{...base,conditions:{feature:'elements.목',op:'gte',value:'2'}}])).toThrow();
  });
});
describe('deterministic ordering and conflict resolution',()=>{
  it('priority then specificity then id, regardless of input array',()=>{
    const rules=[testRule({id:'c',priority:10,specificity:1,exclusiveGroup:'one'}),testRule({id:'b',priority:20,specificity:1,exclusiveGroup:'one'}),testRule({id:'a',priority:20,specificity:2,exclusiveGroup:'one'})];
    expect(selectRules(rules,f).selected.map(r=>r.id)).toEqual(['a']);
    expect(selectRules(rules.reverse(),f).selected.map(r=>r.id)).toEqual(['a']);
  });
  it('stable id wins exact ties',()=>{
    const rules=[testRule({id:'z',exclusiveGroup:'same'}),testRule({id:'a',exclusiveGroup:'same'})];
    expect(selectRules(rules,f).selected[0].id).toBe('a');
  });
  it('blocks opposing stances on the same semantic axis',()=>{
    const rules=[testRule({id:'fast',priority:20,semanticAxis:'expression',stance:'fast'}),testRule({id:'slow',priority:10,semanticAxis:'expression',stance:'slow'})];
    const {selected,skipped}=selectRules(rules,f);expect(selected.map(r=>r.id)).toEqual(['fast']);expect(skipped[0].reason).toBe('의미 충돌');
  });
  it('shows neutral limitation when content is absent',()=>{
    const result=interpret('saju','personality',f,{find:()=>[],all:()=>[]});
    expect(result.limitations).not.toHaveLength(0);expect(result.sections[0].id).toBe('neutral');
  });
});
describe('real content and synthetic profile coverage',()=>{
  const clock={now:()=>new Date('2026-10-20T03:00:00Z')};
  const input={year:1992,month:5,day:15,calendar:'solar' as const,leap:false,unknownTime:false,hour:10,minute:30,nickname:''};
  it('210 conditional records and five separately counted shared explanations',()=>{
    const rules=contentRepository.all();expect(rules).toHaveLength(210);
    expect(rules.filter(r=>r.id.startsWith('core-'))).toHaveLength(70);
    expect(rules.filter(r=>r.id.startsWith('element-'))).toHaveLength(35);
    expect(sharedExplanations).toHaveLength(5);
    expect(rules.filter(r=>r.id.startsWith('element-')).every(r=>r.paragraphs.length===2&&!!r.sharedExplanationId)).toBe(true);
    expect(templateDuplicates(rules.filter(r=>r.id.startsWith('element-')))).toEqual([]);
    expect(rules.filter(r=>r.id.startsWith('period-'))).toHaveLength(30);
    const paragraphs=rules.flatMap(r=>r.paragraphs);expect(new Set(paragraphs).size).toBe(paragraphs.length);
    expect(rules.some(r=>r.reviewStatus==='human-reviewed')).toBe(false);
  });
  it('all ten stems and seven core topics match substantive distinct content',()=>{
    const heads=new Set<string>();
    for(let stem=0;stem<10;stem++)for(const category of ['general','personality','love','careerMoney','relationships','single','mind'] as const){
      const result=interpret('saju',category,{...f,'natal.dayStem':stem});
      expect(result.sections.some(s=>s.id.startsWith('core-'))).toBe(true);
      expect(result.sections.flatMap(s=>s.paragraphs).join('').length).toBeGreaterThan(240);heads.add(result.headline);
    }
    expect(heads.size).toBe(70);
  });
  it('same input and versions reproduce, shuffled repository has same output',()=>{
    const features=calculateSaju(input,clock).features;
    const a=interpret('saju','general',features),b=interpret('saju','general',features);
    const repo={find:()=>contentRepository.find('saju',['general','personality','careerMoney','love','relationships']).reverse(),all:()=>contentRepository.all()};
    expect(a).toEqual(b);expect(interpret('saju','general',features,repo)).toEqual(a);
    expect(a.sections.flatMap(s=>s.paragraphs).join('').length).toBeLessThanOrEqual(1800);
  });
  it('different natal days produce different readings; names cannot change calculation',()=>{
    const first=calculateSaju(input,clock),second=calculateSaju({...input,day:16},clock),renamed=calculateSaju({...input,nickname:'<img src=x onerror=alert(1)>' .slice(0,20)},clock);
    expect(first.pillars).not.toEqual(second.pillars);expect(first).toEqual(renamed);
    expect(interpret('saju','personality',first.features).headline).not.toBe(interpret('saju','personality',second.features).headline);
  });
  it('unknown hour does not activate requires or hour-only content',()=>{
    const r=calculateSaju({...input,unknownTime:true},clock);
    const i=interpret('saju','love',r.features);
    expect(i.appliedRuleIds).toContain('unknown-love');expect(r.pillars.hour).toBeNull();
    expect(selectRules([testRule({requires:['natal.hourKnown'],conditions:{feature:'natal.hourKnown',op:'eq',value:true}})],r.features).selected).toHaveLength(0);
  });
  it('unknown DST day excludes every paragraph that presumes a confirmed day stem',()=>{
    const result=calculateSaju({...input,year:1987,month:6,day:1,unknownTime:true},clock);
    expect(result.dayMaster).toBeNull();
    for(const c of categories.filter(c=>c.system==='saju')){
      const features=['year','month','day'].includes(c.slug)?{...result.features,...targetPeriod(c.slug as 'year'|'month'|'day',null,clock).segments[0].features}:result.features;
      const reading=interpret('saju',c.content,features);
      expect(reading.sections.flatMap(s=>s.paragraphs).join(' ')).not.toMatch(/확정한 (일간|기둥과 일간)|알려진 일간/);
      expect(reading.sections.some(s=>s.id==='unknown-day')).toBe(true);
      expect(reading.appliedRuleIds).not.toContain('unknown-personality');
      expect(reading.appliedRuleIds).not.toContain('unknown-single');
      expect(reading.appliedRuleIds).not.toContain('unknown-general');
    }
  });
  it('all period endpoints include years at December and year boundaries',()=>{
    const december={now:()=>new Date('2026-12-31T03:00:00Z')};
    for(const kind of ['year','month','day'] as const){
      const period=targetPeriod(kind,7,december);
      const last=period.segments.at(-1)!;
      expect(last.label).toContain('2026년');expect(last.label).toContain('2027년 1월 1일 00:00');
      for(const segment of period.segments)expect(segment.start).toBeLessThan(segment.end);
    }
  });
  it('period content changes through calculated relations while core traits remain stable',()=>{
    const natal=calculateSaju(input,clock).features;
    const normal=interpret('saju','personality',natal);
    const a=targetPeriod('day',7,clock),b=targetPeriod('day',7,{now:()=>new Date('2026-10-21T03:00:00Z')});
    expect(interpret('saju','day',{...natal,...a.segments[0].features}).headline).not.toBe(interpret('saju','day',{...natal,...b.segments[0].features}).headline);
    expect(interpret('saju','personality',{...natal,...b.segments[0].features})).toEqual(normal);
  });
  it('all menu and period sections cover known/unknown synthetic dates including DST limitation',()=>{
    for(const year of [1972,1992,2002])for(const unknownTime of [true,false])for(let day=1;day<=10;day++){
      const r=calculateSaju({...input,year,day,unknownTime},clock);
      for(const c of categories.filter(c=>c.system==='saju')){
        const features=['day','month','year'].includes(c.slug)?{...r.features,...targetPeriod(c.slug as 'year'|'month'|'day',r.dayMaster,clock).segments[0].features}:r.features;
        expect(interpret('saju',c.content,features).limitations).toHaveLength(0);
      }
    }
    const r=calculateSaju({...input,year:1987,month:6,day:1,unknownTime:true},clock);
    expect(interpret('saju','personality',r.features).limitations.length).toBeGreaterThan(0);
  });
  it('all 28 light categories use their own system and do not depend on saju',()=>{
    for(const system of ['zodiac','constellation','bloodType'] as const)for(const sign of system==='bloodType'?['A','B','O','AB']:Array.from({length:12},(_,i)=>String(i))){
      const r=interpret(system,system==='bloodType'?'personality':'day',{'light.sign':sign});
      expect(r.sections).toHaveLength(1);expect(r.appliedRuleIds[0]).toMatch(/^light-/);expect(r.limitations).toHaveLength(0);
    }
  });
});

describe('manuscript quality regressions',()=>{
  it('detects reviewed particle errors and accepts correct consonant/vowel pairs',()=>{
    expect(particleErrors('목가 많아요. 금는 이래요. 비견를 참고해요. 식신를 읽어요. 정관를 살펴요.')).toEqual(expect.arrayContaining(['목가','금는','비견를','식신를','정관를']));
    expect(particleErrors('목이 있고 금은 둘이에요. 비견을 살피고 겁재를 읽어요. 화가 있고 토는 하나예요. 수를 세요.')).toEqual([]);
    expect(particleErrors('목가적인 풍경과 금가루는 관련이 없어요.')).toEqual([]);
  });
  it('rejects supplements whose topic names are the only difference',()=>{
    const passage=(topic:string)=>`${topic}에서는 계획을 처음 세웠을 때와 유지할 때 필요한 자원이 다를 수 있어요. 다른 오행의 개수나 실제 경험을 무시하고 이 상징 하나로 결론 내리지는 않아요.`;
    expect(templateDuplicates([{id:'a',paragraphs:[passage('나의 생활 전체')]},{id:'b',paragraphs:[passage('관계에서 주고받는 표현')]}])).toEqual(['a / b']);
    expect(templateDuplicates([{id:'a',paragraphs:[passage('나의 생활 전체')]},{id:'b',paragraphs:[passage('나의 생활 전체')+' 잠깐 쉬어도 괜찮아요.']}])).toEqual(['a / b']);
  });
  it('fails unsafe authored day-stem assumptions at repository validation',()=>{
    expect(()=>validateRules([{...base,requires:[],paragraphs:['확정한 일간의 상징을 중심으로 읽는 문장이에요.']}])).toThrow(/일간 전제/);
    expect(()=>validateRules([{...base,sharedExplanationId:'missing'}])).toThrow(/공통 설명/);
  });
});
