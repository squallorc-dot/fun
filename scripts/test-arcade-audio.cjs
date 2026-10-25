'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const scope={};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../arcade/assets/audio-policy.js'),'utf8'),scope);
const {normalize,nextTrack}=scope.BioArcadeAudioPolicy;
assert.equal(normalize({}).playMode,'shuffle');
assert.equal(normalize({playMode:'scene',track:2}).playMode,'shuffle','migrate former automatic scene default');
assert.equal(normalize({playMode:'scene',audioRevision:2}).playMode,'scene','retain explicitly selected scene mode');
for(const playMode of ['manual','off','shuffle'])assert.equal(normalize({playMode,track:2}).playMode,playMode);
assert.equal(normalize({track:2}).playMode,'manual','legacy chosen song stays chosen');
assert.equal(normalize({volume:0,auto:false}).volume,0);
assert.equal(normalize({volume:0,auto:false}).auto,false);
assert.equal(normalize({track:5}).track,0,'removed tracks cannot be requested');
assert.equal(normalize({volume:'invalid',sfx:400}).volume,40);
assert.equal(normalize({volume:'invalid',sfx:400}).sfx,100);
assert.equal(normalize(null).playMode,'shuffle');
for(const previous of [null,0,1,2,3]){
 const possible=new Set();
 for(let i=0;i<100;i++){const n=nextTrack(4,previous,()=>i/100);assert(n>=0&&n<4);if(previous!==null)assert.notEqual(n,previous);possible.add(n);}
 assert.equal(possible.size,previous===null?4:3,'all eligible songs remain selectable');
}
assert.equal(nextTrack(1,0),0);
console.log('AUDIO PASS: fresh defaults, existing preference migration, explicit silence/manual modes and non-repeating random stages.');
