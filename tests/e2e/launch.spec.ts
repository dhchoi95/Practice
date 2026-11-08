import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
const ratio=(a:string,b:string)=>{const lum=(s:string)=>{const c=s.match(/[\d.]+/g)!.slice(0,3).map(Number).map(n=>{const v=n/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});return .2126*c[0]+.7152*c[1]+.0722*c[2];};const x=lum(a),y=lum(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};
test('privacy controls clear only browser inputs and contact/cookie information matches the inactive service',async({page,context})=>{
 const outgoing:string[]=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:3000/')&&!r.url().startsWith('data:'))outgoing.push(r.url());});
 await page.goto('/fortune/day/');await page.getByLabel('태어난 연도',{exact:true}).fill('1991');await page.getByRole('combobox',{name:'월',exact:true}).selectOption('5');await page.getByLabel('일',{exact:true}).fill('16');await page.getByRole('button',{name:/무료로 .* 보기/}).click();await expect(page.locator('.natal-overview')).toBeVisible();await page.getByRole('navigation',{name:'하단 안내'}).getByRole('link',{name:'문의·정보 삭제',exact:true}).click();await expect(page).toHaveURL(/privacy\/#contact$/);await expect(page.locator('#contact')).toContainText('현재 사이트에는 문의를 접수하거나 메일을 보내는 기능이 없어요.');expect(await page.locator('a[href^="mailto:"]').count()).toBe(0);
 await page.getByRole('button',{name:'이 브라우저의 입력 지우기'}).click();await expect(page.getByRole('status')).toContainText('입력한 출생정보와 선택을 지웠어요.');await expect(page.locator('.cookie-table tbody tr')).toHaveCount(3);await page.goto('/result/day/');await expect(page.locator('.natal-overview')).toHaveCount(0);expect(await context.cookies()).toEqual([]);expect(await page.evaluate(()=>[localStorage.length,sessionStorage.length])).toEqual([0,0]);expect(outgoing).toEqual([]);
});
test('launch changes preserve mobile reflow, keyboard menu focus and visible control boundaries',async({page})=>{
 await fs.mkdir('reports/launch-2.5.1',{recursive:true});
 for(const width of [320,390]){
  await page.setViewportSize({width,height:950});
  for(const path of ['/','/privacy/','/guide/','/fortune/date/']){
   await page.goto(path);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
  }
  const input=page.getByLabel('태어난 연도',{exact:true});const colors=await input.evaluate(e=>({border:getComputedStyle(e).borderColor,background:getComputedStyle(e).backgroundColor}));expect(ratio(colors.border,colors.background)).toBeGreaterThanOrEqual(3);
  await page.goto('/privacy/');await page.locator('main p,main h1,main h2,main button,main th,main td').evaluateAll(es=>es.forEach(e=>(e as HTMLElement).style.fontSize=`${parseFloat(getComputedStyle(e).fontSize)*2}px`));expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`reports/launch-2.5.1/privacy-${width}-large-text.png`,fullPage:true});
 }
 await page.getByRole('button',{name:'메뉴',exact:true}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'메뉴',exact:true})).toBeFocused();
});
