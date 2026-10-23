"""Run audit-iteration-pdfs.ts first; check actual native PDFs against the shared visible plan."""
import json,re
from pathlib import Path
import fitz
norm=lambda s:re.sub(r'\s+','',s)
checks=[]
for row in json.loads(Path('reports/iteration-2.2.0/pdf-expected.json').read_text()):
 doc=fitz.open('reports/foundation-2.1.0/print/'+row['name']+'.pdf')
 text=norm(''.join(p.get_text() for p in doc))
 missing=[p for p in row['paragraphs'] if norm(p['text']) not in text]
 titles=[t for t in row['contributionTitles'] if norm(t) not in text]
 checks.append({'name':row['name'],'paragraphs':len(row['paragraphs']),'contributionTitles':len(row['contributionTitles']),'missing':missing,'missingTitles':titles})
 assert not missing and not titles,(row['name'],missing,titles)
Path('reports/iteration-2.2.0/pdf-body-verification.json').write_text(json.dumps({'passed':True,'checks':checks},ensure_ascii=False,indent=2)+'\n')
print('PASS four native PDFs: all default paragraphs and score-driving titles present')
