/* Batch 0 diagnostic only: supplied dt, not a device FPS benchmark. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../../assets/games-core.js'),'utf8');
const input={left:false,right:false,up:false,down:false,fire:false,skill:false};
const rates=[120,60,30,20,15,10].map(fps=>{
 let state=1;const math=Object.create(Math);
 math.random=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/4294967296);
 const cx={window:{},Math:math};vm.runInNewContext(source,cx);
 const game=cx.window.BioSuiteGames.g06({hero:0,difficulty:'normal',chapter:1,testMode:true,sfx(){},finish(){}});
 game.w=960;game.h=540;game.start();
 for(let frame=0;frame<fps;frame++)game.update(1/fps,input);
 const race=game.inspectRace();
 return {input_fps:fps,wall_seconds_supplied:1,engine_elapsed_seconds:race.elapsed,progress:race.progress};
});
console.log(JSON.stringify({description:'Headless Node engine probe; each case supplies exactly one second of dt, not a physical device FPS benchmark.',game:'g06',rates},null,2));
