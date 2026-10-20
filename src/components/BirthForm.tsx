'use client';
import { useRef,useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Category } from '@/config/site';
import { useSession } from './SessionProvider';
import { InputError } from '@/lib/validation';
import { useSeoulDate } from './LiveDate';
import { useHydrated } from '@/lib/hydration';
export function BirthForm({category}:{category:Category}) {
  const {birth,setBirth}=useSession(),router=useRouter(),form=useRef<HTMLFormElement>(null);
  const [calendar,setCalendar]=useState<'solar'|'lunar'>(birth?.input.calendar??'solar');
  const [unknown,setUnknown]=useState(birth?.input.unknownTime??true);
  const [error,setError]=useState<{message:string;field:string}|null>(null),[pending,setPending]=useState(false);
  const today=useSeoulDate();
  const hydrated=useHydrated();
  const initial=birth?.input;
  const inlineError=(fields:string[],id:string)=>error&&fields.includes(error.field)?<p className="field-error" id={id}>{error.message}</p>:null;
  const errorAttrs=(field:string)=>error?.field===field?{'aria-invalid':true as const,'aria-describedby':['year','month','day'].includes(field)?'date-error':['hour','minute'].includes(field)?'time-error':'nickname-error'}:{};
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();if(pending)return;setError(null);setPending(true);
    const data=new FormData(event.currentTarget);
    const number=(field:string)=>String(data.get(field)??'').trim()===''?NaN:Number(data.get(field));
    try{
      const {calculateSaju}=await import('@/domain/saju/calculate');
      const {validateBirth}=await import('@/lib/validation');
      const input=validateBirth({calendar,leap:calendar==='lunar'&&data.get('leap')==='on',unknownTime:unknown,
        year:number('year'),month:number('month'),day:number('day'),
        hour:unknown?undefined:number('hour'),minute:unknown?undefined:number('minute'),
        nickname:String(data.get('nickname')||'')});
      const calculation=calculateSaju(input);
      setBirth({input,calculation});router.push(`/result/${category.slug}/`);
    }catch(e){
      const field=e instanceof InputError?e.field:(e instanceof Error&&e.message.includes('시각')?'hour':'day');
      setError({message:e instanceof Error?e.message:'계산을 마치지 못했어요. 날짜를 확인하고 다시 시도해 주세요.',field});
      requestAnimationFrame(()=>form.current?.querySelector<HTMLInputElement|HTMLSelectElement>(`[name="${field}"]`)?.focus());
    }finally{setPending(false);}
  }
  return <div className="form-panel"><h2>나의 출생정보</h2><p className="form-intro">아는 정보만 정확하게 입력해 주세요. 이름은 없어도 괜찮아요.</p>
    <form className="birth-form" ref={form} onSubmit={submit} noValidate>
      <label className="field-label" htmlFor="nickname">이름 또는 별명 <span className="optional">선택 · 계산에 사용하지 않아요</span></label><input id="nickname" name="nickname" maxLength={20} placeholder="비워두어도 괜찮아요" autoComplete="off" defaultValue={initial?.nickname??''} {...errorAttrs('nickname')}/>{inlineError(['nickname'],'nickname-error')}
      <fieldset><legend>달력 종류</legend><div className="choice-row">{[['solar','양력'],['lunar','음력']].map(([v,label])=><label className="radio-choice" key={v}><input type="radio" name="calendar" value={v} checked={calendar===v} onChange={()=>{setCalendar(v as 'solar'|'lunar');setError(null);}}/>{label}</label>)}</div><p className="helper" id="calendar-help">종류를 바꾸면 입력한 숫자를 선택한 달력의 날짜로 읽어요. 숫자를 자동 변환하지 않아요.</p>{calendar==='lunar'&&<label className="check-label"><input type="checkbox" name="leap" defaultChecked={initial?.leap??false}/>윤달 생일이에요</label>}</fieldset>
      <fieldset aria-describedby="date-help"><legend>생년월일 <span className="optional">필수</span></legend><div className="date-fields"><label htmlFor="year">태어난 연도<input id="year" name="year" type="text" inputMode="numeric" maxLength={4} placeholder="예: 1990" defaultValue={initial?.year??''} autoComplete="off" required {...errorAttrs('year')}/></label><label htmlFor="month">월<select id="month" name="month" defaultValue={initial?.month??''} required {...errorAttrs('month')}><option value="" disabled>월 선택</option>{Array.from({length:12},(_,i)=><option value={i+1} key={i}>{i+1}월</option>)}</select></label><label htmlFor="day">일<input id="day" name="day" type="text" inputMode="numeric" maxLength={2} placeholder="예: 15" defaultValue={initial?.day??''} autoComplete="off" required {...errorAttrs('day')}/></label></div>{inlineError(['year','month','day'],'date-error')}<p className="helper" id="date-help">변환한 양력 기준 1962.01.01 ~ {today?today.replaceAll('-','.'):'한국시간 오늘'}까지 지원해요.</p></fieldset>
      <fieldset aria-describedby="time-help"><legend>태어난 시각</legend><label className="check-label"><input name="unknownTime" type="checkbox" checked={unknown} onChange={e=>setUnknown(e.target.checked)}/>시간 모름</label><div className="time-fields"><label htmlFor="hour">시 (0~23)<input id="hour" name="hour" type="text" inputMode="numeric" maxLength={2} placeholder="시" disabled={unknown} defaultValue={initial?.hour??''} {...errorAttrs('hour')}/></label><span aria-hidden="true">:</span><label htmlFor="minute">분 (0~59)<input id="minute" name="minute" type="text" inputMode="numeric" maxLength={2} placeholder="분" disabled={unknown} defaultValue={initial?.minute??''} {...errorAttrs('minute')}/></label></div>{inlineError(['hour','minute'],'time-error')}<p className="helper" id="time-help">태어난 시간을 몰라도 볼 수 있어요.<br/>시간에 따라 달라지는 내용은 제외해요.</p></fieldset>
      <div className="form-divider"/><p className="helper">출생지역은 <strong>한국</strong> 기준이에요. 해외 출생과 진태양시·경도 보정은 지원하지 않아요.</p>
      {error&&<p className="error-summary" id="birth-error" role="alert">{error.message}</p>}
      <p className="form-privacy"><span aria-hidden="true">◇</span>입력정보는 서버에 보내지 않아요. 새로고침하면 사라져요.</p>
      <button className="button primary wide form-submit" type="submit" disabled={pending||!hydrated}>{pending?'계산하고 있어요…':`무료로 ${category.name} 보기`}<span aria-hidden="true">→</span></button>
      <noscript><p className="error-summary">브라우저 안에서 계산하려면 자바스크립트가 필요해요. 브라우저 설정에서 허용한 뒤 다시 열어 주세요. 입력정보를 서버로 제출하지 않아요.</p></noscript>
      <p className="policy-note">한국 출생·표준시 기준 / 날짜 변경 0시 기준<br/><Link prefetch={false} href="/guide/">계산 기준과 서비스 한계 알아보기</Link></p>
    </form></div>;
}
