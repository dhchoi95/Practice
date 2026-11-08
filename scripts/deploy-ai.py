"""Verified deployment of the existing Worker; never prints a credential.

Remote deploys require a successfully checked staging release manifest. No plan upgrade,
secret upload, identity registration or policy/AI enabling is performed by this command.
"""
import argparse, hashlib, json, os, pathlib, subprocess, sys, urllib.request, urllib.error
from datetime import datetime, timezone
ROOT=pathlib.Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser();p.add_argument('target',choices=['preflight','staging','production','static']);args=p.parse_args()
out=ROOT/'reports/ai-saju';out.mkdir(parents=True,exist_ok=True)
record={'target':args.target,'startedAt':datetime.now(timezone.utc).isoformat(),'deployed':False}
token=os.environ.get('CLOUDFLARE_API_TOKEN','').strip()
if not token:
 file=pathlib.Path('/workspace/.secrets/cloudflare-api-token')
 if file.exists():token=file.read_text().strip()
def api(path):
 req=urllib.request.Request('https://api.cloudflare.com/client/v4'+path,headers={'Authorization':'Bearer '+token})
 try:
  with urllib.request.urlopen(req,timeout=20) as r:result=json.load(r)
 except Exception as error:raise RuntimeError('Cloudflare read check failed: '+str(error)) from None
 if not result.get('success'):raise RuntimeError('Cloudflare rejected read check: '+str([e.get('code') for e in result.get('errors',[])]))
 return result.get('result')
def manifest():
 return {str(f.relative_to(ROOT/'out')):hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((ROOT/'out').rglob('*')) if f.is_file()}
try:
 if not token:raise RuntimeError('No deployment credential configured. Set CLOUDFLARE_API_TOKEN privately in the execution environment.')
 accounts=api('/accounts');bound=os.environ.get('CLOUDFLARE_ACCOUNT_ID')
 account=next((a for a in accounts if a['id']==bound),None) if bound else accounts[0] if len(accounts)==1 else None
 if not account:raise RuntimeError('Select one existing account with CLOUDFLARE_ACCOUNT_ID; do not guess.')
 record['accountId']=account['id'];prefix='/accounts/'+account['id'];subdomain=api(prefix+'/workers/subdomain')['subdomain']
 if subdomain!='eogjs9595':raise RuntimeError('Account workers.dev subdomain does not match the existing target.')
 scripts=api(prefix+'/workers/scripts')
 if not any(s.get('id')=='spring-voice-4bdc' for s in scripts):raise RuntimeError('Existing production Worker not found. Refusing to claim a new Worker updates production.')
 settings=api(prefix+'/workers/scripts/spring-voice-4bdc/settings');record['existingBindings']=[{'name':b.get('name'),'type':b.get('type')} for b in settings.get('bindings',[])]
 record['baselineDeployments']=api(prefix+'/workers/scripts/spring-voice-4bdc/deployments')
 record['preflightPassed']=True
 if args.target!='preflight':
  config='wrangler.ai.staging.jsonc' if args.target=='staging' else 'wrangler.static.jsonc' if args.target=='static' else 'wrangler.json'
  cfg=json.loads((ROOT/config).read_text());record['worker']=cfg['name'];record['url']='https://'+cfg['name']+'.'+subdomain+'.workers.dev/'
  if args.target=='static' and any(b.get('type')=='durable_object_namespace' for b in settings.get('bindings',[])):raise RuntimeError('Static fallback cannot remove an existing production DO binding. Use a compatible runtime rollback.')
  if args.target!='static':
   for name in ['AI_ENABLED','POLICIES_CONFIRMED','OAUTH_REVIEWED','TRANSFER_CONFIRMED','AGE_POLICY_CONFIRMED','RETENTION_CONFIRMED','STORAGE_ENABLED']:
    if cfg['vars'].get(name)!='false':raise RuntimeError('Preparation deployment must keep incomplete feature closed: '+name)
   if cfg['main']!='worker/index.ts':raise RuntimeError('Production must never contain the development entry.')
  current=manifest()
  if not current:raise RuntimeError('Build is missing.')
  if args.target=='production':
   stage=json.loads((out/'staging-public-checks.json').read_text())
   worker_hash=hashlib.sha256((ROOT/'worker-dist/index.js').read_bytes()).hexdigest()
   if not stage.get('passed') or stage.get('assets')!=current or stage.get('workerSHA256')!=worker_hash:raise RuntimeError('Run the real staging checks on this exact build before production.')
  env={**os.environ,'CLOUDFLARE_API_TOKEN':token,'CLOUDFLARE_ACCOUNT_ID':account['id'],'WRANGLER_SEND_METRICS':'false','XDG_CONFIG_HOME':str(ROOT/'.cache/ai-wrangler')}
  cli=(ROOT/'node_modules/.bin/wrangler').resolve()
  command=['node',str(cli),'deploy','--config',config]
  if args.target!='static':
   record['workerSHA256']=hashlib.sha256((ROOT/'worker-dist/index.js').read_bytes()).hexdigest();command+=['--var','RELEASE_ARTIFACT_SHA:'+record['workerSHA256']]
  run=subprocess.run(command,cwd=ROOT,env=env,capture_output=True,text=True)
  log=(run.stdout+'\n'+run.stderr).replace(token,'[REDACTED]');(out/(args.target+'-deploy.log')).write_text(log)
  if run.returncode:raise RuntimeError('Wrangler deploy failed; see redacted '+args.target+'-deploy.log. No plan upgrade or feature opening attempted.')
  record['deployed']=True;record['assets']=current
 print(json.dumps({k:v for k,v in record.items() if k!='assets'},ensure_ascii=False,indent=2))
except Exception as error:
 record['error']=str(error).replace(token,'[REDACTED]') if token else str(error)
 print(json.dumps(record,ensure_ascii=False,indent=2));
finally:
 (out/(args.target+'-deployment.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
if record.get('error'):sys.exit(1)
