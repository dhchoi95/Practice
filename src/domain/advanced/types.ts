import type { BirthInput, Pillar, SajuCalculationResult } from '../saju/types';
export type TimePolicy='standard'|'mean-solar'|'true-solar';
export interface AdvancedOptions {enabled:boolean;cityId?:string;timePolicy:TimePolicy;luckClass?:'male'|'female'}
export type Position='year'|'month'|'day'|'hour';
export const positions:Position[]=['year','month','day','hour'];
export const positionNames:Record<Position,string>={year:'연주',month:'월주',day:'일주',hour:'시주'};
export type FactValue=string|number|boolean|null;
export type Facts=Record<string,FactValue>;
export interface Evidence {id:string;kind:'calculation'|'method';text:string;positions:string[]}
export interface Relation {id:string;kind:string;layer:string;positions:string[];branches:number[];element?:string;level:'presence'|'candidate'|'supported';reasons:string[];counter:string[];transformation:false}
export interface Judgment {label:string;reasons:string[];counter:string[];uncertainty:string[];score:number|null;method:string}
export interface LuckCycle {index:number;pillar:Pillar;start:number;end:number}
export interface Luck {direction:'forward'|'reverse';term:{name:string;instant:number};gapMilliseconds:number;conversion:{years:number;months:number;days:number;remainderMilliseconds:number};start:number;cycles:LuckCycle[];method:string}
export interface AdvancedChart {input:BirthInput;options:AdvancedOptions;compatibility:SajuCalculationResult;pillars:SajuCalculationResult['pillars'];instant:number|null;time:{requested:TimePolicy;effective:TimePolicy;longitudeMinutes:number|null;equationMinutes:number|null;standard:string|null;final:string|null;dateChanged:boolean;boundary:boolean};facts:Facts;evidence:Evidence[];relations:Relation[];strength:Judgment;pattern:Judgment;useful:{support:Judgment;climate:Judgment;favorableElements:string[]};luck:Luck[];limitations:string[];policyVersion:string;interpretationVersion:string}
export const ADVANCED_CALCULATION='KR-SOLAR-MIDNIGHT-1.0';
export const ADVANCED_METHOD='SEASON-ROOT-CANDIDATES-1.0';
export const ADVANCED_CONTENT='2.0.0';
