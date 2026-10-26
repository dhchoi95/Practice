"""Previous native-PDF regressions plus the reported sentence and complete new domain copy."""
import json,re,runpy
from pathlib import Path
import fitz
runpy.run_path('scripts/verify-copy-cleanup-pdfs.py',run_name='__main__')
root=Path('reports/copy-followup')
norm=lambda s:re.sub(r'\s+','',s)
checks=json.loads(Path('reports/copy-cleanup/pdf-verification.json').read_text())['files']
for name in ['personality-320','personality-390','year-2027','month-2026-10']:
 path=root/'print'/f'{name}.pdf';doc=fitz.open(path);text='\n'.join(p.get_text() for p in doc);n=norm(text)
 assert '\ufffd' not in text
 assert not re.search(r'한달내내같은흐름|한해안에서도시기에따라|하루중에도분위기|있을거입니다|\d+구간|HIDDEN-|LIFE-STAGE-',n),(name,'regressed copy')
 for page in doc:
  assert page.get_text().strip(),(name,'blank page')
  for b in page.get_text('dict')['blocks']:
   for line in b.get('lines',[]):
    for s in line['spans']:
     if s['text'].strip():
      x0,y0,x1,y1=s['bbox'];assert x0>=-1 and y0>=-1 and x1<=page.rect.width+1 and y1<=page.rect.height+1,(name,page.number,s)
 if name.startswith('personality'):
  assert '해보았기에알게된일도있을것입니다.' in n
 else:
  for word in ['총운','학업운','재물운','건강운','연애운','사업운']:assert word in n,(name,word)
  browser=root/('annual-browser-text.json' if name.startswith('year') else 'monthly-browser-text.json')
  for field in json.loads(browser.read_text()):assert norm(field) in n,(name,'incomplete domain text',field)
 checks.append({'path':str(path),'pages':len(doc),'passed':True})
 path.with_suffix('.txt').write_text(text)
(root/'pdf-verification.json').write_text(json.dumps({'passed':True,'actualNativePDFs':len(checks),'files':checks},ensure_ascii=False,indent=2)+'\n')
print(f'PASS {len(checks)} actual native PDFs, including the reported personality sentence and full annual/monthly domains.')
