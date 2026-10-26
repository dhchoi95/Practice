'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import AdvancedExperience from './AdvancedExperience';
import type {BirthInput} from '@/domain/saju/types';
import {useSession} from './SessionProvider';
import SectorExperience from './SectorExperience';
export function NewYearExperience({input,today}:{input:BirthInput;today:string}){
 const router=useRouter(),{queryYear,setQueryYear,clear}=useSession(),year=queryYear??Math.min(2050,Number(today.slice(0,4))+1);
 return <section aria-label="신년운세"><h2>{year}년 신년운세</h2><label className="new-year-selector no-print">운세를 볼 연도<select aria-label="운세를 볼 연도" value={year} onChange={e=>setQueryYear(Number(e.target.value))}>{Array.from({length:89},(_,i)=>1962+i).map(y=><option value={y} key={y}>{y}년</option>)}</select></label><p>선택한 해의 1월부터 12월까지 운세를 살펴봐요.</p><SectorExperience input={input} category="saju" today={today} selectedYear={year}/><details className="disclosure"><summary>타고난 성향과 대운</summary><AdvancedExperience input={input} category="saju" today={today} embedded startYear={year}/></details><div className="action-row no-print"><Link className="button" href="/fortune/saju/">입력 수정</Link><button className="button" onClick={()=>{clear();router.push('/fortune/saju/');}}>다른 사람 보기</button></div><button className="clear-link no-print" onClick={()=>{clear();router.push('/');}}>입력 지우기</button></section>;
}
