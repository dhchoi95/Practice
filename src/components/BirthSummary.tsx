import Link from 'next/link';
import type { BirthInput } from '@/domain/saju/types';
import type { AdvancedChart } from '@/domain/advanced/types';
import {timePolicyNames} from '@/domain/advanced/time';
import {cities} from '@/content/advanced/cities';
export function BirthSummary({input,chart,category}:{input:BirthInput;chart:AdvancedChart;category:string}){
 const {solar,lunar}=chart.compatibility.normalizedInput;
 return <section className="birth-summary" aria-label="출생정보 요약"><h2>{input.nickname?`${input.nickname} 님의 출생정보`:'입력한 출생정보'}</h2><p>양력 {solar.year}.{String(solar.month).padStart(2,'0')}.{String(solar.day).padStart(2,'0')}</p><p>한국 음력 {lunar.year}.{String(lunar.month).padStart(2,'0')}.{String(lunar.day).padStart(2,'0')} · {lunar.leap?'윤달':'평달'}</p><p>{input.unknownTime?'태어난 시간 모름':`입력 시각 ${String(input.hour).padStart(2,'0')}:${String(input.minute).padStart(2,'0')}`}</p><p>{timePolicyNames[chart.time.effective]} · {cities.find(c=>c.id===input.advanced?.cityId)?.name??'도시 미선택'}</p><Link prefetch={false} className="button no-print" href={`/fortune/${category}/`}>출생정보 변경</Link></section>;
}
