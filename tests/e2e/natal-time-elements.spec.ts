import {test,expect,type Page} from '@playwright/test';
import {calculateAdvanced} from '../../src/domain/advanced/chart';
import {elements,stemElements,branchElements,stemHanja,branchHanja} from '../../src/domain/saju/tables';

const people=[
 {year:1976,month:1,day:14,unknown:true,gender:'male'},{year:1984,month:5,day:22,unknown:true,gender:'female'},{year:1990,month:11,day:10,unknown:true,gender:'male'},{year:1994,month:3,day:31,unknown:true,gender:'female'},{year:2002,month:7,day:19,unknown:true,gender:'male'},
 {year:1968,month:9,day:14,hour:3,minute:15,gender:'female'},{year:1979,month:4,day:22,hour:8,minute:40,gender:'male'},{year:1986,month:11,day:12,hour:13,minute:25,gender:'female'},{year:1993,month:6,day:7,hour:18,minute:50,gender:'male'},{year:2001,month:9,day:21,hour:23,minute:35,gender:'female'},
];
async function inspect(page:Page,input:{year:number;month:number;day:number;unknownTime:boolean;hour?:number;minute?:number;calendar:'solar';leap:false;nickname:string}){
 const chart=calculateAdvanced(input,{enabled:true,timePolicy:'standard'});await expect(page.locator('.natal-table')).toBeVisible();
 const known=Object.values(chart.pillars).filter(p=>p!==null);const expected=elements.map(e=>known.reduce((n,p)=>n+Number(stemElements[p.stem]===e)+Number(branchElements[p.branch]===e),0));
 await page.locator('.natal-explanation summary').click();const rows=page.locator('.natal-elements-table tbody tr');await expect(rows).toHaveCount(5);
 for(let i=0;i<5;i++){await expect(rows.nth(i).locator('th')).toContainText(elements[i]);await expect(rows.nth(i).locator('td').first()).toHaveText(`${expected[i]}개`);}
 expect(expected.reduce((a,b)=>a+b,0)).toBe(input.unknownTime?6:8);
 if(input.unknownTime){expect(chart.pillars.hour).toBeNull();await expect(page.locator('[data-pillar="hour"][data-row="stem"]')).toContainText('시간 모름');}
 else{expect(chart.pillars.hour).not.toBeNull();await expect(page.locator('[data-pillar="hour"][data-row="stem"] strong')).toHaveText(stemHanja[chart.pillars.hour!.stem]);await expect(page.locator('[data-pillar="hour"][data-row="branch"] strong')).toHaveText(branchHanja[chart.pillars.hour!.branch]);}
 return {counts:expected,hour:chart.pillars.hour};
}
test('10 synthetic births: hour known and unknown counts match UI and switches restore the chart',async({page})=>{
 test.setTimeout(180000);await page.setViewportSize({width:390,height:844});const results=[];
 for(const [i,p] of people.entries()){
  await page.goto('/fortune/day/');await page.getByLabel('태어난 연도',{exact:true}).fill(String(p.year));await page.getByRole('combobox',{name:'월',exact:true}).selectOption(String(p.month));await page.getByLabel('일',{exact:true}).fill(String(p.day));
  if(!p.unknown){await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill(String(p.hour));await page.getByLabel('분 (0~59)',{exact:true}).fill(String(p.minute));}
  await page.getByLabel('대운 계산에 쓸 성별',{exact:true}).selectOption(p.gender);await page.getByRole('button',{name:/무료로 .* 보기/}).click();const input={year:p.year,month:p.month,day:p.day,calendar:'solar' as const,leap:false as const,nickname:'',unknownTime:!!p.unknown,...(p.unknown?{}:{hour:p.hour,minute:p.minute})};
  const known=await inspect(page,input);results.push({id:`${p.unknown?'A':'B'}${p.unknown?i+1:i-4}`,...known});
  if(i===0){await page.getByRole('link',{name:'입력 수정',exact:true}).click();await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill('3');await page.getByLabel('분 (0~59)',{exact:true}).fill('15');await page.getByRole('button',{name:/무료로 .* 보기/}).click();await inspect(page,{...input,unknownTime:false,hour:3,minute:15});await page.getByRole('link',{name:'입력 수정',exact:true}).click();await page.getByLabel('시간 모름',{exact:true}).check();await page.getByRole('button',{name:/무료로 .* 보기/}).click();expect(await inspect(page,input)).toEqual(known);}
  if(!p.unknown){
   await page.getByRole('link',{name:'입력 수정',exact:true}).click();await page.getByLabel('시간 모름',{exact:true}).check();await page.getByRole('button',{name:/무료로 .* 보기/}).click();const noHour=await inspect(page,{...input,unknownTime:true,hour:undefined,minute:undefined});
   expect(noHour.hour).toBeNull();expect(known.counts.map((v,i)=>v-noHour.counts[i])).toEqual(elements.map(e=>Number(stemElements[known.hour!.stem]===e)+Number(branchElements[known.hour!.branch]===e)));await page.getByRole('link',{name:'입력 수정',exact:true}).click();await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill(String(p.hour));await page.getByLabel('분 (0~59)',{exact:true}).fill(String(p.minute));await page.getByRole('button',{name:/무료로 .* 보기/}).click();expect(await inspect(page,input)).toEqual(known);
  }
 }
 expect(results.some(r=>r.counts.includes(0))).toBe(true);console.log('SYNTHETIC_ELEMENTS '+JSON.stringify(results));
});
