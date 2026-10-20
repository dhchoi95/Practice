import records from '@/content/rules.json';
import { glossary } from '@/content/glossary';
import { sourceIds } from '@/content/sources';
import { ruleSchema, type InterpretationRule, type ContentCategory, type ContentSystem,type Condition } from './schema';
import { sharedExplanations } from './shared';
import { interpretationBases,impliesBasis } from './knowledge';
export interface ContentRepository {find(system:ContentSystem,categories:ContentCategory[]):InterpretationRule[]; all():InterpretationRule[]}
export function validateRules(data:unknown):InterpretationRule[] {
  if(!Array.isArray(data)||data.length>10000)throw new Error('콘텐츠는 10,000개 이하의 배열이어야 합니다.');
  const rules=data.map(r=>ruleSchema.parse(r));
  const ids=new Set<string>();
  for(const r of rules){
    if(ids.has(r.id))throw new Error(`중복 콘텐츠 ID: ${r.id}`);ids.add(r.id);
    if(r.relatedGlossaryKeys.some(k=>!glossary.some(g=>g.key===k)))throw new Error(`용어 링크 확인: ${r.id}`);
    if(r.provenance.sourceIds.some(k=>!sourceIds.includes(k)))throw new Error(`출처 확인: ${r.id}`);
    if(r.sharedExplanationId&&!sharedExplanations.some(s=>s.id===r.sharedExplanationId))throw new Error(`공통 설명 확인: ${r.id}`);
    const shared=sharedExplanations.find(s=>s.id===r.sharedExplanationId);
    if(shared&&!r.requires.includes(`elements.${shared.element}`))throw new Error(`공통 설명의 오행 조건 확인: ${r.id}`);
    if(r.paragraphs.some(p=>/확정한 일간|알려진 일간|확정한 기둥과 일간/.test(p))&&!r.requires.includes('natal.dayStem'))throw new Error(`일간 전제 조건 확인: ${r.id}`);
    if(r.evidence){
      const basis=interpretationBases.find(b=>b.id===r.evidence!.basisKey);
      if(!basis||!r.requires.includes(basis.feature)||!impliesBasis(r.conditions,basis))throw new Error(`풀이 근거와 적용 조건 확인: ${r.id}`);
      if(basis.kind!=='day-symbol'&&!r.requires.includes('natal.dayStem'))throw new Error(`천간 관계의 일간 조건 확인: ${r.id}`);
    }
    if(r.reasoning){
      const ids=[...r.reasoning.premises,...r.reasoning.interpretations,...r.reasoning.proposals].map(c=>c.id);
      if(new Set(ids).size!==ids.length)throw new Error(`주장 ID 중복: ${r.id}`);
      for(const premise of r.reasoning.premises){
        const basis=interpretationBases.find(b=>b.id===premise.basisKey);
        if(!basis||premise.feature!==basis.feature||premise.op!==basis.op||
          !(premise.value===basis.value||(premise.op==='gte'&&typeof premise.value==='number'&&typeof basis.value==='number'&&premise.value>=basis.value&&premise.value<=3))||
          !r.requires.includes(premise.feature)||!impliesBasis(r.conditions,premise))throw new Error(`복합 전제와 적용 조건 확인: ${r.id}`);
        if(basis.kind!=='day-symbol'&&!r.requires.includes('natal.dayStem'))throw new Error(`복합 전제의 일간 확인: ${r.id}`);
      }
      const leaves=(c:Condition):Condition[]=>'feature'in c?[c]:('all'in c?c.all:c.any).flatMap(leaves);
      for(const c of leaves(r.conditions))if('feature'in c&&(c.op==='eq'||c.op==='gte')&&interpretationBases.some(b=>b.feature===c.feature)){
        if(!r.reasoning.premises.some(p=>impliesBasis({feature:p.feature,op:p.op,value:p.value},{feature:c.feature,op:c.op as 'eq'|'gte',value:c.value as string|number})))throw new Error(`복합 조건의 전제 기록 누락: ${r.id}`);
      }
      if(r.reasoning.interpretations.some(c=>c.sourceIds.some(id=>!sourceIds.includes(id)))||r.reasoning.proposals.some(c=>c.tipIndexes.some(i=>i>=r.practicalTips.length)))throw new Error(`주장 출처·실천 연결 확인: ${r.id}`);
    }
    if(r.rankingFeature&&(!r.requires.includes(r.rankingFeature)||!r.exclusiveGroup||!r.evidence||interpretationBases.find(b=>b.id===r.evidence?.basisKey)?.feature!==r.rankingFeature))throw new Error(`관계 선택 기준 확인: ${r.id}`);
  }
  return rules;
}
// 원고는 자동 검사 통과 상태만 포함. 독립 명리 검토 완료를 의미하지 않는다.
const rules=validateRules(records).filter(r=>r.reviewStatus!=='draft');
export const contentRepository:ContentRepository={
  find:(system,categories)=>rules.filter(r=>r.system===system&&categories.includes(r.category)),
  all:()=>[...rules],
};
