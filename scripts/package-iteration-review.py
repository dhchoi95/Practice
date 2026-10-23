"""Package the committed source separately from bulky local execution evidence."""
import hashlib,json,os,subprocess,zipfile
from pathlib import Path
repo=Path.cwd();out=repo.parent/'saju-iteration-2.2.0-delivery';out.mkdir(exist_ok=True)
commit=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();root=repo/'reports/iteration-2.2.0'
start='''# 2.2.0 검토 시작\n\n이 묶음은 실행 가능한 소스와 실제 원고를 포함해요. `project/docs/iteration-2.2.0.md`를 먼저 읽어 주세요. 새72개 질문·216개 기간 원고는 실제 선택 사례가 있지만 독립 편집·명리 승인은 대기 중이에요. 10일 반복 증가를 개선 완료로 판단하지 말아 주세요.\n\n## 검토 순서\n\n1. 변경 보고서, 첨부 지시문, content-backlog.json을 대조하세요.\n2. sectors.json의 질문·전제·반대 설명과 대표 전체 출력을 함께 읽으세요.\n3. 비교 결과에서 고정 집단과 추가 집단, 별도 도달성 탐색을 구분하세요.\n4. 총운·재물의 반복 증가와 기존 중심/새 보완의 의미 중복을 우선 검토하세요.\n5. 필요하면 큰 증거 ZIP의 장기 출력·실제 PDF·캡처를 받아 확인하세요. 작은 ZIP에 없는 화면 전체를 검토했다고 하지 말아 주세요.\n\n실행: Node24에서 project로 이동해 npm ci, npm run verify, npm run build, npm run test:e2e 순서예요. npm ci는 전달받은 검토자가 새로 실행하는 명령이며 구현자가 이번 차수에서 새로 실행했다는 뜻은 아니에요. Chromium과 PDF 검사에는 별도 PyMuPDF가 필요해요.\n\n큰 ZIP의 reports/는 project/reports/로 옮기면 장기 비교 스크립트의 기록을 재현·대조할 수 있어요. 현재 코드로 --before를 실행해 기준을 덮어쓰지 마세요. baseline-2.1.0.zip은 별도 기준 소스예요.\n\n독립 검토 모델에는 작은 ZIP과 ‘실행 여부를 구분하고, 실제 원고·조건·완성 본문을 대조해 남은 문제를 근거와 함께 알려줘. 코드를 수정하거나 배포하지 마.’라는 요청을 함께 전달하면 돼요. 원격 push·공개 배포는 하지 않았어요.\n'''
(out/'START_HERE.md').write_text(start+f'\n소스 커밋: {commit}\n')
subprocess.run(['git','archive','--format=zip','--prefix=project/',f'--output={out}/source.zip',commit],check=True)
small=repo.parent/'saju-2.2-review.zip';large=repo.parent/'saju-2.2-evidence.zip'
def add(z,p,name):
 z.write(p,name)
core_logs=['verify.log','lint-final.log','typecheck-final.log','build.log','browser.log','browser-reasons.log','browser-print-rerun.log','browser-legacy-print-rerun.log','pdf-foundation.log','pdf-advanced.log','pdf-legacy.log','pdf-body.log','witness.log','report.log','validation-summary.json','comparison.json','comparison.md','collisions-and-dominance.json','pdf-body-verification.json']
with zipfile.ZipFile(small,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 with zipfile.ZipFile(out/'source.zip') as source:
  for entry in source.infolist():z.writestr(entry,source.read(entry))
 add(z,out/'START_HERE.md','START_HERE.md')
 for name in core_logs:add(z,root/name,'core-evidence/'+name)
 for phase in ['before','after']:add(z,root/phase/'summary.json',f'core-evidence/{phase}/summary.json')
 add(z,root/'after/new-meaning-witnesses.json','core-evidence/after/new-meaning-witnesses.json')
 for p in (root/'current/examples').glob('*.md'):add(z,p,'complete-examples/'+p.name)
 for p in (root/'after/examples').glob('extra-00-*.md'):add(z,p,'additional-complete-examples/'+p.name)
with zipfile.ZipFile(large,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 add(z,out/'START_HERE.md','START_HERE.md')
 for path in root.rglob('*'):
  if path.is_file():add(z,path,str(path.relative_to(repo)))
 for directory in ['foundation-2.1.0','print','integrated-2.0.0/print','integrated-2.0.0/screenshots','integrated-2.0.0/skill-reference']:
  for path in (repo/'reports'/directory).rglob('*'):
   if path.is_file():add(z,path,str(path.relative_to(repo)))
 for name in ['print-verification.json']:
  p=repo/'reports'/name
  if p.exists():add(z,p,str(p.relative_to(repo)))
 add(z,repo.parent/'saju-baseline-2.1.0.zip','baseline-2.1.0.zip')
manifest={'commit':commit,'archives':[]}
for p in [small,large]:
 os.chmod(p,0o644)
 with zipfile.ZipFile(p) as z:
  assert z.testzip() is None
  assert not any(n.startswith('/') or '..' in Path(n).parts for n in z.namelist())
  count=len(z.namelist())
 manifest['archives'].append({'file':p.name,'bytes':p.stat().st_size,'MiB':round(p.stat().st_size/1024**2,2),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'entries':count,'CRC':'passed'})
(out/'downloads.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
(out/'source.zip').unlink()
print(json.dumps(manifest,ensure_ascii=False,indent=2))
