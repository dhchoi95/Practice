"""Compare exact visible prose across distinct synthetic natal charts. No dates/IDs added to prose."""
import json,gzip,itertools
from pathlib import Path
root=Path('reports/iteration-2.2.0');result={}
def match(test,facts):
 v=facts.get(test['path']);x=test['value']
 if v is None:return False
 return v==x if test['op']=='eq' else isinstance(v,(int,float)) and not isinstance(v,bool) and v>=x if test['op']=='gte' else v in x
for phase in ['before','after']:
 s=json.loads((root/phase/'summary.json').read_text());data=json.loads(gzip.decompress((root/phase/'all-results.json.gz').read_bytes()));profiles={p['profile']:p for p in s['profiles']};runs={(r['profile'],r['kind'],r['target']):r for r in data['runs']};rows=[]
 for cohort in ['fixed','additional']:
  ps=[p for p in s['profiles'] if p['cohort']==cohort and p['dayMaster']]
  for a,b in itertools.combinations(ps,2):
   if a['dayMaster']['stem']!=b['dayMaster']['stem']:continue
   for domain in ['overall','study','money','health','love','business']:
    count=0;example=None
    for day in range(365):
     from datetime import date,timedelta
     target=str(date(2026,1,1)+timedelta(days=day));ra=runs[(a['profile'],'day',target)];rb=runs[(b['profile'],'day',target)];sa=[x['hash'] for x in ra['visible'][domain]];sb=[x['hash'] for x in rb['visible'][domain]]
     if sa==sb:
      count+=1
      if example is None:example={'target':target,'displayedIdsA':[x['id'] for x in ra['visible'][domain]],'displayedIdsB':[x['id'] for x in rb['visible'][domain]],'factsDifferent':{k:[v,rb['segments'][0]['facts'].get(k)] for k,v in ra['segments'][0]['facts'].items() if v!=rb['segments'][0]['facts'].get(k)},'reason':'같은 일간·기간과 선택 조건에서 동일 원고 조합. 다른 원국 사실이 선택 조건에 없거나 같은 조건 구간에 해당할 수 있음; 명리 동등성 판정은 아님'}
    rows.append({'cohort':cohort,'profiles':[a['profile'],b['profile']],'domain':domain,'exactSameBodyDays':count,'comparisons':365,'example':example})
 records={r['id']:r for r in data['records'] if 'unit'in r};eligible={id:0 for id in records};selected={id:0 for id in records}
 buckets={}
 for r in records.values():buckets.setdefault((r['unit'],r['domain']),[]).append(r)
 for run in data['runs']:
  for seg in run['segments']:
   facts=seg['facts']
   for d,judgment in seg['sectors'].items():
    for id in judgment['ids']:selected[id]+=1
    for r in buckets[(run['kind'],d)]:
     c=r['requires']
     if all(match(t,facts) for t in c['all']) and (not c.get('any') or any(match(t,facts) for t in c['any'])) and not any(match(t,facts) for t in r['exclusions']):eligible[r['id']]+=1
 result[phase]={'sameDayMasterCrossNatal':rows,'neverSelected':[{'id':id,'eligibleSegments':eligible[id],'status':'eligible-but-outranked-or-incompatible' if eligible[id] else 'no-matching-sample-not-proof-of-impossibility'} for id,n in selected.items() if not n],'eligibleVsSelected':[{'id':id,'eligible':eligible[id],'selected':n} for id,n in selected.items()]}
(root/'collisions-and-dominance.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print('PASS same-day-master cross-natal comparisons and eligible/selected occupancy written separately for before and after')
