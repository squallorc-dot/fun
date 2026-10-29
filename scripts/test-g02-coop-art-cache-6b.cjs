'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
class FakeImage{constructor(){this.width=1280;this.height=1600;}set src(value){this._src=value;queueMicrotask(()=>this.onload?.());}decode(){return Promise.resolve();}}
const window={},document={currentScript:{src:'https://example.test/arcade/assets/guardian-art.js'}};
vm.runInNewContext(fs.readFileSync('arcade/assets/guardian-art.js','utf8'),{window,document,Image:FakeImage,URL,Promise,setTimeout,clearTimeout,Number,Math});
(async()=>{
 const art=window.BioGuardianArt,ids=[0,3,'enemy-grunt','enemy-brute','enemy-ranged','enemy-boss'];
 assert(art.setCacheCapacity(6));assert(!art.setCacheCapacity(7));assert((await art.preload(ids)).every(Boolean));
 let atlases=art.inspect().atlases;assert.equal(atlases.length,6);for(const id of ids)assert(atlases.some(x=>x.key===art.keyFor(id)&&x.ready),'each co-op atlas stays decoded');
 assert(art.setCacheCapacity(5));atlases=art.inspect().atlases;assert.equal(atlases.length,5,'single-player limit is restored');
 console.log('G02 COOP ART PASS: both heroes and four enemy atlases retained; solo cache bounded');
})().catch(e=>{console.error(e);process.exitCode=1;});
