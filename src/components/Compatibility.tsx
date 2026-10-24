'use client';
import Link from 'next/link';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {getCategory,type Category} from '@/config/site';
import {compareBirths} from '@/domain/advanced/compatibility';
import {godMeaning} from '@/domain/advanced/mappings';
import {BirthForm} from './BirthForm';
import {NatalChart} from './NatalChart';
import {useSession} from './SessionProvider';
import {ShareActions} from './ShareActions';
export function CompatibilityEntry({category}:{category:Category}){
 const {pair,setPair}=useSession(),router=useRouter(),[editing,setEditing]=useState<0|1>(pair[0]?1:0);
 return <section className="compatibility-inputs"><h2>두 사람의 출생정보를 따로 입력해 주세요</h2><p>이름은 계산에 쓰지 않아요. 두 원국에서 확인할 수 있는 관계를 비교하며 궁합의 성패나 미래 사건을 판정하지 않아요.</p><div className="action-row">{([0,1] as const).map(i=><button className="button" key={i} onClick={()=>setEditing(i)} aria-pressed={editing===i}>{i===0?'A · 첫 번째 사람':'B · 두 번째 사람'} {pair[i]?'입력됨':'미입력'}</button>)}</div><BirthForm key={editing} category={category} personLabel={editing===0?'A · 첫 번째 사람의 출생정보':'B · 두 번째 사람의 출생정보'} initialBirth={pair[editing]} onComplete={v=>{setPair(editing,v);if(editing===0&&!pair[1])setEditing(1);}}/><button className="button primary wide" disabled={!pair[0]||!pair[1]} onClick={()=>router.push('/result/compatibility/')}>두 사람의 짝궁합 보기</button></section>;
}
export function CompatibilityResult(){
 const {pair,clear}=useSession();
 if(!pair[0]||!pair[1])return <section className="empty-state"><h2>두 사람의 정보가 필요해요</h2><Link className="button" href="/fortune/compatibility/">짝궁합 입력하기</Link></section>;
 let result;try{result=compareBirths(pair[0].input,pair[1].input);}catch{return <p role="alert">출생정보와 계산 설정을 확인해 주세요. <Link href="/fortune/compatibility/">다시 입력하기</Link></p>;}
 return <section aria-label="두 원국 비교"><h2>두 사람의 짝궁합</h2>{result.charts.map((chart,i)=><section key={i}><h3>{i===0?'A · 첫 번째 사람':'B · 두 번째 사람'}{pair[i]?.input.nickname?` · ${pair[i]!.input.nickname}`:''}</h3><NatalChart chart={chart}/>{chart.limitations.map(p=><p className="helper" key={p}>{p}</p>)}</section>)}<section className="reading-section"><h3>서로의 일간에서 읽는 관계</h3>{result.aToB&&result.bToA?<><p>A에서 B를 보면 {result.aToB}, B에서 A를 보면 {result.bToA} 관계입니다. 각각 {godMeaning[result.aToB]}, {godMeaning[result.bToA]}라는 전통적 상징으로 읽습니다.</p><p>같은 행동도 한쪽에게는 도움이 되고 다른 쪽에게는 부담이 될 수 있습니다. 서로 기대하는 역할을 직접 이야기하는 데 참고하십시오.</p></>:<p>한 사람의 일간이 미확정이라 두 일간의 십신 관계를 정하지 않았습니다. 확인된 다른 기둥의 비교만 표시합니다.</p>}</section><section className="reading-section"><h3>두 원국 사이의 합·충 관계</h3>{result.relations.length?result.relations.map(r=><p key={r.id}>{r.positions.join(' ↔ ')} · {r.kind}. {r.kind==='충'?'서로 다른 요구를 조정하는 주제로 읽습니다. 다툼이나 이별을 예측하는 뜻은 아닙니다.':r.kind.includes('합')?'함께 정할 역할과 약속을 살피는 주제로 읽습니다. 실제 호감이나 합화를 확정하지 않습니다.':'기대나 방법의 차이를 살피는 전통 분류입니다. 상대의 의도나 관계의 성패를 판단하지 않습니다.'}</p>):<p>채택한 표에서 두 원국 사이의 추가 관계가 확인되지 않았습니다. 관계가 나쁘거나 인연이 없다는 뜻은 아닙니다.</p>}</section><p className="helper">시주 미상은 자정으로 채우지 않습니다. 합·충의 개수로 궁합 점수를 매기지 않으며, 이 비교만으로 교제·결혼 여부를 결정하지 마십시오.</p><Link className="button no-print" href={`/fortune/${getCategory('compatibility')!.slug}/`}>A 또는 B 정보 변경</Link><ShareActions slug="compatibility"/><button className="clear-link no-print" onClick={clear}>두 사람 입력 지우기</button></section>;
}
