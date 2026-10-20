import KoreanLunarCalendar from 'korean-lunar-calendar';
export interface CivilDate {year:number; month:number; day:number}
export interface LunarDate extends CivilDate {leap:boolean}
export const isoDate = (d:CivilDate) => `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
export function toSolar(input:LunarDate):CivilDate {
  const calendar = new KoreanLunarCalendar();
  if (!calendar.setLunarDate(input.year,input.month,input.day,input.leap)) {
    throw new Error(input.leap ? '이 해의 해당 월은 윤달이 아니거나, 존재하지 않는 음력 날짜예요. 윤달과 날짜를 확인해 주세요.' : '존재하지 않거나 지원하지 않는 음력 날짜예요. 음력의 월별 일수를 확인해 주세요.');
  }
  // 일부 버전의 setter는 윤달이 아니어도 평달로 보정할 수 있으므로 왕복 확인.
  const lunar=calendar.getLunarCalendar();
  if (Boolean(lunar.intercalation)!==input.leap || lunar.year!==input.year || lunar.month!==input.month || lunar.day!==input.day) throw new Error('이 해의 해당 월은 윤달이 아니에요. 윤달 선택을 확인해 주세요.');
  const {year,month,day}=calendar.getSolarCalendar();
  return {year,month,day};
}
export function toLunar(input:CivilDate):LunarDate {
  const calendar = new KoreanLunarCalendar();
  if (!calendar.setSolarDate(input.year,input.month,input.day)) throw new Error('존재하지 않는 양력 날짜예요. 연·월·일을 다시 확인해 주세요.');
  const d=calendar.getLunarCalendar();
  return {year:d.year,month:d.month,day:d.day,leap:Boolean(d.intercalation)};
}
export const zodiacNames=['쥐띠','소띠','호랑이띠','토끼띠','용띠','뱀띠','말띠','양띠','원숭이띠','닭띠','개띠','돼지띠'] as const;
export function zodiacForDate(date:CivilDate) {return ((toLunar(date).year-4)%12+12)%12;}
export const constellationNames=['염소자리','물병자리','물고기자리','양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리'] as const;
export const constellationRanges=['12.22–1.19','1.20–2.18','2.19–3.20','3.21–4.19','4.20–5.20','5.21–6.21','6.22–7.22','7.23–8.22','8.23–9.22','9.23–10.23','10.24–11.22','11.23–12.21'];
export function constellationForDate(date:CivilDate) {
  const md=date.month*100+date.day;
  const starts=[120,219,321,420,521,622,723,823,923,1024,1123,1222];
  const i=starts.findIndex(v=>md<v);
  return i===-1?0:i;
}
