import fs from 'node:fs';
import {createHash} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const directory=fs.mkdtempSync(path.join(os.tmpdir(),'saju-ai-e2e-'));
const production=process.argv.includes('--production');
let config='wrangler.ai.dev.jsonc';
if(production){const c=JSON.parse(fs.readFileSync('wrangler.ai.staging.jsonc','utf8'));c.name='saju-local-production-entry';c.main=path.resolve('worker/index.ts');c.assets.directory=path.resolve('out');c.vars.APP_ORIGIN='http://127.0.0.1:8788';c.vars.RELEASE_ARTIFACT_SHA=createHash('sha256').update(fs.readFileSync('worker-dist/index.js')).digest('hex');fs.mkdirSync('.cache/ai-production-test',{recursive:true});config='.cache/ai-production-test/wrangler.json';fs.writeFileSync(config,JSON.stringify(c));}
const result=spawnSync(process.execPath,['scripts/ai-wrangler.mjs','dev','--config',config,'--ip','127.0.0.1','--port',production?'8788':'8787','--persist-to',directory,'--local'],{stdio:'inherit'});
if(result.error)throw result.error;process.exitCode=result.status??1;
