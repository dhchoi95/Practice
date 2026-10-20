# 검증 출처와 독립성

자료 확인일: 2026-10-20. 패키지 버전은 실제 npm 메타데이터·설치 파일로 확인했습니다. Node 24.19.0, 해당 실행 환경 Intl/ICU를 사용했습니다.

| 자료 | 실제 사용·비교 범위 | 독립성·한계 |
|---|---|---|
| [korean-lunar-calendar 원저자 문서](https://github.com/usingsky/korean_lunar_calendar_js) 및 설치 0.4.0 소스·MIT LICENSE | 한국 음양력 변환, 윤달 유효성, 범위 | 실행용 어댑터. 자신의 변환값을 expected로 만든 비교는 독립 검증으로 세지 않음 |
| [Unicode ICU 달력](https://unicode-org.github.io/icu/userguide/datetime/calendar/) `Intl en-u-ca-dangi` | 서로 다른 29개 양력 날짜의 한국 음력 연·월·일·윤달 기대값을 직접 수집, 왕복 검사 | 한국 변환 패키지와 다른 구현/자료. 전 날짜의 정확성을 공인하지 않음. JSON에 Node·ICU 버전 포함 |
| [lunar-typescript 원저자 소스](https://github.com/6tail/lunar-typescript) 1.8.6 | 절기 표 API, UTC+8 환산, EightChar와 시간 계산 소스 의미 확인 | 실행용 절기 모델. 이 모델이 낸 시각으로 경계 동작을 검사한 것은 정책 회귀 검증으로 분리 |
| [Astronomy Engine](https://github.com/cosinekitty/astronomy) 2.1.19 `SearchSunLongitude` | 1962·1987·1988·2000·2024·2026년 × 12절입 = 72개 태양 황경 해를 독립 계산 | 별도 VSOP 모델, 90초 비교 허용치. 사주·음력 변환·초 단위 공인 시각 인증으로 확대하지 않음 |
| [IANA Asia/Seoul](https://github.com/eggert/tz/blob/main/asia) | 1961 이후 +9 표준시, 1987·1988 DST의 gap/fold 및 보정 | Intl로 실제 왕복. 역사적 표준시 변경 전체를 다루지 않아 1962년 이전 출생 제외 |
| korean-lunar-calendar의 별도 일진 테이블 | 10개 출생연도 × 1·5·12월 = 30개 날짜의 일진을 앱의 독자 JDN 식과 비교 | 일진 계산 구현에 대해 별도 오라클. 앱의 음력 변환에 대해서는 독립 자료가 아니며 연·월 사주 기준에도 사용하지 않음 |
| 직접 유도한 자정·오자둔 규칙 | 22:59·23:00·23:59·00:00·00:59·01:00의 예상 일주·시주 | 채택 정책의 수학적 검증. 외부 공인 만세력 결과로 표시하지 않음 |

`tests/fixtures/calendar-golden.json`과 `astronomy-golden.json`에는 입력·기대값·비교 가능한 필드·출처·확인일·정책·독립성 표기가 있습니다. 절기 fixture 수집 스크립트는 앱 엔진을 import하지 않습니다. 기존 fixture를 실패하는 코드에 맞춰 다시 생성하지 말고 변경 이유와 비교 출처를 검토해야 합니다.

한국천문연구원 OpenAPI는 키를 새로 요구하거나 런타임 호출하지 않았습니다. 이번 검증을 연구원 직접 조회·사주 공인 검증으로 표시하지 않습니다. Next.js 공식 문서 도메인의 요청은 환경 프록시에서 403이어서, [공식 Git 저장소의 static-exports 문서](https://github.com/vercel/next.js/blob/canary/docs/01-app/02-guides/static-exports.mdx)를 읽고 `output: export`, 정적 경로 생성, 브라우저 경계를 확인했습니다.

화면·개인정보 E2E와 계산 정확성 근거는 별개입니다. Chromium E2E 통과만으로 달력이 정확하다고 주장하지 않으며, 원고 180개 형식 검사 통과도 전문가의 의미 검토를 뜻하지 않습니다.

## 독립 검토에서 받은 ICU 예외 근거

`docs/external-review-1.0.0.md`는 사용자가 첨부한 원본입니다. 검토자는 KASI 월별 음양력 페이지의 2017년 2·3월 공개 표 59행을 확인했고, ICU 불일치 구간 2017-02-26~03-27에서는 앱 값이 맞았다고 보고했습니다. `tests/fixtures/kasi-2017-report-golden.json`은 보고서에 명시된 세 날짜의 기대값·공식 URL·조회 조건·원본 보고서 SHA-256을 보존합니다. 원본 표 59행은 첨부되지 않았으며 이번 환경의 공식 페이지 조회는 프록시 403으로 실패했습니다. 따라서 간접 전사 근거와 이번 직접 비교를 구분합니다. 기존 ICU fixture를 이 예외 날짜의 정답으로 확대 적용하지 않습니다.
