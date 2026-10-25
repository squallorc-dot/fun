// All seven choices must reach the actual renderer in every newly skinned game/mode.
'use strict';const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const code=fs.readFileSync(path.resolve(__dirname,'../arcade/assets/games-core.js'),'utf8');let checks=0;
for(let hero=0;hero<7;hero++)for(const [id,mode]of [['g03','volley'],['g04','volley'],['g05','volley'],['g05','pong'],['g06','volley']]){
 const loaded=[],drawn=[];const ctx={window:{BioGuardianArt:{preload:ids=>loaded.push(...ids),draw:(...args)=>{drawn.push(args[1]);return true;}}},Math};vm.runInNewContext(code,ctx);
 const g=ctx.window.BioSuiteGames[id]({hero,mode,difficulty:'normal',I:{hero:['B','M','C','Y','J','V','O']},finish(){},sfx(){},ga(){}});g.w=640;g.h=510;g.start();
 const canvas=new Proxy({createLinearGradient:()=>({addColorStop(){}})},{get:(obj,key)=>key in obj?obj[key]:()=>{}});
 g.update(1/60,{pointer:{down:false}});g.draw(canvas);
 assert.ok(loaded.includes(hero),id+' must preload selected atlas '+hero);
 assert.ok(drawn.includes(hero),id+' must render selected Guardian '+hero);
 checks++;
}
console.log(`Guardian sprite coverage PASS: ${checks} selected-hero/game-mode render combinations.`);
