'use client';
import { useMemo,useState } from 'react';
import type { BirthInput } from '@/domain/saju/types';
import { generalChart } from '@/domain/fortune/general-policy';
import { presentSector } from '@/domain/foundation/presentation';
import { buildSectorReading,scheduleFor } from '@/domain/foundation/engine';
import { fortuneView } from '@/domain/fortune/view-policy';
import { domains,domainNames,contexts,contextNames,type ScheduleContext } from '@/domain/foundation/types';
import { BirthSummary } from './BirthSummary';
import { NatalChart } from './NatalChart';
import { SectorRadar } from './SectorRadar';
export default function SectorExperience({input,category,today,selectedYear}:{input:BirthInput;category:string;today:string;selectedYear?:number}){
 const [picked,setPicked]=useState<string|null>(null),[context,setContext]=useState<ScheduleContext>('general');
 const view=fortuneView(category==='saju'?'year':category,today,picked),kind=view.kind,target=category==='saju'?`${selectedYear}-01-01`:view.target;

 const chartResult=useMemo(()=>{try{return {chart:generalChart(input),error:null};}catch(e){return {chart:null,error:e instanceof Error?e.message:'출생정보를 확인해 주세요.'};}},[input]);
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
 {reading&&<>{input.unknownTime&&<p className="helper">{chartResult.chart?.pillars.day?'태어난 시간을 몰라 시간에 해당하는 기둥(시주)은 제외했어요. 나머지 확인된 출생정보로 풀이했어요.':'태어난 당시의 시계를 한국 표준시로 바꾸면 날짜가 달라질 수 있어요. 출생 시간을 몰라 태어난 날의 기둥(일주)을 하나로 정할 수 없어서 지수와 개인 풀이는 보류했어요.'}</p>}<SectorRadar reading={reading}/><nav className="sector-anchor-links no-print" aria-label="분야별 본문 이동">{domains.map(d=><a href={`#sector-${d}`} key={d}>{domainNames[d]}</a>)}</nav>
 <div className="sector-bodies">{domains.map(domain=>{
 const sector=reading.sectors[domain];const plan=presentSector(reading,domain),core=plan.primary;
 return <section className="reading-section sector-body" key={domain} id={`sector-${domain}`} data-domain={domain} data-score={sector.score??'null'}><h2>{domainNames[domain]} <span className="sector-score">{sector.score===null?'산출 보류':`${sector.score} / 100`}</span></h2>{domain==='business'&&<p className="helper">직장·취업·일·사업을 함께 다뤄요.</p>}{core?<><h3>{core.title}</h3>{plan.paragraphs.map((p,i)=><p key={`${p.recordId}:${i}`} data-source-id={p.recordId}>{p.text}</p>)}</>:<p>일간이 미확정이라 지수와 풀이를 정하지 않았어요.</p>}</section>;
 })}</div>
 {view.showSchedule&&<section className="schedule-notes"><h2>선택한 날의 일정 준비</h2><label className="no-print">일정 선택<select aria-label="일정 선택" value={context} onChange={e=>setContext(e.target.value as ScheduleContext)}>{contexts.map(c=><option key={c} value={c}>{contextNames[c]}</option>)}</select></label><h3>{contextNames[context]}</h3>{note?<><p data-source-id={note.id}>{note.text}</p><ul>{note.checks.map(c=><li key={c}>{c}</li>)}</ul></>:<p>일간이 미확정이라 일정에 대한 사주 해석은 덧붙이지 않았어요. 실제 안내와 준비할 항목을 먼저 확인해 주세요.</p>}<p className="helper">일정 선택은 기본 지수와 본문을 바꾸지 않아요. {context==='interview'?'면접 일정은 준비 상태와 회사 안내를 우선해 정해 주세요.':'일정 변경이나 취소는 실제 안내와 준비 상태를 기준으로 정해 주세요.'}</p></section>}

 </>}

 <p className="helper">운세는 전통 사주 풀이를 바탕으로 한 참고 이야기예요.</p></section>;
}
