import {AI_LIMITS,SOCIAL_PROVIDERS,aiBirthSchema,aiRequestSchema,type AiResult,type SessionView,type SocialProvider,type Usage} from '../../src/ai/contracts';
import {z} from 'zod';
import type {Env,Runtime,SessionRow,UserRow,PendingRow,AuthRow,SavedRow,SavedWrite,TokenUsage,Command} from './types';
import {cookie,decrypt,encrypt,equal,hmac,HttpError,validKey,json,jsonBody,originCheck,redirect,setCookie,sha,token} from './security';
import {integer,kstDay,launchReady,maxCost,paidReady,providerConfigured,publicPolicy,cost} from './policy';
import {generateState,generateCodeVerifier} from './oauth';
import {checkPrivateText,deriveFacts,resolvePeriod,safetyQuestion} from './facts';
import {validateAnswer} from './model';
import {kakaoWebhook} from './kakao-webhook';
const errors:Record<string,[number,string]>={AUTH_REVOKED:[401,'소셜 연결이 해제됐어요. 다시 로그인해 주세요.'],UNAUTHENTICATED:[401,'로그인한 뒤 이용해 주세요.'],SIGNUP_EXPIRED:[401,'가입 확인 시간이 지났어요. 다시 로그인해 주세요.'],IDEMPOTENCY_MISMATCH:[409,'같은 요청 번호로 다른 내용을 보낼 수 없어요.'],REQUEST_PENDING:[409,'앞서 보낸 요청을 처리하고 있어요. 잠시 기다려 주세요.'],RESULT_NOT_RETAINED:[409,'이미 처리한 요청이에요. 저장하지 않은 답변은 새로고침 뒤 복원하지 않으며 자동으로 다시 생성하지 않아요.'],REQUEST_FINISHED:[409,'종료된 요청이에요. 사용 횟수를 확인하고 다시 시도해 주세요.'],INITIAL_REQUIRED:[409,'오늘의 첫 AI 진단을 먼저 받아 주세요.'],INITIAL_ALREADY_DONE:[409,'오늘 첫 진단을 이미 받았어요. 남은 후속 질문을 이용해 주세요.'],BIRTH_CHANGED:[409,'오늘 진단한 출생정보와 달라요. 기존 정보로 질문하거나 내일 새 진단을 받아 주세요.'],DAILY_LIMIT:[429,'오늘은 세 번 모두 이용했어요. 한국시간 자정에 다시 이용할 수 있어요.'],RATE_LIMITED:[429,'잠시 요청이 많았어요. 10분 뒤 다시 이용해 주세요.'],SERVICE_BUSY:[429,'현재 상담 요청이 많아요. 잠시 후 다시 이용해 주세요.'],BUDGET_PAUSED:[503,'오늘의 AI 제공량을 잠시 멈췄어요. 기본 무료 운세는 계속 이용할 수 있어요.'],STORAGE_LIMIT:[409,'보관함에 자료가 50개 있어요. 필요 없는 자료를 지운 뒤 저장해 주세요.'],NOT_FOUND:[404,'저장한 정보를 찾을 수 없어요.']};
export async function db<T>(env:Env,op:string,p:Command['p']):Promise<T>{if(!env.STORE)throw new HttpError(503,'SETUP_REQUIRED','회원 서버를 준비하고 있어요.');const result=await env.STORE.getByName('ai-saju-authority-v1').command({op,p});if(result&&typeof result==='object'&&'error'in result){const code=String(result.error),[status,message]=errors[code]??[400,'요청을 처리하지 못했어요.'];throw new HttpError(status,code,message);}return result as T;}
async function session(req:Request,env:Env,now:number){if(!validKey(env.REQUEST_HMAC_KEY))return null;const value=cookie(req,env,'session');if(!value||value.length>200)return null;return db<SessionRow|null>(env,'sessionGet',{hash:await sha(value),now});}
async function member(req:Request,env:Env,now:number){const s=await session(req,env,now);if(!s)throw new HttpError(401,'UNAUTHENTICATED','로그인한 회원만 AI 사주를 이용할 수 있어요.');return s;}
async function csrf(req:Request,env:Env,value:string){originCheck(req,env);const supplied=req.headers.get('x-csrf-token')??'';if(!equal(supplied,await hmac(env.REQUEST_HMAC_KEY,'csrf:'+value)))throw new HttpError(403,'CSRF_REJECTED','페이지를 다시 열고 시도해 주세요.');}
async function setSession(req:Request,env:Env,userId:string,now:number,identity?:{provider:SocialProvider;subjectHash:string;authStartedAt:number}){const raw=token(),previous=cookie(req,env,'session');await db(env,'sessionPut',{hash:await sha(raw),userId,now,expires:now+AI_LIMITS.sessionHours*3600000,previous:previous?await sha(previous):null,...identity});return setCookie(env,'session',raw,AI_LIMITS.sessionHours*3600);}
function provider(path:string){const p=path.split('/').at(-1);if(!SOCIAL_PROVIDERS.includes(p as SocialProvider))throw new HttpError(404,'NOT_FOUND','로그인 제공자를 확인해 주세요.');return p as SocialProvider;}
async function consentVersion(env:Env,userId:string,purpose:string,version:string){return (await db<{version:string}|null>(env,'consentGet',{userId,purpose}))?.version===version;}
export async function sessionView(req:Request,env:Env,runtime:Runtime):Promise<SessionView>{const now=runtime.now(),s=await session(req,env,now),pendingToken=cookie(req,env,'pending');const pending=!s&&pendingToken&&validKey(env.REQUEST_HMAC_KEY)?await db<PendingRow|null>(env,'pendingGet',{hash:await sha(pendingToken),now}):null;return {serverRelease:{version:env.RELEASE_VERSION??null,artifact:env.RELEASE_ARTIFACT_SHA??null},signedIn:!!s,pendingSignup:!!pending,csrf:s||pending?await hmac(env.REQUEST_HMAC_KEY,'csrf:'+(cookie(req,env,s?'session':'pending')??'')):null,provider:s?.provider??pending?.provider??null,usage:s?await db<Usage>(env,'usage',{quotaKey:s.quota_key,day:kstDay(now),now}):null,aiConsent:s?await consentVersion(env,s.user_id,'ai',env.AI_POLICY_VERSION??'draft-ai-v1'):false,aiEnabled:runtime.demo||paidReady(env,now),storageEnabled:(runtime.demo||launchReady(env))&&env.STORAGE_ENABLED==='true',retentionDays:integer(env.SAVED_RETENTION_DAYS,90),termsAccepted:s?await consentVersion(env,s.user_id,'terms',env.TERMS_VERSION??'draft-terms-v1'):false,serverAvailable:true,launch:publicPolicy(env,runtime.demo),providers:SOCIAL_PROVIDERS.map(id=>({id,enabled:runtime.demo||(launchReady(env)&&providerConfigured(env,id))})),policy:{termsVersion:env.TERMS_VERSION??'draft-terms-v1',aiVersion:env.AI_POLICY_VERSION??'draft-ai-v1',contact:env.OPERATOR_CONTACT??null,recipient:env.AI_RECIPIENT_NAME??null,countries:env.AI_PROCESSING_COUNTRIES??null,retention:env.AI_RETENTION_NOTICE??null,storageLocation:env.CLOUD_STORAGE_LOCATION_NOTICE??null}};}
async function startAuth(req:Request,env:Env,runtime:Runtime,p:SocialProvider,intent:'login'|'unlink'='login'){
 if(!runtime.demo&&(!launchReady(env)||!providerConfigured(env,p)))throw new HttpError(503,'SIGNIN_UNAVAILABLE','운영 설정 전에는 소셜 가입을 열지 않아요.');
 await db(env,'rate',{key:'oauth-start:'+Math.floor(runtime.now()/60000),limit:60,now:runtime.now(),expires:runtime.now()+120000});
 const s=intent==='unlink'?await member(req,env,runtime.now()):null;const state=generateState(),verifier=generateCodeVerifier(),nonce=token(),binding=token(),stateHash=await sha(state),redirectUri=env.APP_ORIGIN+`/auth/callback/${p}`;
 const cipher=await encrypt(env,{verifier,nonce},'oauth:'+stateHash);await db(env,'authPut',{stateHash,cookieHash:await sha(binding),provider:p,cipher,intent,userId:s?.user_id??null,now:runtime.now(),expires:runtime.now()+600000});
 return redirect(runtime.oauth.start(p,state,verifier,nonce,redirectUri).toString(),{'set-cookie':setCookie(env,'oauth',binding,600)});
}
async function authCallback(req:Request,env:Env,runtime:Runtime,p:SocialProvider){
 if(!runtime.demo&&!launchReady(env))throw new HttpError(503,'SIGNIN_UNAVAILABLE','가입 설정을 준비하고 있어요.');
 const url=new URL(req.url),state=url.searchParams.get('state'),binding=cookie(req,env,'oauth');if(!state||!binding||state.length>200)throw new HttpError(400,'AUTH_STATE','로그인 확인이 만료됐어요. 다시 시작해 주세요.');
 const row=await db<AuthRow|null>(env,'authTake',{stateHash:await sha(state),cookieHash:await sha(binding),provider:p,now:runtime.now()});if(!row)throw new HttpError(400,'AUTH_STATE','로그인 확인이 만료됐거나 이미 사용됐어요.');
 const clearCookie=setCookie(env,'oauth','',0);if(url.searchParams.has('error'))return redirect('/ai-saju/?auth=cancelled',{'set-cookie':clearCookie});const code=url.searchParams.get('code');if(!code||code.length>2048)throw new HttpError(400,'AUTH_CODE','로그인을 다시 시작해 주세요.');
 const secret=await decrypt<{verifier:string;nonce:string}>(env,row.secret_cipher,'oauth:'+await sha(state));
 let identity;try{identity=await runtime.oauth.identity(p,code,secret.verifier,secret.nonce,env.APP_ORIGIN+`/auth/callback/${p}`,state);}catch{return redirect('/ai-saju/?auth=failed',{'set-cookie':clearCookie});}
 const subjectHash=await hmac(env.IDENTITY_HMAC_KEY,`identity:${p}:${identity.subject}`),quotaKey=await hmac(env.IDENTITY_HMAC_KEY,`quota:${p}:${identity.subject}`);const user=await db<UserRow|null>(env,'findUser',{provider:p,subjectHash});
 if(row.intent==='unlink'){
  const s=await member(req,env,runtime.now());if(!user||s.user_id!==row.user_id||user.id!==row.user_id)throw new HttpError(403,'REAUTH_MISMATCH','같은 소셜 계정으로 다시 확인해 주세요.');
  let disconnected=await runtime.oauth.unlink(p,identity.accessToken);if(!disconnected)disconnected=await runtime.oauth.unlink(p,identity.accessToken);
  await db(env,'deleteUser',{userId:user.id,eventId:crypto.randomUUID(),provider:p,unlinkStatus:disconnected?'disconnected':'provider_action_required',now:runtime.now()});const h=new Headers();h.append('set-cookie',clearCookie);h.append('set-cookie',setCookie(env,'session','',0));return redirect('/ai-saju/?deleted='+String(disconnected),h);
 }
 const h=new Headers();h.append('set-cookie',clearCookie);
 if(user){h.append('set-cookie',await setSession(req,env,user.id,runtime.now(),{provider:p,subjectHash,authStartedAt:row.expires-600000}));h.append('set-cookie',setCookie(env,'pending','',0));}
 else{const raw=token();await db(env,'pendingPut',{hash:await sha(raw),provider:p,subjectHash,quotaKey,authStartedAt:row.expires-600000,expires:runtime.now()+600000});h.append('set-cookie',setCookie(env,'pending',raw,600));}
 return redirect('/ai-saju/',h);
}
async function ai(req:Request,env:Env,runtime:Runtime){
 const now=runtime.now(),s=await member(req,env,now);await csrf(req,env,cookie(req,env,'session')!);
 if(!runtime.demo&&!paidReady(env,now))throw new HttpError(503,'AI_UNAVAILABLE','AI 연결과 예산 설정을 준비하고 있어요.');
 if(!await consentVersion(env,s.user_id,'terms',env.TERMS_VERSION??'draft-terms-v1')||!await consentVersion(env,s.user_id,'ai',env.AI_POLICY_VERSION??'draft-ai-v1'))throw new HttpError(403,'CONSENT_REQUIRED','약관과 AI 전송 안내를 먼저 확인해 주세요.');
 const parsed=aiRequestSchema.safeParse(await jsonBody(req));if(!parsed.success)throw new HttpError(400,'INPUT_INVALID','질문은 1,000자 이내로, 대화는 최근 일부만 보내 주세요.');const input=parsed.data;if(input.birth.unknownTime){delete input.birth.hour;delete input.birth.minute;}
 const safety=safetyQuestion(input.question);if(safety)return json({kind:'safety',message:safety,charged:false});checkPrivateText(input);
 const period=resolvePeriod(input.question,input.selectedYear,now,input.stage==='initial');if('clarify'in period)return json({kind:'clarification',message:period.clarify,charged:false});
 if((input.saveBirth||input.saveConversation)&&env.STORAGE_ENABLED!=='true')throw new HttpError(503,'STORAGE_DISABLED','선택 저장은 아직 준비 중이에요. 저장하지 않고 이용할 수 있어요.');
 if(input.conversationId&&!await db<SavedRow|null>(env,'getSaved',{id:input.conversationId,userId:s.user_id,now}))throw new HttpError(404,'NOT_FOUND','저장한 대화를 찾을 수 없어요.');
 const key=req.headers.get('idempotency-key');if(!key||!/^[a-zA-Z0-9_-]{16,80}$/.test(key))throw new HttpError(400,'REQUEST_KEY','요청 번호를 다시 만들어 주세요.');
 const birthHash=await hmac(env.REQUEST_HMAC_KEY,'birth:'+JSON.stringify(input.birth)),hash=await hmac(env.REQUEST_HMAC_KEY,'request:'+JSON.stringify(input)),id=crypto.randomUUID(),maximum=maxCost(env);
 await db(env,'reserve',{userId:s.user_id,quotaKey:s.quota_key,id,key,hash,birthHash,generation:s.generation,stage:input.stage,now,day:kstDay(now),month:kstDay(now).slice(0,7),maxCost:maximum,dailyCap:integer(env.DAILY_BUDGET_MICRO_USD),monthlyCap:integer(env.MONTHLY_BUDGET_MICRO_USD),concurrency:integer(env.GLOBAL_CONCURRENCY,2)});
 let dispatched=false,usage:TokenUsage|null=null;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),AI_LIMITS.requestSeconds*1000);
 try{
  let facts;try{facts=deriveFacts(input.birth,period,now);}catch(error){if(error instanceof HttpError)throw error;throw new HttpError(400,'BIRTH_INVALID','출생 날짜와 시각을 다시 확인해 주세요.');}await db(env,'dispatch',{id,now:runtime.now()});dispatched=true;
  const result=await runtime.ai.generate(input,facts,period.label,controller.signal);usage=result.usage;const answer=validateAnswer(result.answer,facts,period.label);
  const saves:SavedWrite[]=[],expires=runtime.now()+integer(env.SAVED_RETENTION_DAYS,90)*86400000;let conversationId:string|undefined;
  if(input.saveBirth){const saveId=crypto.randomUUID();saves.push({id:saveId,kind:'birth',cipher:await encrypt(env,input.birth,`${s.user_id}:birth:${saveId}`),expires});}
  if(input.saveConversation){conversationId=input.conversationId??crypto.randomUUID();const messages=[...input.history,{role:'user',text:input.question||'첫 AI 사주 진단'},{role:'assistant',text:answer.answer}];saves.push({id:conversationId,kind:'conversation',cipher:await encrypt(env,{period:period.label,answer,facts,messages},`${s.user_id}:conversation:${conversationId}`),expires});}
  const stillSignedIn=!!await session(req,env,runtime.now());const settled=await db<{active:boolean;settled:boolean;savesSkipped:boolean}>(env,'settle',{id,success:!req.signal.aborted&&stillSignedIn,cost:cost(env,usage),...usage,now:runtime.now(),saves:req.signal.aborted||!stillSignedIn?[]:saves});if(!settled.active||!settled.settled||req.signal.aborted||!stillSignedIn)throw new HttpError(409,'REQUEST_FINISHED','요청이 종료됐어요. 남은 횟수를 확인해 주세요.');
  return json({kind:'answer',requestId:id,period:period.label,answer,facts,demo:runtime.demo,usage:await db<Usage>(env,'usage',{quotaKey:s.quota_key,day:kstDay(runtime.now()),now:runtime.now()}),...(conversationId&&!settled.savesSkipped?{conversationId}:{}),...(settled.savesSkipped?{storageWarning:true}:{})} satisfies AiResult);
 }catch(error){await db(env,'settle',{id,success:false,cost:usage?cost(env,usage):dispatched?maximum:0,estimated:!usage&&dispatched,input:usage?.input??0,output:usage?.output??0,thinking:usage?.thinking??0,now:runtime.now(),saves:[]});if(error instanceof HttpError)throw error;throw new HttpError(502,'AI_FAILED','답변을 완성하지 못했어요. 이용 횟수는 차감하지 않지만 잠시 요청이 제한될 수 있어요.');}
 finally{clearTimeout(timer);}
}
export async function handle(req:Request,env:Env,runtime:Runtime):Promise<Response>{
 const path=new URL(req.url).pathname;
 try{
  if(!env.APP_ORIGIN||new URL(req.url).origin!==env.APP_ORIGIN)throw new HttpError(403,'HOST_REJECTED','사이트 주소를 확인해 주세요.');
  if(path==='/auth/webhooks/kakao/unlink')return await kakaoWebhook(req,env,runtime.now());
  if(path==='/api/session'&&req.method==='GET')return json(await sessionView(req,env,runtime));
  if(path.startsWith('/auth/start/')&&req.method==='GET')return await startAuth(req,env,runtime,provider(path));
  if(path.startsWith('/auth/callback/')&&req.method==='GET')return await authCallback(req,env,runtime,provider(path));
  if(path==='/api/signup'&&req.method==='POST'){
   if(!runtime.demo&&!launchReady(env))throw new HttpError(503,'SIGNIN_UNAVAILABLE','가입을 준비하고 있어요.');const pending=cookie(req,env,'pending');if(!pending)throw new HttpError(401,'SIGNUP_EXPIRED','소셜 로그인을 먼저 해 주세요.');await csrf(req,env,pending);
   const body=z.object({terms:z.literal(true),adult:z.literal(true)}).strict().safeParse(await jsonBody(req));if(!body.success)throw new HttpError(400,'CONSENT_REQUIRED','이용약관과 성인 대상 안내를 확인해 주세요.');
   const user=await db<UserRow>(env,'signup',{hash:await sha(pending),userId:crypto.randomUUID(),version:env.TERMS_VERSION??'draft-terms-v1',now:runtime.now()});const h=new Headers();h.append('set-cookie',await setSession(req,env,user.id,runtime.now()));h.append('set-cookie',setCookie(env,'pending','',0));return json({ok:true},200,h);
  }
  if(path==='/api/ai'&&req.method==='POST')return await ai(req,env,runtime);
  if(path.startsWith('/api/')){
   const s=await member(req,env,runtime.now());if(req.method!=='GET')await csrf(req,env,cookie(req,env,'session')!);
   if(path==='/api/logout'&&req.method==='POST'){await db(env,'sessionDelete',{hash:await sha(cookie(req,env,'session')!)});return json({ok:true},200,{'set-cookie':setCookie(env,'session','',0)});}
   if(path==='/api/consent'&&req.method==='POST'){const body=z.object({purpose:z.enum(['terms','ai']),accepted:z.literal(true),adult:z.literal(true).optional()}).strict().parse(await jsonBody(req));if(body.purpose==='terms'&&!body.adult)throw new HttpError(400,'CONSENT_REQUIRED','성인 대상 안내를 확인해 주세요.');await db(env,'consentPut',{userId:s.user_id,purpose:body.purpose,version:body.purpose==='terms'?(env.TERMS_VERSION??'draft-terms-v1'):(env.AI_POLICY_VERSION??'draft-ai-v1'),now:runtime.now()});return json({ok:true});}
   if(path==='/api/library'&&req.method==='GET')return json({items:await db(env,'listSaved',{userId:s.user_id,now:runtime.now()})});
   if(path.startsWith('/api/library/')&&req.method==='GET'){const id=path.split('/').at(-1)!,row=await db<SavedRow|null>(env,'getSaved',{id,userId:s.user_id,now:runtime.now()});if(!row)throw new HttpError(404,'NOT_FOUND','저장한 정보를 찾을 수 없어요.');return json({kind:row.kind,value:await decrypt(env,row.cipher,`${s.user_id}:${row.kind}:${id}`)});}
   if((path==='/api/library'||path.startsWith('/api/library/'))&&req.method==='DELETE'){await db(env,'deleteSaved',{userId:s.user_id,id:path==='/api/library'?null:path.split('/').at(-1)});return json({ok:true});}
   if(path==='/api/account/unlink'&&req.method==='POST'){const body=z.object({confirmation:z.literal('탈퇴')}).strict().parse(await jsonBody(req));void body;const response=await startAuth(req,env,runtime,s.provider,'unlink');return json({url:response.headers.get('location')},200,{'set-cookie':response.headers.get('set-cookie')!});}
   if(path==='/api/account'&&req.method==='DELETE'){if(runtime.now()-s.recent_auth>600000)throw new HttpError(401,'REAUTH_REQUIRED','계정을 삭제하려면 소셜 계정을 다시 확인해 주세요. 최근 10분 안에 확인한 계정만 삭제할 수 있어요.');z.object({confirmation:z.literal('탈퇴')}).strict().parse(await jsonBody(req));await db(env,'deleteUser',{userId:s.user_id,eventId:crypto.randomUUID(),provider:s.provider,unlinkStatus:'provider_action_required',now:runtime.now()});return json({ok:true,unlinkStatus:'provider_action_required'},200,{'set-cookie':setCookie(env,'session','',0)});}
   if(path==='/api/profiles'&&req.method==='POST'){if(env.STORAGE_ENABLED!=='true')throw new HttpError(503,'STORAGE_DISABLED','선택 저장을 준비하고 있어요.');await db(env,'rate',{key:s.user_id+':profile:'+Math.floor(runtime.now()/60000),limit:20,now:runtime.now(),expires:runtime.now()+120000});const birth=aiBirthSchema.parse(await jsonBody(req));deriveFacts(birth,{kind:'year',target:kstDay(runtime.now()).slice(0,4)+'-01-01',label:kstDay(runtime.now()).slice(0,4)+'년'},runtime.now());const id=crypto.randomUUID();await db(env,'saveItem',{id,userId:s.user_id,kind:'birth',cipher:await encrypt(env,birth,`${s.user_id}:birth:${id}`),now:runtime.now(),expires:runtime.now()+integer(env.SAVED_RETENTION_DAYS,90)*86400000});return json({id},201);}
   throw new HttpError(404,'NOT_FOUND','요청한 기능을 찾을 수 없어요.');
  }
  if(path.startsWith('/auth/'))throw new HttpError(404,'NOT_FOUND','인증 경로를 확인해 주세요.');
  const response=await env.ASSETS.fetch(req);const h=new Headers(response.headers);h.set('x-content-type-options','nosniff');h.set('referrer-policy','strict-origin-when-cross-origin');h.set('permissions-policy','camera=(), microphone=(), geolocation=()');if(new URL(req.url).pathname.startsWith('/ai-saju'))h.set('cache-control','no-store');return new Response(response.body,{status:response.status,headers:h});
 }catch(error){if(error instanceof HttpError)return json({error:{code:error.code,message:error.message}},error.status);if(error instanceof z.ZodError)return json({error:{code:'INPUT_INVALID',message:'입력한 내용을 확인해 주세요.'}},400);return json({error:{code:'SERVER_UNAVAILABLE',message:'지금 요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.'}},503);}
}
