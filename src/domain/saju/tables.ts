export const elements=['목','화','토','금','수'] as const;
export type Element=typeof elements[number];
export const stemNames=['갑','을','병','정','무','기','경','신','임','계'] as const;
export const stemHanja=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
export const branchNames=['자','축','인','묘','진','사','오','미','신','유','술','해'];
export const branchHanja=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
export const stemElements:Element[]=['목','목','화','화','토','토','금','금','수','수'];
export const branchElements:Element[]=['수','토','목','목','토','화','화','토','금','금','토','수'];
export const tenGodNames=['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'] as const;
export type TenGod=typeof tenGodNames[number];
export function tenGod(dayStem:number,otherStem:number):TenGod {
  const diff=(Math.floor(otherStem/2)-Math.floor(dayStem/2)+5)%5;
  return tenGodNames[diff*2+(dayStem%2===otherStem%2?0:1)];
}
export function relationGroup(dayStem:number,otherStem:number) {
  return ['peer','output','wealth','order','resource'][((Math.floor(otherStem/2)-Math.floor(dayStem/2)+5)%5)];
}
export function pillarText(p:{stem:number;branch:number}|null) {return p ? stemNames[p.stem]+branchNames[p.branch] : '미확정';}
