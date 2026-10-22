import { Body,HourAngle,Observer,SearchSunLongitude } from 'astronomy-engine';
import fs from 'node:fs/promises';
import { equationOfTime } from '../src/domain/advanced/time';
import { solarTerms } from '../src/domain/calendar/terms';
await fs.mkdir('reports/integrated-2.0.0',{recursive:true});
const equation:{year:number;maxMinutes:number;date:string}[]=[],terms:unknown[]=[];
for(const year of [1962,1988,1995,2000,2026,2050]){
 let max=0,date='';for(let d=0;d<365;d++){const ms=Date.UTC(year,0,1+d,12),ha=HourAngle(Body.Sun,new Date(ms),new Observer(0,0,0));const reference=(((((ha+12)%24)*60-720+720)%1440)+1440)%1440-720,err=Math.abs(reference-equationOfTime(ms));if(err>max){max=err;date=new Date(ms).toISOString();}}
 equation.push({year,maxMinutes:max,date});
 for(const t of solarTerms(year)){const month=new Date(t.instant).getUTCMonth(),deg=(285+30*month)%360,reference=SearchSunLongitude(deg,new Date(Date.UTC(year,month,1)),12);if(!reference)throw new Error('독립 천문 모델 절입을 찾지 못했어요.');const deltaSeconds=(t.instant-reference.date.getTime())/1000;terms.push({year,term:t.name,app:new Date(t.instant).toISOString(),astronomyEngine:reference.date.toISOString(),deltaSeconds});if(Math.abs(deltaSeconds)>90)throw new Error('절입 천문 모델 허용차 초과');}
}
const report={passed:true,meaning:'절입 90초는 기존 프로젝트 비교 허용치. EOT는 짧은 근사식과 별도 태양 좌표 모델의 관측 차이이며 정확도 보증·원문 확인·고급 명리 검증을 뜻하지 않음',equation,terms};
await fs.writeFile('reports/integrated-2.0.0/astronomy-comparison.json',JSON.stringify(report,null,2)+'\n');console.log(`PASS · 독립 천문 모델 절입 ${terms.length} / 균시차 2190일 · 관측 최대 ${Math.max(...equation.map(r=>r.maxMinutes)).toFixed(3)}분`);
