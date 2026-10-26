'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './SessionProvider';
import { mbtiTypes,mbtiTopics,mbtiFor,mbtiBasicContent } from '@/content/advanced/mbti';
import { ShareActions } from './ShareActions';
import { useSeoulDate } from './LiveDate';
export function MBTIEntry(){
 const session=useSession(),router=useRouter(),[type,setType]=useState(session.light.mbti??'');
 return <section className="form-panel"><h2>알고 있는 MBTI 유형을 골라주세요</h2><p>유형을 직접 선택해요. 검사 문항을 제공하거나 출생정보로 유형을 추측하지 않아요. 같은 유형과 날짜에는 같은 첫 주제를 보여줘요.</p><fieldset><legend>16유형 선택</legend><div className="light-select">{mbtiTypes.map(t=><label key={t} className="light-choice"><input type="radio" name="mbti" value={t} checked={t===type} onChange={()=>setType(t)}/>{t}</label>)}</div></fieldset><button className="button primary wide" disabled={!type} onClick={()=>{session.setLight('mbti',type);router.push('/result/mbti/');}}>선택한 유형의 글 보기</button><p className="helper">유형을 모르면 선택하지 않아도 돼요. <Link prefetch={false} href="/">다른 메뉴 보기</Link></p></section>;
}
export function MBTIResult(){
 const {light,clear}=useSession(),today=useSeoulDate(),[chosen,setChosen]=useState<number|null>(null);
 // Public editorial schedule, no natal/astronomical claims or per-user hash.
 const index=today?Math.floor(Date.parse(today+'T00:00:00Z')/86400000):0,topic=chosen??[0,2,1,4,3,5,1,0,3,2,5,4,0,5,2,3,4,1,5,3,0,4,1,2,3,1,4,5,2,0,4][((index%31)+31)%31];
 const type=light.mbti;
 if(!type||!mbtiTypes.some(t=>t===type))return <section className="empty-state"><h2>유형을 먼저 선택해 주세요</h2><p>새로고침하면 선택이 사라져요. 유형을 추측하지 않아요.</p><Link prefetch={false} href="/fortune/mbti/" className="button primary">유형 선택하기</Link></section>;
 const row=mbtiFor(type,topic);
 return <><section className="result-hero"><p className="eyebrow">{type} · 유형별 읽을거리</p><h2>{row.title}</h2><p>선택한 유형의 성향과 생활 제안을 살펴봐요.</p></section><section className="mbti-basic reading-section"><h3>{type}를 읽는 출발점</h3><p>{mbtiBasicContent.find(r=>r.type===type)?.text}</p><p className="helper">자기선택 유형을 참고한 편집 설명이에요. 실제 성격·능력을 확인한 결과는 아니에요.</p></section><label className="no-print mbti-topic-control">읽을 주제<select aria-label="읽을 주제" value={topic} onChange={e=>setChosen(Number(e.target.value))}>{mbtiTopics.map((t,i)=><option key={t} value={i}>{t}</option>)}</select></label><section className="reading-section"><h3>{type}와 {row.title}</h3><p>{row.text}</p><p>{row.counterExample}</p></section><Link prefetch={false} className="button" href="/fortune/mbti/">유형 바꾸기</Link><ShareActions slug="mbti"/><button className="clear-link" onClick={clear}>입력 지우기</button><p className="editorial-note">같은 유형과 날짜에는 같은 첫 주제를 보여줘요.</p></>;
}
