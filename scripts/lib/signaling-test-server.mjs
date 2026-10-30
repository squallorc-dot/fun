// Local same-origin test proxy to Workerd; never records URLs containing credentials or message payloads.
import http from 'node:http';import net from 'node:net';import fs from 'node:fs';import path from 'node:path';
export async function signalingTestServer({harness=false}={}){
 const root=path.resolve('.'),origin='http://127.0.0.1:8790';
 const server=http.createServer((req,res)=>{
  if(req.url.startsWith('/rooms')){const upstream=http.request({host:'127.0.0.1',port:8787,path:req.url,method:req.method,headers:{...req.headers,'cf-connecting-ip':'192.0.2.1'}},response=>{res.writeHead(response.statusCode,response.headers);response.pipe(res);});upstream.on('error',()=>{res.writeHead(502);res.end();});req.pipe(upstream);return;}
  if(harness&&req.url==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><script src="/arcade/assets/peer-link.js"></script><script src="/arcade/assets/friend-signaling.js"></script>');return;}
  const file=path.resolve(root,'.'+new URL(req.url,origin).pathname);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('content-type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
 });
 server.on('upgrade',(req,socket,head)=>{if(!/^\/rooms\/[A-Z2-9]{8}\/socket$/.test(req.url)){socket.destroy();return;}const upstream=net.connect(8787,'127.0.0.1',()=>{upstream.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n`);for(let i=0;i<req.rawHeaders.length;i+=2)if(req.rawHeaders[i].toLowerCase()!=='cf-connecting-ip')upstream.write(req.rawHeaders[i]+': '+req.rawHeaders[i+1]+'\r\n');upstream.write('CF-Connecting-IP: 192.0.2.1\r\n\r\n');if(head.length)upstream.write(head);socket.pipe(upstream).pipe(socket);});upstream.on('error',()=>socket.destroy());socket.on('error',()=>upstream.destroy());});
 await new Promise(r=>server.listen(8790,'127.0.0.1',r));return server;
}
