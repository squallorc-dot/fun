'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('arcade/assets/games-core.js','utf8'),code=fs.readFileSync('arcade/assets/challenge-code.js','utf8');
const window={};vm.runInNewContext(code,{window,btoa,atob,Object,Number,Error});vm.runInNewContext(source,{window,Math,console});const C=window.BioChallenge;
function game(id,chapter,difficulty,seed){const g=window.BioSuiteGames[id]({chapter,hero:0,difficulty,challengeSeed:seed,sfx:()=>{},finish:()=>{}});g.w=960;g.h=540;g.start();return g;}
let checks=0;
for(const id of ['g03','g04'])for(const difficulty of ['normal','hard','expert'])for(let chapter=1;chapter<=5;chapter++)for(const seed of [0,7,123,0xffffffff]){
 const condition=C.create(id,seed,chapter,difficulty),text=C.encode(condition),round=C.decode(text);assert.equal(JSON.stringify(round),JSON.stringify(condition));
 const a=game(id,chapter,difficulty,seed),b=game(id,chapter,difficulty,seed),state=g=>JSON.stringify(id==='g03'?g.debugGeometry():g.debugPhysics());assert.equal(state(a),state(b),'two independent engines match');
 for(let i=0;i<150;i++){const input={moveX:(i%60<30?.5:-.5),fire:i%71===0};a.update(1/120,input);b.update(1/120,input);}assert.equal(state(a),state(b),'same controls produce same game state');checks++;
}
const a=game('g03',3,'normal',1),b=game('g03',3,'normal',2);assert.notEqual(JSON.stringify(a.debugGeometry().platforms),JSON.stringify(b.debugGeometry().platforms));const first=JSON.stringify(a.debugGeometry().platforms);a.start();assert.equal(JSON.stringify(a.debugGeometry().platforms),first,'restarting resets challenge RNG');
const valid=C.encode(C.create('g03',42,1,'normal'));for(const bad of ['',valid+'x',valid.replace(/.$/,'z'),valid.replace('BC6B1','BC6B2'),'x'.repeat(513)])assert.throws(()=>C.decode(bad));
for(const mutation of [{seed:-1},{seed:4294967296},{chapter:6},{difficulty:'easy'},{rule:'other'},{ip:'127.0.0.1'},{version:2}])assert.throws(()=>C.encode({...C.create('g03',42,1,'normal'),...mutation}));
console.log('6B CHALLENGE PASS',checks,'game/chapter/difficulty/seed cases; deterministic run, resets, malformed or incompatible codes');
const cond=C.create('g04',13,2,'hard'),result={challenge:cond,win:true,score:900,elapsedMs:30000,depth:0,shots:9,hits:10};const resultCode=C.encodeResult(result);assert.equal(JSON.stringify(C.decodeResult(resultCode)),JSON.stringify(result));assert(C.comparable(cond,C.decodeResult(resultCode).challenge));assert(!C.comparable(cond,C.create('g04',14,2,'hard')));assert.throws(()=>C.encodeResult({...result,ip:'x'}));assert.throws(()=>C.encodeResult({...result,depth:10}));assert.throws(()=>C.decodeResult(resultCode.replace(/.$/,'z')));
const math=Object.create(Math);let calls=0;math.random=()=>{calls++;return .4;};const isolated={};vm.runInNewContext(source,{window:isolated,Math:math,console});const env={chapter:2,hero:0,difficulty:'normal',sfx:()=>{},finish:()=>{}};let seeded=isolated.BioSuiteGames.g03({...env,challengeSeed:12});seeded.start();assert.equal(calls,0,'challenge uses only its local RNG');seeded.start();assert.equal(calls,0,'restart does not touch global RNG');let normal=isolated.BioSuiteGames.g03(env);normal.start();assert(calls>0,'single-player keeps original random source');
