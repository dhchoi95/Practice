'use client';
import { createContext,useContext,useState,type ReactNode } from 'react';
import type { BirthInput,SajuCalculationResult } from '@/domain/saju/types';
interface BirthSession {input:BirthInput;calculation:SajuCalculationResult}
interface Session {birth:BirthSession|null;setBirth:(v:BirthSession|null)=>void;light:Record<string,string>;setLight:(category:string,value:string)=>void;clear:()=>void}
const Context=createContext<Session|null>(null);
export function SessionProvider({children}:{children:ReactNode}) {
  const [birth,setBirth]=useState<BirthSession|null>(null);
  const [light,setLightState]=useState<Record<string,string>>({});
  const clear=()=>{setBirth(null);setLightState({});};
  return <Context.Provider value={{birth,setBirth,light,setLight:(key,v)=>setLightState(p=>({...p,[key]:v})),clear}}>{children}</Context.Provider>;
}
export function useSession(){const v=useContext(Context);if(!v)throw new Error('SessionProvider가 필요합니다.');return v;}
