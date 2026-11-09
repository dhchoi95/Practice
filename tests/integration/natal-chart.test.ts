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
 it('입력 시각이 있는데 시주가 없다면 시간 미상으로 오인하지 않고 오류를 표시한다',()=>{
  const chart=calculateAdvanced(input);
  const html=render({...chart,pillars:{...chart.pillars,hour:null}});
  expect(html).toContain('태어난 시간을 입력했지만 시주를 계산하지 못했어요');
  expect(html).not.toContain('시간 모름</span>');
 });
 it('절입일에 출생 시간이 없으면 미확정 월주를 6글자로 임의 확정하지 않는다',()=>{
  const chart=calculateAdvanced({year:1990,month:11,day:8,calendar:'solar',leap:false,nickname:'',unknownTime:true});
  expect(chart.pillars.hour).toBeNull();expect(chart.pillars.month).toBeNull();
  const html=render(chart);expect(html).toContain('확인된 4글자 기준');expect(html).toContain('미확정 기둥은 제외');
 });
 it.each([0,12,23])('%s시 입력은 8글자로 계산되고 같은 입력은 재현된다',hour=>{
  const birth={...input,hour,minute:0};const first=calculateAdvanced(birth),again=calculateAdvanced(birth);
  expect(first.pillars.hour).not.toBeNull();expect(first.pillars).toEqual(again.pillars);
  const counts=[...render(first).matchAll(/<td>(\d)개<\/td>/g)].map(m=>Number(m[1]));
  expect(counts).toHaveLength(5);expect(counts.reduce((a,b)=>a+b,0)).toBe(8);
 });
});
