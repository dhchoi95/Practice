import { stemElements } from '../saju/tables';
import { hiddenStems } from './mappings';
import type { Pillar } from '../saju/types';
import type { Relation } from './types';
export interface PlacedPillar {position:string;pillar:Pillar}
export const relationPairs:Record<string,number[][]>={육합:[[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]],충:[[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]],해:[[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]],파:[[0,9],[1,4],[2,11],[3,6],[5,8],[7,10]],형:[[0,3],[2,5],[5,8],[8,2],[1,10],[10,7],[7,1]],자형:[[4,4],[6,6],[9,9],[11,11]]};
export const relationTriples=[{kind:'삼합',branches:[8,0,4],element:'수'},{kind:'삼합',branches:[11,3,7],element:'목'},{kind:'삼합',branches:[2,6,10],element:'화'},{kind:'삼합',branches:[5,9,1],element:'금'},{kind:'방합',branches:[2,3,4],element:'목'},{kind:'방합',branches:[5,6,7],element:'화'},{kind:'방합',branches:[8,9,10],element:'금'},{kind:'방합',branches:[11,0,1],element:'수'}];
export function findRelations(placed:PlacedPillar[],layer='원국',monthBranch?:number):Relation[]{
 const out:Relation[]=[];
 for(let i=0;i<placed.length;i++)for(let j=i+1;j<placed.length;j++){
  const a=placed[i],b=placed[j],bs=[a.pillar.branch,b.pillar.branch];
  for(const [kind,table] of Object.entries(relationPairs))if(table.some(([x,y])=>(x===bs[0]&&y===bs[1])||(x===bs[1]&&y===bs[0])))out.push({id:`${layer}:${kind}:${a.position}:${b.position}`,kind,layer,positions:[a.position,b.position],branches:bs,level:kind==='충'||kind==='해'||kind==='파'?'presence':'candidate',reasons:['두 자리의 지지 대응을 확인했어요.'],counter:['출현만으로 실제 사건이나 관계의 결말은 정하지 않아요.'],transformation:false});
  if(Math.abs(a.pillar.stem-b.pillar.stem)===5)out.push({id:`${layer}:천간합:${a.position}:${b.position}`,kind:'천간합',layer,positions:[a.position,b.position],branches:bs,level:'candidate',reasons:['천간의 오합 대응이에요.'],counter:['계절·뿌리와 합화 조건을 충족했다고 확정하지 않아요.'],transformation:false});
 }
 for(const triple of relationTriples){
  if(!triple.branches.every(b=>placed.some(p=>p.pillar.branch===b)))continue;
  const members=placed.filter(p=>triple.branches.includes(p.pillar.branch));
  const exposed=placed.some(p=>stemElements[p.pillar.stem]===triple.element);
  const season=monthBranch!==undefined&&stemElements[hiddenStems[monthBranch][0]]===triple.element;
  const interrupted=out.some(r=>r.kind==='충'&&r.positions.some(pos=>members.some(m=>m.position===pos)));
  out.push({id:`${layer}:${triple.kind}:${triple.element}`,kind:triple.kind,layer,positions:members.map(p=>p.position),branches:triple.branches,element:triple.element,level:exposed&&season&&!interrupted?'supported':'candidate',reasons:['세 지지가 모두 있어요.',...(exposed?['같은 오행의 천간이 드러나요.']:[]),...(season?['월지 본기가 같은 오행이에요.']:[])],counter:[...(interrupted?['구성 지지에 충도 있어 함께 검토해요.']:[]),'세 글자의 출현과 합화는 달라요. 다른 오행을 없애거나 바꾸어 세지 않아요.'],transformation:false});
 }
 return out.sort((a,b)=>a.id.localeCompare(b.id,'en'));
}
