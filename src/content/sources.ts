export const sources=[
  {id:'original-editorial',title:'서비스 독립 창작 원고',url:null,note:"관찰과 생활 제안을 독립 작성했습니다. 외부 고전·전문가의 검토 완료를 주장하지 않습니다."},
  {id:'traditional-mapping',title:'공개한 상징·오행·음양 대응 정책',url:null,note:"전통적 상징에 기반한 이 서비스의 해석 출발점입니다. 계산 정책과 실제 테이블을 확인할 수 있으며 개인 성격의 과학적 판정이 아닙니다."},
  {id:'korean-lunar-calendar',title:'한국 음양력 변환 원저자',url:'https://github.com/usingsky/korean_lunar_calendar_js',note:"날짜 변환에만 사용하며 사주 전체의 공인 근거가 아닙니다."},
  {id:'lunar-typescript',title:'절기 자료 원저자',url:'https://github.com/6tail/lunar-typescript',note:"UTC+8 절기 시각을 순간으로 환산해 사용합니다. 사주 원고의 검토 근거로 쓰지 않습니다."},
  {id:'iana-tz',title:'IANA Time Zone Database',url:'https://www.iana.org/time-zones',note:"한국 출생 시계의 서머타임·표준시 처리에만 사용합니다."},
] as const;
export const sourceIds=sources.map(s=>s.id) as readonly string[];
