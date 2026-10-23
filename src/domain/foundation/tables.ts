import { elements,stemNames,stemHanja,stemElements,branchNames,branchHanja,branchElements,tenGod,tenGodNames } from '../saju/tables';
import { hiddenStems,hiddenLabels,hiddenPolicy } from '../advanced/mappings';
import { relationPairs,relationTriples } from '../advanced/relations';
import { termDefinitions } from '../calendar/terms';
export const elementTable=elements.map((name,index)=>({id:`element:${index}`,index,name}));
export const stemTable=stemNames.map((name,index)=>({id:`stem:${index}`,index,name,hanja:stemHanja[index],element:stemElements[index],polarity:index%2===0?'양':'음'}));
export const branchTable=branchNames.map((name,index)=>({id:`branch:${index}`,index,name,hanja:branchHanja[index],element:branchElements[index],polarity:index%2===0?'양':'음'}));
export const cycleTable=Array.from({length:60},(_,index)=>({id:`cycle:${index}`,index,stem:index%10,branch:index%12}));
export const tenGodTable=Array.from({length:100},(_,i)=>({id:`ten-god:${Math.floor(i/10)}:${i%10}`,dayStem:Math.floor(i/10),otherStem:i%10,god:tenGod(Math.floor(i/10),i%10)}));
export const hiddenTable=hiddenStems.map((stems,branch)=>({id:`hidden:${branch}`,branch,policy:hiddenPolicy,stems:stems.map((stem,i)=>({stem,role:hiddenLabels[i],weight:[.6,.3,.1][i]})),independentStatus:branch===5?'auxiliary-order-differs-review-pending':'classical-source-review-pending'}));
// Metadata only. Actual instants continue to come from lunar-typescript, never authored here.
const zhongqi=[['大寒','대한'],['雨水','우수'],['春分','춘분'],['谷雨','곡우'],['小满','소만'],['夏至','하지'],['大暑','대서'],['处暑','처서'],['秋分','추분'],['霜降','상강'],['小雪','소설'],['冬至','동지']];
export const termTable=termDefinitions.flatMap(([key,name,month,monthIndex],i)=>[{id:`term:jie:${i}`,key,name,month,monthIndex,isMonthBoundary:true},{id:`term:zhongqi:${i}`,key:zhongqi[i][0],name:zhongqi[i][1],month,monthIndex:null,isMonthBoundary:false}]);
export const foundationTables={elements:elementTable,stems:stemTable,branches:branchTable,cycle:cycleTable,tenGods:tenGodTable,hidden:hiddenTable,terms:termTable,relations:{pairs:relationPairs,triples:relationTriples},tenGodNames};
export const foundationPolicies={time:'KR-SOLAR-MIDNIGHT-1.0',history:'IANA-Asia-Seoul; DST ambiguity rejected',birthRange:'1962-01-01..Korean-today',periodRange:'1962-01-01..2050-12-31',luck:'3 actual days = 1 symbolic year; Gregorian addition; existing 2.0.0 policy',scores:'SIX-SECTOR-CONTEXT-1.0',sources:['lunar-typescript@1.8.6','korean-lunar-calendar@0.4.0','service-adopted-candidate-policy'],pending:['巳 보조 지장간 순서와 가중치','도시 중심 좌표 독립 대조','강약·용신 독립 검토']};
