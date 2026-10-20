import type { Features } from '../saju/types';
import type { TargetPeriod,PeriodSegment } from '../fortune/period';
import { interpret,traceVisibleTips,type InterpretationResult,type InterpretationSection,type RuleTrace } from './engine';
import { contentRepository,type ContentRepository } from './repository';

export interface SegmentTrace extends Pick<PeriodSegment,'start'|'end'|'label'|'features'> {
  appliedRuleIds:string[];ruleTraces:RuleTrace[];
  skippedRuleReasons:{id:string;reason:string}[];
  contentVersion:string;ruleEngineVersion:string;
}
export interface PeriodReading extends InterpretationResult {segmentTraces:SegmentTrace[]}
/** Composes exactly the paragraphs rendered by the UI. No persistence or network side effects. */
export function composePeriodReading(period:TargetPeriod,natal:Features,repo:ContentRepository=contentRepository,maxCharacters=1800):PeriodReading {
  if(!period.segments.length)throw new Error('기간 구간이 필요합니다.');
  if(!Number.isInteger(maxCharacters)||maxCharacters<1)throw new Error('출력 길이는 양의 정수여야 합니다.');
  const readings=period.segments.map(s=>interpret('saju',period.kind,{...natal,...s.features},repo));
  const sections:InterpretationSection[]=[],owners=new Map<string,string>(),segmentTraces:SegmentTrace[]=[],basisGroups:{label:string;basis:string[]}[]=[];
  let length=0;
  for(const [i,reading] of readings.entries()){
    const segment=period.segments[i],traces:RuleTrace[]=[],skipped=[...reading.skippedRuleReasons];
    const usedSections:InterpretationSection[]=[];
    for(const section of reading.sections){
      const trace=reading.ruleTraces.find(t=>t.ruleId===section.id);
      const fresh=section.paragraphs.flatMap((p,index)=>owners.has(p)?[]:[index]);
      const size=fresh.reduce((n,j)=>n+section.paragraphs[j].length,0);
      const fits=length+size<=maxCharacters;
      const displayed=section.paragraphs.flatMap((p,j)=>owners.get(p)===section.id||(!owners.has(p)&&fits)?[j]:[]);
      if(!displayed.length){skipped.push({id:section.id,reason:fits?'기간 출력 문장 중복':'기간 출력 길이 제한'});continue;}
      if(fits&&fresh.length){
        const paragraphs=fresh.map(j=>section.paragraphs[j]);
        paragraphs.forEach(p=>owners.set(p,section.id));length+=size;
        const existing=sections.find(s=>s.id===section.id);
        if(existing)existing.paragraphs.push(...paragraphs);
        else sections.push({...section,paragraphs});
      }
      usedSections.push(section);
      if(trace){
        const indexes=displayed.map(j=>trace.displayedParagraphIndexes[j]);
        traces.push({...trace,displayedParagraphIndexes:indexes,sharedExplanationIds:trace.sharedExplanationIds.length&&indexes.includes(0)?trace.sharedExplanationIds:[]});
      }
    }
    const relation=segment.features['period.relation'];
    const label=`${period.segments.length===1?'대상 구간':i===0?'앞 구간':'뒤 구간'} · ${relation??'관계 미확정'}`;
    basisGroups.push({label,basis:[...new Set(usedSections.flatMap(s=>s.basis))]});
    segmentTraces.push({...segment,features:{...segment.features},appliedRuleIds:traces.map(t=>t.ruleId),ruleTraces:traces,skippedRuleReasons:skipped,contentVersion:reading.contentVersion,ruleEngineVersion:reading.ruleEngineVersion});
  }
  const practicalTips=[...new Set(sections.flatMap(s=>s.tips))].slice(0,4);
  for(const s of segmentTraces)s.ruleTraces=s.ruleTraces.map(t=>traceVisibleTips(t,repo.all().find(r=>r.id===t.ruleId)!,practicalTips));
  const ruleTraces=segmentTraces.flatMap(s=>s.ruleTraces);
  const limitations=[...new Set(readings.flatMap(r=>r.limitations))];
  if(!sections.length){
    const message='기간 요약의 길이 제한으로 표시할 원고가 남지 않았어요. 요약 범위를 조정해 주세요.';
    limitations.push(message);
    sections.push({id:'neutral',title:'이 기간의 요약 범위를 확인해 주세요',paragraphs:[message],tips:[],basis:['표시되지 않은 원고의 해석은 적용하지 않았어요.']});
  }
  return {...readings[0],headline:sections[0]?.title??readings[0].headline,sections,
    practicalTips,
    appliedRuleIds:[...new Set(ruleTraces.map(t=>t.ruleId))],ruleTraces,
    sharedExplanationIds:[...new Set(ruleTraces.flatMap(t=>t.sharedExplanationIds))],
    skippedRuleReasons:[],limitations,basisGroups,segmentTraces};
}
