import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs/promises';
import {switchReading} from './helpers/reading';
const dir='reports/final-2.3.0';
async function fill(page:Page,day='8',known=false){await page.getByLabel('태어난 연도',{exact:true}).fill('1995');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('11');await page.getByLabel('일',{exact:true}).fill(day);if(known){await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill('15');await page.getByLabel('분 (0~59)',{exact:true}).fill('3');}}
for(const width of [320,390,430])test(`requested home groups and readable manse at ${width}`,async({page})=>{
 await page.clock.install({time:new Date('2026-10-24T03:00:00Z')});await page.setViewportSize({width,height:900});await page.goto('/');
 await expect(page.locator('.primary-nav a')).toHaveText(['신년 운세','오늘의 운세','이번달 운세','지정일 운세','올해 운세']);
 expect(await page.locator('.quick-nav a').allTextContents()).toEqual(['신년 운세↗','오늘의 운세↗','이번달 운세↗','지정일 운세↗','MBTI 운세↗','만세력↗','연애사주↗','짝궁합↗']);
 await expect(page.locator('.category-grid strong')).toHaveText(['신년운세','오늘의 운세','지정일 운세','별자리운세','띠별운세','MBTI 운세','대인관계','연애사주','짝궁합']);expect(await page.getByRole('link',{name:/혈액형/}).count()).toBe(0);
 const boxes=await page.locator('.quick-nav a').evaluateAll(es=>es.map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y,h:e.getBoundingClientRect().height})));expect(new Set(boxes.map(b=>Math.round(b.y))).size).toBe(2);expect(new Set(boxes.map(b=>Math.round(b.x))).size).toBe(4);expect(boxes.every(b=>b.h>=44)).toBe(true);
 await fs.mkdir(`${dir}/screenshots`,{recursive:true});await page.screenshot({path:`${dir}/screenshots/home-${width}.png`,fullPage:true});
 await page.goto('/fortune/manse/');await fill(page);await page.getByRole('button',{name:'무료로 만세력 보기'}).click();
 await expect(page.locator('.birth-summary')).toContainText('한국 음력');await expect(page.locator('.birth-summary')).toContainText('태어난 시간 모름');await expect(page.locator('.natal-table thead th')).toHaveText(['항목','시주','일주나','월주','년주']);await expect(page.locator('.natal-table')).toContainText('12운성');await expect(page.locator('.natal-table [data-pillar="hour"][data-row="stem"]')).toHaveText('시간 모름');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`${dir}/screenshots/manse-${width}.png`,fullPage:true});
});
test('new-year and current-year share results and preserve birth on year changes',async({page})=>{
 await page.clock.install({time:new Date('2026-12-31T16:00:00Z')}); // KST 2027-01-01, regardless of browser zone
 await page.goto('/fortune/saju/');await fill(page,'8',true);await page.getByRole('button',{name:'무료로 신년운세 보기'}).click();await expect(page.getByLabel('운세를 볼 연도',{exact:true})).toHaveValue('2028');
 const natal=await page.locator('.natal-table').innerText();await page.getByLabel('운세를 볼 연도',{exact:true}).selectOption('2027');const result=await page.locator('.sector-bodies').innerText();expect(await page.locator('.natal-table').innerText()).toBe(natal);
 await switchReading(page,'올해 운세');expect(await page.locator('.sector-bodies').innerText()).toBe(result);await expect(page.locator('.sector-heading')).toContainText('2027');await expect(page.locator('main input[type=date]')).toHaveCount(0);
 await switchReading(page,'신년운세');await expect(page.getByLabel('운세를 볼 연도',{exact:true})).toHaveValue('2027');expect(await page.locator('.natal-table').innerText()).toBe(natal);await page.getByLabel('운세를 볼 연도',{exact:true}).selectOption('2050');await expect(page.locator('.sector-body')).toHaveCount(6);await expect(page.locator('main').getByRole('alert')).toHaveCount(0);
 await fs.mkdir(`${dir}/print`,{recursive:true});await page.pdf({path:`${dir}/print/new-year-2050.pdf`,format:'A4',printBackground:true});await page.screenshot({path:`${dir}/screenshots/new-year-390.png`,fullPage:true});
});
test('two inputs stay independent, names do not change comparison, reload clears both',async({page})=>{
 await page.setViewportSize({width:390,height:900});const requests:string[]=[];page.on('request',r=>requests.push(r.url()+' '+(r.postData()??'')));
 await page.goto('/fortune/compatibility/');await fill(page,'8',true);await page.getByRole('button',{name:'A · 첫 번째 사람의 출생정보 적용'}).click();await expect(page.getByRole('heading',{name:'B · 두 번째 사람의 출생정보'})).toBeVisible();await fill(page,'9');await page.getByRole('button',{name:'B · 두 번째 사람의 출생정보 적용'}).click();await page.getByRole('button',{name:'두 사람의 짝궁합 보기'}).click();
 const tables=page.locator('.natal-table');await expect(tables).toHaveCount(2);const a=await tables.nth(0).innerText(),b=await tables.nth(1).innerText(),text=await page.locator('.reading-section').allTextContents();expect(a).not.toBe(b);
 await page.getByRole('link',{name:'A 또는 B 정보 변경'}).click();await page.getByRole('button',{name:'A · 첫 번째 사람 입력됨'}).click();await page.getByLabel(/이름 또는 별명/).fill('이름만변경');await page.getByRole('button',{name:'A · 첫 번째 사람의 출생정보 적용'}).click();await page.getByRole('button',{name:'두 사람의 짝궁합 보기'}).click();expect(await tables.nth(0).innerText()).toBe(a);expect(await tables.nth(1).innerText()).toBe(b);expect(await page.locator('.reading-section').allTextContents()).toEqual(text);
 expect(requests.some(r=>/1995|이름만변경|nickname=/.test(r))).toBe(false);expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length,document.cookie])).toEqual([0,0,'']);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`${dir}/screenshots/compatibility-390.png`,fullPage:true});
 await fs.mkdir(`${dir}/print`,{recursive:true});await page.pdf({path:`${dir}/print/compatibility.pdf`,format:'A4',printBackground:true});await page.reload();await expect(page.getByRole('heading',{name:'두 사람의 정보가 필요해요'})).toBeVisible();
});
test('time settings synchronize the visible natal chart and preserved detailed natal analysis in both directions',async({page})=>{
 await page.clock.install({time:new Date('2026-10-24T03:00:00Z')});await page.goto('/fortune/saju/');await fill(page,'8',true);await page.getByRole('button',{name:'무료로 신년운세 보기'}).click();await expect(page.locator('[data-pillar="hour"][data-row="stem"]')).toContainText('庚');
 const sector=page.locator('.sector-experience');await sector.getByText('시간 보정·계산 기준',{exact:true}).click();await sector.getByRole('combobox',{name:'출생 도시',exact:true}).selectOption('seoul');await sector.getByRole('combobox',{name:'시각 기준',exact:true}).selectOption('mean-solar');await expect(page.locator('[data-pillar="hour"][data-row="stem"]')).toContainText('己');
 await page.getByText('타고난 사주와 자세한 대운·세운 해설',{exact:true}).click();const detail=page.locator('.advanced-experience');await expect(detail.locator('.advanced-summary')).toContainText('지방평균태양시');await expect(detail.locator('#advanced-time')).toContainText('14:30');
 await detail.getByText('시간 보정·계산 기준 설정',{exact:true}).click();await detail.getByRole('combobox',{name:'시각 기준',exact:true}).selectOption('standard');await expect(page.locator('[data-pillar="hour"][data-row="stem"]')).toContainText('庚');await expect(detail.locator('.advanced-summary')).toContainText('한국 표준시');await expect(sector.getByRole('combobox',{name:'시각 기준',exact:true})).toHaveValue('standard');
});
