import {describe,expect,it} from 'vitest';
import {judgeSector,matches,sectorRecords} from '@/domain/foundation/engine';
import {domains} from '@/domain/foundation/types';

describe('일진과 월지의 충 원고',()=>{
 it('uses the two-paragraph evidence and action copy only when its verified condition applies',()=>{
  for(const domain of domains){
   const record=sectorRecords.find(r=>r.id===`sector:day:${domain}:month-clash`)!;
   const facts={'known.day':true,'target.monthClash':true};
   expect(matches(record.requires,facts)).toBe(true);
   expect(matches(record.requires,{...facts,'target.monthClash':false})).toBe(false);
   expect(matches(record.requires,{...facts,'target.monthClash':null})).toBe(false);
   expect(record.evidenceRefs).toContain('target.monthClash');
   expect(record.paragraphs).toHaveLength(2);
   expect(record.paragraphs[0]).toContain('충');
   expect(judgeSector(domain,'day',facts).records[0].id).toBe(record.id);
  }
 });
 it('claims a period-stem resource relation only when focus is resource',()=>{
  for(const domain of domains){
   const record=sectorRecords.find(r=>r.id===`sector:day:${domain}:resource`)!;
   expect(matches(record.requires,{'known.day':true,focus:'resource','group.resource':true})).toBe(true);
   expect(matches(record.requires,{'known.day':true,focus:'wealth','group.resource':true})).toBe(false);
   expect(matches(record.requires,{'known.day':true,focus:null,'group.resource':true})).toBe(false);
   expect(record.paragraphs).toHaveLength(2);
  }
 });
});
