# 출시 점검표 · 2.5.1 후보

대상: https://spring-voice-4bdc.eogjs9595.workers.dev/ . **표의 충족/개선은 소스·로컬 검사 기준이다. 공개 배포 성공은 별도 배포 결과를 따른다.** 실제 OAuth·유료 AI·선택 분석은 비활성이다.

첨부 프롬프트 제목에는 도하사주라고 쓰였지만 실제 저장소·로고의 브랜드는 하루사주이므로 “기존 브랜드 유지” 지시에 따라 바꾸지 않았다. 첫 사진 20개와 둘째 사진 1~17의 총 37개를 대조했다. 둘째 사진의 빈 18~20은 만들지 않았다.

| 사진 | 번호 | 항목 | 상태 | 근거 파일·경로 | 확인/적용 범위 |
|---|---:|---|---|---|---|
| 첫째 | 1 | 개인정보 처리방침 | 이번에 개선 | src/content/pages.ts, CookieDisclosure.tsx | 기본 운세/준비 중 AI를 구분하고 쿠키·삭제·문의 범위를 설명. 로컬 /privacy/ 검사. 법적 근거·운영자 정보는 미확정. |
| 첫째 | 2 | 이용약관 | 이미 충족 | src/content/pages.ts → /terms/ | 하단 공통 링크, 무료 범위·한계·준비 중 AI 안내. 실제 결제 없음. |
| 첫째 | 3 | 환불 정책 | 현재 해당 없음 | /terms/, package.json, worker/src/app.ts | 상품·결제·구독 경로가 없어 환불 폼/결제 시스템을 추가하지 않음. |
| 첫째 | 4 | 쿠키 정책 | 이번에 개선 | src/components/CookieDisclosure.tsx, worker/src/security.ts | 세 필수 쿠키 이름/기간/목적/보안 속성 설명. 기본 비회원 쿠키 0개를 브라우저로 확인. |
| 첫째 | 5 | 쿠키 동의 배너 | 현재 해당 없음 | CookieDisclosure.tsx, src/lib/analytics.ts | 선택 추적 없음. 필수 로그인 쿠키에 모두 허용 배너를 붙이지 않음. |
| 첫째 | 6 | 입력 양식 동의 | 이미 충족 | BirthForm.tsx, ai/AiSaju.tsx, worker/src/app.ts | 기본 메모리 입력에 불필요한 체크박스 추가하지 않음. AI 동의·선택 저장은 각각 분리/기본 꺼짐. |
| 첫째 | 7 | 개인정보 최소 수집 | 이미 충족 | SessionProvider.tsx, worker/src/facts.ts, oauth.ts | 기본 이름 선택, AI payload에 정형 출생 원자료·계정 ID 제외. 실명/전화/사진/주소 필수 수집 없음. |
| 첫째 | 8 | 외부 SDK | 이미 충족 | scripts/check-launch.py, src/app/layout.tsx | 46개 정적 HTML의 외부 스크립트 0개. 로컬 요청 검사. 운영 대시보드 주입 여부는 외부 접속 차단으로 미확인. |
| 첫째 | 9 | 원치 않는 선택 유도 | 이미 충족 | AiSaju.tsx, Header.tsx | 가입은 AI에만 필요, 선택 저장 미선택. 기본 운세는 그대로 이용. 신규 고정 가입 유도 없음. |
| 첫째 | 10 | 숨은 요금 | 이미 충족 | /terms/, AiSaju.tsx | 기본 무료·AI 준비 중·예정 1+2회 공개. 결제 API/구독 버튼 없음. |
| 첫째 | 11 | 가짜 후기 | 이미 충족 | src/app/page.tsx, src/content/pages.ts | 후기·고객수·성공담을 새로 만들지 않음. 테스트 인물은 합성이고 실사용 증빙으로 표시하지 않음. |
| 첫째 | 12 | 근거 없는 주장 | 이미 충족 | /terms/, /guide/, scripts/audit-copy-followup.ts | 예측 보장/과학적 검증/독립 명리 승인 주장 없음. 사주 지수와 실제 확률을 구분. |
| 첫째 | 13 | 이미지 대체 설명 | 이미 충족 | Illustration.tsx, SectorRadar.tsx, metadata.ts | 장식 SVG aria-hidden, 그래프 제목/설명+텍스트 수치. OG alt는 브랜드·기능 설명. |
| 첫째 | 14 | 대비 | 이번에 개선 | src/styles/globals.css, tests/e2e/launch.spec.ts | 입력·버튼 경계를 #868178로 보완. 실제 렌더링 경계 대비 3:1 이상과 본문 axe 검사. 테마 재설계 없음. |
| 첫째 | 15 | 키보드 이동 | 이번에 개선 | globals.css, Header.tsx, CookieDisclosure.tsx | textarea 초점 추가, 쿠키 표 스크롤 영역 키보드 접근. 기존 스킵/모달 초점 복귀 유지. |
| 첫째 | 16 | 사업자 정보 | 조건 충족 시 적용 | SupportContact.tsx, USER_ACTION_REQUIRED.md | 실제 운영 주체·사업 형태·문의처가 필요. 번호/주소를 만들어 넣지 않음. Organization schema도 생략. |
| 첫째 | 17 | 아동 정보 | 조건 충족 시 적용 | worker/src/facts.ts, policy.ts | AI 만 19세 대상 초안은 운영자 확정 전 개방하지 않음. 기본 브라우저 기능 때문에 주민번호/신분증 수집 안 함. |
| 첫째 | 18 | 이메일 수신 거부 | 현재 해당 없음 | src/app, worker/src/app.ts, package.json | 마케팅 메일·구독·메일 발송 API가 없어 해지 시스템을 신설하지 않음. |
| 첫째 | 19 | 이미지·폰트 이용권 | 이미 충족 | public/og.svg, Illustration.tsx, THIRD_PARTY_NOTICES.md | 기존 자체 SVG 재사용·로컬 PNG 렌더. 외부 사진/웹폰트 없음. OS Noto CJK SIL-1.1 파일 확인, 폰트 파일 재배포 없음. |
| 첫째 | 20 | 개인정보 삭제 | 이번에 개선 | PrivacyActions.tsx, SessionProvider.tsx, worker/src/app.ts | 개인정보 안내에서 기본 입력/짝궁합/유형 초기화 제공. 회원 서버 자료·탈퇴는 별도 경로. 탈퇴의 최근 10분 인증 검사와 소유권/삭제 회귀를 보강. |
| 둘째 | 1 | Google Analytics | 조건 충족 시 적용 | src/lib/analytics.ts, launch-privacy.test.ts | 업체·측정 ID 미설정. 이벤트 허용 목록만 준비, 동의/거절/철회 모두 전송 0. 태그·네트워크 transport·자동 page_view 없음. |
| 둘째 | 2 | 첫 화면 행동 안내 | 이미 충족 | src/app/page.tsx, Header.tsx | 기존 6개 상단·4×2·3×3 유지. 오늘 보기/기능별 제목이 실제 메뉴로 이동. |
| 둘째 | 3 | 모바일 고정 CTA | 현재 해당 없음 | globals.css, page.tsx | 긴 결과/만세력에 고정 가입·상담 버튼을 새로 덮지 않음. 현재 레이아웃 유지. |
| 둘째 | 4 | 실제 활용사례 | 현재 해당 없음 | page.tsx, /guide/ | 실사용 성공 사례를 지어내지 않음. 기존 사용 방법·입력 예시만 유지. |
| 둘째 | 5 | FAQ 5개 이상 | 이번에 개선 | src/app/page.tsx, src/content/pages.ts | 무료 범위·같은 결과/KST·시간 미상·오늘/지정일·저장/삭제·AI 이용 등 8개로 보완. |
| 둘째 | 6 | 문의 답변 시간 | 조건 충족 시 적용 | SupportContact.tsx | 운영자가 약속하지 않은 응답 시간을 표시하지 않음. 문의처 준비 상태를 사실대로 안내. |
| 둘째 | 7 | 문의 접수 완료 | 현재 해당 없음 | SupportContact.tsx | 현재 이메일 미설정·문의폼 없음. 이메일 설정 시 mailto만 제공하며 서버 접수 완료로 표시하지 않음. |
| 둘째 | 8 | SNS 썸네일 | 이번에 개선 | public/og.svg, public/og.png, scripts/render-og.mjs | 현재 브랜드 1200×630 PNG, OG/Twitter 이미지·타입·크기·alt 확인. 개인 정보 없음, 유료 생성 API 0. |
| 둘째 | 9 | 페이지별 제목 | 이번에 개선 | src/lib/metadata.ts, app/**/page.tsx | 공개 23개 제목 중복 없음. 실제 기능명과 기존 브랜드 하루사주 유지. |
| 둘째 | 10 | 검색 설명 | 이번에 개선 | metadata.ts, scripts/check-launch.py | 공개 기능별 description/OG/Twitter 설명 확인. 보장·실적·임의 사용자 수 없음. |
| 둘째 | 11 | 내부 페이지 링크 | 이번에 개선 | Footer.tsx, PrivacyActions.tsx, scripts/check-launch.py | 문의/삭제 anchor와 실제 개인정보 페이지 연결, 46개 HTML 내부 링크·정적 anchor 검사. |
| 둘째 | 12 | 현재 탐색경로 | 이번에 개선 | StructuredData.tsx, app/[info], app/fortune, app/result | 기존 계층만 nav 현재 위치로 표시. 공개 계층에 일치하는 BreadcrumbList 추가. |
| 둘째 | 13 | 맞춤 404 | 이번에 개선 | src/app/not-found.tsx, scripts/serve.mjs, Worker assets | 기존 홈 링크에 오늘/지정일/도움말 추가. 기존 404 상태/soft 404 회귀 유지, 공개 상태는 미확인. |
| 둘째 | 14 | 이미지 alt | 이미 충족 | Illustration.tsx, SectorRadar.tsx | 첫 사진 13과 통합. 장식 이미지를 의미 없는 키워드로 설명하지 않음. |
| 둘째 | 15 | robots.txt | 이번에 개선 | src/app/robots.ts, sitemap.ts, public/_headers | API/auth 제외. 결과/AI는 robots로 막지 않아 noindex를 읽도록 함. 사적 결과·AI·종료한 혈액형은 sitemap 제외. |
| 둘째 | 16 | 구조화 데이터 | 이번에 개선 | StructuredData.tsx, layout.tsx | 실제 브랜드 WebSite와 공개 계층 BreadcrumbList만 추가. Organization/리뷰/가격/FAQ 리치결과 보장 없음. |
| 둘째 | 17 | 개인정보 처리방침 | 이번에 개선 | src/content/pages.ts, CookieDisclosure.tsx, PrivacyActions.tsx | 첫 사진 정책/삭제 작업과 통합. 실제 문의처/AI 처리 조건이 미완료인 점은 별도 표시. |

## 실제 데이터·SDK 목록

| 위치 | 항목·목적 | 수명/삭제 | 외부 전송 |
|---|---|---|---|
| 기본 운세 React 메모리 | 출생정보, 짝궁합 A/B, 조회 연도, 유형 선택 | 입력 지우기 또는 문서 재시작. OS 문서 복원까지 영구 삭제 보장은 아님 | 기본 운세 서버 전송 없음 |
| localStorage/sessionStorage/IndexedDB | 개인 입력·분석 저장을 사용하지 않음 | 삭제 UI를 가짜로 만들지 않음 | 없음 |
| 서버 세션 쿠키 | __Host-saju_session, 회원 확인 | 12시간 / 로그아웃·탈퇴 | 당사 서버에만; HttpOnly/Secure/SameSite=Lax |
| 인증 쿠키 | __Host-saju_oauth 및 pending, 일회 인증/가입 확인 | 각각 10분 / 처리 후 만료 | 당사 서버에만; 현재 신규 가입 비활성 |
| 선택 서버 저장 | 회원 출생정보·대화 AES-GCM 암호화 | 기본 꺼짐; 개별/전체/탈퇴, 기간·백업 정책 확정 필요 | 실제 AI 미연결, 별도 전송 동의 필요 |
| 최소 서버 메타데이터 | 횟수·비용·동의·해제 작업/HMAC | 작업별 TTL; HMAC도 개인과 연결 가능 | AI에 계정 식별자 미전송 |
| AI 브라우저 메모리/기기 파일 | 선택하지 않은 대화 / 복사·TXT·PDF | 문서 이탈 시 대화 소멸, 기기 파일은 이용자가 관리 | 외부 변환 서비스 없음 |
| 소스의 외부 스크립트/SDK·웹폰트 | 분석/GTM/광고/오류 수집/session replay 없음 | 해당 없음 | 로컬 네트워크로 0 확인; 호스팅 대시보드 주입은 미확인 |
| 선택 분석 준비 | 허용된 이벤트명·공개 분류만 검증하는 비활성 코드 | 업체/ID/전송기/대기열 없음, 동의 상태도 모듈 메모리뿐 | 미설정·허용·거절·철회 모두 전송 0 |

## 미확인·운영자 조치

실제 운영자/문의 이메일·사업 상태와 적용 법령, 실제 AI 처리 업체/국가/근거/보관, 연령·보유정책은 운영자가 확정해야 한다. SITE_CONTACT_EMAIL이 없으면 mailto나 접수 완료를 만들지 않는다. 공개 문의 경로가 완비됐다고 보고하지 않는다. 결제·마케팅·선택 통계 기능은 신설하지 않았다.

공식 개인정보 지침·WCAG·검색 문서는 이번 실행의 프록시 403으로 최신 본문을 읽지 못했다. 자동 WCAG 검사·소스 지식과 최신 공식/법률 검토를 구분한다. 실제 iOS/Android·인스타 인앱·실제 OAuth/유료 AI·공개 사이트 검사도 별도 미실행이다. [검증/배포 결과](verification.md), [운영자 다음 단계](../../USER_ACTION_REQUIRED.md)를 따른다.
