import type { AdvancedChart,Position } from '@/domain/advanced/types';
import { hiddenFor,hiddenPolicy } from '@/domain/advanced/mappings';
import { stemNames,stemHanja,stemElements,branchNames,branchHanja,branchElements,tenGod } from '@/domain/saju/tables';
const columns:{key:Position;name:string}[]=[{key:'hour',name:'시주'},{key:'day',name:'일주'},{key:'month',name:'월주'},{key:'year',name:'년주'}];
export function NatalChart({chart}:{chart:AdvancedChart}){
 const dm=chart.pillars.day?.stem??null;
 return <section className="natal-overview" aria-label="출생 사주 원국"><h2>내 사주 원국</h2><table className="natal-table"><caption className="sr-only">출생 사주. 왼쪽부터 시주, 일주, 월주, 년주. 선택한 조회 날짜와는 별개예요.</caption>
 <thead><tr><th scope="col"><span className="sr-only">항목</span></th>{columns.map(c=><th scope="col" key={c.key} className={c.key==='day'?'natal-self':''}>{c.name}{c.key==='day'&&<small>나</small>}</th>)}</tr></thead>
 <tbody>
 <tr><th scope="row">천간<br/>십신</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key}>{!p?'미확정':c.key==='day'?'일간 · 나':dm===null?'미확정':tenGod(dm,p.stem)}</td>;})}</tr>
 <tr className="natal-characters"><th scope="row">천간</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key} data-pillar={c.key} data-row="stem">{p?<div className={`element-cell element-${stemElements[p.stem]}`}><strong lang="zh">{stemHanja[p.stem]}</strong><span>{stemNames[p.stem]}</span><small>{p.stem%2===0?'양':'음'} · {stemElements[p.stem]}</small></div>:<span className="natal-unknown">{c.key==='hour'?'시간 모름':'미확정'}</span>}</td>;})}</tr>
 <tr className="natal-characters"><th scope="row">지지</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key} data-pillar={c.key} data-row="branch">{p?<div className={`element-cell element-${branchElements[p.branch]}`}><strong lang="zh">{branchHanja[p.branch]}</strong><span>{branchNames[p.branch]}</span><small>{p.branch%2===0?'양':'음'} · {branchElements[p.branch]}</small></div>:<span className="natal-unknown">미확정</span>}</td>;})}</tr>
 <tr><th scope="row">지지<br/>십신</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key}>{p?hiddenFor(p.branch,dm)[0].god??'미확정':'미확정'}</td>;})}</tr>
 <tr><th scope="row">지장간</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key} data-pillar={c.key} data-row="hidden">{p?hiddenFor(p.branch,dm).map(h=><span className="hidden-stem" key={h.stem}>{stemHanja[h.stem]}<small>{stemNames[h.stem]}</small></span>):'미확정'}</td>;})}</tr>
 </tbody></table><p className="helper">지지 십신은 본기 기준이에요. 날짜를 바꿔도 출생 원국은 그대로예요.</p>
 <details className="disclosure natal-explanation"><summary>만세력 풀이 보기</summary><div className="disclosure-body"><p>천간과 지지는 출생 시각을 네 기둥으로 나타낸 글자예요. 일주의 천간이 일간이며 다른 글자와의 관계를 십신으로 표시해요. 지장간은 각 지지에 배정한 천간이에요.</p><p>지장간은 본기·중기·여기 순으로 표시해요. {hiddenPolicy}의 채택 표를 사용하며, 巳의 보조 순서는 다른 소프트웨어와 차이가 있어 원전 검토를 기다리고 있어요. 12운성·신살·공망은 이번 표에서 지원하지 않아요.</p><p>{chart.time.effective==='standard'?'한국 표준시':chart.time.effective==='mean-solar'?'평균태양시':'진태양시'} 원국이에요. 시각 미상이나 경계에서 확정하지 못한 기둥은 채우지 않았어요.</p></div></details></section>;
}
