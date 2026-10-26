import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import {switchReading} from './helpers/reading';
const dir='reports/copy-cleanup';
const removed=/HIDDEN-|LIFE-STAGE-|원전 검토|채택 표|검증한 표|풀이 이유|\d+구간|제안 ·|시간 보정·계산 기준|출생 도시|지방평균태양시|진태양시/;
async function enter(page:Page){
 await page.goto('/fortune/saju/');await page.getByLabel('태어난 연도',{exact:true}).fill('1995');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('11');await page.getByLabel('일',{exact:true}).fill('8');await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill('15');await page.getByLabel('분 (0~59)',{exact:true}).fill('3');
 await expect(page.getByRole('combobox',{name:'출생 도시',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'무료로 신년운세 보기'}).click();await expect(page.locator('.sector-body')).toHaveCount(6);
}
for(const width of [320,390])test(`expanded public output and actual PDF contain readings rather than diagnostics at ${width}px`,async({page})=>{
 await fs.mkdir(`${dir}/print`,{recursive:true});await fs.mkdir(`${dir}/screenshots`,{recursive:true});await page.clock.install({time:new Date('2026-10-25T03:00:00Z')});await page.setViewportSize({width,height:950});await enter(page);await page.getByLabel('운세를 볼 연도',{exact:true}).selectOption('2027');
 const natal=await page.locator('.natal-table').innerText();
 for(const [slug,label] of [['saju','신년운세'],['day','오늘의 운세'],['tomorrow','내일 운세'],['date','지정일 운세'],['month','이번달 운세'],['year','올해 운세'],['manse','만세력'],['love','연애사주'],['relationships','대인관계'],['career-money','직업·재물']]){
  if(slug!=='saju')await switchReading(page,label);
  if(slug==='date')await page.getByLabel('운세를 볼 날짜',{exact:true}).fill('2026-02-04');
  if(slug==='manse')await expect(page.locator('.element-list')).toBeVisible();
  else if(['saju','day','tomorrow','date','month','year'].includes(slug))await expect(page.locator('.sector-body')).toHaveCount(6);
  else await expect(page.locator('.result-content')).toBeVisible();
  await page.locator('main details.disclosure').evaluateAll(es=>es.forEach(e=>(e as HTMLDetailsElement).open=true));
  expect(await page.locator('.natal-table').innerText()).toBe(natal);await expect(page.locator('.birth-summary')).toContainText('한국 표준시 기준');
  // textContent includes closed disclosures, so CSS hiding does not satisfy this check.
  expect(await page.locator('main').textContent()).not.toMatch(removed);await expect(page.locator('.sector-segments,.sector-score-reasons,#advanced-years,#advanced-time,#advanced-compare')).toHaveCount(0);
  await expect(page.getByRole('combobox',{name:'시각 기준',exact:true})).toHaveCount(0);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(width===390){const paragraphs=await page.locator('.sector-body p[data-source-id],.result-content p,#advanced-topics p,.natal-explanation p').allTextContents();await page.pdf({path:`${dir}/print/${slug}.pdf`,format:'A4',printBackground:true});await fs.writeFile(`${dir}/print/${slug}-expected.json`,JSON.stringify(paragraphs,null,2));}
  if(['saju','manse','day','date'].includes(slug)){await page.screenshot({path:`${dir}/screenshots/${slug}-${width}.png`,fullPage:true});await page.locator('.natal-overview').screenshot({path:`${dir}/screenshots/${slug}-natal-${width}.png`});if(slug==='saju')await page.locator('#sector-business').screenshot({path:`${dir}/screenshots/year-business-${width}.png`});}
 }
});
test('00:00 remains known while changing to unknown excludes the hour and does not invent decade direction',async({page})=>{
 await enter(page);await page.getByRole('link',{name:'입력 수정',exact:true}).click();await page.getByLabel('시 (0~23)',{exact:true}).fill('0');await page.getByLabel('분 (0~59)',{exact:true}).fill('0');await page.getByRole('button',{name:'무료로 신년운세 보기'}).click();await expect(page.locator('[data-pillar="hour"][data-row="stem"] .element-cell')).toHaveCount(1);
 await switchReading(page,'만세력');await page.locator('#advanced-luck summary').click();await expect(page.locator('.luck-cards')).toHaveCount(0);await expect(page.locator('#advanced-luck')).toContainText('성별을 선택하면');
 await page.getByRole('link',{name:'입력 수정',exact:true}).click();await page.getByLabel('시간 모름',{exact:true}).check();await page.getByRole('button',{name:'무료로 만세력 보기'}).click();await expect(page.locator('[data-pillar="hour"][data-row="stem"]')).toHaveText('시간 모름');await expect(page.locator('.luck-cards')).toHaveCount(0);
});
