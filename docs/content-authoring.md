# 풀이 문장 수정하기

원고 파일은 `src/content/rules.json`입니다. 방문자 정보가 아닌 문장·조건 데이터이며 Git으로 변경 이력을 관리합니다. CMS·DB·로그인이 필요 없습니다. 구조는 `domain/interpretation/schema.ts`, 조회 교체 지점은 `ContentRepository`입니다.

1.1.0의 기본·기간·천간 관계 원고 135개는 `evidence`를 사용합니다. `basisKey`는 `interpretation-bases.json`의 실제 계산 전제에 연결하며, `rationale`은 해석 확장 이유, `counterExample`은 적용되지 않을 수 있는 사례, `limitation`은 범위를 적습니다. 원고 조건이 근거의 전제를 보장하지 않으면 검증에 실패합니다. `any`의 한 분기만 근거를 만족하는 조건도 허용하지 않습니다.

관계 보완의 `rankingFeature`는 근거와 같은 확정 천간 집계여야 하고 `requires`에 일간과 해당 집계가 있어야 합니다. priority가 같은 관계 보완 후보는 같은 독점 그룹 안에서 개수가 많은 순으로 고릅니다. 동수이면 specificity·ID 순서입니다. 개수를 성향의 강도로 바꾸어 설명하지 않습니다.

오행 상징·개수의 공통 설명은 `src/content/element-explanations.json`의 5개 모듈입니다. 35개 주제별 보완 원고에서 `sharedExplanationId`로 참조하며 조건별 원고 수에 합산하지 않습니다. 각 보완 원고는 공통 설명을 제외하고도 해당 주제의 상황·관찰 질문·실천 제안이 있어야 합니다. 원고 수는 의미상 독립성의 증명이 아니며, `reports/content-inventory.json`에 조건별 원고·공통 모듈·주제별 수를 나누어 기록합니다.

## 기존 문장을 하나 고치기

1. 예를 들어 `core-love-0` ID를 찾습니다.
2. `paragraphs`의 문장이나 `practicalTips`의 행동 제안을 수정합니다. 별명·입력을 넣은 HTML은 작성하지 않습니다.
3. `updatedAt`, `contentVersion`과 `siteConfig.contentVersion`을 올리고 변경 기록을 남깁니다. 버전이 같은 결과를 조용히 바꾸지 않습니다.
4. `reviewStatus`는 실제 상태만 기록합니다. 자동 검사 통과는 `automated-checked`, 사람 검토를 실제 받았을 때만 `human-reviewed`입니다. `draft`는 배포 저장소에서 제외합니다.

## 주제 문단 추가 예시

다음은 기존 레코드를 참고해 작성할 수 있는 예시입니다. ID를 중복시키지 말고 실제로 준비한 본문을 충분히 작성하세요.

```json
{
  "id": "personality-expression-example",
  "system": "saju",
  "category": "personality",
  "section": "detail",
  "title": "표현을 경험으로 돌아봐요",
  "conditions": {
    "all": [
      {"feature": "natal.dayStem", "op": "in", "value": [2, 3]},
      {"feature": "relations.output", "op": "gte", "value": 1}
    ]
  },
  "requires": ["natal.dayStem", "relations.output"],
  "priority": 40,
  "specificity": 2,
  "exclusiveGroup": "personality-expression",
  "semanticAxis": "expression-general",
  "stance": "situational",
  "paragraphs": [
    "내 생각을 밖으로 전했을 때 도움이 됐던 경험을 떠올려 보세요. 이 조건은 대화의 속도를 확정하는 판정이 아니라 관찰의 출발점이에요.",
    "말이 잘 통했던 상황과 전달이 어려웠던 상황을 구분하면, 나에게 편한 표현 방법을 더 구체적으로 찾을 수 있어요."
  ],
  "practicalTips": ["설명할 때 상대가 알고 있는 예시를 하나 더해 보세요."],
  "relatedGlossaryKeys": ["day-master", "ten-gods"],
  "provenance": {
    "kind": "original-editorial",
    "sourceIds": ["original-editorial"],
    "note": "이 서비스에서 작성한 관찰과 생활 제안이며 독립 명리 검토 완료가 아니에요."
  },
  "reviewStatus": "automated-checked",
  "contentVersion": "1.0.1",
  "updatedAt": "2026-10-20"
}
```

feature는 `domain/saju/types.ts`의 허용 목록만 사용합니다. `eq/in/gte/lte`, `all/any`만 허용하며 중첩 4단계, 그룹 길이 12개가 상한입니다. 누락·null은 unknown이며 false/0으로 간주하지 않습니다. 필요 값은 반드시 `requires`에 넣습니다. 모든 조건은 데이터이며 JavaScript·eval·함수를 실행하지 않습니다.

## 충돌과 선택

기본 순서는 priority → specificity → ID입니다. 같은 `exclusiveGroup`은 하나만 남습니다. `semanticAxis`가 같고 `stance`가 다르면 낮은 우선순위 문장을 버립니다. 예를 들어 상황 설명 없이 표현이 빠르다/느리다를 함께 선택하지 않도록 같은 축에 반대 stance를 둡니다. 다른 상황에 대한 설명은 축을 구분하고 문장에 상황을 명시합니다.

정확히 같은 문단·조언은 중복 제거하지만 비슷한 뜻을 완전히 찾아내지는 못합니다. 1.1.0 기본 원고는 반복 소개를 제거했으므로 종합사주에서 다른 주제를 요약할 때 첫 두 문단을 사용합니다. 종합 본문은 1,800자 안에서 문단 단위로 고릅니다.

`content:lint`는 오행 보완 35개에 대해 주제명·오행명을 치환한 동일 본문과 12글자 조각의 Jaccard 유사도 0.75 이상도 실패시킵니다. 선정한 오행·십성 명사의 받침에 맞지 않는 조사도 검사합니다. 이는 알려진 반복과 조사 오류를 찾는 제한된 검사이며, 뜻의 독립성이나 전체 한국어 문법 검토를 보장하지 않습니다. 일간 확정을 전제하는 문장은 `requires`에 `natal.dayStem`을 넣어야 합니다. 시간 미상만으로 일간을 확정했다고 가정하지 마세요.

## 실제 검사와 미리보기

```bash
npm run content:validate
npm run content:lint
npm run content:coverage
npm run content:preview
npm run content:evaluate
npm test
```

`reports/content-preview.json`에서 10일간·연령대·시간 미상·양/음력·윤달·입춘·서머타임 합성 프로필 결과를 읽습니다. 실명·실제 방문자 출생정보를 검토 파일에 넣지 마세요. 원고 순서를 바꿔도 같은 결과가 나오는지 통합 테스트가 확인합니다. 형식 검사는 의미·의학·명리 검토를 대신하지 않습니다.

새 출처는 `content/sources.ts`의 sources와 출처 페이지에 실제 확인한 자료로 추가합니다. 관련 용어 키는 `/glossary/#해당키`에 존재해야 합니다. 확인하지 않은 고전·쪽수·전문가 인용을 쓰지 않습니다.

[반복 개선 방법](content-improvement-method.md)에 피드백·근거 자료·평가 사례·독립 검토의 연결을 정리했습니다. `content:evaluate`는 기본·기간·관계·오행 보완의 유사 원고와 36자 이상 문장의 세 원고 이상 반복도 검사합니다. 자동 통과는 의미의 정확성 점수가 아닙니다.

## 나중에 DB로 옮긴다면

권장 엔티티는 `rules`, `rule_conditions`, `paragraphs`, `tips`, `sources`, `releases`입니다. 조건과 원고 순서·검토 상태·버전을 보존하고 `ContentRepository`만 교체합니다. 방문자 입력 테이블을 추가할 필요는 없습니다. 배포 전에 검사한 정적 데이터로 내보내면 현재의 낮은 운영 비용을 유지할 수 있습니다.
