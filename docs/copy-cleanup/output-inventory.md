# 공개 출력 경로와 수정 지점

| 공개 위치 | 실제 렌더링/데이터 | 이번 처리 |
|---|---|---|
| 홈의 5개·4×2·3×3 메뉴와 카드 | `src/app/page.tsx`, `src/config/site.ts`, `src/app/globals.css` | 디자인·메뉴 배열·연결 유지. FAQ의 이전 시각 선택 설명만 표준시 안내로 수정 |
| 출생정보 입력, A/B 짝궁합 입력 | `BirthForm`, `CompatibilityEntry` | 도시·태양시 선택 제거. 대운용 성별만 선택 입력으로 유지. 새로운 위치 입력 없음 |
| 출생정보와 원국표 | `BirthSummary`, `NatalChart` | 시·일·월·년, 십신·지장간·12운성 유지. 공통 개발 문단을 없애고 실제 조건으로 선택된 일간·강약 해설 출력 |
| 오늘·내일·지정일·이달·올해 | `SectorExperience`, `SectorRadar`, `foundation/sectors.json`, `foundation/presentation.ts` | 여섯 분야·점수·그래프 유지. 구간별 원고/증감 목록과 결과 설정 출력 경로 삭제. 조립 후 추가되는 문장도 교정 |
| 신년운세 | `NewYearExperience` | 연도 선택과 전체 여섯 분야 유지. 연도별 내부 경계 반복 출력 없음 |
| 만세력/신년의 원국 상세 | `AdvancedExperience`, `advanced/natal-copy.json` | 개인 조건의 직업·재물·관계·계절 해설, 격국·용신 참고와 대운 보존. 숫자 산식·규칙 ID·연도별 구간 복제·매 문단 제안 박스 제거 |
| 성격·연애·직업/재물·대인관계·솔로·마음돌봄 | `FortuneResult`, `rules.json`, `topicBasis` | 현재 본문 유지, 출생정보 요약과 표준시 원국 일치. 별도의 풀이 이유/원고 선정 설명 제거. 미확정 일간은 중립 안내 |
| 짝궁합 결과 | `CompatibilityResult`, `compareBirths` | 두 입력 각각 표준시로 일관 계산. 같은 합·충 설명은 종류마다 한 번, 실제 해당 위치는 보존. 두 사람 출생정보 요약 유지 |
| MBTI·띠·별자리·날짜 생활 제안 | `MBTI`, `ZodiacContext`, `FortuneResult`, 기존 원고 저장소 | 실제 유형/날짜 본문 보존. 편집 배정/검토 버전 등 기계적인 설명과 중복 안내 축약 |
| 인쇄/PDF·공유·오류·입력 삭제 | `usePrintDetails`, `ShareActions`, 각 결과 분기 | 실제 문단·원국 인쇄와 접힘 복원 유지. 개인 결과를 링크나 서버에 보내지 않음 |
| 이용안내·개인정보·용어집 | `content/pages.ts`, `content/glossary.ts` | 철회된 도시/태양시 선택과 5년 세운 화면 안내 수정. 삭제한 개발 문단을 새로 옮기지 않음 |

`AdvancedControls.tsx`, `CalculationDetails.tsx`는 더 이상 쓰는 공개 경로가 없어 삭제했습니다. CSS로 감추거나 다른 토글로 이동한 것이 아닙니다. 태양시·절입·기간 분할·대운·합충 계산과 원본 규칙/내부 검증 기록은 남겼습니다. 과거 기간 해설 136개는 이번 일반 결과에서 사용하지 않습니다.

이전 입력은 문서 메모리에만 있고 localStorage·sessionStorage·쿠키로 복원하지 않습니다. 남아 있는 메모리의 비표준시 상태는 `generalSession`에서 도시 설정을 제거하고 표준시로 재계산합니다. 원국·일간·분야·대운·궁합이 같은 입력을 사용하고, `SessionProvider`가 전환 안내를 한 번 제공합니다. 시간 모름은 00:00으로 바꾸지 않으며 대운 성별을 추정하지 않습니다.
