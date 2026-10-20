import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import raw from '../src/content/rules.json';
import cases from '../tests/fixtures/editorial-evaluation.json';
import { validateRules } from '../src/domain/interpretation/repository';
import { evaluateEditorialCase,type EditorialCase } from '../src/domain/interpretation/evaluation';
import { languageAudit,templateDuplicates } from '../src/domain/interpretation/quality';
import { interpretationBases } from '../src/domain/interpretation/knowledge';
const arg=(name:string)=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];};
const data=arg('--rules-file')?JSON.parse(await fs.readFile(arg('--rules-file')!,'utf8')):raw;
const rules=validateRules(data);
const targeted=rules.filter(r=>/^(core|period|relation)-/.test(r.id));
const errors:string[]=[];
for(const r of targeted)if(!r.evidence)errors.push(`근거·반대 사례 누락: ${r.id}`);
errors.push(...languageAudit(rules));
for(const prefix of ['core-','period-','relation-','element-'])errors.push(...templateDuplicates(rules.filter(r=>r.id.startsWith(prefix))).map(ids=>`유사 원고: ${ids}`));
const sentences=new Map<string,Set<string>>();
for(const r of targeted)for(const p of r.paragraphs)for(const s of p.split(/(?<=[.!?])\s+/)){
  if(s.length<36)continue;
  const ids=sentences.get(s)??new Set<string>();ids.add(r.id);sentences.set(s,ids);
}
const repeated=[...sentences].filter(([,ids])=>ids.size>=3).map(([sentence,ids])=>({sentence,ruleIds:[...ids]}));
for(const s of repeated)errors.push(`세 원고 이상 반복 문장: ${s.ruleIds.join(',')}`);
const results=(cases as EditorialCase[]).map(c=>evaluateEditorialCase(c,rules));
for(const r of results)errors.push(...r.errors.map(e=>`${r.id}: ${e}`));
const groups=Object.fromEntries(['core-','period-','relation-','element-','light-'].map(prefix=>{
  const r=rules.filter(r=>r.id.startsWith(prefix)),lengths=r.map(r=>r.paragraphs.join('').length);
  return [prefix,{records:r.length,minBody:Math.min(...lengths),meanBody:Math.round(lengths.reduce((a,b)=>a+b,0)/r.length*10)/10,maxBody:Math.max(...lengths),withEvidence:r.filter(r=>r.evidence).length}];
}));
const report={label:arg('--label')??'working-copy',rulesSha256:createHash('sha256').update(JSON.stringify(data)).digest('hex'),fixtureSha256:createHash('sha256').update(JSON.stringify(cases)).digest('hex'),passed:errors.length===0,conditionalRecords:rules.length,basisDefinitionsAvailable:interpretationBases.length,basisDefinitionsReferenced:new Set(rules.flatMap(r=>r.evidence?[r.evidence.basisKey]:[])).size,groups,repeatedSentences:repeated,cases:results,errors,meaning:'자동 평가는 조건·근거 연결·선정 문장·재현성을 확인합니다. 전통 해석의 진실성이나 개인에게 맞는 정도의 점수가 아닙니다.'};
await fs.mkdir('reports/content-improvement-1.2.0',{recursive:true});
const output=arg('--output')??'reports/content-improvement-1.2.0/evaluation.json';
await fs.writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed?'PASS':'FAIL'} · 원고 ${rules.length} · 근거 ${interpretationBases.length} 별도 · 평가 사례 ${results.filter(r=>r.passed).length}/${results.length} · 오류 ${errors.length} · ${output}`);
if(errors.length){console.log(errors.slice(0,12).join('\n'));process.exitCode=1;}
