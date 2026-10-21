import type { PeriodSegment } from './period';
import { standardParts } from '../calendar/timezone';
const date=(ms:number)=>{const p=standardParts(ms);return `${p.year}년 ${p.month}월 ${p.day}일`;};
/** Dates touched by [start,end). Exact boundary instants remain in the disclosure. */
export function segmentDateRange(segment:Pick<PeriodSegment,'start'|'end'>):string {
  if(segment.end<=segment.start)throw new Error('구간의 끝은 시작보다 늦어야 합니다.');
  const start=date(segment.start),end=date(segment.end-1);
  return start===end?start:`${start} ~ ${end}`;
}
