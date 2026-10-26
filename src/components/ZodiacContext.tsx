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
 return <section className="practical-panel"><h2>선택 띠와 오늘 일지의 관계</h2><p>선택한 {branchNames[index]}지 · {date}의 {branchNames[day.branch]}일지</p><p>{relations.length?relations.map(r=>r.kind).join(' · '):'따로 설명할 합·충이 나타나지 않았어요.'}</p><p className="helper">띠와 오늘 날짜만 비교한 참고예요. 개인 사주나 실제 사건을 예측한 결과는 아니에요.</p></section>;
}
