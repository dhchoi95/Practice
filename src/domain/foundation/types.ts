import type { PeriodKind } from '../fortune/period';
import type { Facts } from '../advanced/types';
export const FOUNDATION_VERSION='2.2.1';
export const SECTOR_POLICY='SIX-SECTOR-CONTEXT-2.0';
export const domains=['overall','study','money','health','love','business'] as const;
export type Domain=typeof domains[number];
export const domainNames:Record<Domain,string>={overall:'총운',study:'학업운',money:'재물운',health:'건강운',love:'연애운',business:'사업운'};
export const contexts=['general','interview','exam','presentation','contract','meeting'] as const;
export type ScheduleContext=typeof contexts[number];
export const contextNames:Record<ScheduleContext,string>={general:'일반',interview:'면접',exam:'시험·자격',presentation:'발표·협상',contract:'계약·거래',meeting:'만남·중요한 약속'};
export interface Test {path:string;op:'eq'|'gte'|'in';value:string|number|boolean|string[]}
export interface Condition {all:Test[];any?:Test[]}
export interface SectorRecord {
 id:string;version:string;domain:Domain;unit:PeriodKind;role:'core'|'supplement';scenario:string;semanticId:string;
 requires:Condition;premises:string[];exclusions:Test[];neededInputs:string[];unknownHandling:string;
 evidenceRefs:string[];sourceRefs:string[];policyRefs:string[];meaningAxis:string;conflictGroup:string;duplicateGroup:string;priority:number;
 title:string;paragraphs:string[];proposal:string;assumesLifeStatus:false;status:'author-reviewed-pending-independent';
 editorial?:{question:string;refines:string;counter:string};incompatibleWith?:string[];
 variantOf:string|null;contribution:{group:string;delta:number};
}
export interface ScheduleRecord {id:string;version:string;context:ScheduleContext;requires:Condition;semanticId:string;text:string;checks:string[];policyRefs:string[];sourceRefs:string[];status:'author-reviewed-pending-independent'}
export interface Contribution {recordId:string;group:string;delta:number;facts:Facts}
export interface SelectionTrace {recordId:string;decision:'selected'|'skipped';reason:string;priority:number;specificity:number;facts:Facts}
export interface SectorJudgment {selectionTrace:SelectionTrace[];domain:Domain;score:number|null;band:string;records:SectorRecord[];facts:Facts;contributions:Contribution[];uncertainty:string[]}
