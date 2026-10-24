export const siteConfig = {
  name: '하루사주',
  description: '브라우저에서 계산하는 무료 사주와 운세. 가입 없이 이용하고, 입력정보는 새로고침하면 사라져요.',
  // 운영 도메인 확정 후 NEXT_PUBLIC_SITE_URL에 https://실제도메인을 설정하세요.
  url: process.env.NEXT_PUBLIC_SITE_URL || '',
  instagram: '',
  contentVersion: '2.3.0',
  advancedContentVersion: '2.3.0',
  sectorContentVersion: '2.3.0',
};
export const categories = [
  {slug:'saju', name:'신년운세', short:'선택한 해의 운세와 상세 사주', description:'다가오는 새해를 기본으로, 선택한 연도의 여섯 분야 운세와 출생 사주를 살펴봐요.', system:'saju', content:'general', icon:'book', color:'sand'},
  {slug:'personality', name:'성격풀이', short:'내 성격과 사람을 대하는 방식', description:'전통적인 상징에 빗댄 글을 내 경험과 비교해 봐요. 실제 성격을 판정하는 검사는 아니에요.', system:'saju', content:'personality', icon:'tree', color:'blue'},
  {slug:'love', name:'연애사주', short:'연애 성향과 관계에서 중요한 점', description:'바라는 것을 말하고 상대가 원하는 방식도 듣는 대화를 생각해 봐요.', system:'saju', content:'love', icon:'knot', color:'pink'},
  {slug:'career-money', name:'직업·재물', short:'나에게 맞는 일과 돈을 다루는 성향', description:'맡은 일을 나누고, 일정과 실제 비용을 살피는 방법을 읽어요.', system:'saju', content:'careerMoney', icon:'mountain', color:'sand'},
  {slug:'relationships', name:'대인관계', short:'사람들과 어울리는 나의 방식', description:'서로 다른 말투와 의견을 듣고, 함께하는 역할을 나누는 방법을 읽어요.', system:'saju', content:'relationships', icon:'birds', color:'green'},
  {slug:'single', name:'솔로사주', short:'새로운 만남에서 살펴볼 점', description:'새로 사람을 알아갈 때 취향과 원하는 만남의 방식을 이야기해 봐요.', system:'saju', content:'single', icon:'flower', color:'peach'},
  {slug:'mind', name:'마음돌봄', short:'식사와 휴식, 도움을 구하는 방법', description:'일상에서 쉬는 방법과 도움을 구하는 일을 생각해 봐요. 진단이나 치료를 대신하지 않아요.', system:'saju', content:'mind', icon:'tea', color:'lilac'},
  {slug:'year', name:'올해 운세', short:'올해의 일, 돈, 연애와 생활', description:'올해의 총운, 학업운, 재물운, 건강운, 연애운, 사업운을 확인해요.', system:'saju', content:'year', icon:'calendar', color:'sand'},
  {slug:'month', name:'이번달 운세', short:'이번 달의 일, 돈, 연애와 생활', description:'이번 달의 총운부터 사업운까지 여섯 가지 운세를 살펴봐요.', system:'saju', content:'month', icon:'moon', color:'blue'},
  {slug:'day', name:'오늘의 운세', short:'오늘의 여섯 분야 풀이', description:'오늘의 간지와 출생 원국을 함께 보고 여섯 분야의 풀이를 읽어요.', system:'saju', content:'day', icon:'sun', color:'peach'},
  {slug:'tomorrow', name:'내일 운세', short:'내일의 여섯 분야 풀이', description:'한국시간 내일의 간지와 출생 원국을 함께 살펴요.', system:'saju', content:'day', icon:'sun', color:'peach'},
  {slug:'date', name:'지정일 운세', short:'내 사주로 선택한 날 살펴보기', description:'날짜를 골라 여섯 분야를 읽고 면접·시험 등 일정의 준비 사항을 확인해요.', system:'saju', content:'day', icon:'calendar', color:'blue'},
  {slug:'manse', name:'만세력', short:'태어난 날과 시간으로 보는 사주표', description:'시주·일주·월주·년주를 한눈에 보고 원국 관계와 계산 기준을 확인해요.', system:'saju', content:'general', icon:'book', color:'sand'},
  {slug:'zodiac', name:'띠별운세', short:'띠를 소재로 읽는 오늘 이야기', description:'한국 음력 설 기준의 열두 띠 이야기와 오늘의 작은 조언이에요.', system:'zodiac', content:'day', icon:'rabbit', color:'green'},
  {slug:'constellation', name:'별자리운세', short:'별자리로 읽는 가벼운 이야기', description:'익숙한 열두 별자리의 성향 이야기예요. 정밀한 출생점성술과는 달라요.', system:'constellation', content:'day', icon:'stars', color:'navy'},
  {slug:'compatibility', name:'짝궁합', short:'두 사람의 사주를 함께 살펴보기', description:'두 출생 원국의 오행과 십신·합충을 비교해요. 관계의 성패를 예측하는 점수는 매기지 않아요.', system:'saju', content:'relationships', icon:'knot', color:'pink'},
  {slug:'blood-type', name:'혈액형풀이', short:'성격 검사가 아닌 대화 소재', description:'혈액형을 대화 소재로 삼은 가벼운 읽을거리예요. 과학적인 성격 검사는 아니에요.', system:'bloodType', content:'personality', icon:'drop', color:'peach'},
  {slug:'mbti', name:'MBTI 운세', short:'직접 고른 유형과 생활 상황', description:'16유형 중 직접 선택해 여섯 가지 생활 주제의 제안을 읽어요. 검사나 사건 예측은 아니에요.', system:'mbti', content:'personality', icon:'book', color:'blue'},
] as const;
export type Category = (typeof categories)[number];
export type Slug = Category['slug'];
export const getCategory = (slug:string) => categories.find(c => c.slug === slug);
export const homeSlugs: Slug[] = ['saju','day','date','constellation','zodiac','mbti','relationships','love','compatibility'];
export const topSlugs: Slug[] = ['saju','day','month','date','year'];
export const quickSlugs: Slug[] = ['saju','day','month','date','mbti','manse','love','compatibility'];
export const navigationCategories=categories.filter(c=>c.slug!=='blood-type');
export const homeCardNames:Partial<Record<Slug,string>>={saju:'신년운세',day:'오늘의 운세',date:'지정일 운세'};
