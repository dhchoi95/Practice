import { calculateAdvanced } from '../advanced/chart';
import { elements,stemElements,branchElements,relationGroup } from '../saju/tables';
import type { BirthInput,Features,SajuCalculationResult,Pillar } from '../saju/types';
/** Topic text uses the same selected pillars as its natal table, retaining the existing simple-count policy. */
export function topicBasis(input:BirthInput,compatibility:SajuCalculationResult){
 const chart=calculateAdvanced(input,{...(input.advanced??{timePolicy:'standard'}),enabled:true});
 const known=Object.values(chart.pillars).filter((p):p is Pillar=>p!==null),day=chart.pillars.day;
 const features:Features={
  'natal.dayStem':day?.stem??null,'natal.dayElement':day?stemElements[day.stem]:null,
  'natal.knownCount':known.length*2,'natal.hourKnown':chart.pillars.hour!==null,
  'natal.boundary':!chart.pillars.year||!chart.pillars.month||!day,'natal.dstAdjusted':compatibility.normalizedInput.dstAdjusted,
 };
 for(const e of elements)features[`elements.${e}`]=known.reduce((n,p)=>n+Number(stemElements[p.stem]===e)+Number(branchElements[p.branch]===e),0);
 for(const group of ['peer','output','wealth','order','resource'] as const)features[`relations.${group}`]=day?known.filter(p=>p!==day&&relationGroup(day.stem,p.stem)===group).length:null;
 return {chart,features};
}
