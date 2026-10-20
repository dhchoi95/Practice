import { z } from 'zod';
import data from '@/content/element-explanations.json';
import { sourceIds } from '@/content/sources';

const schema=z.object({
  id:z.string().regex(/^element-symbol-[0-4]$/),element:z.enum(['목','화','토','금','수']),
  text:z.string().min(50).max(500),reviewStatus:z.enum(['automated-checked','human-reviewed']),
  contentVersion:z.string(),updatedAt:z.iso.date(),sourceIds:z.array(z.string()).min(1),
}).strict();
export const sharedExplanations=z.array(schema).length(5).parse(data);
if(new Set(sharedExplanations.map(s=>s.id)).size!==5||new Set(sharedExplanations.map(s=>s.element)).size!==5||sharedExplanations.some(s=>s.sourceIds.some(id=>!sourceIds.includes(id))))throw new Error('공통 오행 설명의 ID·오행·출처를 확인하세요.');
