// Same seed, input, 120Hz ticks and camera on both sides of a visual comparison.
// Hooks exist only in HTTP responses served by this test, never in production.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),root=path.resolve(process.env.ART_ROOT||repo),label=process.env.ART_LABEL||'after',out=path.resolve(process.env.ART_OUTPUT||path.join(repo,'arcade/qa/art-v15'),label);fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.mp3':'audio/mpeg'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true,args:['--no-sandbox']});let checks=0;const samples=[];const check=(v,s)=>{assert(v,s);checks++;};
const sizes=[[1440,900,2],[1920,1080,1],[390,844,3],[844,390,2]],keys={g01:'street',g02:'defense',g03:'shaft',g04:'laboratory',g05:'arena',g06:'race'};
try{for(const locale of ['zh','ja'])for(const [width,height,dpr]of sizes){
 const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:dpr,hasTouch:width<1000,isMobile:width<1000});
 await context.addInitScript(()=>{let n=7429;window.__seed=()=>{n=7429;};Math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);window.requestAnimationFrame=()=>1;window.cancelAnimationFrame=()=>{};localStorage.setItem('bio_arcade_pref_v1',JSON.stringify({audioRevision:2,playMode:'manual',auto:false,volume:0,sfx:0}));});
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.url().startsWith(origin+'/')&&r.status()>=400)errors.push('HTTP '+r.status()+' '+r.url());});
 await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());
 await page.route('**/hub.js*',r=>{let s=fs.readFileSync(path.join(root,'arcade/assets/hub.js'),'utf8');s=s.replace('game=gameCode({hero:','game=gameCode({testMode:true,hero:').replace('window.BioSuiteHub={','window.__capture=()=>{const input={moveX:0,moveY:0,pointer:{down:false}};for(let i=0;i<(active==="g06"?720:360);i++)game.update(1/120,input);document.querySelector("#stage-hud").innerHTML=game.hud();resizeCanvas();const state=JSON.stringify(BioSuiteHub.inspectGame());game.draw(document.querySelector("#hub-canvas").getContext("2d"));return {before:state,after:JSON.stringify(BioSuiteHub.inspectGame())};};window.BioSuiteHub={');return r.fulfill({contentType:'text/javascript',body:s});});
 await page.route('**/arcade-engine.js*',r=>{let s=fs.readFileSync(path.join(root,'assets/arcade-engine.js'),'utf8');s=s.replace('shell();','window.__capture=()=>{for(let i=0;i<360;i++)update(1/120);refreshHud();fitCanvas();const state=JSON.stringify(game);draw();return {before:state,after:JSON.stringify(game)};};shell();');return r.fulfill({contentType:'text/javascript',body:s});});
 await page.goto(origin+`/arcade/${locale}/index.html`);
 for(const id of Object.keys(keys)){
  await page.locator(`[data-launch="${id}"]`).click();await page.locator('[data-hero="0"]').click();if(id==='g05')await page.locator('[data-mode="pong"]').click();await page.evaluate(()=>window.__seed());await page.locator('#setup-play').click();
  let frame=page;if(id==='g02'){await page.frameLocator('#g02-frame').locator('.arcade-playing').waitFor();frame=page.frames().find(f=>f.url().includes('/shooter.html'));}else await page.waitForFunction(()=>!BioSuiteHub.debugState.loading&&!!window.__capture);
  await frame.waitForFunction(key=>BioWorldArt.inspect().some(x=>x.key===key&&x.ready),keys[id]);await page.waitForTimeout(80);const state=await frame.evaluate(()=>window.__capture());check(state.before===state.after,id+' drawing preserves all simulation state');await page.waitForTimeout(80);
  const measure=await frame.locator('canvas').evaluate(async(c,key)=>{const image=new Image();image.src=location.origin+'/arcade/assets/worlds/'+key+'.webp?v=20261025.5';await image.decode();const r=c.getBoundingClientRect(),style=getComputedStyle(c),cw=r.width-parseFloat(style.borderLeftWidth)-parseFloat(style.borderRightWidth),ch=r.height-parseFloat(style.borderTopWidth)-parseFloat(style.borderBottomWidth),m=c.getContext('2d').getTransform(),art=BioWorldArt.inspect().find(x=>x.key===key);return {css:{width:cw,height:ch},box:{width:r.width,height:r.height},backing:{width:c.width,height:c.height},dpr:devicePixelRatio,transform:m.a,pixelsPerDevicePixel:c.width/(cw*devicePixelRatio),aspect:cw/ch,source:{width:image.naturalWidth,height:image.naturalHeight,coverScaleCss:Math.max(cw/image.naturalWidth,ch/image.naturalHeight),coverScaleDevice:Math.max(cw/image.naturalWidth,ch/image.naturalHeight)*devicePixelRatio,note:key==='race'?'Horizon uses only upper 18%; cover factor is not its crop magnification':key==='shaft'?'Scroll tiles fit width; cover factor is an upper bound':'Cover mapping'},art,cache:BioWorldArt.inspectRenderCache(),guardians:BioGuardianArt.inspect(),performance:performance.getEntriesByType('resource').filter(x=>/worlds\/|guardians\//.test(x.name)).map(x=>({file:x.name.split('/').slice(-2).join('/'),bytes:x.encodedBodySize,duration:x.duration}))};},keys[id]);
  const sample={id,locale,width,height,physicsHash:crypto.createHash('sha256').update(state.after).digest('hex'),...measure};samples.push(sample);if(label!=='before')check(Math.abs(measure.aspect-measure.backing.width/measure.backing.height)<.002,id+' no Canvas distortion '+JSON.stringify(measure));if(label!=='before')check(measure.pixelsPerDevicePixel>=.99,id+' backing supports actual CSS size');check(measure.cache.bytes<=16*1024*1024,id+' bounded raster cache');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),id+' no horizontal overflow');
  const file=`${locale}-${width}-${id}.png`;await page.screenshot({path:path.join(out,file)});await page.screenshot({path:path.join(out,`canvas-${file}`),clip:await frame.locator('canvas').boundingBox()});
  await page.locator('#stage-back').click();
 }
 check(!errors.length,errors.join(';'));await context.close();
}
if(label!=='before'){
 const atlas={checked:0,failures:[],audits:[]};
 for(let hero=0;hero<7;hero++){
 const page=await browser.newPage(),requests=[];
 page.on('requestfailed',request=>{if(request.url().startsWith(origin+'/'))requests.push({url:request.url(),failure:request.failure()});});
 page.on('response',response=>{if(response.url().includes('/guardians/'))requests.push({url:response.url(),status:response.status(),type:response.headers()['content-type']});});
 await page.route('**/*',r=>r.request().url().startsWith(origin+'/')?r.continue():r.abort());await page.goto(origin+'/arcade/zh/index.html');
 try{const one=await page.evaluate(async hero=>{
  let checked=0;const failures=[],canvas=document.createElement('canvas');canvas.width=2560;canvas.height=2880;const ctx=canvas.getContext('2d',{willReadFrequently:true});

   await BioGuardianArt.preload([hero,'enemy-grunt','enemy-brute','enemy-ranged','enemy-boss'],{highResolutionHero:true});
   const info=BioGuardianArt.inspect();if(info.cached!==5||info.decodedBytes>56.25*1024*1024||info.atlases.filter(x=>x.resolution===2).length!==1)failures.push('cache '+hero);
   const image=new Image();image.src='../assets/guardians/2x/'+BioGuardianArt.keyFor(hero)+'.png';try{await image.decode();}catch(error){throw Error('Atlas decode '+JSON.stringify({hero,url:image.currentSrc||image.src,width:image.naturalWidth,cache:info,memory:performance.memory?.usedJSHeapSize,error:String(error)}));}if(image.width!==2560||image.height!==2880)failures.push('dimensions '+hero);
   ctx.clearRect(0,0,2560,2880);ctx.drawImage(image,0,0);const data=ctx.getImageData(0,0,2560,2880).data;
   for(let f=0;f<71;f++){let visible=false;const sx=f%8*320,sy=Math.floor(f/8)*320;for(let y=0;y<320;y++)for(let x=0;x<320;x++){if(data[((sy+y)*2560+sx+x)*4+3]){visible=true;if(x<4||x>=316||y<4||y>=316)failures.push('clipped '+hero+'/'+f);}}if(!visible)failures.push('empty '+hero+'/'+f);checked++;}
  return {checked,failures,hero,memory:performance.memory?.usedJSHeapSize};
 },hero);atlas.checked+=one.checked;atlas.failures.push(...one.failures);atlas.audits.push({...one,requests});
 }catch(error){atlas.failures.push({hero,error:String(error),requests});throw error;
 }finally{fs.writeFileSync(path.join(out,'atlas-audit.json'),JSON.stringify(atlas,null,2));await page.close();}
 }
 fs.writeFileSync(path.join(out,'atlas-audit.json'),JSON.stringify(atlas,null,2));check(atlas.checked===497,'all high-resolution animation frames decoded');check(!atlas.failures.length,atlas.failures.slice(0,5).join(';'));
 const recovery=await browser.newPage();await recovery.route('**/*',r=>r.request().url().includes('/guardians/2x/')||!r.request().url().startsWith(origin+'/')?r.abort():r.continue());await recovery.goto(origin+'/arcade/ja/index.html');
 const fallback=await recovery.evaluate(async()=>{await BioGuardianArt.preload([0],{highResolutionHero:true});const c=document.createElement('canvas');return {info:BioGuardianArt.inspect(),drawn:BioGuardianArt.draw(c.getContext('2d'),0,'idle',0,80,140)};});
 check(fallback.drawn&&fallback.info.atlases[0].fallback&&fallback.info.atlases[0].resolution===1&&fallback.info.atlases[0].ready,'missing optional 2x atlas falls back to decoded native image');await recovery.close();
}
fs.writeFileSync(path.join(out,'measurements.json'),JSON.stringify({label,seed:7429,ticks:{g06:720,others:360},checks,samples},null,2)+'\n');console.log(`ART BROWSER PASS ${checks} checks / ${samples.length} same-seed scenes (${label})`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
