import { solarTerms } from '../calendar/terms';
import { pillarsAt } from '../saju/calculate';
import { standardParts } from '../calendar/timezone';
import { tenGod } from '../saju/tables';
import { isoDate } from '../calendar/korean';
import type { PeriodKind } from '../fortune/period';
import type { AdvancedChart,Facts,Relation } from './types';
import { positions,positionNames,ADVANCED_CONTENT } from './types';
import { activeLuck } from './luck';
import { findRelations,type PlacedPillar } from './relations';
import { hiddenStems,pillarLabel } from './mappings';
import { periodModules } from '@/content/advanced/period';
import { selectManuscripts,type Manuscript } from './modules';
export interface ContextSegment {start:number;end:number;pillars:ReturnType<typeof pillarsAt>;luck:{direction:string;pillarLabel:string;start:number;end:number}[];facts:Facts;relations:Relation[];selection:ReturnType<typeof selectManuscripts>}
export interface DisplayTrace {ruleId:string;paragraphIndexes:number[];proposalIds:string[];claimIds:string[];reference:{segment:number;ruleId:string;period?:string}|null}
export type DisplayOwners=Map<string,{period:string;segment:number}>;
export function tracePeriodDisplay(segments:ContextSegment[],seen:DisplayOwners=new Map(),period='selected'){
 return segments.map((s,i)=>s.selection.applied.map(r=>{
  const owner=seen.get(r.id);if(owner===undefined)seen.set(r.id,{period,segment:i});
  return {ruleId:r.id,paragraphIndexes:owner===undefined?[0]:[],proposalIds:owner===undefined&&r.proposal?[`${r.id}:proposal`]:[],claimIds:[r.claim.id],reference:owner===undefined?null:{segment:owner.segment,ruleId:r.id,...(owner.period!==period?{period:owner.period}:{})}};
 }));
}
export interface AdvancedPeriod {display:DisplayTrace[][];kind:PeriodKind;target:string;label:string;start:number;end:number;segments:ContextSegment[];contentVersion:string;policy:string}
export function parseTarget(date:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error('조회 날짜를 다시 선택해 주세요.');
 const [year,month,day]=date.split('-').map(Number),d=new Date(Date.UTC(year,month-1,day));
 if(d.getUTCFullYear()!==year||d.getUTCMonth()+1!==month||d.getUTCDate()!==day||year<1962||year>2050)throw new Error('기간 조회는 1962~2050년의 실제 날짜만 지원해요.');
 return {year,month,day};
}
export function calculatePeriod(chart:AdvancedChart,kind:PeriodKind,target:string,records:Manuscript[]=periodModules):AdvancedPeriod {
 const {year,month,day}=parseTarget(target);
 const start=Date.UTC(year,kind==='year'?0:month-1,kind==='day'?day:1,-9),end=kind==='year'?Date.UTC(year+1,0,1,-9):kind==='month'?Date.UTC(year,month,1,-9):start+86400000;
 const termBoundaries=solarTerms(year).filter(t=>t.instant>start&&t.instant<end&&(kind==='year'?t.name==='입춘':true)).map(t=>t.instant);
 const luckBoundaries=chart.luck.flatMap(l=>l.cycles.flatMap(c=>[c.start,c.end])).filter(ms=>ms>start&&ms<end);
 const points=[start,...new Set([...termBoundaries,...luckBoundaries]),end].sort((a,b)=>a-b);
 const natal:PlacedPillar[]=positions.flatMap(k=>chart.pillars[k]?[{position:`원국 ${positionNames[k]}`,pillar:chart.pillars[k]!}]:[]);
 const dm=chart.pillars.day?.stem??null;
 const segments=points.slice(0,-1).map((s,i)=>{
  const pillars=pillarsAt(s),targetPillar=pillars[kind];
  const facts:Facts={...chart.facts,'period.kind':kind,'period.stem':targetPillar.stem,'period.branch':targetPillar.branch,'period.god':dm===null?null:tenGod(dm,targetPillar.stem),'period.branchGod':dm===null?null:tenGod(dm,hiddenStems[targetPillar.branch][0]),'context.yearGod':dm===null?null:tenGod(dm,pillars.year.stem),'context.monthGod':dm===null?null:tenGod(dm,pillars.month.stem)};
  const luck=chart.luck.map(l=>({l,c:activeLuck(l,s)}));
  facts['luck.god']=luck.length===1&&luck[0].c&&dm!==null?tenGod(dm,luck[0].c.pillar.stem):null;
  const contexts:PlacedPillar[]=[{position:'세운',pillar:pillars.year},...(kind!=='year'?[{position:'월운',pillar:pillars.month}]:[]),...(kind==='day'?[{position:'일진',pillar:pillars.day}]:[])];
  // Common context only when direction is selected. Candidates never get merged as one chart.
  if(luck.length===1&&luck[0].c)contexts.push({position:'대운',pillar:luck[0].c.pillar});
  const relations=findRelations([...natal,...contexts],'원국·기간',pillars.month.branch).filter(r=>r.positions.some(p=>!p.startsWith('원국')));
  for(const r of relations.filter(r=>r.positions.some(p=>p.startsWith('원국'))))facts[`cross.${r.kind}`]=Number(facts[`cross.${r.kind}`]??0)+1;
  for(const kind of ['충','육합','해','파','형','자형','삼합','방합','천간합'])if(facts[`cross.${kind}`]===undefined)facts[`cross.${kind}`]=chart.pillars.hour?0:null;
  const selection=selectManuscripts(records,facts,kind);
  return {start:s,end:points[i+1],pillars,luck:luck.map(({l,c})=>({direction:l.direction,pillarLabel:c?pillarLabel(c.pillar):s<l.start?'개시 전':'제공한 10개 대운 구간 밖',start:c?.start??l.start,end:c?.end??l.start})),facts,relations,selection};
 });
 return {display:tracePeriodDisplay(segments),kind,target:kind==='year'?`${year}`:kind==='month'?`${year}-${String(month).padStart(2,'0')}`:target,label:kind==='year'?`${year}년`:kind==='month'?`${year}년 ${month}월`:`${year}년 ${month}월 ${day}일`,start,end,segments,contentVersion:ADVANCED_CONTENT,policy:'KST-CIVIL-RANGE-ACTUAL-TERM-LUCK-1.0'};
}
export function fiveYears(chart:AdvancedChart,year:number){if(year<1962||year>2046)throw new Error('5년 세운의 시작 연도는 1962~2046년이에요.');return Array.from({length:5},(_,i)=>calculatePeriod(chart,'year',`${year+i}-07-01`));}
export function segmentLabel(segment:{start:number;end:number}){const fmt=(ms:number)=>{const p=standardParts(ms);return `${isoDate(p)} ${String(p.hour).padStart(2,'0')}:${String(p.minute).padStart(2,'0')}`;};return `${fmt(segment.start)}부터 ${fmt(segment.end)} 전까지`;}

/** Topic menus keep only the paragraphs they actually display and retain skipped ownership. */
export function scopePeriod(period:AdvancedPeriod,category:string):AdvancedPeriod{
 const roles=category==='love'||category==='single'?['flow','natal-link','branch','year-background','month-background','luck-background','relationship','practice']:category==='career-money'?['flow','natal-link','branch','year-background','month-background','luck-background','work','resource','practice']:null;
 if(!roles)return period;
 const segments=period.segments.map(s=>{const applied=s.selection.applied.filter(r=>roles.includes(r.role)),ids=new Set(applied.map(r=>r.id));return {...s,selection:{applied,trace:s.selection.trace.filter(t=>ids.has(t.ruleId)),skipped:[...s.selection.skipped,...s.selection.applied.filter(r=>!ids.has(r.id)).map(r=>({id:r.id,reason:'메뉴 주제 범위'}))]}};});
 return {...period,segments,display:tracePeriodDisplay(segments)};
}
