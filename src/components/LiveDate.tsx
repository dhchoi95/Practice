'use client';
import { useSyncExternalStore } from 'react';
import { seoulDate } from '@/lib/clock';
function subscribe(callback:()=>void){
  const id=setInterval(callback,60000);
  window.addEventListener('focus',callback);document.addEventListener('visibilitychange',callback);
  return ()=>{clearInterval(id);window.removeEventListener('focus',callback);document.removeEventListener('visibilitychange',callback);};
}
export function useSeoulDate(){return useSyncExternalStore(subscribe,()=>seoulDate(),()=>'');}
export function LiveDate({yearOnly=false}:{yearOnly?:boolean}) {
  const d=useSeoulDate();
  if(!d)return <span className="date-placeholder">{yearOnly?'올해':'한국시간 오늘'}</span>;
  return <span>{yearOnly?`${d.slice(0,4)}년`:d.replaceAll('-','. ')}</span>;
}
