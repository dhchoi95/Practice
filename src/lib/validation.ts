import { z } from 'zod';
import { isoDate, toLunar, toSolar } from '@/domain/calendar/korean';
import { seoulDate, type Clock } from './clock';
import type { BirthInput } from '@/domain/saju/types';
export class InputError extends Error {constructor(message:string,public field:string='day'){super(message);}}
const schema=z.object({
  year:z.number().int().min(1961).max(2050),month:z.number().int().min(1).max(12),day:z.number().int().min(1).max(31),
  calendar:z.enum(['solar','lunar']),leap:z.boolean(),unknownTime:z.boolean(),
  hour:z.number().int().min(0).max(23).optional(),minute:z.number().int().min(0).max(59).optional(),nickname:z.string().max(20),
}).strict();
export function validateBirth(value:unknown,clock?:Clock):BirthInput {
  const parsed=schema.safeParse(value);
  if(!parsed.success){const first=parsed.error.issues[0];throw new InputError('입력 범위를 확인해 주세요. 날짜는 숫자로, 시각은 00:00~23:59로 입력해 주세요.',String(first.path[0]||'year'));}
  const input=parsed.data;
  if(!input.unknownTime && (input.hour===undefined || input.minute===undefined)) throw new InputError('태어난 시와 분을 입력하거나 시간 모름을 선택해 주세요.','hour');
  if(input.calendar==='solar' && input.leap) throw new InputError('윤달은 음력에서만 선택할 수 있어요.','day');
  let solar;
  try {solar=input.calendar==='lunar'?toSolar(input):(toLunar(input),{year:input.year,month:input.month,day:input.day});}
  catch(e){throw new InputError(e instanceof Error?e.message:'날짜를 확인해 주세요.');}
  if(isoDate(solar)<'1962-01-01') throw new InputError('양력 1962년 1월 1일부터 지원해요. 변환한 양력 날짜를 확인해 주세요.','year');
  if(isoDate(solar)>seoulDate(clock)) throw new InputError('미래 출생일은 입력할 수 없어요. 생년월일을 확인해 주세요.','year');
  return {...input,nickname:input.nickname.trim(),...(input.unknownTime?{hour:undefined,minute:undefined}:{})};
}
