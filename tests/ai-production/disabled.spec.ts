import {test,expect} from '@playwright/test';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFileSync} from 'node:fs';
const release=JSON.parse(readFileSync(new URL('../../public/release.json',import.meta.url),'utf8')) as {version:string};
test('production entry serves the unchanged home groups and real disabled UI, never local login',async({page,context})=>{
 await page.setViewportSize({width:320,height:950});await page.goto('/');await expect(page.locator('.primary-nav a')).toHaveCount(6);await expect(page.locator('.quick-nav a')).toHaveCount(8);await expect(page.locator('.category-grid a')).toHaveCount(9);await page.locator('.primary-nav a').first().click();await expect(page.getByRole('button',{name:'카카오 로그인 준비 중'})).toBeDisabled();expect(await page.locator('main').innerText()).not.toContain('로컬 개발 데모');await expect(page.locator('.ai-login-buttons a')).toHaveCount(0);expect(await context.cookies()).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'reports/ai-saju/screenshots/production-disabled-320.png',fullPage:true});
});
test('production API denies guests, gates auth/webhooks and returns JSON for missing API routes',async({request})=>{
 for(const path of ['/api/ai','/api/library','/api/missing']){const r=await request.fetch(path,{method:path==='/api/ai'?'POST':'GET',data:path==='/api/ai'?{}:undefined});expect(r.status()).toBe(401);expect(r.headers()['content-type']).toContain('application/json');expect(r.headers()['cache-control']).toContain('no-store');expect(r.headers()['x-robots-tag']).toContain('noindex');}
 for(const path of ['/result/day/','/ai-saju/']){const r=await request.get(path);expect(r.headers()['x-robots-tag']).toContain('noindex');expect(r.headers()['cache-control']).toContain('no-store');}
 expect((await request.get('/auth/start/kakao')).status()).toBe(503);expect((await request.post('/auth/webhooks/kakao/unlink',{data:{}})).status()).toBe(503);expect((await request.get('/__local-idp/kakao')).status()).toBe(404);const session=await (await request.get('/api/session')).json();expect(session.launch.demo).toBe(false);expect(session.aiEnabled).toBe(false);expect(session.providers.every((p:{enabled:boolean})=>!p.enabled)).toBe(true);
});
test('production entry initializes actual SQLite additively through staging-only read-only health',async({request})=>{const response=await request.get('/api/health');expect(response.status()).toBe(200);expect(await response.json()).toMatchObject({runtime:'worker',storage:{sqlite:true,schemaVersion:2},release:release.version,aiEnabled:false});expect(response.headers()['cache-control']).toContain('no-store');});

test('deployment check validates actual asset bytes and runtime artifact instead of trusting local labels',async()=>{test.setTimeout(60000);const result=await promisify(execFile)(process.execPath,['scripts/check-ai-public.mjs','--local'],{timeout:55000});expect(result.stdout).toContain('PASS real');});
