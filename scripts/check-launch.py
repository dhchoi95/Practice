"""Audit actual static output, without sending any private input or calling external services."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit
import json,struct
ROOT=Path('out');ORIGIN='https://spring-voice-4bdc.eogjs9595.workers.dev'
class Document(HTMLParser):
 def __init__(self,text):
  super().__init__();self.meta={};self.canonical=[];self.scripts=[];self.links=[];self.images=[];self.ids=set();self.title='';self.ld=[];self.in_title=False;self.in_ld=False;self.buffer='';self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  if tag=='meta':self.meta[a.get('name',a.get('property',''))]=a.get('content','')
  if tag=='link' and a.get('rel')=='canonical':self.canonical.append(a.get('href'))
  if tag=='a' and 'href' in a:self.links.append(a['href'])
  if tag=='img':self.images.append(a)
  if tag=='script':
   if 'src' in a:self.scripts.append(a['src'])
   self.in_ld=a.get('type')=='application/ld+json';self.buffer=''
  if tag=='title':self.in_title=True
 def handle_data(self,data):
  if self.in_title:self.title+=data
  if self.in_ld:self.buffer+=data
 def handle_endtag(self,tag):
  if tag=='title':self.in_title=False
  if tag=='script' and self.in_ld:self.ld.append(json.loads(self.buffer));self.in_ld=False

docs={}
for file in ROOT.rglob('*.html'):
 rel=str(file.relative_to(ROOT));path='/'+rel.removesuffix('index.html') if rel.endswith('index.html') else '/'+rel
 docs[path]=Document(file.read_text())
public=[p for p in docs if p=='/' or (p.startswith('/fortune/') and p!='/fortune/blood-type/') or p in ['/guide/','/glossary/','/privacy/','/terms/','/credits/']]
titles=set()
for path in public:
 d=docs[path];assert d.title and d.title not in titles,(path,'missing/duplicate title');titles.add(d.title)
 assert d.meta.get('description'),(path,'description')
 assert d.canonical==[ORIGIN+path],(path,d.canonical)
 assert d.meta.get('og:url')==ORIGIN+path,(path,'OG URL')
 assert d.meta.get('og:image')==ORIGIN+'/og.png' and d.meta.get('og:image:type')=='image/png',(path,'OG image')
 assert d.meta.get('og:image:width')=='1200' and d.meta.get('og:image:height')=='630',(path,'OG dimensions')
 assert d.meta.get('twitter:card')=='summary_large_image' and d.meta.get('twitter:image')==ORIGIN+'/og.png'
 assert d.meta.get('og:description')==d.meta['description']
 assert any(x.get('@type')=='WebSite' and x.get('url')==ORIGIN+'/' and x.get('name')=='하루사주' for x in d.ld)
 if path!='/':
  crumbs=[x for x in d.ld if x.get('@type')=='BreadcrumbList'];assert len(crumbs)==1
  assert crumbs[0]['itemListElement'][-1]['item']==ORIGIN+path
for path,d in docs.items():
 if path.startswith('/result/') or path in ['/ai-saju/','/fortune/blood-type/']:
  assert 'noindex' in d.meta.get('robots',''),(path,'private index')
  assert not d.canonical,(path,'private canonical')
 assert all(not s.startswith(('http:','https:','//')) for s in d.scripts),(path,'external script')
 assert all('alt' in img for img in d.images),(path,'missing alt')
 for href in d.links:
  if not href.startswith('/') or href.startswith('//'):continue
  u=urlsplit(href)
  if u.path in docs:
   if u.fragment:assert u.fragment in docs[u.path].ids,(path,'broken static anchor',href)
  else:assert (ROOT/u.path.lstrip('/')).is_file(),(path,'broken internal link',href)
robots=(ROOT/'robots.txt').read_text();assert 'Disallow: /result/' not in robots and 'Disallow: /ai-saju/' not in robots
assert 'Disallow: /api/' in robots and 'Disallow: /auth/' in robots
sitemap=(ROOT/'sitemap.xml').read_text();assert all(ORIGIN+p in sitemap for p in public)
assert not any(p in sitemap for p in ['/result/','/ai-saju/','/auth/','/api/','blood-type'])
png=(ROOT/'og.png').read_bytes();assert png[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',png[16:24])==(1200,630)
report={'passed':True,'scope':'actual local static export; public hosting not substituted','publicPages':len(public),'staticHTMLFiles':len(docs),'uniqueTitles':len(titles),'canonicalOrigin':ORIGIN,'noExternalScripts':True,'robotsNoindexReadable':True,'allInternalStaticLinksAndAnchors':True,'ogPNG':{'width':1200,'height':630},'brand':'하루사주','sensitiveDataAdded':False}
Path('reports/launch-2.5.1').mkdir(parents=True,exist_ok=True);Path('reports/launch-2.5.1/static-audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps(report,ensure_ascii=False,indent=2))
