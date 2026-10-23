import { describe,it,expect } from 'vitest';
import { sectorRecords,selectSectorRecords,buildSectorReading } from '../../src/domain/foundation/engine';
import { feasibilityErrors } from '../../src/domain/foundation/feasibility';
import { presentSector } from '../../src/domain/foundation/presentation';
import { calculateAdvanced } from '../../src/domain/advanced/chart';
import { detailFacts } from '../../src/domain/foundation/detail-facts';
import { calculatePeriod } from '../../src/domain/advanced/period';
import type { SectorRecord } from '../../src/domain/foundation/types';
const base=sectorRecords[0];
const record=(id:string,patch:Partial<SectorRecord>={}):SectorRecord=>({...base,id,semanticId:id,meaningAxis:id,duplicateGroup:id,conflictGroup:id,paragraphs:[id],requires:{all:[{path:'known.day',op:'eq',value:true}]},exclusions:[],priority:100,...patch});
const core=record('core');
const supp=(patch:Partial<SectorRecord>={})=>record('supp',{role:'supplement',...patch});
describe('iteration selection and actual-context presentation',()=>{
 for(const field of ['meaningAxis','conflictGroup','duplicateGroup'] as const)it(`enforces ${field} independently of scoring groups`,()=>{
  const r=selectSectorRecords([core,supp({[field]:core[field],contribution:{group:'different-score-group',delta:5}})],{'known.day':true});expect(r.selected.map(r=>r.id)).toEqual(['core']);expect(r.trace.find(t=>t.recordId==='supp')!.decision).toBe('skipped');
 });
 it('enforces exclusions, explicit incompatibility and exact repeated paragraphs',()=>{
  for(const patch of [{exclusions:[{path:'known.day',op:'eq' as const,value:true}]},{incompatibleWith:['core']},{paragraphs:core.paragraphs}])expect(selectSectorRecords([core,supp(patch)],{'known.day':true}).selected).toHaveLength(1);
 });
 it('uses specificity on equal priority and stable IDs only as a final tie-break',()=>{
  const narrow=record('z',{requires:{all:[...core.requires.all,{path:'detail',op:'eq',value:true}]}});
  expect(selectSectorRecords([core,narrow],{'known.day':true,detail:true}).selected[0].id).toBe('z');expect(selectSectorRecords([narrow,core],{'known.day':true,detail:null}).selected[0].id).toBe('core');
 });
 it('rejects impossible parity and period-layer aliases, but accepts every current record',()=>{
  const tests=[{path:'period.god',op:'eq' as const,value:'정인'},{path:'target.dayClash',op:'eq' as const,value:true}];expect(feasibilityErrors(record('bad',{requires:{all:tests}}))).not.toHaveLength(0);
  expect(feasibilityErrors(record('bad-month',{unit:'month',requires:{all:[tests[0],{path:'context.monthGod',op:'eq',value:'식신'}]}}))).not.toHaveLength(0);
  for(const r of sectorRecords)expect(feasibilityErrors(r),r.id).toEqual([]);
 });
 const chart=calculateAdvanced({year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''},{enabled:true,timePolicy:'standard',luckClass:'male'});
 it('takes primary supplements from one actual owning segment and exposes both when selected',()=>{
  let pair=false;
  for(const kind of ['day','month','year'] as const){const reading=buildSectorReading(chart,kind,'2026-10-23');for(const d of ['overall','study','money','health','love','business'] as const){const p=presentSector(reading,d);const owner=reading.segments.find(s=>s.start===p.owner?.[0]&&s.end===p.owner[1]);expect(p.supplements.map(r=>r.id)).toEqual(owner!.sectors[d].records.filter(r=>r.role==='supplement').map(r=>r.id));for(const r of p.supplements)expect(p.paragraphs.some(x=>x.recordId===r.id)).toBe(true);if(p.supplements.length===2)pair=true;}}
  expect(pair).toBe(true);
 });
 it('preserves unknown absence and does not invent a missing luck relationship',()=>{
  const c={...chart,pillars:{...chart.pillars,hour:null},facts:{...chart.facts,'known.complete':false}};const s=calculatePeriod(c,'day','2026-10-23').segments[0];s.facts={...s.facts,'luck.god':null};const f=detailFacts(c,s);expect(f['link.targetHour.clash']).toBeNull();expect(f['link.luckTarget.clash']).toBeNull();expect(f['link.luckTarget.harmony']).toBeNull();
 });
});
