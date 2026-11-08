import {DatabaseSync,type SQLInputValue} from 'node:sqlite';
import fs from 'node:fs';
import {Store} from '../../worker/src/store';
import type {Env,ReserveInput,SqlLike} from '../../worker/src/types';
import {kstDay} from '../../worker/src/policy';
export const NOW=Date.parse('2026-10-28T03:00:00Z');
export function database(){const sqlite=new DatabaseSync(':memory:');const sql:SqlLike={exec(q,...bindings){return sqlite.prepare(q).all(...bindings as SQLInputValue[]);}};const atomic=<T>(fn:()=>T)=>{sqlite.exec('BEGIN IMMEDIATE');try{const result=fn();sqlite.exec('COMMIT');return result;}catch(e){sqlite.exec('ROLLBACK');throw e;}};const store=new Store(sql,atomic,fs.readFileSync('worker/migrations/0001_initial.sql','utf8')+';'+fs.readFileSync('worker/migrations/0002_unlink_jobs.sql','utf8'));return {sqlite,sql,store,atomic};}
export function member(store:Store,id='a',quota='qa',provider='google'){
 store.command({op:'pendingPut',p:{hash:'pending-'+id,provider,subjectHash:'subject-'+id,quotaKey:quota,expires:NOW+600000}});
 return store.command({op:'signup',p:{hash:'pending-'+id,userId:id,version:'draft-terms-v1',now:NOW}}) as {id:string;quota_key:string};
}
let sequence=0;
export function reservation(overrides:Partial<ReserveInput>={}):ReserveInput{const n=++sequence;return {userId:'a',quotaKey:'qa',id:`request-${n}`,key:`key-${n}`,hash:'payload-a',birthHash:'birth-a',generation:1,stage:'initial',now:NOW,day:kstDay(NOW),month:kstDay(NOW).slice(0,7),maxCost:1000,dailyCap:100000,monthlyCap:1000000,concurrency:3,...overrides};}
export function finish(store:Store,r:ReserveInput,success=true,cost=500){store.command({op:'dispatch',p:{id:r.id,now:r.now}});return store.command({op:'settle',p:{id:r.id,success,cost,input:800,output:500,thinking:0,now:r.now+100,saves:[]}});}
export function env(store:Store):Env{return {APP_ENV:'development',APP_ORIGIN:'http://127.0.0.1:8787',TERMS_VERSION:'draft-terms-v1',AI_POLICY_VERSION:'draft-ai-v1',DATA_ENCRYPTION_KEY:Buffer.alloc(32,1).toString('base64'),IDENTITY_HMAC_KEY:Buffer.alloc(32,2).toString('base64'),REQUEST_HMAC_KEY:Buffer.alloc(32,3).toString('base64'),STORAGE_ENABLED:'true',DAILY_BUDGET_MICRO_USD:'100000',MONTHLY_BUDGET_MICRO_USD:'1000000',GLOBAL_CONCURRENCY:'2',PRICE_INPUT_USD_PER_MILLION:'0.10',PRICE_OUTPUT_USD_PER_MILLION:'0.40',STORE:{getByName(){return {async command(c){return store.command(c);}};}},ASSETS:{async fetch(){return new Response('static');}}};}
