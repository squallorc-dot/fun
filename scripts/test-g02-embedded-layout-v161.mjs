// G02 embedded multiplayer must not render its own touch controls in addition
// to the outer lobby. No signaling room, tokens, SDP or persistent data.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {signalingTestServer} from './lib/signaling-test-server.mjs';
const server=await signalingTestServer(),origin='http://127.0.0.1:8790';
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
try{
 for(const lang of ['zh','ja'])for(const viewport of [{width:390,height:844},{width:1280,height:800}]){
  const page=await browser.newPage({viewport,hasTouch:viewport.width<600,isMobile:viewport.width<600});
  await page.route('**/*',route=>route.request().url().startsWith(origin+'/')?route.continue():route.abort());
  await page.goto(origin+'/arcade/'+lang+'/shooter.html');
  await page.waitForFunction(()=>!!window.BioArcadeShooter&&!!document.querySelector('[data-ar-hero]'),null,{timeout:25000});
  await page.evaluate(()=>window.postMessage({source:'bio-city-hub',command:'coop-net-init',version:1,epoch:1,role:'host',hero:0,remoteHero:3,chapter:1,difficulty:'normal'},location.origin));
  await page.waitForFunction(()=>!!document.querySelector('#arcade-root.arcade-network .arcade-playing #arcade-canvas'),null,{timeout:35000});
  const v=await page.evaluate(()=>{
   const root=document.querySelector('#arcade-root'),dock=root.querySelector('.arcade-touch-controls'),canvas=root.querySelector('#arcade-canvas'),stage=canvas.parentElement;
   const box=stage.getBoundingClientRect(),game=canvas.getBoundingClientRect();
   return {network:root.classList.contains('arcade-network'),display:getComputedStyle(dock).display,dockHeight:dock.getBoundingClientRect().height,
    stageWidth:box.width,stageHeight:box.height,gameWidth:game.width,gameHeight:game.height,count:root.querySelectorAll('.arcade-touch-controls').length};
  });
  assert(v.network,lang+' multiplayer network mode enabled');
  assert.equal(v.count,1,'shooter has one internal dock, now suppressed');
  assert.equal(v.display,'none',lang+' network shooter has no second visible controls');
  assert.equal(v.dockHeight,0,lang+' internal controls reserve zero space');
  const limit=Math.min(v.stageWidth,v.stageHeight);
  assert(v.gameWidth>=limit*.75&&v.gameHeight>=limit*.75,lang+' board fills the available square '+JSON.stringify(v));
  await page.close();
 }
 console.log('PASS G02 embedded layout: single parent input surface, enlarged battlefield, zh/ja phone/desktop');
}finally{await browser.close();await new Promise(r=>server.close(r));}
