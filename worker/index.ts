import {DurableObject,WorkerEntrypoint} from 'cloudflare:workers';
import initialSchema from './migrations/0001_initial.sql';
import unlinkSchema from './migrations/0002_unlink_jobs.sql';
const schema=initialSchema+';'+unlinkSchema;
import {Store} from './src/store';
import type {Command,Env} from './src/types';
import {handle} from './src/app';
import {SocialOAuth} from './src/oauth';
import {GeminiAdapter} from './src/model';
import {RequestGuard} from './src/request-guard';
import {json} from './src/security';
import {priceReviewStatus} from './src/policy';
export class AiDatabase extends DurableObject<Env>{
 private store:Store;
 constructor(ctx:DurableObjectState,env:Env){super(ctx,env);this.store=new Store(ctx.storage.sql,fn=>ctx.storage.transactionSync(fn),schema);}
 async command(command:Command){const result=this.store.command(command);const due=Date.now()+(command.op==='kakaoUnlinkEnqueue'?1:60000);const alarm=await this.ctx.storage.getAlarm();if(!alarm||alarm>due)await this.ctx.storage.setAlarm(due);return result;}
 async alarm(){const jobs=this.store.command({op:'unlinkDrain',p:{}}) as {pending:boolean};this.store.command({op:'cleanup',p:{now:Date.now()}});await this.ctx.storage.setAlarm(Date.now()+(jobs.pending?1000:3600000));}
}
export class AiOperations extends WorkerEntrypoint<Env>{
 async summary(){return {usage:await this.env.STORE.getByName('ai-saju-authority-v1').command({op:'opsSummary',p:{}}),priceReview:priceReviewStatus(this.env)};}
 async sampleUsage(){return {source:['production','staging'].includes(this.env.APP_ENV??'')?'actual-provider-usage':'local-control-simulation',rows:await this.env.STORE.getByName('ai-saju-authority-v1').command({op:'opsUsageMetrics',p:{}})};}
 async setPaused(paused:boolean){if(typeof paused!=='boolean')throw new Error('Boolean required');return this.env.STORE.getByName('ai-saju-authority-v1').command({op:'opsPause',p:{paused}});}
}
const guard=new RequestGuard();
let storageHealth:Promise<unknown>|null=null;
const worker={async fetch(req:Request,env:Env,ctx:ExecutionContext){const path=new URL(req.url).pathname;if((path.startsWith('/api/')||path.startsWith('/auth/'))&&path!=='/auth/webhooks/kakao/unlink'&&!guard.allow(Date.now()))return json({error:{code:'RATE_LIMITED',message:'요청이 많아요. 잠시 후 다시 이용해 주세요.'}},429,{'retry-after':'10'});if(path==='/api/health'&&req.method==='GET'){if(env.APP_ENV!=='staging'||env.STORAGE_HEALTH_CHECK!=='true')return json({error:{code:'NOT_FOUND'}},404);storageHealth??=env.STORE.getByName('ai-saju-authority-v1').command({op:'schemaHealth',p:{}}).catch(e=>{storageHealth=null;throw e;});try{return json({runtime:'worker',storage:await storageHealth,release:env.RELEASE_VERSION,artifact:env.RELEASE_ARTIFACT_SHA??null,aiEnabled:false});}catch{return json({error:{code:'STORAGE_UNAVAILABLE'}},503);}}const task=handle(req,env,{demo:false,now:()=>Date.now(),oauth:new SocialOAuth(env),ai:new GeminiAdapter(env)});ctx.waitUntil(task.then(()=>{}));return task;}};

export default worker;
