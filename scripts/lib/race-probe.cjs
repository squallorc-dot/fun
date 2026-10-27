'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'../..'),source=fs.readFileSync(path.join(root,'arcade/assets/games-core.js'),'utf8'),runtime=fs.readFileSync(path.join(root,'arcade/assets/session-runtime.js'),'utf8');
function setup({chapter=1,difficulty='normal',seed=7,sourceRoot=null,grid=null,hero=3,renderScale=1}={}){
 let n=seed>>>0;const math=Object.create(Math);math.random=()=>((n=(Math.imul(n,1664525)+1013904223)>>>0)/4294967296);
 const ctx={window:{},Math:math};vm.runInNewContext(runtime,ctx);vm.runInNewContext(sourceRoot?fs.readFileSync(path.join(sourceRoot,'arcade/assets/games-core.js'),'utf8'):source,ctx);let result;
 const g=ctx.window.BioSuiteGames.g06({chapter,difficulty,hero,grid,renderScale,testMode:true,sfx(){},finish:(...args)=>{result=args;}});g.w=960;g.h=540;g.start();
 return {g,clock:ctx.window.BioArcadeSession.simulation(),result:()=>result};
}
const {control:raceControl}=require('./race-strategies.cjs');
function pilot(state,{slow=false}={}){const input=raceControl(state,'skilled');if(slow&&state.elapsed>7&&state.elapsed%3<.9){input.down=true;input.fire=false;}return {...input,pointer:{down:false}};}
module.exports={setup,pilot};
