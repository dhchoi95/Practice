import fs from 'node:fs/promises';
import path from 'node:path';
const drafts=JSON.parse(await fs.readFile('content-review/compound-drafts.json','utf8'));
async function walk(directory){
  const entries=await fs.readdir(directory,{withFileTypes:true});
  return (await Promise.all(entries.map(e=>e.isDirectory()?walk(path.join(directory,e.name)):[path.join(directory,e.name)]))).flat();
}
const files=await walk('out'),leaks=[];
for(const file of files){
  if(!/\.(js|html|json|txt)$/.test(file))continue;
  const body=await fs.readFile(file,'utf8');
  for(const draft of drafts)if(body.includes(draft.id)||body.includes(draft.title))leaks.push({file,id:draft.id});
}
const rootIndex=files.includes('out/index.html');
const report={passed:rootIndex&&!leaks.length,method:'Scan actual static export text for every unique draft ID and title',rootIndex,files:files.length,draftIds:drafts.map(d=>d.id),leaks};
await fs.mkdir('reports/content-improvement-1.4.0',{recursive:true});
await fs.writeFile('reports/content-improvement-1.4.0/build-policy.json',JSON.stringify(report,null,2)+'\n');
console.log(`${report.passed?'PASS':'FAIL'} · out/ ${files.length} files · draft leaks ${leaks.length}`);
if(!report.passed)process.exitCode=1;
