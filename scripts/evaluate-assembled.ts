import fs from 'node:fs/promises';
import { calculateSaju } from '../src/domain/saju/calculate';
import { interpret } from '../src/domain/interpretation/engine';
import { composePeriodReading } from '../src/domain/interpretation/period-reading';
import { targetPeriod } from '../src/domain/fortune/period';
import { runtimeFeatureErrors } from '../src/domain/interpretation/evaluation';
import type { ContentCategory } from '../src/domain/interpretation/schema';
const clock={now:()=>new Date('2026-10-20T03:00:00Z')};
const base={year:1992,month:5,day:15,calendar:'solar' as const,leap:false,unknownTime:false,hour:10,minute:30,nickname:''};
const profiles=[
  {id:'assembled-output-love',category:'love',input:base},
  {id:'assembled-order-love',category:'love',input:{...base,year:2000,month:1,day:4}},
  {id:'assembled-career',category:'careerMoney',input:base},
  {id:'assembled-general',category:'general',input:base},
  {id:'assembled-annual',category:'year',input:base},
  {id:'assembled-unknown',category:'love',input:{...base,year:1987,month:6,day:1,unknownTime:true}},
] satisfies {id:string;category:ContentCategory;input:typeof base}[];
const results=profiles.map(p=>{
  const calculation=calculateSaju(p.input,clock);
  const reading=p.category==='year'?composePeriodReading(targetPeriod('year',calculation.dayMaster,clock),calculation.features):interpret('saju',p.category,calculation.features);
  const paragraphs=reading.sections.flatMap(s=>s.paragraphs.map(text=>({ruleId:s.id,text}))),tips=reading.practicalTips;
  const actionWords=['기록','적어','확인','대화','기다','표현','계획','작게','질문'];
  const repeatedActions=actionWords.map(word=>({word,examples:paragraphs.filter(p=>p.text.includes(word))})).filter(c=>c.examples.length>=2);
  return {profileId:p.id,inputKind:'synthetic-birth-runtime',features:calculation.features,calculationVersions:{policy:calculation.policyVersion,engine:calculation.engineVersion},runtimeErrors:runtimeFeatureErrors(calculation.features),reading,
    dimensions:{
      repetition:{status:'pending-independent-editorial-review',method:'action-word candidates; policy sentences excluded from uniqueness judgments',candidates:repeatedActions},
      actionConflict:{status:'pending-human-context-review',method:'No semantic verdict inferred from token presence',examples:paragraphs.filter(p=>/표현|기다|마감|준비/.test(p.text)).slice(0,3)},
      basisConnection:{status:'structural-links-checked-meaning-pending',examples:reading.ruleTraces.map(t=>({ruleId:t.ruleId,basisIds:t.basisIds,premises:t.premises,claimIds:t.claimIds}))},
      specificity:{status:'pending-independent-editorial-review',examples:tips},
      scope:{status:'pending-human-interpretation-review',examples:[...reading.limitations,...reading.sections.flatMap(s=>s.basis).filter(t=>/아니|않|한계|제한/.test(t))]},
      mobile390:{status:'browser-evidence-separate',evidence:'reports/content-improvement-1.3.0/screenshots and browser log',paragraphCharacters:paragraphs.map(p=>p.text.length),note:'No total predictive score; actual readability still needs independent reader review.'},
    }};
});
const errors=results.flatMap(r=>r.runtimeErrors.map(e=>`${r.profileId}: ${e}`));
await fs.mkdir('reports/content-improvement-1.3.0',{recursive:true});
await fs.writeFile('reports/content-improvement-1.3.0/assembled-evaluation.json',JSON.stringify({passed:!errors.length,meaning:'Whole-output evidence and editorial review candidates. Automated links are not semantic approval.',profiles:results,errors},null,2)+'\n');
const md=results.map(r=>`## ${r.profileId}\n\n${r.reading.sections.map(s=>`### ${s.title}\n\n${s.paragraphs.join('\n\n')}`).join('\n\n')}\n\n생활 제안: ${r.reading.practicalTips.join(' / ')}\n\n근거: ${r.reading.sections.flatMap(s=>s.basis).join('\n\n')}`).join('\n\n');
await fs.writeFile('reports/content-improvement-1.3.0/assembled-preview.md',md+'\n');
console.log(`${errors.length?'FAIL':'PASS'} · 전체 결과 ${results.length}개 · 구조 검사 / 6차원 의미 평가는 독립 검토 대기`);
if(errors.length)process.exitCode=1;
