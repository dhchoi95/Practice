"""Read current native Chromium PDFs; no synthetic PDF renderer or self-rating."""
import json,re
from pathlib import Path
import fitz
root=Path('reports/integrated-2.0.0')
def norm(s):return re.sub(r'\s+','',s)
results={}
for kind in ['standard','solar','unknown']:
 path=root/'print'/f'advanced-{kind}.pdf';doc=fitz.open(path);text='\n'.join(page.get_text() for page in doc);n=norm(text)
 assert len(doc)>0 and '\ufffd' not in text
 for p in doc:
  assert p.get_text().strip(),f'Blank page: {kind} {p.number}'
  for block in p.get_text('dict')['blocks']:
   for line in block.get('lines',[]):
    for span in line['spans']:
     if span['text'].strip():
      x0,y0,x1,y1=span['bbox'];assert x0>=-1 and y0>=-1 and x1<=p.rect.width+1 and y1<=p.rect.height+1,(kind,p.number,span)
 required=['내 사주 자세히 보기','요청한 시각 기준','원국과 지장간·십신','십신별 역할과 실제 위치','대운 개시 계산','선택 연도부터 최대 5년','2026년','2030년','종합 풀이','출처와 판단의 범위','2.3.0']
 if kind=='unknown':
  required+=['일주 미확정','강약 미확정','격국 미확정','대운 개시일을 정하지 않았어요']
  assert '1995-12-20' not in text and '신강 경향' not in text
 else:
  required+=['1995-12-20 21:53','2035-12-20 21:53','10대운','억부','조후','이미 표시한 같은 설명']
  before_comparison=text.split('표준시와 진태양시에서 달라지는 점')[0]
  chart=text.split('내 사주 원국')[1].split('만세력 풀이 보기')[0]
  if kind=='solar':required+=['1995-11-08 14:47','중화·경계','편관'];assert re.findall(r'(?m)^[甲乙丙丁戊己庚辛壬癸]$',chart)[:4]==['己','癸','丁','乙'];assert re.findall(r'(?m)^[子丑寅卯辰巳午未申酉戌亥]$',chart)[:4]==['未','卯','亥','亥']
  else:required+=['1995-11-08 15:03','신강 경향','정인'];assert re.findall(r'(?m)^[甲乙丙丁戊己庚辛壬癸]$',chart)[:4]==['庚','癸','丁','乙'];assert re.findall(r'(?m)^[子丑寅卯辰巳午未申酉戌亥]$',chart)[:4]==['申','卯','亥','亥']
  data=json.loads((root/f'example-suwon-{"true-solar" if kind=="solar" else "standard"}.json').read_text())
  # Same period paragraph is printed once; later segments/years use explicit references.
  bodies={r['id']:r['text'] for period in data['years'] for segment in period['segments'] for r in segment['selection']['applied']}
  for rid,body in bodies.items():assert norm(before_comparison).count(norm(body))==1,(kind,rid,'missing or repeated narrative')
 for s in required:assert norm(s) in n,(kind,s)
 assert '섬세한기준을나에게도다정하게' not in n
 assert not any(t in text for t in ['natal-god-','period-god-','pilot-love-'])
 path.with_suffix('.txt').write_text(text)
 results[kind]={'pages':len(doc),'characters':len(text),'requiredText':required,'outOfPageText':0,'periodParagraphsPrintedOnce':kind!='unknown'}
(root/'advanced-pdf-verification.json').write_text(json.dumps({'passed':True,'method':'PyMuPDF extraction of actual Chromium PDFs; text/bounds/unknown scope/cross-year deduplication','files':results},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(results,ensure_ascii=False,indent=2))
