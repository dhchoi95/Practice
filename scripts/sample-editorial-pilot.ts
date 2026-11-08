import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { calculateAdvanced } from '../src/domain/advanced/chart';
import { buildSectorReading } from '../src/domain/foundation/engine';
import { presentSector } from '../src/domain/foundation/presentation';
import { domains,domainNames } from '../src/domain/foundation/types';
import { pillarText } from '../src/domain/saju/tables';
import type { BirthInput } from '../src/domain/saju/types';

const dates=[[1972,1,1],[1978,3,7],[1983,6,13],[1987,11,21],[1992,5,15],[1995,11,8],[2000,1,9],[2002,8,17],[2005,12,3],[1990,4,5]];
const options={enabled:true,timePolicy:'standard' as const};
const clock={now:()=>new Date('2026-11-08T03:00:00Z')};
const cases=dates.map(([year,month,day],i)=>{
 const input:BirthInput={year,month,day,calendar:'solar',leap:false,unknownTime:i===3||i===9,...(i===3||i===9?{}:{hour:[0,4,9,12,15,19,23][i%7],minute:30}),nickname:''};
 const chart=calculateAdvanced(input,options,clock),target=i===8?'2026-11-09':'2026-11-08';
 const reading=buildSectorReading(chart,'day',target);
 assert.deepEqual(reading,buildSectorReading(chart,'day',target));
 const features=chart.compatibility.features;
 assert.equal((['목','화','토','금','수'] as const).reduce((sum,e)=>sum+Number(features[`elements.${e}`]),0),features['natal.knownCount']);
 const sectors=Object.fromEntries(domains.map(d=>{const plan=presentSector(reading,d),sector=reading.sectors[d];return [d,{name:domainNames[d],rawScore:sector.rawScore,score:sector.score,band:sector.band,title:plan.primary?.title??null,paragraphs:plan.paragraphs,segments:reading.segments.map(s=>({start:s.start,end:s.end,facts:s.sectors[d].facts,contributions:s.sectors[d].contributions,records:s.sectors[d].records.map(r=>({id:r.id,requires:r.requires,evidenceRefs:r.evidenceRefs}))}))}];}));
 return {id:`pilot-${String(i+1).padStart(2,'0')}`,input,target,versions:{calculation:chart.policyVersion,interpretation:chart.interpretationVersion,content:reading.contentVersion,score:reading.scoreVersion},pillars:chart.pillars,features,strength:chart.strength,pattern:chart.pattern,useful:chart.useful,period:reading.segments.map(s=>({start:s.start,end:s.end,pillars:s.context.pillars,relations:s.context.relations})),sectors};
});
await fs.mkdir('reports/editorial-pilot-2026',{recursive:true});
await fs.writeFile('reports/editorial-pilot-2026/cases.json',JSON.stringify({description:'가상 입력과 실제 서비스 결과; 계산 결과 자체는 독립 명리 검증이 아님',cases},null,2)+'\n');
const md=cases.map(c=>`## ${c.id} · ${c.input.year}-${c.input.month}-${c.input.day} · ${c.target}\n\n원국: ${Object.entries(c.pillars).map(([k,p])=>`${k} ${pillarText(p)}`).join(' / ')}. 오행: ${(['목','화','토','금','수'] as const).map(e=>`${e} ${c.features[`elements.${e}`]}`).join(', ')}. ${c.strength.label}.\n\n`+domains.map(d=>{const s=c.sectors[d];return `### ${s.name} · ${s.score}점 · ${s.title}\n\n${s.paragraphs.map(p=>`[${p.recordId}] ${p.text}`).join('\n\n')}`;}).join('\n\n')).join('\n\n');
await fs.writeFile('reports/editorial-pilot-2026/outputs.md','# 실제 표시 원고: 10인 시범\n\n'+md+'\n');
console.log(`계산 ${cases.length}명, ${cases.length*domains.length}개 분야. 재현성 및 확인된 글자 수 검사 통과.`);
