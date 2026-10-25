/* Bio-City Arcade v1.1: five-chapter progression shared by all six games.
   Stored locally, sanitized on read; never changes existing high scores. */
(function(root){'use strict';
const TOTAL=5, prefix='bio_arcade_campaign_v11_';
const games=new Set(['g01','g02','g03','g04','g05','g06']);
const diffs=new Set(['normal','hard','expert']);
const between=(v,a,b)=>Math.max(a,Math.min(b,v));
function validate(game,mode,difficulty){
 if(!games.has(game))throw new Error('Unknown campaign game: '+game);
 return {game,mode:game==='g05'&&mode==='pong'?'pong':'volley',difficulty:diffs.has(difficulty)?difficulty:'normal'};
}
function key(game,mode,difficulty){const o=validate(game,mode,difficulty);return prefix+o.game+'_'+(o.game==='g05'?o.mode+'_':'')+o.difficulty;}
function read(game,mode,difficulty,storage){
 const id=key(game,mode,difficulty);const db=storage||root.localStorage;
 try{
  const raw=JSON.parse(db.getItem(id));
  if(!raw||typeof raw!=='object')return {unlocked:1,best:0,wins:0};
  return {unlocked:between(Number.isInteger(raw.unlocked)?raw.unlocked:1,1,TOTAL),
   best:between(Number.isFinite(raw.best)?Math.floor(raw.best):0,0,1e9),
   wins:between(Number.isInteger(raw.wins)?raw.wins:0,0,1e6)};
 }catch{return {unlocked:1,best:0,wins:0};}
}
function complete(game,mode,difficulty,chapter,score,storage){
 const progress=read(game,mode,difficulty,storage);
 const idx=between(Math.floor(Number(chapter)||1),1,TOTAL);
 if(idx>progress.unlocked)return progress; // Cannot skip locked chapters.
 progress.unlocked=Math.max(progress.unlocked,Math.min(TOTAL,idx+1));
 progress.best=Math.max(progress.best,Math.max(0,Math.floor(Number(score)||0)));
 progress.wins=Math.min(1e6,progress.wins+1);
 try{(storage||root.localStorage).setItem(key(game,mode,difficulty),JSON.stringify(progress));}catch{}
 return progress;
}
function difficultyFor(base,chapter){
 const c=between(Math.floor(Number(chapter)||1),1,TOTAL);
 const strength=base==='expert'?2:base==='hard'?1:0;
 return ['normal','hard','expert'][Math.min(2,strength+(c>=4?1:0)+(c===5?1:0))];
}
root.BioCampaign=Object.freeze({TOTAL,key,read,complete,difficultyFor});
})(typeof window!=='undefined'?window:globalThis);
