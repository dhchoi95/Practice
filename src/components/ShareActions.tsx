'use client';
import { useState } from 'react';
import { shareCategory } from '@/lib/sharing';
import { siteConfig,type Slug } from '@/config/site';
export function ShareActions({slug}:{slug:Slug}) {
  const [message,setMessage]=useState(''),[url,setUrl]=useState(''),[pending,setPending]=useState(false);
  async function share(){
    setPending(true);
    const link=new URL(`/fortune/${slug}/`,siteConfig.url||window.location.origin).href;
    const result=await shareCategory(link,`${siteConfig.name} 운세 메뉴`);
    setMessage({shared:'운세 메뉴를 공유했어요.',copied:'일반 메뉴 링크를 복사했어요.',cancelled:'공유를 취소했어요.',manual:'링크를 선택해 직접 복사하거나 길게 눌러 복사해 주세요.'}[result]);
    setUrl(result==='manual'?link:'');setPending(false);
  }
  return <section className="share-panel no-print"><div className="action-row"><button className="button" onClick={share} disabled={pending}>이 운세 메뉴 공유하기 <span aria-hidden="true">↗</span></button><button className="button quiet" onClick={()=>{if(typeof window.print==='function')window.print();else setMessage('브라우저 메뉴의 인쇄 기능을 이용해 주세요.');}}>결과 인쇄하기</button></div><p>생년월일과 개인 결과는 링크에 포함되지 않아요.<br/>받는 사람에게는 이 운세의 시작 화면이 열려요.</p><p role="status" className="status-message">{message}</p>{url&&<label className="helper">직접 복사할 메뉴 링크<input className="share-fallback" value={url} readOnly onFocus={e=>e.target.select()}/></label>}</section>;
}
