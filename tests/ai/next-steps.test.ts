import {it,expect} from 'vitest';
import {handle} from '../../worker/src/app';
import {kakaoWebhook} from '../../worker/src/kakao-webhook';
import {hmac,sha} from '../../worker/src/security';
import {priceReviewStatus} from '../../worker/src/policy';
import {RequestGuard} from '../../worker/src/request-guard';
import {database,member,env,NOW,reservation,finish} from './helpers';
import {deriveFacts} from '../../worker/src/facts';
import {validateAnswer} from '../../worker/src/model';
import {Store} from '../../worker/src/store';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import type {Runtime,SqlLike} from '../../worker/src/types';
it('authenticates Kakao administrator key and app before durable changes; rejects duplicates/oversized parameters',async()=>{
 const {store,sqlite}=database(),e={...env(store),KAKAO_APP_ID:'123',KAKAO_UNLINK_ADMIN_KEY:'server-admin-only'};
 const request=(body='app_id=123&user_id=42&referrer_type=UNLINK_ACCOUNT',auth='KakaoAK server-admin-only')=>new Request(e.APP_ORIGIN+'/auth/webhooks/kakao/unlink',{method:'POST',headers:{authorization:auth,'content-type':'application/x-www-form-urlencoded'},body});
 for(const [body,auth] of [['app_id=123&user_id=42&referrer_type=UNLINK_ACCOUNT','KakaoAK oauth-client-secret'],['app_id=999&user_id=42&referrer_type=UNLINK_ACCOUNT','KakaoAK server-admin-only'],['app_id=123&user_id=42&user_id=43&referrer_type=UNLINK_ACCOUNT','KakaoAK server-admin-only'],['a'.repeat(2049),'KakaoAK server-admin-only']])await expect(kakaoWebhook(request(body,auth),e,NOW)).rejects.toThrow();
 expect(sqlite.prepare('SELECT count(*) n FROM unlink_jobs').get()).toMatchObject({n:0});
 const subjectHash=await hmac(e.IDENTITY_HMAC_KEY,'identity:kakao:42');store.command({op:'pendingPut',p:{hash:'p',provider:'kakao',subjectHash,quotaKey:'qa',expires:NOW+600000}});store.command({op:'signup',p:{hash:'p',userId:'a',version:'terms',now:NOW}});store.command({op:'sessionPut',p:{hash:await sha('opaque'),userId:'a',now:NOW,expires:NOW+100000}});
 const start=performance.now();expect((await kakaoWebhook(request(),e,NOW)).status).toBe(200);expect(performance.now()-start).toBeLessThan(3000);
 expect(sqlite.prepare('SELECT count(*) n FROM sessions').get()).toMatchObject({n:0});expect(sqlite.prepare('SELECT status,target_user_id FROM unlink_jobs').get()).toMatchObject({status:'pending',target_user_id:'a'});expect(JSON.stringify(sqlite.prepare('SELECT * FROM unlink_jobs').all())).not.toContain('server-admin-only');
 expect((await kakaoWebhook(request(),e,NOW+10)).status).toBe(200);expect(sqlite.prepare('SELECT count(*) n FROM unlink_jobs').get()).toMatchObject({n:1});
 expect(store.command({op:'pendingPut',p:{hash:'late-code',provider:'kakao',subjectHash,quotaKey:'qa',authStartedAt:NOW-1,expires:NOW+600000}})).toEqual({error:'AUTH_REVOKED'});
 store.command({op:'unlinkDrain',p:{}});expect(sqlite.prepare('SELECT count(*) n FROM users').get()).toMatchObject({n:0});expect((await kakaoWebhook(request(),e,NOW+20)).status).toBe(200);store.command({op:'unlinkDrain',p:{}});expect(sqlite.prepare('SELECT count(*) n FROM users').get()).toMatchObject({n:0});
});
it('durable unlink jobs survive a Store restart and prevent late AI writes while settling spend',async()=>{
 const {store,sql,atomic,sqlite}=database();member(store,'a','qa','kakao');const p=reservation();store.command({op:'reserve',p:{...p}});store.command({op:'dispatch',p:{id:p.id,now:NOW}});store.command({op:'kakaoUnlinkEnqueue',p:{subjectHash:'subject-a',receiptHash:'receipt',now:NOW}});
 const restored=new Store(sql,atomic,fs.readFileSync('worker/migrations/0001_initial.sql','utf8')+';'+fs.readFileSync('worker/migrations/0002_unlink_jobs.sql','utf8'));restored.command({op:'unlinkDrain',p:{}});
 expect(restored.command({op:'settle',p:{id:p.id,success:true,cost:500,input:1,output:1,thinking:0,now:NOW+1000,saves:[{id:'resurrect',kind:'birth',cipher:'cipher',expires:NOW+10000}]}})).toMatchObject({active:false});expect(sqlite.prepare('SELECT count(*) n FROM saved_items').get()).toMatchObject({n:0});expect(sqlite.prepare('SELECT spent,reserved FROM budgets WHERE bucket=?').get('day:'+p.day)).toMatchObject({spent:500,reserved:0});
});
it('reconciles late known provider usage once without restoring an expired answer or account data',()=>{
 const {store,sqlite}=database();member(store);const p=reservation();store.command({op:'reserve',p:{...p}});store.command({op:'dispatch',p:{id:p.id,now:NOW}});store.command({op:'cleanup',p:{now:NOW+61000}});expect(finish(store,p,true,600)).toMatchObject({reconciled:true});finish(store,p,true,600);expect(sqlite.prepare('SELECT status,actual_cost,cost_estimated FROM reservations').get()).toMatchObject({status:'failed',actual_cost:600,cost_estimated:0});expect(sqlite.prepare('SELECT spent,reserved FROM budgets WHERE bucket=?').get('day:'+p.day)).toMatchObject({spent:600,reserved:0});
});
it('keeps reservations across an actual SQLite close/reopen and applies additive migrations safely',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'saju-db-restart-')),file=path.join(dir,'store.sqlite');const schema=fs.readFileSync('worker/migrations/0001_initial.sql','utf8')+';'+fs.readFileSync('worker/migrations/0002_unlink_jobs.sql','utf8');
 const open=()=>{const sqlite=new DatabaseSync(file),sql:SqlLike={exec(q,...values){return sqlite.prepare(q).all(...values as SQLInputValue[]);}};const store=new Store(sql,fn=>{sqlite.exec('BEGIN IMMEDIATE');try{const r=fn();sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}},schema);return {sqlite,store};};
 try{let d=open();member(d.store);const p=reservation();d.store.command({op:'reserve',p:{...p}});d.sqlite.close();d=open();expect(d.store.command({op:'reserve',p:{...p}})).toEqual({error:'REQUEST_PENDING'});finish(d.store,p);expect(d.sqlite.prepare('SELECT COUNT(*) n FROM schema_version').get()).toMatchObject({n:2});d.sqlite.close();}finally{fs.rmSync(dir,{recursive:true,force:true});}
});
it('warns seven days before price expiry and does not silently advance the review date',()=>{const e=env(database().store);e.PRICE_REVIEW_DATE='2026-10-01';expect(priceReviewStatus(e,Date.parse('2026-10-25T00:00:00Z'))).toMatchObject({valid:true,daysLeft:7,warning:expect.any(String)});expect(priceReviewStatus(e,Date.parse('2026-11-01T00:00:00Z')).valid).toBe(false);expect(e.PRICE_REVIEW_DATE).toBe('2026-10-01');});
it('drops excess requests without DB/IP tracking and does not query a DB for a disabled anonymous session',async()=>{
 const g=new RequestGuard();for(let i=0;i<200;i++)expect(g.allow(NOW)).toBe(true);expect(g.allow(NOW)).toBe(false);expect(g.allow(NOW+10000)).toBe(true);const e=env(database().store);delete e.REQUEST_HMAC_KEY;e.STORE.getByName=()=>{throw new Error('unexpected DB');};const runtime={demo:false,now:()=>NOW,oauth:{},ai:{}} as Runtime;const r=await handle(new Request(e.APP_ORIGIN+'/api/session',{headers:{cookie:'saju_session=forged; saju_pending=forged'}}),e,runtime);expect(r.status).toBe(200);expect((await r.json() as {signedIn:boolean}).signedIn).toBe(false);
});
it('rejects obvious contradictions and decisions guaranteed by a valid factId',()=>{
 const facts=deriveFacts({year:1995,month:11,day:8,hour:15,minute:3,calendar:'solar',leap:false,unknownTime:false},{kind:'year',target:'2027-01-01',label:'2027년'},NOW),basis=facts.find(f=>f.id==='natal.master')!;const answer={answer:'주어진 사주와 현실 조건을 함께 살펴볼 수 있습니다.',interpretations:[{factId:basis.id,quote:basis.value,text:'자신을 돌아보는 하나의 출발점입니다.'}],practicalChecks:['실제 여건을 함께 살펴보십시오.'],followUpQuestion:null};
 for(const text of ['일간은 계수가 아니라 갑목입니다. 이 사주로 미래를 판단합니다.','2027년에는 무조건 합격합니다. 걱정하지 않아도 됩니다.','면접에 가지 마세요. 사주에서 나쁜 날이라고 합니다.','이 날짜에는 계약하면 안 됩니다. 반드시 피하십시오.'])expect(()=>validateAnswer({...answer,answer:text},facts,'2027년')).toThrow();
});
