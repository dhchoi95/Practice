import fs from 'node:fs/promises';
import drafts from '../content-review/compound-drafts.json';
import { experimentalRepository } from '../src/domain/interpretation/experimental';
import { interpret } from '../src/domain/interpretation/engine';
import { languageAudit } from '../src/domain/interpretation/quality';
import type { ContentCategory } from '../src/domain/interpretation/schema';
const normal=experimentalRepository(),experimental=experimentalRepository({includeDrafts:true});
const errors=languageAudit(experimental.all());
const profiles=(['love','careerMoney'] as ContentCategory[]).flatMap(category=>(['wealth','resource'] as const).map(aux=>{
  const features={'natal.dayStem':7,'relations.output':2,[`relations.${aux}`]:1};
  const normalResult=interpret('saju',category,features,normal),experimentalResult=interpret('saju',category,features,experimental);
  if(normalResult.appliedRuleIds.some(id=>id.startsWith('pilot-')))errors.push('일반 경로에 draft 유입');
  const id=`pilot-${category.toLowerCase()}-output-${aux}`;
  if(!experimentalResult.appliedRuleIds.includes(id)||experimentalResult.appliedRuleIds.includes(`relation-${category.toLowerCase()}-output`))errors.push(`실험 우선순위: ${id}`);
  return {id,inputKind:'partial-features (known stem count combination; no fabricated birth date)',features,category,normal:normalResult,experimental:experimentalResult};
}));
await fs.mkdir('reports/content-improvement-1.4.0',{recursive:true});
await fs.writeFile('reports/content-improvement-1.4.0/compound-preview.json',JSON.stringify({passed:!errors.length,policy:'Four drafts, two topics. Explicit offline includeDrafts:true only. No environment flag or public route.',drafts,profiles,errors},null,2)+'\n');
await fs.writeFile('reports/content-improvement-1.4.0/compound-preview.md',profiles.map(p=>`## ${p.id}\n\n입력: ${JSON.stringify(p.features)}\n\n일반: ${p.normal.appliedRuleIds.join(', ')}\n\n실험: ${p.experimental.appliedRuleIds.join(', ')}\n\n${p.experimental.sections.filter(s=>s.id.startsWith('pilot-')).map(s=>s.title+'\n\n'+s.paragraphs.join('\n\n')).join('\n\n')}`).join('\n\n'));
console.log(`${errors.length?'FAIL':'PASS'} · draft ${drafts.length} · 일반 210 / 실험 ${experimental.all().length} · 비교 사례 ${profiles.length}`);
if(errors.length){console.error(errors.join('\n'));process.exitCode=1;}
