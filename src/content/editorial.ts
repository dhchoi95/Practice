export const dailyEditorial=[
  {title:'대화에 질문 하나를 더해요',text:'내 이야기를 전한 뒤 상대가 어떻게 느꼈는지 물어보세요. 짧은 질문이 대화의 여백을 만들어 줄 수 있어요.'},
  {title:'미뤄둔 작은 정리를 해봐요',text:'눈에 들어오는 한 곳만 5분 정도 정리해 보세요. 모두 끝내려 하기보다 지금 편해지는 만큼이면 좋아요.'},
  {title:'익숙한 하루에 다른 길을',text:'늘 하던 일의 순서를 조금 바꿔보세요. 편리해졌는지 확인하는 작은 실험으로도 충분해요.'},
  {title:'가능한 만큼의 약속을',text:'일정을 정하기 전에 나의 여유를 한 번 확인해 보세요. 무리 없이 지킬 수 있는 약속이 마음을 가볍게 할 수 있어요.'},
  {title:'좋았던 장면을 남겨요',text:'오늘 편안했던 순간 하나를 짧게 적어 보세요. 특별한 성과가 없어도 하루에 남길 장면은 있을 수 있어요.'},
  {title:'잠시 쉬어 갈 자리를',text:'일과 일 사이에 짧은 여유를 넣어 보세요. 새로운 계획을 세우지 않고 물 한 잔을 천천히 마셔도 좋아요.'},
  {title:'고마움을 구체적으로',text:'도움이 된 행동 하나를 떠올려 짧게 고마움을 전해 보세요. 어떤 점이 좋았는지 덧붙이면 마음을 알아듣기 쉬워요.'},
];
export function editorialForDate(iso:string,sign:string){
  // 개인정보 없는 유형 인덱스와 날짜로만 편집 순환. 사주 계산 feature로 전달하지 않음.
  const day=Math.floor(Date.parse(`${iso}T00:00:00Z`)/86400000);
  const index=(day+Array.from(sign).reduce((a,c)=>a+c.charCodeAt(0),0))%dailyEditorial.length;
  return dailyEditorial[index];
}
