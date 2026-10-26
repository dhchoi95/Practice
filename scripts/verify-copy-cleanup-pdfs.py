"""Inspect native Chromium PDFs from the current copy-cleanup browser run."""
import json,re
from pathlib import Path
import fitz
norm=lambda s:re.sub(r'\s+','',s)
root=Path('reports/copy-cleanup')
paths=[Path('reports/foundation-2.1.0/print')/(x+'.pdf') for x in ['day','date','month','year','saju','manse','unknown-hour','unknown-day']]
paths += [Path('reports/integrated-2.0.0/print')/f'advanced-{x}.pdf' for x in ['standard','unknown']]
names=['result-closed','result-open','year-boundary','grammar-copula','grammar-year-trace','editorial-general','editorial-love']+[f'period-{k}-{s}' for k in ['year','month','day'] for s in ['unknown','known']]
paths += [Path('reports/print')/(x+'.pdf') for x in names]
paths += [Path('reports/final-2.3.0/print')/(x+'.pdf') for x in ['new-year-2050','compatibility']]
paths += [root/'print'/f'{slug}.pdf' for slug in ['saju','day','tomorrow','date','month','year','manse','love','relationships','career-money']]
checks=[]
for path in paths:
 doc=fitz.open(path);text='\n'.join(p.get_text() for p in doc);n=norm(text)
 assert '\ufffd' not in text and len(doc)>0,(path,'glyph')
 assert not re.search(r'HIDDEN-|LIFE-STAGE-|원전검토|채택표|검증한표|풀이이유|\d+구간|제안·|시간보정·계산기준|지방평균태양시|진태양시',n),(path,'removed public diagnostics')
 assert '이운세메뉴공유하기' not in n,(path,'print-only controls')
 for page in doc:
  assert page.get_text().strip(),(path,'blank page',page.number)
  for block in page.get_text('dict')['blocks']:
   for line in block.get('lines',[]):
    for span in line['spans']:
     if span['text'].strip():
      x0,y0,x1,y1=span['bbox'];assert x0>=-1 and y0>=-1 and x1<=page.rect.width+1 and y1<=page.rect.height+1,(path,page.number,span)
 for s in ['내사주원국','시주','일주','월주','년주','지장간','12운성']:assert s in n,(path,s)
 expected=path.with_name(path.stem+'-expected.json')
 exact=0
 if expected.exists():
  for paragraph in json.loads(expected.read_text()):
   assert norm(paragraph) in n,(path,'missing assembled paragraph',paragraph)
   exact+=1
 if path.stem in ['day','tomorrow','date','month','year','saju','new-year-2050'] or path.stem.startswith('period-'):
  for s in ['총운','학업운','재물운','건강운','연애운','사업운']:assert s in n,(path,s)
 if path.stem in ['unknown-day','period-day-unknown','period-month-unknown','period-year-unknown']:
  for s in ['산출보류','일간이미확정']:assert s in n,(path,s)
 if path.parent==root/'print' and path.stem in ['day','date','year','manse','saju']:
  # The first table is the natal chart, including the known 15:03 standard-time hour.
  first=text.split('만세력 풀이 보기')[0]
  stems=re.findall(r'(?m)^[甲乙丙丁戊己庚辛壬癸]$',first)
  branches=re.findall(r'(?m)^[子丑寅卯辰巳午未申酉戌亥]$',first)
  assert stems[:4]==['庚','癸','丁','乙'],(path,stems[:4])
  assert branches[:4]==['申','卯','亥','亥'],(path,branches[:4])
 if path.stem=='compatibility':
  for s in ['A·첫번째사람','B·두번째사람','서로의일간에서읽는관계']:assert s in n,(path,s)
 checks.append({'path':str(path),'pages':len(doc),'characters':len(text),'exactAssembledParagraphs':exact,'passed':True})
 if path.parent==root/'print':path.with_suffix('.txt').write_text(text)
(root/'pdf-verification.json').write_text(json.dumps({'passed':True,'actualNativePDFs':len(checks),'files':checks},ensure_ascii=False,indent=2)+'\n')
print(f'PASS {len(checks)} native PDFs: natal chart, exact assembled bodies, removed diagnostics absent, bounds, glyphs and no blank pages.')
