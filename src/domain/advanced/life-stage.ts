/** 서비스 채택표: 양간 순행·음간 역행, 무토는 병화·기토는 정화의 장생을 따름.
 * 글자 관계의 전통 분류이며 건강·수명·인생 단계의 예측이 아님. */
export const lifeStagePolicy='LIFE-STAGE-FIRE-EARTH-1.0';
export const lifeStages=['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'] as const;
const starts=[11,6,2,9,2,9,5,0,8,3];
export function lifeStage(dayStem:number|null,branch:number|null){
 if(dayStem===null||branch===null)return null;
 if(!Number.isInteger(dayStem)||dayStem<0||dayStem>9||!Number.isInteger(branch)||branch<0||branch>11)throw new Error('천간과 지지의 범위를 확인하세요.');
 return lifeStages[((dayStem%2===0?branch-starts[dayStem]:starts[dayStem]-branch)+12)%12];
}
