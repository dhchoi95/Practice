// 독립 기대값만 수집. 앱의 절기/사주 엔진을 import하지 않는다.
import { SearchSunLongitude } from 'astronomy-engine';
import fs from 'node:fs/promises';
const names=['소한','입춘','경칩','청명','입하','망종','소서','입추','백로','한로','입동','대설'];
const longitude=[285,315,345,15,45,75,105,135,165,195,225,255];
const records=[];
for(const year of [1962,1987,1988,2000,2024,2026])for(let month=1;month<=12;month++){
  const result=SearchSunLongitude(longitude[month-1],new Date(Date.UTC(year,month-1,1)),12);
  if(!result)throw new Error('독립 태양 황경 해 찾기 실패');
  records.push({id:`independent-term-${year}-${month}`,input:{year,term:names[month-1]},expectedInstant:result.date.toISOString(),toleranceSeconds:90,source:'Astronomy Engine 2.1.19 / VSOP87 solar longitude',sourceUrl:'https://github.com/cosinekitty/astronomy',verifiedAt:'2026-10-20',policy:'UT solar longitude vs UTC+8-normalized lunar-typescript; astronomical approximation tolerance, not exact-second certification',comparableFields:['solarTerm.instant'],independent:true});
}
await fs.writeFile('tests/fixtures/astronomy-golden.json',JSON.stringify(records,null,2)+'\n');
console.log(`${records.length} independent solar-term fixtures`);
