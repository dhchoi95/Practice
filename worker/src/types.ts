import type {AiAnswer,AiRequest,Fact,SocialProvider} from '../../src/ai/contracts';
export interface Env {
 RELEASE_VERSION?:string;RELEASE_ARTIFACT_SHA?:string;STORAGE_HEALTH_CHECK?:string;APP_ENV?:string;APP_ORIGIN?:string;AI_ENABLED?:string;POLICIES_CONFIRMED?:string;OAUTH_REVIEWED?:string;TRANSFER_CONFIRMED?:string;AGE_POLICY_CONFIRMED?:string;RETENTION_CONFIRMED?:string;OPERATOR_CONTACT?:string;TERMS_VERSION?:string;AI_POLICY_VERSION?:string;SERVICE_COUNTRY?:string;
 DATA_ENCRYPTION_KEY_ID?:string;DATA_ENCRYPTION_OLD_KEYS?:string;DATA_ENCRYPTION_KEY?:string;IDENTITY_HMAC_KEY?:string;REQUEST_HMAC_KEY?:string;GOOGLE_CLIENT_ID?:string;GOOGLE_CLIENT_SECRET?:string;KAKAO_CLIENT_ID?:string;KAKAO_CLIENT_SECRET?:string;NAVER_CLIENT_ID?:string;NAVER_CLIENT_SECRET?:string;KAKAO_UNLINK_ADMIN_KEY?:string;KAKAO_APP_ID?:string;KAKAO_LOGIN_ENABLED?:string;GOOGLE_LOGIN_ENABLED?:string;NAVER_LOGIN_ENABLED?:string;KAKAO_WEBHOOK_REVIEWED?:string;
 OPERATOR_NAME?:string;ACCOUNT_PROCESSING_BASIS?:string;TRANSFER_BASIS?:string;AI_RECIPIENT_NAME?:string;AI_PROCESSING_COUNTRIES?:string;AI_RETENTION_NOTICE?:string;CLOUD_STORAGE_LOCATION_NOTICE?:string;AI_PRIVACY_NOTICE_URL?:string;AI_PROVIDER?:string;AI_MODEL?:string;AI_API_KEY?:string;PRICE_INPUT_USD_PER_MILLION?:string;PRICE_OUTPUT_USD_PER_MILLION?:string;PRICE_REVIEW_DATE?:string;PRICE_SOURCE_URL?:string;DAILY_BUDGET_MICRO_USD?:string;MONTHLY_BUDGET_MICRO_USD?:string;GLOBAL_CONCURRENCY?:string;STORAGE_ENABLED?:string;SAVED_RETENTION_DAYS?:string;
 STORE:{getByName(name:string):{command(command:Command):Promise<unknown>}};ASSETS:{fetch(request:Request):Promise<Response>};
}
export interface Runtime {demo:boolean;now:()=>number;oauth:OAuthAdapter;ai:AiAdapter;}
export interface OAuthAdapter {start(provider:SocialProvider,state:string,verifier:string,nonce:string,redirect:string):URL;identity(provider:SocialProvider,code:string,verifier:string,nonce:string,redirect:string,state:string):Promise<{subject:string;accessToken:string}>;unlink(provider:SocialProvider,token:string):Promise<boolean>;}
export interface AiAdapter {generate(request:AiRequest,facts:Fact[],period:string,signal:AbortSignal):Promise<{answer:unknown;usage:TokenUsage}>;}
export interface TokenUsage {input:number;output:number;thinking:number;}
export interface SessionRow {user_id:string;quota_key:string;provider:SocialProvider;created_at:number;expires:number;recent_auth:number;generation:number;}
export interface UserRow {id:string;quota_key:string;provider:SocialProvider;generation:number;}
export interface SavedRow {id:string;kind:'birth'|'conversation';cipher:string;created_at:number;expires:number;}
export interface PendingRow {provider:SocialProvider;subject_hash:string;quota_key:string;expires:number;}
export interface AuthRow {provider:SocialProvider;secret_cipher:string;intent:'login'|'unlink';user_id:string|null;expires:number;}
export interface Reservation {id:string;user_id:string|null;quota_key:string|null;day:string;month:string;request_key:string;request_hash:string;stage:string;birth_hash:string;generation:number;status:string;max_cost:number;actual_cost:number;cost_estimated:number;created_at:number;deadline:number;}
export interface ReserveInput {userId:string;quotaKey:string;id:string;key:string;hash:string;birthHash:string;generation:number;stage:string;now:number;day:string;month:string;maxCost:number;dailyCap:number;monthlyCap:number;concurrency:number;}
export interface SavedWrite {id:string;kind:'birth'|'conversation';cipher:string;expires:number;}
export interface Command {op:string;p:Record<string,unknown>;}
export interface SqlLike {exec(query:string,...bindings:(string|number|null)[]):Iterable<Record<string,unknown>>;}
export interface Generated {answer:AiAnswer;facts:Fact[];}
