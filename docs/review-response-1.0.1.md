# 독립 검토 수정 대응 — 콘텐츠 1.0.1

2026-10-20. 접수한 원본은 [외부 검토 보고서](external-review-1.0.0.md)입니다. 아래는 구현자의 수정·재검증 기록이며 독립 재검토의 통과 판정을 대신하지 않습니다. 공개 배포는 실행하지 않았습니다.

| 지적 | 수정한 동작과 근거 파일 | 회귀 확인 |
|---|---|---|
| F-01 / P1 일간 미확정 본문 모순 | `rules.json`의 unknown-general/personality/single에 natal.dayStem 필수 조건 추가. `engine.ts`에서 일간 미확정 중립 안내 제공. `FortuneResult.tsx`에서 해석 불가능한 기간에 앞/뒤 구간의 풀이를 만들지 않음 | 1987-06-01 양력·시간 미상의 실제 계산으로 10개 사주 메뉴 본문 검사. 브라우저에서 성격·솔로·종합·연간 메뉴 확인 |
| F-02 / P1 오행 보완의 주제 치환 반복 | `rules.json`의 35개를 주제별 상황·관찰 질문·행동으로 다시 작성. `element-explanations.json`의 공통 설명 5개를 별도 참조·집계 | 주제명·오행명 치환 후 동일/유사 템플릿 검사. 수정 전 묶음에서 유사 쌍 105개 탐지, 수정 후 0개. 실제 의미 차이는 추가 편집 검토 필요 |
| F-03 / P2 조사 오류 | 저장 원고의 오행·십성 조사를 수정. `quality.ts`와 콘텐츠 lint에 선정 명사의 받침/조사 검사 추가 | 잘못된 예문과 올바른 예문·부분문자열 오탐 방지 테스트. 현재 원고와 공통 설명에서 선정 패턴 0개 |
| F-04 / P2 다음 해 연도 누락 | `period.ts`가 모든 구간의 양 끝에 연도를 표시 | 2026-12-31 기준 연간·월간·일간 종료가 2027년 1월 1일임을 확인. 실제 연간 PDF에도 다음 해 표시 |
| F-05 / P2 닫힌 상세 인쇄 누락 | `lib/print.ts`가 native beforeprint 때 상세를 펼치고 afterprint 때 각 원래 상태 복원. 버튼과 브라우저 메뉴/단축키에 동일 처리 | 열린/닫힌 실제 PDF 각각 생성. 표·계산 표준시·개수·강약/용신 아님 안내 포함 및 텍스트 동일. 반복 이벤트와 상태 복원 검사 |
| F-06 / P2 별자리 날짜 10px | 기준 날짜를 14px로 확대, 2열 배치, 280px 이하 1열 | 195·320·390px 실제 캡처 및 넘침·라디오 선택·제출 확인. 날짜 글자 200% 확대 검사 |

수정한 소스는 `src/domain/interpretation/`, `src/domain/fortune/period.ts`, `src/content/`, `src/lib/print.ts`, `src/components/FortuneEntry.tsx`, `FortuneResult.tsx`, `src/styles/globals.css`에 있습니다. 회귀 코드는 `tests/integration/interpretation.test.ts`, `tests/domain/calendar.test.ts`, `tests/e2e/site.spec.ts`입니다.

## 실제 실행 결과

- `npm run verify`: lint·strict TypeScript·단위/통합 192개·콘텐츠 lint·coverage 통과.
- `npm run build`: 정적 export 성공, 생성 작업 36개.
- `npm run test:e2e`: Chromium 50개 통과, 실패/skip 없음.
- `npm run content:preview`: 합성 프로필 미리보기 갱신.
- `python3 scripts/verify-print-pdfs.py`: PDF 3개 텍스트 포함 검사 통과, 닫힘/열림 출력 동일.
- 원고 180개와 공통 설명 5개를 구분. 63개 합성 프로필 × 10개 사주 메뉴, 가벼운 유형 28개, 10일간 10/10, coverage 실패 0.
- 현재 캡처 13개: 홈/입력/결과의 375·390·1440px 9개, 별자리 195·320·390px 3개, 일간 미확정 390px 1개.

실행 로그는 `reports/revision-verify.log`, `revision-build.log`, `revision-e2e.log`, `revision-preview.log`, 출력 검사는 `reports/print-verification.json`입니다. `reports/content-inventory.json`, `content-coverage.json`, `content-preview.json`에 집계와 합성 결과를 보존했습니다. 정적 서버로 실제 `out/`를 검사했습니다.

## 달력 예외와 남은 검토 범위

ICU Dangi에 맞추어 앱 달력을 변경하지 않았습니다. 원본 검토자가 KASI로 확인한 2017-02-26·03-27·03-28 기대값을 출처·조회 조건·보고서 SHA-256과 함께 fixture로 전사하고 양/음력 역변환을 검사했습니다. 이번 환경의 공식 페이지 직접 조회는 프록시 403으로 실패했습니다. 원본 표 59행은 제공되지 않았으므로 직접 재조회 검증으로 표시하지 않습니다.

외부 검토자의 23,669일/1,068절입 전체 비교와 이번 저장소의 29개 ICU 날짜/72절입/3개 보고서 날짜 회귀 검사를 구분합니다. 원고는 automated-checked 상태이며 독립 명리·한국어 의미 검토 완료로 변경하지 않았습니다. semanticAxis/stance 충돌 기능은 합성 규칙 테스트이며 실제 원고 전체의 의미 검증이 아닙니다.

기존 1.0.0 Lighthouse 실측은 날짜와 범위를 보존했고 이번 수정에서는 다시 측정하지 않았습니다. 실제 iOS/Android 인스타그램 인앱 브라우저, OS 인쇄 UI, 공개 호스팅은 미검증입니다. 공개 전 운영 항목과 독립 재검토는 여전히 필요합니다.

이전 전달 자료는 `/workspace/review-delivery/`에 보존하고 이번 자료는 `/workspace/review-delivery-v1.0.1/`로 분리합니다. 검토자에게는 새 묶음과 이 대응표를 함께 주고, 우선 원래 여섯 지적이 해소됐는지 확인하도록 요청하세요. Git 커밋·GitHub push·외부 전달은 실행하지 않았습니다.
