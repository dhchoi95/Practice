export const siteConfig = {
  name: '하루사주',
  description: '나를 알아가는 작은 시간. 회원가입 없이 만나는 무료 사주와 오늘의 운세.',
  // 운영 도메인 확정 후 NEXT_PUBLIC_SITE_URL에 https://실제도메인을 설정하세요.
  url: process.env.NEXT_PUBLIC_SITE_URL || '',
  instagram: '',
  contentVersion: '1.1.0',
};
export const categories = [
  {slug:'saju', name:'정통사주', short:'내 사주를 차근차근', description:'타고난 기질부터 일과 관계까지, 내 사주의 기본을 편안하게 살펴보세요.', system:'saju', content:'general', icon:'book', color:'sand'},
  {slug:'personality', name:'성격풀이', short:'타고난 기질과 나의 방식', description:'익숙한 나의 모습과 아직 몰랐던 강점을 돌아보는 시간이에요.', system:'saju', content:'personality', icon:'tree', color:'blue'},
  {slug:'love', name:'연애사주', short:'마음을 주고받는 나의 방식', description:'관계를 맺고 마음을 표현하는 방식을 가볍게 돌아보세요.', system:'saju', content:'love', icon:'knot', color:'pink'},
  {slug:'career-money', name:'직업·재물', short:'일의 방향과 돈을 대하는 태도', description:'잘 해내고 싶은 일과 돈을 관리하는 습관을 함께 살펴보세요.', system:'saju', content:'careerMoney', icon:'mountain', color:'sand'},
  {slug:'relationships', name:'대인관계', short:'사람 사이에서 찾는 나의 강점', description:'서로 다른 사람들과 편안하게 지내기 위한 작은 힌트를 만나보세요.', system:'saju', content:'relationships', icon:'birds', color:'green'},
  {slug:'single', name:'솔로사주', short:'새로운 인연을 준비하며', description:'나만의 속도를 지키면서 새로운 만남을 준비하는 이야기예요.', system:'saju', content:'single', icon:'flower', color:'peach'},
  {slug:'mind', name:'마음돌봄', short:'혼자 있는 시간을 편안하게', description:'잠시 숨을 고르고, 오늘의 나를 다정하게 돌보는 시간을 가져보세요.', system:'saju', content:'mind', icon:'tea', color:'lilac'},
  {slug:'year', name:'올해 운세', short:'한 해의 흐름을 차근차근', description:'양력 한 해를 절기 구간으로 나누어, 일과 관계의 방향을 돌아봐요.', system:'saju', content:'year', icon:'calendar', color:'sand'},
  {slug:'month', name:'이번 달 운세', short:'이번 달을 준비하는 작은 힌트', description:'이달의 절입 전후 흐름을 살펴보고 일상 계획에 참고해 보세요.', system:'saju', content:'month', icon:'moon', color:'blue'},
  {slug:'day', name:'오늘 운세', short:'오늘을 조금 더 가볍게', description:'한국시간 오늘의 간지와 내 일간의 관계에서 하루의 주제를 찾아봐요.', system:'saju', content:'day', icon:'sun', color:'peach'},
  {slug:'zodiac', name:'띠별운세', short:'내 띠로 가볍게 보는 오늘', description:'한국 음력 설 기준의 열두 띠 이야기와 오늘의 작은 조언이에요.', system:'zodiac', content:'day', icon:'rabbit', color:'green'},
  {slug:'constellation', name:'별자리운세', short:'별자리로 가볍게 보는 오늘', description:'익숙한 열두 별자리의 성향 이야기예요. 정밀한 출생점성술과는 달라요.', system:'constellation', content:'day', icon:'stars', color:'navy'},
  {slug:'blood-type', name:'혈액형풀이', short:'재미로 살펴보는 성향 이야기', description:'혈액형을 대화 소재로 삼은 가벼운 읽을거리예요. 과학적인 성격 검사는 아니에요.', system:'bloodType', content:'personality', icon:'drop', color:'peach'},
] as const;
export type Category = (typeof categories)[number];
export type Slug = Category['slug'];
export const getCategory = (slug:string) => categories.find(c => c.slug === slug);
export const homeSlugs: Slug[] = ['personality','love','saju','constellation','zodiac','blood-type','relationships','single','mind'];
