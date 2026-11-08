import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
const local=process.argv.includes('--local'),staging=process.argv.includes('--staging'),base=local?'http://127.0.0.1:8788':staging?'https://spring-voice-4bdc-ai-stg.eogjs9595.workers.dev':'https://spring-voice-4bdc.eogjs9595.workers.dev';
const release=JSON.parse(await fs.readFile('public/release.json','utf8')),mode=local?'local-production-entry':staging?'staging':'public';
const proxyURL=!local&&process.env.HTTPS_PROXY?new URL(process.env.HTTPS_PROXY):null;
const proxy=proxyURL?{server:proxyURL.origin,...(proxyURL.username?{username:decodeURIComponent(proxyURL.username),password:decodeURIComponent(proxyURL.password)}:{})}:undefined;
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],proxy});const checks=[];
const dir='reports/ai-saju';await fs.mkdir(dir,{recursive:true});
try{for(const width of [320,390]){
 const context=await browser.newContext({viewport:{width,height:950}});let closing=false;const errors=[];
 // Relay only real public HTTPS responses; Node trusts this workspace's proxy CA.
 await context.route(base+'/**',async route=>{try{const response=await context.request.fetch(route.request(),{timeout:25000});await route.fulfill({response});}catch(e){if(!closing){errors.push(String(e));await route.abort().catch(()=>{});}}});
 try{const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/');await expect(page.locator('.primary-nav a')).toHaveText(['AI 사주','신년 운세','오늘의 운세','이번달 운세','지정일 운세','올해 운세']);await expect(page.locator('.quick-nav a')).toHaveCount(8);await expect(page.locator('.category-grid a')).toHaveCount(9);await page.screenshot({path:`${dir}/${mode}-home-${width}.png`,fullPage:true});
 await page.goto(base+'/ai-saju/');await expect(page.getByRole('button',{name:'카카오 로그인 준비 중'})).toBeDisabled();await expect(page.locator('.ai-login-buttons a')).toHaveCount(0);expect(await page.locator('main').innerText()).not.toMatch(/로컬 모의|실제 AI가 아니에요/);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`${dir}/${mode}-ai-${width}.png`,fullPage:true});
 const session=await context.request.get(base+'/api/session');expect(session.status()).toBe(200);expect(session.headers()['cache-control']).toContain('no-store');const view=await session.json();expect(view.serverRelease).toMatchObject({version:release.version,artifact:createHash('sha256').update(await fs.readFile('worker-dist/index.js')).digest('hex')});expect(view.launch.demo).toBe(false);expect(view.aiEnabled).toBe(false);expect(view.providers.every(p=>!p.enabled)).toBe(true);
 expect((await context.request.post(base+'/api/ai',{data:{}})).status()).toBe(401);expect((await context.request.get(base+'/auth/start/kakao')).status()).toBe(503);expect((await context.request.get(base+'/api/missing')).headers()['content-type']).toContain('application/json');expect((await context.request.get(base+'/__local-idp/kakao')).status()).toBe(404);expect((await (await context.request.get(base+'/release.json?check='+Date.now())).json()).version).toBe(release.version);
 if(staging){const health=await (await context.request.get(base+'/api/health')).json();expect(health).toMatchObject({runtime:'worker',storage:{sqlite:true,schemaVersion:2}});}
 for(const slug of ['day','month','year','date','saju','manse']){const r=await context.request.get(base+'/fortune/'+slug+'/');expect(r.status()).toBe(200);}
 expect(await context.cookies()).toEqual([]);expect(errors).toEqual([]);checks.push({width,passed:true});
 }finally{closing=true;await context.unrouteAll({behavior:'ignoreErrors'});await context.close();}
 }}catch(error){await browser.close();throw error;}
async function manifest(root){const result={};async function visit(d){for(const e of await fs.readdir(d,{withFileTypes:true})){const path=d+'/'+e.name;if(e.isDirectory())await visit(path);else result[path.slice(root.length+1)]=createHash('sha256').update(await fs.readFile(path)).digest('hex');}}await visit(root);return result;}
try{
const assets=await manifest('out');const verification=await browser.newContext();
try{const names=Object.keys(assets).filter(name=>!['_headers','_redirects'].includes(name));const home=await verification.request.get(base+'/');expect(home.headers()['x-content-type-options']).toBe('nosniff');expect(home.headers()['content-security-policy']).toContain("object-src 'none'");expect((await verification.request.get(base+'/_headers')).status()).toBe(404);for(let i=0;i<names.length;i+=8)await Promise.all(names.slice(i,i+8).map(async name=>{const r=await verification.request.get(base+'/'+name,{timeout:25000});const hash=createHash('sha256').update(await r.body()).digest('hex');expect(hash,'actual public asset hash '+name).toBe(assets[name]);}));}finally{await verification.close();}
await fs.writeFile(`${dir}/${local?'local':staging?'staging':'production'}-public-checks.json`,JSON.stringify({passed:true,localOnly:local,url:base,version:release.version,checkedAt:new Date().toISOString(),checks,assets,allServedStaticAssetsVerified:true,configurationFilesNotPublic:['_headers'],workerSHA256:createHash('sha256').update(await fs.readFile('worker-dist/index.js')).digest('hex')},null,2)+'\n');
}finally{await browser.close();}
console.log(`PASS real ${local?'local production-entry':staging?'staging':'production'} Worker, disabled AI, free menus, 320/390px`);
