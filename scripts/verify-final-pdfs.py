"""Read all26 current native browser PDFs; no synthetic renderer or quality score."""
import json,re
from pathlib import Path
import fitz
paths=[Path('reports/foundation-2.1.0/print')/(x+'.pdf') for x in ['day','date','month','year','saju','manse','unknown-hour','unknown-day']]
paths += [Path('reports/integrated-2.0.0/print')/f'advanced-{x}.pdf' for x in ['standard','solar','unknown']]
names=['result-closed','result-open','year-boundary','grammar-copula','grammar-year-trace','editorial-general','editorial-love']+[f'period-{k}-{s}' for k in ['year','month','day'] for s in ['unknown','known']]
paths += [Path('reports/print')/(x+'.pdf') for x in names]
paths += [Path('reports/final-2.3.0/print')/(x+'.pdf') for x in ['new-year-2050','compatibility']]
checks=[]
for path in paths:
 doc=fitz.open(path);text='\n'.join(p.get_text() for p in doc);norm=re.sub(r'\s+','',text)
 assert '\ufffd' not in text and len(doc)>0,(path,'glyph')
 for page in doc:
  assert page.get_text().strip(),(path,'blank page',page.number)
  for block in page.get_text('dict')['blocks']:
   for line in block.get('lines',[]):
    for span in line['spans']:
     if span['text'].strip():
      x0,y0,x1,y1=span['bbox'];assert x0>=-1 and y0>=-1 and x1<=page.rect.width+1 and y1<=page.rect.height+1,(path,page.number,span)
 for s in ['내사주원국','시주','일주','월주','년주','지장간','12운성']:assert s in norm,(path,s)
 if path.stem=='new-year-2050':
  for s in ['2050년신년운세','한국음력','총운','학업운','재물운','건강운','연애운','사업운']:assert s in norm,(path,s)
 if path.stem=='compatibility':
  for s in ['A·첫번째사람','B·두번째사람','서로의일간에서읽는관계','두원국사이의합·충관계']:assert s in norm,(path,s)
 assert '이운세메뉴공유하기' not in norm
 checks.append({'path':str(path),'pages':len(doc),'passed':True})
Path('reports/final-2.3.0/pdf-all-verification.json').write_text(json.dumps({'passed':True,'actualNativePDFs':len(checks),'files':checks},ensure_ascii=False,indent=2)+'\n')
print('PASS26 native PDFs: required tables, unknown scope, no blank pages, no out-of-page text, no missing glyphs; specialized audits cover exact body and interval checks.')
