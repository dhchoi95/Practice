# 하루사주

가입·결제·실행 중 AI 호출 없이 사용하는 한국어 무료 사주·운세 사이트입니다. Next.js 정적 HTML과 브라우저 계산으로 동작합니다. 출생정보는 브라우저 메모리에만 두며 새로고침하면 사라집니다.

1.0.2 독립 재검토에서 기존 지적의 해소를 확인했습니다. 현재는 실제 휴대폰 사용자 테스트를 시작할 단계입니다. [현재 상태와 호스팅용 파일 안내](docs/launch-status-1.0.2.md), [접수한 최종 검토 보고서](docs/external-review-status-1.0.2.md)를 확인하세요.

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

- 정통사주·성격·연애·직업재물·대인관계·솔로·마음돌봄, 오늘·이번 달·올해 운세.
- 한국 음력·윤달 검증과 변환, 입춘 연주·절입 월주·자정 일주·표준시 시주, 기본 십성·오행 단순 개수.
- 띠 12종·별자리 12종·혈액형 4종 직접 선택과 별도 읽을거리.
- 조건·문장·버전이 함께 있는 **180개 조건별 원고**, 별도 공통 오행 설명 5개와 교체 가능한 저장소 인터페이스.
- 개인정보 없는 일반 메뉴 링크 공유, 복사 대안, 브라우저 인쇄, 오류·빈 상태·404, 안내 페이지.

출생 범위는 변환한 **양력 1962-01-01부터 한국시간 오늘**입니다. 기간 운세는 2050년까지입니다. 한국 출생만 지원합니다. 정확 계산은 1987·1988년 서머타임을 표준시로 환산하며 중복·존재하지 않는 시각은 거부합니다. 시간 미상에서는 불확정 기둥과 그에 의존하는 풀이를 제외합니다.

대운·용신·격국·신강신약·지장간·합충·해외 출생·진태양시·결과 이미지 저장은 제공하지 않습니다. 사이트는 미래 예측 능력을 입증한 서비스가 아닙니다.

## 검증 명령

```bash
npm run verify
npm run content:validate
npm run content:preview
npm run build
npm run test:e2e
```

`verify`는 lint → TypeScript → 단위·통합 검사 → 원고 중복·표현 검사 → 합성 프로필 coverage 순서입니다. `build`가 먼저 성공해야 E2E가 실제 `out/` 정적 파일을 검사할 수 있습니다. 이 클라우드에는 `/usr/bin/chromium`이 있습니다. 다른 기기에서 브라우저가 없다면 다음을 한 번 실행하세요.

```bash
npx playwright install chromium
```

Playwright는 시스템 Chromium이 있으면 사용하고, 없으면 설치한 브라우저를 사용합니다. 별도 경로는 `PLAYWRIGHT_CHROMIUM_EXECUTABLE`로 지정할 수 있습니다. 실행 결과는 `playwright-report/`, 실패 추적은 `test-results/`, 화면과 원고 검토 자료는 `reports/`에 생깁니다. 이 폴더에는 합성 입력만 사용합니다.

E2E는 닫힌/열린 상세와 연·월·일의 일간 확정/미확정을 포함한 실제 PDF 9개를 `reports/print/`에 만듭니다. PyMuPDF가 있는 검토 환경에서는 `python3 scripts/verify-print-pdfs.py`로 표·계산 기준의 PDF 텍스트 포함과 두 출력의 동일성을 추가 검사합니다. 기간 상세에는 실제로 제공한 관계 해석만 안내하는지도 검사합니다. 앱 실행에는 Python이 필요하지 않습니다. `tsx` CLI의 IPC 권한 오류가 나는 환경에서는 콘텐츠 명령을 `node --import tsx scripts/content-tools.ts lint`처럼 실행할 수 있습니다.

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

서비스명은 `src/config/site.ts`, 디자인은 `src/styles/tokens.css`, 원고는 `src/content/rules.json`에서 바꿉니다. 운영 전 실제 서비스명·도메인·연락처·호스팅 로그 정책을 결정하고 개인정보 안내를 갱신하세요. 실기기 인스타그램 브라우저 확인과 독립 명리 원고 검토는 별도로 필요합니다. 이번 작업은 외부 공개 배포·계정 변경·도메인 구매를 하지 않습니다.
