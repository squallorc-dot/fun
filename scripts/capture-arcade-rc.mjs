// Release candidate actual Chromium captures, not concept renders or mocked canvas.
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),dest=path.join(root,'arcade','qa','rc-v1');
fs.mkdirSync(dest,{recursive:true});
const types={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'application/javascript;charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{try{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res)}catch{res.writeHead(400);res.end()}});
await new Promise(f=>server.listen(0,'127.0.0.1',f));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let made=[];
try{
 for(const lang of ['zh','ja']){
  for(const [device,viewport] of [['desktop',{width:1440,height:900}],['mobile',{width:390,height:844}]]){
   const page=await browser.newPage({viewport,reducedMotion:'reduce',deviceScaleFactor:1});
   await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
   async function snap(file,fullPage=false){await page.screenshot({path:path.join(dest,file),fullPage,animations:'disabled'});made.push(file)}
   await page.goto(origin+'/'+(lang==='zh'?'FUNAI-CARE.html':'FUNAI-CARE_jp.html'),{waitUntil:'domcontentloaded'});
   await page.locator('.home-arcade-feature').scrollIntoViewIfNeeded();await snap(lang+'-home-arcade-'+device+'.png');
   await page.goto(origin+'/'+lang+'/play.html',{waitUntil:'domcontentloaded'});
   await page.locator('.experience-index').scrollIntoViewIfNeeded();await snap(lang+'-play-overview-'+device+'.png');
   await page.goto(origin+'/arcade/'+lang+'/index.html',{waitUntil:'domcontentloaded'});
   await page.locator('#game-list .game-card').first().waitFor();await snap(lang+'-arcade-lobby-'+device+'.png');
   await page.locator('[data-launch="g01"]').click();await page.locator('#setup.show').waitFor();await snap(lang+'-g01-select-'+device+'.png');
   await page.locator('#setup-play').click();await page.locator('#hub-canvas').waitFor();await page.waitForTimeout(700);await snap(lang+'-g01-battle-'+device+'.png');
   await page.locator('#stage-back').click();
   if(device==='desktop'){
    for(const mode of ['volley','pong']){
     await page.locator('[data-launch="g05"]').click();await page.locator('[data-mode="'+mode+'"]').click();await page.locator('#setup-play').click();await page.locator('#hub-canvas').waitFor();await page.waitForTimeout(450);await snap(lang+'-g05-'+mode+'-desktop.png');await page.locator('#stage-back').click();
    }
   }
   await page.close();
  }
 }
}finally{await browser.close();await new Promise(f=>server.close(f))}
console.log('RC browser screenshots captured '+made.length+': '+made.join(', '));
