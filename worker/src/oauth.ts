import {Google,Kakao,Naver,generateState,generateCodeVerifier} from 'arctic';
import {createOAuth2Request,sendTokenRequest} from 'arctic/dist/request.js';
import {createRemoteJWKSet,jwtVerify,type JWTVerifyGetKey} from 'jose';
import type {Env,OAuthAdapter} from './types';
import type {SocialProvider} from '../../src/ai/contracts';
const googleKeys=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
export {generateState,generateCodeVerifier};
export async function verifyGoogleIdToken(jwt:string,audience:string,nonce:string,keys:JWTVerifyGetKey=googleKeys){const {payload}=await jwtVerify(jwt,keys,{issuer:['https://accounts.google.com','accounts.google.com'],audience,algorithms:['RS256'],requiredClaims:['exp','iat','sub','nonce'],maxTokenAge:'10m',clockTolerance:5});if(payload.nonce!==nonce||(payload.azp!==undefined&&payload.azp!==audience)||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255)throw new Error('OIDC identity rejected');return payload.sub;}
export class SocialOAuth implements OAuthAdapter {
 constructor(private env:Env){}
 private google(redirect:string){return new Google(this.env.GOOGLE_CLIENT_ID!,this.env.GOOGLE_CLIENT_SECRET!,redirect);}
 private kakao(redirect:string){return new Kakao(this.env.KAKAO_CLIENT_ID!,this.env.KAKAO_CLIENT_SECRET!,redirect);}
 private naver(redirect:string){return new Naver(this.env.NAVER_CLIENT_ID!,this.env.NAVER_CLIENT_SECRET!,redirect);}
 start(provider:SocialProvider,state:string,verifier:string,nonce:string,redirect:string){
  if(provider==='google'){const url=this.google(redirect).createAuthorizationURL(state,verifier,['openid']);url.searchParams.set('nonce',nonce);return url;}
  if(provider==='kakao')return this.kakao(redirect).createAuthorizationURL(state,[]);
  const url=this.naver(redirect).createAuthorizationURL();url.searchParams.set('state',state);return url;
 }
 async identity(provider:SocialProvider,code:string,verifier:string,nonce:string,redirect:string,state:string){
  if(provider==='google'){const tokens=await this.google(redirect).validateAuthorizationCode(code,verifier);return {subject:await verifyGoogleIdToken(tokens.idToken(),this.env.GOOGLE_CLIENT_ID!,nonce),accessToken:tokens.accessToken()};}
  if(provider==='kakao'){const tokens=await this.kakao(redirect).validateAuthorizationCode(code);const r=await fetch('https://kapi.kakao.com/v2/user/me',{headers:{authorization:`Bearer ${tokens.accessToken()}`},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Kakao identity unavailable');const data=await r.json() as {id?:unknown};const id=typeof data.id==='number'&&Number.isSafeInteger(data.id)?String(data.id):typeof data.id==='string'&&/^\d+$/.test(data.id)?data.id:null;if(!id)throw new Error('Kakao subject invalid');return {subject:id,accessToken:tokens.accessToken()};}
  // Arctic's Naver builder does not add state. Bind and submit the one-time state explicitly.
  const body=new URLSearchParams({grant_type:'authorization_code',client_id:this.env.NAVER_CLIENT_ID!,client_secret:this.env.NAVER_CLIENT_SECRET!,redirect_uri:redirect,code,state});const tokens=await sendTokenRequest(createOAuth2Request('https://nid.naver.com/oauth2.0/token',body));
  const r=await fetch('https://openapi.naver.com/v1/nid/me',{headers:{authorization:`Bearer ${tokens.accessToken()}`},signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('Naver identity unavailable');const data=await r.json() as {resultcode?:string;response?:{id?:unknown}};if(data.resultcode!=='00'||typeof data.response?.id!=='string'||!data.response.id||data.response.id.length>255)throw new Error('Naver subject invalid');return {subject:data.response.id,accessToken:tokens.accessToken()};
 }
 async unlink(provider:SocialProvider,token:string){try{if(provider==='google'){await this.google('').revokeToken(token);return true;}if(provider==='kakao'){const r=await fetch('https://kapi.kakao.com/v1/user/unlink',{method:'POST',headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(10000)});return r.ok;}
  const r=await fetch('https://nid.naver.com/oauth2.0/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'delete',client_id:this.env.NAVER_CLIENT_ID!,client_secret:this.env.NAVER_CLIENT_SECRET!,access_token:token,service_provider:'NAVER'}),signal:AbortSignal.timeout(10000)});const data=await r.json() as {result?:string};return r.ok&&data.result==='success';
 }catch{return false;}}
}
