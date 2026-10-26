'use client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { NewYearExperience } from './NewYearExperience';
import { CompatibilityResult } from './Compatibility';
import { BirthSummary } from './BirthSummary';
import { NatalChart } from './NatalChart';
import {generalInput} from '@/domain/fortune/general-policy';
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
import { interpret,type InterpretationResult } from '@/domain/interpretation/engine';
import { ShareActions } from './ShareActions';
import { Illustration } from './Illustration';
import { editorialForDate } from '@/content/editorial';
import { zodiacNames,constellationNames } from '@/domain/calendar/korean';
import { usePrintDetails } from '@/lib/print';
export function FortuneResult({category}:{category:Category}){
  usePrintDetails();
  const {birth,light,clear}=useSession(),router=useRouter(),today=useSeoulDate();
  const sign=light[category.slug],isSaju=category.system==='saju';
  const hasInput=isSaju?!!birth:sign!==undefined;
  useEffect(()=>{
    // 폼 하단에서 이동했어도 요약부터 읽고 키보드 탐색을 이어갈 수 있게 한다.
    const frame=requestAnimationFrame(()=>{
      document.getElementById('result-title')?.focus({preventScroll:true});
      window.scrollTo({top:0,left:0,behavior:'instant'});
    });
    return ()=>cancelAnimationFrame(frame);
  },[category.slug,hasInput]);
  if(category.slug==='blood-type')return <p>혈액형풀이는 제공을 종료했어요. <Link href="/">다른 운세 보기</Link></p>;
  if(category.slug==='compatibility')return <CompatibilityResult/>;
  if(category.system==='mbti')return <MBTIResult/>;
  if(!hasInput)return <section className="empty-state"><Illustration name={category.icon} size={90}/><h2>입력정보가 없어 결과를 불러올 수 없어요</h2><p>새로고침하면 개인정보가 사라져요. 다시 입력하면 바로 확인할 수 있어요.</p><Link prefetch={false} className="button primary" href={`/fortune/${category.slug}/`}>다시 입력하고 {category.name} 보기</Link></section>;
  if(!today)return <p className="view-pending" role="status">한국시간 기준 날짜를 확인하고 있어요.</p>;
  if(isSaju&&birth&&['day','tomorrow','date','month','year'].includes(category.slug))return <>
    <SectorExperience input={birth.input} category={category.slug} today={today}/>
    <div className="action-row no-print"><Link prefetch={false} className="button" href={`/fortune/${category.slug}/`}>입력 수정</Link><button className="button" onClick={()=>{clear();router.push(`/fortune/${category.slug}/`);}}>다른 사람 보기</button></div>
    <ShareActions slug={category.slug}/>
    <button className="clear-link no-print" onClick={()=>{clear();router.push('/');}}>입력 지우기</button><p className="editorial-note">출생정보는 브라우저 메모리에서만 사용해요. 새로고침하면 입력과 결과가 사라져요.</p>
  </>;
  if(isSaju&&birth&&category.slug==='saju')return <><NewYearExperience input={birth.input} today={today}/><ShareActions slug="saju"/></>;
  if(isSaju&&birth&&category.slug==='manse')return <>
    <AdvancedExperience input={birth.input} category={category.slug} today={today}/>
    <div className="action-row no-print"><Link prefetch={false} className="button" href={`/fortune/${category.slug}/`}>입력 수정</Link><button className="button quiet" onClick={()=>{clear();router.push(`/fortune/${category.slug}/`);}}>다른 사람 보기</button></div><ShareActions slug={category.slug}/>

    <button className="clear-link no-print" onClick={()=>{clear();router.push('/');}}>입력 지우기</button><p className="editorial-note">새로고침하면 입력과 결과가 사라져요.</p>
  </>;
  let reading:InterpretationResult;
  let topic:ReturnType<typeof topicBasis>|undefined;
  try{
      if(isSaju&&birth)topic=topicBasis(generalInput(birth.input),birth.calculation);
      reading=interpret(category.system,category.content,topic?.features??{'light.sign':sign});
      if(topic&&!topic.chart.pillars.day)reading={...reading,sections:reading.sections.map(section=>section.id==='unknown-day'?{...section,paragraphs:['태어난 시간을 몰라 일주도 미확정이에요. 일간을 정할 수 없어 이를 바탕으로 하는 성격이나 관계 풀이는 덧붙이지 않았어요. 확인된 글자에 관한 설명만 보여드려요.']}:section)};
  }catch{
    return <section className="empty-state"><h2>이 기간의 계산을 마치지 못했어요</h2><p>기간 운세는 한국시간 1962~2050년을 지원해요. 기기 날짜를 확인하거나 기본 사주풀이를 이용해 주세요.</p><Link prefetch={false} href="/fortune/saju/" className="button primary">기본 사주풀이로 이동</Link></section>;
  }
  const nickname=isSaju?birth?.input.nickname:'';
  const lightName=category.system==='zodiac'?zodiacNames[Number(sign)]:category.system==='constellation'?constellationNames[Number(sign)]:`${sign}형`;
  const editorial=!isSaju?editorialForDate(today,`${category.system}:${sign}`):null;
  return <>
    {topic&&birth&&<><BirthSummary input={birth.input} chart={topic.chart} category={category.slug}/><NatalChart chart={topic.chart}/></>}
    <div className="result-hero"><p className="eyebrow">{isSaju?nickname?`${nickname} 님의 ${category.name}`:`나의 ${category.name}`:`${lightName} · 가벼운 이야기`}</p><span className="result-period">{!isSaju?`${today.replaceAll('-','. ')} · 한국시간`:'타고난 성향 풀이'}</span><h2>{reading.headline}</h2><div className="keywords">{reading.keywords.map((k,i)=><span key={i}>{k}</span>)}</div></div>
    <div className="result-content">{reading.sections.map(section=><section className="reading-section" key={section.id}><h3>{section.title}</h3>{section.paragraphs.map((p,i)=><p key={i}>{p}</p>)}</section>)}</div>
    {editorial&&<section className="practical-panel"><span className="pill-label">날짜에 따라 바뀌는 생활 제안</span><h2>{editorial.title}</h2><p>{editorial.text}</p><p className="helper">유형과 날짜에 맞춘 가벼운 생활 이야기예요.</p></section>}
    {category.system==='zodiac'&&<ZodiacContext sign={sign} date={today}/>}
    <section className="practical-panel"><h2>생활에서 참고할 제안</h2><ul>{reading.practicalTips.slice(0,4).map(t=><li key={t}>{t}</li>)}</ul></section>
    <div className="action-row no-print"><Link prefetch={false} className="button" href={`/fortune/${category.slug}/`}>{isSaju?'입력 수정':'선택 바꾸기'}</Link><button className="button quiet" onClick={()=>{clear();router.push(`/fortune/${category.slug}/`);}}>다른 사람 보기</button></div>

    <ShareActions slug={category.slug}/>

    <button className="clear-link no-print" onClick={()=>{clear();router.push('/');}}>입력 지우기</button><p className="editorial-note">운세는 나를 돌아보는 참고 이야기예요. 성향을 확정하거나 앞으로의 사건을 예언하지 않아요. 새로고침하면 입력과 결과가 사라져요.</p>
  </>;
}
