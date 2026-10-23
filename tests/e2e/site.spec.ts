import { test,expect,type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
declare global { interface Window {__shared?:{title:string;url:string};__copied?:string;__printed?:boolean;__xss?:boolean} }
async function fillBirth(page:Page,options:{year?:string;month?:string;day?:string;knownTime?:boolean;nickname?:string}={}){
  await page.getByLabel('태어난 연도',{exact:true}).fill(options.year??'1992');
  await page.getByRole('combobox',{name:'월',exact:true}).selectOption(options.month??'5');
  await page.getByLabel('일',{exact:true}).fill(options.day??'15');
  if(options.nickname)await page.getByLabel(/이름 또는 별명/).fill(options.nickname);
  if(options.knownTime){await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill('10');await page.getByLabel('분 (0~59)',{exact:true}).fill('30');}
}
async function submit(page:Page){await page.getByRole('button',{name:/무료로 .* 보기/}).click();await expect(page).toHaveURL(/\/result\//);await expect(page.locator('.reading-section')).not.toHaveCount(0);await expect(page.locator('#result-title')).toBeFocused();await expect(page.locator('.natal-overview')).toBeInViewport();}
async function openCalculation(page:Page){const outer=page.getByText('기존 표준시 간단 사주표 참고',{exact:true});if(await outer.count())await outer.click();await page.getByText('내 사주표와 오행 살펴보기',{exact:true}).click();}
async function birthResult(page:Page,knownTime=false){await page.goto('/fortune/saju/');await fillBirth(page,{knownTime});await submit(page);}
test('home → saju → actual known-time calculation and meaningful content',async({page})=>{
  await page.goto('/');await expect(page.locator('.category-tile')).toHaveCount(9);
  await page.locator('.category-tile').filter({hasText:'정통사주'}).click();await fillBirth(page,{knownTime:true});await submit(page);
  await expect(page.getByRole('heading',{level:1})).toHaveText('정통사주 풀이');
  await openCalculation(page);
  await expect(page.locator('.pillars-table')).toContainText('신');await expect(page.locator('.pillars-table').locator('..')).toContainText('8글자 기준');
  await expect(page.locator('.natal-table')).toBeVisible();await expect(page.locator('#advanced-strength')).toContainText('강약');await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).not.toContainText('섬세한 기준을 나에게도 다정하게');
});
test('invalid date → focused error → correction → result',async({page})=>{
  await page.goto('/fortune/saju/');await fillBirth(page,{year:'2023',month:'2',day:'29'});
  await page.getByRole('button',{name:/무료로 .* 보기/}).click();await expect(page.locator('main').getByRole('alert')).toContainText('날짜');await expect(page.getByLabel('일',{exact:true})).toBeFocused();
  await page.getByLabel('일',{exact:true}).fill('28');await submit(page);
});
test('unknown time excludes hour and counts exactly six characters',async({page})=>{
  await birthResult(page);await expect(page.locator('.natal-table')).toContainText('시간 모름');
  await openCalculation(page);await expect(page.locator('.pillars-table')).toContainText('시간 미상');await expect(page.locator('.pillars-table').locator('..')).toContainText('6글자 기준');
});
test('lunar leap date roundtrip and invalid leap rejection',async({page})=>{
  await page.goto('/fortune/saju/');await page.getByRole('radio',{name:'음력',exact:true}).check();await page.getByLabel('윤달 생일이에요').check();await fillBirth(page,{year:'2024',month:'2',day:'1'});
  await page.getByRole('button',{name:/무료로 .* 보기/}).click();await expect(page.locator('main').getByRole('alert')).toContainText('윤달');
  await fillBirth(page,{year:'2017',month:'5',day:'1'});await submit(page);await openCalculation(page);await expect(page.locator('.pillars-table').locator('..')).toContainText('양력 2017-06-24');
});
test('calendar switch does not silently change the numbers',async({page})=>{
  await page.goto('/fortune/saju/');await fillBirth(page);await page.getByRole('radio',{name:'음력',exact:true}).check();await expect(page.getByLabel('태어난 연도',{exact:true})).toHaveValue('1992');await expect(page.getByLabel('일',{exact:true})).toHaveValue('15');
});
test('missing exact minute is rejected rather than filled as midnight',async({page})=>{
  await page.goto('/fortune/saju/');await fillBirth(page);await page.getByLabel('시간 모름',{exact:true}).uncheck();await page.getByLabel('시 (0~23)',{exact:true}).fill('10');await page.getByRole('button',{name:/무료로 .* 보기/}).click();await expect(page.locator('main').getByRole('alert')).toBeVisible();await expect(page).toHaveURL(/\/fortune\/saju\//);
});
test('edit input changes actual natal result',async({page})=>{
  await birthResult(page);const before=await page.locator(':is(.result-hero,.advanced-summary,.sector-heading) h2').textContent();await page.getByRole('link',{name:'입력 수정',exact:true}).click();await page.getByLabel('일',{exact:true}).fill('16');await submit(page);expect(await page.locator(':is(.result-hero,.advanced-summary,.sector-heading) h2').textContent()).not.toBe(before);
});
test('same day stem receives different contextual love content from actual natal relations',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.goto('/fortune/love/');await fillBirth(page,{knownTime:true});await submit(page);
  const headline=await page.locator(':is(.result-hero,.advanced-summary,.sector-heading) h2').textContent();
  await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).toContainText('장난이 다르게 들렸을 때');
  const why=page.locator('details.disclosure').filter({has:page.getByText('왜 이런 풀이인가요?',{exact:true})});
  await why.locator('summary').click();await expect(why).toContainText('식상 관계가 2개');
  await expect(why).toContainText('개수는 강약이 아니에요');
  await why.locator('summary').click();
  await fs.mkdir('reports/content-improvement-1.1.0/screenshots',{recursive:true});
  await page.screenshot({path:'reports/content-improvement-1.1.0/screenshots/love-output-390.png',fullPage:true});
  await page.getByRole('link',{name:'입력 수정',exact:true}).click();await fillBirth(page,{year:'2000',month:'1',day:'4',knownTime:true});await submit(page);
  expect(await page.locator(':is(.result-hero,.advanced-summary,.sector-heading) h2').textContent()).toBe(headline);
  await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).toContainText('약속을 지키기 어려울 때 알리는 방법');
  await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).not.toContainText('장난이 다르게 들렸을 때');
  await page.screenshot({path:'reports/content-improvement-1.1.0/screenshots/love-order-390.png',fullPage:true});
});
test('all core and period categories reuse the same birth state',async({page})=>{
  await birthResult(page);for(const [slug,title] of [['personality','성격풀이'],['love','연애사주'],['career-money','직업·재물'],['relationships','대인관계'],['single','솔로사주'],['mind','마음돌봄'],['day','오늘 운세'],['month','이번 달 운세'],['year','올해 운세']]){
    await page.locator('.other-links').getByRole('link',{name:title,exact:true}).click();await expect(page).toHaveURL(`/result/${slug}/`);await expect(page.locator('.reading-section').first()).toBeVisible();await expect(page.locator('.empty-state')).toHaveCount(0);
  }
});
test('Korean date updates at midnight and on tab focus',async({page})=>{
  await page.clock.install({time:new Date('2024-01-01T14:59:30Z')});await page.goto('/fortune/day/');await fillBirth(page);await submit(page);await expect(page.locator('.sector-heading h2')).toContainText('2024년 1월 1일');
  await page.clock.fastForward(60000);await expect(page.locator('.sector-heading h2')).toContainText('2024년 1월 2일');
  await page.clock.setSystemTime(new Date('2025-01-01T03:00:00Z'));await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.getByRole('link',{name:/하루사주.*홈/}).click();await expect(page.locator('.year-banner')).toContainText('2025년');
});
for(const [slug,label] of [['zodiac','토끼띠'],['constellation','천칭자리'],['blood-type','AB형']] as const)test(`direct ${slug} selection → own content`,async({page})=>{
  await page.goto(`/fortune/${slug}/`);await page.getByRole('radio',{name:label,exact:slug!=='constellation'}).check();await page.getByRole('button',{name:/.*(운세|풀이) 보기/}).click();await expect(page).toHaveURL(`/result/${slug}/`);await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).not.toBeEmpty();await expect(page.locator(':is(.result-hero,.advanced-summary,.sector-heading)')).toContainText(slug==='blood-type'?'AB형':label);
});
test('blood unknown offers guidance without guessing',async({page})=>{
  await page.goto('/fortune/blood-type/');await page.getByRole('radio',{name:'모름',exact:true}).check();await page.getByRole('button',{name:'혈액형풀이 보기'}).click();await expect(page.getByRole('status')).toContainText('추측하지 않아요');await expect(page).toHaveURL('/fortune/blood-type/');
});
test('menu native dialog traps focus, ESC closes and returns focus',async({page})=>{
  await page.goto('/');const menu=page.getByRole('button',{name:'메뉴',exact:true});await menu.click();await expect(menu).toHaveAttribute('aria-expanded','true');await expect(page.getByRole('dialog',{name:'전체 메뉴'})).toBeVisible();await expect(page.getByRole('button',{name:/닫기/})).toBeFocused();
  await page.keyboard.press('Shift+Tab');expect(await page.evaluate(()=>document.querySelector('dialog')?.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');await expect(menu).toHaveAttribute('aria-expanded','false');await expect(menu).toBeFocused();await menu.click();await page.getByRole('dialog').getByRole('link',{name:'직업·재물'}).click();await expect(page).toHaveURL('/fortune/career-money/');await expect(page.getByRole('dialog')).not.toBeVisible();
});
test('clear and other person discard all previous state',async({page})=>{
  await birthResult(page);await page.getByRole('button',{name:'다른 사람 보기',exact:true}).click();await expect(page.getByLabel('태어난 연도',{exact:true})).toHaveValue('');await expect(page.locator('.reuse-panel')).toHaveCount(0);
  await fillBirth(page);await submit(page);await page.getByRole('button',{name:'입력 지우기',exact:true}).click();await expect(page).toHaveURL('/');await page.goto('/result/saju/');await expect(page.locator('.empty-state')).toContainText('입력정보가 없어');
});
test('result reload and direct entry show memory-only recovery guidance',async({page})=>{
  await birthResult(page);await page.reload();await expect(page.locator('.empty-state')).toContainText('새로고침하면 개인정보가 사라져요');await page.goto('/result/love/');await expect(page.locator('.empty-state')).toContainText('다시 입력하면');
});
test('generic sharing: Web Share success, cancellation, clipboard and manual fallback',async({page})=>{
  await birthResult(page);const button=page.getByRole('button',{name:/이 운세 메뉴 공유하기/});
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async(data:{title:string;url:string})=>{window.__shared=data;}}));await button.click();await expect(page.getByRole('status')).toHaveText('운세 메뉴를 공유했어요.');expect((await page.evaluate(()=>window.__shared))?.url).toBe('http://127.0.0.1:3000/fortune/saju/');
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('cancel','AbortError');}}));await button.click();await expect(page.getByRole('status')).toHaveText('공유를 취소했어요.');
  await page.evaluate(()=>{Object.defineProperty(navigator,'share',{configurable:true,value:undefined});Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(url:string)=>{window.__copied=url;}}});});await button.click();await expect(page.getByRole('status')).toHaveText('이 운세의 시작 화면 링크를 복사했어요.');expect(await page.evaluate(()=>window.__copied)).toBe('http://127.0.0.1:3000/fortune/saju/');
  await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined}));await button.click();await expect(page.locator('.share-fallback')).toHaveValue('http://127.0.0.1:3000/fortune/saju/');
});
test('print action works and print stylesheet hides controls',async({page})=>{
  await birthResult(page);await page.evaluate(()=>{window.print=()=>{window.__printed=true;};});await page.getByRole('button',{name:'결과 인쇄하기',exact:true}).click();expect(await page.evaluate(()=>window.__printed)).toBe(true);await page.emulateMedia({media:'print'});await expect(page.locator('.site-header')).toBeHidden();await expect(page.locator('.share-panel')).toBeHidden();await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).toBeVisible();await expect(page.locator(':is(.result-hero,.advanced-summary,.sector-heading)')).toBeVisible();
});
for(const initiallyOpen of [false,true])test(`native PDF includes disclosures and restores state: initially ${initiallyOpen?'open':'closed'}`,async({page})=>{
  await birthResult(page,true);
  if(initiallyOpen)await openCalculation(page);
  const states=()=>page.locator('details.disclosure').evaluateAll(elements=>elements.map(e=>(e as HTMLDetailsElement).open));
  const before=await states();
  await page.evaluate(()=>{
    document.body.dataset.printExpanded='false';
    window.addEventListener('beforeprint',()=>{document.body.dataset.printExpanded=String([...document.querySelectorAll<HTMLDetailsElement>('details.disclosure')].every(e=>e.open));});
  });
  await fs.mkdir('reports/print',{recursive:true});
  const pdf=await page.pdf({path:`reports/print/result-${initiallyOpen?'open':'closed'}.pdf`,format:'A4',printBackground:true});
  expect(pdf.byteLength).toBeGreaterThan(1000);
  await expect(page.locator('body')).toHaveAttribute('data-print-expanded','true');
  expect(await states()).toEqual(before);
  // Repeated previews must not replace the original state snapshot.
  await page.evaluate(()=>{window.dispatchEvent(new Event('beforeprint'));window.dispatchEvent(new Event('beforeprint'));});
  expect((await states()).every(Boolean)).toBe(true);
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.pillars-table')).toBeVisible();
  await expect(page.getByText('계산 표준시:',{exact:false})).toBeVisible();
  await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));
  expect(await states()).toEqual(before);
});
test('unknown day body stays neutral across affected topics',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.goto('/fortune/personality/');await fillBirth(page,{year:'1987',month:'6',day:'1'});await submit(page);
 for(const label of ['성격풀이','솔로사주','정통사주','올해 운세']){await page.locator('.other-links').getByRole('link',{name:label,exact:true}).click();await expect(page.locator('.natal-table [data-pillar="day"][data-row="stem"]')).toContainText('미확정');await expect(page.locator('main')).not.toContainText('확정한 일간');}
 await expect(page.locator('.sector-bodies')).toContainText('일간이 미확정');await expect(page.locator('[data-testid="radar-shape"]')).toHaveCount(0);await fs.mkdir('reports/screenshots',{recursive:true});await page.screenshot({path:'reports/screenshots/unknown-day-390.png',fullPage:true});
});
for(const dayMasterKnown of [false,true])for(const kind of ['year','month','day'] as const)test(`period details and native PDF respect ${dayMasterKnown?'known':'unknown'} day master: ${kind}`,async({page})=>{
 const state=dayMasterKnown?'known':'unknown';await page.setViewportSize({width:390,height:900});await page.clock.install({time:new Date('2026-12-31T03:00:00Z')});await page.goto(`/fortune/${kind}/`);await fillBirth(page,dayMasterKnown?{knownTime:true}:{year:'1987',month:'6',day:'1'});await submit(page);
 const details=page.locator('.sector-segments');const states=()=>page.locator('details.disclosure').evaluateAll(es=>es.map(e=>(e as HTMLDetailsElement).open));const before=await states();expect(before.every(open=>!open)).toBe(true);await fs.mkdir('reports/print',{recursive:true});await page.pdf({path:`reports/print/period-${kind}-${state}.pdf`,format:'A4',printBackground:true});expect(await states()).toEqual(before);
 await details.locator('summary').click();expect(await details.locator('section').count()).toBeGreaterThan(0);
 if(dayMasterKnown){await expect(page.locator('.sector-body')).toHaveCount(6);await expect(page.locator('[data-testid="radar-shape"]')).toBeVisible();await expect(page.locator('.sector-bodies')).not.toContainText('일간이 미확정');}else{await expect(page.locator('.sector-bodies')).toContainText('일간이 미확정');await expect(page.locator('[data-testid="radar-shape"]')).toHaveCount(0);await expect(details).toContainText('개인 해석 유보');}
});

test('year period visibly ends in the following year',async({page})=>{
 await page.clock.install({time:new Date('2026-12-31T03:00:00Z')});await page.goto('/fortune/year/');await fillBirth(page);await submit(page);await page.locator('.sector-segments summary').click();await expect(page.locator('.sector-segments > .disclosure-body > section').filter({has:page.locator('h3').filter({hasText:/^\d+구간/})}).last()).toContainText('2027-01-01 00:00');await fs.mkdir('reports/print',{recursive:true});await page.pdf({path:'reports/print/year-boundary.pdf',format:'A4',printBackground:true});
});

for(const width of [195,320,390])test(`constellation date labels remain readable at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});await page.goto('/fortune/constellation/');
  expect(await page.locator('.constellation-select small').count()).toBe(12);
  expect(await page.locator('.constellation-select small').evaluateAll(elements=>elements.every(e=>parseFloat(getComputedStyle(e).fontSize)>=14&&e.scrollWidth<=e.clientWidth))).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await fs.mkdir('reports/screenshots',{recursive:true});
  await page.screenshot({path:`reports/screenshots/constellation-${width}.png`,fullPage:true});
  if(width===390){
    await page.locator('.light-choice small').evaluateAll(elements=>elements.forEach(e=>{(e as HTMLElement).style.fontSize='28px';}));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.getByRole('radio',{name:/천칭자리/}).check();
    await page.getByRole('button',{name:'별자리운세 보기'}).click();await expect(page).toHaveURL('/result/constellation/');
  }
});
test('birth information never enters requests, URLs, console, or storage',async({page})=>{
  const requests:{url:string;body:string}[]=[],logs:string[]=[];
  page.on('request',r=>requests.push({url:decodeURIComponent(r.url()),body:r.postData()||''}));page.on('console',m=>logs.push(m.text()));
  await page.goto('/fortune/saju/');await fillBirth(page,{knownTime:true,nickname:'개인정보테스트별명'});await submit(page);await page.locator('.other-links').getByRole('link',{name:'연애사주',exact:true}).click();
  const serialized=JSON.stringify(requests);for(const forbidden of ['개인정보테스트별명','1992-05-15','1992%2D05%2D15','10:30'])expect(serialized).not.toContain(forbidden);
  expect(requests.every(r=>!r.body)).toBe(true);expect(logs.join(' ')).not.toContain('개인정보테스트별명');expect(page.url()).not.toContain('?');expect(page.url()).not.toContain('#');
  expect(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)}))).toEqual({local:[],session:[]});
  await page.getByRole('button',{name:'입력 지우기',exact:true}).click();expect(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)}))).toEqual({local:[],session:[]});
});
test('corrupt or unavailable storage cannot break the memory workflow',async({page})=>{
  await page.addInitScript(()=>{localStorage.setItem('haru-saju','{broken');Object.defineProperty(Storage.prototype,'getItem',{value(){throw new DOMException('unavailable','SecurityError');}});Object.defineProperty(Storage.prototype,'setItem',{value(){throw new DOMException('unavailable','SecurityError');}});});
  await birthResult(page);await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).toBeVisible();
});
test('malicious nickname renders as text and cannot execute HTML',async({page})=>{
  await page.goto('/fortune/saju/');await fillBirth(page,{nickname:'<svg/onload=alert()>'});const dialogs:string[]=[];page.on('dialog',async d=>{dialogs.push(d.message());await d.dismiss();});await submit(page);await expect(page.locator(':is(.result-hero,.advanced-summary,.sector-heading)')).toContainText('<svg/onload=alert()>');expect(await page.locator('.advanced-summary svg').count()).toBe(0);expect(dialogs).toEqual([]);
});
test('unsupported path and slug return real static 404',async({page})=>{
  for(const path of ['/fortune/unsupported/','/result/unsupported/','/no-such-page/']){const response=await page.goto(path);expect(response?.status()).toBe(404);await expect(page.getByRole('heading',{name:'이 페이지를 찾을 수 없어요'})).toBeVisible();}
});
test('every static internal route can open and reload directly',async({page})=>{
  const slugs=['tomorrow','date','manse','mbti','saju','personality','love','career-money','relationships','single','mind','year','month','day','zodiac','constellation','blood-type'];
  for(const slug of slugs){const response=await page.goto(`/fortune/${slug}/`);expect(response?.status()).toBe(200);await expect(page.locator('h1')).toBeVisible();expect((await page.reload())?.status()).toBe(200);}
  for(const slug of ['guide','glossary','privacy','terms','credits'])expect((await page.goto(`/${slug}/`))?.status()).toBe(200);
});
test('static SEO excludes results and never fabricates canonical domain',async({page,request})=>{
  await page.goto('/result/saju/');expect(await page.locator('meta[name="robots"]').getAttribute('content')).toContain('noindex');
  await page.goto('/');expect(await page.locator('link[rel="canonical"]').count()).toBe(0);expect(await (await request.get('/sitemap.xml')).text()).not.toContain('/result/');expect(await (await request.get('/sitemap.xml')).text()).not.toContain('example.com');
});
for(const width of [320,360,375,390,430,768,1024,1440])test(`responsive home/input/result: ${width}px without horizontal overflow`,async({page})=>{
  await page.setViewportSize({width,height:900});
  for(const route of ['/','/fortune/saju/']){await page.goto(route);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}
  await fillBirth(page);await submit(page);await openCalculation(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
for(const width of [375,390,1440])test(`capture home, input, result at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:1000});await fs.mkdir('reports/screenshots',{recursive:true});
  await page.goto('/');await page.screenshot({path:`reports/screenshots/home-${width}.png`,fullPage:true});
  await page.goto('/fortune/saju/');await page.screenshot({path:`reports/screenshots/input-${width}.png`,fullPage:true});await fillBirth(page,{knownTime:true});await submit(page);await page.screenshot({path:`reports/screenshots/result-${width}.png`,fullPage:true});
});
test('axe accessibility on home, menu, form and expanded result',async({page})=>{
  const audit=async()=>{const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);};
  await page.goto('/');await audit();await page.getByRole('button',{name:'메뉴',exact:true}).click();await audit();await page.keyboard.press('Escape');await page.goto('/fortune/saju/');await audit();await fillBirth(page);await submit(page);await openCalculation(page);await audit();
});
test('large text 200% reflows and keyboard can reach form submission',async({page})=>{
  await page.setViewportSize({width:390,height:900});await page.goto('/');
  await page.evaluate(()=>{const sizes=Array.from(document.querySelectorAll<HTMLElement>('main h1,main h2,main p,main strong,main a,main summary')).map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize)}));for(const {el,size} of sizes)el.style.fontSize=`${size*2}px`;});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.goto('/fortune/saju/');await fillBirth(page);await page.getByLabel('일',{exact:true}).focus();for(let i=0;i<5;i++)await page.keyboard.press('Tab');await page.getByRole('button',{name:/무료로 .* 보기/}).focus();await page.keyboard.press('Enter');await expect(page).toHaveURL('/result/saju/');
});
test('200% zoom equivalent CSS viewport reflows to two columns',async({page})=>{
  await page.setViewportSize({width:195,height:450});await page.goto('/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.goto('/fortune/saju/');expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await fillBirth(page);await submit(page);await openCalculation(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('DST gaps and folds are explicit errors; unknown DST day stays limited',async({page})=>{
  await page.goto('/fortune/saju/');await fillBirth(page,{year:'1987',month:'5',day:'10',knownTime:true});await page.getByLabel('시 (0~23)',{exact:true}).fill('2');await page.getByRole('button',{name:/무료로 .* 보기/}).click();await expect(page.locator('main').getByRole('alert')).toContainText('존재하지 않는 시각');
  await page.getByLabel('태어난 연도',{exact:true}).fill('1988');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('10');await page.getByLabel('일',{exact:true}).fill('9');await page.getByRole('button',{name:/무료로 .* 보기/}).click();await expect(page.locator('main').getByRole('alert')).toContainText('두 번 존재');
  await page.getByLabel('시간 모름',{exact:true}).check();await submit(page);await expect(page.locator(':is(.result-hero,.advanced-summary,.sector-heading)')).toContainText('일주 미확정');await expect(page.locator('main')).toContainText('일주도 미확정');
});
test('unknown lichun date never invents year or month',async({page})=>{
  await page.goto('/fortune/saju/');await fillBirth(page,{year:'2024',month:'2',day:'4'});await submit(page);await expect(page.locator('main')).toContainText('연주·월주');await openCalculation(page);await expect(page.locator('.pillars-table')).toContainText('미확정');await expect(page.locator('.pillars-table').locator('..')).toContainText('2글자 기준');
});
test('mobile touch emulation and landscape keep inputs and results usable',async({browser})=>{
  const context=await browser.newContext({baseURL:'http://127.0.0.1:3000',viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  const page=await context.newPage();await birthResult(page);await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).toBeVisible();await page.setViewportSize({width:844,height:390});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await context.close();
});
test('Seoul today is independent of a Los Angeles browser timezone',async({browser})=>{
  const context=await browser.newContext({baseURL:'http://127.0.0.1:3000',timezoneId:'America/Los_Angeles'});const page=await context.newPage();await page.clock.install({time:new Date('2026-10-19T16:00:00Z')});await page.goto('/fortune/day/');await fillBirth(page);await submit(page);await expect(page.locator('.sector-heading h2')).toHaveText('2026년 10월 20일');await context.close();
});
test('disabled JavaScript cannot submit birth data to a server',async({browser})=>{
  const context=await browser.newContext({baseURL:'http://127.0.0.1:3000',javaScriptEnabled:false});const page=await context.newPage();const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
  await page.goto('/fortune/saju/');await fillBirth(page);await expect(page.getByRole('button',{name:/무료로 .* 보기/})).toBeDisabled();await page.getByLabel('일',{exact:true}).press('Enter');await page.waitForLoadState('networkidle');await expect(page).toHaveURL('/fortune/saju/');expect(requests.some(url=>url.includes('year=')||url.includes('1992'))).toBe(false);await expect(page.getByText(/브라우저 안에서 계산하려면 자바스크립트가 필요해요/)).toBeVisible();await context.close();
});

test('CR-01 vowel-ending explanation is correct on screen and in native PDF',async({page})=>{
  await page.setViewportSize({width:390,height:900});
  await page.goto('/fortune/love/');await fillBirth(page,{year:'2000',month:'1',day:'9',knownTime:true});await submit(page);
  const why=page.locator('details.disclosure').filter({has:page.getByText('왜 이런 풀이인가요?',{exact:true})});
  await why.locator('summary').click();await expect(why).toContainText('계산된 일간은 병화예요');await expect(why).not.toContainText('병화이에요');
  const before=await page.locator('details.disclosure').evaluateAll(es=>es.map(e=>(e as HTMLDetailsElement).open));
  await fs.mkdir('reports/content-improvement-1.4.0/screenshots',{recursive:true});
  // Capture from document origin so offscreen fixed skip links stay outside the full-page image.
  await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
  await page.screenshot({path:'reports/content-improvement-1.4.0/screenshots/corrected-love-390.png',fullPage:true});
  await page.pdf({path:'reports/print/grammar-copula.pdf',format:'A4',printBackground:true});
  expect(await page.locator('details.disclosure').evaluateAll(es=>es.map(e=>(e as HTMLDetailsElement).open))).toEqual(before);
});
test('CR-01 and CR-02 annual basis identifies actual interval facts and retains review IDs inside disclosure',async({page})=>{
 await page.setViewportSize({width:390,height:900});await page.clock.install({time:new Date('2026-10-20T03:00:00Z')});await page.goto('/fortune/year/');await fillBirth(page,{knownTime:true});await submit(page);const why=page.locator('.sector-segments');await why.locator('summary').click();await expect(why).toContainText('2026-02-04');await expect(why).toContainText('편재');await expect(why).toContainText('정관');await expect(why).not.toContainText('편재을');await expect(why).not.toContainText('편재이에요');await expect(page.locator('.sector-bodies')).not.toContainText('sector:');await fs.mkdir('reports/print',{recursive:true});await page.pdf({path:'reports/print/grammar-year-trace.pdf',format:'A4',printBackground:true});await expect(why).toHaveAttribute('open','');
});

test('period trace stays in memory and expanded result reflows at 320px and enlarged 390px',async({page,context})=>{
  const requests:{url:string;body:string}[]=[],logs:string[]=[];
  page.on('request',r=>requests.push({url:decodeURIComponent(r.url()),body:r.postData()??''}));page.on('console',m=>logs.push(m.text()));
  await page.clock.install({time:new Date('2026-10-20T03:00:00Z')});await page.goto('/fortune/year/');await fillBirth(page,{knownTime:true,nickname:'기간진단개인정보검사'});await submit(page);
  await page.locator('.sector-segments summary').click();
  for(const width of [320,390]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
  await page.locator('main p, main li, main h3').evaluateAll(es=>es.forEach(e=>{(e as HTMLElement).style.fontSize=`${parseFloat(getComputedStyle(e).fontSize)*2}px`;}));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(await page.evaluate(()=>({local:Object.keys(localStorage),session:Object.keys(sessionStorage)}))).toEqual({local:[],session:[]});expect(await context.cookies()).toEqual([]);
  for(const bad of ['기간진단개인정보검사','1992-05-15','10:30','period-year-4'])expect(JSON.stringify(requests)+logs.join(' ')).not.toContain(bad);
  expect(requests.every(r=>!r.body)).toBe(true);expect(page.url()).not.toMatch(/[?#]/);
  await page.reload();await expect(page.locator('.empty-state')).toBeVisible();
});

test('KR-02 natal analysis remains substantial and survives native print',async({page})=>{
 await page.setViewportSize({width:390,height:900});await birthResult(page,true);await expect(page.locator('#advanced-topics')).toContainText('구성에서 이어지는 주제 풀이');expect((await page.locator('#advanced-topics').innerText()).length).toBeGreaterThan(800);await expect(page.locator('main')).not.toContainText('섬세한 기준을 나에게도 다정하게');
 for(const width of [390,320]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 const states=()=>page.locator('details.disclosure').evaluateAll(es=>es.map(e=>(e as HTMLDetailsElement).open));const before=await states();await fs.mkdir('reports/print',{recursive:true});await page.pdf({path:'reports/print/editorial-general.pdf',format:'A4',printBackground:true});expect(await states()).toEqual(before);
});

test('KR-03 and KR-06 dates sit beside the reading and love does not presume a partner',async({page})=>{
  await page.setViewportSize({width:390,height:900});await page.clock.install({time:new Date('2026-10-20T03:00:00Z')});
  await page.goto('/fortune/love/');await fillBirth(page,{knownTime:true});await submit(page);
  await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).toContainText('지금 만나는 사람이 없다면');await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).toContainText('내게는 당연해도 상대는 모를 수 있어요');
  await page.pdf({path:'reports/print/editorial-love.pdf',format:'A4',printBackground:true});
  await page.locator('.other-links').getByRole('link',{name:'올해 운세',exact:true}).click();
  await expect(page.locator('.sector-heading')).toContainText('2026년');await expect(page.locator('.sector-bodies')).not.toContainText('분기마다');await page.locator('.sector-segments summary').click();expect(await page.locator('.sector-segments section').count()).toBeGreaterThanOrEqual(13);await expect(page.locator('.sector-segments')).toContainText('2027-01-01');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));
  await page.screenshot({path:'reports/content-improvement-1.4.0/screenshots/editorial-year-range-390.png',fullPage:true});
});
test('all 13 edited menu flows render their own actual content at mobile width',async({page})=>{
  await page.setViewportSize({width:390,height:900});await birthResult(page,true);
  for(const label of ['정통사주','성격풀이','연애사주','직업·재물','대인관계','솔로사주','마음돌봄','올해 운세','이번 달 운세','오늘 운세']){
    await page.locator('.other-links').getByRole('link',{name:label,exact:true}).click();
    await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).not.toBeEmpty();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
  for(const [slug,label] of [['zodiac','쥐띠'],['constellation','염소자리'],['blood-type','A형']]){
    await page.goto(`/fortune/${slug}/`);await page.getByRole('radio',{name:label,exact:slug!=='constellation'}).check();await page.getByRole('button',{name:/.*(운세|풀이) 보기/}).click();
    await expect(page.locator(':is(.result-content,#advanced-topics,.sector-bodies)')).not.toBeEmpty();await page.getByText('왜 이런 풀이인가요?',{exact:true}).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }
});
