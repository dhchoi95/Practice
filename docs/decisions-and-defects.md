# 구현 결정과 검증 결함 추적

사용자가 Phase 0 전체 구현을 승인했다. 아래 결과는 실제 실행한 검증 범위의 증거이며 검증 범위 밖의 무결함을 주장하지 않는다.

## 결정

| ID | 선택 | 근거 |
| --- | --- | --- |
| D01 | 기존 `/workspace/Practice` checkout 사용 | 클라우드 작업은 이미 격리되어 있고 별도 worktree 요청 없음 |
| D02 | PostgreSQL 17.11, Prisma 7.10.0 고정 | 실제 DB 트랜잭션과 정확한 수량, RC CLI 자동 채택 방지 |
| D03 | credentials + bcryptjs + 서명 JWT 쿠키 | 단일 앱 인증, 8시간 만료, 매 요청 활성 계정·멤버십 확인. 실제 역할/회수/Origin 차단 검증 |
| D04 | 한국시간 자정, 예약 기본 90분 | 승인 설계 기본값, 같은 사용자 질문을 반복하지 않음 |
| D05 | fixture 통합 테스트는 별도 `practice_test` DB | 개발 DB를 reset하지 않기 위한 분리 |
| D06 | 실제 공급업체 전달·POS API 연결 없음 | 수동 입력 및 데모 Mock POS, 외부 API나 LLM 호출 없음 |
| D07 | 공식 Prisma 7.10 WASM API helper | 네이티브 다운로드 도메인 차단을 npm 검증된 공식 WASM/API로 해결. 버전별 migration factory/catalog 호환 코드는 vendor 소스를 바꾸지 않음 |
| D08 | 레시피 최초 즉시·이후 버전 다음 KST 자정 적용 | 하루 동일 조건의 안전한 기본값. 다음 자정 이전 유효 버전 선택, 과거 판매 스냅샷 유지 |
| D09 | 데모 catalog 한 번 초기화 | SEED_INITIALIZED 감사 표식으로 반복 seed가 사용자가 변경한 이름·재고·레시피를 다시 만들지 않도록 함 |
| D10 | 초기 활성 사용 흐름은 Owner + Staff | Manager 값은 확장 구조로 유지하며 현재 운영 기능을 완성된 Manager 권한이라고 설명하지 않음 |

## 발견한 결함과 수정·재검증

| ID | 발견 | 수정 | 실행 증거/현재 상태 |
| --- | --- | --- | --- |
| F01 | 시설 문서의 Staff 권한 과다 | Staff는 이상 접수, 수리 상태/완료는 권한 있는 관리자. 문서·서버 가드 정렬 | API Staff 이상 접수→Owner 상태/완료 흐름 통과. 문서 수정 완료 |
| F02 | SESSION_SECRET/AUTH_SECRET 불일치 | AUTH_SECRET 통일, 최소32자 검사 | 실제 로그인·서명 쿠키·비활성 계정/멤버 접근 차단 통과 |
| F03 | 초기 API 설명에 초대·메뉴·테이블·Mock 등 누락 | 초대/직원/메뉴/레시피/테이블/Mock/원장 정정 API와 UI 구현 | 초대·운영 API 및 360px/1440px 실제 브라우저 흐름, Mock 데모 제한·중복·수동 판매 겹침 검증 통과 |
| F04 | 테스트 계획의 선택 조건으로 필수 검증 약화 | 로그인 제한과 동시 요청 검증을 필수로 지정 | 로그인 실패 제한·판매 중복·정정 revision·예약 동시성 실제 테스트 통과 |
| F05 | 판매 사건 기간 귀속 정보 부족 | 사건 businessDate/occurredAt 분리, 확정/정정은 영업일·환불은 발생일 집계 | 전월 판매/당월 환불, 운영 매출85000·비용50000·손익35000 통과 |
| F06 | 시설 상태 변경 이력 부족 | MaintenanceHistory/AuditLog와 수리비 단일 source 연결 | 수리 완료 재시도 비용 한 건·금액 비노출 API 통과 |
| F07 | nested 자원의 매장 범위 누락 위험 | 서버에서 재료·테이블·공급업체 등 참조 매장 확인, 활성 멤버십 범위 조회 | 타 매장 조회/변경·테이블·PO 공급업체/재료 거부 실제 통과. DB 직접 수정을 통한 범위 무결성을 테스트한 것은 아님 |
| F08 | Origin 없음/빈 키/forwarded-host 허점 | 변경 요청 Origin 필수, APP_URL의 정확한 origin 비교, 키 검사, HS256 제한 | Origin 누락/외부 origin 거부 통과. production URL 설정 후 실제 브라우저 로그인 성공 |
| F09 | Prisma native engine 다운로드403 및 one-line 스키마 손상 | 스키마 복구, npm 공식 WASM generation/migrate helper | validate/generate/초기 migration/반복 deploy/무변경 create/status 실제 통과, 검증 우회 없음 |
| F10 | 실사를 총량 증가로 처리, Staff 실사·원가 노출 | 차이 원장+잔고를 원자 처리, Staff 사용/폐기만 허용, 원가 제거 | 2000−300−100=1600→실사1500, 원장−100, 멱등성·stale version 통과 |
| F11 | BigInt JSON 직렬화 실패 | 공통 serializer로 BigInt/Decimal 응답 정규화 | 판매·PO·시설·금융 실제 API와 모바일 흐름 응답 성공 |
| F12 | 판매 재시도·과거 레시피·동시 정정 오류 | immutable 사건/스냅샷, row lock, revision 검사, 유효시각 조회 | 최초/정정 재시도 한 번 반영, 서로 다른 정정 동시 요청 한 건만 성공, cooked 환불 재고 유지·다음 KST 자정 버전 적용 통과 |
| F13 | 실사 cutoff +39시간으로 당일 정정 허용 | KST 영업일 경계 및 관련 재료만 확인, 수량 변경 시 차단 | 동일일 실사 후 정정/새 판매 차단, 무관한 재료 실사 후 정정 허용 통과 |
| F14 | 소수·0·음수 재고 계산/동시 실사 오류 | Prisma.Decimal, Zod, 행 잠금, required expectedVersion | 핵심 재고·stale count·사건 재시도·소수 사용·음수 잔고·실사0 처리 실제 테스트 통과 |
| F15 | PO에 타 매장 공급업체 허용 | 생성 시 매장 범위 검증 | 실제 201 실패 발견 후 수정, 재실행 거부 통과 |
| F16 | Staff PO 목록에 단가·원가 노출 | order item price와 nested ingredient cost 제거 | Staff PO 응답에 금액 필드 없음 통과 |
| F17 | PO receipt/submit/cancel 상태 race 및 중복 | PO 행 잠금, payload hash, 정렬된 재고 잠금, 완료 뒤 재시도 검사 | 부분40+60·중복 입고·초과 입고·부분 입고 뒤 취소 차단 통과 |
| F18 | 자금투입 정정이 영업 손익으로 편입 | reversal에 원래 category 유지, 출처로 정정 연결 | capital 입금 및 reversal 모두 손익 제외 실제 통과 |
| F19 | 로그인 제한을 임의 X-Forwarded-For로 우회 | 정규화 계정 키로 제한 | 반복 실패 제한 통과. 프로세스별 메모리 제한이라는 배포 범위는 operations에 기록 |

## 실제 실행 증거

- 공식 Prisma WASM validation·client generation·migration 생성/적용/반복 적용/무변경 생성/status를 실행했다. 초기 migration은 `20261007155343_initial`이다.
- Vitest 단위 테스트7/7, TypeScript 타입 검사 종료0. 최종 재현 설치 이후에도 Playwright PostgreSQL API18건 + 360px/1440px 실제 Chromium 흐름1건, 총19/19 통과했다. Mock/KST·소수/음수/0 재고·동시 입고 재시도까지 포함한다.
- production 빌드·타입 검사 통과 후 실제 Owner 브라우저 로그인·대시보드·재고 데스크톱/모바일 화면을 확인하고 스크린샷을 만들었다. 스크린샷은 전체 자동 테스트 결과를 대신하지 않는다.
- 초기 백업25테이블/28행을 검증했고 SEED_INITIALIZED 표식 추가 뒤 최종 백업25테이블/29행의 전체 행 SHA256 digest가 복원 DB와 모두 같음을 확인했다.
- 정확한 `bash scripts/cloud-install.sh` 재실행 종료0: lockfile 기반 npm ci, WASM generate/validate, migration deploy/status, 반복 seed, production build 모두 통과했다. npm cache는 저장소 `.npmrc`의 쓰기 가능한 workspace 경로를 사용한다.
- `npm audit --omit=dev` 0건. 전체 개발 도구 검사에는 수정 버전이 없는 braces3.0.3 관련 advisory chain이 남아 있고 적용 범위를 operations에 설명했다.
- 최종 production smoke에서 Owner8개 화면, 360px layout, Owner/Staff 로그인 및 Staff 금액 API403을 실제 브라우저로 확인했다. 최신 스크린샷을 갱신했다.
- 빈 DB 복원 fallback을 실행해25테이블 전체 행 digest 일치를 재확인했다. 재사용 환경의 `install_script`와 `start_skill` draft 저장 성공을 확인했다. 저장은 게시와 다르며 환경 게시·새 task 복원은 실행하지 않았다.

실매장 파일럿, 실제 POS/은행/외부 예약 연동, HTTPS 운영 배포, 실제 개인정보 보관 정책 승인까지 완료했다고 주장하지 않는다.

## 앱 형태의 화면 개선

PC에서도 최대 480px의 중앙 앱 화면을 사용하고 모바일에서는 전체 너비로 표시한다. 상단 매장 정보, 화면 내부 스크롤, 고정 하단 탭과 더보기 패널로 탐색을 변경했다. 직원의 메뉴 범위는 기존 서버 권한과 일치한다. 판매·예약 정정은 브라우저 전체 대신 화면 내부를 맨 위로 이동한다.

실제 360px/1440px 브라우저 업무 흐름 테스트와 더보기 열기·닫기, PC 화면 폭 검사가 통과했다. 개발 표시 버튼이 첫 하단 탭을 가리는 문제를 발견해 공식 devIndicators 설정으로 해결했다. production 빌드와 타입 검사가 통과했으며 8개 Owner 화면, 모바일 배치, Owner/Staff 로그인 및 권한 검사를 실행하고 캡처를 갱신했다.
