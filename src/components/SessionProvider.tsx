'use client';
import { createContext,useContext,useState,type ReactNode } from 'react';
import type { BirthInput,SajuCalculationResult } from '@/domain/saju/types';
export interface BirthSession {input:BirthInput;calculation:SajuCalculationResult}
interface Session {birth:BirthSession|null;queryYear:number|null;setQueryYear:(v:number)=>void;pair:[BirthSession|null,BirthSession|null];setPair:(i:0|1,v:BirthSession)=>void;setBirth:(v:BirthSession|null)=>void;light:Record<string,string>;setLight:(category:string,value:string)=>void;clear:()=>void}
const Context=createContext<Session|null>(null);
export function SessionProvider({children}:{children:ReactNode}) {
  const [birth,setBirth]=useState<BirthSession|null>(null);
  const [light,setLightState]=useState<Record<string,string>>({});
  const [queryYear,setQueryYear]=useState<number|null>(null),[pair,setPairState]=useState<[BirthSession|null,BirthSession|null]>([null,null]);
  const clear=()=>{setBirth(null);setLightState({});setQueryYear(null);setPairState([null,null]);};
  return <Context.Provider value={{birth,setBirth,queryYear,setQueryYear,pair,setPair:(i,v)=>setPairState(p=>i===0?[v,p[1]]:[p[0],v]),light,setLight:(key,v)=>setLightState(p=>({...p,[key]:v})),clear}}>{children}</Context.Provider>;
}
export function useSession(){const v=useContext(Context);if(!v)throw new Error('SessionProvider가 필요합니다.');return v;}
