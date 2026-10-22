import type { CivilDate, LunarDate } from '../calendar/korean';
import type { AdvancedOptions } from '../advanced/types';
import type { CivilTime } from '../calendar/timezone';
export interface BirthInput extends CivilDate {calendar:'solar'|'lunar';leap:boolean;unknownTime:boolean;hour?:number;minute?:number;nickname:string;advanced?:AdvancedOptions}
export interface NormalizedBirthInput {solar:CivilDate;lunar:LunarDate;instant:number|null;standardTime:CivilTime|null;unknownTime:boolean;dstAdjusted:boolean}
export interface Pillar {stem:number;branch:number}
export type UnknownValue=null;
export const featurePaths=[
  'natal.dayStem','natal.dayElement','natal.knownCount','natal.hourKnown','natal.boundary','natal.dstAdjusted',
  'elements.목','elements.화','elements.토','elements.금','elements.수',
  'relations.peer','relations.output','relations.wealth','relations.order','relations.resource',
  'period.relation','period.kind','light.sign','light.variant',
] as const;
export type FeaturePath=typeof featurePaths[number];
export type FeatureValue=string|number|boolean;
export type Features=Partial<Record<FeaturePath,FeatureValue|UnknownValue>>;
export interface SajuCalculationResult {
  normalizedInput:NormalizedBirthInput;
  pillars:{year:Pillar|null;month:Pillar|null;day:Pillar|null;hour:Pillar|null};
  dayMaster:number|null;features:Features;limitations:string[];policyVersion:string;engineVersion:string;
}
