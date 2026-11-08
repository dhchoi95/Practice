import {AI_LIMITS,SOCIAL_PROVIDERS,type SocialProvider} from '../../src/ai/contracts';
import type {Env,TokenUsage} from './types';
import {validKey} from './security';
export function providerConfigured(e:Env,p:SocialProvider){const k=p.toUpperCase();return !!(e[`${k}_CLIENT_ID` as keyof Env]&&e[`${k}_CLIENT_SECRET` as keyof Env]&&e[`${k}_LOGIN_ENABLED` as keyof Env]==='true'&&(p!=='kakao'||(e.KAKAO_WEBHOOK_REVIEWED==='true'&&e.KAKAO_UNLINK_ADMIN_KEY&&/^\d+$/.test(e.KAKAO_APP_ID??''))));}
function configured(s:string|undefined){return !!s&&s.length>=3&&s.length<=1000&&!/미정|TODO|확인 필요|pending|example\.|\.invalid/i.test(s);}
export function launchReady(e:Env){return configured(e.OPERATOR_NAME)&&configured(e.ACCOUNT_PROCESSING_BASIS)&&configured(e.TRANSFER_BASIS)&&configured(e.AI_RECIPIENT_NAME)&&configured(e.AI_PROCESSING_COUNTRIES)&&configured(e.AI_RETENTION_NOTICE)&&configured(e.CLOUD_STORAGE_LOCATION_NOTICE)&&!!e.AI_PRIVACY_NOTICE_URL?.startsWith('https://')&& ['production','staging'].includes(e.APP_ENV??'')&&!!e.APP_ORIGIN?.startsWith('https://')&&validKey(e.DATA_ENCRYPTION_KEY)&&validKey(e.IDENTITY_HMAC_KEY)&&validKey(e.REQUEST_HMAC_KEY)&&e.POLICIES_CONFIRMED==='true'&&e.OAUTH_REVIEWED==='true'&&e.TRANSFER_CONFIRMED==='true'&&e.AGE_POLICY_CONFIRMED==='true'&&e.RETENTION_CONFIRMED==='true'&&e.SERVICE_COUNTRY==='KR'&&configured(e.OPERATOR_CONTACT)&&!!e.OPERATOR_CONTACT?.includes('@')&&!!e.TERMS_VERSION&&!e.TERMS_VERSION.startsWith('draft')&&!!e.AI_POLICY_VERSION&&!e.AI_POLICY_VERSION.startsWith('draft')&&SOCIAL_PROVIDERS.some(p=>providerConfigured(e,p));}
export function integer(value:string|undefined,fallback=0){const n=Number(value);return Number.isSafeInteger(n)&&n>=0?n:fallback;}
export function price(value:string|undefined){if(!/^\d+(?:\.\d{1,6})?$/.test(value??''))return 0;const [whole,fraction='']=value!.split('.');const n=Number(whole)*1e6+Number(fraction.padEnd(6,'0'));return Number.isSafeInteger(n)?n:0;}
export function cost(e:Env,t:TokenUsage){return Math.ceil((t.input*price(e.PRICE_INPUT_USD_PER_MILLION)+t.output*price(e.PRICE_OUTPUT_USD_PER_MILLION))/1e6);}
export function maxCost(e:Env){return cost(e,{input:AI_LIMITS.inputTokens,output:AI_LIMITS.outputTokens,thinking:0});}
export function priceReviewStatus(e:Env,now=Date.now()){
 const reviewed=Date.parse((e.PRICE_REVIEW_DATE??'')+'T00:00:00Z'),expires=reviewed+31*86400000;
 const valid=Number.isFinite(reviewed)&&now<expires&&reviewed-now<=86400000;
 const daysLeft=Number.isFinite(expires)?Math.max(0,Math.ceil((expires-now)/86400000)):null;
 return {valid,daysLeft,expiresAt:Number.isFinite(expires)?new Date(expires).toISOString():null,warning:!valid?'가격 확인일이 없거나 오래되어 AI 생성이 차단됩니다.':daysLeft!==null&&daysLeft<=7?'가격 재확인이 필요합니다. 7일 이내 확인 기한이 끝납니다.':null};
}
export function paidReady(e:Env,now=Date.now()){return priceReviewStatus(e,now).valid&& launchReady(e)&&e.AI_ENABLED==='true'&&e.AI_PROVIDER==='gemini'&&e.AI_MODEL==='gemini-2.5-flash-lite'&&!!e.AI_API_KEY&&price(e.PRICE_INPUT_USD_PER_MILLION)>0&&price(e.PRICE_OUTPUT_USD_PER_MILLION)>0&&/^\d{4}-\d{2}-\d{2}$/.test(e.PRICE_REVIEW_DATE??'')&&e.PRICE_SOURCE_URL==='https://ai.google.dev/gemini-api/docs/pricing'&&integer(e.DAILY_BUDGET_MICRO_USD)>0&&integer(e.MONTHLY_BUDGET_MICRO_USD)>=integer(e.DAILY_BUDGET_MICRO_USD)&&integer(e.GLOBAL_CONCURRENCY)>0&&integer(e.GLOBAL_CONCURRENCY)<=20;}
export function kstDay(now:number){return new Date(now+9*3600000).toISOString().slice(0,10);}
export function nextReset(day:string){return new Date(Date.parse(day+'T00:00:00+09:00')+86400000).toISOString();}
export function publicPolicy(e:Env,demo:boolean){return {ready:demo||launchReady(e),demo,message:demo?'로컬 개발 데모입니다. 실제 소셜 로그인이나 AI 답변이 아니며 비용이 발생하지 않아요.':launchReady(e)?'AI가 생성한 사주 해석이에요. 실제 미래를 보장하지 않아요.':'AI 사주를 준비하고 있어요. 운영 설정 전에는 가입과 AI 진단을 이용할 수 없어요.'};}
