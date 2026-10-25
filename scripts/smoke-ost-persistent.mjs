import fs from 'node:fs';import http from 'node:http';import path from 'node:path';import {fileURLToPath} from 'node:url';import {chromium} from 'playwright';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.mp3':'audio/mpeg','.json':'application/json'};
const server=http.createServer((req,res)=>{try{const f=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile()){res.writeHead(404);res.end();return}res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');fs.createReadStream(f).pipe(res)}catch{res.writeHead(400);res.end()}});
await new Promise(done=>server.listen(0,'127.0.0.1',done));
const base='http://127.0.0.1:'+server.address().port;const browser=await chromium.launch({headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
let checks=0;const test=(v,name)=>{checks++;if(!v)throw Error(name)};
try{for(const [lang,home] of [['zh','FUNAI-CARE.html'],['ja','FUNAI-CARE_jp.html']]){
 const page=await browser.newPage({viewport:{width:1440,height:900}});
 await page.route('**/*',r=>r.request().url().startsWith(base+'/')?r.continue():r.abort());
 await page.goto(base+'/listen.html?page='+encodeURIComponent(home),{waitUntil:'domcontentloaded'});
 await page.locator('#bio-website').waitFor();
 const frame=page.frameLocator('#bio-website');
 await frame.locator('body[data-page="home"]').waitFor();
 test(await frame.locator('#bio-ost-entry').count()===0,lang+' no duplicate music entry inside continuous mode');
 test(await page.locator('#persistent-mini').count()===0,lang+' no obstructing mini player');
 test(await page.locator('#persistent-dock #persistent-expand').count()===1,lang+' one in-flow OST control');
 test(await page.evaluate(()=>{const bar=document.querySelector('#persistent-dock').getBoundingClientRect(),site=document.querySelector('#bio-website').getBoundingClientRect();return bar.top>=0&&bar.bottom<=site.top+1&&site.bottom<=innerHeight+1;}),lang+' desktop OST dock stays outside site viewport');
 test(await page.evaluate(()=>!!window.BioGlobalOST),lang+' shell exists');
 test(await frame.locator('.site-bottom-nav').count()===1,lang+' original mobile nav retained');
 await page.locator('#persistent-expand').click();
 test(await page.locator('#persistent-progress').count()===1&&await page.locator('#persistent-next').count()===1,lang+' v1.2 seek and next track');
 await page.locator('#persistent-mode').selectOption('shuffle');
 test(await page.locator('#persistent-mode').inputValue()==='shuffle',lang+' shuffle selection');
 await page.locator('#persistent-mode').selectOption('list');
 await page.locator('#persistent-track').selectOption('1');
 test((await page.evaluate(()=>window.BioGlobalOST.state.track))===1,lang+' track changes');
 const before=await page.evaluate(()=>{window.__originalSound=window.BioGlobalOST.state.element;return window.BioGlobalOST.state.src});
 test(before.includes('burner-sister'),lang+' selected source');
 await frame.locator('.site-header a').filter({hasText:lang==='zh'?'世界觀':'世界観'}).first().click();
 await frame.locator('body[data-page="world"]').waitFor();
 test(await page.evaluate(()=>window.BioGlobalOST.state.element===window.__originalSound),lang+' same audio object after navigation');
 await page.waitForFunction(()=>new URL(location.href).searchParams.get('page')?.includes('/world.html'),null,{timeout:3500});
 test(new URL(page.url()).searchParams.get('page')?.includes('/world.html'),lang+' deep route state updated');
 await frame.locator('a[href*="music.html"]').first().click();
 await frame.locator('.ost-player-card').first().waitFor();
 await frame.locator('.ost-shell-play').first().waitFor({state:'visible',timeout:8000});
 test(await frame.locator('.ost-shell-play').count()===4,lang+' songs use shared persistent audio');
 await frame.locator('.ost-shell-play').first().click();
 test((await page.evaluate(()=>window.BioGlobalOST.state.track))===0,lang+' song card selects OST');
 await frame.locator('a[href*="play.html"]').first().click();
 await frame.locator('body[data-page="play"]').waitFor();
 test(await page.evaluate(()=>window.BioGlobalOST.state.element===window.__originalSound),lang+' same audio object after second navigation');
 const focus=await page.evaluate(()=>{
  const m=window.BioGlobalOST,first={},second={};m.otherAudioStarted(first);m.otherAudioStarted(second);
  const both=m.state.otherAudioCount===2;
  m.otherAudioStopped(first);const still=m.state.otherAudio&&m.state.otherAudioCount===1;
  m.otherAudioStopped(second);const cleared=!m.state.otherAudio&&m.state.otherAudioCount===0;
  m.gameStart();const game=m.state.gameActive;m.gameEnd();const restored=!m.state.gameActive;
  return {both,still,cleared,game,restored};
 });
 test(Object.values(focus).every(Boolean),lang+' audio focus tracks concurrent sources and game lifecycle');

 // Navigate using a real player entry to the actual game center, not a mocked
 // controller. Keep the original persistent audio element across both games.
 await frame.locator('.experience-hero a[href*="/arcade/"]').click();
 await frame.locator('[data-launch="g01"]').waitFor();
 await page.setViewportSize({width:390,height:844});
 test(await page.evaluate(()=>{const bar=document.querySelector('#persistent-dock').getBoundingClientRect(),site=document.querySelector('#bio-website').getBoundingClientRect();return bar.bottom<=site.top+1&&bar.width<=innerWidth&&site.bottom<=innerHeight+1;}),lang+' mobile OST dock does not cover site or bottom navigation');
 test(await page.evaluate(()=>window.BioGlobalOST.state.element===window.__originalSound),lang+' music object stays alive entering Arcade on mobile');
 await frame.locator('[data-launch="g01"]').click();
 await frame.locator('#setup-play').click();
 await frame.locator('#stage.active').waitFor();
 await page.waitForFunction(()=>window.BioGlobalOST.state.gameActive===true);
 test(await page.locator('#persistent-expand').isHidden(),lang+' background player hides during G01');
 await frame.locator('#stage-back').click();
 await page.waitForFunction(()=>window.BioGlobalOST.state.gameActive===false);
 test(await page.locator('#persistent-expand').isVisible(),lang+' background player returns after G01');

 await frame.locator('[data-launch="g02"]').click();
 await frame.locator('#setup-play').click();
 await frame.locator('#g02-frame').waitFor();
 await page.waitForFunction(()=>window.BioGlobalOST.state.gameActive===true);
 test(await page.locator('#persistent-expand').isHidden(),lang+' background player hides during G02');
 await frame.locator('#stage-back').click();
 await page.waitForFunction(()=>window.BioGlobalOST.state.gameActive===false);
 test(await page.evaluate(()=>window.BioGlobalOST.state.element===window.__originalSound),lang+' original soundtrack player survives G02 iframe disposal');

 await page.close();
 }console.log('PERSISTENT OST PASS '+checks+' bilingual browser assertions');
}finally{await browser.close();await new Promise(done=>server.close(done));}
