import {DurableObject} from 'cloudflare:workers';
import {createS256CodeChallenge} from 'arctic/dist/oauth2.js';
import {AiDatabase} from './index';
import {handle} from './src/app';
import {localAI} from './local/model';
import type {Env,OAuthAdapter} from './src/types';
import {sha,token,redirect,json} from './src/security';
import type {SocialProvider} from '../src/ai/contracts';
export {AiDatabase};
interface DevEnv extends Env {LOCAL_IDP:{getByName(name:string):{put(value:LocalCode):Promise<void>;take(code:string):Promise<LocalCode|null>}};MOCK_NOW?:string;}
interface LocalCode {code:string;provider:string;subject:string;nonce:string;challenge:string;state:string;expires:number;}
export class LocalIdentity extends DurableObject<DevEnv>{
 constructor(ctx:DurableObjectState,env:DevEnv){super(ctx,env);ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS codes(hash TEXT PRIMARY KEY,value TEXT,expires INTEGER)');}
 async put(value:LocalCode){this.ctx.storage.sql.exec('DELETE FROM codes WHERE expires<?',Date.now());this.ctx.storage.sql.exec('INSERT INTO codes VALUES(?,?,?)',await sha(value.code),JSON.stringify(value),Date.now()+600000);}
 async take(code:string){const key=await sha(code);return this.ctx.storage.transactionSync(()=>{const row=[...this.ctx.storage.sql.exec<{value:string;expires:number}>('SELECT value,expires FROM codes WHERE hash=?',key)][0];if(!row||row.expires<Date.now())return null;this.ctx.storage.sql.exec('DELETE FROM codes WHERE hash=?',key);return JSON.parse(row.value) as LocalCode;});}
}
function localOAuth(env:DevEnv):OAuthAdapter{return {
 start(provider,state,verifier,nonce){const u=new URL(`/__local-idp/${provider}`,env.APP_ORIGIN);u.searchParams.set('state',state);u.searchParams.set('nonce',nonce);if(provider==='google')u.searchParams.set('challenge',createS256CodeChallenge(verifier));return u;},
 async identity(provider,code,verifier,nonce,_redirect,state){const value=await env.LOCAL_IDP.getByName('local').take(code);if(!value||value.provider!==provider||value.state!==state||value.nonce!==nonce||(provider==='google'&&value.challenge!==createS256CodeChallenge(verifier)))throw new Error('Local code rejected');return {subject:value.subject,accessToken:'local-only-not-an-external-token'};},
 async unlink(){return true;}
};}
const escape=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const developmentWorker={async fetch(req:Request,env:DevEnv,ctx:ExecutionContext){
 const u=new URL(req.url);if(!['127.0.0.1','localhost'].includes(u.hostname)||u.origin!==env.APP_ORIGIN)return json({error:{code:'LOCAL_ONLY',message:'로컬 개발 서버에서만 사용할 수 있어요.'}},403);
 if(u.pathname.startsWith('/__local-idp/')){
  const provider=u.pathname.split('/').at(-1) as SocialProvider;if(!['google','kakao','naver'].includes(provider))return new Response('Not found',{status:404});
  if(req.method==='GET'){const hidden=['state','nonce','challenge'].map(key=>`<input type="hidden" name="${key}" value="${escape(u.searchParams.get(key)??'')}">`).join('');return new Response(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>로컬 모의 인증</title><main style="max-width:35rem;margin:3rem auto;padding:1rem;font:18px system-ui"><h1>로컬 모의 ${provider} 인증</h1><p>외부 로그인이나 실회원 인증이 아닙니다. 테스트용 가명만 사용하세요.</p><form method="post">${hidden}<label>로컬 테스트 계정 <input name="subject" value="demo-a" maxlength="40" required></label><p><button>모의 인증 계속</button></p><button name="cancel" value="yes">취소</button></form></main></html>`,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'"}});}
  if(req.method==='POST'){if(req.headers.get('origin')!==env.APP_ORIGIN)return json({error:'origin'},403);const b=await req.formData(),state=String(b.get('state')??'');const callback=new URL(`/auth/callback/${provider}`,env.APP_ORIGIN);callback.searchParams.set('state',state);if(b.get('cancel'))callback.searchParams.set('error','access_denied');else{const code=token(),subject=String(b.get('subject')??'').trim();if(!/^[a-zA-Z0-9_-]{1,40}$/.test(subject))return json({error:'로컬 계정 이름을 확인하세요.'},400);await env.LOCAL_IDP.getByName('local').put({code,provider,subject,nonce:String(b.get('nonce')??''),challenge:String(b.get('challenge')??''),state,expires:Date.now()+600000});callback.searchParams.set('code',code);}return redirect(callback.toString());}
 }
 const task=handle(req,env,{demo:true,now:()=>env.MOCK_NOW?Date.parse(env.MOCK_NOW):Date.now(),oauth:localOAuth(env),ai:localAI});ctx.waitUntil(task.then(()=>{}));return task;
}};

export default developmentWorker;
