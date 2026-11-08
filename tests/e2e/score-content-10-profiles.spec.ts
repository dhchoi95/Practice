import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';

// Synthetic input dates are deliberately varied; no actual person's information is used.
const cases=[
 {year:'1963',month:'4',day:'10',hour:'21',minute:'0'},
 {year:'1966',month:'3',day:'4',hour:'12',minute:'0'},
 {year:'1970',month:'1',day:'13',hour:'12',minute:'0'},
 {year:'1978',month:'8',day:'23',hour:'10',minute:'30'},
 {year:'1982',month:'2',day:'4',hour:'9',minute:'15'},
 {year:'1990',month:'1',day:'9',hour:'12',minute:'0'},
 {year:'1994',month:'3',day:'31',hour:'8',minute:'0'},
 {year:'1995',month:'11',day:'8',hour:'15',minute:'3'},
 {year:'2001',month:'6',day:'15',hour:'14',minute:'30'},
 {year:'2005',month:'9',day:'21',hour:'6',minute:'45'},
];
test('ten synthetic natal charts produce actual six-domain UI and printable results',async({page})=>{
 test.setTimeout(120000);await page.setViewportSize({width:390,height:844});await page.clock.install({time:new Date('2026-10-23T03:00:00Z')});
 const output='reports/score-content-review/screens';await fs.mkdir(output,{recursive:true});const summaries=[];
 for(const [index,row] of cases.entries()){
  await page.goto('/fortune/day/');await page.getByLabel('태어난 연도',{exact:true}).fill(row.year);await page.getByRole('combobox',{name:'월',exact:true}).selectOption(row.month);await page.getByLabel('일',{exact:true}).fill(row.day);
  await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill(row.hour);await page.getByLabel('분 (0~59)',{exact:true}).fill(row.minute);await page.getByRole('button',{name:/무료로 .* 보기/}).click();
  await expect(page.locator('.natal-table')).toBeVisible();await expect(page.locator('.sector-body')).toHaveCount(6);
  await expect(page.locator('.sector-body h3')).toHaveCount(6);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('.natal-explanation summary').click();await page.screenshot({path:`${output}/case-${String(index+1).padStart(2,'0')}.png`,fullPage:true});
  summaries.push({id:`synthetic-${String(index+1).padStart(2,'0')}`,natal:await page.locator('.natal-table').innerText(),sections:await page.locator('.sector-body').allInnerTexts()});
  if(index===0)await page.pdf({path:`${output}/case-01.pdf`,format:'A4',printBackground:true});
 }
 await fs.writeFile('reports/score-content-review/rendered-10.json',JSON.stringify({description:'Synthetic examples; rendered browser output; not expert validation',cases:summaries},null,2));
});
