# 하루사주

이 브랜치는 **하루사주 사이트 전용**입니다. `Practice` 저장소의 식당 관리 앱은 아래의 별도 브랜치에서 관리합니다.

| 앱 | GitHub 브랜치 | 실행·배포 구조 |
| --- | --- | --- |
| 하루사주 | [codex/saju-korean-editing-1.4.0](https://github.com/dhchoi95/Practice/tree/codex/saju-korean-editing-1.4.0) | 정적 사이트, 빌드 결과 `out/`, DB 불필요 |
| 식당 관리 · restaurant-ops | [codex/burger-manager-pc](https://github.com/dhchoi95/Practice/tree/codex/burger-manager-pc) | Next.js 서버, Prisma·PostgreSQL |

두 앱은 같은 저장소 안의 **서로 다른 브랜치와 Git 이력**에 있습니다. 사주 브랜치에 식당 앱의 폴더가 들어 있는 구조가 아닙니다. 각 호스팅 프로젝트의 배포 브랜치도 위 표에 맞게 따로 지정해야 합니다. 서로 다른 앱의 브랜치를 병합하지 마세요. GitHub 저장소 자체까지 분리한 상태는 아닙니다.

가입·결제·실행 중 AI 호출 없이 사용하는 한국어 무료 사주·운세 사이트입니다. Next.js 정적 HTML과 브라우저 계산으로 동작합니다. 출생정보는 브라우저 메모리에만 두며 새로고침하면 사라집니다.

현재 차수 **2.2.0**은 새 해석 질문72개와 실제 선택 조건·본문 조립을 보강했습니다. [이번 차수 결과·남은 반복](docs/iteration-2.2.0.md)을 확인하세요. 공개 배포·원격 push는 하지 않았습니다.

기존 작업본은 1.4.0 한국어 교정·2.0.0 상세 계산을 유지하고, 2.1.0의 상단 원국·여섯 분야·지정일·독립 만세력을 추가했습니다. [2.1.0 결과와 정책](docs/foundation-2.1.0.md)을 확인하세요. 기존 1.4.0 작업에서는 korean-skills의 실제 지침을 순서대로 적용하고, 정상 원고210개 중196개에서 필요한 필드를 고쳤으며14개는 유지했습니다. 제목뿐 아니라 본문·생활 제안·근거와 입력·공유·홈 안내도 검토했습니다. [교정 결과](docs/content-improvement-1.4.0.md), [현재 문체 기준](docs/korean-style-guide-1.4.0.md), [검토 이력](docs/review-history-1.3.0.md), [반복 개선 방법](docs/content-improvement-method.md)을 확인하세요. 독립 의미 검토는 대기이며 복합 초안4개는 일반 빌드에서 제외합니다.

## 처음 실행하기

Node.js **24.19.0**으로 검증했습니다. nvm을 사용하면 저장소에서 `nvm install && nvm use`로 `.nvmrc` 버전을 선택하세요.

터미널에서 아래 순서대로 실행합니다.

```bash
cd /workspace/Practice
npm ci
npm run dev
```

개발 서버는 포트 3000에서 열립니다. 실행 중 터미널은 유지하고, 종료하려면 Ctrl+C를 누릅니다. 다른 위치에 내려받았다면 첫 줄을 실제 프로젝트 경로로 바꾸세요. `.npmrc`는 npm 캐시를 프로젝트의 무시된 `.cache/npm`에 두므로 사용자 홈에 쓰기 권한이 없어도 설치할 수 있습니다.

## 실제 제공 범위

- 정통사주·독립 만세력·성격·연애·직업재물·대인관계·솔로·마음돌봄, 오늘·내일·지정일·이번 달·올해의 여섯 분야 운세.
- 한국 음력·윤달 검증과 변환, 입춘 연주·절입 월주·자정 일주·표준시 시주, 기본 십성·오행 단순 개수.
- 띠 12종·별자리 12종·혈액형 4종 직접 선택과 별도 읽을거리.
- 조건·문장·버전이 함께 있는 **210개 조건별 원고**, 별도 공통 오행 설명 5개·근거 정의 25개와 교체 가능한 저장소 인터페이스.
- 개인정보 없는 일반 메뉴 링크 공유, 복사 대안, 브라우저 인쇄, 오류·빈 상태·404, 안내 페이지.

출생 범위는 변환한 **양력 1962-01-01부터 한국시간 오늘**입니다. 기간 운세는 2050년까지입니다. 한국 출생만 지원합니다. 정확 계산은 1987·1988년 서머타임을 표준시로 환산하며 중복·존재하지 않는 시각은 거부합니다. 시간 미상에서는 불확정 기둥과 그에 의존하는 풀이를 제외합니다.

상세 분석에서 국내 도시·태양시, 지장간·합충 후보, 강약·격국·억부·조후 후보, 대운 10개·5년 세운을 제공합니다. 해외 출생·합화 확정·특수격·결과 이미지 저장은 지원하지 않습니다. 계산과 고급 해석의 검토 상태는 다르며 미래 예측 능력을 입증한 서비스가 아닙니다. 정책은 [통합 정책](docs/integrated-policy-2.0.0.md), 결과와 제한은 [통합 개선](docs/integrated-upgrade-2.0.0.md)을 확인합니다. MBTI는 직접 선택하는 16유형×6주제 읽을거리입니다.

## 검증 명령

```bash
npm run verify
npm run content:validate
npm run content:preview
npm run content:evaluate
npm run build
npm run test:e2e
```

`verify`는 lint → TypeScript → 단위·통합 검사 → 원고 중복·표현 검사 → 합성 프로필 coverage → 고정 평가 사례 → 출처·검토 이력 → 전체 결과 → 별도 복합 시범 → 한국어 편집 이력 순서입니다. `build`가 먼저 성공해야 E2E가 실제 `out/` 정적 파일을 검사할 수 있습니다. 이 클라우드에는 `/usr/bin/chromium`이 있습니다. 다른 기기에서 브라우저가 없다면 다음을 한 번 실행하세요.

```bash
npx playwright install chromium
```

Playwright는 시스템 Chromium이 있으면 사용하고, 없으면 설치한 브라우저를 사용합니다. 별도 경로는 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`로 지정할 수 있습니다. 실행 결과는 `playwright-report/`, 실패 추적은 `test-results/`, 화면과 원고 검토 자료는 `reports/`에 생깁니다. 이 폴더에는 합성 입력만 사용합니다.

E2E는 닫힌/열린 상세와 연·월·일의 일간 확정/미확정을 포함한 실제 PDF 13개를 `reports/print/`에 만듭니다. PyMuPDF가 있는 검토 환경에서는 `python3 scripts/verify-print-pdfs.py`로 표·계산 기준의 PDF 텍스트 포함과 두 출력의 동일성을 추가 검사합니다. 기간 상세에는 실제로 제공한 관계 해석만 안내하는지도 검사하고, 교정 문장·기간 근거와 새 종합/연애 본문도 PDF에서 확인합니다. 앱 실행에는 Python이 필요하지 않습니다. `tsx` CLI의 IPC 권한 오류가 나는 환경에서는 콘텐츠 명령을 `node --import tsx scripts/content-tools.ts lint`처럼 실행할 수 있습니다.

## 운영용 정적 파일 만들기

```bash
npm run build
npm start
```

`out/` 전체가 배포 산출물입니다. `npm start`는 이를 포트 3000에서 제공하는 로컬 확인용 서버입니다. API 서버나 DB, 비밀키는 필요하지 않습니다. 내부 경로의 `index.html`과 실제 404를 처리하는 정적 호스팅 설정을 사용하세요. `npm run dev`로 확인하는 것과 정적 빌드 테스트는 별개입니다.

## 문서 찾기

- [구현 계획](docs/implementation-plan.md), [완료 체크리스트](docs/acceptance-checklist.md)
- [계산 정책](docs/calculation-policy.md), [검증 출처](docs/verification-sources.md), [검증 결과](docs/verification-report.md)
- [구조와 데이터 흐름](docs/architecture.md), [문장 수정 방법](docs/content-authoring.md)
- [디자인 가이드](docs/design-guide.md), [배포 방법](docs/deployment.md), [지원 제한](docs/limitations.md)
- [오픈소스 고지](THIRD_PARTY_NOTICES.md)
- [1.0.2 재검토 지적 수정 대응](docs/review-response-1.0.2.md), [접수한 1.0.1 재검토 보고서](docs/external-rereview-1.0.1.md)
- [1.0.1 수정 대응](docs/review-response-1.0.1.md), [최초 검토 보고서](docs/external-review-1.0.0.md)

서비스명은 `src/config/site.ts`, 디자인은 `src/styles/tokens.css`, 원고는 `src/content/rules.json`에서 바꿉니다. 운영 전 실제 서비스명·도메인·연락처·호스팅 로그 정책을 확인하고 개인정보 안내를 갱신하세요. 실기기 인스타그램 브라우저 확인과 독립 명리 원고 검토는 별도로 필요합니다. 정적 빌드와 GitHub 푸시, 호스팅 반영 확인은 각각 구별해 기록합니다.

## 상세 분석 2.0.0

출생정보에서 상세 분석을 선택하거나 간단 결과의 상세 분석 보기를 누릅니다. 국내 도시·표준/태양시와 대운 분류를 선택하고 정책별 원국, 후보 판단, 대운 10개, 5년 세운을 비교할 수 있습니다. MBTI는 전체 메뉴와 홈 추천에서 직접 선택합니다.

고급 원고 62개, 새 기간 원고 136개, MBTI 기본 16개·주제 96개를 기존 원고와 따로 관리합니다. 기존 한국어 교정·계산·검토 기록은 보존합니다. [구현과 제한](docs/integrated-upgrade-2.0.0.md), [정책](docs/integrated-policy-2.0.0.md), [원래 요구](docs/integrated-upgrade-request-2.0.0.md)를 먼저 읽어 주세요. 원전·독립 명리 검토는 대기 상태입니다.

`npm run verify`는 통합 검사까지 실행합니다. 별도 천문 비교는 `node --import tsx scripts/verify-advanced-astronomy.ts`, 전체 검토 예시 출력은 verify 후 `node --import tsx scripts/export-integrated-evidence.ts`, 상세 PDF 검사는 E2E 후 `python3 scripts/verify-advanced-pdfs.py`입니다. 이번 작업은 원격 push·공개 배포를 하지 않습니다.

2.1.0 추가 검사: `npm run content:foundation`. 12개 합성 원국의 365일·12개월·5년과 원고 전제·해시를 검사합니다. 새 PDF 검사는 `python3 scripts/verify-foundation-pdfs.py`입니다. 재검토는 검토 ZIP의 START_HERE를 따릅니다.
