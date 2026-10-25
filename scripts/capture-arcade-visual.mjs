// Captures only real running game canvases; these become the six playable-game covers.
import fs from 'node:fs';import http from 'node:http';import path from 'node:path';
import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),covers=path.join(root,'arcade/assets/covers'),qa=path.join(root,'arcade/qa/visual-v11');
fs.mkdirSync(covers,{recursive:true});fs.mkdirSync(qa,{recursive:true});
const mime={'.html':'text/html;charset=utf-8','.css':'text/css;charset=utf-8','.js':'text/javascript;charset=utf-8','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{try{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);}catch{res.writeHead(400);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
async function snapshot(page,name,fullPage=false){const png=await page.screenshot({fullPage,type:'png'});const webp=await page.evaluate(async source=>{const img=new Image();img.src=source;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;c.getContext('2d').drawImage(img,0,0);return c.toDataURL('image/webp',.9);},'data:image/png;base64,'+png.toString('base64'));fs.writeFileSync(path.join(qa,name+'.webp'),Buffer.from(webp.split(',')[1],'base64'));}
try{
 if(process.argv.includes('--covers')){
  const page=await browser.newPage({viewport:{width:960,height:670},deviceScaleFactor:1});
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await page.goto(origin+'/arcade/zh/index.html',{waitUntil:'domcontentloaded'});
  for(const [i,id]of ['g01','g02','g03','g04','g05','g06'].entries()){
   await page.locator(`[data-launch="${id}"]`).click();await page.locator(`[data-hero="${[0,1,3,5,2,6][i]}"]`).click();
   if(id==='g05')await page.locator('[data-mode="volley"]').click();
   await page.locator('#setup-play').click();
   let frame=page;
   if(id==='g02'){frame=page.frames().find(f=>f.url().includes('/shooter.html'));await page.frameLocator('#g02-frame').locator('canvas').waitFor();frame=page.frames().find(f=>f.url().includes('/shooter.html'));}
   await frame.waitForFunction(()=>window.BioGuardianArt?.inspect().atlases.some(x=>x.ready));
   const box=await frame.locator('canvas').boundingBox();await page.setViewportSize({width:960,height:Math.round(page.viewportSize().height+540-box.height)});await page.waitForTimeout(100);
   if(id==='g01'){await page.keyboard.down('d');await page.waitForTimeout(1100);await page.keyboard.up('d');await page.keyboard.down('j');await page.waitForTimeout(500);await page.keyboard.up('j');}
   else if(id==='g02'){await page.waitForTimeout(2500);await page.keyboard.down('Space');await page.waitForTimeout(500);await page.keyboard.up('Space');}
   else if(id==='g03'){await page.keyboard.down('s');await page.keyboard.down('d');await page.waitForTimeout(280);await page.keyboard.up('s');await page.keyboard.up('d');}
   else if(id==='g04'){await page.waitForTimeout(800);await page.keyboard.press('Space');await page.waitForTimeout(350);}
   else if(id==='g05')await page.waitForTimeout(1150);
   else if(id==='g06')await page.waitForTimeout(2100);
   const url=await frame.locator('canvas').evaluate(c=>c.toDataURL('image/webp',.9));
   fs.writeFileSync(path.join(covers,id+'.webp'),Buffer.from(url.split(',')[1],'base64'));
   await page.locator('#stage-back').click();
  }
  await page.close();console.log('Captured 6 actual gameplay covers.');
 }
 for(const lang of ['zh','ja'])for(const [device,viewport]of [['desktop',{width:1440,height:1000}],['mobile',{width:390,height:844}]]){
  const page=await browser.newPage({viewport,reducedMotion:'reduce',deviceScaleFactor:1});
  await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
  await page.goto(origin+`/arcade/${lang}/index.html`,{waitUntil:'networkidle'});
  await snapshot(page,`${lang}-lobby-${device}`,true);
  await page.locator('[data-launch="g01"]').click();await page.waitForFunction(()=>[...document.querySelectorAll('#hero-choices img')].filter(el=>{const b=el.getBoundingClientRect();return b.left<innerWidth&&b.right>0&&b.top<innerHeight&&b.bottom>0;}).every(el=>el.complete&&el.naturalWidth>0));
  await snapshot(page,`${lang}-selection-${device}`);
  await page.locator('#setup-cancel').click();
  for(const id of device==='desktop'?['g03','g04','g05','g06']:['g05']){
   await page.locator(`[data-launch="${id}"]`).click();await page.locator('[data-hero="2"]').click();
   if(id==='g05')await page.locator('[data-mode="volley"]').click();
   await page.locator('#setup-play').click();await page.waitForTimeout(1100);
   await snapshot(page,`${lang}-${id}-${device}`);
   await page.locator('#stage-help').click();await snapshot(page,`${lang}-${id}-guide-${device}`);
   await page.locator('#guide-close').click();await page.locator('#stage-back').click();
  }
  await page.close();
 }
 console.log('Saved bilingual desktop/mobile visual evidence to arcade/qa/visual-v11.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
