import type {Env} from './types';
import {equal,hmac,HttpError,json} from './security';
/** Official-contract adapter as described in the operator's 2026-10-29 brief.
 * No OAuth client secret, OIDC SET token or invented signature is accepted here.
 * Latest official page must still be checked before registering/enabling it.
 */
export async function kakaoWebhook(req:Request,env:Env,now:number){
 if(!['GET','POST'].includes(req.method))throw new HttpError(405,'METHOD_NOT_ALLOWED','지원하지 않는 요청 방식이에요.');
 if(!env.KAKAO_UNLINK_ADMIN_KEY||!/^\d{1,32}$/.test(env.KAKAO_APP_ID??''))throw new HttpError(503,'WEBHOOK_UNAVAILABLE','연결 해제 통지 설정을 준비하고 있어요.');
 const auth=req.headers.get('authorization')??'';
 if(auth.length>256||!equal(auth,'KakaoAK '+env.KAKAO_UNLINK_ADMIN_KEY))throw new HttpError(401,'WEBHOOK_AUTH','통지 인증을 확인해 주세요.');
 let params:URLSearchParams;
 if(req.method==='GET'){if(new URL(req.url).search.length>2048)throw new HttpError(413,'WEBHOOK_INPUT','통지가 너무 길어요.');params=new URL(req.url).searchParams;}
 else{
  if(!req.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded'))throw new HttpError(415,'WEBHOOK_INPUT','통지 형식을 확인해 주세요.');
  const reader=req.body?.getReader();if(!reader)throw new HttpError(400,'WEBHOOK_INPUT','통지 내용이 없어요.');let body='',size=0;const decoder=new TextDecoder();
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();throw new HttpError(413,'WEBHOOK_INPUT','통지가 너무 길어요.');}body+=decoder.decode(value,{stream:true});}body+=decoder.decode();params=new URLSearchParams(body);
 }
 for(const key of ['app_id','user_id','referrer_type'])if(params.getAll(key).length!==1)throw new HttpError(400,'WEBHOOK_INPUT','필수 통지 항목을 확인해 주세요.');
 const app=params.get('app_id')!,subject=params.get('user_id')!,referrer=params.get('referrer_type')!;
 if(app!==env.KAKAO_APP_ID||!/^\d{1,64}$/.test(subject)||!/^\w{1,64}$/.test(referrer))throw new HttpError(400,'WEBHOOK_INPUT','통지 앱과 항목을 확인해 주세요.');
 const subjectHash=await hmac(env.IDENTITY_HMAC_KEY,'identity:kakao:'+subject),receiptHash=await hmac(env.IDENTITY_HMAC_KEY,'unlink:'+app+':'+subject+':'+referrer);
 // Acknowledge only AFTER the outbox and revocation barrier are durably committed.
 // The DO schedules its persistent alarm; deletion does not depend on waitUntil alone.
 const result=await env.STORE.getByName('ai-saju-authority-v1').command({op:'kakaoUnlinkEnqueue',p:{subjectHash,receiptHash,now}});
 if(result&&typeof result==='object'&&'error'in result)throw new HttpError(503,'WEBHOOK_RETRY','통지를 다시 보내 주세요.');
 return json({ok:true});
}
