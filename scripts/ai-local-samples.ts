import fs from 'node:fs/promises';
import {deriveFacts} from '../worker/src/facts';
import {validateAnswer} from '../worker/src/model';
import {localAI} from '../worker/local/model';
import type {AiRequest} from '../src/ai/contracts';
const questions=['2027년에는 어떤 생활을 돌아보면 좋을까요?','내년에 이사해도 될까요?','올해 이직을 준비해도 될까요?','2027년 공부와 일은 어떻게 생각할까요?','내년에 취업할 수 있을까요?','올해 이사를 준비할까요?','2027년의 관계를 살펴보고 싶어요.','내년에 면접을 준비해도 될까요?','올해 직장을 옮길까요?','2027년의 선택을 고민하고 있어요.','내년에 집을 옮기는 게 나을까요?','올해 취업 준비를 계속할까요?','2027년에는 어떤 점을 돌아볼까요?','내년에 이직을 생각하고 있어요.','올해 이사를 해도 될까요?','2027년 일을 준비할 때 참고할 점이 있나요?','내년에 취업을 준비할까요?','올해 다른 직무를 알아볼까요?','2027년의 공부를 돌아보고 싶어요.','내년에 이사할지 고민이에요.','올해 직장 이동을 준비할까요?','2027년에는 어떤 경험을 살펴볼까요?','내년에 새로운 일을 준비해도 될까요?','올해 취업을 준비하는 게 좋을까요?'];
const rows=[],history:AiRequest['history']=[];const now=Date.parse('2026-10-28T03:00:00Z');
for(const [i,question] of questions.entries()){
 if(i%3===0)history.length=0;
 const req:AiRequest={stage:i%3===0?'initial':'followup',birth:{year:1995,month:11,day:8,hour:15,minute:3,unknownTime:i%6===3,calendar:'solar',leap:false},question,history:history.slice(-4),saveBirth:false,saveConversation:false};if(req.birth.unknownTime){delete req.birth.hour;delete req.birth.minute;}
 const period={kind:'year' as const,target:'2027-01-01',label:'2027년'};const facts=deriveFacts(req.birth,period,now);const result=await localAI.generate(req,facts,period.label,new AbortController().signal);const answer=validateAnswer(result.answer,facts,period.label);const text=[answer.answer,...answer.interpretations.map(p=>p.text),...answer.practicalChecks].join('\n');rows.push({question,stage:req.stage,answer,characters:[...text].length,simulatedControlUsage:result.usage,realProviderCalled:false});history.push({role:'user',text:question},{role:'assistant',text:text.slice(0,1500)});
}
const lengths=rows.map(r=>r.characters).sort((a,b)=>a-b);await fs.mkdir('reports/ai-saju',{recursive:true});await fs.writeFile('reports/ai-saju/local-samples.json',JSON.stringify({mode:'local demonstration, not actual model quality or paid token measurement',samples:rows.length,characters:{p50:lengths[Math.ceil(lengths.length*.5)-1],p95:lengths[Math.ceil(lengths.length*.95)-1]},actualBilledTokens:null,rows},null,2)+'\n');console.log(`PASS ${rows.length} Korean local examples; actual model calls: 0; actual token/quality benchmark pending operator setup.`);
