import { calculateSaju } from '../saju/calculate';
import { possibleInstants,standardParts } from '../calendar/timezone';
import { isoDate } from '../calendar/korean';
import { solarTerms } from '../calendar/terms';
import { elements,stemElements,tenGod } from '../saju/tables';
import type { BirthInput } from '../saju/types';
import type { Clock } from '@/lib/clock';
import { cities } from '@/content/advanced/cities';
import { advancedPillarsAt,correction,timeText } from './time';
import { hiddenStems,hiddenFor,pillarLabel,stemLabel } from './mappings';
import { findRelations } from './relations';
import { calculateLuck } from './luck';
import { positions,positionNames,ADVANCED_CALCULATION,ADVANCED_METHOD,type AdvancedChart,type AdvancedOptions,type Judgment,type Facts } from './types';
const missing=(label:string,reason:string):Judgment=>({label,reasons:[],counter:[],uncertainty:[reason],score:null,method:ADVANCED_METHOD});
export function calculateAdvanced(value:BirthInput,options:AdvancedOptions=value.advanced??{enabled:true,timePolicy:'standard'},clock?:Clock):AdvancedChart{
 const {advanced:ignored,...base}=value;void ignored;
 const compatibility=calculateSaju(base,clock),n=compatibility.normalizedInput;
 if(!['standard','mean-solar','true-solar'].includes(options.timePolicy)||options.luckClass&&!['male','female'].includes(options.luckClass))throw new Error('계산 기준을 다시 선택해 주세요.');
 const city=cities.find(c=>c.id===options.cityId);
 if(options.cityId&&!city)throw new Error('목록에서 출생 도시를 다시 선택해 주세요.');
 const effective=options.timePolicy!=='standard'&&!city?'standard':options.timePolicy;
 const limitations=[...compatibility.limitations];
 if(effective!==options.timePolicy)limitations.push('출생 도시가 없어 태양시를 확정하지 않았어요. 지금은 표준시 결과이며, 도시를 선택하면 다시 계산해요.');
 if(city)limitations.push('도시 중심 좌표를 사용해요. 실제 출생지와 기록 시각의 오차에 따라 경계 판단이 달라질 수 있어요.');
 let pillars={...compatibility.pillars};
 if(n.instant!==null)pillars=advancedPillarsAt(n.instant,effective,city?.longitude);
 else if(effective!=='standard'){
  const samples:number[]=[];
  for(let minute=0;minute<1440;minute++)samples.push(...possibleInstants({...n.solar,hour:Math.floor(minute/60),minute:minute%60}));
  const lo=Math.min(...samples),hi=Math.max(...samples);
  for(const t of solarTerms(n.solar.year))if(t.instant>=lo&&t.instant<=hi)samples.push(t.instant-1,t.instant);
  const all=samples.map(ms=>advancedPillarsAt(ms,effective,city?.longitude));
  pillars={year:all[0].year,month:all[0].month,day:all[0].day,hour:null};
  for(const k of ['year','month','day'] as const)if(!all.every(p=>p[k].stem===pillars[k]?.stem&&p[k].branch===pillars[k]?.branch))pillars[k]=null;
 }
 const shift=n.instant===null?null:correction(n.instant,effective,city?.longitude);
 const final=n.instant===null?null:n.instant+shift!.total*60000;
 const boundary=n.instant!==null&&([-120000,120000].some(delta=>{
  const p=advancedPillarsAt(n.instant!+delta,effective,city?.longitude);
  return positions.some(k=>p[k].stem!==pillars[k]?.stem||p[k].branch!==pillars[k]?.branch);
 })||solarTerms(n.solar.year).some(t=>Math.abs(t.instant-n.instant!)<=90000));
 if(boundary)limitations.push('시주·날짜 또는 절입 경계 가까이에 있어요. 기록 시각과 계산 방식의 작은 차이도 비교해 주세요.');
 const dm=pillars.day?.stem??null,complete=positions.every(k=>pillars[k]!==null);
 const placed=positions.flatMap(k=>pillars[k]?[{position:positionNames[k],pillar:pillars[k]!}]:[]);
 const relations=findRelations(placed,'원국',pillars.month?.branch);
 const facts:Facts={'known.complete':complete,'known.day':dm!==null,'known.hour':pillars.hour!==null,'known.month':pillars.month!==null,'natal.dayStem':dm,'natal.element':dm===null?null:stemElements[dm],'time.policy':effective,'strength':null,'roots.count':null,'roots.main':null,'pattern.god':null,'pattern.exposed':null};
 const evidence:AdvancedChart['evidence']=placed.map(p=>({id:`pillar:${p.position}`,kind:'calculation',text:`${p.position} ${pillarLabel(p.pillar)}`,positions:[p.position]}));
 for(const e of elements)facts[`element.${e}`]=placed.reduce((c,p)=>c+Number(stemElements[p.pillar.stem]===e)+Number(stemElements[hiddenStems[p.pillar.branch][0]]===e),0);
 for(const g of ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인']){
  facts[`god.${g}`]=dm===null?null:placed.reduce((v,p)=>v+Number(p.position!=='일주'&&tenGod(dm,p.pillar.stem)===g)+hiddenStems[p.pillar.branch].filter(s=>tenGod(dm,s)===g).length,0);
  facts[`visible.${g}`]=dm===null?null:placed.filter(p=>p.position!=='일주'&&tenGod(dm,p.pillar.stem)===g).length;
 }
 let strength=missing('강약 미확정','일간·월지·시주가 모두 있어야 이 방식의 전체 강약 후보를 계산해요.');
 let pattern=missing('격국 미확정','일간·월지·시주가 확정되지 않아 격국 후보를 정하지 않았어요.');
 let favorableElements:string[]=[];
 let support=missing('억부 후보 미확정','강약의 전체 근거가 부족해 한 오행을 우선하지 않았어요.');
 let climate=missing('조후 후보 미확정','월지·일간이 있어야 계절에 관한 후보를 읽을 수 있어요.');
 if(dm!==null){
  const roots=placed.flatMap(p=>hiddenFor(p.pillar.branch,dm).filter(h=>h.element===stemElements[dm]).map(h=>({position:p.position,...h})));
  facts['roots.count']=roots.length;
  for(const source of placed)for(const h of hiddenFor(source.pillar.branch,dm)){const targets=placed.filter(q=>q.position!==source.position&&q.pillar.stem===h.stem);if(targets.length)evidence.push({id:`exposed:${source.position}:${h.stem}`,kind:'calculation',text:`${source.position} 지장간 ${stemLabel(h.stem)}이 ${targets.map(q=>q.position).join('·')} 천간에 드러나요.`,positions:[source.position,...targets.map(q=>q.position)]});}facts['roots.main']=roots.filter(h=>h.role==='본기').length;
  evidence.push(...roots.map((r,i)=>({id:`root:${i}`,kind:'calculation' as const,text:`${r.position} 지장간 ${r.role}에 일간과 같은 ${r.element}이 있어요.`,positions:[r.position]})));
  const month=pillars.month;
  if(month){
   const main=hiddenStems[month.branch][0],monthGod=tenGod(dm,main);facts['month.god']=monthGod;
   const season=stemElements[main],diff=(elements.indexOf(stemElements[dm])-elements.indexOf(season)+5)%5;
   facts['season.element']=season;facts['season.support']=diff===0||diff===1;
   const scores=[3,2,-3,-2,-1],seasonScore=scores[diff];
   const visible=placed.filter(p=>p.position!=='일주').reduce((v,p)=>{const d=(elements.indexOf(stemElements[p.pillar.stem])-elements.indexOf(stemElements[dm])+5)%5;return v+(d===0||d===4?1.5:-1);},0);
   const hidden=placed.reduce((v,p)=>v+hiddenStems[p.pillar.branch].reduce((a,s,i)=>{const d=(elements.indexOf(stemElements[s])-elements.indexOf(stemElements[dm])+5)%5;return a+(d===0||d===4?1:-1)*[.6,.3,.1][i];},0),0);
   const rootScore=roots.reduce((v,r)=>v+(r.role==='본기'?2:1),0);
   if(complete){
    const score=Math.round((seasonScore+visible+hidden+rootScore)*10)/10;
    const label=score>=5?'신강 경향':score<=0?'신약 경향':'중화·경계';
    facts['strength']=score>=5?'strong':score<=0?'weak':'balanced';
    strength={label,score,method:ADVANCED_METHOD,reasons:[`월지 본기의 계절 지지 ${seasonScore}점, 같은 오행의 뿌리 ${roots.length}자리 ${rootScore}점이에요.`,`다른 천간의 생조·설극 ${visible.toFixed(1)}점, 지장간의 생조·설극 ${hidden.toFixed(1)}점을 함께 살폈어요.`],counter:[`단순 오행 개수와 다른 편집 판단이에요. 월지 본기 하나로 계절 전체를 대표해 절기 안의 깊이는 반영하지 않아요.`,relations.some(r=>r.kind==='충')?'원국의 충 후보가 있어 뿌리가 실제로 얼마나 작용하는지는 별도 검토가 필요해요.':'합화가 확정되지 않아 다른 오행으로 바꾸어 계산하지 않았어요.'],uncertainty:['학파 공통의 계량 공식이 아니라 공개한 서비스 판단식이에요. 경계값 근처에서는 후보로 읽어 주세요.']};
    const exposed=placed.filter(p=>p.position!=='일주'&&p.pillar.stem===main).map(p=>p.position);
    facts['pattern.god']=monthGod;facts['pattern.exposed']=exposed.length>0;
    pattern={label:monthGod==='비견'?'건록 계열 후보':monthGod==='겁재'?'월겁 계열 후보':`${monthGod} 중심 격국 후보`,score:null,method:ADVANCED_METHOD,reasons:[`월지 본기 ${stemLabel(main)}의 일간 관계는 ${monthGod}이에요.`,exposed.length?`${exposed.join('·')} 천간에 같은 지장간이 투출했어요.`:'월지 본기가 다른 천간에 그대로 투출하지 않았어요.'],counter:['본기 우선 방식의 후보예요. 사령 일수·특수격·종격·격의 성패는 확정하지 않아요.'],uncertainty:[]};
    const idx=elements.indexOf(stemElements[dm]);
    const preferred=score>=5?[elements[(idx+1)%5],elements[(idx+2)%5]]:score<=0?[elements[(idx+4)%5],elements[idx]]:[];
    favorableElements=preferred;
    facts['useful.support']=preferred.join('·')||'유보';
    support={label:preferred.length?`${preferred.join('·')}을 살피는 억부 후보`:'억부 우선순위 유보',score:null,method:ADVANCED_METHOD,reasons:[score>=5?'신강 경향에서는 설기와 재성으로 힘을 쓰는 방향을 먼저 비교해요.':score<=0?'신약 경향에서는 생조와 같은 오행의 뿌리를 보완하는 방향을 먼저 비교해요.':'중화·경계에서는 한 오행을 더하는 결론을 서두르지 않아요.'],counter:preferred.map(e=>`${e}의 단순 개수 ${facts[`element.${e}`]}개는 실제 강도를 뜻하지 않아요. 이미 충분한지 별도로 살펴야 해요.`),uncertainty:['후보는 색깔·물건 구매나 실제 운의 상승을 보장하지 않아요.']};
   }else facts['strength']=null;
   const cold=[11,0,1].includes(month.branch),hot=[5,6,7].includes(month.branch);
   facts['climate']=cold?'cold':hot?'hot':'mild';
   climate={label:cold?'화를 살피는 겨울 조후 후보':hot?'수를 살피는 여름 조후 후보':'극단적인 한난 조후는 유보',score:null,method:ADVANCED_METHOD,reasons:[cold?'해·자·축월의 차고 습한 계절을 완화하는 목적으로 화를 살펴요.':hot?'사·오·미월의 더운 계절을 완화하는 목적으로 수를 살펴요.':'월지의 큰 계절 분류만으로 특정 조후용신을 정하지 않았어요.'],counter:['억부와 목적이 달라 같은 후보가 나오지 않을 수 있어요. 실제 기온이나 건강 상태를 계산한 값은 아니에요.'],uncertainty:complete?[]:['시주가 없어 조후를 돕거나 막는 전체 구성은 미확정이에요.']};
  }
 }
 facts['structure.foodWealth']=complete&&Number(facts['visible.식신'])>0&&(Number(facts['visible.편재'])+Number(facts['visible.정재'])>0)&&Number(facts['roots.count'])>0?'candidate':null;
 facts['structure.foodKill']=complete&&Number(facts['visible.식신'])>0&&Number(facts['visible.편관'])>0&&Number(facts['visible.편인'])===0?'candidate':null;
 for(const rel of relations)facts[`relation.${rel.kind}`]=Number(facts[`relation.${rel.kind}`]??0)+1;
 // An absent hour is unknown, not a zero claim about the complete natal chart.
 if(!complete)for(const k of Object.keys(facts))if(k.startsWith('structure.'))facts[k]=null;
 const luck=n.instant!==null&&pillars.year&&pillars.month?calculateLuck(n.instant,pillars.year.stem,pillars.month,options.luckClass):[];
 if(!luck.length)limitations.push('출생 순간 또는 연·월주가 미확정이라 대운 개시일과 현재 대운을 확정하지 않았어요.');
 else if(!options.luckClass)limitations.push('전통 순역 분류를 선택하지 않아 순행·역행 두 후보를 따로 보여드려요.');
 return {input:value,options,compatibility,pillars,instant:n.instant,time:{requested:options.timePolicy,effective,longitudeMinutes:shift?.longitudeMinutes??null,equationMinutes:shift?.equationMinutes??null,standard:n.instant===null?null:timeText(n.instant),final:final===null?null:timeText(final),dateChanged:final!==null&&isoDate(standardParts(final))!==isoDate(standardParts(n.instant!)),boundary},facts,evidence,relations,strength,pattern,useful:{support,climate,favorableElements},luck,limitations,policyVersion:ADVANCED_CALCULATION,interpretationVersion:ADVANCED_METHOD};
}
