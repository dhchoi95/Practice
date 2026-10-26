'use client';
import { createContext,useContext,useState,useMemo,type ReactNode } from 'react';
import {generalSession,hasLegacyCorrection} from '@/domain/fortune/general-policy';
import type { BirthInput,SajuCalculationResult } from '@/domain/saju/types';
export interface BirthSession {input:BirthInput;calculation:SajuCalculationResult}
interface Session {birth:BirthSession|null;queryYear:number|null;setQueryYear:(v:number)=>void;pair:[BirthSession|null,BirthSession|null];setPair:(i:0|1,v:BirthSession)=>void;setBirth:(v:BirthSession|null)=>void;light:Record<string,string>;setLight:(category:string,value:string)=>void;clear:()=>void}
const Context=createContext<Session|null>(null);
export function SessionProvider({children}:{children:ReactNode}) {
  const [rawBirth,setBirth]=useState<BirthSession|null>(null);
  const [light,setLightState]=useState<Record<string,string>>({});
  const [queryYear,setQueryYear]=useState<number|null>(null),[rawPair,setPairState]=useState<[BirthSession|null,BirthSession|null]>([null,null]);
  const birth=useMemo(()=>generalSession(rawBirth),[rawBirth]);
  const pair=useMemo(()=>rawPair.map(p=>generalSession(p)) as [BirthSession|null,BirthSession|null],[rawPair]);
  const [noticeDismissed,dismissNotice]=useState(false);
  const migrated=!!(rawBirth&&hasLegacyCorrection(rawBirth.input))||rawPair.some(p=>p&&hasLegacyCorrection(p.input));
  const clear=()=>{setBirth(null);setLightState({});setQueryYear(null);setPairState([null,null]);};
  return <Context.Provider value={{birth,setBirth,queryYear,setQueryYear,pair,setPair:(i,v)=>setPairState(p=>i===0?[v,p[1]]:[p[0],v]),light,setLight:(key,v)=>setLightState(p=>({...p,[key]:v})),clear}}>{migrated&&!noticeDismissed&&<aside className="wrap result-limitation" role="status">시간 보정 설정을 제공하지 않게 되어 한국 표준시로 다시 계산했어요. 원국과 풀이에 함께 적용했어요. <button className="button" onClick={()=>dismissNotice(true)}>확인</button></aside>}{children}</Context.Provider>;
}
export function useSession(){const v=useContext(Context);if(!v)throw new Error('SessionProvider가 필요합니다.');return v;}
