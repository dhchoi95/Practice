import { tenGod,stemElements,stemNames,stemHanja,branchNames,branchHanja } from '../saju/tables';
import type { Pillar } from '../saju/types';
/** Main / middle / residual; an adopted table, no hidden-stem day-count command asserted. */
export const hiddenStems:readonly (readonly number[])[]=[ [9],[5,9,7],[0,2,4],[1],[4,1,9],[2,4,6],[3,5],[5,3,1],[6,8,4],[7],[4,7,3],[8,0] ];
export const hiddenLabels=['본기','중기','여기'];
export const hiddenPolicy='HIDDEN-MAIN-1.0';
export function hiddenFor(branch:number,dayStem:number|null){return hiddenStems[branch].map((stem,i)=>({stem,role:hiddenLabels[i],element:stemElements[stem],god:dayStem===null?null:tenGod(dayStem,stem)}));}
export const pillarLabel=(p:Pillar|null)=>p?`${stemNames[p.stem]}${branchNames[p.branch]}(${stemHanja[p.stem]}${branchHanja[p.branch]})`:'미확정';
export const stemLabel=(s:number)=>`${stemNames[s]}${stemHanja[s]}`;
export const godMeaning:Record<ReturnType<typeof tenGod>,string>={비견:'나와 같은 방식으로 힘을 쓰는 관계',겁재:'주도권과 자원을 나누는 관계',식신:'익힌 것을 꾸준히 밖으로 내는 관계',상관:'기존 방식에 질문하고 표현을 바꾸는 관계',편재:'넓게 자원을 연결하고 다루는 관계',정재:'정해진 자원을 꾸준히 관리하는 관계',편관:'압박과 과제를 감당하는 관계',정관:'약속과 역할을 지키는 관계',편인:'다른 관점에서 배우고 해석하는 관계',정인:'배움과 보호를 바탕으로 준비하는 관계'};
