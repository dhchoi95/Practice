import { test,expect,type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const dir='reports/integrated-2.0.0';
async function advanced(page:Page,unknown=false){
 await page.goto('/fortune/saju/');await page.getByLabel('태어난 연도',{exact:true}).fill('1995');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('11');await page.getByLabel('일',{exact:true}).fill('8');
 if(!unknown){await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill('15');await page.getByLabel('분 (0~59)',{exact:true}).fill('3');}
 await page.getByLabel('지장간·대운·5년 세운까지 보기').check();await page.getByRole('combobox',{name:'출생 도시',exact:true}).selectOption('suwon');await page.getByRole('combobox',{name:'시각 기준',exact:true}).selectOption('true-solar');await page.getByRole('combobox',{name:'전통 대운 순역 분류',exact:true}).selectOption('male');await page.getByRole('button',{name:'무료로 정통사주 보기'}).click();await expect(page.locator('.advanced-summary')).toBeVisible();
}
test('advanced example propagates time profile to chart, roots, interpretations, five years and print state',async({page})=>{
 await fs.mkdir(`${dir}/screenshots`,{recursive:true});await fs.mkdir(`${dir}/print`,{recursive:true});
 await page.clock.install({time:new Date('2026-10-22T03:00:00Z')});await page.setViewportSize({width:390,height:900});await advanced(page);
 const panel=page.locator('.advanced-experience');await expect(panel.locator('.advanced-summary')).toContainText('진태양시');await expect(panel.locator('.natal-table')).toContainText('己');await expect(panel.locator('.natal-table')).toContainText('편관');await expect(panel.locator('#advanced-time')).toContainText('14:47');await expect(panel.locator('#advanced-chart')).toContainText('삼합');
 await expect(panel.locator('.year-comparison')).toContainText('2026년');await expect(panel.locator('.year-comparison')).toContainText('2030년');await expect(panel.locator('.luck-cards article')).toHaveCount(10);
 await panel.getByText('시간 보정·계산 기준 설정',{exact:true}).click();
 const same=await panel.innerText();await page.clock.fastForward(600000);expect(await panel.innerText()).toBe(same);
 await page.screenshot({path:`${dir}/screenshots/advanced-solar-390.png`,fullPage:true});
 await panel.getByRole('combobox',{name:'시각 기준',exact:true}).selectOption('standard');await expect(panel.locator('.natal-table')).toContainText('庚');await expect(panel.locator('.advanced-summary')).toContainText('신강 경향');await page.screenshot({path:`${dir}/screenshots/advanced-standard-390.png`,fullPage:true});
 await page.pdf({path:`${dir}/print/advanced-standard.pdf`,format:'A4',printBackground:true});
 await panel.getByRole('combobox',{name:'시각 기준',exact:true}).selectOption('true-solar');await expect(panel.locator('.advanced-summary')).toContainText('중화·경계');
 const before=await page.locator('details.disclosure').evaluateAll(ds=>ds.map(d=>(d as HTMLDetailsElement).open));await page.pdf({path:`${dir}/print/advanced-solar.pdf`,format:'A4',printBackground:true});expect(await page.locator('details.disclosure').evaluateAll(ds=>ds.map(d=>(d as HTMLDetailsElement).open))).toEqual(before);
 for(const width of [320,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.evaluate(()=>{document.documentElement.style.fontSize='200%';});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`${dir}/screenshots/advanced-enlarged-390.png`,fullPage:true});
 await panel.getByLabel('조회 날짜',{exact:true}).fill('2051-01-01');await expect(panel.getByRole('alert')).toContainText('1962~2050');await expect(panel.locator('.natal-table')).toBeVisible();await expect(panel.locator('[data-pillar="hour"][data-row="stem"]')).toContainText('己');await panel.getByLabel('조회 날짜',{exact:true}).fill('2026-10-22');await expect(panel.locator('.advanced-summary')).toBeVisible();
});
test('unknown time keeps dependent advanced interpretations unresolved in screen and actual PDF',async({page})=>{
 await fs.mkdir(`${dir}/print`,{recursive:true});await page.clock.install({time:new Date('2026-10-22T03:00:00Z')});await advanced(page,true);const panel=page.locator('.advanced-experience');await expect(panel.locator('#advanced-luck')).toContainText('대운 개시일을 정하지 않았어요');
 await expect(panel.locator('.advanced-summary')).toContainText('강약 미확정');await expect(panel.locator('.luck-cards')).toHaveCount(0);await expect(panel.locator('#advanced-topics')).toContainText('적용하지 않았어요');await page.pdf({path:`${dir}/print/advanced-unknown.pdf`,format:'A4'});
});
test('period selection changes actual context and retains selected solar profile in other menus',async({page})=>{
 await page.clock.install({time:new Date('2026-10-22T03:00:00Z')});await advanced(page);await page.locator('.other-links').getByRole('link',{name:'오늘 운세',exact:true}).click();const panel=page.locator('.sector-experience');await expect(panel.locator('.natal-explanation')).toContainText('진태양시');
 await panel.getByRole('button',{name:'오늘',exact:true}).click();const a=await panel.locator('.sector-bodies').innerText();await panel.getByRole('button',{name:'내일',exact:true}).click();expect(await panel.locator('.sector-bodies').innerText()).not.toBe(a);
 await panel.getByLabel('조회 날짜',{exact:true}).fill('2051-01-01');await expect(panel.getByRole('alert')).toContainText('1962~2050');await panel.getByLabel('조회 날짜',{exact:true}).fill('2026-02-04');await expect(panel.locator('.sector-segments > .disclosure-body > section').filter({has:page.locator('h3').filter({hasText:/^\d+구간/})})).toHaveCount(2);
 const axe=await new AxeBuilder({page}).include('.sector-experience').withTags(['wcag2a','wcag2aa']).analyze();expect(axe.violations).toEqual([]);
});
test('advanced inputs do not leak in request/URL/console/storage/cookies and refresh clears them',async({page})=>{
 const traffic:string[]=[],logs:string[]=[];page.on('request',r=>traffic.push(r.url()+' '+(r.postData()??'')));page.on('console',m=>logs.push(m.text()));await advanced(page);
 expect(traffic.filter(t=>/1995|suwon|true-solar|luckClass|male/.test(t))).toEqual([]);expect(logs.filter(t=>/1995|suwon|luckClass/.test(t))).toEqual([]);expect(page.url()).toMatch(/\/result\/saju\/$/);
 expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookie:document.cookie}))).toEqual({local:0,session:0,cookie:''});await page.reload();await expect(page.getByText('입력정보가 없어 결과를 불러올 수 없어요')).toBeVisible();
});
test('all sixteen MBTI labels lead to six genuine selectable topics without inferred input',async({page})=>{
 await page.goto('/');await page.getByRole('link',{name:/MBTI 읽을거리/}).first().click();await expect(page.getByRole('radio')).toHaveCount(16);await expect(page.getByRole('button',{name:'선택한 유형의 글 보기'})).toBeDisabled();await page.getByRole('radio',{name:'INTP',exact:true}).check();await page.getByRole('button',{name:'선택한 유형의 글 보기'}).click();await expect(page.locator('.result-hero')).toContainText('INTP');
 expect((await page.getByRole('combobox',{name:'읽을 주제',exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
 const bodies=[];for(let i=0;i<6;i++){await page.getByRole('combobox',{name:'읽을 주제',exact:true}).selectOption(String(i));bodies.push(await page.locator('.reading-section').last().innerText());}expect(new Set(bodies).size).toBe(6);await page.screenshot({path:`${dir}/screenshots/mbti-390.png`,fullPage:true});await page.reload();await expect(page.getByText('유형을 먼저 선택해 주세요')).toBeVisible();
});

test('advanced today follows Korean midnight while an explicitly selected date stays fixed',async({page})=>{
 await page.clock.install({time:new Date('2026-10-22T14:59:30Z')});await advanced(page);await page.locator('.other-links').getByRole('link',{name:'오늘 운세',exact:true}).click();const panel=page.locator('.sector-experience'),date=panel.getByLabel('조회 날짜',{exact:true});await expect(date).toHaveValue('2026-10-22');const before=await panel.locator('.sector-bodies').innerText();
 await page.clock.fastForward(60000);await expect(date).toHaveValue('2026-10-23');expect(await panel.locator('.sector-bodies').innerText()).not.toBe(before);
 await date.fill('2026-10-20');await page.clock.fastForward(86400000);await expect(date).toHaveValue('2026-10-20');
});
