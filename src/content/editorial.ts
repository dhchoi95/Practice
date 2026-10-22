export const dailyEditorial=[
  {title:'내 이야기 뒤 상대의 생각도 물어볼 때',text:'내 이야기를 전한 뒤 상대가 어떻게 느꼈는지 물어보세요. 질문한 뒤 답을 기다리면 상대의 생각도 들을 수 있어요.'},
  {title:'미뤄둔 정리를 잠깐 해볼 때',text:'눈에 들어오는 한 곳만 5분 정도 정리해 보세요. 모두 끝내려 하기보다 지금 편해지는 만큼이면 좋아요.'},
  {title:'늘 하던 일의 순서를 바꿔보고 싶다면',text:'늘 하던 일의 순서를 조금 바꿔보세요. 편리해졌는지 확인하는 작은 실험으로도 충분해요.'},
  {title:'약속을 잡기 전에 남은 시간부터',text:'일정을 정하기 전에 나의 여유를 한 번 확인해 보세요. 지금 쓸 수 있는 시간을 알면 지키기 어려운 약속을 줄이는 데 도움이 돼요.'},
  {title:'오늘 편했던 순간을 떠올려봐요',text:'오늘 편안했던 순간 하나를 짧게 적어 보세요. 특별한 성과가 없어도 편하게 지냈던 경험을 적을 수 있어요.'},
  {title:'일과 일 사이에 잠깐 쉴 때',text:'일과 일 사이에 짧은 여유를 넣어 보세요. 새로운 계획을 세우지 않고 물 한 잔을 천천히 마셔도 좋아요.'},
  {title:'도움이 됐던 일을 말로 전할 때',text:'도움이 된 행동 하나를 떠올려 짧게 고마움을 전해 보세요. 어떤 점이 도움이 됐는지 덧붙이면 고마운 이유도 전할 수 있어요.'},
];
export function editorialForDate(iso:string,sign:string){
  // 개인정보 없는 유형 인덱스와 날짜로만 편집 순환. 사주 계산 feature로 전달하지 않음.
  const day=Math.floor(Date.parse(`${iso}T00:00:00Z`)/86400000);
  const index=(day+Array.from(sign).reduce((a,c)=>a+c.charCodeAt(0),0))%dailyEditorial.length;
  return dailyEditorial[index];
}
