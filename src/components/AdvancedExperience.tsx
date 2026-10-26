'use client';
import Link from 'next/link';
import {useMemo} from 'react';
import type {BirthInput} from '@/domain/saju/types';
import {generalChart} from '@/domain/fortune/general-policy';
import {selectManuscripts} from '@/domain/advanced/modules';
import {natalModules} from '@/content/advanced/natal';
import {pillarLabel} from '@/domain/advanced/mappings';
import {timeText} from '@/domain/advanced/time';
import {BirthSummary} from './BirthSummary';
import {NatalElements} from './NatalElements';
import {NatalChart} from './NatalChart';
export default function AdvancedExperience({input,category,embedded=false}:{input:BirthInput;category:string;today:string;embedded?:boolean;startYear?:number}){
 const result=useMemo(()=>{try{const chart=generalChart(input);return {chart,rows:selectManuscripts(natalModules,chart.facts,'natal').applied,error:null};}catch(e){return {chart:null,rows:[],error:e instanceof Error?e.message:'출생정보를 확인해 주세요.'};}},[input]);
 if(!result.chart)return <p role="alert">{result.error}</p>;
 const {chart}=result,rows=result.rows.filter(r=>!['overview','strength','god-caution'].includes(r.role));
 const luck=input.advanced?.luckClass&&chart.luck.length===1?chart.luck[0]:null;
 return <section className={`advanced-experience${category==='manse'?' manse-experience':''}`} aria-label="자세한 사주 풀이">
 {!embedded&&<><BirthSummary input={input} chart={chart} category={category}/><NatalChart chart={chart}/></>}
 {category==='manse'&&<NatalElements chart={chart}/>}
 {rows.length>0&&<section id="advanced-topics" className="reading-section"><h2>타고난 성향과 생활</h2>{rows.map(r=><section key={r.id}><h3>{r.title}</h3>{r.role==='pattern'&&<p>이 원국의 월지 본기 십신은 {String(chart.facts['pattern.god'])}입니다. 같은 본기가 다른 천간에 {chart.facts['pattern.exposed']?'드러나 있습니다':'드러나 있지는 않습니다'}.</p>}<p data-source-id={r.id}>{r.text}</p></section>)}{chart.facts['known.complete']&&<section><h3>강약에서 살펴보는 용신</h3>{chart.useful.favorableElements.length?<p>이 원국에서는 {chart.useful.favorableElements.join('·')} 쪽을 먼저 살펴볼 수 있습니다. {chart.facts.strength==='strong'?'일간을 더 돕기보다 그 힘을 쓰는 쪽에 무게를 두는 해석입니다.':'일간을 돕고 같은 오행의 뿌리를 받쳐주는 쪽에 무게를 두는 해석입니다.'} 이미 있는 글자의 힘까지 보아야 하므로 용신을 확정한 결과는 아닙니다.</p>:<p>강약이 한쪽으로 뚜렷하게 기울지 않아 특정 오행을 용신으로 정하지 않았습니다.</p>}<p className="helper">용신은 사주 안의 균형을 살피는 말이에요. 특정 색깔이나 물건을 더하면 운이 좋아진다는 뜻은 아니에요.</p></section>}</section>}
 {!chart.facts['known.complete']&&<p className="helper">태어난 시간을 몰라 사주 전체의 강약과 격국은 정하지 않았어요.</p>}
 <details id="advanced-luck" className="disclosure"><summary>대운 보기</summary><div className="disclosure-body">{luck?<><p>대운은 약 10년마다 바뀌는 사주의 흐름이에요. {timeText(luck.start).slice(0,10)}부터 첫 대운이 시작돼요.</p><div className="luck-cards">{luck.cycles.map(c=><article key={c.index}><h3>{c.index}대운 · {pillarLabel(c.pillar)}</h3><p>{timeText(c.start).slice(0,10)}부터<br/>{timeText(c.end).slice(0,10)} 전까지</p></article>)}</div></>:<p>{input.unknownTime?'태어난 시간을 몰라 대운의 시작일을 정할 수 없어요.':'출생정보에서 성별을 선택하면 대운의 방향과 시작일을 볼 수 있어요.'}</p>}</div></details>
 {category==='manse'&&<Link prefetch={false} className="button no-print" href="/result/saju/">이 사주로 신년운세 보기</Link>}
 </section>;
}
