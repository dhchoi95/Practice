'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import AdvancedExperience from './AdvancedExperience';
import type {BirthInput} from '@/domain/saju/types';
import {useSession} from './SessionProvider';
import SectorExperience from './SectorExperience';
export function NewYearExperience({input,today}:{input:BirthInput;today:string}){
 const router=useRouter(),{queryYear,setQueryYear,clear}=useSession(),nextYear=Number(today.slice(0,4))+1,year=queryYear??Math.min(2050,nextYear);
 return <section aria-label="신년운세"><h2>{year}년 신년운세</h2><label className="new-year-selector no-print">운세를 볼 연도<select aria-label="운세를 볼 연도" value={year} onChange={e=>setQueryYear(Number(e.target.value))}>{Array.from({length:89},(_,i)=>1962+i).map(y=><option value={y} key={y}>{y}년</option>)}</select></label>{queryYear===null&&nextYear>2050&&<p role="status">신년운세는 2050년까지 볼 수 있어요. 다음 해인 {nextYear}년은 지원하지 않아 2050년을 보여드려요. 다른 연도를 보고 싶다면 위에서 골라주세요.</p>}<p>선택한 해의 1월부터 12월까지 운세를 살펴봐요.</p><SectorExperience input={input} category="saju" today={today} selectedYear={year}/><details className="disclosure"><summary>타고난 성향과 대운</summary><AdvancedExperience input={input} category="saju" today={today} embedded startYear={year}/></details><div className="action-row no-print"><Link className="button" href="/fortune/saju/">입력 수정</Link><button className="button" onClick={()=>{clear();router.push('/fortune/saju/');}}>다른 사람 보기</button></div><button className="clear-link no-print" onClick={()=>{clear();router.push('/');}}>입력 지우기</button></section>;
}
