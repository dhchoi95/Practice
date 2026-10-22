export const siteConfig = {
  name: '하루사주',
  description: '브라우저에서 계산하는 무료 사주와 운세. 가입 없이 이용하고, 입력정보는 새로고침하면 사라져요.',
  // 운영 도메인 확정 후 NEXT_PUBLIC_SITE_URL에 https://실제도메인을 설정하세요.
  url: process.env.NEXT_PUBLIC_SITE_URL || '',
  instagram: '',
  contentVersion: '1.4.0',
  advancedContentVersion: '2.0.0',
};
export const categories = [
  {slug:'saju', name:'정통사주', short:'사주표와 기본 풀이', description:'입력한 날짜와 시각으로 사주표를 계산하고, 일과 관계에 관한 생활 제안을 읽어요.', system:'saju', content:'general', icon:'book', color:'sand'},
  {slug:'personality', name:'성격풀이', short:'내 경험과 비교하는 성격 이야기', description:'전통적인 상징에 빗댄 글을 내 경험과 비교해 봐요. 실제 성격을 판정하는 검사는 아니에요.', system:'saju', content:'personality', icon:'tree', color:'blue'},
  {slug:'love', name:'연애사주', short:'바라는 것을 전하는 대화', description:'바라는 것을 말하고 상대가 원하는 방식도 듣는 대화를 생각해 봐요.', system:'saju', content:'love', icon:'knot', color:'pink'},
  {slug:'career-money', name:'직업·재물', short:'맡은 일의 범위와 실제 비용', description:'맡은 일을 나누고, 일정과 실제 비용을 살피는 방법을 읽어요.', system:'saju', content:'careerMoney', icon:'mountain', color:'sand'},
  {slug:'relationships', name:'대인관계', short:'말과 역할을 나누는 방법', description:'서로 다른 말투와 의견을 듣고, 함께하는 역할을 나누는 방법을 읽어요.', system:'saju', content:'relationships', icon:'birds', color:'green'},
  {slug:'single', name:'솔로사주', short:'새로 알아가는 사람과의 대화', description:'새로 사람을 알아갈 때 취향과 원하는 만남의 방식을 이야기해 봐요.', system:'saju', content:'single', icon:'flower', color:'peach'},
  {slug:'mind', name:'마음돌봄', short:'식사와 휴식, 도움을 구하는 방법', description:'일상에서 쉬는 방법과 도움을 구하는 일을 생각해 봐요. 진단이나 치료를 대신하지 않아요.', system:'saju', content:'mind', icon:'tea', color:'lilac'},
  {slug:'year', name:'올해 운세', short:'절기 구간별로 읽는 한 해', description:'양력 한 해를 입춘 전후로 나누어 각 구간의 생활 제안을 읽어요.', system:'saju', content:'year', icon:'calendar', color:'sand'},
  {slug:'month', name:'이번 달 운세', short:'이번 달의 일정과 생활 제안', description:'양력 이번 달을 절입 전후로 나누어 일정과 생활 계획에 참고해요.', system:'saju', content:'month', icon:'moon', color:'blue'},
  {slug:'day', name:'오늘 운세', short:'오늘의 계획에 참고할 이야기', description:'한국시간 오늘의 간지와 내 일간의 관계에 빗댄 생활 제안을 읽어요.', system:'saju', content:'day', icon:'sun', color:'peach'},
  {slug:'zodiac', name:'띠별운세', short:'띠를 소재로 읽는 오늘 이야기', description:'한국 음력 설 기준의 열두 띠 이야기와 오늘의 작은 조언이에요.', system:'zodiac', content:'day', icon:'rabbit', color:'green'},
  {slug:'constellation', name:'별자리운세', short:'별자리로 읽는 가벼운 이야기', description:'익숙한 열두 별자리의 성향 이야기예요. 정밀한 출생점성술과는 달라요.', system:'constellation', content:'day', icon:'stars', color:'navy'},
  {slug:'blood-type', name:'혈액형풀이', short:'성격 검사가 아닌 대화 소재', description:'혈액형을 대화 소재로 삼은 가벼운 읽을거리예요. 과학적인 성격 검사는 아니에요.', system:'bloodType', content:'personality', icon:'drop', color:'peach'},
  {slug:'mbti', name:'MBTI 읽을거리', short:'직접 고른 유형과 생활 상황', description:'16유형 중 직접 선택해 여섯 가지 생활 주제의 제안을 읽어요. 검사나 사건 예측은 아니에요.', system:'mbti', content:'personality', icon:'book', color:'blue'},
] as const;
export type Category = (typeof categories)[number];
export type Slug = Category['slug'];
export const getCategory = (slug:string) => categories.find(c => c.slug === slug);
export const homeSlugs: Slug[] = ['personality','love','saju','constellation','zodiac','blood-type','relationships','single','mind'];
