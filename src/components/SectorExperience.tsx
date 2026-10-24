'use client';
import periodNotes from '@/content/foundation/period-notes.json';
import { useMemo,useState } from 'react';
import type { BirthInput } from '@/domain/saju/types';
import type { AdvancedOptions } from '@/domain/advanced/types';
import { calculateAdvanced } from '@/domain/advanced/chart';
import { presentSector } from '@/domain/foundation/presentation';
import { buildSectorReading,scheduleFor } from '@/domain/foundation/engine';
import { fortuneView } from '@/domain/fortune/view-policy';
import { domains,domainNames,contexts,contextNames,type ScheduleContext } from '@/domain/foundation/types';
import { segmentLabel } from '@/domain/advanced/period';
import { pillarLabel } from '@/domain/advanced/mappings';
import { BirthSummary } from './BirthSummary';
import { NatalChart } from './NatalChart';
import { SectorRadar } from './SectorRadar';
import { AdvancedControls } from './AdvancedControls';
import { useSession } from './SessionProvider';
export default function SectorExperience({input,category,today,selectedYear}:{input:BirthInput;category:string;today:string;selectedYear?:number}){
 const session=useSession();const [picked,setPicked]=useState<string|null>(null),[context,setContext]=useState<ScheduleContext>('general');
 const view=fortuneView(category==='saju'?'year':category,today,picked),kind=view.kind,target=category==='saju'?`${selectedYear}-01-01`:view.target;
 const options:AdvancedOptions={...(input.advanced??{timePolicy:'standard'}),enabled:true};
 const chartResult=useMemo(()=>{try{return {chart:calculateAdvanced(input,{...(input.advanced??{timePolicy:'standard'}),enabled:true}),error:null};}catch(e){return {chart:null,error:e instanceof Error?e.message:'출생정보를 확인해 주세요.'};}},[input]);
 const result=useMemo(()=>{if(!chartResult.chart||!target)return null;try{return {reading:buildSectorReading(chartResult.chart,kind,target),error:null};}catch(e){return {reading:null,error:e instanceof Error?e.message:'조회 날짜를 확인해 주세요.'};}},[chartResult,kind,target]);
 const reading=result?.reading,note=reading&&view.showSchedule?scheduleFor(reading,context):null;
 const heading=<header className="sector-heading"><p className="eyebrow">내 사주로 살펴보는 {kind==='year'?'한 해':kind==='month'?'한 달':'하루'}</p><h2>{reading?.label??(view.customDate?'날짜를 선택해 주세요':target)}</h2>{input.nickname&&<p>{input.nickname} 님의 운세</p>}<p>{kind==='year'?`${target?.slice(0,4)}년 1월부터 12월까지의 운세예요.`:kind==='month'?'이번 달의 운세예요.':category==='tomorrow'?'한국시간 기준 내일의 운세예요.':view.customDate?'선택한 날짜의 운세를 확인하세요.':'한국시간 기준 오늘의 운세예요.'}</p></header>;
 return <section className="sector-experience" aria-label="사주 기반 여섯 분야 운세">{category!=='saju'&&heading}
 {chartResult.chart&&<><BirthSummary input={input} chart={chartResult.chart} category={category}/><NatalChart chart={chartResult.chart}/></>}
 {category==='saju'&&heading}
 {chartResult.error&&<p role="alert">{chartResult.error}</p>}
 {view.customDate&&<div className="sector-date-controls no-print"><label>운세를 볼 날짜<input type="date" aria-label="운세를 볼 날짜" min="1962-01-01" max="2050-12-31" value={picked??''} onChange={e=>setPicked(e.target.value||null)}/></label><p className="helper">면접이나 시험 등 중요한 일정이 있는 날을 골라보세요.</p></div>}
 {view.customDate&&!picked&&<p role="status">위에서 날짜를 고르면 해당 날짜의 운세가 나와요.</p>}
 {result?.error&&<p className="error-summary" role="alert">{result.error}</p>}
 {reading&&<><SectorRadar reading={reading}/><details className="disclosure period-application-note"><summary>{periodNotes[kind].title}</summary><div className="disclosure-body"><p>{periodNotes[kind].text}</p></div></details>{reading.segments.length>1&&<p className="helper">이 기간에는 운세가 달라지는 시점이 있어요. 전체 설명을 먼저 읽고, 자세한 날짜는 아래에서 확인하세요.</p>}<nav className="sector-anchor-links no-print" aria-label="분야별 본문 이동">{domains.map(d=><a href={`#sector-${d}`} key={d}>{domainNames[d]}</a>)}</nav>
 <div className="sector-bodies">{domains.map(domain=>{
 const sector=reading.sectors[domain];const plan=presentSector(reading,domain),core=plan.primary;
 return <section className="reading-section sector-body" key={domain} id={`sector-${domain}`} data-domain={domain} data-score={sector.score??'null'}><h2>{domainNames[domain]} <span className="sector-score">{sector.score===null?'산출 보류':`${sector.score} / 100`}</span></h2>{domain==='business'&&<p className="helper">직장·취업·일·사업을 함께 다뤄요.</p>}{core?<><h3>{core.title}</h3>{plan.paragraphs.map((p,i)=><p key={`${p.recordId}:${i}`} data-source-id={p.recordId} className={p.role==='proposal'?'sector-proposal':undefined}>{p.text}</p>)}</>:<p>출생 시각에 따라 사주가 달라질 수 있어 이 항목은 풀이하지 않았어요. 출생 시각과 계산 기준을 확인해 주세요.</p>}{sector.uncertainty.map(p=><p className="helper" key={p}>{p}</p>)}</section>;
 })}</div>
 {view.showSchedule&&<section className="schedule-notes"><h2>선택한 날의 일정 준비</h2><label className="no-print">일정 선택<select aria-label="일정 선택" value={context} onChange={e=>setContext(e.target.value as ScheduleContext)}>{contexts.map(c=><option key={c} value={c}>{contextNames[c]}</option>)}</select></label><h3>{contextNames[context]}</h3>{note?<><p data-source-id={note.id}>{note.text}</p><ul>{note.checks.map(c=><li key={c}>{c}</li>)}</ul></>:<p>일간이 미확정이라 일정에 대한 사주 해석은 덧붙이지 않았어요. 실제 안내와 준비할 항목을 먼저 확인해 주세요.</p>}<p className="helper">일정 선택은 기본 지수와 본문을 바꾸지 않아요. {context==='interview'?'면접 일정은 준비 상태와 회사 안내를 우선해 정해 주세요.':'일정 변경이나 취소는 실제 안내와 준비 상태를 기준으로 정해 주세요.'}</p></section>}
 <details className="disclosure sector-segments"><summary>시기별 운세와 풀이 이유</summary><div className="disclosure-body"><p>아래에서 운세가 달라지는 날짜와 각 시기의 풀이 이유를 확인할 수 있어요.</p>{reading.segments.map((s,i)=><section key={s.start}><h3>{i+1}구간 · {segmentLabel(s)}</h3><p>선택한 날짜의 간지 · {pillarLabel(s.context.pillars[kind])} / 세운 {pillarLabel(s.context.pillars.year)} · 월운 {pillarLabel(s.context.pillars.month)} · 천간 관계 {s.context.facts['period.god']??'미확정'} · 지지 본기 {s.context.facts['period.branchGod']??'미확정'}</p>{domains.map(d=><div key={d}><h4>{domainNames[d]} · {s.sectors[d].score??'보류'}</h4><p>{s.sectors[d].records.map(r=>r.title).join(' / ')||'개인 해석 유보'}</p>{s.sectors[d].contributions.length>0&&d!=='overall'&&<ul className="sector-score-reasons">{s.sectors[d].contributions.map(c=>{const r=s.sectors[d].records.find(r=>r.id===c.recordId)!;return <li key={c.recordId}><strong>{r.title}</strong> · {c.delta>0?'+':''}{c.delta}</li>;})}</ul>}</div>)}</section>)}<section><h3>다른 구간의 추가 풀이</h3>{domains.map(d=><div key={d}>{presentSector(reading,d).additional.map(r=><section key={r.id}><h4>{domainNames[d]} · {r.title}</h4><p className="helper">적용 구간 {reading.segments.flatMap((s,i)=>s.sectors[d].records.some(x=>x.id===r.id)?[i+1]:[]).join('·')}</p><p data-source-id={r.id}>{r.paragraphs[0]}</p>{r.proposal&&<p data-source-id={r.id}>{r.proposal}</p>}</section>)}</div>)}</section></div></details>
 </>}
 <details className="disclosure"><summary>시간 보정·계산 기준</summary><div className="disclosure-body"><div className="no-print"><AdvancedControls value={options} alwaysEnabled onChange={advanced=>{if(session.birth)session.setBirth({...session.birth,input:{...session.birth.input,advanced:{...advanced,enabled:true}}});}}/></div>{chartResult.chart&&<><p>표준시 {chartResult.chart.time.standard??'미확정'} / 적용 시각 {chartResult.chart.time.final??'미확정'}</p>{chartResult.chart.limitations.map(p=><p key={p}>{p}</p>)}</>}</div></details>
 <p className="helper">운세는 전통 사주 풀이를 바탕으로 한 참고 이야기예요.</p></section>;
}
