/* Node regression of campaign persistence, locked stages, mode and locale independence. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const code=fs.readFileSync(path.resolve(__dirname,'../arcade/assets/campaign-core.js'),'utf8');
const bag=new Map(),storage={getItem:k=>bag.has(k)?bag.get(k):null,setItem:(k,v)=>bag.set(k,v)};
const root={localStorage:storage};vm.runInNewContext(code,{window:root});
const C=root.BioCampaign;
assert.equal(C.TOTAL,5);
for(const game of ['g01','g02','g03','g04','g05','g06']){
 const mode='volley';
 assert.equal(C.read(game,mode,'normal').unlocked,1);
 assert.equal(C.complete(game,mode,'normal',5,999).unlocked,1,'locked stage cannot skip');
 for(let chapter=1;chapter<=5;chapter++){
  const result=C.complete(game,mode,'normal',chapter,chapter*100);
  assert.equal(result.unlocked,Math.min(5,chapter+1),game+' unlock '+chapter);
  assert.equal(result.best,chapter*100);
 }
 const record=C.read(game,mode,'normal');
 assert.equal(record.unlocked,5);
 assert.equal(record.wins,5);
 assert.equal(C.read(game,mode,'hard').unlocked,1,'difficulty split');
 if(game==='g05')assert.equal(C.read(game,'pong','normal').unlocked,1,'sport modes split');
}
const k=C.key('g01','volley','normal');storage.setItem(k,'not-json');
assert.equal(C.read('g01','volley','normal').unlocked,1,'corrupt local storage recovers');
storage.setItem(k,JSON.stringify({unlocked:900,best:-22,wins:-4}));
assert.equal(C.read('g01','volley','normal').unlocked,5,'out-of-range values clamped');
assert.equal(C.read('g01','volley','normal').best,0);
const noStorage={getItem:()=>{throw Error('private')},setItem:()=>{throw Error('private')}};
assert.equal(C.read('g01','volley','normal',noStorage).unlocked,1);
assert.equal(C.complete('g01','volley','normal',1,100,noStorage).unlocked,2,'blocked storage allows progression in session');
assert.equal(C.difficultyFor('normal',1),'normal');assert.equal(C.difficultyFor('normal',4),'hard');assert.equal(C.difficultyFor('normal',5),'expert');
console.log('CAMPAIGN PASS: six games, five chapters, unlocks, mode/difficulty split and storage exceptions');
