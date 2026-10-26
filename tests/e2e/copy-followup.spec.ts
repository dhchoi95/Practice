import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import {switchReading} from './helpers/reading';
const dir='reports/copy-followup';
async function enter(page:Page,slug:string,year:string,month:string,day:string,hour:string,minute:string){
 await page.goto(`/fortune/${slug}/`);await page.getByLabel('태어난 연도',{exact:true}).fill(year);await page.getByRole('combobox',{name:'월',exact:true}).selectOption(month);await page.getByLabel('일',{exact:true}).fill(day);await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill(hour);await page.getByLabel('분 (0~59)',{exact:true}).fill(minute);await page.getByRole('button',{name:/무료로 .* 보기/}).click();
}
for(const width of [320,390])test(`reported personality sentence is corrected in actual output and PDF at ${width}px`,async({page})=>{
 await fs.mkdir(`${dir}/print`,{recursive:true});await fs.mkdir(`${dir}/screenshots`,{recursive:true});await page.setViewportSize({width,height:950});await enter(page,'personality','1990','1','9','12','0');
 await expect(page.locator('.result-content')).toContainText('해보았기에 알게 된 일도 있을 것입니다.');expect(await page.locator('main').innerText()).not.toMatch(/(?:^|\s)거입니다/);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`${dir}/screenshots/personality-${width}.png`,fullPage:true});await page.pdf({path:`${dir}/print/personality-${width}.pdf`,format:'A4',printBackground:true});
});
test('reviewed annual domains have different reading subjects and monthly output has no stock connector',async({page})=>{
 await fs.mkdir(`${dir}/print`,{recursive:true});await page.clock.install({time:new Date('2026-10-26T03:00:00Z')});await page.setViewportSize({width:390,height:950});await enter(page,'saju','1995','11','8','15','3');await page.getByLabel('운세를 볼 연도',{exact:true}).selectOption('2027');
 const natal=await page.locator('.natal-table').innerText();await expect(page.locator('.sector-body')).toHaveCount(6);expect(await page.locator('.sector-body').evaluateAll(es=>es.map(e=>e.getAttribute('data-score')))).toEqual(['50','45','55','50','50','55']);
 for(const domain of ['overall','study','money','health','love','business'])await expect(page.locator(`#sector-${domain} p[data-source-id="sector:year:${domain}:wealth"]`)).toHaveCount(1);
 // Regression for this reviewed case: health and affection must not return to budget advice.
 for(const domain of ['study','health','love'])await expect(page.locator(`#sector-${domain}`)).not.toContainText('비용');
 const annual=await page.locator('.sector-body').allTextContents();await fs.writeFile(`${dir}/annual-browser-text.json`,JSON.stringify(annual,null,2));await page.pdf({path:`${dir}/print/year-2027.pdf`,format:'A4',printBackground:true});await page.locator('#sector-love').screenshot({path:`${dir}/screenshots/year-love-390.png`});await page.locator('#sector-health').screenshot({path:`${dir}/screenshots/year-health-390.png`});
 await switchReading(page,'이번달 운세');await expect(page.locator('.sector-body')).toHaveCount(6);expect(await page.locator('.natal-table').innerText()).toBe(natal);const monthly=await page.locator('.sector-body').allTextContents();expect(monthly.join('\n')).not.toMatch(/한 달 내내 같은 흐름|한 해 안에서도 시기에 따라|하루 중에도 분위기/);await fs.writeFile(`${dir}/monthly-browser-text.json`,JSON.stringify(monthly,null,2));await page.pdf({path:`${dir}/print/month-2026-10.pdf`,format:'A4',printBackground:true});
});
