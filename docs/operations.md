# 운영 및 개발 환경 안내

이 문서는 개발자가 환경을 재현하고 운영자가 데이터베이스를 보존하기 위한 안내다. 비밀번호, 인증 키, 실제 환경 변수 값은 저장소에 기록하지 않는다. 예시는 개발 환경용이며 운영 배포 전 HTTPS, 접근 제한, 백업 보관 정책을 별도로 적용한다.

## 구성 요소

- 웹 앱: Next.js App Router, TypeScript
- 데이터베이스: PostgreSQL 17 계열
- ORM: Prisma 7 및 PostgreSQL `adapter-pg`
- 인증: credentials, bcryptjs 해시, 서명 JWT 쿠키
- 애플리케이션은 POS, 은행 또는 예약 서비스의 외부 API를 필요로 하지 않는다.

Node.js 24와 npm을 사용한다. `.env.example`은 필요한 변수의 이름만 보여준다. 저장소의 `.env`는 무시되며, 실제 DB URL과 세션 키를 포함할 수 있으므로 열람·출력·커밋하지 않는다. 이 클라우드 환경의 실제 런타임 설정과 보관된 백업은 checkout 밖 `/workspace/.local/practice`에 저장된다.

## 최초 설치와 실행

1. 기존 checkout을 사용하고 별도 Git worktree를 만들지 않는다.
2. `python scripts/cloud-start-db.py`로 PostgreSQL을 시작하거나 준비한다. 첫 실행은 필요한 보호된 런타임 설정을 만들며, helper는 고정된 공식 이미지 digest, SQL readiness 확인, 기존 데이터 보존을 사용하고 DB 포트를 loopback에만 노출한다. 기존 DB가 비어 있고 검증된 백업이 있으면 복구한다.
3. 저장소 루트에서 `python scripts/prepare-local-env.py`를 실행한다. 이 helper는 기존 값을 보존하고 누락된 개발용 데모 변수를 생성해 권한 제한된 무시 파일에 기록한다. 비밀값은 화면에 표시하지 않는다.
4. `npm ci`로 lockfile 기준 의존성을 설치한다. PostgreSQL 17 개발 DB는 `.env`의 `DATABASE_URL`로 접근하고 세션 서명 키는 `AUTH_SECRET`에서 읽는다. 두 값은 터미널 인자, 로그, Git에 기록하지 않는다.
5. `npm run db:generate`로 Prisma Client를 생성한다. `npm run db:validate`로 Prisma 스키마를 확인한다. 승인된 migration을 `npm run db:migrate:deploy`로 개발 DB에 적용하고 `npm run db:migrate:status`로 상태를 확인한다. 필요한 경우 `.env`의 `DEMO_EMAIL`, `DEMO_PASSWORD`, `DEMO_STAFF_EMAIL`, `DEMO_STAFF_PASSWORD`를 설정하고 `npm run db:seed`를 개발 DB에서만 실행한다. Seed는 빠진 demo 계정과 sample 자료를 생성하지만 기존 계정의 비밀번호를 바꾸지 않는다. 운영 DB에는 사용하지 않는다.
6. `npm run dev -- --hostname 127.0.0.1 --port 3000`으로 실행한다. 이 환경에서 앱은 `http://127.0.0.1:3000`을 canonical Origin으로 사용한다. 로그인과 변경 요청은 `APP_URL`과 Origin을 비교하므로 접속 주소를 일관되게 유지한다. 배포할 때는 `APP_URL`을 실제 canonical HTTPS origin으로 지정한다. 개발 서버는 외부 네트워크에 공개하지 않는다.

현재 cloud checkout에서 위 단계를 순서대로 적용하는 convenience script는 `bash scripts/cloud-install.sh`이다. 앱을 빌드하고, seed 및 backup/restore 검증을 포함해 설정한다. 각 작업을 별도로 검토할 때는 위 명령을 사용한다.

기본 코드 검사는 `npm run typecheck`, `npm test`, `npm run build`다. E2E 브라우저 검사는 `npm run test:e2e`를 사용한다. 스크립트가 `scripts/prepare-test-env.py`를 호출해 전용 `practice_test` 데이터베이스에 migration을 적용하므로, 운영 및 개발 DB와 분리된 테스트 DB를 사용한다. 테스트 DB를 임의로 개발/운영 DB로 지정하지 않는다. E2E는 기존 데이터를 삭제하거나 개발 DB를 reset하지 않는다. 이 안내만으로 실행 결과를 보증하지 않으며 각 변경 후 해당 명령의 결과를 확인한다. 앱 포트나 테스트 계정 비밀번호는 여기 고정하지 않는다.

## 마이그레이션 및 배포 주의

운영 배포는 검토된 빌드와 환경별 비밀 설정을 사용한다. 인증 서명 키는 강한 무작위 값으로 생성해 안전한 환경 설정에 보관하고 개발·스테이징·운영에서 재사용하지 않는다. 쿠키는 HTTPS에서만 Secure로 설정한다. 공개 가입과 기본 비밀번호를 두지 않는다. 배포 빌드는 `npm run build`, 서비스 시작은 `npm run start`를 사용한다. 스키마 변경은 먼저 `npm run db:migrate -- <migration-name>`으로 새 마이그레이션 파일을 생성하고 SQL을 검토해 커밋한다. 운영에는 `npm run db:migrate:deploy`로 승인된 migration만 적용한다. seed를 운영 DB에서 실행하지 않는다.

Prisma 7.10이 설치 단계에서 내려받는 기본 native schema engine binary는 이 클라우드 환경에서 허용된 네트워크 대상으로 제공되지 않는다. 이를 위해 저장소의 `scripts/prisma-wasm.cjs`가 lockfile로 검증된 Prisma 7.10 WASM 구성요소 API를 호출한다. schema engine WASM 파일은 공식 npm 패키지에서 가져와 해시 일치 여부를 확인하고 예상 경로에 복사한다. 이 경로는 TLS·체크섬 검증을 끄거나 엔진 코드를 수정하지 않는다. 스크립트는 Prisma 7.10 내부 API와 생성기 레지스트리에 맞춰 작성되어 있으므로 Prisma 관련 패키지는 lockfile과 함께 버전을 고정한다. 마이그레이션 생성은 별도 shadow DB 연결로 공식 `migrateDiff` 흐름을 사용한다. PostgreSQL 카탈로그 조회에서만 드라이버가 누락한 내부 `char` 타입 식별자를 텍스트 메타데이터로 정규화한다. 이는 스키마 SQL이나 앱 데이터 값·타입을 변경하지 않는다. 생성 명령은 새 SQL 파일만 만들며 현재 DB에 적용하지 않으므로 파일을 검토한 뒤 별도로 deploy 한다. Prisma CLI의 native engine 기반 `npx prisma` 명령은 이 환경의 기본 절차로 사용하지 않는다.

현재 lockfile에서 운영 의존성 검사 `npm audit --omit=dev`는 취약점을 보고하지 않는다. `deepmerge-ts@8.0.2`와 `mysql2@3.24.5` 고정은 수정 가능한 간접 의존성 advisory를 해소한다. 전체 개발 의존성 audit은 dependency chain에서 여섯 건을 보고하며, 남은 수정되지 않은 advisory는 공식 Prisma 생성기 도구 체인에 포함되는 `braces@3.0.3`이다. Prisma의 trusted glob patterns 범위에서 발생하며 런타임 운영 dependency tree에는 포함되지 않는다. 개발 의존성 트리를 업그레이드할 때 advisory 상태를 다시 확인하고, 이 내부 도구 체인을 부분적으로 바꿔 개별 Prisma 패키지 버전만 올리지 않는다.

DB 스키마 변경 전 백업을 확인하고, 운영 데이터에 seed/reset 명령을 실행하지 않는다. 마이그레이션은 앱 시작 때 임의로 실행하지 말고 배포 과정에서 한 번 명시적으로 적용한다. 이전 앱 버전과 호환되지 않는 파괴적 변경은 백업 및 복원 계획과 함께 단계적으로 배포한다. 운영 DB 포트는 공개 인터넷에 노출하지 않는다.

## 백업 및 복구

이 cloud 환경의 개발 DB는 `python scripts/cloud-verify-backup.py`로 백업하고 격리된 임시 PostgreSQL DB에 복원해 검증한다. 스크립트는 현재 테이블 목록과 모든 테이블의 행 개수 및 SHA-256 digest를 복원본과 비교하며, 복원 DB를 마지막에 삭제한다. 실행이 성공하면 민감한 dump는 권한 `0600`으로 `/workspace/.local/practice/backups`에 보관되고 그 옆 manifest에는 dump checksum과 비교용 테이블 요약이 저장된다. 이 helper는 dump를 암호화하지 않으므로 디렉터리를 신뢰된 비밀 저장소로 취급하고, 운영 백업은 암호화된 원격 저장소에 보관한다. 최종 검증에서는 25개 테이블, 29개 행의 모든 digest가 일치했다. 이는 해당 DB snapshot의 검증이며 실시간 운영 백업 자동화 또는 정기 보존 정책이 설정됐다는 뜻은 아니다.

새 빈 개발 DB에서 검증된 백업 복구 fallback을 실제로 시험하려면 `python scripts/cloud-start-db.py --verify-restoration`을 실행한다. 이 옵션은 자체 이름의 임시 DB를 만들고 manifest checksum 및 전체 행 digest를 대조한 뒤 그 임시 DB를 삭제한다. 원래 개발 DB에 덮어쓰지 않는다. 애플리케이션 배포 환경에서는 같은 원칙으로 별도의 빈 복구 DB에 복원하고, 서비스별 자격증명과 승인 절차를 사용한다. helper는 이 repository의 단일 cloud PostgreSQL 설정 전용이며 다른 host/cluster 운영 백업 도구를 대체하지 않는다.

복구 순서:

1. 장애 범위와 복구 시점을 정하고 앱의 쓰기를 중지한다.
2. 격리된 빈 PostgreSQL DB로 선택한 백업을 복원한다.
3. 앱의 DB 연결을 복원 DB로 설정하고 필요한 마이그레이션 호환성을 확인한다.
4. 로그인, 매장 멤버십, 판매 합계, 재고 잔고와 원장, 예약을 점검한다.
5. 승인된 복구 DB를 운영 연결로 전환하고 쓰기를 재개한다.

백업 helper는 현재 snapshot을 별도 DB로 검증하지만 자동 주기 실행, 장기 보존, 원격 저장, key rotation은 설정하지 않는다. 운영 전에는 보존 기간, 암호화 키 관리, 복구 시점 목표, 담당자를 정하고 고객 연락처 등 개인정보가 든 백업에 매장 데이터와 같은 접근 제한 및 삭제 기한을 적용한다.

## 문제 진단

- DB 연결 실패: 서비스 상태와 연결 변수의 존재 여부를 확인하되 변수 값을 출력하지 않는다.
- 인증 실패: 계정 활성 상태, 활성 StoreMember, 역할을 확인한다. 인증 토큰/비밀번호를 로그에 남기지 않는다.
- 재고/매출 불일치: 수동 DB 수정 대신 관련 거래와 조정 이력을 조사하고 보정 이력을 남긴다.
- 복원 실패: 원본 백업을 덮어쓰지 말고 별도 복사본으로 재시도한다.

## 현재 cloud checkout의 검증 기록

- `python scripts/cloud-start-db.py`가 데이터베이스 readiness와 실제 `SELECT 1`을 확인하고 기존 데이터를 유지했다.
- `scripts/prisma-wasm.cjs`를 통한 client 생성, 스키마 검증, 초기 migration 생성·배포, 반복 deploy, 상태 확인, 변경 없는 재실행을 확인했다.
- `bash scripts/cloud-install.sh`가 종료 코드 0으로 완료되어 `npm ci`(309 packages), client 생성, 스키마 검증, migration deploy/status, seed, production build, 백업 검증을 실행했다. DB startup helper도 검증된 백업 복구 fallback을 별도 빈 DB에서 시험하고 임시 DB를 제거했다.
- `python scripts/cloud-verify-backup.py`가 25개 테이블, 총 29개 행을 별도 임시 DB로 복원했고 모든 테이블의 행 digest가 일치했다. dump와 checksum manifest는 checkout 밖에 보관된다.
- 브라우저 화면 캡처는 [데스크톱 로그인](../artifacts/login-desktop.png), [데스크톱 대시보드](../artifacts/dashboard-desktop.png), [모바일 대시보드](../artifacts/dashboard-mobile.png), [모바일 재고](../artifacts/inventory-mobile.png)에 있다. 캡처는 화면 확인 증거이며 자동 인수 테스트의 통과를 뜻하지 않는다.
- 재현 설치 이후 최종 테스트 결과: Vitest7/7, Playwright19/19(API18 + 실제 브라우저 흐름1), TypeScript typecheck 종료0, production build 통과. E2E는 별도 `practice_test` DB에서 수행했다. production smoke는 Owner8개 화면·360px layout·Owner/Staff 로그인·Staff 금액 API403을 실제 브라우저로 확인했다. 화면·환경·백업 검증은 테스트 결과와 별개의 증거다.
- 재사용 환경의 `install_script`와 `start_skill` draft 저장 성공을 확인했다. 저장은 게시와 다르다. 환경 게시 및 새 cloud task로의 복원은 실행하지 않았다.
