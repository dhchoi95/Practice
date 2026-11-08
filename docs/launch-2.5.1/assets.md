# 그림·글꼴·공유 이미지 기록

- 기존 `src/components/Illustration.tsx`, `public/favicon.svg`, `public/og.svg`의 프로젝트 SVG와 색상 구성을 유지했다. 첨부한 릴스 사진이나 타사 캐릭터를 사이트 자산으로 복제하지 않았다.
- `og.svg`의 문구를 실제 브랜드 “하루사주 / 무료 사주와 오늘의 운세 / 기본 운세는 가입·결제 없이 이용해요”로 바꿨다. `scripts/render-og.mjs`로 1200×630 PNG를 로컬 Chromium에서 렌더했다. 유료 이미지 생성 API나 외부 그림·폰트 다운로드는 사용하지 않았다.
- 이 환경의 한국어 serif 매칭은 `/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc`(Noto Serif CJK KR)다. `/usr/share/doc/fonts-noto-cjk/copyright`의 해당 폰트 SIL-1.1 항목을 확인했다. 글꼴 바이너리를 public에 복사/배포하지 않았다. 사이트 본문은 이용자 기기의 시스템 글꼴 스택을 사용한다.
- 공개 패키지 고지는 `THIRD_PARTY_NOTICES.md`와 `public/third-party-notices.txt`를 유지한다. 라이선스 확인을 법률 검토 완료라고 표시하지 않는다.
