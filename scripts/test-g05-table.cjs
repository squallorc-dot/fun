'use strict';const fs=require('fs'),vm=require('vm'),assert=require('assert');const src=fs.readFileSync(require('node:path').resolve(__dirname,'../arcade/assets/games-core.js'),'utf8');let cases=0;
for(const width of [375,640,960])for(const mode of ['pong','volley'])for(const d of ['normal','hard','expert'])for(let seed=1;seed<=35;seed++){
 let n=seed>>>0,math=Object.create(Math);math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);let ctx={window:{},Math:math};vm.runInNewContext(src,ctx);
 let end;const g=ctx.window.BioSuiteGames.g05({mode,difficulty:d,hero:0,sfx:()=>{},finish:(...a)=>end=a});g.w=width;g.h=width===375?390:510;g.start();assert.deepEqual(Array.from(g.inspectMatch().points),[0,0]);
 let maxRally=0, sawLegalBounce=false;
 for(let i=0;i<9000&&!end;i++){
  const input={left:i%180<50,right:i%180>=50&&i%180<110,up:i%135<40,down:false,fire:i%18<11,jump:i%119===0,dodge:i%137===0,skill:i%171===0,pointer:{down:false,x:280,y:210}};
  g.update(.016,input);
  const state=g.inspectMatch();maxRally=Math.max(maxRally,state.rally);
  if(mode==='pong'&&state.ball?.bouncedReceiver)sawLegalBounce=true;
 }
 if(!end||typeof end[0]!=='boolean'||!Number.isFinite(end[1]))throw Error(`${width}/${mode}/${d}/${seed} no result points=${JSON.stringify(g.inspectMatch().points)}`);
 if(mode==='pong'&&!sawLegalBounce)throw Error(`${width}/${mode}/${d}/${seed} did not record a legal return bounce`);
 g.start();assert.deepEqual(Array.from(g.inspectMatch().points),[0,0], 'restart point totals');
 cases++;
}
console.log(`${cases} G05 modes x difficulty x viewport x seed, legal bounces, and restart: PASS`);