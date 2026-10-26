'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),scope={setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync(path.join(root,'arcade/assets/session-runtime.js'),'utf8'),scope);
const {countdown,prepare}=scope.BioArcadeSession;
function clock(){let now=0,next=0;const pending=new Map();return {
 setTimer(fn,delay){const id=++next;pending.set(id,{at:now+delay,fn});return id;},
 clearTimer(id){pending.delete(id);},
 advance(ms){const end=now+ms;while(true){const item=[...pending.entries()].sort((a,b)=>a[1].at-b[1].at)[0];if(!item||item[1].at>end)break;pending.delete(item[0]);now=item[1].at;item[1].fn();}now=end;},
 size:()=>pending.size
};}
(async()=>{
 const time=clock(),ticks=[];let resumed=0;
 const timer=countdown({...time,tick:n=>ticks.push(n),done:()=>resumed++});
 timer.start();assert.deepEqual(ticks,[3]);time.advance(2999);assert.equal(resumed,0);assert(timer.running);
 time.advance(1);assert.equal(resumed,1);assert.deepEqual(ticks,[3,2,1]);assert(!timer.running);
 timer.start();time.advance(1200);timer.cancel();time.advance(5000);assert.equal(resumed,1);assert.equal(time.size(),0);
 timer.start();time.advance(1500);timer.start();time.advance(2999);assert.equal(resumed,1);time.advance(1);assert.equal(resumed,2);
 let duringTick;duringTick=countdown({...time,tick:()=>duringTick.cancel(),done:()=>{throw Error('cancelled countdown completed');}});
 duringTick.start();assert.equal(time.size(),0,'cancellation inside a tick must not enqueue another timer');
 await prepare([Promise.resolve(true),Promise.resolve([true,true])]);
 await assert.rejects(prepare([Promise.resolve([true,false])]),/asset-error/);
 await assert.rejects(prepare([Promise.reject(Error('network'))]),/network/);
 await assert.rejects(prepare([new Promise(()=>{})],5),/asset-timeout/);

 // Image onload alone is insufficient: the startup gate waits for decode.
 for(const [file,key,api]of [['world-art.js','street','BioWorldArt'],['guardian-art.js',0,'BioGuardianArt']]){
  const images=[],imageClock=clock();let decodeDone;
  class FakeImage{constructor(){images.push(this);}decode(){return new Promise(resolve=>{decodeDone=resolve;});}set src(value){this.url=value;}}
  const cx={window:{},Image:FakeImage,URL,document:{currentScript:{src:'https://example.test/arcade/assets/'+file}},setTimeout:imageClock.setTimer,clearTimeout:imageClock.clearTimer};
  vm.runInNewContext(fs.readFileSync(path.join(root,'arcade/assets',file),'utf8'),cx);
  const art=cx.window[api],load=()=>art.preload(api==='BioWorldArt'?key:[key]);
  let resolved=false;const pending=load().then(value=>{resolved=true;return value;});
  images[0].onload();await Promise.resolve();await Promise.resolve();assert.equal(resolved,false);
  decodeDone();await pending;assert.equal(resolved,true);
  const other=api==='BioWorldArt'?'shaft':1;
  const failed=art.preload(api==='BioWorldArt'?other:[other]);images[1].onerror();await failed;
  const retry=art.preload(api==='BioWorldArt'?other:[other]);assert.equal(images.length,3,'failed asset gets a fresh request');
  images[2].onload();await Promise.resolve();decodeDone();await retry;
  const stalled=art.preload(api==='BioWorldArt'?'race':[2]);imageClock.advance(12000);
  const value=await stalled;assert.equal(api==='BioWorldArt'?value:value[0],false,'hung image load terminates');
  assert.equal(imageClock.size(),0);
 }
 console.log('SESSION PASS: protected 3s resume, cancellation/restart, failed/hung startup, image decode gate and asset retry.');
})().catch(error=>{console.error(error);process.exitCode=1;});
