'use client';
import type { AdvancedOptions } from '@/domain/advanced/types';
import { cities } from '@/content/advanced/cities';
import { timePolicyNames } from '@/domain/advanced/time';
export function AdvancedControls({value,onChange,alwaysEnabled=false}:{value:AdvancedOptions;onChange:(v:AdvancedOptions)=>void;alwaysEnabled?:boolean}){
 return <fieldset className="advanced-controls"><legend>출생 사주 계산 기준 <span className="optional">선택</span></legend>
 {!alwaysEnabled&&<label className="check-label"><input type="checkbox" checked={value.enabled} onChange={e=>onChange({...value,enabled:e.target.checked})}/>지장간·대운·5년 세운까지 보기</label>}
 {value.enabled&&<><label>출생 도시<select aria-label="출생 도시" value={value.cityId??''} onChange={e=>onChange({...value,cityId:e.target.value||undefined})}><option value="">도시 모름·미선택</option>{cities.map(c=><option value={c.id} key={c.id}>{c.name}</option>)}</select></label><p className="helper">한국 출생 기준이며 도시 중심의 편집 좌표를 써요. 경기도처럼 넓은 지역명은 특정 도시로 바꾸지 않아요. 주소나 위치 권한은 필요 없어요.</p>
 <label>시각 기준<select aria-label="시각 기준" value={value.timePolicy} onChange={e=>onChange({...value,timePolicy:e.target.value as AdvancedOptions['timePolicy']})}>{Object.entries(timePolicyNames).map(([v,label])=><option key={v} value={v}>{label}</option>)}</select></label>
 {value.timePolicy!=='standard'&&!value.cityId&&<p className="result-limitation">도시를 선택하지 않으면 태양시를 확정하지 않고 표준시 결과를 보여드려요.</p>}
 <label>전통 대운 순역 분류<select aria-label="전통 대운 순역 분류" value={value.luckClass??''} onChange={e=>onChange({...value,luckClass:(e.target.value||undefined) as AdvancedOptions['luckClass']})}><option value="">선택 안 함 · 순·역 후보 함께 보기</option><option value="male">전통 남성 분류</option><option value="female">전통 여성 분류</option></select></label><p className="helper">연간 음양과 함께 대운의 순·역행에만 써요. 실제 성격·성별 정체성·관계 선호를 판단하지 않아요. 시간 미상은 개시일이 미확정이에요.</p></>}
 </fieldset>;
}
