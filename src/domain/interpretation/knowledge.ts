import { z } from 'zod';
import data from '@/content/interpretation-bases.json';
import { sourceIds } from '@/content/sources';
import { featurePaths,type Features } from '../saju/types';
import { stemNames,stemElements } from '../saju/tables';
import type { Condition } from './schema';

const basisSchema=z.object({id:z.string(),kind:z.enum(['day-symbol','period-relation','visible-stems']),feature:z.enum(featurePaths),op:z.enum(['eq','gte']),value:z.union([z.string(),z.number()]),fact:z.string().min(15),editorialTheme:z.string(),scope:z.string().min(30),sourceIds:z.array(z.string()).min(1)}).strict();
export const interpretationBases=z.array(basisSchema).parse(data);
if(new Set(interpretationBases.map(b=>b.id)).size!==interpretationBases.length||interpretationBases.some(b=>b.sourceIds.some(id=>!sourceIds.includes(id))))throw new Error('풀이 근거의 ID·출처를 확인하세요.');
export function impliesBasis(c:Condition,basis:typeof interpretationBases[number]):boolean{
  if('all'in c)return c.all.some(child=>impliesBasis(child,basis));
  if('any'in c)return c.any.every(child=>impliesBasis(child,basis));
  if(c.feature!==basis.feature)return false;
  if(basis.op==='eq')return c.op==='eq'&&c.value===basis.value;
  return (c.op==='gte'||c.op==='eq')&&typeof c.value==='number'&&typeof basis.value==='number'&&c.value>=basis.value;
}
const groupNames:Record<string,string>={peer:'비겁',output:'식상',wealth:'재성',order:'관성',resource:'인성'};
export function appliedFact(basis:typeof interpretationBases[number],features:Features):string{
  if(basis.kind==='day-symbol'){
    const stem=Number(features['natal.dayStem']);
    return `계산된 일간은 ${stemNames[stem]}${stemElements[stem]}이에요. 일간의 상징 한 가지에서 시작한 관찰 질문이에요.`;
  }
  if(basis.kind==='period-relation')return `내 일간과 대상 기간 천간의 관계는 ${features['period.relation']}이에요. 실제 사건을 계산한 값은 아니에요.`;
  return `일간을 제외한 확정 천간에서 ${groupNames[basis.feature.split('.')[1]]} 관계가 ${features[basis.feature]}개 확인됐어요. 여러 관계가 있으면 개수가 많은 설명 하나를 우선하고, 동수이면 정해진 순서로 골라요. 개수는 강약이 아니에요.`;
}
