import Link from 'next/link';
import type { SajuCalculationResult } from '@/domain/saju/types';
import { stemNames,stemHanja,stemElements,branchNames,branchHanja,branchElements,elements,tenGod } from '@/domain/saju/tables';
import { isoDate } from '@/domain/calendar/korean';
const keys=['year','month','day','hour'] as const;
export function CalculationDetails({result}:{result:SajuCalculationResult}) {
  const n=result.normalizedInput;
  return <details className="disclosure"><summary>내 사주표와 오행 살펴보기</summary><div className="disclosure-body"><p>양력 {isoDate(n.solar)} / 음력 {isoDate(n.lunar)} {n.lunar.leap?'윤달':'평달'}<br/>한국 출생·표준시 기준 / 날짜 변경 0시 기준</p>{n.standardTime&&<p>계산 표준시: {isoDate(n.standardTime)} {String(n.standardTime.hour).padStart(2,'0')}:{String(n.standardTime.minute).padStart(2,'0')}{n.dstAdjusted?' · 서머타임 보정됨':''}</p>}
    <table className="pillars-table"><caption className="sr-only">연주·월주·일주·시주 순서의 사주표</caption><thead><tr>{['연주','월주','일주 · 나','시주'].map(t=><th key={t} scope="col">{t}</th>)}</tr></thead><tbody><tr>{keys.map(k=>{const p=result.pillars[k];return <td key={k} className={k==='day'?'day-master-cell':''}>{p?<div className="pillar-char"><b>{stemHanja[p.stem]}</b><span>{stemNames[p.stem]} · {stemElements[p.stem]}</span><small>{k==='day'?'일간':result.dayMaster!==null?tenGod(result.dayMaster,p.stem):'십성 미확정'}</small></div>:<span className="pillar-unknown">{k==='hour'?'시간 미상':'미확정'}</span>}</td>;})}</tr><tr>{keys.map(k=>{const p=result.pillars[k];return <td key={k}>{p?<div className="pillar-char"><b>{branchHanja[p.branch]}</b><span>{branchNames[p.branch]} · {branchElements[p.branch]}</span></div>:<span className="pillar-unknown">—</span>}</td>;})}</tr></tbody></table>
    <p><strong>일간</strong>은 나를 해석하는 기준인 일주의 천간이에요. 십성은 일간과 다른 천간의 관계만 표시했어요. 지장간·합충·용신은 계산하지 않아요.</p>
    <h3 className="detail-subtitle">오행의 단순 개수</h3><div className="element-list">{elements.map(e=>{const count=Number(result.features[`elements.${e}`]??0);return <div className="element-row" key={e}><span>{e}</span><span className="element-bar" aria-hidden="true"><i style={{width:`${count/8*100}%`}}/></span><span>{count}개</span></div>;})}</div><p>알려진 <strong>{result.features['natal.knownCount']}글자 기준</strong>이에요. 천간·지지 대표 오행을 각각 한 번씩 세며, 실제 기운의 강약이나 용신을 뜻하지 않아요.</p><p><Link prefetch={false} href="/guide/" className="inline-link">계산 기준 자세히 보기 →</Link></p>
  </div></details>;
}
