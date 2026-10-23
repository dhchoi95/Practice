import type { SectorReading } from '@/domain/foundation/engine';
import { domainNames,type Domain } from '@/domain/foundation/types';
const order:Domain[]=['overall','money','love','business','health','study'];
const point=(i:number,r:number)=>{const angle=(-90+i*60)*Math.PI/180;return [170+Math.cos(angle)*r,160+Math.sin(angle)*r] as const;};
export function SectorRadar({reading}:{reading:SectorReading}){
 const complete=order.every(d=>reading.sectors[d].score!==null);
 return <section className="sector-radar" aria-label="여섯 분야 참고 지수"><h2>여섯 분야 한눈에 보기</h2><svg viewBox="0 0 340 330" role="group" aria-labelledby="radar-title radar-desc"><title id="radar-title">여섯 분야 레이더 그래프</title><desc id="radar-desc">{complete?order.map(d=>`${domainNames[d]} ${reading.sectors[d].score}`).join(', '):'일간 미확정으로 지수를 산출하지 않았어요. 결측값을 0으로 표시하지 않아요.'} 0부터 100까지의 서비스 참고 지수이며 사건의 확률이 아니에요.</desc>
 {[25,50,75,100].map(v=><polygon key={v} points={order.map((_,i)=>point(i,v*1.05).join(',')).join(' ')} fill="none" stroke="#b5b9b1" strokeWidth="1"/>)}
 {order.map((d,i)=>{const [x,y]=point(i,105),[tx,ty]=point(i,139);return <g key={d}><line x1="170" y1="160" x2={x} y2={y} stroke="#c6c8c0"/><a href={`#sector-${d}`} aria-label={`${domainNames[d]} 본문으로 이동`}><rect x={tx-44} y={ty-28} width="88" height="56" fill="transparent"/><text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill="#273a33" fontSize="18" fontWeight="600">{domainNames[d]}</text></a></g>;})}
 {complete?<polygon data-testid="radar-shape" points={order.map((d,i)=>point(i,reading.sectors[d].score!*1.05).join(',')).join(' ')} fill="#14806a" fillOpacity=".23" stroke="#126b59" strokeWidth="2"/>:<text x="170" y="164" textAnchor="middle" fill="#273a33" fontSize="18">산출 보류</text>}</svg>
 <dl className="sector-index-list">{order.map(d=><div key={d}><dt><a href={`#sector-${d}`}>{domainNames[d]}</a></dt><dd><strong>{reading.sectors[d].score??'—'}</strong><span>{reading.sectors[d].band}</span></dd></div>)}</dl>
 <details className="disclosure"><summary>참고 지수는 어떻게 읽나요?</summary><div className="disclosure-body"><p>높은 값은 활용할 요소가 많은 해석, 낮은 값은 준비와 조율을 먼저 살피는 해석이에요. 0~100 범위를 5 단위로 표시해요. 70 이상은 활용, 55~65는 활용과 조율, 40~50은 준비와 조율, 35 이하는 범위를 줄여 살피는 구간이에요.</p><p>전통 공인 점수나 사건의 확률이 아니에요. 건강운도 몸 상태나 질병 확률이 아닌 생활 관리의 참고값이에요. 총운은 다른 다섯 분야의 동일 가중 평균이에요. 월·연은 실제 구간 길이로 가중 평균한 뒤 반올림해요. 미확정은 0으로 채우지 않아요.</p></div></details></section>;
}
