import {AI_LIMITS,type Usage} from '../../src/ai/contracts';
import type {AuthRow,Command,PendingRow,Reservation,ReserveInput,SavedRow,SavedWrite,SessionRow,SqlLike,UserRow} from './types';
import {nextReset} from './policy';
const DAY=86400000;
export class Store {
 constructor(private sql:SqlLike,private transaction:<T>(fn:()=>T)=>T,schema:string){for(const statement of schema.split(';').map(s=>s.trim()).filter(Boolean))sql.exec(statement);}
 private rows<T>(query:string,...args:(string|number|null)[]){return [...this.sql.exec(query,...args)] as T[];}
 private one<T>(query:string,...args:(string|number|null)[]){return this.rows<T>(query,...args)[0]??null;}
 private error(code:string){return {error:code};}
 usage(quotaKey:string,day:string):Usage{const row=this.one<{used:number;initials:number}>("SELECT COUNT(*) AS used,COALESCE(SUM(CASE WHEN stage='initial' THEN 1 ELSE 0 END),0) AS initials FROM reservations WHERE quota_key=? AND day=? AND status='complete'",quotaKey,day)!;const pending=!!this.one("SELECT id FROM reservations WHERE quota_key=? AND status IN ('reserved','dispatched')",quotaKey);return {day,used:row.used,remaining:Math.max(0,AI_LIMITS.daily-row.used),initialDone:row.initials>0,followupsRemaining:row.initials?Math.max(0,AI_LIMITS.daily-row.used):AI_LIMITS.followups,pending,resetAt:nextReset(day)};}
 private expire(now:number){for(const row of this.rows<Reservation>("SELECT * FROM reservations WHERE status IN ('reserved','dispatched') AND deadline<?",now))this.settle({id:row.id,success:false,cost:row.status==='dispatched'?row.max_cost:0,estimated:row.status==='dispatched',input:0,output:0,thinking:0,now,saves:[]});}
 private reserve(p:ReserveInput){return this.transaction(()=>{
  this.expire(p.now);
  if(!this.one('SELECT id FROM users WHERE id=? AND quota_key=? AND generation=?',p.userId,p.quotaKey,p.generation))return this.error('UNAUTHENTICATED');
  const existing=this.one<Reservation>('SELECT * FROM reservations WHERE quota_key=? AND request_key=?',p.quotaKey,p.key);
  if(existing)return this.error(existing.request_hash!==p.hash?'IDEMPOTENCY_MISMATCH':existing.status==='complete'?'RESULT_NOT_RETAINED':existing.status==='reserved'||existing.status==='dispatched'?'REQUEST_PENDING':'REQUEST_FINISHED');
  if(this.one("SELECT key FROM settings WHERE key='budget_halted' AND value='true'"))return this.error('BUDGET_PAUSED');
  if(this.one("SELECT id FROM reservations WHERE quota_key=? AND status IN ('reserved','dispatched')",p.quotaKey))return this.error('REQUEST_PENDING');
  if(this.one<{n:number}>('SELECT COUNT(*) AS n FROM reservations WHERE quota_key=? AND created_at>?',p.quotaKey,p.now-600000)!.n>=AI_LIMITS.attemptsPerTenMinutes)return this.error('RATE_LIMITED');
  const usage=this.usage(p.quotaKey,p.day),first=this.one<Reservation>("SELECT * FROM reservations WHERE quota_key=? AND day=? AND stage='initial' AND status='complete'",p.quotaKey,p.day);
  if(usage.used>=AI_LIMITS.daily)return this.error('DAILY_LIMIT');
  if(p.stage==='initial'&&first)return this.error('INITIAL_ALREADY_DONE');
  if(p.stage==='followup'&&!first)return this.error('INITIAL_REQUIRED');
  if(p.stage==='followup'&&first!.birth_hash!==p.birthHash)return this.error('BIRTH_CHANGED');
  if(this.one<{n:number}>("SELECT COUNT(*) AS n FROM reservations WHERE status IN ('reserved','dispatched')")!.n>=p.concurrency)return this.error('SERVICE_BUSY');
  for(const [bucket,cap] of [[`day:${p.day}`,p.dailyCap],[`month:${p.month}`,p.monthlyCap]] as const){this.sql.exec('INSERT OR IGNORE INTO budgets(bucket) VALUES(?)',bucket);const b=this.one<{spent:number;reserved:number}>('SELECT spent,reserved FROM budgets WHERE bucket=?',bucket)!;if(b.spent+b.reserved+p.maxCost>cap)return this.error('BUDGET_PAUSED');}
  for(const bucket of [`day:${p.day}`,`month:${p.month}`])this.sql.exec('UPDATE budgets SET reserved=reserved+? WHERE bucket=?',p.maxCost,bucket);
  this.sql.exec("INSERT INTO reservations(id,user_id,quota_key,day,month,request_key,request_hash,stage,birth_hash,generation,status,max_cost,created_at,deadline) VALUES(?,?,?,?,?,?,?,?,?,?,'reserved',?,?,?)",p.id,p.userId,p.quotaKey,p.day,p.month,p.key,p.hash,p.stage,p.birthHash,p.generation,p.maxCost,p.now,p.now+60000);
  return {id:p.id};
 });}
 private settle(p:{id:string;success:boolean;cost:number;estimated?:boolean;input:number;output:number;thinking:number;now:number;saves:SavedWrite[]}){
  const r=this.one<Reservation>('SELECT * FROM reservations WHERE id=?',p.id);if(!r)return {active:false,settled:false};
  if(!['reserved','dispatched'].includes(r.status)){
   // A watchdog may already have charged the ceiling. Late known usage changes money only,
   // never restores an entitlement or recreates deleted user content.
   if(r.cost_estimated&&!p.estimated){const actual=Math.max(0,Math.ceil(p.cost));for(const bucket of [`day:${r.day}`,`month:${r.month}`])this.sql.exec('UPDATE budgets SET spent=MAX(0,spent+?) WHERE bucket=?',actual-r.actual_cost,bucket);this.sql.exec('UPDATE reservations SET actual_cost=?,cost_estimated=0,input_tokens=?,output_tokens=?,thinking_tokens=? WHERE id=?',actual,p.input,p.output,p.thinking,r.id);this.sql.exec('INSERT OR REPLACE INTO request_metrics VALUES(?,?,0)',r.id,Math.max(0,p.now-r.created_at));if(actual>r.max_cost)this.sql.exec("INSERT OR REPLACE INTO settings VALUES('budget_halted','true')");return {active:false,settled:false,reconciled:true};}
   return {active:false,settled:false};
  }
  const actual=Math.max(0,Math.ceil(p.cost));
  for(const bucket of [`day:${r.day}`,`month:${r.month}`])this.sql.exec('UPDATE budgets SET reserved=MAX(0,reserved-?),spent=spent+? WHERE bucket=?',r.max_cost,actual,bucket);
  this.sql.exec('INSERT OR REPLACE INTO request_metrics VALUES(?,?,0)',r.id,Math.max(0,p.now-r.created_at));if(actual>r.max_cost)this.sql.exec("INSERT OR REPLACE INTO settings VALUES('budget_halted','true')");
  const active=!!(r.user_id&&this.one('SELECT id FROM users WHERE id=?',r.user_id));
  this.sql.exec('UPDATE reservations SET status=?,actual_cost=?,cost_estimated=?,input_tokens=?,output_tokens=?,thinking_tokens=? WHERE id=?',p.success&&active?'complete':'failed',actual,p.estimated?1:0,p.input,p.output,p.thinking,p.id);
  let skipped=false;
  const maySave=active&&!!this.one('SELECT id FROM users WHERE id=? AND generation=?',r.user_id!,r.generation);
  if(maySave&&p.success)for(const save of p.saves){if(this.one<{n:number}>('SELECT COUNT(*) n FROM saved_items WHERE user_id=?',r.user_id!)!.n>=50&&!this.one('SELECT id FROM saved_items WHERE id=? AND user_id=?',save.id,r.user_id!)){skipped=true;continue;}const previous=this.one<{user_id:string}>('SELECT user_id FROM saved_items WHERE id=?',save.id);if(previous&&previous.user_id!==r.user_id)continue;this.sql.exec('INSERT INTO saved_items(id,user_id,kind,cipher,created_at,expires) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET cipher=excluded.cipher,expires=excluded.expires WHERE saved_items.user_id=excluded.user_id',save.id,r.user_id!,save.kind,save.cipher,p.now,save.expires);}
  return {active,settled:true,savesSkipped:skipped||(!!p.saves.length&&!maySave)};
 }
 command({op,p}:Command):unknown {switch(op){
  case 'authPut':{this.sql.exec('DELETE FROM auth_transactions WHERE expires<?',Number(p.now));this.sql.exec('INSERT INTO auth_transactions VALUES(?,?,?,?,?,?,?)',String(p.stateHash),String(p.cookieHash),String(p.provider),String(p.cipher),String(p.intent),p.userId?String(p.userId):null,Number(p.expires));return {ok:true};}
  case 'authTake':return this.transaction(()=>{const row=this.one<AuthRow&{cookie_hash:string;expires:number}>('SELECT * FROM auth_transactions WHERE state_hash=?',String(p.stateHash));if(!row||row.expires<Number(p.now)||row.cookie_hash!==p.cookieHash||row.provider!==p.provider)return null;this.sql.exec('DELETE FROM auth_transactions WHERE state_hash=?',String(p.stateHash));return row;});
  case 'findUser':return this.one<UserRow>('SELECT u.* FROM users u JOIN auth_accounts a ON a.user_id=u.id WHERE a.provider=? AND a.subject_hash=?',String(p.provider),String(p.subjectHash));
  case 'pendingPut':if(p.authStartedAt!==undefined&&this.one('SELECT provider FROM identity_revocations WHERE provider=? AND subject_hash=? AND revoked_at>=?',String(p.provider),String(p.subjectHash),Number(p.authStartedAt)))return this.error('AUTH_REVOKED');this.sql.exec('INSERT INTO pending_signup VALUES(?,?,?,?,?)',String(p.hash),String(p.provider),String(p.subjectHash),String(p.quotaKey),Number(p.expires));return {ok:true};
  case 'pendingGet':return this.one<PendingRow>('SELECT * FROM pending_signup WHERE token_hash=? AND expires>?',String(p.hash),Number(p.now));
  case 'signup':return this.transaction(()=>{const pending=this.one<PendingRow>('SELECT * FROM pending_signup WHERE token_hash=? AND expires>?',String(p.hash),Number(p.now));if(!pending)return this.error('SIGNUP_EXPIRED');let user=this.one<UserRow>('SELECT u.* FROM users u JOIN auth_accounts a ON a.user_id=u.id WHERE a.provider=? AND a.subject_hash=?',pending.provider,pending.subject_hash);if(!user){this.sql.exec('INSERT INTO users VALUES(?,?,?,?,1)',String(p.userId),pending.quota_key,pending.provider,Number(p.now));this.sql.exec('INSERT INTO auth_accounts VALUES(?,?,?)',pending.provider,pending.subject_hash,String(p.userId));user=this.one<UserRow>('SELECT * FROM users WHERE id=?',String(p.userId))!;}this.sql.exec("INSERT OR REPLACE INTO consents VALUES(?,'terms',?,?)",user.id,String(p.version),Number(p.now));this.sql.exec("INSERT OR REPLACE INTO consents VALUES(?,'adult','adult-draft',?)",user.id,Number(p.now));this.sql.exec('DELETE FROM pending_signup WHERE token_hash=?',String(p.hash));return user;});
  case 'sessionPut':return this.transaction(()=>{if(!this.one('SELECT id FROM users WHERE id=?',String(p.userId))||this.one("SELECT id FROM unlink_jobs WHERE target_user_id=? AND status='pending'",String(p.userId)))return this.error('UNAUTHENTICATED');if(p.authStartedAt!==undefined&&this.one('SELECT provider FROM identity_revocations WHERE provider=? AND subject_hash=? AND revoked_at>=?',String(p.provider),String(p.subjectHash),Number(p.authStartedAt)))return this.error('AUTH_REVOKED');this.sql.exec('DELETE FROM sessions WHERE expires<?',Number(p.now));const existing=this.rows<{token_hash:string}>('SELECT token_hash FROM sessions WHERE user_id=? ORDER BY created_at DESC',String(p.userId));for(const r of existing.slice(4))this.sql.exec('DELETE FROM sessions WHERE token_hash=?',r.token_hash);if(p.previous)this.sql.exec('DELETE FROM sessions WHERE token_hash=?',String(p.previous));this.sql.exec('INSERT INTO sessions VALUES(?,?,?,?,?)',String(p.hash),String(p.userId),Number(p.expires),Number(p.now),Number(p.now));return {ok:true};});
  case 'sessionGet':return this.one<SessionRow>('SELECT s.*,u.quota_key,u.provider,u.generation FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>?',String(p.hash),Number(p.now));
  case 'sessionDelete':return this.transaction(()=>{this.sql.exec('UPDATE users SET generation=generation+1 WHERE id=(SELECT user_id FROM sessions WHERE token_hash=?)',String(p.hash));this.sql.exec('DELETE FROM sessions WHERE token_hash=?',String(p.hash));return {ok:true};});
  case 'consentGet':return this.one('SELECT version FROM consents WHERE user_id=? AND purpose=?',String(p.userId),String(p.purpose));
  case 'consentPut':if(!this.one('SELECT id FROM users WHERE id=?',String(p.userId)))return this.error('UNAUTHENTICATED');this.sql.exec('INSERT OR REPLACE INTO consents VALUES(?,?,?,?)',String(p.userId),String(p.purpose),String(p.version),Number(p.now));return {ok:true};
  case 'usage':return this.transaction(()=>{this.expire(Number(p.now));return this.usage(String(p.quotaKey),String(p.day));});
  case 'reserve':return this.reserve(p as unknown as ReserveInput);
  case 'dispatch':{const row=this.one<Reservation>('SELECT * FROM reservations WHERE id=?',String(p.id));if(!row||row.status!=='reserved'||row.deadline<Number(p.now)||!row.user_id)return this.error('REQUEST_FINISHED');this.sql.exec("UPDATE reservations SET status='dispatched' WHERE id=?",row.id);return {ok:true};}
  case 'settle':return this.transaction(()=>this.settle(p as unknown as Parameters<Store['settle']>[0]));
  case 'rate':return this.transaction(()=>{this.sql.exec('DELETE FROM action_rates WHERE expires<?',Number(p.now));const r=this.one<{count:number}>('SELECT count FROM action_rates WHERE key=?',String(p.key));if((r?.count??0)>=Number(p.limit))return this.error('RATE_LIMITED');this.sql.exec('INSERT INTO action_rates VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1',String(p.key),Number(p.expires));return {ok:true};});
  case 'saveItem':return this.transaction(()=>{if(this.one<{n:number}>('SELECT COUNT(*) n FROM saved_items WHERE user_id=?',String(p.userId))!.n>=50)return this.error('STORAGE_LIMIT');if(!this.one('SELECT id FROM users WHERE id=?',String(p.userId)))return this.error('UNAUTHENTICATED');this.sql.exec('INSERT INTO saved_items VALUES(?,?,?,?,?,?)',String(p.id),String(p.userId),String(p.kind),String(p.cipher),Number(p.now),Number(p.expires));return {ok:true};});
  case 'listSaved':return this.rows('SELECT id,kind,created_at,expires FROM saved_items WHERE user_id=? AND expires>? ORDER BY created_at DESC',String(p.userId),Number(p.now));
  case 'getSaved':return this.one<SavedRow>('SELECT * FROM saved_items WHERE id=? AND user_id=? AND expires>?',String(p.id),String(p.userId),Number(p.now));
  case 'deleteSaved':return this.transaction(()=>{if(p.id&&!this.one('SELECT id FROM saved_items WHERE id=? AND user_id=?',String(p.id),String(p.userId)))return this.error('NOT_FOUND');this.sql.exec('UPDATE users SET generation=generation+1 WHERE id=?',String(p.userId));if(p.id)this.sql.exec('DELETE FROM saved_items WHERE id=? AND user_id=?',String(p.id),String(p.userId));else this.sql.exec('DELETE FROM saved_items WHERE user_id=?',String(p.userId));return {ok:true};});
  case 'deleteUser':return this.transaction(()=>{this.sql.exec('DELETE FROM users WHERE id=?',String(p.userId));this.sql.exec('DELETE FROM auth_transactions WHERE user_id=?',String(p.userId));this.sql.exec('INSERT INTO unlink_events VALUES(?,?,?,?)',String(p.eventId),String(p.provider),String(p.unlinkStatus),Number(p.now)+7*DAY);return {ok:true,unlinkStatus:p.unlinkStatus};});
  case 'unlinkBySubject':return this.transaction(()=>{const user=this.one<{user_id:string}>('SELECT user_id FROM auth_accounts WHERE provider=? AND subject_hash=?',String(p.provider),String(p.subjectHash));if(user)this.sql.exec('DELETE FROM users WHERE id=?',user.user_id);return {ok:true};});
  case 'kakaoUnlinkEnqueue':return this.transaction(()=>{
   const user=this.one<{user_id:string}>('SELECT user_id FROM auth_accounts WHERE provider=? AND subject_hash=?','kakao',String(p.subjectHash));
   // Bind a durable job to the account present at receipt. A retry for an already removed
   // account must not create a new account or save provider access tokens/raw IDs.
   const id=String(p.receiptHash)+':'+(user?.user_id??'absent');
   if(this.one('SELECT id FROM unlink_jobs WHERE id=?',id))return {ok:true,duplicate:true};
   this.sql.exec('INSERT INTO identity_revocations VALUES(?,?,?,?) ON CONFLICT(provider,subject_hash) DO UPDATE SET revoked_at=MAX(revoked_at,excluded.revoked_at),expires=excluded.expires','kakao',String(p.subjectHash),Number(p.now),Number(p.now)+7*DAY);
   this.sql.exec('DELETE FROM pending_signup WHERE provider=? AND subject_hash=?','kakao',String(p.subjectHash));
   if(user){this.sql.exec('DELETE FROM sessions WHERE user_id=?',user.user_id);this.sql.exec('DELETE FROM auth_transactions WHERE user_id=?',user.user_id);}
   this.sql.exec('INSERT INTO unlink_jobs VALUES(?,?,?,?,?,?,?)',id,'kakao',String(p.subjectHash),user?.user_id??null,'pending',Number(p.now),Number(p.now)+7*DAY);
   return {ok:true,duplicate:false};
  });
  case 'unlinkDrain':return this.transaction(()=>{const jobs=this.rows<{id:string;target_user_id:string|null}>("SELECT id,target_user_id FROM unlink_jobs WHERE status='pending' ORDER BY created_at LIMIT 20");for(const job of jobs){if(job.target_user_id){this.sql.exec('DELETE FROM auth_transactions WHERE user_id=?',job.target_user_id);this.sql.exec('DELETE FROM users WHERE id=?',job.target_user_id);}this.sql.exec("UPDATE unlink_jobs SET status='complete' WHERE id=?",job.id);}return {processed:jobs.length,pending:!!this.one("SELECT id FROM unlink_jobs WHERE status='pending'")};});
  case 'schemaHealth':return {sqlite:true,schemaVersion:this.one<{version:number}>('SELECT MAX(version) version FROM schema_version')!.version};
  case 'opsSummary':return {days:this.rows('SELECT bucket,spent,reserved FROM budgets ORDER BY bucket DESC LIMIT 64'),requests:this.rows('SELECT day,status,cost_estimated,COUNT(*) AS requests,SUM(input_tokens) AS input_tokens,SUM(output_tokens) AS output_tokens,SUM(actual_cost) AS accounted_micro_usd FROM reservations GROUP BY day,status,cost_estimated ORDER BY day DESC'),halted:!!this.one("SELECT key FROM settings WHERE key='budget_halted' AND value='true'")};
  case 'opsUsageMetrics':return this.rows('SELECT r.stage,r.status,r.input_tokens AS input,r.output_tokens AS output,r.thinking_tokens AS thinking,r.actual_cost AS cost_micro_usd,r.cost_estimated AS estimated,m.latency_ms,m.retry_count FROM reservations r LEFT JOIN request_metrics m ON m.request_id=r.id ORDER BY r.created_at DESC LIMIT 1000');
  case 'opsPause':this.sql.exec("INSERT OR REPLACE INTO settings VALUES('budget_halted',?)",p.paused?'true':'false');return {ok:true};
  case 'cleanup':return this.transaction(()=>{const now=Number(p.now);this.expire(now);for(const table of ['auth_transactions','pending_signup','sessions','saved_items','unlink_events','action_rates','identity_revocations'])this.sql.exec(`DELETE FROM ${table} WHERE expires<?`,now);this.sql.exec("DELETE FROM unlink_jobs WHERE expires<? AND status='complete'",now);this.sql.exec("UPDATE reservations SET user_id=NULL,quota_key=NULL,birth_hash='',request_hash='',request_key=id WHERE created_at<? AND status NOT IN ('reserved','dispatched')",now-7*DAY);this.sql.exec("DELETE FROM reservations WHERE created_at<? AND status NOT IN ('reserved','dispatched')",now-30*DAY);return {ok:true};});
  default:throw new Error('Unsupported internal store command');
 }}
}
