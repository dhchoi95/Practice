import http from 'node:http';
import { readFile,stat } from 'node:fs/promises';
import path from 'node:path';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';
const compress=promisify(gzip);
const root=path.resolve('out');
const port=Number(process.env.PORT||3000);
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.xml':'application/xml; charset=utf-8','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    let file=path.resolve(root,'.'+pathname);
    if(!file.startsWith(root+path.sep)&&file!==root)throw new Error('Invalid path');
    try{if((await stat(file)).isDirectory())file=path.join(file,'index.html');}
    catch{if(!path.extname(file))file=path.join(file,'index.html');}
    const body=await readFile(file);
    const acceptsGzip=(req.headers['accept-encoding']||'').split(',').some(part=>{
      const [encoding,...params]=part.trim().split(';');
      return encoding==='gzip'&&!params.some(p=>p.trim().startsWith('q=')&&Number(p.trim().slice(2))===0);
    });
    const useGzip=acceptsGzip&&body.length>1024&&/\.(?:html|js|css|json|txt|svg|xml)$/.test(file);
    const payload=useGzip?await compress(body):body;
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream',...(useGzip?{'content-encoding':'gzip'}:{}),'content-length':payload.length,'vary':'Accept-Encoding','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','permissions-policy':'camera=(), microphone=(), geolocation=()','cache-control':pathname.startsWith('/_next/static/')?'public, max-age=31536000, immutable':'no-cache'});
    res.end(req.method==='HEAD'?undefined:payload);
  }catch{
    const body=await readFile(path.join(root,'404.html')).catch(()=>Buffer.from('페이지를 찾을 수 없어요.'));
    res.writeHead(404,{'content-type':'text/html; charset=utf-8'});res.end(body);
  }
});
server.listen(port,'0.0.0.0',()=>console.log(`정적 빌드 서버 시작 · port ${port} · out/`));
