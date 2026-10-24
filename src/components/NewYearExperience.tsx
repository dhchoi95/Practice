'use client';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {CalculationDetails} from './CalculationDetails';
import AdvancedExperience from './AdvancedExperience';
import type {BirthInput} from '@/domain/saju/types';
import {useSession} from './SessionProvider';
import SectorExperience from './SectorExperience';
export function NewYearExperience({input,today}:{input:BirthInput;today:string}){
 const router=useRouter(),{queryYear,setQueryYear,birth,clear}=useSession(),year=queryYear??Math.min(2050,Number(today.slice(0,4))+1);
 return <section aria-label="신년운세"><h2>{year}년 신년운세</h2><label className="new-year-selector no-print">운세를 볼 연도<select aria-label="운세를 볼 연도" value={year} onChange={e=>setQueryYear(Number(e.target.value))}>{Array.from({length:89},(_,i)=>1962+i).map(y=><option value={y} key={y}>{y}년</option>)}</select></label><p>처음에는 한국시간 기준 다음 해를 보여드려요. 선택한 해의 1월부터 12월까지를 다루며, 입춘 전후의 간지년은 나누어 계산해요.</p><SectorExperience input={input} category="saju" today={today} selectedYear={year}/><details className="disclosure"><summary>타고난 사주와 자세한 대운·세운 해설</summary><AdvancedExperience input={input} category="saju" today={today} embedded startYear={year}/></details>{birth&&<details className="disclosure"><summary>기존 표준시 간단 사주표 참고</summary><p>이 참고 표는 한국 표준시 기준이에요. 태양시를 선택했다면 위 원국과 함께 구분해서 읽어주세요.</p><CalculationDetails result={birth.calculation}/></details>}<div className="action-row no-print"><Link className="button" href="/fortune/saju/">입력 수정</Link><button className="button" onClick={()=>{clear();router.push('/fortune/saju/');}}>다른 사람 보기</button></div><button className="clear-link no-print" onClick={()=>{clear();router.push('/');}}>입력 지우기</button></section>;
}
