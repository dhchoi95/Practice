import { z } from 'zod';
import { detailFacts } from './detail-facts';
import raw from '@/content/foundation/sectors.json';
import schedulesRaw from '@/content/foundation/schedules.json';
import type { AdvancedChart,Facts } from '../advanced/types';
import { calculatePeriod,parseTarget,type ContextSegment } from '../advanced/period';
import { hiddenStems } from '../advanced/mappings';
import { tenGod } from '../saju/tables';
import type { PeriodKind } from '../fortune/period';
import { domains,FOUNDATION_VERSION,SECTOR_POLICY,type Test,type Condition,type SectorRecord,type ScheduleRecord,type Domain,type ScheduleContext,type SectorJudgment } from './types';
const testSchema=z.object({path:z.string().min(1),op:z.enum(['eq','gte','in']),value:z.union([z.string(),z.number(),z.boolean(),z.array(z.string())])});
const conditionSchema=z.object({all:z.array(testSchema).min(1),any:z.array(testSchema).min(1).optional()});
const recordSchema=z.object({id:z.string().min(1),version:z.enum(['2.1.0','2.2.0','2.2.1']),domain:z.enum(domains),unit:z.enum(['day','month','year']),role:z.enum(['core','supplement']),scenario:z.string(),semanticId:z.string(),requires:conditionSchema,premises:z.array(z.string()).min(1),exclusions:z.array(testSchema),neededInputs:z.array(z.string()).min(1),unknownHandling:z.string(),evidenceRefs:z.array(z.string()).min(1),sourceRefs:z.array(z.string()).min(1),policyRefs:z.array(z.string()).min(1),meaningAxis:z.string(),conflictGroup:z.string(),duplicateGroup:z.string(),priority:z.number(),title:z.string().min(1),paragraphs:z.array(z.string().min(1)).min(1),proposal:z.string(),assumesLifeStatus:z.literal(false),status:z.literal('author-reviewed-pending-independent'),editorial:z.object({question:z.string(),refines:z.string(),counter:z.string()}).optional(),incompatibleWith:z.array(z.string()).optional(),variantOf:z.string().nullable(),contribution:z.object({group:z.string(),delta:z.number().min(-10).max(10)})}).strict();
export const sectorRecords:SectorRecord[]=z.array(recordSchema).parse(raw);
const scheduleSchema=z.object({id:z.string(),version:z.enum(['2.1.0','2.2.0','2.2.1']),context:z.enum(['general','interview','exam','presentation','contract','meeting']),requires:conditionSchema,semanticId:z.string(),text:z.string().min(1),checks:z.array(z.string()).min(2).max(3),policyRefs:z.array(z.string()).min(1),sourceRefs:z.array(z.string()).min(1),status:z.literal('author-reviewed-pending-independent')}).strict();
export const scheduleRecords:ScheduleRecord[]=z.array(scheduleSchema).parse(schedulesRaw);
const buckets=new Map<string,SectorRecord[]>();
for(const r of sectorRecords){const key=`${r.unit}:${r.domain}`;buckets.set(key,[...(buckets.get(key)??[]),r]);}
export function matchesTest(test:Test,facts:Facts){const v=facts[test.path];if(v===null||v===undefined)return false;return test.op==='eq'?v===test.value:test.op==='gte'?typeof v==='number'&&typeof test.value==='number'&&v>=test.value:Array.isArray(test.value)&&typeof v==='string'&&test.value.includes(v);}
export function matches(condition:Condition,facts:Facts){return condition.all.every(t=>matchesTest(t,facts))&&(!condition.any||condition.any.some(t=>matchesTest(t,facts)));}
export const roundIndex=(value:number)=>Math.max(0,Math.min(100,Math.round(value/5)*5));
export const scoreBand=(score:number|null)=>score===null?'산출 보류':score>=70?'활용할 요소가 많아요':score>=55?'활용과 조율을 함께 봐요':score>=40?'준비와 조율부터 살펴요':'범위를 줄여 살펴요';
function group(g:unknown){return g==='비견'||g==='겁재'?'peer':g==='식신'||g==='상관'?'output':g==='정재'||g==='편재'?'wealth':g==='정관'||g==='편관'?'order':g==='정인'||g==='편인'?'resource':null;}
export function sectorFacts(chart:AdvancedChart,segment:ContextSegment):Facts {
 const dm=chart.pillars.day?.stem,focus=group(segment.facts['period.god']),branch=group(segment.facts['period.branchGod']);
 // Only target ↔ natal relations inform these flags; a clash between two period layers is not a natal clash.
 const targetPosition=segment.facts['period.kind']==='day'?'일진':segment.facts['period.kind']==='month'?'월운':'세운';
 const targetRelations=segment.relations.filter(r=>r.positions.includes(targetPosition)&&r.positions.some(p=>p.startsWith('원국')));
 const targetDayClash=targetRelations.some(r=>r.kind==='충'&&r.positions.includes('원국 일주'));
 const targetMonthClash=targetRelations.some(r=>r.kind==='충'&&r.positions.includes('원국 월주'));
 const strength=chart.facts.strength;
 const natalGod=(key:'month'|'day')=>dm===undefined||!chart.pillars[key]?null:tenGod(dm,hiddenStems[chart.pillars[key]!.branch][0]);
 return {...segment.facts,...detailFacts(chart,segment),'known.day':dm!==undefined,focus,'group.peer':focus==='peer'||branch==='peer','group.output':focus==='output'||branch==='output','group.wealth':focus==='wealth'||branch==='wealth','group.order':focus==='order'||branch==='order','group.resource':focus==='resource'||branch==='resource',
 'target.dayClash':chart.pillars.day?targetDayClash:null,'target.monthClash':chart.pillars.month?targetMonthClash:null,'target.anyClash':targetRelations.some(r=>r.kind==='충')?true:chart.facts['known.complete']?false:null,'target.harmony':targetRelations.some(r=>r.kind==='육합')?true:chart.facts['known.complete']?false:null,
 'strength.class':strength==='weak'?'weak':strength==='strong'?'strong':null,
 'same.month':dm===undefined||!chart.pillars.month?null:segment.facts['period.god']===natalGod('month'),'same.day':dm===undefined?null:segment.facts['period.god']===natalGod('day'),
 'same.luck':dm===undefined||segment.facts['luck.god']==null?null:segment.facts['luck.god']===segment.facts['period.god'],
 'different.yearMonth':dm!==undefined&&segment.facts['context.yearGod']!==segment.facts['context.monthGod']};
}
export function selectSectorRecords(records:SectorRecord[],facts:Facts){
 const specificity=(r:SectorRecord)=>r.requires.all.filter(t=>t.path!=='known.day').length+(r.requires.any?.filter(t=>matchesTest(t,facts)).length??0)+r.exclusions.length;
 const sorted=[...records].sort((a,b)=>(a.role===b.role?0:a.role==='core'?-1:1)||b.priority-a.priority||specificity(b)-specificity(a)||a.id.localeCompare(b.id,'en'));
 const selected:SectorRecord[]=[],trace:SectorJudgment['selectionTrace']=[];
 for(const r of sorted){let reason='';
  if(!matches(r.requires,facts))reason='필수 전제 미충족 또는 미확정';
  else if(r.exclusions.some(t=>matchesTest(t,facts)))reason='제외 조건 확인';
  else if(r.role==='core'&&selected.some(s=>s.role==='core'))reason='우선하는 중심 원고 있음';
  else if(r.role==='supplement'&&!selected.some(s=>s.role==='core'))reason='연결할 중심 원고 없음';
  else if(selected.some(s=>s.conflictGroup===r.conflictGroup))reason='같은 시점의 상충군 대안';
  else if(selected.some(s=>s.duplicateGroup===r.duplicateGroup))reason='같은 설명의 중복군';
  else if(selected.some(s=>s.meaningAxis===r.meaningAxis))reason='같은 의미 축 설명 중복';
  else if(selected.some(s=>s.incompatibleWith?.includes(r.semanticId)||r.incompatibleWith?.includes(s.semanticId)))reason='명시한 양립 불가 원고';
  else if(selected.some(s=>s.paragraphs.some(p=>r.paragraphs.includes(p))))reason='동일 본문 문단 중복';
  else if(r.role==='supplement'&&selected.filter(s=>s.role==='supplement').length>=2)reason='보완 표시 범위 초과';
  if(!reason)selected.push(r);
  trace.push({recordId:r.id,decision:reason?'skipped':'selected',reason:reason||'분야 우선순위·전제 구체성과 호환성을 확인',priority:r.priority,specificity:specificity(r),facts:Object.fromEntries([...r.requires.all,...r.requires.any??[],...r.exclusions].map(t=>[t.path,facts[t.path]??null]))});
 }
 return {selected,trace};
}
export function judgeSector(domain:Domain,unit:PeriodKind,facts:Facts):SectorJudgment {
 if(!facts['known.day'])return {domain,score:null,band:scoreBand(null),records:[],facts,contributions:[],selectionTrace:[],uncertainty:['출생 일간이 미확정이라 지수와 개인 본문을 정하지 않았어요.']};
 const selection=selectSectorRecords(buckets.get(`${unit}:${domain}`)??[],facts),records=selection.selected;
 if(!records.some(r=>r.role==='core'))throw new Error(`분야 중심 원고 누락: ${domain}/${unit}`);
 const seen=new Set<string>();const contributions=records.flatMap(r=>{if(seen.has(r.contribution.group))return [];seen.add(r.contribution.group);return [{recordId:r.id,...r.contribution,facts}];});
 const delta=Math.max(-25,Math.min(25,contributions.reduce((sum,c)=>sum+c.delta,0))),score=roundIndex(50+delta);
 return {domain,score,band:scoreBand(score),records,facts,contributions,selectionTrace:selection.trace,uncertainty:facts['known.hour']?[]:['시주는 제외하고 확인된 기둥만 반영했어요.']};
}
export interface SectorSegment {start:number;end:number;context:ContextSegment;sectors:Record<Domain,SectorJudgment>}
export interface SectorReading {kind:PeriodKind;target:string;label:string;start:number;end:number;segments:SectorSegment[];sectors:Record<Domain,{score:number|null;band:string;records:SectorRecord[];uncertainty:string[]}>;policy:string;contentVersion:string}
export function buildSectorReading(chart:AdvancedChart,kind:PeriodKind,target:string):SectorReading{
 const date=parseTarget(target),base=calculatePeriod(chart,kind,target);
 // Annual calculation visits every actual monthly boundary and luck transition, rather than selecting a representative day.
 const rawContexts=kind==='year'?Array.from({length:12},(_,m)=>calculatePeriod(chart,'month',`${date.year}-${String(m+1).padStart(2,'0')}-01`).segments).flat().map(s=>({...s,facts:{...s.facts,'period.kind':'year','period.stem':s.pillars.year.stem,'period.branch':s.pillars.year.branch,'period.god':chart.pillars.day?tenGod(chart.pillars.day.stem,s.pillars.year.stem):null,'period.branchGod':chart.pillars.day?tenGod(chart.pillars.day.stem,hiddenStems[s.pillars.year.branch][0]):null}})):base.segments;
 const contexts:ContextSegment[]=[];
 for(const s of rawContexts){const previous=contexts.at(-1);if(previous&&previous.end===s.start&&JSON.stringify(previous.facts)===JSON.stringify(s.facts)&&JSON.stringify(previous.luck)===JSON.stringify(s.luck)&&JSON.stringify(previous.relations)===JSON.stringify(s.relations))previous.end=s.end;else contexts.push({...s,selection:{applied:[],trace:[],skipped:[]}});}
 const segments:SectorSegment[]=contexts.map(context=>{
  const facts=sectorFacts(chart,context),sectors=Object.fromEntries(domains.map(d=>[d,judgeSector(d,kind,facts)])) as Record<Domain,SectorJudgment>;
  const others=domains.filter(d=>d!=='overall').map(d=>sectors[d].score);
  sectors.overall.score=others.every(v=>v!==null)?roundIndex((others as number[]).reduce((a,b)=>a+b,0)/5):null;sectors.overall.band=scoreBand(sectors.overall.score);
  return {start:context.start,end:context.end,context,sectors};
 });
 const sectors=Object.fromEntries(domains.map(domain=>{
  const missing=segments.some(s=>s.sectors[domain].score===null);
  const score=missing?null:roundIndex(segments.reduce((sum,s)=>sum+s.sectors[domain].score!*(s.end-s.start),0)/(base.end-base.start));
  // Identical paragraphs are printed once and their full coverage is retained in segment traces.
  const records=[...new Map(segments.flatMap(s=>s.sectors[domain].records).map(r=>[r.id,r])).values()];
  return [domain,{score,band:scoreBand(score),records,uncertainty:[...new Set(segments.flatMap(s=>s.sectors[domain].uncertainty))]}];
 })) as SectorReading['sectors'];
 // The public total is the same rounded equal-weight mean of the five displayed aggregate indices.
 const values=domains.filter(d=>d!=='overall').map(d=>sectors[d].score);
 sectors.overall.score=values.every(v=>v!==null)?roundIndex((values as number[]).reduce((a,b)=>a+b,0)/5):null;sectors.overall.band=scoreBand(sectors.overall.score);
 return {kind,target:base.target,label:base.label,start:base.start,end:base.end,segments,sectors,policy:SECTOR_POLICY,contentVersion:FOUNDATION_VERSION};
}
export function scheduleFor(reading:SectorReading,context:ScheduleContext){
 if(!reading.segments[0].sectors.overall.facts['known.day'])return null;
 // Longest actual segment owns the day-level note; no changes to scores or basic copy.
 const dominant=[...reading.segments].sort((a,b)=>(b.end-b.start)-(a.end-a.start))[0];
 return scheduleRecords.find(r=>r.context===context&&matches(r.requires,dominant.sectors.overall.facts))??null;
}
export function shiftDate(date:string,days:number){parseTarget(date);return new Date(Date.parse(date+'T12:00:00Z')+days*86400000).toISOString().slice(0,10);}
