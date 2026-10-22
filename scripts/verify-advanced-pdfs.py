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
 required=['서비스 해석 후보','요청한 시각 기준','원국과 지장간·십신','십신별 역할과 실제 위치','대운 개시 계산','선택 연도부터 5년','2026년','2030년','전체 흐름을 연결해 읽기','출처와 판단의 범위','2.0.0']
 if kind=='unknown':
  required+=['일주 미확정','강약 미확정','격국 미확정','대운 개시일을 정하지 않았어요']
  assert '1995-12-20' not in text and '신강 경향' not in text
 else:
  required+=['1995-12-20 21:53','2035-12-20 21:53','10대운','억부','조후','이미 표시한 같은 설명']
  before_comparison=text.split('표준시와 진태양시에서 달라지는 점')[0]
  chart=text.split('원국과 지장간·십신')[1].split('십신별 역할')[0]
  if kind=='solar':required+=['1995-11-08 14:47','중화·경계','지지 음 · 토 · 본기 편관'];assert '기미(己未)' in chart and '경신(庚申)' not in chart
  else:required+=['1995-11-08 15:03','신강 경향','지지 양 · 금 · 본기 정인'];assert '경신(庚申)' in chart and '기미(己未)' not in chart
  data=json.loads((root/f'example-suwon-{"true-solar" if kind=="solar" else "standard"}.json').read_text())
  # Same period paragraph is printed once; later segments/years use explicit references.
  bodies={r['id']:r['text'] for period in [data['selectedPeriod'],*data['years']] for segment in period['segments'] for r in segment['selection']['applied']}
  for rid,body in bodies.items():assert norm(before_comparison).count(norm(body))==1,(kind,rid,'missing or repeated narrative')
 for s in required:assert norm(s) in n,(kind,s)
 assert '섬세한기준을나에게도다정하게' not in n
 assert not any(t in text for t in ['natal-god-','period-god-','pilot-love-'])
 path.with_suffix('.txt').write_text(text)
 results[kind]={'pages':len(doc),'characters':len(text),'requiredText':required,'outOfPageText':0,'periodParagraphsPrintedOnce':kind!='unknown'}
(root/'advanced-pdf-verification.json').write_text(json.dumps({'passed':True,'method':'PyMuPDF extraction of actual Chromium PDFs; text/bounds/unknown scope/cross-year deduplication','files':results},ensure_ascii=False,indent=2)+'\n')
print(json.dumps(results,ensure_ascii=False,indent=2))
