'use client';
import { pillarsAt } from '@/domain/saju/calculate';
import { findRelations } from '@/domain/advanced/relations';
import { branchNames } from '@/domain/saju/tables';
export function ZodiacContext({sign,date}:{sign:string;date:string}){
 const index=Number(sign);if(!Number.isInteger(index)||index<0||index>11)return null;
 const ms=Date.parse(date+'T12:00:00+09:00');if(!Number.isFinite(ms)||Number(date.slice(0,4))<1962||Number(date.slice(0,4))>2050)return null;
 const day=pillarsAt(ms).day;
 // Only branch relations: do not invent a birth-year stem or interpret celestial stems.
 const relations=findRelations([{position:'선택 띠',pillar:{stem:0,branch:index}},{position:'대상 일지',pillar:{stem:0,branch:day.branch}}],'띠·일지').filter(r=>r.kind!=='천간합');
 return <section className="practical-panel"><h2>선택 띠와 오늘 일지의 관계</h2><p>선택한 {branchNames[index]}지 · {date}의 {branchNames[day.branch]}일지</p><p>{relations.length?relations.map(r=>r.kind+' 대응').join(' · '):'채택한 대응표에서 추가 관계가 없어요.'}</p><p className="helper">한국시간 정오의 일지와 선택한 띠만 비교한 거친 분류예요. 전체 출생 사주·합화·좋고 나쁜 사건을 판단하지 않아요. 위 날짜별 생활 글은 이 관계에서 계산한 예측이 아니에요.</p></section>;
}
