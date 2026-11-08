import {chromium,expect} from '@playwright/test';
import fs from 'node:fs/promises';
const base=process.env.PUBLIC_SITE_URL||'https://spring-voice-4bdc.eogjs9595.workers.dev',dir='reports/copy-followup/public';
const release=JSON.parse(await fs.readFile('public/release.json','utf8'));
await fs.mkdir(dir,{recursive:true});
const examples=JSON.parse(await fs.readFile('content-review/copy-followup/assembled-examples.json','utf8'));
const expected=kind=>examples.find(r=>r.index===0&&r.kind===kind).fields;
const u=process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null,proxy=u?{server:u.origin,...(u.username?{username:decodeURIComponent(u.username),password:decodeURIComponent(u.password)}:{})}:undefined;
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox'],proxy});const checks=[];
try{for(const width of [320,390]){
 const context=await browser.newContext({viewport:{width,height:950}}),requests=[],errors=[];let closing=false;
 // Fetch real public responses with normal TLS verification. No local build response substitution.
 // The execution proxy CA is trusted by Node, not by the Chromium process in this workspace.
 await context.route(base+'/**',async route=>{try{const response=await context.request.fetch(route.request(),{timeout:25000});requests.push({url:response.url(),status:response.status(),body:route.request().postData()});await route.fulfill({response});}catch(e){if(/Route is already handled/.test(String(e))||(closing&&/Target page, context or browser has been closed|Request context disposed/.test(String(e))))return;errors.push(String(e));await route.abort().catch(()=>{});}});
 try{const page=await context.newPage();page.setDefaultTimeout(25000);page.on('pageerror',e=>errors.push(e.message));await page.clock.install({time:new Date('2026-10-26T03:00:00Z')});console.log(`Checking live ${release.version} at ${width}px`);
 await page.goto(base+'/');await expect(page.locator('.primary-nav a')).toHaveCount(6);await expect(page.locator('.quick-nav a')).toHaveCount(8);await expect(page.locator('.category-grid strong')).toHaveText(['신년운세','오늘의 운세','지정일 운세','별자리운세','띠별운세','MBTI 운세','대인관계','연애사주','짝궁합']);await page.screenshot({path:`${dir}/home-${width}.png`,fullPage:true});
 const enter=async(slug,year,month,day,hour,minute)=>{await page.goto(`${base}/fortune/${slug}/`);await page.getByLabel('태어난 연도',{exact:true}).fill(year);await page.getByRole('combobox',{name:'월',exact:true}).selectOption(month);await page.getByLabel('일',{exact:true}).fill(day);await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill(hour);await page.getByLabel('분 (0~59)',{exact:true}).fill(minute);await expect(page.getByRole('combobox',{name:'출생 도시',exact:true})).toHaveCount(0);await page.getByRole('button',{name:/무료로 .* 보기/}).click();};
 await enter('personality','1990','1','9','12','0');await expect(page.locator('.result-content')).toContainText('해보았기에 알게 된 일도 있을 것입니다.');expect(await page.locator('main').innerText()).not.toMatch(/(?:^|\s)거입니다/);await page.locator('.result-content').screenshot({path:`${dir}/personality-${width}.png`});
 await enter('saju','1995','11','8','15','3');await page.getByLabel('운세를 볼 연도',{exact:true}).selectOption('2027');await expect(page.locator('.sector-body')).toHaveCount(6);const natal=await page.locator('.natal-table').innerText();
 const verifyFields=async kind=>{for(const field of expected(kind)){const section=page.locator(`#sector-${field.domain}`);await expect(section).toHaveAttribute('data-score',String(field.score));expect(await section.locator('p[data-source-id]').allTextContents()).toEqual(field.paragraphs.map(p=>p.text));}expect(await page.locator('main').textContent()).not.toMatch(/HIDDEN-|LIFE-STAGE-|\d+구간|한 달 내내 같은 흐름|한 해 안에서도 시기에 따라|하루 중에도 분위기/);await expect(page.locator('.sector-segments,#advanced-time,#advanced-compare')).toHaveCount(0);};
 await verifyFields('year');await page.locator('#sector-health').screenshot({path:`${dir}/year-health-${width}.png`});await page.locator('#sector-love').screenshot({path:`${dir}/year-love-${width}.png`});
 const switchTo=async name=>{await page.getByRole('button',{name:'메뉴',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name,exact:true}).click();await page.getByRole('link',{name:`같은 정보로 ${name} 보기`,exact:true}).click();await expect(page.locator('.natal-table')).toBeVisible();};
 await switchTo('이번달 운세');await expect(page.locator('.sector-body')).toHaveCount(6);await verifyFields('month');expect(await page.locator('.natal-table').innerText()).toBe(natal);
 await switchTo('오늘의 운세');await expect(page.locator('.sector-body')).toHaveCount(6);await expect(page.locator('main input[type=date]')).toHaveCount(0);await verifyFields('day');
 await switchTo('지정일 운세');await expect(page.locator('.sector-body')).toHaveCount(0);await page.getByLabel('운세를 볼 날짜',{exact:true}).fill('2026-02-04');await expect(page.locator('.sector-body')).toHaveCount(6);expect(await page.locator('.natal-table').innerText()).toBe(natal);
 await switchTo('만세력');await expect(page.locator('#advanced-topics')).toBeVisible();await expect(page.locator('.sector-body')).toHaveCount(0);expect(await page.locator('main').textContent()).not.toMatch(/HIDDEN-|LIFE-STAGE-|시간 보정·계산 기준/);
 await page.goto(base+'/fortune/compatibility/');await expect(page.getByRole('heading',{name:'두 사람의 출생정보를 따로 입력해 주세요'})).toBeVisible();await expect(page.getByRole('combobox',{name:'출생 도시',exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(requests.some(r=>r.status>=400||r.body||/1990-01-09|1995-11-08/.test(r.url))).toBe(false);expect(errors).toEqual([]);checks.push({width,passed:true,requests:requests.length,exactSourceParagraphs:true,pageErrors:errors});console.log(`PASS live ${width}px: reported sentence, all six domains, day/month/year, natal and independent menus`);
 }finally{closing=true;await context.unrouteAll({behavior:'ignoreErrors'});await context.close();}
}}
finally{await browser.close();}
await fs.writeFile('reports/copy-followup/public-checks.json',JSON.stringify({url:base,version:release.version,passed:true,clockFixture:'2026-10-26 KST',network:'TLS-verified public-response relay for workspace proxy CA',checks},null,2)+'\n');
