import {selectManuscripts} from '@/domain/advanced/modules';
import {natalModules} from '@/content/advanced/natal';
import { lifeStage } from '@/domain/advanced/life-stage';
import type { AdvancedChart,Position } from '@/domain/advanced/types';
import { hiddenFor } from '@/domain/advanced/mappings';
import { stemNames,stemHanja,stemElements,branchNames,branchHanja,branchElements,tenGod } from '@/domain/saju/tables';
const columns:{key:Position;name:string}[]=[{key:'hour',name:'시주'},{key:'day',name:'일주'},{key:'month',name:'월주'},{key:'year',name:'년주'}];
export function NatalChart({chart}:{chart:AdvancedChart}){
 const dm=chart.pillars.day?.stem??null;
 const reading=selectManuscripts(natalModules,chart.facts,'natal').applied.filter(r=>['overview','strength'].includes(r.role));
 return <section className="natal-overview" aria-label="출생 사주 원국"><h2>내 사주 원국</h2><table className="natal-table"><caption className="sr-only">출생 사주. 왼쪽부터 시주, 일주, 월주, 년주. 선택한 조회 날짜와는 별개예요.</caption>
 <thead><tr><th scope="col"><span className="sr-only">항목</span></th>{columns.map(c=><th scope="col" key={c.key} className={c.key==='day'?'natal-self':''}>{c.name}{c.key==='day'&&<small>나</small>}</th>)}</tr></thead>
 <tbody>
 <tr><th scope="row">천간<br/>십신</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key}>{!p?'미확정':c.key==='day'?'일간 · 나':dm===null?'미확정':tenGod(dm,p.stem)}</td>;})}</tr>
 <tr className="natal-characters"><th scope="row">천간</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key} data-pillar={c.key} data-row="stem">{p?<div className={`element-cell element-${stemElements[p.stem]}`}><strong lang="zh">{stemHanja[p.stem]}</strong><span>{stemNames[p.stem]}</span><small>{p.stem%2===0?'양':'음'} · {stemElements[p.stem]}</small></div>:<span className="natal-unknown">{c.key==='hour'?'시간 모름':'미확정'}</span>}</td>;})}</tr>
 <tr className="natal-characters"><th scope="row">지지</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key} data-pillar={c.key} data-row="branch">{p?<div className={`element-cell element-${branchElements[p.branch]}`}><strong lang="zh">{branchHanja[p.branch]}</strong><span>{branchNames[p.branch]}</span><small>{p.branch%2===0?'양':'음'} · {branchElements[p.branch]}</small></div>:<span className="natal-unknown">미확정</span>}</td>;})}</tr>
 <tr><th scope="row">지지<br/>십신</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key}>{p?hiddenFor(p.branch,dm)[0].god??'미확정':'미확정'}</td>;})}</tr>
 <tr><th scope="row">지장간</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key} data-pillar={c.key} data-row="hidden">{p?hiddenFor(p.branch,dm).map(h=><span className="hidden-stem" key={h.stem}>{stemHanja[h.stem]}<small>{stemNames[h.stem]}</small></span>):'미확정'}</td>;})}</tr>
 <tr><th scope="row">12<br/>운성</th>{columns.map(c=><td className="natal-stage" key={c.key}>{lifeStage(dm,chart.pillars[c.key]?.branch??null)??'미확정'}</td>)}</tr>
 </tbody></table>
 {reading.length>0&&<details className="disclosure natal-explanation"><summary>만세력 풀이 보기</summary><div className="disclosure-body">{reading.map(r=><section key={r.id}><h3>{r.title}</h3><p data-source-id={r.id}>{r.text}</p></section>)}</div></details>}</section>;
}
