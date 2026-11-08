import fs from 'node:fs/promises';
import path from 'node:path';
async function files(root){const found=[];for(const e of await fs.readdir(root,{withFileTypes:true})){const p=path.join(root,e.name);if(e.isDirectory())found.push(...await files(p));else if(e.isFile())found.push(p);}return found;}
const worker=await files('worker-dist'),client=await files('out');
const env=await fs.readFile('.dev.vars','utf8').catch(()=> '');
const secrets=env.split('\n').map(line=>line.match(/^(?:DATA_ENCRYPTION_KEY|IDENTITY_HMAC_KEY|REQUEST_HMAC_KEY)=(.+)$/)?.[1]?.trim().replace(/^['"]|['"]$/g,'')).filter(Boolean);
const forbidden=['/__local-idp/','MOCK_NOW','로컬 모의 kakao 인증','different-subject','local-unlink-test-key'];
const errors=[];
for(const file of [...worker,...client]){
 const data=await fs.readFile(file);for(const value of secrets)if(data.includes(Buffer.from(value)))errors.push(`${file}: local secret included`);
 if(worker.includes(file)&&/\.(js|mjs)$/.test(file)){const text=data.toString('utf8');for(const token of forbidden)if(text.includes(token))errors.push(`${file}: development-only marker ${token}`);}
 if(/(?:^|\/)\.dev\.vars(?:\.|$)|\.env(?:\.|$)/.test(file))errors.push(`${file}: environment file included`);
}
const config=JSON.parse(await fs.readFile('wrangler.ai.jsonc','utf8'));
for(const key of ['AI_ENABLED','POLICIES_CONFIRMED','OAUTH_REVIEWED','TRANSFER_CONFIRMED','AGE_POLICY_CONFIRMED','RETENTION_CONFIRMED'])if(config.vars[key]!=='false')errors.push(`production gate is open: ${key}`);
if(config.main!=='worker/index.ts'||config.workers_dev!==true||config.preview_urls!==false)errors.push('production target config changed');
if(config.vars.APP_ORIGIN!=='https://spring-voice-4bdc.eogjs9595.workers.dev')errors.push('unexpected production origin');
if(JSON.stringify(config)!==JSON.stringify(JSON.parse(await fs.readFile('wrangler.json','utf8'))))errors.push('canonical and AI production configs differ');
if(errors.length)throw new Error(errors.join('\n'));
await fs.mkdir('reports/ai-saju',{recursive:true});await fs.writeFile('reports/ai-saju/bundle-audit.json',JSON.stringify({passed:true,workerFiles:worker.length,clientFiles:client.length,localSecretValuesChecked:secrets.length,developmentMarkersAbsentFromWorker:true,productionGatesClosed:true,actualDeployment:false},null,2)+'\n');
console.log(`PASS: ${worker.length} worker + ${client.length} static files; local secrets absent; local IdP excluded from production; launch gates closed. No deployment.`);
