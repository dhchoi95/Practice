# 로컬 실행·운영 전환·중단

## 현재 로컬 실행

Node.js 24 환경에서 저장소 루트 기준:

```bash
npm ci
npm run ai:setup
npm run build
npm run ai:dev
```

http://127.0.0.1:8787/ai-saju/ 를 연다. `ai:setup`은 비밀 값을 출력하지 않고 무작위 로컬 키를 추적되지 않는 `.dev.vars`에 소유자 읽기/쓰기 권한으로 만든다. 기존 파일은 덮어쓰지 않는다. 데모는 외부 OAuth/AI를 호출하지 않는다. 가입→첫 진단→질문 2회→저장/삭제/탈퇴를 확인할 수 있다. 기존 기본 기능은 같은 주소에서 비회원으로 이용한다.

로컬 계정 이름은 테스트용 가명이다. 세 제공자의 이름이 보여도 실제 카카오/구글/네이버 로그인이 아니다. `/__local-idp/*`와 모의 모델은 `worker/dev.ts`를 통해서만 포함된다. 운영 entry는 이 파일을 import하지 않는다. dev entry 자체도 loopback의 고정 origin이 아니면 거부한다.

로컬 도우미 `ai-wrangler.mjs`는 local dev/dry-run 전용이다. 실제 배포는 계정/기존 Worker와 스테이징 검증을 확인하는 `scripts/deploy-ai.py`가 담당한다. 기본 `wrangler.json`과 `wrangler.ai.jsonc`는 동일한 실제 Worker entry 설정이다. 자격증명은 원격 배포 프로세스에만 주입하고 값은 출력하지 않는다.

```bash
npm run typecheck
npm run ai:typecheck
npm run verify
npm run ai:test
npm run ai:bundle
npm run ai:audit
npm run ai:test:e2e
npm run ai:samples
npm run ai:cost
```

`ai:test:e2e`는 별도 임시 SQLite 디렉터리에서 실제 로컬 Worker를 실행한다. 브라우저 fetch를 가짜 JSON으로 대체하는 테스트가 아니다. `ai:samples`의 24개 한국어 예문은 프로토콜·화면용 모의 응답이다. 실제 token 측정이나 실제 AI의 한국어 품질 검증으로 취급하지 않는다.

## 검증한 변경의 배포 — 2026-10-29 방침

- `wrangler.ai.jsonc`에 Worker entry·Static Assets·SQLite DO namespace·최초 migration을 준비했다. D1은 사용하지 않는다.
- 배포 대상은 기존 production spring-voice-4bdc와 별도 spring-voice-4bdc-ai-stg다. 모두 workers.dev 코드 공개는 허용되지만 신규 가입/실제 AI 플래그는 false다. 스테이징은 별도 namespace이며 운영 인증·자료와 공유하지 않는다.
- SQLite schema 2는 원래 테이블을 보존하고 연결 해제 outbox/철회 장벽 및 원문 없는 지연 지표 테이블을 추가한다. 원격 상태는 배포 기록을 확인한다. 스테이징 `/api/health`는 실제 SQLite schema를 읽는 일회 캐시형 준비 검사이며 운영에서는 404다. 공개 SQL/관리 기능을 제공하지 않는다.
- 향후 변경은 기존 migration을 덮어쓰지 말고 버전과 새 migration을 추가한다. DB를 바꾸기 전 백업·복원과 실제 삭제 지연 정책을 확인한다.
- 이 구성의 Cloudflare 요금·플랜 지원·데이터 위치는 공식 문서/실제 계정에서 다시 확인한다. 로컬 성공이 무료 운영이나 한국 내 보관을 보장하지 않는다.

## 비밀/운영 설정

비밀은 `wrangler secret put 변수명 --config wrangler.ai.jsonc`로 운영자 자신의 터미널 또는 대시보드에 직접 입력한다. 채팅·Git·NEXT_PUBLIC·정적 out에 넣지 않는다. 코드·준비 중 화면 배포는 외부 앱 등록을 기다리지 않는다. 실제 가입/유료 생성만 운영 정책·제공자 설정·키·예산·실연동 검증 뒤 개방한다.

서버 비밀: DATA_ENCRYPTION_KEY, IDENTITY_HMAC_KEY, REQUEST_HMAC_KEY, 승인한 제공자의 *_CLIENT_SECRET 및 AI_API_KEY. Client ID는 OAuth 식별 설정이며 client secret과 다르다. 예시 `.dev.vars.ai.example`에는 실제 값이 없다.

공개 운영 설정: APP_ENV, APP_ORIGIN, OPERATOR_NAME/CONTACT, SERVICE_COUNTRY, 약관·AI 정책 버전, 처리 근거/국외 이전 근거, AI 처리 업체·국가·보관 조건·안내 URL, 서버 보관 위치, 보유기간 확인, 가격의 확인일·출처, 일/월 비용 상한·동시 요청 상한. 실제 값을 확정하지 않은 채 검토 플래그만 true로 바꾸지 않는다.

## 비용 감시·중단

일/월 최대 예상 비용을 SQLite에서 함께 예약한다. 실패·timeout의 비용은 횟수 복구와 구분한다. `cost_estimated`가 있으면 실제 invoice 금액으로 간주하지 않는다. 반복 실패가 사용자 횟수를 되돌려 주어도 시도 제한과 전체 예산은 유지한다.

`AiOperations` Service Binding 전용 RPC는 summary, sampleUsage, setPaused만 제공한다. 신뢰하는 운영 Worker에만 바인딩한다. 공개 HTTP 관리자 URL을 새로 만들거나 회원 원문을 운영 화면으로 모으지 않는다. 이 RPC를 연결하는 원격 관리 경로도 운영자 단계에서 최소 권한으로 검증한다.

긴급 중단은 AI_ENABLED=false와 private setPaused(true)이다. 기본 운세를 중단하지 않고 새 AI 예약을 막는다. 진행 중인 생성은 이미 비용이 발생할 수 있으므로 최대 예약을 정산한다. 외부 제공자의 예산 알림은 강제 결제 상한이라고 가정하지 않는다.

실제 연결 후 한국어 20건 이상을 진단/질문1/질문2로 나누어 계측한다. private sampleUsage의 원문 없는 실제 usage export를 `node scripts/ai-cost-report.mjs <파일>`에 넣어 P50/P95와 실패 비용을 확인한다. 이 스크립트는 mock export와 20건 미만을 실제 계측으로 받지 않는다. 현재 예시 단가와 환율은 승인된 운영 예산이 아니다.

## 키 교체·삭제·롤백

- DATA_ENCRYPTION_KEY_ID를 새 버전으로 바꾸고 새 DATA_ENCRYPTION_KEY를 설정한다. 기존 키는 DATA_ENCRYPTION_OLD_KEYS의 키 ID→base64 매핑으로 읽기만 지원한다. 기존 자료와 백업의 재암호화/만료를 확인하기 전에 옛 키를 지우지 않는다. 키를 DB에 넣지 않는다.
- IDENTITY_HMAC_KEY는 계정 식별에 쓰이므로 단순 교체하면 기존 계정을 찾을 수 없다. 사고 시 신규 가입/AI를 닫고 세션을 폐기한 뒤, 원래 키 복구 또는 재인증을 이용한 식별자 이행 절차를 별도 검증한다. 그 이행을 이번 코드가 자동으로 끝낸다고 주장하지 않는다.
- REQUEST_HMAC_KEY 교체는 세션 CSRF와 요청/프로필 묶음에 영향을 준다. 진행 중 예약을 정산하고 모든 세션을 새로 발급하는 유지보수 단계로 처리한다.
- 탈퇴/삭제 후 진행 중 요청이 재저장하지 않도록 generation/FK를 사용한다. 백업과 제공자 보관은 실제 계약을 확인해 안내한다.
- 코드·정적 자산 버전과 DB migration은 서로 다른 롤백 대상이다. Durable Object migration이 포함된 버전의 rollback 제약을 Cloudflare에서 확인하고, 우선 AI를 닫은 채 전진 수정한다. 검증 없이 namespace나 회원 자료를 삭제하지 않는다. 기존 정적 버전으로 돌아가는 작업이 DB 삭제를 뜻하지 않는다.

## 실제 배포 명령과 검증

```bash
npm run verify
npm run ai:typecheck
npm run ai:test
npm run build
npm run ai:bundle
npm run ai:audit
npm run ai:test:production
npm run ai:deploy:preflight
npm run ai:deploy:staging
npm run ai:check:staging
npm run ai:deploy:production
npm run ai:check:production
node scripts/check-public-release.mjs
```

기존 토큰은 환경변수 또는 저장소 밖 `/workspace/.secrets/cloudflare-api-token`에서 메모리로만 읽는다. 계정/서브도메인/기존 Worker를 GET으로 확인한 후만 배포한다. 실패 로그는 비밀 값을 제거한다. production은 동일 정적 파일·Worker bundle의 실제 스테이징 검사 기록을 요구한다. static fallback 명령은 기존 production에 DO binding이 전혀 없을 때만 허용한다. 플랜 전환/약관 수락/비밀 등록을 자동 실행하지 않는다. 기본 무료 기능만 우선 배포하는 경우 API 미반영을 명확히 기록한다.

공개 자산의 날짜/버전 표시는 `/release.json`(2.5.0, 콘텐츠 2.4.1)으로 확인한다. Git push 성공을 배포 성공으로 간주하지 않는다. 현재 네트워크 403이면 계정·토큰·플랜 상태를 확인했다고 기록하지 않는다.

## 실제 개방에 필요한 설정 목록

- APP_ENV=production/staging, APP_ORIGIN=해당 환경의 정확한 HTTPS origin
- OPERATOR_NAME, OPERATOR_CONTACT, SERVICE_COUNTRY=KR, TERMS_VERSION/AI_POLICY_VERSION(확정 버전)
- ACCOUNT_PROCESSING_BASIS, TRANSFER_BASIS, AI_RECIPIENT_NAME, AI_PROCESSING_COUNTRIES, AI_RETENTION_NOTICE, AI_PRIVACY_NOTICE_URL, CLOUD_STORAGE_LOCATION_NOTICE
- 위 검토 후 POLICIES_CONFIRMED/OAUTH_REVIEWED/TRANSFER_CONFIRMED/AGE_POLICY_CONFIRMED/RETENTION_CONFIRMED. 각각 true여도 법적 검토가 자동 완료되는 것은 아니다.
- 제공자별 KAKAO_LOGIN_ENABLED/GOOGLE_LOGIN_ENABLED/NAVER_LOGIN_ENABLED. 카카오는 추가 KAKAO_WEBHOOK_REVIEWED, 숫자 KAKAO_APP_ID와 대표 어드민 비밀이 필요하다. 검증한 제공자만 true.
- AI_ENABLED, AI_PROVIDER=gemini, AI_MODEL=gemini-2.5-flash-lite, AI_API_KEY
- PRICE_INPUT_USD_PER_MILLION, PRICE_OUTPUT_USD_PER_MILLION, PRICE_REVIEW_DATE(YYYY-MM-DD), PRICE_SOURCE_URL=https://ai.google.dev/gemini-api/docs/pricing
- DAILY_BUDGET_MICRO_USD, MONTHLY_BUDGET_MICRO_USD(1달러=1,000,000), GLOBAL_CONCURRENCY(1~20)
- STORAGE_ENABLED, SAVED_RETENTION_DAYS. 설정된 보유기간·백업/외부 사업자 삭제 지연은 실제 정책으로 고지한다.

`AiOperations.summary().priceReview`는 만료 일주일 전부터 재확인 경고와 종료일을 제공한다. 운영 모니터가 이 내부 RPC를 매일 확인해 담당자 알림에 연결해야 한다. 이메일 알림을 전송했다고 주장하지 않는다. 확인 날짜를 자동 연장하지 않으며 31일 기한이 끝나면 생성은 차단한다.

Worker 앞단에 개인정보 없는 isolate별 10초 200건의 가벼운 요청 제한을 두고, 비밀 없는 미개방 환경의 위조 세션은 DB 조회 전에 거부한다. 이는 전역 과금 상한이 아니다. 공개 시 Cloudflare 요청/DO 사용량 알림·WAF/요청 제한의 실제 플랜 조건도 확인한다. 웹훅은 인증/최대 2KB 검사 후만 DB에 접근하며 일반 사용자 요청 제한과 분리해 공급자의 재전송을 불필요하게 막지 않는다.

## 카카오 연결 해제의 정확한 범위

경로 `/auth/webhooks/kakao/unlink`. 제공된 2026-10-29 계약의 KakaoAK 대표 어드민 키와 앱 ID를 확인한 뒤 HMAC 식별 요약과 대상 계정 ID만 durable outbox에 기록한다. 즉시 세션/가입 대기를 철회하고, alarm이 기존 계정·저장 자료를 제거한다. 처리 재시작/중복은 같은 대상에 멱등적이다. 이 계약은 전달받은 지시문과 대조했으며, 최신 공식 페이지는 네트워크 403으로 읽지 못했다. 실제 등록 전 확인이 필요하다.

정적 어드민 키 계약에는 이번 입력에서 검증할 수 있는 서명 시각·전송 event ID가 없다. 따라서 암호학적 freshness를 임의로 주장하지 않는다. 키 유출 시 재전송 위조 위험이 있으며 비밀 교체/공급자 계약 재확인이 필요하다. 재가입 이후 오래된 통지가 도착하는 순서는 실제 제공자 계약으로 추가 검증한다. 각 작업은 수신 당시 계정에 묶이고 새로운 계정을 임의로 생성하지 않는다. 저장 중 탈퇴/웹훅 처리 후 늦은 AI 응답은 자료를 재생성하지 않는다. 실제 3초 SLA는 원격 스테이징에서도 측정해야 한다.


## 2.5.1 탈퇴 확인 보강

서비스 자료만 먼저 삭제하는 DELETE /api/account도 최근 10분 이내 소셜 인증을 요구한다. 기본 재인증·unlink 경로의 계정 바인딩은 유지한다. 오래된 세션은 삭제 전에 다시 로그인하고 버튼을 직접 눌러야 한다. 제공자 장애로 재로그인도 불가능하면 실제 운영자 문의처로 권리 행사를 처리할 수 있어야 하므로, 미확정 문의처 상태에서 가입을 열지 않는다. 최근 인증 상태에서 unlink만 실패한 경우 서비스 우선 삭제를 계속 지원한다.
