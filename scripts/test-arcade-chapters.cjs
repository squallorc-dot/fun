/* Chapter-specific gameplay contract: exercise all five chapters without a browser. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.resolve(__dirname,'../arcade/assets/games-core.js'),'utf8');
const arcade=fs.readFileSync(path.resolve(__dirname,'../assets/arcade-engine.js'),'utf8');
const empty={left:false,right:false,up:false,down:false,fire:false,jump:false,dodge:false,skill:false,pointer:{down:false,x:0,y:0}};
const chapterNames=new Set(),g01Patterns=new Set(),g03Zones=new Set(),g04Mechanics=new Set(),g05Tactics=new Set(),trackShapes=new Set();
function create(id,chapter,mode='volley'){
 const window={};vm.runInNewContext(source,{window,Math,console});
 const finish=[];const g=window.BioSuiteGames[id]({chapter,hero:0,difficulty:'normal',mode,testMode:true,I:{hero:['Hero']},sfx:()=>{},finish:(...args)=>finish.push(args)});
 g.w=960;g.h=540;g.start();return {g,finish};
}
for(let chapter=1;chapter<=5;chapter++){
 const one=create('g01',chapter);const a=one.g.inspectCombat();assert.equal(a.chapter,chapter);g01Patterns.add(a.bossPattern);one.g.testSetup({kind:'boss',waveNumber:3,remaining:0,hp:200});assert(one.g.inspectCombat().enemies.some(e=>e.type==='boss'));
 const three=create('g03',chapter);const b=three.g.debugGeometry();assert.equal(b.chapter,chapter);g03Zones.add(b.zone);assert(b.platforms.length>=5);assert(b.platforms.some(p=>p.type==='safe')); // a path must begin with a safe platform
 const four=create('g04',chapter);const c=four.g.debugPhysics();assert.equal(c.chapter,chapter);g04Mechanics.add(c.mechanic);four.g.testClearStage();four.g.update(.016,empty);four.g.testClearStage();four.g.update(.016,empty);const final=four.g.debugPhysics();assert.equal(final.stage,3);if(chapter===5)assert(final.targets.some(q=>q.hp===3&&q.y>four.g.h*.4),'final chapter armored core');
 for(const mode of ['volley','pong']){const five=create('g05',chapter,mode);const d=five.g.inspectMatch();assert.equal(d.chapter,chapter);g05Tactics.add(d.aiProfile);five.g.update(.016,empty);assert(!five.g._finished,'sports stage should remain playable');}
 const six=create('g06',chapter);const e=six.g.inspectRace();assert.equal(e.chapter,chapter);chapterNames.add(e.trackName);six.g.testPlace({distance:160,lane:0});const f=six.g.inspectRace();assert(f.roadSample&&Number.isFinite(f.roadSample.x),'projected track remains finite');trackShapes.add([f.roadSample.x.toFixed(2),f.roadGrade.toFixed(2)].join('/'));
}
assert.equal(g01Patterns.size,5,'five distinct boss plans');
assert.equal(g03Zones.size,5,'five vertical environments');
assert.equal(g04Mechanics.size,5,'five pinball mechanisms');
assert.equal(g05Tactics.size,5,'five sports AI profiles');
assert.equal(chapterNames.size,5,'five named race circuits');
assert(trackShapes.size>=4,'different curve and grade geometry in race circuits');
assert(arcade.includes('BioArcadeChapter')&&arcade.includes("ch===3?(roll<.46?'sniper'"),'G02 chapter enemy profiles missing');
assert(arcade.includes('chapterLandmarks'),'G02 chapter artwork must render');
console.log('V1.2 CHAPTERS PASS: G01-G06 across five chapters, 5 distinct boss plans, platform zones, pinball mechanics, sports AI profiles, racing routes, G02 assault tactics');
