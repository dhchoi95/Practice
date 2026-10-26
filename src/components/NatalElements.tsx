import type {AdvancedChart} from '@/domain/advanced/types';
import {elements,stemElements,branchElements} from '@/domain/saju/tables';
export function NatalElements({chart}:{chart:AdvancedChart}){
 const known=Object.values(chart.pillars).filter(p=>p!==null),total=known.length*2;
 return <section className="reading-section natal-elements"><h2>오행 분포</h2><div className="element-list">{elements.map(e=>{const count=known.reduce((n,p)=>n+Number(stemElements[p.stem]===e)+Number(branchElements[p.branch]===e),0);return <div className="element-row" key={e}><span>{e}</span><span className="element-bar" aria-hidden="true"><i style={{width:`${total?count/total*100:0}%`}}/></span><span>{count}개</span></div>;})}</div><p className="helper">확인된 {total}글자의 분포예요. 개수가 적다고 능력이 부족하거나 물건으로 채워야 한다는 뜻은 아니에요.</p></section>;
}
