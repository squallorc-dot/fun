/* Independent five-round cup. Never reads or rewrites legacy campaign keys. */
((root)=>{'use strict';
const IDS=Object.freeze(['player','ai-0','ai-1','ai-2','ai-3','ai-4']),DEFAULT=Object.freeze(['ai-4','ai-2','ai-3','ai-0','ai-1','player']),POINTS=Object.freeze([10,8,6,4,2,1]);
const unavailable={},pending=new WeakMap(),volatile=new WeakSet();
const base=d=>['normal','hard','expert'].includes(d)?d:'normal',hero=h=>Math.max(0,Math.min(6,Math.floor(Number(h)||0)));
const key=(d,h)=>'bio_arcade_g06_cup_v1_'+base(d)+'_'+hero(h);
const fresh=(d,h)=>({version:1,difficulty:base(d),hero:hero(h),rounds:[]});
function database(storage){if(storage)return storage;try{return root.localStorage||unavailable;}catch{return unavailable;}}
function validGrid(grid){return Array.isArray(grid)&&grid.length===6&&new Set(grid).size===6&&grid.every(id=>IDS.includes(id));}
function round(raw,chapter){
 if(!raw||raw.chapter!==chapter||!validGrid(raw.grid)||!Array.isArray(raw.standings)||raw.standings.length!==6)return null;
 const rows=raw.standings.slice().sort((a,b)=>a.position-b.position);if(new Set(rows.map(r=>r.id)).size!==6)return null;
 if(rows.some((r,i)=>!IDS.includes(r.id)||r.position!==i+1||!['finished','dnf'].includes(r.status)||(r.status==='finished'?!(Number.isFinite(r.time)&&r.time>0):r.time!==null)))return null;
 const player=rows.find(r=>r.id==='player');if(player.status!=='finished'||player.position>3)return null;
 return {chapter,grid:raw.grid.slice(),rank:player.position,totalTime:player.time,bestLap:Number.isFinite(raw.bestLap)&&raw.bestLap>0?raw.bestLap:null,passes:Number.isInteger(raw.passes)&&raw.passes>=0?raw.passes:0,standings:rows.map(r=>({id:r.id,position:r.position,status:r.status,time:r.time}))};
}
function normalize(raw,d,h){
 const value=fresh(d,h);if(!raw||raw.version!==1||raw.difficulty!==value.difficulty||raw.hero!==value.hero||!Array.isArray(raw.rounds)||raw.rounds.length>5)return value;
 for(let i=0;i<raw.rounds.length;i++){const r=round(raw.rounds[i],i+1);if(!r||(!i&&r.grid.join('|')!==DEFAULT.join('|')))return fresh(d,h);if(i&&r.grid.join('|')!==value.rounds[i-1].standings.map(x=>x.id).join('|'))return fresh(d,h);value.rounds.push(r);}return value;
}
function read(d,h,storage){const db=database(storage),id=key(d,h);if(pending.get(db)?.has(id))return normalize(pending.get(db).get(id),d,h);try{return normalize(JSON.parse(db.getItem(id)),d,h);}catch(error){if(!(error instanceof SyntaxError))volatile.add(db);return fresh(d,h);}}
function save(cup,storage){const value=normalize(cup,cup.difficulty,cup.hero),db=database(storage),id=key(value.difficulty,value.hero);
 try{let previous;try{previous=JSON.parse(db.getItem(id));}catch{}if(previous?.version>1)throw Error('Newer cup version');db.setItem(id,JSON.stringify(value));pending.get(db)?.delete(id);if(!pending.get(db)?.size)volatile.delete(db);}catch{if(!pending.has(db))pending.set(db,new Map());pending.get(db).set(id,value);volatile.add(db);}return value;
}
function gridFor(cup,chapter){if(cup.rounds[chapter-1])return cup.rounds[chapter-1].grid.slice();if(chapter===cup.rounds.length+1&&cup.rounds.length)return cup.rounds.at(-1).standings.map(r=>r.id);return DEFAULT.slice();}
function record(cup,chapter,result,grid){
 const value=normalize(cup,cup.difficulty,cup.hero);if(chapter!==value.rounds.length+1||chapter>5||result?.status!=='finished'||result.rank>3)return value;
 if(!validGrid(grid)||grid.join('|')!==gridFor(value,chapter).join('|'))return value;
 const r=round({chapter,grid,standings:result.standings,bestLap:result.bestLap,passes:result.passes},chapter);if(r&&r.rank===result.rank)value.rounds.push(r);return value;
}
function standings(cup){return IDS.map(id=>{const rows=cup.rounds.map(r=>r.standings.find(s=>s.id===id));return {id,points:rows.reduce((n,r)=>n+POINTS[r.position-1],0),wins:rows.filter(r=>r.position===1).length,time:rows.reduce((n,r)=>n+(r.time??1e6),0),ranks:rows.map(r=>r.position)};}).sort((a,b)=>b.points-a.points||b.wins-a.wins||a.time-b.time||(a.ranks.at(-1)||6)-(b.ranks.at(-1)||6)||a.id.localeCompare(b.id)).map((r,i)=>({...r,position:i+1}));}
root.BioRaceCup=Object.freeze({IDS,DEFAULT,POINTS,key,fresh,read,save,record,gridFor,standings,isPersistent:storage=>{const db=database(storage);return db!==unavailable&&!volatile.has(db);}});
})(typeof window!=='undefined'?window:globalThis);
