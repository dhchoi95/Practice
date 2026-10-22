import fs from 'node:fs/promises';
import { calculateAdvanced } from '../src/domain/advanced/chart';
import { buildAdvancedReport } from '../src/domain/advanced/report';
import { calculatePeriod,segmentLabel } from '../src/domain/advanced/period';
import { activeLuck } from '../src/domain/advanced/luck';
import { hiddenFor,pillarLabel,stemLabel } from '../src/domain/advanced/mappings';
import { positions,positionNames } from '../src/domain/advanced/types';
import type { BirthInput } from '../src/domain/saju/types';
const dir='reports/integrated-2.0.0';
const input:BirthInput={year:1995,month:11,day:8,hour:15,minute:3,unknownTime:false,calendar:'solar',leap:false,nickname:''};
const options={enabled:true,timePolicy:'standard' as const,cityId:'suwon',luckClass:'male' as const};
const make=(i:BirthInput)=>{const chart=calculateAdvanced(i,options),selectedPeriod=calculatePeriod(chart,'year','2026-10-22');return {...buildAdvancedReport(chart,2026,selectedPeriod),selectedPeriod,queryDate:'2026-10-22',menu:'saju'};};
const same=[{...input,year:2000,month:1,day:16,hour:10,minute:30},{...input,year:2000,month:2,day:5,hour:10,minute:30}].map(make);
await fs.writeFile(`${dir}/same-day-master-comparison.json`,JSON.stringify(same,null,2)+'\n');
await fs.writeFile(`${dir}/other-natal-report.json`,JSON.stringify(make({...input,year:1992,month:5,day:15,hour:10,minute:30}),null,2)+'\n');
await fs.writeFile(`${dir}/hour-boundary-comparison.json`,JSON.stringify([{hour:14,minute:59},{hour:15,minute:0},{hour:15,minute:1}].map(t=>make({...input,...t})),null,2)+'\n');
const chart=calculateAdvanced(input,options),luck=chart.luck[0],change=luck.cycles[3].start;
await fs.writeFile(`${dir}/luck-transition-comparison.json`,JSON.stringify({chart,comparison:[-1,0,1].map(delta=>({instant:new Date(change+delta).toISOString(),active:activeLuck(luck,change+delta)})),year:calculatePeriod(chart,'year','2025-10-22'),day:calculatePeriod(chart,'day','2025-12-20')},null,2)+'\n');
function markdown(report:ReturnType<typeof make>,name:string){
 const c=report.chart;const lines=[`# ${name}`,report.summary,`조회일 ${report.queryDate} / 계산 ${c.policyVersion} / 해석 ${c.interpretationVersion} / 콘텐츠 2.0.0`,...c.limitations,'## 원국'];
 for(const k of positions){const p=c.pillars[k];lines.push(`${positionNames[k]}: ${pillarLabel(p)}${p?' / '+hiddenFor(p.branch,c.pillars.day?.stem??null).map(h=>`${h.role} ${stemLabel(h.stem)} ${h.god??'미확정'}`).join(' · '):''}`);}
 lines.push('## 판단과 반대 근거');for(const j of [c.strength,c.pattern,c.useful.support,c.useful.climate])lines.push(j.label,...j.reasons,...j.counter,...j.uncertainty);
 lines.push('## 구성의 실제 자리',...c.evidence.map(e=>e.text),'## 주제 풀이');for(const r of report.natal.applied)lines.push(r.title,r.text);
 lines.push('## 대운');for(const l of c.luck){lines.push(`${l.direction} / 개시 ${new Date(l.start).toISOString()} / 절 ${l.term.name} ${new Date(l.term.instant).toISOString()}`);for(const cycle of l.cycles)lines.push(`${cycle.index}: ${pillarLabel(cycle.pillar)} ${new Date(cycle.start).toISOString()} ~ ${new Date(cycle.end).toISOString()} 전`);}
 const periods=[report.selectedPeriod,...report.years];for(const period of periods){lines.push(`## ${period.label}`);period.segments.forEach((s,i)=>{lines.push(segmentLabel(s),`${pillarLabel(s.pillars[period.kind])} / ${s.facts['period.god']??'미확정'}`);for(const r of s.selection.applied){const trace=period.display[i].find(t=>t.ruleId===r.id)!;lines.push(r.title,trace.reference?`같은 설명: ${trace.reference.period??period.target} ${trace.reference.segment+1}구간 참조`:r.text);}});}
 lines.push('## 총평',...report.conclusion);return lines.join('\n\n')+'\n';
}
for(const name of ['example-suwon-standard','example-suwon-true-solar','example-city-unknown-solar-request','other-natal-report']){
 const report=JSON.parse(await fs.readFile(`${dir}/${name}.json`,'utf8')) as ReturnType<typeof make>;
 await fs.writeFile(`${dir}/${name}.md`,markdown(report,name));
}
const samples=JSON.parse(await fs.readFile(`${dir}/reading-samples.json`,'utf8')) as {profile:number;date:string;chart:typeof chart;natal:ReturnType<typeof buildAdvancedReport>['natal'];period:ReturnType<typeof calculatePeriod>}[];
const selected=[0,5,10,15,20].map(i=>samples[i]);
await fs.writeFile(`${dir}/reading-samples.md`,selected.flatMap(r=>[`# 합성 사례 ${r.profile} / ${r.date}`,r.chart.strength.label,...r.natal.applied.flatMap(m=>[m.title,m.text]),...r.period.segments.flatMap(s=>s.selection.applied.flatMap(m=>[m.title,m.text,m.proposal]))]).join('\n\n')+'\n');
console.log('PASS · 실제 화면과 같은 조회 기준의 전체 결과, 다른 원국·같은 일간·시주·대운 경계 자료 생성');
