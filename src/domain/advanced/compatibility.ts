import {calculateAdvanced} from './chart';
import {findRelations} from './relations';
import {positions,positionNames} from './types';
import {stemElements,tenGod} from '../saju/tables';
import type {BirthInput} from '../saju/types';
/** Two independent charts. Names/sex/relationship status do not enter the comparison. */
export function compareBirths(a:BirthInput,b:BirthInput){
 const charts=[a,b].map(input=>calculateAdvanced(input,{...input.advanced??{timePolicy:'standard'},enabled:true}));
 const entries=charts.flatMap((chart,i)=>positions.flatMap(k=>chart.pillars[k]?[{position:`${i===0?'A':'B'} ${positionNames[k]}`,pillar:chart.pillars[k]!}]:[]));
 const relations=findRelations(entries,'pair').filter(r=>r.positions.some(p=>p.startsWith('A '))&&r.positions.some(p=>p.startsWith('B ')));
 const da=charts[0].pillars.day?.stem??null,db=charts[1].pillars.day?.stem??null;
 return {charts,relations,dayElements:[da===null?null:stemElements[da],db===null?null:stemElements[db]],aToB:da===null||db===null?null:tenGod(da,db),bToA:da===null||db===null?null:tenGod(db,da)};
}
