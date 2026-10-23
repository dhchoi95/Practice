import { tenGod } from '../saju/tables';
import { hiddenStems } from '../advanced/mappings';
import type { SectorRecord,Test } from './types';
const allows=(test:Test,value:string)=>test.op==='eq'?test.value===value:test.op==='in'&&Array.isArray(test.value)&&test.value.includes(value);
/** Necessary constraints only. Passing this check is not a witness of actual selection. */
export function feasibilityErrors(r:SectorRecord):string[]{
 const errors:string[]=[],all=r.requires.all;
 const godTests=all.filter(t=>t.path==='period.god');
 const branchTests=all.filter(t=>t.path==='period.branchGod');
 const alias=r.unit==='year'?'context.yearGod':r.unit==='month'?'context.monthGod':null;
 const aliases=alias?all.filter(t=>t.path===alias):[];
 if(godTests.length||branchTests.length||aliases.length){
  let possible=false;
  for(let dm=0;dm<10;dm++)for(let stem=0;stem<10;stem++)for(let branch=stem%2;branch<12;branch+=2){
   const god=tenGod(dm,stem),branchGod=tenGod(dm,hiddenStems[branch][0]);
   if([...godTests,...aliases].every(t=>allows(t,god))&&branchTests.every(t=>allows(t,branchGod)))possible=true;
  }
  if(!possible)errors.push('기간 천간·지지 또는 같은 기간 층의 십신 조건이 함께 성립하지 않음');
 }
 const dayClash=all.some(t=>t.path==='target.dayClash'&&t.op==='eq'&&t.value===true);
 const dayHarmony=all.some(t=>t.path==='link.targetDay.harmony'&&t.op==='eq'&&t.value===true);
 if(dayClash||dayHarmony){
  const possibleGods=dayClash?['비견','식신','편재','편관','편인']:['겁재','상관','정재','정관','정인'];
  if(!possibleGods.some(g=>godTests.every(t=>allows(t,g))))errors.push('일지 충·육합과 기간 천간 십신의 음양 조건이 맞지 않음');
 }
 return errors;
}
