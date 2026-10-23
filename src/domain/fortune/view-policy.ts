import { shiftDate } from '../foundation/engine';

/** A menu owns its period. Only the dedicated date menu accepts a picked day. */
export function fortuneView(category: string, today: string, picked: string | null) {
  const customDate = category === 'date';
  return {
    kind: category === 'year' ? 'year' as const : category === 'month' ? 'month' as const : 'day' as const,
    customDate,
    showSchedule: customDate,
    target: customDate ? picked : category === 'tomorrow' ? shiftDate(today, 1) : today,
  };
}
