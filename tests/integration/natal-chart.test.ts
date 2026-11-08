import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {NatalChart} from '@/components/NatalChart';
import {calculateAdvanced} from '@/domain/advanced/chart';

const input={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar' as const,leap:false,nickname:''};
const render=(chart:ReturnType<typeof calculateAdvanced>)=>renderToStaticMarkup(createElement(NatalChart,{chart}));

describe('만세력 풀이 오행 구성',()=>{
 it('확정 천간과 지지를 각각 한 번 세어 표에 표시한다',()=>{
  const chart=calculateAdvanced(input), html=render(chart);
  expect(html).toContain('확인된 8글자 기준');
  const counts=[...html.matchAll(/<td>(\d)개<\/td>/g)].map(m=>Number(m[1]));
  expect(counts).toHaveLength(5);
  expect(counts.reduce((a,b)=>a+b,0)).toBe(8);
  expect(counts).toEqual([2,1,0,2,3]);
 });
 it('시간 미상과 진태양시 경계의 미확정 기둥을 제외한다',()=>{
  const unknown=calculateAdvanced({...input,day:10,unknownTime:true,hour:undefined,minute:undefined});
  expect(unknown.pillars.hour).toBeNull();
  expect(render(unknown)).toContain('확인된 6글자 기준');
  const uncertain=calculateAdvanced({...input,day:10,unknownTime:true,hour:undefined,minute:undefined},{enabled:true,timePolicy:'true-solar',cityId:'suwon'});
  expect(uncertain.pillars.day).toBeNull();
  const html=render(uncertain);
  expect(html).toContain('확인된 4글자 기준');
  expect(html).toContain('일간이 미확정이어서 성향을 요약할 근거가 부족해요');
 });
});
