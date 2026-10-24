import { selectManuscripts } from './modules';
import { natalModules } from '@/content/advanced/natal';
import { calculateAdvanced } from './chart';
import { fiveYears,calculatePeriod,scopePeriod,tracePeriodDisplay,type AdvancedPeriod,type DisplayOwners } from './period';
import type { AdvancedChart } from './types';
import { positions } from './types';
import { hiddenFor,pillarLabel } from './mappings';
import { tenGod } from '../saju/tables';
export function buildAdvancedReport(chart:AdvancedChart,year:number,selected?:AdvancedPeriod,category='saju'){
 if(!Number.isInteger(year)||year<1962||year>2050)throw new Error('세운 조회 연도는 1962~2050년을 지원해요.');
 const all=selectManuscripts(natalModules,chart.facts,'natal');
 const roles=category==='saju'?null:category==='love'||category==='single'?['overview','love','god-caution']:category==='career-money'?['overview','career','money','god-caution']:category==='relationships'?['overview','relationships','god-caution']:['overview','god-caution'];
 const kept=all.applied.filter(r=>roles===null||roles.includes(r.role)),ids=new Set(kept.map(r=>r.id));
 const natal={applied:kept,trace:all.trace.filter(t=>ids.has(t.ruleId)),skipped:[...all.skipped,...all.applied.filter(r=>!ids.has(r.id)).map(r=>({id:r.id,reason:'메뉴 주제 범위'}))]};
 const periods=year<=2046?fiveYears(chart,year):Array.from({length:2051-year},(_,i)=>calculatePeriod(chart,'year',`${year+i}-01-01`));
 const years=periods.map(y=>scopePeriod(y,category));
 const owners:DisplayOwners=new Map();if(selected?.kind==='year')tracePeriodDisplay(selected.segments,owners,'selected');
 for(const y of years)y.display=tracePeriodDisplay(y.segments,owners,y.target);
 const dm=chart.pillars.day?.stem??null;
 const godRoles=positions.flatMap(pos=>chart.pillars[pos]?hiddenFor(chart.pillars[pos]!.branch,dm).map(h=>({position:pos,...h})):[]);
 return {chart,natal,years,godRoles,summary:`${chart.pillars.day?pillarLabel(chart.pillars.day)+' 일주':'일주 미확정'} · ${chart.strength.label} · ${chart.pattern.label}`,conclusion:[`이번 결과는 ${chart.time.effective==='standard'?'표준시':chart.time.effective==='true-solar'?'진태양시':'지방평균태양시'} 원국에서 출발해 월지와 일간의 뿌리, 십신의 관계를 함께 살폈습니다.`,chart.strength.score===null?'시각이나 기둥이 부족한 부분은 확정하지 않고 공통으로 확인되는 관계만 읽습니다.':`${chart.strength.label}의 판단과 ${chart.useful.support.label}는 일간을 돕거나 덜어내는 억부 방식으로 함께 판단했습니다. 계절의 한난을 보는 조후는 ${chart.useful.climate.label}로 구분했습니다.`,`선택한 ${year}년부터의 세운은 각 구간의 대운을 다시 연결해 계산했습니다. 같은 십신이 돌아와도 다른 글자와의 관계에 따라 해설이 달라질 수 있습니다.`,`일과 자원, 관계의 설명은 확인된 글자의 관계를 생활에 빗댄 해설입니다. 적용할지는 실제 역할과 비용, 당사자의 동의를 기준으로 정하십시오.`],versions:{calculation:chart.policyVersion,interpretation:chart.interpretationVersion,content:'2.3.0'},tenGodFor:(stem:number)=>dm===null?'미확정':tenGod(dm,stem)};
}
export function comparePolicies(chart:AdvancedChart){
 if(!chart.options.cityId||chart.instant===null)return null;
 const standard=calculateAdvanced(chart.input,{...chart.options,timePolicy:'standard'});
 const solar=calculateAdvanced(chart.input,{...chart.options,timePolicy:'true-solar'});
 const changed=positions.filter(k=>JSON.stringify(standard.pillars[k])!==JSON.stringify(solar.pillars[k]));
 const a=selectManuscripts(natalModules,standard.facts,'natal'),b=selectManuscripts(natalModules,solar.facts,'natal');
 return {standard,solar,changed,sharedRuleIds:a.applied.map(r=>r.id).filter(id=>b.applied.some(r=>r.id===id)),standardOnly:a.applied.filter(r=>!b.applied.some(s=>s.id===r.id)).map(r=>r.id),solarOnly:b.applied.filter(r=>!a.applied.some(s=>s.id===r.id)).map(r=>r.id)};
}
