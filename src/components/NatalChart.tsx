import {selectManuscripts} from '@/domain/advanced/modules';
import {natalModules} from '@/content/advanced/natal';
import { lifeStage } from '@/domain/advanced/life-stage';
import type { AdvancedChart,Position } from '@/domain/advanced/types';
import { hiddenFor } from '@/domain/advanced/mappings';
import { elements,stemNames,stemHanja,stemElements,branchNames,branchHanja,branchElements,tenGod } from '@/domain/saju/tables';
const columns:{key:Position;name:string}[]=[{key:'hour',name:'시주'},{key:'day',name:'일주'},{key:'month',name:'월주'},{key:'year',name:'년주'}];
const elementNames={목:'木',화:'火',토:'土',금:'金',수:'水'};
const elementThemes={목:'성장과 방향',화:'표현과 드러남',토:'유지와 연결',금:'구분과 정리',수:'흐름과 생각'};
export function NatalChart({chart}:{chart:AdvancedChart}){
 const dm=chart.pillars.day?.stem??null;
 const reading=selectManuscripts(natalModules,chart.facts,'natal').applied;
 const known=Object.values(chart.pillars).filter(p=>p!==null);
 const counts=Object.fromEntries(elements.map(e=>[e,known.reduce((n,p)=>n+Number(stemElements[p.stem]===e)+Number(branchElements[p.branch]===e),0)])) as Record<typeof elements[number],number>;
 const total=known.length*2, max=Math.max(...elements.map(e=>counts[e])), min=Math.min(...elements.map(e=>counts[e]));
 const most=elements.filter(e=>counts[e]===max), least=elements.filter(e=>counts[e]===min);
 const overview=reading.find(r=>r.role==='overview');
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
 <details className="disclosure natal-explanation"><summary>만세력 풀이 보기</summary><div className="disclosure-body">
 <section><h3>오행 구성표</h3><p>확정된 천간과 지지의 대표 오행을 글자마다 하나씩 세었어요. 확인된 {total}글자 기준이며, 미확정 기둥은 제외했어요.</p>
 <table className="natal-elements-table"><caption className="sr-only">확정된 원국 글자의 대표 오행 구성</caption><thead><tr><th scope="col">오행</th><th scope="col">구성</th><th scope="col">이 사주에서 살펴볼 점</th></tr></thead><tbody>{elements.map(e=><tr key={e}><th scope="row">{e}({elementNames[e]})</th><td>{counts[e]}개</td><td>{counts[e]===0?'확인된 글자에 없어요':`${elementThemes[e]}의 상징을 살펴볼 수 있어요`}</td></tr>)}</tbody></table>
 <p className="helper">글자 수는 오행의 실제 세력과 같지 않아요. 월령·계절·지장간 등을 함께 살펴야 하며, 개수만으로 강약이나 용신을 정하지 않아요.</p></section>
 <section><h3>사주 핵심 요약</h3>{total>0?<><p><strong>두드러지는 구성:</strong> 확인된 글자에서는 {most.join('·')}: {max}개로 가장 많아요{most.length>1?' (동률)':''}. {most.map(e=>elementThemes[e]).join('·')}의 상징을 참고할 수 있지만 성격이나 능력을 확정하지는 않아요.</p><p><strong>상대적으로 적은 구성:</strong> {least.join('·')}: {min}개로 가장 적어요{least.length>1?' (동률)':''}. {min===0?'확인된 글자에 없더라도 능력이나 재물이 없다는 뜻은 아니에요.':'숫자가 적다는 것만으로 부족하다고 판단할 수 없어요.'}{total<8?' 미확정 글자가 있어 전체 구성은 달라질 수 있어요.':''}</p></>:<p>확정된 글자가 없어 오행 구성을 비교할 수 없어요.</p>}
 <p><strong>한마디로:</strong> {overview?overview.text:'일간이 미확정이어서 성향을 요약할 근거가 부족해요.'}</p></section>
 {reading.filter(r=>['strength','career','money','love','relationships'].includes(r.role)).map(r=><section key={r.id}><h3>{({strength:'주의해서 살펴볼 점',career:'직업·일',money:'재물',love:'연애·관계',relationships:'관계와 조언'} as Record<string,string>)[r.role]} · {r.title}</h3><p data-source-id={r.id}>{r.text}</p></section>)}
 {!reading.some(r=>['career','money','love','relationships'].includes(r.role))&&<p>직업·재물·관계는 확인된 원국만으로 구체적으로 풀이할 근거가 부족해요.</p>}
 <p className="helper">이 내용은 전통 명리의 상징을 참고한 원국 해석이며, 미래의 사건이나 실제 성격을 확정하지 않아요.</p>
 </div></details></section>;
}
