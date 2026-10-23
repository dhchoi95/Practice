"""Audit actual Chromium output: natal coordinates, chart vector, all six bodies, trace absence, bounds and disclosure restoration are separate checks."""
from pathlib import Path
import json,re
import fitz
root=Path('reports/foundation-2.1.0');checks={}
norm=lambda s:re.sub(r'\s+','',s)
for name in ['day','date','month','year','saju','manse','unknown-hour','unknown-day']:
 path=root/'print'/f'{name}.pdf';doc=fitz.open(path);text='\n'.join(p.get_text() for p in doc);n=norm(text)
 assert len(doc)>0 and '\ufffd' not in text
 for page in doc:
  assert page.get_text().strip(),(name,'blank page',page.number)
  for block in page.get_text('dict')['blocks']:
   for line in block.get('lines',[]):
    for s in line['spans']:
     if s['text'].strip():
      x0,y0,x1,y1=s['bbox'];assert x0>=-1 and y0>=-1 and x1<=page.rect.width+1 and y1<=page.rect.height+1,(name,page.number,s)
 required=['내 사주 원국','시주','일주','월주','년주','십신','지장간','만세력 풀이 보기']
 if name not in ['saju','manse']:
  required+=['여섯 분야 한눈에 보기','총운','학업운','재물운','건강운','연애운','사업운','참고 지수는 어떻게 읽나요','시간 보정·계산 기준']
  assert '판단·지수·원고연결기록' not in n and '"recordId"' not in text
  if name!='unknown-day':
   assert sum(len(p.get_drawings()) for p in doc)>10,(name,'vector chart missing')
   data_name='unknown' if name=='unknown-day' else name
  else: required+=['산출 보류','일간이 미확정'];assert '일간·나' not in n
 if name=='date':required+=['2026년 10월 24일','면접','준비 상태와 회사 안내']
 if name=='year':required+=['2027-01-01 00:00','실제 구간 길이']
 if name=='month':required+=['2026년 10월','절입']
 if name=='unknown-hour':required+=['시간 모름','시주는 제외하고']
 if name=='saju':required+=['강약·격국·용신','대운 개시 계산','선택 연도부터 5년','전체 흐름을 연결해 읽기']
 if name=='manse':required+=['원국 관계와 오행 확인','대운 개시와 10년 구간'];assert '구성에서이어지는주제풀이' not in n
 for s in required:assert norm(s) in n,(name,s)
 for s in ['섬세한기준을나에게도다정하게','이운세메뉴공유하기','출생정보를서버로전송']:assert s not in n,(name,s)
 # Read the first table, not a comparison or target chart later in the PDF.
 first=text.split('만세력 풀이 보기')[0];chars=[w[4] for p in doc for w in p.get_text('words') if w[4] in ['己','癸','丁','乙','未','卯','亥']]
 if name in ['day','date','month','year','saju','manse']:
  first_stems=re.findall(r'(?m)^[甲乙丙丁戊己庚辛壬癸]$',first);first_branches=re.findall(r'(?m)^[子丑寅卯辰巳午未申酉戌亥]$',first)
  assert first_stems[:4]==['己','癸','丁','乙'],(name,first_stems)
  assert first_branches[:4]==['未','卯','亥','亥'],(name,first_branches)
 checks[name]={'pages':len(doc),'characters':len(text),'required':required,'outOfPageText':0,'firstNatalColumns':'hour/day/month/year','actualChromiumPDF':True}
 path.with_suffix('.txt').write_text(text)
(root/'pdf-verification.json').write_text(json.dumps({'passed':True,'files':checks},ensure_ascii=False,indent=2)+'\n');print(json.dumps({'passed':True,'files':checks},ensure_ascii=False,indent=2))
