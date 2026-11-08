# AI 사주: 다음에 필요한 운영자 설정

2026-10-29 갱신. 코드·준비 중 화면의 기존 서버 배포는 허용됐다. 실제 가입/유료 AI 개방은 별도 준비가 끝난 제공자부터 한다. 최신 배포 성공/실패는 [검증 보고서](docs/ai-saju/review-report.md)에 기록한다. 권장 순서는 **카카오부터 연결**이며 자동으로 공개하지 않는다.

## 1. 답해 주실 것 — 비밀 값 제외

- 최종 도메인: 현재 `https://spring-voice-4bdc.eogjs9595.workers.dev` 유지 또는 소유 도메인. 공용 workers.dev가 제공자의 소유·브랜드 검증을 충족하는지는 실제 확인한다.
- 운영 주체명과 개인정보 문의 이메일.
- 처음 열 소셜 제공자(권장: 카카오).
- AI 모델(구현 후보 Gemini 2.5 Flash-Lite), **일/월 달러 상한**, 동시 요청 수.
- 연령·저장/파기 정책. 현재 만 19세 이상·선택 저장 90일은 초안이며 확정이 필요하다. 비회원 AI 불가, 회원 KST 하루 진단 1회+질문 2회는 유지한다.

## 2. 콘솔에서 할 것 — 실제 구현한 경로

최종 origin을 확정하고 그 주소로 등록한다. 아래는 현재 공개 도메인을 유지할 때의 정확한 경로다. **아직 등록·실연동 검증된 URL이라는 뜻은 아니다.** 스테이징은 `spring-voice-4bdc-ai-stg.eogjs9595.workers.dev`로 각각 따로 등록하고 앱/세션/키/DB를 운영과 공유하지 않는다.

| 제공자 | 콘솔 작업·최소 항목 | 구현한 운영 콜백 |
|---|---|---|
| 카카오 | 개발자 앱·웹 플랫폼·카카오 로그인, REST API 키/client secret. 고유 ID만 사용, 추가 개인정보 scope 없음. 비즈 앱/검수 조건 확인 | `https://spring-voice-4bdc.eogjs9595.workers.dev/auth/callback/kakao` |
| 구글 | Cloud 프로젝트·동의 화면·웹 OAuth client·테스트 사용자·게시/브랜드/도메인 검증. scope `openid`만, JS 로그인 SDK 없음 | `https://spring-voice-4bdc.eogjs9595.workers.dev/auth/callback/google` |
| 네이버 | 웹 애플리케이션·서비스 URL·최소 식별 항목·테스트 계정. 정식 공개 전 사전 검수 자료 제출 | `https://spring-voice-4bdc.eogjs9595.workers.dev/auth/callback/naver` |

카카오 **연결 해제 웹훅**은 앱의 로그인/연결 해제 콜백 설정에서 `https://spring-voice-4bdc.eogjs9595.workers.dev/auth/webhooks/kakao/unlink`로 등록한다. GET 및 form POST를 구현했다. KakaoAK 대표 어드민 키, app_id/user_id/referrer_type 계약이며 client secret이나 SET 서명으로 대체하지 않는다. **공식 문서 최신 계약/재전송·재가입 경계와 실제 3초 응답을 확인한 뒤에만 등록/활성화**한다. 현재 공식 페이지 접속은 프록시 403으로 미확인이다.

구글·네이버에 카카오 웹훅을 복제하지 않았다. 해당 제공자의 실제 철회·계정 상태 변경 지원/심사 요구를 공식 문서로 확인하고 필요한 처리를 검증한다. 서비스 내 재인증 탈퇴·연결 해제는 별도로 구현했다.

서비스 소개 `/ai-saju/`, 약관 `/terms/`, 개인정보 `/privacy/`. 지금 공개 가능한 설명은 ‘준비 중’ 상태다. 실제 가입 개방 전 운영 주체·업체·국가·보관/학습·위탁/이전 근거·문의처를 확정해 문서를 완성한다. 결제수단 등록·외부 약관 수락·신원 확인·도메인 구매는 운영자가 직접 한다. 모의 화면을 실제 인증 성공 증빙으로 제출하지 않는다.

## 3. 비밀을 직접 입력할 곳

정확한 대상: 운영 Worker **spring-voice-4bdc**, 분리 스테이징 **spring-voice-4bdc-ai-stg**. 대상 확인 뒤 Worker 대시보드의 Secrets 또는 자기 터미널에서 `npx wrangler secret put 변수명 --config wrangler.json`(스테이징은 `wrangler.ai.staging.jsonc`)로 직접 입력한다. **키를 채팅·Git·NEXT_PUBLIC 변수에 넣지 않는다.** 이번 작업에서 외부 로그인/AI 키는 새로 등록하지 않았다.

- 공통: 서로 다른 무작위 32바이트 base64의 DATA_ENCRYPTION_KEY / IDENTITY_HMAC_KEY / REQUEST_HMAC_KEY. DATA_ENCRYPTION_KEY_ID 지정. 로컬 데모 키 재사용 금지.
- 카카오: KAKAO_CLIENT_ID(REST API 키), KAKAO_CLIENT_SECRET, **KAKAO_UNLINK_ADMIN_KEY(대표 어드민 키)**, KAKAO_APP_ID(숫자 앱 ID).
- 구글: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET. 네이버: NAVER_CLIENT_ID / NAVER_CLIENT_SECRET.
- AI: AI_API_KEY. 회원 개인 키를 받지 않는다. 무료 API의 데이터 처리 조건을 확인하지 않은 채 실제 상담을 보내지 않는다.

공개 설정/보호 플래그, 가격·예산의 정확한 변수는 [운영 절차](docs/ai-saju/operations.md)에 있다. 제공자별 *_LOGIN_ENABLED와 카카오 KAKAO_WEBHOOK_REVIEWED는 검증 후에만 연다. 현재는 모두 false다. 예시 비용은 승인된 예산이 아니다. Cloudflare API 토큰 교체를 지금 요구하지 않는다. 현재 오류는 토큰 유효성 검사 이전의 **네트워크 프록시 403**이다.

## 4. 설정 후 Codex가 이어서 할 것

1. 연결된 계정/기존 Worker 확인 → 분리 스테이징 배포 → 실제 Worker/SQLite·비활성 가입·무료 운세 검증 → 같은 빌드를 기존 공개 Worker에 배포/재확인. 이미 가능한 코드 배포를 외부 앱 심사 때문에 미루지 않는다.
2. 승인된 제공자부터 실제 성공/취소/state 재사용/재인증·탈퇴/외부 해제·재전송을 검증하고 해당 로그인만 개방한다.
3. 승인한 AI 키·예산 안에서 합성 사례 최소 20건을 실제 생성·검토한다. 진단/질문1/질문2, token·thinking·지연·실패 비용·P50/P95·문장 의미를 확인한다. [24개 준비 입력](content-review/ai-saju/synthetic-quality-cases.json)은 실제 답변이 아니다. 계정별 하루 3회 제한을 우회하지 않고 승인된 테스터/날짜로 나눠 실행한다.
4. 운영 설정·정책과 실제 iOS/Android 외부 브라우저/인앱 흐름을 확인한 뒤 AI 생성 개방 → 재배포 → 공개 주소·버전·KST 시각을 보고한다.

환경 설정 초안에 기존 Cloudflare 도메인을 보존하고 공식 문서 호스트 및 Worker 실행 안내를 저장했다. **환경 설정에서 검토·저장 후 환경 게시**가 필요하다. 초안 저장만으로 현재 프록시가 바뀌는 것은 아니다. 적용된 다음 실행 환경에서 `npm run ai:deploy:preflight`부터 재개하면 된다. 사전 검사를 통과하지 않은 채 새 Worker 배포를 기존 서버 반영으로 보고하지 않는다.


## 출시 안내 추가 확인 · 2.5.1

- 실제 서비스/개인정보 문의 이메일은 `SITE_CONTACT_EMAIL`로 **빌드 시점**에 제공하면 `/privacy/#contact`의 mailto에 반영된다. 이 주소는 공개 정보이므로 운영자가 게시할 이메일만 사용한다. Worker AI의 OPERATOR_CONTACT와 실제 정책에도 같은 연락처를 맞춘다. 미설정이면 문의 접수 기능이 없음을 안내한다.
- 기존 공개 도메인을 canonical·OG·sitemap 기본 origin으로 사용했다. 소유 도메인을 바꾸면 NEXT_PUBLIC_SITE_URL을 실제 HTTPS origin으로 지정하고 다시 빌드한다. 검색 콘솔의 도메인 소유/색인 결과는 별도 확인한다.
- 방문 통계는 현재 미선택/미설정이다. 업체·개인정보 조건·허용 이벤트·선택 동의가 확정되기 전에는 태그/외부 전송을 켜지 않는다. Google Analytics ID만 입력해서 자동 활성화되는 구조를 만들지 않았다.
- 운영 주체/사업자 정보와 답변 시간은 실제로 확정한 내용만 제공한다. 사업자번호·주소·24시간 답변 약속을 코드에서 지어내지 않았다.
