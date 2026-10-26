import { switchReading } from './helpers/reading';
import { test,expect,type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const dir='reports/integrated-2.0.0';
async function advanced(page:Page,unknown=false){
 await page.goto('/fortune/saju/');await page.getByLabel('태어난 연도',{exact:true}).fill('1995');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('11');await page.getByLabel('일',{exact:true}).fill('8');
 if(!unknown){await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill('15');await page.getByLabel('분 (0~59)',{exact:true}).fill('3');}
 await page.getByRole('combobox',{name:'대운 계산에 쓸 성별',exact:true}).selectOption('male');await page.getByRole('button',{name:'무료로 신년운세 보기'}).click();await page.getByLabel('운세를 볼 연도',{exact:true}).selectOption('2026');await page.getByText('타고난 성향과 대운',{exact:true}).click();await expect(page.locator('#advanced-topics')).toBeVisible();
}
test('standard natal analysis retains personalized content and explicitly classified decade luck without technical panels',async({page})=>{
 await fs.mkdir(`${dir}/print`,{recursive:true});await page.setViewportSize({width:390,height:900});await advanced(page);const panel=page.locator('.advanced-experience');await expect(page.locator('[data-pillar="hour"][data-row="stem"]')).toContainText('庚');await expect(panel.locator('.luck-cards article')).toHaveCount(10);await expect(panel).not.toContainText('구간');await expect(panel).not.toContainText('후보');await expect(panel.getByRole('combobox')).toHaveCount(0);await page.pdf({path:`${dir}/print/advanced-standard.pdf`,format:'A4',printBackground:true});
 for(const width of [320,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
});
test('unknown time omits complete-natal interpretations and decade start in actual print',async({page})=>{
 await fs.mkdir(`${dir}/print`,{recursive:true});await page.goto('/fortune/saju/');await page.getByLabel('태어난 연도',{exact:true}).fill('1995');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('11');await page.getByLabel('일',{exact:true}).fill('8');await page.getByRole('button',{name:'무료로 신년운세 보기'}).click();await page.getByText('타고난 성향과 대운',{exact:true}).click();await expect(page.locator('.luck-cards')).toHaveCount(0);await expect(page.locator('.advanced-experience')).toContainText('태어난 시간을 몰라');await page.pdf({path:`${dir}/print/advanced-unknown.pdf`,format:'A4'});
});
test('period selection changes context while all menus keep the standard natal chart',async({page})=>{
 await page.clock.install({time:new Date('2026-10-22T03:00:00Z')});await advanced(page);await switchReading(page,'지정일 운세');const panel=page.locator('.sector-experience');await expect(page.locator('.birth-summary')).toContainText('한국 표준시 기준');
 await panel.getByLabel('운세를 볼 날짜',{exact:true}).fill('2026-10-22');const a=await panel.locator('.sector-bodies').innerText();await panel.getByLabel('운세를 볼 날짜',{exact:true}).fill('2026-10-23');expect(await panel.locator('.sector-bodies').innerText()).not.toBe(a);
 await panel.getByLabel('운세를 볼 날짜',{exact:true}).fill('2051-01-01');await expect(panel.getByRole('alert')).toContainText('1962~2050');await panel.getByLabel('운세를 볼 날짜',{exact:true}).fill('2026-02-04');await expect(panel.locator('.sector-segments')).toHaveCount(0);await expect(panel.locator('.sector-body')).toHaveCount(6);
 const axe=await new AxeBuilder({page}).include('.sector-experience').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations).toEqual([]);
});
test('advanced inputs do not leak in request/URL/console/storage/cookies and refresh clears them',async({page})=>{
 const traffic:string[]=[],logs:string[]=[];page.on('request',r=>traffic.push(r.url()+' '+(r.postData()??'')));page.on('console',m=>logs.push(m.text()));await advanced(page);
 expect(traffic.filter(t=>/1995|suwon|true-solar|luckClass|male/.test(t))).toEqual([]);expect(logs.filter(t=>/1995|suwon|luckClass/.test(t))).toEqual([]);expect(page.url()).toMatch(/\/result\/saju\/$/);
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookie:document.cookie}))).toEqual({local:0,session:0,cookie:''});await page.reload();await expect(page.getByText('입력정보가 없어 결과를 불러올 수 없어요')).toBeVisible();
});
test('all sixteen MBTI labels lead to six genuine selectable topics without inferred input',async({page})=>{
 await page.goto('/');await page.getByRole('link',{name:/MBTI 운세/}).first().click();await expect(page.getByRole('radio')).toHaveCount(16);await expect(page.getByRole('button',{name:'선택한 유형의 글 보기'})).toBeDisabled();await page.getByRole('radio',{name:'INTP',exact:true}).check();await page.getByRole('button',{name:'선택한 유형의 글 보기'}).click();await expect(page.locator('.result-hero')).toContainText('INTP');
 expect((await page.getByRole('combobox',{name:'읽을 주제',exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
 const bodies=[];for(let i=0;i<6;i++){await page.getByRole('combobox',{name:'읽을 주제',exact:true}).selectOption(String(i));bodies.push(await page.locator('.reading-section').last().innerText());}expect(new Set(bodies).size).toBe(6);await page.screenshot({path:`${dir}/screenshots/mbti-390.png`,fullPage:true});await page.reload();await expect(page.getByText('유형을 먼저 선택해 주세요')).toBeVisible();
});

test('advanced today follows Korean midnight while an explicitly selected date stays fixed',async({page})=>{
 await page.clock.install({time:new Date('2026-10-22T14:59:30Z')});await advanced(page);await switchReading(page,'오늘의 운세');const panel=page.locator('.sector-experience');await expect(panel.locator('.sector-heading h2')).toContainText('22일');const before=await panel.locator('.sector-bodies').innerText();
 await page.clock.fastForward(60000);await expect(panel.locator('.sector-heading h2')).toContainText('23일');expect(await panel.locator('.sector-bodies').innerText()).not.toBe(before);
 await switchReading(page,'지정일 운세');const date=page.getByLabel('운세를 볼 날짜',{exact:true});await date.fill('2026-10-20');await page.clock.fastForward(86400000);await expect(date).toHaveValue('2026-10-20');
});
