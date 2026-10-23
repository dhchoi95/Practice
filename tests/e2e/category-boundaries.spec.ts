import {test,expect} from '@playwright/test';
import fs from 'node:fs/promises';
import {switchReading} from './helpers/reading';
for(const width of [320,390])test(`restored home and independent period menus at ${width}px`,async({page})=>{
 await page.setViewportSize({width,height:900});await page.clock.install({time:new Date('2026-10-23T03:00:00Z')});await page.goto('/');
 await expect(page.locator('.home-core-menus')).toHaveCount(0);await expect(page.locator('.category-grid .category-tile')).toHaveCount(9);await expect(page.locator('.year-banner')).toBeVisible();await expect(page.locator('.today-panel')).toBeVisible();
 await fs.mkdir('reports/category-clarity-fix/screenshots',{recursive:true});await page.screenshot({path:`reports/category-clarity-fix/screenshots/home-${width}.png`,fullPage:true});
 await page.goto('/fortune/day/');await page.getByLabel('태어난 연도',{exact:true}).fill('1995');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('11');await page.getByLabel('일',{exact:true}).fill('8');await page.getByRole('button',{name:'무료로 오늘 운세 보기'}).click();
 for(const [slug,label] of [['day','오늘 운세'],['tomorrow','내일 운세'],['month','이번 달 운세'],['year','올해 운세']]){
  if(slug!=='day')await switchReading(page,label);await expect(page).toHaveURL(`/result/${slug}/`);await expect(page.locator('.sector-body')).toHaveCount(6);await expect(page.locator('main input[type="date"]')).toHaveCount(0);await expect(page.locator('main .schedule-notes')).toHaveCount(0);await expect(page.locator('main .other-readings')).toHaveCount(0);await expect(page.locator('.sector-experience')).not.toContainText('지정일 운세');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`reports/category-clarity-fix/screenshots/${slug}-${width}.png`,fullPage:true});
 }
 await switchReading(page,'지정일 운세');await expect(page.locator('.sector-body')).toHaveCount(0);await expect(page.locator('.schedule-notes')).toHaveCount(0);await expect(page.getByLabel('운세를 볼 날짜',{exact:true})).toHaveValue('');await page.getByLabel('운세를 볼 날짜',{exact:true}).fill('2026-10-26');await expect(page.locator('.sector-body')).toHaveCount(6);await expect(page.getByLabel('일정 선택',{exact:true})).toBeVisible();
 await page.screenshot({path:`reports/category-clarity-fix/screenshots/date-${width}.png`,fullPage:true});
});
test('topic menus keep their own text and corrected birth chart after solar-time selection',async({page})=>{
 await page.goto('/fortune/personality/');await page.getByLabel('태어난 연도',{exact:true}).fill('1995');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('11');await page.getByLabel('일',{exact:true}).fill('8');await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill('0');await page.getByLabel('분 (0~59)',{exact:true}).fill('3');await page.getByLabel('지장간·대운·5년 세운까지 보기').check();await page.getByRole('combobox',{name:'출생 도시',exact:true}).selectOption('suwon');await page.getByRole('combobox',{name:'시각 기준',exact:true}).selectOption('true-solar');await page.getByRole('button',{name:'무료로 성격풀이 보기'}).click();
 const natal=await page.locator('.natal-table').innerText();
 for(const label of ['성격풀이','연애사주','직업·재물','대인관계']){
  if(label!=='성격풀이')await switchReading(page,label);
  await expect(page.locator('h1#result-title')).toHaveText(label+' 풀이');await expect(page.locator('.advanced-experience')).toHaveCount(0);await expect(page.locator('#advanced-years')).toHaveCount(0);await expect(page.locator('.sector-experience')).toHaveCount(0);await expect(page.locator('.result-content')).toBeVisible();expect(await page.locator('.natal-table').innerText()).toBe(natal);
 }
});
