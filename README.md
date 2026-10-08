# 버거 매니저

햄버거 메뉴 1종을 판매하는 매장의 사장님과 직원 1명을 위한 한국어 매장 관리 웹입니다. PC와 모바일 브라우저에서 같은 앱 형태의 화면을 사용하며 PostgreSQL에 기록을 저장합니다. PC에서도 최대 480px의 중앙 화면과 하단 탭으로 관리합니다. 오늘·매출·재고·예약을 바로 열고 발주·시설·비용·설정은 더보기에서 엽니다. 직원은 허용된 메뉴만 표시됩니다.

## 할 수 있는 일

- 하루 합산 판매, 정정, 환불과 레시피 기반 재고 자동 차감
- 입고·사용·폐기·실사, 최소보유량·목표량·포장단위 설정
- 미입고 발주를 고려한 추천, 발주 초안·확정·부분 입고
- 외부에서 받은 예약 등록, 테이블 배정과 중복 시간 검사
- 시설 이상 접수, 처리 이력과 수리비 기록
- 수입·비용 기록, 월별 집계와 정정 원장
- 직원 초대, 역할·활성 상태 관리와 매장별 접근 제한

실제 POS·은행·예약 플랫폼·수리업체 연결은 추가 개발 대상입니다. 현재 데모 POS는 테스트용이며 공급업체에 발주를 전송하지 않습니다.

## 이 클라우드 환경에서 실행

Node.js 24, Python 3, Docker와 PostgreSQL 17을 사용합니다. 기존 `/workspace/Practice` checkout에서 실행하세요.

```bash
python scripts/cloud-start-db.py
python scripts/prepare-local-env.py
npm ci
npm run db:generate
npm run db:migrate:deploy
npm run db:seed
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

로그인 계정은 로컬의 보호된 `.env`에 있는 `DEMO_EMAIL` / `DEMO_PASSWORD`와 `DEMO_STAFF_EMAIL` / `DEMO_STAFF_PASSWORD`를 사용합니다. 파일을 출력하거나 공유·커밋하지 마세요. 초기 준비 스크립트가 개발용 무작위 비밀번호를 만들고 seed는 기존 비밀번호를 바꾸지 않습니다. 기본 계정과 데모 데이터 생성은 개발 DB 전용입니다.

개발 중에는 `npm run dev -- --hostname 127.0.0.1 --port 3000`을 사용합니다. 접속 Origin과 `APP_URL`이 같아야 로그인과 변경 요청이 성공합니다. 공개 서비스에는 실제 HTTPS 주소와 별도 운영 비밀 설정이 필요합니다.

## 검증

```bash
npm run db:validate
npm run typecheck
npm test
npm run test:e2e
npm run build
python scripts/cloud-verify-backup.py
python scripts/cloud-start-db.py --verify-restoration
```

E2E는 별도 `practice_test` DB를 준비하고 전용 임시 계정·매장을 사용합니다. 이 클라우드에 설치된 Chromium을 이용합니다. 개발 DB를 reset하지 않습니다. 백업 검증은 격리된 임시 DB에 복원해 전체 테이블 행 digest를 비교합니다.

## 문서와 실제 화면

- [요구사항](docs/requirements.md), [설계](docs/design.md), [검증 계획](docs/test-plan.md)
- [실행·백업 안내](docs/operations.md), [결정·수정 기록](docs/decisions-and-defects.md)
- [데스크톱 대시보드](artifacts/dashboard-desktop.png), [모바일 대시보드](artifacts/dashboard-mobile.png), [모바일 재고](artifacts/inventory-mobile.png)

캡처와 실제 환경 설정은 Git에 포함하지 않습니다. 화면은 입력된 기록을 보여주므로 첫 실행의 매출은 미입력, 예약은 0건입니다. 데모 재료·공급업체·테이블·시설은 초기 seed로 준비됩니다.
