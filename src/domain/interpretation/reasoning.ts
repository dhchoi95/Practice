import type { InterpretationRule } from './schema';
import { interpretationBases } from './knowledge';

/** V1 prose is preserved. The adapter changes structure, never review status or truth status. */
export function reasoningFor(rule:InterpretationRule){
  if(rule.reasoning)return {...rule.reasoning,origin:'authored-v2' as const};
  const basis=interpretationBases.find(b=>b.id===rule.evidence?.basisKey);
  return {
    schemaVersion:2 as const,origin:'legacy-adapter' as const,
    premises:basis?[{id:`${rule.id}-premise`,basisKey:basis.id,feature:basis.feature,op:basis.op,value:basis.value}]:[],
    interpretations:rule.evidence?[{id:`${rule.id}-interpretation`,text:rule.evidence.rationale,sourceIds:rule.provenance.sourceIds,status:'internal-policy' as const}]:[],
    proposals:[{id:`${rule.id}-proposal`,tipIndexes:rule.practicalTips.map((_,i)=>i),status:'suggestion' as const}],
  };
}
