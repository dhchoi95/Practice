import { execFileSync } from 'node:child_process';
import { switchReading } from './helpers/reading';
import { test,expect,type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const dir='reports/foundation-2.1.0';
async function enter(page:Page,slug='day',unknown=false){
 await page.goto(`/fortune/${slug}/`);await page.getByLabel('태어난 연도',{exact:true}).fill('1995');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('11');await page.getByLabel('일',{exact:true}).fill('8');
 if(!unknown){await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill('15');await page.getByLabel('분 (0~59)',{exact:true}).fill('3');}
 await page.getByRole('button',{name:/무료로 .* 보기/}).click();await expect(page.locator('.natal-table')).toBeVisible();
}
async function bodies(page:Page){return page.locator('.sector-bodies').innerText();}
async function scores(page:Page){return page.locator('.sector-body').evaluateAll(es=>es.map(e=>e.getAttribute('data-score')));}
for(const width of [320,360,390,430,1280])test(`natal grid and sector chart fit ${width}px and actual text enlargement`,async({page})=>{
 await fs.mkdir(`${dir}/screenshots`,{recursive:true});await page.clock.install({time:new Date('2026-10-23T03:00:00Z')});await page.setViewportSize({width,height:1000});await enter(page);
 await expect(page.locator('.natal-table thead')).toHaveText(/항목시주일주나월주년주/);expect(await page.locator('.natal-table').evaluate(e=>!!e.closest('details'))).toBe(false);
 for(const domain of ['overall','study','money','health','love','business'])await expect(page.locator(`#sector-${domain}`)).toBeVisible();await expect(page.getByRole('group',{name:/여섯 분야 레이더 그래프/})).toBeVisible();
 expect(await page.locator('.natal-table strong').count()).toBe(8);for(const axis of await page.locator('.sector-radar svg a').all())expect((await axis.boundingBox())!.height).toBeGreaterThanOrEqual(44);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`${dir}/screenshots/day-${width}.png`,fullPage:true});await page.screenshot({path:`${dir}/screenshots/day-top-${width}.png`});
 await page.locator('.natal-table td,.natal-table th,.natal-table strong,.natal-table span,.natal-table small,.sector-body p,.sector-body h2,.sector-body h3').evaluateAll(es=>es.forEach(e=>{(e as HTMLElement).style.fontSize=`${parseFloat(getComputedStyle(e).fontSize)*2}px`;}));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('menus keep their own dates and specified date reproduces tomorrow without changing the natal chart',async({page})=>{
 await page.clock.install({time:new Date('2026-10-23T03:00:00Z')});await enter(page);
 const natal=await page.locator('.natal-table').innerText();
 await expect(page.locator('input[type="date"]')).toHaveCount(0);await expect(page.locator('.schedule-notes')).toHaveCount(0);
 await switchReading(page,'내일 운세');const sameDay=await bodies(page),sameScores=await scores(page);
 await expect(page.locator('input[type="date"]')).toHaveCount(0);await expect(page.locator('.schedule-notes')).toHaveCount(0);
 await switchReading(page,'지정일 운세');await expect(page.locator('.sector-bodies')).toHaveCount(0);
 await page.getByLabel('운세를 볼 날짜',{exact:true}).fill('2026-10-24');expect(await bodies(page)).toBe(sameDay);expect(await scores(page)).toEqual(sameScores);expect(await page.locator('.natal-table').innerText()).toBe(natal);
 const notes=[];for(const context of ['general','interview','exam','presentation','contract','meeting']){await page.getByLabel('일정 선택',{exact:true}).selectOption(context);expect(await scores(page)).toEqual(sameScores);expect(await bodies(page)).toBe(sameDay);notes.push(await page.locator('.schedule-notes').innerText());}expect(new Set(notes).size).toBe(6);
 await page.getByLabel('운세를 볼 날짜',{exact:true}).fill('');await expect(page.locator('.sector-bodies')).toHaveCount(0);await expect(page.locator('.natal-table')).toBeVisible();
 await page.getByLabel('운세를 볼 날짜',{exact:true}).fill('2051-01-01');await expect(page.locator('main').getByRole('alert')).toContainText('1962~2050');await page.getByLabel('운세를 볼 날짜',{exact:true}).fill('2026-02-04');expect(await page.locator('.sector-segments section').count()).toBeGreaterThan(1);
 await page.locator('.sector-anchor-links').getByRole('link',{name:'재물운',exact:true}).click();await expect(page.locator('#sector-money')).toBeInViewport();
});
test('all natal menus use the same selected solar chart without requiring advanced mode',async({page})=>{
 await enter(page,'date');await page.getByText('시간 보정·계산 기준',{exact:true}).click();await page.getByRole('combobox',{name:'출생 도시',exact:true}).selectOption('suwon');await page.getByRole('combobox',{name:'시각 기준',exact:true}).selectOption('true-solar');
 const table=await page.locator('.natal-table').innerText();await expect(page.locator('[data-pillar="hour"][data-row="stem"]')).toContainText('己');
 for(const label of ['신년운세','만세력','성격풀이','오늘의 운세']){await switchReading(page,label);await expect(page.locator('.natal-table')).toBeVisible();expect(await page.locator('.natal-table').innerText()).toBe(table);}
});
test('known-hour absence and uncertain day are distinct; native PDFs include table graph and six texts with restored disclosures',async({page})=>{
 await fs.mkdir(`${dir}/print`,{recursive:true});await page.clock.install({time:new Date('2026-10-23T03:00:00Z')});await enter(page,'day',true);await expect(page.locator('.natal-table')).toContainText('시간 모름');await expect(page.locator('[data-testid="radar-shape"]')).toBeVisible();await page.pdf({path:`${dir}/print/unknown-hour.pdf`,format:'A4',printBackground:true});
 await page.getByText('시간 보정·계산 기준',{exact:true}).click();await page.getByRole('combobox',{name:'출생 도시',exact:true}).selectOption('suwon');await page.getByRole('combobox',{name:'시각 기준',exact:true}).selectOption('true-solar');await expect(page.locator('[data-testid="radar-shape"]')).toHaveCount(0);expect(await scores(page)).toEqual(Array(6).fill('null'));await expect(page.locator('.schedule-notes')).toHaveCount(0);await page.pdf({path:`${dir}/print/unknown-day.pdf`,format:'A4',printBackground:true});
 await page.getByRole('link',{name:'입력 수정',exact:true}).click();await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill('15');await page.getByLabel('분 (0~59)',{exact:true}).fill('3');await page.getByRole('button',{name:/무료로 .* 보기/}).click();
 for(const [slug,label] of [['day','오늘의 운세'],['date','지정일 운세'],['month','이번달 운세'],['year','올해 운세'],['saju','신년운세'],['manse','만세력']]){await switchReading(page,label);await expect(page).toHaveURL(`/result/${slug}/`);if(slug==='saju')await page.getByText('타고난 사주와 자세한 대운·세운 해설',{exact:true}).click();await expect(page.locator(slug==='saju'||slug==='manse'?'.advanced-experience':'.sector-experience')).toBeVisible();await expect(page.locator('.natal-table')).toBeVisible();if(slug==='date'){await page.getByLabel('운세를 볼 날짜',{exact:true}).fill('2026-10-24');await page.getByLabel('일정 선택',{exact:true}).selectOption('interview');}
 const before=await page.locator('details.disclosure').evaluateAll(es=>es.map(e=>(e as HTMLDetailsElement).open));await page.pdf({path:`${dir}/print/${slug}.pdf`,format:'A4',printBackground:true});expect(await page.locator('details.disclosure').evaluateAll(es=>es.map(e=>(e as HTMLDetailsElement).open))).toEqual(before);await page.screenshot({path:`${dir}/screenshots/${slug}-result.png`,fullPage:true});}
});
test('new static menus reload directly and remain memory-only without private input leaks',async({page,context})=>{
 const requests:string[]=[],logs:string[]=[];page.on('request',r=>requests.push(decodeURIComponent(r.url())+' '+(r.postData()??'')));page.on('console',m=>logs.push(m.text()));
 for(const slug of ['tomorrow','date','manse']){expect((await page.goto(`/fortune/${slug}/`))?.status()).toBe(200);expect((await page.reload())?.status()).toBe(200);expect((await page.goto(`/result/${slug}/`))?.status()).toBe(200);await expect(page.locator('.empty-state')).toBeVisible();}
 await enter(page,'date');await page.getByLabel('운세를 볼 날짜',{exact:true}).fill('2030-04-12');await page.getByLabel('일정 선택',{exact:true}).selectOption('interview');await page.getByRole('button',{name:/이 운세 메뉴 공유하기/}).click();expect(requests.join(' ')+logs.join(' ')).not.toMatch(/1995-11-08|2030-04-12|suwon|luckClass/);expect(page.url()).not.toMatch(/[?#]/);expect(await context.cookies()).toEqual([]);expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length}))).toEqual({local:0,session:0});await page.reload();await expect(page.locator('.empty-state')).toBeVisible();
});
test('today follows Korean midnight while only the specified-date menu pins a chosen day',async({page})=>{
 await page.clock.install({time:new Date('2026-10-23T14:59:30Z')});await enter(page,'day');
 await expect(page.locator('.sector-heading h2')).toContainText('23일');await page.clock.fastForward(60000);await expect(page.locator('.sector-heading h2')).toContainText('24일');
 await switchReading(page,'지정일 운세');await expect(page.getByLabel('운세를 볼 날짜',{exact:true})).toHaveValue('');
 await page.getByLabel('운세를 볼 날짜',{exact:true}).fill('2026-10-20');await page.clock.fastForward(86400000);await expect(page.getByLabel('운세를 볼 날짜',{exact:true})).toHaveValue('2026-10-20');
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
 await expect(page.getByLabel('운세를 볼 날짜',{exact:true})).toBeVisible();
});
test('all score-driving records are readable in public segment reasons for day month and year',async({page})=>{
 await page.clock.install({time:new Date('2026-10-23T03:00:00Z')});await enter(page);
 for(const [slug,label] of [['day','오늘의 운세'],['month','이번달 운세'],['year','올해 운세']]){
  if(slug!=='day')await switchReading(page,label);
  await page.locator('.sector-segments > summary').click();
  const script=`import {calculateAdvanced} from './src/domain/advanced/chart.ts';import {buildSectorReading} from './src/domain/foundation/engine.ts';import {domains} from './src/domain/foundation/types.ts';const chart=calculateAdvanced({year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''},{enabled:true,timePolicy:'standard'});const reading=buildSectorReading(chart,'${slug}','2026-10-23');console.log(JSON.stringify({expected:reading.segments.reduce((sum,s)=>sum+domains.filter(d=>d!=='overall').reduce((n,d)=>n+s.sectors[d].contributions.length,0),0)}));`;
  const expected=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',script],{encoding:'utf8'}).trim()).expected;
  const reasons=page.locator('.sector-score-reasons li');expect(await reasons.count()).toBe(expected);expect(expected).toBeGreaterThan(0);
  for(const item of await reasons.all()){await expect(item).toBeVisible();expect((await item.innerText()).length).toBeGreaterThan(8);}
 }
});
