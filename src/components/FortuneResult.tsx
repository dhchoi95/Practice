'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { NatalChart } from './NatalChart';
import { topicBasis } from '@/domain/fortune/topic-basis';
const SectorExperience=dynamic(()=>import('./SectorExperience'),{ssr:false,loading:()=> <p role="status">여섯 분야 풀이를 준비하고 있어요.</p>});
import { ZodiacContext } from './ZodiacContext';
import { MBTIResult } from './MBTI';
const AdvancedExperience=dynamic(()=>import('./AdvancedExperience'),{ssr:false,loading:()=> <p aria-live="polite">상세 분석을 준비하고 있어요.</p>});
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { type Category } from '@/config/site';
import { useSession } from './SessionProvider';
import { useSeoulDate } from './LiveDate';
import { segmentDateRange } from '@/domain/fortune/period-label';
import { composePeriodReading } from '@/domain/interpretation/period-reading';
import { interpret,type InterpretationResult } from '@/domain/interpretation/engine';
import { targetPeriod,type PeriodKind,type TargetPeriod } from '@/domain/fortune/period';
import { CalculationDetails } from './CalculationDetails';
import { ShareActions } from './ShareActions';
import { Illustration } from './Illustration';
import { editorialForDate } from '@/content/editorial';
import { zodiacNames,constellationNames } from '@/domain/calendar/korean';
import { pillarText } from '@/domain/saju/tables';
import { usePrintDetails } from '@/lib/print';
export function FortuneResult({category}:{category:Category}){
  usePrintDetails();
  const {birth,light,clear}=useSession(),router=useRouter(),today=useSeoulDate();
  const sign=light[category.slug],isSaju=category.system==='saju',isPeriod=['year','month','day'].includes(category.slug)&&isSaju;
  const hasInput=isSaju?!!birth:sign!==undefined;
  useEffect(()=>{
    // 폼 하단에서 이동했어도 요약부터 읽고 키보드 탐색을 이어갈 수 있게 한다.
    const frame=requestAnimationFrame(()=>{
      document.getElementById('result-title')?.focus({preventScroll:true});
      window.scrollTo({top:0,left:0,behavior:'instant'});
    });
    return ()=>cancelAnimationFrame(frame);
  },[category.slug,hasInput]);
  if(category.system==='mbti')return <MBTIResult/>;
  if(!hasInput)return <section className="empty-state"><Illustration name={category.icon} size={90}/><h2>입력정보가 없어 결과를 불러올 수 없어요</h2><p>새로고침하면 개인정보가 사라져요. 다시 입력하면 바로 확인할 수 있어요.</p><Link prefetch={false} className="button primary" href={`/fortune/${category.slug}/`}>다시 입력하고 {category.name} 보기</Link></section>;
  if(!today)return <p className="view-pending" role="status">한국시간 기준 날짜를 확인하고 있어요.</p>;
  if(isSaju&&birth&&['day','tomorrow','date','month','year'].includes(category.slug))return <>
    <SectorExperience input={birth.input} category={category.slug} today={today}/>
    <div className="action-row no-print"><Link prefetch={false} className="button" href={`/fortune/${category.slug}/`}>입력 수정</Link><button className="button" onClick={()=>{clear();router.push(`/fortune/${category.slug}/`);}}>다른 사람 보기</button></div>
    <ShareActions slug={category.slug}/>
    <button className="clear-link no-print" onClick={()=>{clear();router.push('/');}}>입력 지우기</button><p className="editorial-note">출생정보는 브라우저 메모리에서만 사용해요. 새로고침하면 입력과 결과가 사라져요.</p>
  </>;
  if(isSaju&&birth&&(category.slug==='saju'||category.slug==='manse'))return <>
    <AdvancedExperience input={birth.input} category={category.slug} today={today}/>
    <details className="disclosure"><summary>기존 표준시 간단 사주표 참고</summary><div className="disclosure-body"><p>이 표는 기존 한국 표준시 호환 계산이에요. 위에서 태양시를 선택했다면 위 상세 결과의 원국과 해석을 함께 읽어 주세요.</p><CalculationDetails result={birth.calculation}/></div></details>
    <div className="action-row no-print"><Link prefetch={false} className="button" href={`/fortune/${category.slug}/`}>입력 수정</Link><button className="button quiet" onClick={()=>{clear();router.push(`/fortune/${category.slug}/`);}}>다른 사람 보기</button></div><ShareActions slug={category.slug}/>

    <button className="clear-link no-print" onClick={()=>{clear();router.push('/');}}>입력 지우기</button><p className="editorial-note">상세 콘텐츠 2.0.0 · 전통 해석 후보와 생활 제안이에요. 새로고침하면 입력·도시·결과가 사라져요.</p>
  </>;
  let reading:InterpretationResult,period:TargetPeriod|undefined;
  let topic:ReturnType<typeof topicBasis>|undefined;
  try{
    if(isPeriod&&birth){
      period=targetPeriod(category.slug as PeriodKind,birth.calculation.dayMaster,{now:()=>new Date(`${today}T12:00:00+09:00`)});
      reading=composePeriodReading(period,birth.calculation.features);
    }else {
      if(isSaju&&birth)topic=topicBasis(birth.input,birth.calculation);
      reading=interpret(category.system,category.content,topic?.features??{'light.sign':sign});
      if(topic&&!topic.chart.pillars.day)reading={...reading,sections:reading.sections.map(section=>section.id==='unknown-day'?{...section,paragraphs:['선택한 계산 기준에서는 출생 시각에 따라 일주가 달라질 수 있어요. 나를 풀이하는 기준인 일간을 정할 수 없어, 이를 전제로 한 성격이나 관계 해석은 덧붙이지 않았어요. 확인된 글자에 관한 설명만 보여드려요.']}:section)};
    }
  }catch{
    return <section className="empty-state"><h2>이 기간의 계산을 마치지 못했어요</h2><p>기간 운세는 한국시간 1962~2050년을 지원해요. 기기 날짜를 확인하거나 기본 사주풀이를 이용해 주세요.</p><Link prefetch={false} href="/fortune/saju/" className="button primary">기본 사주풀이로 이동</Link></section>;
  }
  const nickname=isSaju?birth?.input.nickname:'';
  const lightName=category.system==='zodiac'?zodiacNames[Number(sign)]:category.system==='constellation'?constellationNames[Number(sign)]:`${sign}형`;
  const editorial=!isSaju&&category.system!=='bloodType'?editorialForDate(today,`${category.system}:${sign}`):null;
  const limitations=[...(isSaju?(topic?.chart.limitations??birth!.calculation.limitations):[]),...new Set(reading.limitations)];
  const hasDayMaster=birth?.calculation.dayMaster!=null;
  const visibleSections=isPeriod&&hasDayMaster?Array.from({length:Math.max(...reading.sections.map(s=>s.paragraphs.length))},(_,i)=>({
    ...reading.sections[0],id:`period-section-${i}`,title:['이 기간의 주제','다른 사람과 이야기할 일','이 구간에 해볼 일','돈 관리에서 확인할 점'][i],
    paragraphs:reading.sections.flatMap((s,index)=>s.paragraphs[i]?[`${reading.sections.length>1?(index===0?'앞 구간 · ':'뒤 구간 · '):''}${s.paragraphs[i]}`]:[]),
  })):reading.sections;
  return <>
    {topic&&<NatalChart chart={topic.chart}/>}
    <div className="result-hero"><p className="eyebrow">{isSaju?nickname?`${nickname} 님의 ${category.name}`:`나의 ${category.name}`:`${lightName} · 가벼운 이야기`}</p><span className="result-period">{period?.label??(!isSaju&&category.system!=='bloodType'?`${today.replaceAll('-','. ')} · 한국시간`:'타고난 기질을 돌아보는 기본 풀이')}</span><h2>{reading.headline}</h2><div className="keywords">{reading.keywords.map((k,i)=><span key={i}>{k}</span>)}</div></div>
    {period&&<aside className="period-range-note" aria-label="풀이가 적용되는 구간">{period.segments.map((segment,i)=><p key={segment.start}><strong>{period.segments.length===1?'대상 구간':i===0?'앞 구간':'뒤 구간'}</strong> · {segmentDateRange(segment)}</p>)}{period.segments.length>1&&<p className="helper">경계 날짜에는 절입 시각에 구간이 바뀌어요. 정확한 시각은 아래 기간 상세에서 볼 수 있어요.</p>}</aside>}
    {limitations.length>0&&<aside className="result-limitation" aria-label="입력과 풀이의 한계">{limitations.map((text,i)=><p key={i}>{text}</p>)}</aside>}
    <div className="result-content">{visibleSections.map(section=><section className="reading-section" key={section.id}><h3>{section.title}</h3>{section.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</section>)}</div>
    {editorial&&<section className="practical-panel"><span className="pill-label">날짜에 따라 바뀌는 생활 제안</span><h2>{editorial.title}</h2><p>{editorial.text}</p><p className="helper">31개 생활 원고를 공개한 날짜 순서로 보여줘요. 사주나 천문 계산으로 오늘의 사건을 예측한 내용은 아니에요.</p></section>}
    {category.system==='zodiac'&&<ZodiacContext sign={sign} date={today}/>}
    <section className="practical-panel"><h2>생활에서 참고할 제안</h2><ul>{reading.practicalTips.slice(0,4).map(t=><li key={t}>{t}</li>)}</ul></section>
    {period&&<details className="disclosure"><summary>대상 기간과 절기 구간 보기</summary><div className="disclosure-body">
      <p>화면의 {period.kind==='year'?'연도는 양력 한 해':'기간은 한국시간 양력 기준'}예요. {hasDayMaster?
        <>{period.kind==='year'?'입춘 전후의 연주를 나누어':period.kind==='month'?'이달의 절입 전후 월주를 나누어':'오늘의 일주를 기준으로'} 내 일간과의 관계를 살폈어요. {period.kind!=='day'?'구간별 내용을 요약해서 함께 보여드려요.':''}</>:
        <>일간이 미확정이라 나의 일간과 기간 간지의 관계는 해석하지 않았어요. 아래에는 대상 기간의 간지와 경계만 표시해요.</>}
      </p>
      {period.segments.map(s=><section className="period-segment" key={s.start}><h3>{s.label}</h3><p>{pillarText(s.pillar)} · 일간과의 관계 {s.features['period.relation']??'미확정'}</p></section>)}
    </div></details>}
    {topic&&<details className="disclosure"><summary>시간 보정·계산 기준</summary><div className="disclosure-body"><p>표준시 {topic.chart.time.standard??'미확정'} / 적용 시각 {topic.chart.time.final??'미확정'}</p>{topic.chart.limitations.map(text=><p key={text}>{text}</p>)}</div></details>}
    <details className="disclosure"><summary>왜 이런 풀이인가요?</summary><div className="disclosure-body">{reading.basisGroups?reading.basisGroups.map(group=><section key={group.label}><h3>{group.label}</h3><ul>{group.basis.map(b=><li key={b}>{b}</li>)}</ul></section>):<ul>{[...new Set(reading.sections.flatMap(s=>s.basis))].map(b=><li key={b}>{b}</li>)}</ul>}<p>전통적인 상징에 빗대어 일상을 돌아보는 글이에요. 원고의 형식과 적용 조건은 자동으로 검사했지만, 독립적인 명리 검토를 마친 것은 아니에요. 개인의 성격이나 미래를 확인한 결과도 아니에요. 의료·투자·법률 판단에는 실제 정보와 적절한 도움을 받아 주세요.</p></div></details>
    <div className="action-row no-print"><Link prefetch={false} className="button" href={`/fortune/${category.slug}/`}>{isSaju?'입력 수정':'선택 바꾸기'}</Link><button className="button quiet" onClick={()=>{clear();router.push(`/fortune/${category.slug}/`);}}>다른 사람 보기</button></div>

    <ShareActions slug={category.slug}/>

    <button className="clear-link no-print" onClick={()=>{clear();router.push('/');}}>입력 지우기</button><p className="editorial-note">운세는 나를 돌아보는 참고 이야기예요. 성향을 확정하거나 앞으로의 사건을 예언하지 않아요. 새로고침하면 입력과 결과가 사라져요.</p>
  </>;
}
