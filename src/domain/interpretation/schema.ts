import { z } from 'zod';
import { featurePaths, type FeaturePath, type FeatureValue } from '../saju/types';
export const contentCategories=['general','personality','love','careerMoney','relationships','single','mind','year','month','day'] as const;
export type ContentCategory=typeof contentCategories[number];
export const systems=['saju','zodiac','constellation','bloodType'] as const;
export type ContentSystem=typeof systems[number];
export type Condition={feature:FeaturePath;op:'eq'|'in'|'gte'|'lte';value:FeatureValue|FeatureValue[]}|{all:Condition[]}|{any:Condition[]};
const scalar=z.union([z.string(),z.number().finite(),z.boolean()]);
const conditionSchema:z.ZodType<Condition>=z.lazy(()=>z.union([
  z.object({feature:z.enum(featurePaths),op:z.enum(['eq','in','gte','lte']),value:z.union([scalar,z.array(scalar).min(1).max(20)])}).strict(),
  z.object({all:z.array(conditionSchema).min(1).max(12)}).strict(),
  z.object({any:z.array(conditionSchema).min(1).max(12)}).strict(),
]));
export function conditionDepth(c:Condition):number {return 'feature'in c?1:1+Math.max(...('all'in c?c.all:c.any).map(conditionDepth));}
export const ruleSchema=z.object({
  id:z.string().regex(/^[a-z0-9-]+$/).max(100),system:z.enum(systems),category:z.enum(contentCategories),
  section:z.enum(['overview','detail','balance','context','practice']),title:z.string().min(2).max(80),
  conditions:conditionSchema,exclusions:conditionSchema.optional(),requires:z.array(z.enum(featurePaths)).max(20),
  priority:z.number().int(),specificity:z.number().int().min(0),exclusiveGroup:z.string().optional(),semanticAxis:z.string().optional(),stance:z.string().optional(),
  paragraphs:z.array(z.string().min(10).max(800)).min(1).max(5),practicalTips:z.array(z.string().min(5).max(300)).min(1).max(4),
  sharedExplanationId:z.string().optional(),
  relatedGlossaryKeys:z.array(z.string()).max(10),
  provenance:z.object({kind:z.enum(['calculation-rule','traditional-interpretation','original-editorial']),sourceIds:z.array(z.string()).min(1),note:z.string().min(5)}),
  reviewStatus:z.enum(['draft','automated-checked','human-reviewed']),contentVersion:z.string(),updatedAt:z.iso.date(),
}).strict().superRefine((r,ctx)=>{
  if(conditionDepth(r.conditions)>4 || (r.exclusions&&conditionDepth(r.exclusions)>4)) ctx.addIssue({code:'custom',message:'조건 중첩은 4단계 이하여야 합니다.'});
  const check=(c:Condition)=>{
    if('feature'in c){
      if(c.op==='in'&&!Array.isArray(c.value))ctx.addIssue({code:'custom',message:'in은 배열이 필요합니다.'});
      if((c.op==='gte'||c.op==='lte')&&typeof c.value!=='number')ctx.addIssue({code:'custom',message:'수치 비교에는 숫자가 필요합니다.'});
      if(c.op==='eq'&&Array.isArray(c.value))ctx.addIssue({code:'custom',message:'eq에는 단일 값이 필요합니다.'});
    }else ('all'in c?c.all:c.any).forEach(check);
  };check(r.conditions);if(r.exclusions)check(r.exclusions);
});
export type InterpretationRule=z.infer<typeof ruleSchema>;
