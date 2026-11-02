// Lightweight, real-Chromium responsive proof. Unlike the QR+RTC acceptance
// suite this requires no live Worker; its full integration remains mandatory
// in signaling-local-rtc where the local Worker is actually running.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {signalingTestServer} from './lib/signaling-test-server.mjs';
const server=await signalingTestServer();
const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE}:{})});
const origin='http://127.0.0.1:8790';
try{
 for(const language of ['zh','ja']){
  for(const spec of [
   {game:'g03',mode:'stairs',w:480,h:720},
   {game:'g04',mode:'pinball',w:600,h:720},
   {game:'g06',mode:'race',w:640,h:800}
  ]){
   const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
   try{
    await page.goto(origin+'/arcade/friends/index.html?lang='+language);
    await page.waitForFunction(()=>!!window.BioFriendsApp?.session);
    const v=await page.evaluate(async spec=>{
     const s=window.BioFriendsApp.session;
     // This test covers UI geometry only. The true two-browser Worker tests
     // cover authority, pairing, RTC and result settlement separately.
     s.update=()=>{};s.role='host';s.epoch=1;
     s.config={game:spec.game,mode:spec.mode,heroes:[0,3],chapter:1,difficulty:'normal',room:'',epoch:1};
     s.adapter={game:{w:spec.w,h:spec.h,hud:()=>'',draw:()=>{}},drawOpponent:()=>true,dispose:()=>{}};
     s.phase='playing';document.body.classList.add('auto-connected');s.changed();
     await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
     const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,top:r.top};};
     const canvas=rect('game-canvas'),stage=rect('viewport'),dock=rect('opponent-dock'),controls=rect('touch-controls');
     const action=key=>{const e=document.querySelector('#touch-controls [data-action="'+key+'"]');return e?{left:e.getBoundingClientRect().left,label:e.textContent.trim(),visible:!e.hidden}:null;};
     return {canvas,stage,dock,controls,down:action('down'),jump:action('jump'),fire:action('fire'),skill:action('skill'),
      overflow:document.documentElement.scrollWidth>innerWidth};
    },spec);
    assert(!v.overflow,'No horizontal overflow: '+language+'/'+spec.game);
    assert(v.canvas.height>0&&v.canvas.width>0,'Visible playfield: '+spec.game);
    assert(v.canvas.bottom<=v.controls.top+3,'Action buttons do not obscure board: '+spec.game);
    if(spec.game==='g03'||spec.game==='g04'){
     assert(v.dock.bottom<=v.stage.top+2,'Peer preview must be above stage: '+spec.game);
     assert(Math.abs(v.canvas.height/v.canvas.width-spec.h/spec.w)<.03,'Use actual solo portrait ratio: '+spec.game);
     assert(v.stage.height-v.canvas.height<(spec.game==='g03'?30:120),'No wasted vertical letterbox: '+spec.game);
    }
    if(spec.game==='g03')assert(v.down.visible&&v.jump.visible&&v.down.left<v.jump.left,
      'Stairs: DOWN left, JUMP right');
    if(spec.game==='g04')assert(v.fire.visible&&v.skill.visible,'Pinball actions remain visible');
    if(spec.game==='g06'){
     assert(v.down.visible&&v.fire.visible&&v.down.left+6<v.fire.left,
      'Racing: BRAKE left, BOOST right: '+language);
     assert(language==='zh'?v.down.label==='煞車'&&v.fire.label==='氮氣':v.down.label==='ブレーキ'&&v.fire.label==='ブースト',
      'Racing action labels match solo: '+language);
    }
   }finally{await page.close();}
  }
 }
 console.log('PASS batch 5 solo portrait G03/G04, G06 touch order, zh/ja in real Chromium');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
