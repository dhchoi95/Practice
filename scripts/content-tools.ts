import fs from 'node:fs/promises';
import { contentRepository,validateRules } from '../src/domain/interpretation/repository';
import { categories } from '../src/config/site';
import { calculateSaju } from '../src/domain/saju/calculate';
import { interpret,type InterpretationResult } from '../src/domain/interpretation/engine';
import { targetPeriod } from '../src/domain/fortune/period';
import { stemNames } from '../src/domain/saju/tables';
import raw from '../src/content/rules.json';
import type { BirthInput } from '../src/domain/saju/types';
import { particleErrors,templateDuplicates } from '../src/domain/interpretation/quality';
import { sharedExplanations } from '../src/domain/interpretation/shared';
import { interpretationBases } from '../src/domain/interpretation/knowledge';
export const syntheticProfiles:BirthInput[]=[];
for(const year of [1972,1992,2002])for(const unknownTime of [true,false])for(let day=1;day<=10;day++)syntheticProfiles.push({year,month:5,day,calendar:'solar',leap:false,unknownTime,hour:unknownTime?undefined:10,minute:unknownTime?undefined:30,nickname:''});
syntheticProfiles.push({year:2017,month:5,day:1,calendar:'lunar',leap:true,unknownTime:true,nickname:''},{year:2024,month:2,day:4,calendar:'solar',leap:false,unknownTime:true,nickname:''},{year:1987,month:6,day:1,calendar:'solar',leap:false,unknownTime:true,nickname:''});
const clock={now:()=>new Date('2026-10-20T03:00:00Z')};
const command=process.argv[2]||'validate';
const rules=validateRules(raw);
if(command==='validate'){
  if(rules.length<180)throw new Error('초기 콘텐츠 180개 미달');
  console.log(`PASS · 조건별 원고 ${rules.length}개 / 공통 설명 ${sharedExplanations.length}개 / 근거 정의 ${interpretationBases.length}개 별도 · 스키마/조건/ID/용어/출처 검사`);
  console.log(JSON.stringify(Object.fromEntries(['saju','zodiac','constellation','bloodType'].map(s=>[s,rules.filter(r=>r.system===s).length]))));
}else if(command==='lint'){
  const errors:string[]=[],seen=new Map<string,string>();
  const forbidden=/(반드시 (결혼|성공|당첨)|무조건 (결혼|성공)|평생 고독|고독한 팔자|[0-9]+점|[0-9]+%|수익률|주식 종목|남자는|여자는|전문가 검수 완료)/;
  for(const r of rules)for(const p of [...r.paragraphs,...r.practicalTips]){
    if(seen.has(p))errors.push(`동일 문장: ${r.id} / ${seen.get(p)}`);seen.set(p,r.id);
    if(forbidden.test(p))errors.push(`검토할 표현: ${r.id}`);
    for(const error of particleErrors(p))errors.push(`조사 확인: ${r.id} / ${error}`);
  }
  for(const s of sharedExplanations)for(const error of particleErrors(s.text))errors.push(`공통 설명 조사 확인: ${s.id} / ${error}`);
  errors.push(...templateDuplicates(rules.filter(r=>r.id.startsWith('element-'))).map(pair=>`주제명 치환/유사 템플릿: ${pair}`));
  if(errors.length)throw new Error(errors.join('\n'));
  await fs.mkdir('reports',{recursive:true});
  await fs.writeFile('reports/content-inventory.json',JSON.stringify({conditionalRecords:rules.length,sharedExplanations:sharedExplanations.length,topicSupplements:rules.filter(r=>r.id.startsWith('element-')).length,byCategory:Object.fromEntries(categories.filter(c=>c.system==='saju').map(c=>[c.content,rules.filter(r=>r.system==='saju'&&r.category===c.content).length])),templateDuplicates:[],particleErrors:[],semanticReview:'자동 검사는 전체 의미·명리·한국어 편집 검토를 대체하지 않습니다.'},null,2)+'\n');
  console.log(`PASS · ${rules.length}개 원고 / 공통 설명 ${sharedExplanations.length}개 · 중복 문단·주제명 치환·유사 템플릿·선정 조사·금지 표현 검사 (의미 검토를 대체하지 않음)`);
}else if(command==='coverage'||command==='preview'){
  const report:{profile:string;dayMaster:string;unknownTime:boolean;category:string;sections:number;length:number;passed:boolean;reading?:InterpretationResult;ruleIds?:string[]}[]=[];let failures=0;const stems=new Set<number>();
  for(const [i,input] of syntheticProfiles.entries()){
    const result=calculateSaju(input,clock);if(result.dayMaster!==null)stems.add(result.dayMaster);
    for(const c of categories.filter(c=>c.system==='saju')){
      const f=['year','month','day'].includes(c.slug)?{...result.features,...targetPeriod(c.slug as 'year'|'month'|'day',result.dayMaster,clock).segments[0].features}:result.features;
      const reading=interpret('saju',c.content,f,contentRepository);
      const limited=result.dayMaster===null;
      const passed=limited?reading.limitations.length>0:reading.sections.length>0&&reading.limitations.length===0;
      if(!passed)failures++;
      report.push({profile:`synthetic-${i}`,dayMaster:result.dayMaster===null?'미확정':stemNames[result.dayMaster],unknownTime:input.unknownTime,category:c.slug,sections:reading.sections.length,length:reading.sections.flatMap(s=>s.paragraphs).join('').length,passed,...(command==='preview'?{reading}:{ruleIds:reading.appliedRuleIds})});
    }
  }
  for(const system of ['zodiac','constellation','bloodType'] as const){
    for(const sign of system==='bloodType'?['A','B','O','AB']:Array.from({length:12},(_,i)=>String(i))){
      const r=interpret(system,system==='bloodType'?'personality':'day',{'light.sign':sign});
      if(!r.sections.length||r.limitations.length)failures++;
    }
  }
  await fs.mkdir('reports',{recursive:true});await fs.writeFile(`reports/content-${command}.json`,JSON.stringify(report,null,2)+'\n');
  console.log(`${failures?'FAIL':'PASS'} · ${syntheticProfiles.length}개 합성 프로필 × 10 사주 메뉴, 28개 가벼운 유형 · 10일간 ${stems.size}/10 · 실패 ${failures}`);
  const ranges=Object.fromEntries(categories.filter(c=>c.system==='saju').map(c=>{const r=report.filter(r=>r.category===c.slug&&r.dayMaster!=='미확정'&&r.length>100);return[c.slug,{min:Math.min(...r.map(x=>x.length)),max:Math.max(...r.map(x=>x.length))}];}));
  console.log(JSON.stringify(ranges));
  if(failures||stems.size!==10)process.exitCode=1;
}else throw new Error('validate | lint | coverage | preview 중 하나를 사용하세요.');
