import {selectManuscripts} from '@/domain/advanced/modules';
import {natalModules} from '@/content/advanced/natal';
import { lifeStage } from '@/domain/advanced/life-stage';
import type { AdvancedChart,Position } from '@/domain/advanced/types';
import { hiddenFor } from '@/domain/advanced/mappings';
import { elements,stemNames,stemHanja,stemElements,branchNames,branchHanja,branchElements,tenGod } from '@/domain/saju/tables';
const columns:{key:Position;name:string}[]=[{key:'hour',name:'시주'},{key:'day',name:'일주'},{key:'month',name:'월주'},{key:'year',name:'년주'}];
const elementNames={목:'木',화:'火',토:'土',금:'金',수:'水'};
const elementThemes={목:'성장과 방향',화:'표현과 드러남',토:'유지와 연결',금:'구분과 정리',수:'흐름과 생각'};
function briefSentence(id:string,text:string){
 const sentences=text.match(/[^.!?]+[.!?](?:\s|$)/g)?.map(s=>s.trim())??[text];
 // These records begin with calculation context; their next sentence states the actual reading.
 if(['natal-weak-support','natal-strong-space','natal-balanced-listen','natal-food-wealth','natal-food-kill'].includes(id))return sentences[1]??sentences[0];
 return sentences[0];
}
export function NatalChart({chart}:{chart:AdvancedChart}){
 const dm=chart.pillars.day?.stem??null;
 const reading=selectManuscripts(natalModules,chart.facts,'natal').applied;
 const known=Object.values(chart.pillars).filter(p=>p!==null);
 const counts=Object.fromEntries(elements.map(e=>[e,known.reduce((n,p)=>n+Number(stemElements[p.stem]===e)+Number(branchElements[p.branch]===e),0)])) as Record<typeof elements[number],number>;
 const total=known.length*2;
 const missingKnownHour=!chart.input.unknownTime&&!chart.pillars.hour;
 const summaries=[{role:'career',label:'직업·일',icon:'M3 7h18v13H3z M8 7V4h8v3 M3 12h18'},{role:'money',label:'재물',icon:'M3 6h17v14H3z M3 9h18v7h-6a3 3 0 0 1 0-6h6 M16 13h1'},{role:'love',label:'연애·관계',icon:'M12 20S3 15 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 11-9 11z'},{role:'relationships',label:'대인관계',icon:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0'}] as const;
 return <section className="natal-overview" aria-label="출생 사주 원국"><h2>내 사주 원국</h2><table className="natal-table"><caption className="sr-only">출생 사주. 왼쪽부터 시주, 일주, 월주, 년주. 선택한 조회 날짜와는 별개예요.</caption>
 <thead><tr><th scope="col"><span className="sr-only">항목</span></th>{columns.map(c=><th scope="col" key={c.key} className={c.key==='day'?'natal-self':''}>{c.name}{c.key==='day'&&<small>나</small>}</th>)}</tr></thead>
 <tbody>
 <tr><th scope="row">천간<br/>십신</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key}>{!p?'미확정':c.key==='day'?'일간 · 나':dm===null?'미확정':tenGod(dm,p.stem)}</td>;})}</tr>
 <tr className="natal-characters"><th scope="row">천간</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key} data-pillar={c.key} data-row="stem">{p?<div className={`element-cell element-${stemElements[p.stem]}`}><strong lang="zh">{stemHanja[p.stem]}</strong><span>{stemNames[p.stem]}</span><small>{p.stem%2===0?'양':'음'} · {stemElements[p.stem]}</small></div>:<span className="natal-unknown">{c.key==='hour'&&chart.input.unknownTime?'시간 모름':'미확정'}</span>}</td>;})}</tr>
 <tr className="natal-characters"><th scope="row">지지</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key} data-pillar={c.key} data-row="branch">{p?<div className={`element-cell element-${branchElements[p.branch]}`}><strong lang="zh">{branchHanja[p.branch]}</strong><span>{branchNames[p.branch]}</span><small>{p.branch%2===0?'양':'음'} · {branchElements[p.branch]}</small></div>:<span className="natal-unknown">미확정</span>}</td>;})}</tr>
 <tr><th scope="row">지지<br/>십신</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key}>{p?hiddenFor(p.branch,dm)[0].god??'미확정':'미확정'}</td>;})}</tr>
 <tr><th scope="row">지장간</th>{columns.map(c=>{const p=chart.pillars[c.key];return <td key={c.key} data-pillar={c.key} data-row="hidden">{p?hiddenFor(p.branch,dm).map(h=><span className="hidden-stem" key={h.stem}>{stemHanja[h.stem]}<small>{stemNames[h.stem]}</small></span>):'미확정'}</td>;})}</tr>
 <tr><th scope="row">12<br/>운성</th>{columns.map(c=><td className="natal-stage" key={c.key}>{lifeStage(dm,chart.pillars[c.key]?.branch??null)??'미확정'}</td>)}</tr>
 </tbody></table>
 {missingKnownHour&&<p className="error-summary" role="alert">태어난 시간을 입력했지만 시주를 계산하지 못했어요. 출생정보를 다시 확인해 주세요.</p>}
 <details className="disclosure natal-explanation"><summary>만세력 풀이 보기</summary><div className="disclosure-body">
 <section><h3>오행 구성표</h3><p>확정된 천간과 지지의 대표 오행을 글자마다 하나씩 세었어요. 확인된 {total}글자 기준이며, 미확정 기둥은 제외했어요.</p>
 <table className="natal-elements-table"><caption className="sr-only">확정된 원국 글자의 대표 오행 구성</caption><thead><tr><th scope="col">오행</th><th scope="col">구성</th><th scope="col">이 사주에서 살펴볼 점</th></tr></thead><tbody>{elements.map(e=><tr key={e}><th scope="row">{e}({elementNames[e]})</th><td>{counts[e]}개</td><td>{counts[e]===0?'확인된 글자에 없어요':`${elementThemes[e]}의 상징을 살펴볼 수 있어요`}</td></tr>)}</tbody></table>
 <p className="helper">글자 수는 오행의 실제 세력과 같지 않아요. 월령·계절·지장간 등을 함께 살펴야 하며, 개수만으로 강약이나 용신을 정하지 않아요.</p></section>
 <section className="natal-brief"><h3>사주 핵심 요약</h3>{dm===null&&<p>일간이 미확정이어서 성향을 요약할 근거가 부족해요.</p>}
 {summaries.map(({role,label,icon})=>{const item=reading.find(r=>r.role===role);return <section className="natal-brief-item" key={role}><h4><svg aria-hidden="true" viewBox="0 0 24 24"><path d={icon} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg> {label}</h4>{item?<><strong>{item.title}</strong><p data-source-id={item.id}>{briefSentence(item.id,item.text)}</p></>:<><strong>풀이 보류</strong><p>확인된 원국으로 이 분야를 풀이할 근거가 부족해요.</p></>}</section>;})}</section>
 <p className="helper">이 내용은 전통 명리의 상징을 참고한 원국 해석이며, 미래의 사건이나 실제 성격을 확정하지 않아요.</p>
 </div></details></section>;
}
