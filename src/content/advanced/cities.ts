/** Representative city centres, rounded to 0.01°. Editorial local list, not address geocoding.
 * Geographic accuracy has not been independently certified. No implied birth location. */
export const cities=[
 {id:'seoul',name:'서울',latitude:37.57,longitude:126.98},
 {id:'suwon',name:'수원',latitude:37.26,longitude:127.03},
 {id:'seongnam',name:'성남',latitude:37.42,longitude:127.13},
 {id:'anyang',name:'안양',latitude:37.39,longitude:126.96},
 {id:'incheon',name:'인천',latitude:37.46,longitude:126.71},
 {id:'busan',name:'부산',latitude:35.18,longitude:129.08},
 {id:'daegu',name:'대구',latitude:35.87,longitude:128.60},
 {id:'daejeon',name:'대전',latitude:36.35,longitude:127.38},
 {id:'gwangju',name:'광주',latitude:35.16,longitude:126.85},
 {id:'jeju',name:'제주',latitude:33.50,longitude:126.53},
 {id:'gangneung',name:'강릉',latitude:37.75,longitude:128.88},
 {id:'jeonju',name:'전주',latitude:35.82,longitude:127.15},
] as const;
export const citySource={id:'editorial-city-centres-1.0',precisionDegrees:0.01,status:'pending-independent-geographic-check',scope:'국내 도시 중심의 편집 좌표. 실제 출생지 좌표와 다를 수 있어요.',sourceURL:null};
