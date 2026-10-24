import type { Facts } from './types';
export interface Premise {feature:string;op:'eq'|'gte';value:string|number|boolean}
export interface Manuscript {rankingFeature?:string;id:string;topic:string;units:('natal'|'year'|'month'|'day')[];role:string;requires:string[];premises:Premise[];exclusions:Premise[];priority:number;specificity:number;exclusiveGroup:string;semanticAxis:string;stance:string;title:string;text:string;proposal:string;claim:{id:string;strength:'candidate'|'editorial';text:string;sourceIds:string[];forbiddenExtension:string};version:string;updatedAt:string;status:'implementation-edited-pending-independent-review';authoringIntent:string}
export function manuscript(id:string,role:string,title:string,text:string,proposal:string,premises:Premise[],units:Manuscript['units'],priority=10):Manuscript {
 return {id,topic:role,units,role,requires:[...new Set(premises.map(p=>p.feature))],premises,exclusions:[],priority,specificity:premises.length,exclusiveGroup:role,semanticAxis:role,stance:'context-dependent',title,text,proposal,claim:{id:`${id}:interpretation`,strength:'candidate',text,sourceIds:['service-season-root-1.0'],forbiddenExtension:'실제 사건·수익·혼인·성격 확정으로 확대하지 않음'},version:'2.3.0',updatedAt:'2026-10-24',status:'implementation-edited-pending-independent-review',authoringIntent:`새로 집필한 ${role} 원고예요. 적용 전제는 ${premises.map(p=>`${p.feature} ${p.op} ${p.value}`).join(' / ')}이며, 독립 편집 승인이나 이전 원고의 교정 이력을 대신하지 않아요.`};
}
export function premiseMatches(p:Premise,f:Facts){const v=f[p.feature];return v!==undefined&&v!==null&&(p.op==='eq'?v===p.value:typeof v==='number'&&typeof p.value==='number'&&v>=p.value);}
export function validateManuscripts(records:Manuscript[]){
 const ids=new Set<string>();
 for(const r of records){
  if(ids.has(r.id))throw new Error(`중복 원고 ${r.id}`);ids.add(r.id);
  if(!r.text||!r.title||r.claim.text!==r.text||r.claim.id!==`${r.id}:interpretation`||!r.claim.sourceIds.length||!r.claim.forbiddenExtension)throw new Error(`원고·주장 연결 ${r.id}`);
  if(r.requires.length!==new Set(r.requires).size||r.premises.some(p=>!r.requires.includes(p.feature))||r.requires.some(k=>!r.premises.some(p=>p.feature===k)))throw new Error(`전제 누락 ${r.id}`);
  if(r.rankingFeature&&!r.requires.includes(r.rankingFeature))throw new Error(`선정 근거 누락 ${r.id}`);
  if(!r.premises.length||r.premises.some(p=>p.op==='gte'&&typeof p.value!=='number'))throw new Error(`전제 기준값 ${r.id}`);
 }
 return records;
}
export function selectManuscripts(records:Manuscript[],facts:Facts,unit:Manuscript['units'][number]){
 const axes=new Map<string,string>();
 const groups=new Set<string>(),paragraphs=new Set<string>(),applied:Manuscript[]=[],skipped:{id:string;reason:string}[]=[];
 const rank=(r:Manuscript)=>r.rankingFeature?Number(facts[r.rankingFeature]??0):0;
 const sorted=[...records].sort((a,b)=>b.priority-a.priority||b.specificity-a.specificity||a.exclusiveGroup.localeCompare(b.exclusiveGroup,'en')||rank(b)-rank(a)||a.id.localeCompare(b.id,'en'));
 for(const r of sorted){
  const reason=!r.units.includes(unit)?'기간 범위':r.requires.some(k=>facts[k]===null||facts[k]===undefined)?'미확정 전제':!r.premises.every(p=>premiseMatches(p,facts))?'조건 불일치':r.exclusions.some(p=>premiseMatches(p,facts))?'제외 조건':groups.has(r.exclusiveGroup)?'같은 역할 우선 원고':axes.has(r.semanticAxis)&&axes.get(r.semanticAxis)!==r.stance?'의미 충돌':paragraphs.has(r.text)?'동일 문단':'';
  if(reason){skipped.push({id:r.id,reason});continue;}
  applied.push(r);groups.add(r.exclusiveGroup);axes.set(r.semanticAxis,r.stance);paragraphs.add(r.text);
 }
 const roleOrder=['overview','strength','pattern','climate','career','money','love','relationships','god-caution','flow','natal-link','branch','year-background','month-background','luck-background','work','relationship','resource','practice'];
 applied.sort((a,b)=>roleOrder.indexOf(a.role)-roleOrder.indexOf(b.role)||a.id.localeCompare(b.id,'en'));
 return {applied,skipped,trace:applied.map(r=>({ruleId:r.id,version:r.version,claimIds:[r.claim.id],paragraphIndexes:[0],proposalIds:r.proposal?[`${r.id}:proposal`]:[],ranking:r.rankingFeature?{feature:r.rankingFeature,actual:facts[r.rankingFeature]}:null,premises:r.premises.map(p=>({...p,actual:facts[p.feature]}))}))};
}
