import type { SectorReading } from './engine';
import type { Domain } from './types';
/** The same presentation plan is exported as evidence and rendered by the browser. */
export function presentSector(reading:SectorReading,domain:Domain){
 const usage=new Map<string,number>();for(const s of reading.segments)for(const r of s.sectors[domain].records)usage.set(r.id,(usage.get(r.id)??0)+s.end-s.start);
 const sorted=[...reading.sectors[domain].records].sort((a,b)=>(usage.get(b.id)??0)-(usage.get(a.id)??0)||b.priority-a.priority||a.id.localeCompare(b.id,'en'));
 const primary=sorted.find(r=>r.role==='core'),supplement=sorted.find(r=>r.role==='supplement'),secondary=sorted.find(r=>r.role==='core'&&r.id!==primary?.id);
 const paragraphs=primary?[...primary.paragraphs.map(text=>({recordId:primary.id,text,role:'core'})),...(supplement?[{recordId:supplement.id,text:supplement.paragraphs[0],role:'supplement'}]:[]),...(secondary?[{recordId:secondary.id,text:'다른 구간에서는 · '+secondary.paragraphs[0],role:'other-segment'}]:[]),{recordId:primary.id,text:primary.proposal,role:'proposal'}]:[];
 const visibleIds=new Set(paragraphs.map(p=>p.recordId));return {primary,supplement,secondary,paragraphs,additional:sorted.filter(r=>!visibleIds.has(r.id))};
}
