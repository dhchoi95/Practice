// Offline tooling only. The application imports repository.ts, which never imports drafts.
import drafts from '../../../content-review/compound-drafts.json';
import { contentRepository,validateRules,type ContentRepository } from './repository';
export function experimentalRepository(options:{includeDrafts:boolean}={includeDrafts:false}):ContentRepository {
  const pilot=validateRules(drafts);
  if(pilot.some(r=>r.reviewStatus!=='draft'))throw new Error('시범 원고는 독립 의미 검토 전 draft여야 합니다.');
  const rules=options.includeDrafts?[...contentRepository.all(),...pilot]:contentRepository.all();
  return {find:(s,cats)=>rules.filter(r=>r.system===s&&cats.includes(r.category)),all:()=>[...rules]};
}
