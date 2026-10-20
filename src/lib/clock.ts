export interface Clock { now(): Date }
export const systemClock: Clock = {now: () => new Date()};
export function seoulDate(clock: Clock = systemClock): string {
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(clock.now());
  const value = (type:string) => parts.find(p=>p.type===type)!.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
}
export function koreanDate(iso:string) {
  const [year,month,day]=iso.split('-').map(Number);
  return `${year}년 ${month}월 ${day}일`;
}
