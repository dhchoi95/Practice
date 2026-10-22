'use client';
import { MBTIEntry } from './MBTI';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Category } from '@/config/site';
import { useSession } from './SessionProvider';
import { BirthForm } from './BirthForm';
import { zodiacNames,constellationNames,constellationRanges,constellationForDate,isoDate } from '@/domain/calendar/korean';
export function FortuneEntry({category}:{category:Category}){
  const {birth,clear,light,setLight}=useSession(),router=useRouter();
  const [selection,setSelection]=useState(light[category.slug]??'');
  const [unknown,setUnknown]=useState(false);
  if(category.system==='mbti')return <MBTIEntry/>;
  if(category.system==='saju')return <>
    {birth&&<section className="reuse-panel"><h2>입력한 정보로 바로 볼 수 있어요</h2><p>{birth.input.nickname?`${birth.input.nickname} · `:''}양력 {isoDate(birth.calculation.normalizedInput.solar)} · {birth.input.unknownTime?'시간 미상':'시각 입력됨'}</p><div className="action-row"><Link prefetch={false} className="button primary" href={`/result/${category.slug}/`}>같은 정보로 {category.name} 보기</Link><button className="button quiet" onClick={clear}>다른 사람 보기</button></div></section>}
    <BirthForm key={birth?'existing':'empty'} category={category}/>
  </>;
  const names=category.system==='zodiac'?zodiacNames:category.system==='constellation'?constellationNames:['A','B','O','AB','모름'];
  const proposed=category.system==='zodiac'&&birth?String(((birth.calculation.normalizedInput.lunar.year-4)%12+12)%12):category.system==='constellation'&&birth?String(constellationForDate(birth.calculation.normalizedInput.solar)):null;
  return <section className="form-panel"><h2>{category.system==='zodiac'?'나의 띠를 골라주세요':category.system==='constellation'?'별자리를 골라주세요':'알고 있는 혈액형을 골라주세요'}</h2><p className="form-intro">{category.system==='zodiac'?'한국 음력 설을 기준으로 해요. 생년월일 없이 직접 골라도 돼요.':category.system==='constellation'?'대중적인 양력 날짜표 기준이에요. 경계일은 아래 날짜표로 구분해요.':'혈액형을 소재로 한 가벼운 성향 이야기예요. 모르면 추측하지 않아요.'}</p>
    {proposed!==null&&<button className="button quiet" onClick={()=>setSelection(proposed)}>입력정보로 제안: {names[Number(proposed)]} 선택</button>}
    <fieldset className="light-fieldset"><legend className="sr-only">{category.name} 유형 선택</legend><div className={`light-select${category.system==='constellation'?' constellation-select':''}`}>{names.map((name,i)=>{
      const value=category.system==='bloodType'?name:String(i);
      return <label className="light-choice" key={name}><input type="radio" name="light-sign" value={value} checked={selection===value} onChange={()=>{setSelection(value);setUnknown(false);}}/><span>{category.system==='bloodType'&&name!=='모름'?`${name}형`:name}{category.system==='constellation'&&<small>{constellationRanges[i]}</small>}</span></label>;
    })}</div></fieldset>
    {unknown&&<p className="result-limitation" role="status">혈액형은 추측하지 않아요. 생년월일로 보는 <Link prefetch={false} href="/fortune/personality/" className="inline-link">성격풀이</Link>나 <Link prefetch={false} href="/fortune/zodiac/" className="inline-link">띠별운세</Link>를 이용해 보세요.</p>}
    <button className="button primary wide" disabled={!selection} onClick={()=>{if(selection==='모름'){setUnknown(true);return;}setLight(category.slug,selection);router.push(`/result/${category.slug}/`);}}>{category.name} 보기 <span aria-hidden="true">→</span></button>
    <p className="policy-note">이 메뉴는 사주팔자 계산과 별도의 읽을거리예요. 유형이 실제 능력이나 미래를 결정하지 않아요.</p>
  </section>;
}
