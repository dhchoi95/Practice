import type { AdvancedChart,Facts } from '../advanced/types';
import type { ContextSegment } from '../advanced/period';
import { hiddenStems } from '../advanced/mappings';
import { positions } from '../advanced/types';
import { tenGod,tenGodNames } from '../saju/tables';
export const detailFactPaths=['natal.monthMainGod','natal.dayMainGod','natal.monthStemGod','natal.hourStemGod','natal.monthExposed','link.targetDay.harmony','link.targetMonth.harmony','link.targetHour.clash','link.luckTarget.clash','link.luckTarget.harmony',...tenGodNames.map(g=>`natal.visible.${g}`)] as const;
/** Presence can be known from partial pillars; absence of a whole-chart exposure requires all pillars. */
export function detailFacts(chart:AdvancedChart,s:ContextSegment):Facts{
 const dm=chart.pillars.day?.stem,target=s.facts['period.kind']==='day'?'일진':s.facts['period.kind']==='month'?'월운':'세운',out:Facts={};
 for(const key of ['month','day'] as const){const p=chart.pillars[key];out[`natal.${key}MainGod`]=p&&dm!==undefined?tenGod(dm,hiddenStems[p.branch][0]):null;}
 for(const key of ['month','hour'] as const){const p=chart.pillars[key];out[`natal.${key}StemGod`]=p&&dm!==undefined?tenGod(dm,p.stem):null;}
 const exposed=chart.pillars.month&&positions.some(k=>k!=='day'&&chart.pillars[k]?.stem===hiddenStems[chart.pillars.month!.branch][0]);
 out['natal.monthExposed']=!chart.pillars.month||dm===undefined?null:exposed?true:chart.facts['known.complete']?false:null;
 for(const g of tenGodNames){const count=dm===undefined?null:Number(chart.facts[`visible.${g}`]);out[`natal.visible.${g}`]=count===null?null:count>0||chart.facts['known.complete']?count:null;}
 const relation=(kind:string,position:string,known:boolean)=>!known?null:s.relations.some(r=>r.kind===kind&&r.positions.includes(target)&&r.positions.includes(position));
 out['link.targetDay.harmony']=relation('육합','원국 일주',!!chart.pillars.day);
 out['link.targetMonth.harmony']=relation('육합','원국 월주',!!chart.pillars.month);
 out['link.targetHour.clash']=relation('충','원국 시주',!!chart.pillars.hour);
 const active=s.facts['luck.god']!=null;
 out['link.luckTarget.clash']=relation('충','대운',active);out['link.luckTarget.harmony']=relation('육합','대운',active);
 return out;
}
