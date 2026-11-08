import type {AiBirth,AiRequest,Fact} from '../../src/ai/contracts';
import {validateBirth} from '../../src/lib/validation';
import {generalChart} from '../../src/domain/fortune/general-policy';
import {calculatePeriod,parseTarget} from '../../src/domain/advanced/period';
import {pillarLabel} from '../../src/domain/advanced/mappings';
import {tenGod,stemNames,stemElements} from '../../src/domain/saju/tables';
import {kstDay} from './policy';
import {HttpError} from './security';
export interface Period {kind:'year'|'month'|'day';target:string;label:string;}
export function resolvePeriod(question:string,selectedYear:number|null|undefined,now:number,initial:boolean):Period|{clarify:string}{
 const day=kstDay(now),year=Number(day.slice(0,4)),references=new Set<number>();
 for(const m of question.matchAll(/(20\d{2}|19\d{2})\s*년/g))references.add(Number(m[1]));
 if(/내후년/.test(question))references.add(year+2);if(/내년/.test(question))references.add(year+1);if(/올해|금년|이번\s*달|이번달/.test(question))references.add(year);
 if(references.size>1)return {clarify:'어느 한 해를 기준으로 볼까요? 연도를 하나 골라 주세요.'};
 const explicit=[...references][0];if(explicit!==undefined&&selectedYear!=null&&explicit!==selectedYear)return {clarify:`질문은 ${explicit}년, 선택은 ${selectedYear}년이에요. 어느 해를 기준으로 볼까요?`};
 const y=explicit??selectedYear??year;if(y<1962||y>2050)return {clarify:'1962년부터 2050년 사이의 연도로 질문해 주세요.'};
 const iso=question.match(/\b(19\d{2}|20\d{2})-(\d{2})-(\d{2})\b/);if(iso){const target=iso[0];try{parseTarget(target);}catch{return {clarify:'실제로 있는 날짜인지 확인해 주세요.'};}if(selectedYear!=null&&Number(iso[1])!==selectedYear)return {clarify:'질문의 날짜와 선택한 연도가 달라요. 조회할 연도를 맞춰 주세요.'};return {kind:'day',target,label:target};}
 const month=question.match(/(?:년\s*|^)(\d{1,2})월/);if(/이번\s*달|이번달/.test(question))return {kind:'month',target:day.slice(0,7)+'-01',label:day.slice(0,7)};
 if(month){const m=Number(month[1]);if(m<1||m>12)return {clarify:'1월부터 12월 중에 골라 주세요.'};return {kind:'month',target:`${y}-${String(m).padStart(2,'0')}-01`,label:`${y}년 ${m}월`};}
 if(!initial&&explicit===undefined&&selectedYear==null&&/이사|이직|취업|퇴사|면접|시험/.test(question))return {clarify:'어느 해의 일인지 알려주세요. 올해나 내년처럼 적어도 괜찮아요.'};
 return {kind:'year',target:`${y}-01-01`,label:`${y}년`};
}
export function safetyQuestion(question:string){if(/죽고\s*싶|자살|자해|목숨을\s*끊/.test(question))return '지금 많이 힘든 상황이라면 혼자 견디지 않아도 됩니다. 가까운 믿을 만한 사람에게 지금의 상황을 알리고 함께 있어 달라고 요청해 주세요. 당장 자신을 해칠 위험이 있다면 지역 응급 서비스나 가까운 응급실의 도움을 받으십시오. 이 문제를 사주로 판단하거나 AI 운세로 대신할 수는 없습니다.';
 if(/진단|암에\s*걸|질병|약을\s*끊|치료|임신\s*여부/.test(question))return '건강 상태나 치료 여부는 사주로 판단할 수 없습니다. 증상과 실제 검사 결과를 바탕으로 의료진과 상의해 주세요. AI 사주에서는 진단이나 치료 방법을 제시하지 않습니다.';
 if(/대출.*투자|종목.*추천|수익률|소송.*승|법률.*판단/.test(question))return '금융·법률의 중요한 판단을 사주에 맡길 수는 없습니다. 실제 계약과 자료를 살피고 필요한 전문 도움을 구하십시오. 대출 투자나 소송 결과를 확정하는 답변은 제공하지 않습니다.';return null;}
export function checkPrivateText(request:AiRequest){const text=[request.question,...request.history.map(m=>m.text)].join('\n');if(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|\b0\d{1,2}[- ]?\d{3,4}[- ]?\d{4}\b|\b\d{6}[- ]?[1-4]\d{6}\b|(?:이름은|성명은|주소는|실명은)\s*\S+|(?:[가-힣]{2,4})\s*님|(?:[가-힣]+(?:로|길))\s*\d+/.test(text))throw new HttpError(400,'PRIVATE_TEXT','이름·연락처·정확한 주소를 빼고 질문해 주세요.');}
export function deriveFacts(birth:AiBirth,period:Period,now:number){
 const {luckClass,...raw}=birth;const valid=validateBirth({...raw,nickname:''},{now:()=>new Date(now)});const chart=generalChart({...valid,advanced:{enabled:true,timePolicy:'standard',...(luckClass?{luckClass}:{})}});
 const cutoff=new Date(now+9*3600000);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-19);if(`${chart.compatibility.normalizedInput.solar.year}-${String(chart.compatibility.normalizedInput.solar.month).padStart(2,'0')}-${String(chart.compatibility.normalizedInput.solar.day).padStart(2,'0')}`>cutoff.toISOString().slice(0,10))throw new HttpError(400,'ADULT_BIRTH_REQUIRED','현재 AI 사주 초안은 만 19세 이상 출생정보만 다뤄요. 기본 무료 운세는 별도로 이용할 수 있어요.');
 const facts:Fact[]=[];for(const [position,p] of Object.entries(chart.pillars))if(p)facts.push({id:`natal.${position}`,value:`${({hour:'시주',day:'일주',month:'월주',year:'연주'} as Record<string,string>)[position]} ${pillarLabel(p)}`,kind:'natal'});
 if(chart.pillars.day)facts.push({id:'natal.master',value:`일간 ${stemNames[chart.pillars.day.stem]}${stemElements[chart.pillars.day.stem]}`,kind:'natal'});
 else facts.push({id:'limit.day',value:'일주와 일간 미확정. 일간에 의존하는 해석을 만들지 않음.',kind:'limit'});
 if(!chart.pillars.hour)facts.push({id:'limit.hour',value:'출생 시각 미상. 시주·전체 강약·격국·대운 시작일 미확정.',kind:'limit'});
 const p=calculatePeriod(chart,period.kind,period.target);
 const local=(t:number)=>new Date(t+9*3600000).toISOString().slice(0,16).replace('T',' ');
 for(const [i,s] of p.segments.entries()){
  if(i>=8)break;const target=s.pillars[period.kind];const relation=chart.pillars.day?tenGod(chart.pillars.day.stem,target.stem):'일간 미확정';facts.push({id:`period.${i}`,value:`${local(s.start)}부터 ${local(s.end)} 전까지 ${pillarLabel(target)} · 일간 관계 ${relation}`,kind:'period'});
 }
 return facts;
}
