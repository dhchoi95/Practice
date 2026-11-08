'use client';

import {useEffect, useRef, useState} from 'react';
import {useRouter} from 'next/navigation';
import {useSession} from './SessionProvider';
import {validateBirth} from '@/lib/validation';
import {calculateSaju} from '@/domain/saju/calculate';

const titles=['대운 계산에 사용할 성별을 선택해 주세요','연애·결혼 상태를 선택해 주세요','어떤 일을 하고 계신가요?','생년월일을 입력해 주세요','태어난 시간을 알려 주세요','태어난 지역을 알려 주세요','어떻게 불러드릴까요?'];
const relationships=['싱글','연애 중','기혼','이혼'];
const occupations=['직장인','학생','이직·구직 중','주부','사업가','프리랜서'];

export function GuidedStart(){
 const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),heading=useRef<HTMLHeadingElement>(null);
 const router=useRouter(),session=useSession();
 const [stage,setStage]=useState(-1),[gender,setGender]=useState<'female'|'male'|''>('');
 const [relationship,setRelationship]=useState(''),[occupation,setOccupation]=useState('');
 const [calendar,setCalendar]=useState<'solar'|'lunar'>('solar'),[leap,setLeap]=useState(false);
 const [year,setYear]=useState(''),[month,setMonth]=useState(''),[day,setDay]=useState('');
 const [unknown,setUnknown]=useState(true),[hour,setHour]=useState(''),[minute,setMinute]=useState('');
 const [place,setPlace]=useState(''),[name,setName]=useState(''),[error,setError]=useState('');
 useEffect(()=>{if(dialog.current?.open)heading.current?.focus();},[stage]);
 const close=()=>dialog.current?.close();
 const next=()=>{setError('');setStage(s=>s+1);};
 const previous=()=>{setError('');setStage(s=>s-1);};
 const value=(n:string)=>n.trim()===''?NaN:Number(n);
 const input=(withoutTime=false)=>validateBirth({calendar,leap:calendar==='lunar'&&leap,year:value(year),month:value(month),day:value(day),unknownTime:withoutTime||unknown,hour:withoutTime||unknown?undefined:value(hour),minute:withoutTime||unknown?undefined:value(minute),nickname:name});
 const dateNext=()=>{try{input(true);next();}catch(e){setError(e instanceof Error?e.message:'생년월일을 확인해 주세요.');}};
 const timeNext=()=>{try{const parsed=input();calculateSaju(parsed);next();}catch(e){setError(e instanceof Error?e.message:'태어난 시간을 확인해 주세요.');}};
 const finish=()=>{try{const parsed=input();const calculation=calculateSaju(parsed);session.setBirth({input:{...parsed,advanced:{enabled:true,timePolicy:'standard',...(gender?{luckClass:gender}:{})}},calculation});close();router.push('/result/day/');}catch(e){setError(e instanceof Error?e.message:'입력한 정보를 확인해 주세요.');}};
 const choice=(items:string[],selected:string,set:(v:string)=>void)=> <div className="guided-choices">{items.map(item=><button type="button" key={item} aria-pressed={selected===item} className={selected===item?'selected':''} onClick={()=>set(item)}>{item}</button>)}</div>;
 return <>
  <button ref={trigger} type="button" className="button guided-start-button" onClick={()=>{setStage(-1);setError('');dialog.current?.showModal();}}>사주풀이 시작하기 <span aria-hidden="true">→</span></button>
  <dialog className="guided-dialog" ref={dialog} aria-labelledby="guided-title" onClose={()=>trigger.current?.focus()}>
   <div className="guided-shell">
    <button type="button" className="guided-close" onClick={close} aria-label="닫기">×</button>
    {stage<0?<><h2 id="guided-title" ref={heading} tabIndex={-1}>하루사주와 함께 시작해보시겠어요?</h2><p>몇 가지 질문에 답하면 오늘의 운세를 볼 수 있어요.</p><div className="guided-actions"><button type="button" className="button primary" onClick={()=>setStage(0)}>네, 시작할게요</button><button type="button" className="button" onClick={close}>다음에 할게요</button></div></>:<>
     <p className="guided-progress">{stage+1} / {titles.length}</p><progress value={stage+1} max={titles.length} aria-label="입력 진행 상황"/>
     <h2 id="guided-title" ref={heading} tabIndex={-1}>{titles[stage]}</h2>
     {stage===0&&<><p>성별은 전통 대운의 진행 방향을 계산할 때만 사용해요. 선택하지 않아도 볼 수 있어요.</p><div className="guided-choices">{([['female','여성'],['male','남성']] as const).map(([v,label])=><button type="button" key={v} aria-pressed={gender===v} className={gender===v?'selected':''} onClick={()=>setGender(v)}>{label}</button>)}</div></>}
     {stage===1&&<><p>선택하지 않아도 돼요. 현재 운세 결과에는 반영되지 않아요.</p>{choice(relationships,relationship,setRelationship)}</>}
     {stage===2&&<><p>선택하지 않아도 돼요. 현재 운세 결과에는 반영되지 않아요.</p>{choice(occupations,occupation,setOccupation)}</>}
     {stage===3&&<><fieldset className="guided-fieldset"><legend>달력 종류</legend><div className="choice-row">{([['solar','양력'],['lunar','음력']] as const).map(([v,l])=><label className="radio-choice" key={v}><input type="radio" checked={calendar===v} onChange={()=>setCalendar(v)}/>{l}</label>)}</div>{calendar==='lunar'&&<label className="check-label"><input type="checkbox" checked={leap} onChange={e=>setLeap(e.target.checked)}/>윤달 생일이에요</label>}</fieldset><div className="guided-date"><label>태어난 연도<input inputMode="numeric" maxLength={4} value={year} onChange={e=>setYear(e.target.value)} placeholder="예: 1995"/></label><label>월<select aria-label="월" value={month} onChange={e=>setMonth(e.target.value)}><option value="">선택</option>{Array.from({length:12},(_,i)=><option value={i+1} key={i}>{i+1}월</option>)}</select></label><label>일<input inputMode="numeric" maxLength={2} value={day} onChange={e=>setDay(e.target.value)} placeholder="예: 8"/></label></div><p className="helper">양력으로 변환한 날짜 기준 1962년 1월 1일부터 오늘까지 볼 수 있어요. 달력을 바꿔도 입력 숫자는 그대로예요.</p></>}
     {stage===4&&<><label className="check-label"><input type="checkbox" checked={unknown} onChange={e=>setUnknown(e.target.checked)}/>태어난 시간을 몰라요</label><div className="guided-date guided-time"><label>시 (0~23)<input inputMode="numeric" maxLength={2} disabled={unknown} value={hour} onChange={e=>setHour(e.target.value)} placeholder="시"/></label><label>분 (0~59)<input inputMode="numeric" maxLength={2} disabled={unknown} value={minute} onChange={e=>setMinute(e.target.value)} placeholder="분"/></label></div><p className="helper">시간을 모르면 시주는 제외해요. 날짜나 절입 경계에 따라 다른 기둥도 확정하지 못할 수 있어요.</p></>}
     {stage===5&&<><label className="guided-label">태어난 지역 <span className="optional">선택</span><input value={place} onChange={e=>setPlace(e.target.value)} maxLength={60} placeholder="예: 서울" autoComplete="off"/></label><p className="helper">현재 계산은 한국 표준시를 사용하며, 입력한 지역은 보정이나 결과에 반영되지 않아요.</p></>}
     {stage===6&&<><label className="guided-label">이름 또는 별명 <span className="optional">선택</span><input value={name} onChange={e=>setName(e.target.value)} maxLength={20} autoComplete="off" placeholder="비워두어도 괜찮아요"/></label><p className="helper">이름은 표시할 때만 사용하고 사주 계산에는 쓰지 않아요.</p></>}
     {error&&<p className="error-summary" role="alert">{error}</p>}
     <p className="guided-privacy">입력은 브라우저 메모리에서만 사용하며 새로고침하면 사라져요.</p>
     <div className="guided-actions"><button type="button" className="button primary" onClick={stage===3?dateNext:stage===4?timeNext:stage===6?finish:next}>{stage===6?'하루사주 결과 보기':'계속'}</button>{[0,1,2,5,6].includes(stage)&&<button type="button" className="button" onClick={()=>{if(stage===0)setGender('');if(stage===1)setRelationship('');if(stage===2)setOccupation('');if(stage===5)setPlace('');if(stage===6){setName('');try{const parsed={...input(),nickname:''};const calculation=calculateSaju(parsed);session.setBirth({input:{...parsed,advanced:{enabled:true,timePolicy:'standard',...(gender?{luckClass:gender}:{})}},calculation});close();router.push('/result/day/');}catch(e){setError(e instanceof Error?e.message:'입력한 정보를 확인해 주세요.');}return;}next();}}>건너뛰기</button>}<button type="button" className="button quiet" onClick={previous}>이전</button></div>
    </>}
   </div>
  </dialog>
 </>;
}
