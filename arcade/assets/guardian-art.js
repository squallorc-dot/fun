/* Bio-City authored frame atlases. Generated from scripts/build-guardian-art.cjs.
 * Runtime only samples PNG frames; no articulated stick figures or image-card motion.
 */
(()=>{'use strict';
const keys=['burner-sister','mj-robot','moo-moo','ye-bao-ex','jelly-trio','veggie-kid','oracle-guardian','enemy-grunt','enemy-brute','enemy-ranged','enemy-boss'];
const specs={idle:[6,.84,true],walk:[8,.64,true],jump:[4,.48,false],land:[3,.15,false],attack1:[6,.30,false,.10],attack2:[6,.34,false,.12],attack3:[8,.44,false,.17],hurt:[4,.25,false],dodge:[6,.28,false],skill:[8,.64,false],ko:[6,.55,false],celebrate:[6,.84,true]};
let offset=0;const clips={};for(const [name,[frames,duration,loop,hit]]of Object.entries(specs)){clips[name]=Object.freeze({offset,frames,duration,loop,...(hit===undefined?{}:{hit})});offset+=frames;}
Object.freeze(clips);Object.freeze(keys);
const frameSize=160,columns=8,anchor=Object.freeze({x:80,y:140}),cache=new Map();
const script=typeof document!=='undefined'?document.currentScript:null;
const base=script?.src?new URL('guardians/',script.src).href:'';
function keyFor(hero){return typeof hero==='number'?keys[Math.max(0,Math.min(6,hero|0))]:keys.includes(hero)?hero:keys[0];}
function frameFor(name,time=0){const c=clips[name]||clips.idle;const progress=Math.max(0,Number.isFinite(time)?time:0)/c.duration;return c.offset+Math.min(c.frames-1,Math.floor((c.loop?progress%1:Math.min(progress,1))*c.frames));}
function get(hero){const key=keyFor(hero);if(cache.has(key)){const item=cache.get(key);cache.delete(key);cache.set(key,item);return item;}
 if(typeof Image==='undefined')return null;
 // Five atlases = one selected hero and four enemy silhouettes, bounded on mobile.
 while(cache.size>=5)cache.delete(cache.keys().next().value);
 const image=new Image(),item={key,image,ready:false,error:false,promise:null};
 item.promise=new Promise(resolve=>{image.onload=()=>{item.ready=true;resolve(true)};image.onerror=()=>{item.error=true;resolve(false)}});
 cache.set(key,item);image.src=base+key+'.png?v=20261025.5';return item;
}
function preload(heroes){return Promise.all(heroes.map(h=>get(h)?.promise||Promise.resolve(false)));}
function draw(ctx,hero,clip,time,x,y,scale=1,dir=1,alpha=1){const item=get(hero);if(!item?.ready)return false;const frame=frameFor(clip,time),sx=frame%columns*frameSize,sy=Math.floor(frame/columns)*frameSize;
 ctx.save();ctx.translate(x,y);ctx.scale((dir<0?-1:1)*scale,scale);ctx.globalAlpha*=alpha;ctx.drawImage(item.image,sx,sy,frameSize,frameSize,-anchor.x,-anchor.y,frameSize,frameSize);ctx.restore();return true;
}
window.BioGuardianArt=Object.freeze({version:'20261025.5',keys,clips,frameSize,columns,anchor,totalFrames:offset,keyFor,frameFor,preload,draw,inspect:()=>({cached:cache.size,atlases:[...cache.values()].map(x=>({key:x.key,ready:x.ready,error:x.error}))})});
})();
