/* Bio-City Arcade v1.1: five-chapter progression shared by all six games.
   Stored locally, sanitized on read; never changes existing high scores. */
(function(root){'use strict';
const TOTAL=5, prefix='bio_arcade_campaign_v11_';
const games=new Set(['g01','g02','g03','g04','g05','g06']);
const diffs=new Set(['normal','hard','expert']);
const between=(v,a,b)=>Math.max(a,Math.min(b,v));
const unavailable={},pending=new WeakMap(),volatile=new WeakSet();
function database(storage){if(storage)return storage;try{return root.localStorage||unavailable;}catch{return unavailable;}}
function fresh(){return {unlocked:1,best:0,wins:0};}
function normalize(raw){return !raw||typeof raw!=='object'?fresh():{unlocked:between(Number.isInteger(raw.unlocked)?raw.unlocked:1,1,TOTAL),best:between(Number.isFinite(raw.best)?Math.floor(raw.best):0,0,1e9),wins:between(Number.isInteger(raw.wins)?raw.wins:0,0,1e6)};}
function validate(game,mode,difficulty){
 if(!games.has(game))throw new Error('Unknown campaign game: '+game);
 return {game,mode:game==='g05'&&mode==='pong'?'pong':'volley',difficulty:diffs.has(difficulty)?difficulty:'normal'};
}
function key(game,mode,difficulty){const o=validate(game,mode,difficulty);return prefix+o.game+'_'+(o.game==='g05'?o.mode+'_':'')+o.difficulty;}
function read(game,mode,difficulty,storage){
 const id=key(game,mode,difficulty),db=database(storage);
 if(pending.get(db)?.has(id))return normalize(pending.get(db).get(id));
 let text;try{text=db.getItem(id);}catch{volatile.add(db);return fresh();}
 try{return normalize(JSON.parse(text));}catch{return fresh();}
}
function complete(game,mode,difficulty,chapter,score,storage){
 const progress=read(game,mode,difficulty,storage);
 const idx=between(Math.floor(Number(chapter)||1),1,TOTAL);
 if(idx>progress.unlocked)return progress; // Cannot skip locked chapters.
 progress.unlocked=Math.max(progress.unlocked,Math.min(TOTAL,idx+1));
 const points=Number(score);progress.best=Math.max(progress.best,Number.isFinite(points)?between(Math.floor(points),0,1e9):0);
 progress.wins=Math.min(1e6,progress.wins+1);
 const db=database(storage),id=key(game,mode,difficulty);
 try{db.setItem(id,JSON.stringify(progress));pending.get(db)?.delete(id);if(!pending.get(db)?.size)volatile.delete(db);}catch{if(!pending.has(db))pending.set(db,new Map());pending.get(db).set(id,{...progress});volatile.add(db);}
 return progress;
}
function difficultyFor(base,chapter){
 const c=between(Math.floor(Number(chapter)||1),1,TOTAL);
 const strength=base==='expert'?2:base==='hard'?1:0;
 return ['normal','hard','expert'][Math.min(2,strength+(c>=4?1:0)+(c===5?1:0))];
}
root.BioCampaign=Object.freeze({TOTAL,key,read,complete,difficultyFor,isPersistent:storage=>{const db=database(storage);return db!==unavailable&&!volatile.has(db);}});
})(typeof window!=='undefined'?window:globalThis);
