import type { SectorReading } from './engine';
import type { Domain } from './types';
/** Select a real owning segment before attaching supplements. Never mix incompatible segment contexts. */
export function presentSector(reading:SectorReading,domain:Domain){
 const usage=new Map<string,number>();for(const s of reading.segments)for(const r of s.sectors[domain].records)usage.set(r.id,(usage.get(r.id)??0)+s.end-s.start);
 const sorted=[...reading.sectors[domain].records].sort((a,b)=>(usage.get(b.id)??0)-(usage.get(a.id)??0)||b.priority-a.priority||a.id.localeCompare(b.id,'en'));
 const primary=sorted.find(r=>r.role==='core');
 const owner=primary?[...reading.segments].filter(s=>s.sectors[domain].records.some(r=>r.id===primary.id)).sort((a,b)=>(b.end-b.start)-(a.end-a.start)||a.start-b.start)[0]:undefined;
 const supplements=owner?.sectors[domain].records.filter(r=>r.role==='supplement')??[];
 const secondary=sorted.find(r=>r.role==='core'&&r.id!==primary?.id);
 const candidates=primary?[...primary.paragraphs.map(text=>({recordId:primary.id,text,role:'core'})),...supplements.flatMap(r=>r.paragraphs.map(text=>({recordId:r.id,text,role:'supplement'}))),...(secondary?[{recordId:secondary.id,text:'다른 구간에서는 · '+secondary.paragraphs[0],role:'other-segment'}]:[]),...(primary.proposal?[{recordId:primary.id,text:primary.proposal,role:'proposal'}]:[])]:[];
 const seen=new Set<string>(),suppressed:{recordId:string;reason:string}[]=[];
 const paragraphs=candidates.filter(p=>{const key=p.text.replace(/\s+/g,'');if(seen.has(key)){suppressed.push({recordId:p.recordId,reason:'같은 기본 본문의 동일 문장 생략'});return false;}seen.add(key);return true;});
 const visibleIds=new Set(paragraphs.map(p=>p.recordId));
 const trace=paragraphs.map(p=>({recordId:p.recordId,role:p.role,segments:reading.segments.flatMap((s,i)=>s.sectors[domain].records.some(r=>r.id===p.recordId)?[i]:[]),owner:p.role==='other-segment'?null:owner?[owner.start,owner.end]:null,reason:p.role==='supplement'?'대표 중심 원고와 같은 실제 구간에서 호환성을 통과한 보완':p.role==='other-segment'?'서로 다른 기간 구간의 중심 설명':'가장 오래 적용되는 중심 원고의 실제 문단'}));
 return {primary,supplement:supplements[0],supplements,secondary,paragraphs,trace,suppressed,owner:owner?[owner.start,owner.end]:null,additional:sorted.filter(r=>!visibleIds.has(r.id))};
}
