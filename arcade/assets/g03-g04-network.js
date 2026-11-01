/* G03 and G04 real two-board, host-authoritative head-to-head races.
 * Two independent game engines run in one host simulation at a shared tick.
 * Guests send only their own controls, and render host-validated snapshots.
 * Neither guest physics nor client-reported points can decide the winner.
 */
((root)=>{'use strict';
const TAGS=Object.freeze({g03:'g03-dual-v2',g04:'g04-dual-v2'});
const MODES=Object.freeze({g03:['stairs'],g04:['pinball']});
const LIMIT=29000;
const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e8;
const int=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
function data(v,depth=0){
 if(depth>9)return false;
 if(v===null||typeof v==='boolean')return true;
 if(typeof v==='number')return finite(v);
 if(typeof v==='string')return v.length<=140;
 if(Array.isArray(v))return v.length<=120&&v.every(q=>data(q,depth+1));
 return obj(v)&&Object.keys(v).length<=40&&Object.entries(v).every(([k,q])=>/^[A-Za-z][A-Za-z0-9]*$/.test(k)&&data(q,depth+1));
}
function input(v){
 return obj(v)&&Object.keys(v).every(k=>['moveX','moveY','up','down','left','right','fire','jump','dodge','skill','actionAssist'].includes(k))&&
 Object.entries(v).every(([k,q])=>k==='moveX'||k==='moveY'?finite(q)&&Math.abs(q)<=1:typeof q==='boolean');
}
function valid(v,game,chapter){
 if(!obj(v)||v.game!==game||v.chapter!==chapter||!int(v.tick,1e8)||typeof v.ended!=='boolean'||v.finished!==v.ended||!
 Array.isArray(v.boards)||v.boards.length!==2||!v.boards.every(obj)||!
 Array.isArray(v.scores)||v.scores.length!==2||!v.scores.every(s=>obj(s)&&finite(s.score)&&s.score>=0&&finite(s.progress)&&s.progress>=0&&typeof s.finished==='boolean'))return false;
 if(!Array.isArray(v.outcomes)||v.outcomes.length!==2||!v.outcomes.every(q=>q===null||obj(q)&&typeof q.won==='boolean'&&finite(q.points)&&q.points>=0&&typeof q.note==='string'&&q.note.length<=80))return false;
 if(v.endedBy!==null&&![0,1].includes(v.endedBy))return false;
 if(v.ended!==(v.endedBy!==null))return false;
 for(const b of v.boards){
  if(typeof b.finished!=='boolean')return false;
  if(game==='g03'&&(!obj(b.player)||!Array.isArray(b.platforms)||b.platforms.length>90||
    !finite(b.depth)||!finite(b.camera)||!finite(b.goal)))return false;
  if(game==='g04'&&(!Array.isArray(b.targets)||b.targets.length>20||!Array.isArray(b.balls)||b.balls.length>8||
   !Array.isArray(b.bumpers)||b.bumpers.length>12||!int(b.stage,3)||!int(b.shots,100)))return false;
 }
 if(!data(v))return false;
 try{return JSON.stringify(v).length<LIMIT;}catch{return false;}
}
function adapter(game){
 const tag=TAGS[game],mode=MODES[game][0];
 class Adapter{
  constructor({mode:chosen,hero=0,remoteHero=3,host,locale='zh',chapter=1,difficulty='normal',finish=()=>{},sfx=()=>{},testMode=false}){
   if(chosen!==mode||!int(chapter,5)||chapter<1||!['normal','hard','expert'].includes(difficulty))throw Error('dual-config');
   this.host=!!host;this.chapter=chapter;this.mode=mode;this.finishedBy=null;this.lastTick=-1;this.tick=0;this.corrections=0;
   this.players=[null,null];this.games=[hero,remoteHero].map((selected,i)=>{
    const env={hero:selected,chapter,difficulty,testMode:!!testMode,challengeSeed:game==='g03'?713+chapter*137:undefined,
     I:{hero:['Burner','MJ','Moo','Ye Bao','Jelly','Veggie','Oracle']},
     sfx:(...v)=>{if(this.host&&i===0)sfx(...v);},
     finish:(won,points,note)=>{
      if(!this.host||this.finishedBy!==null)return;
      this.players[i]={won:!!won,points:Math.max(0,Number(points)||0),note:String(note||'').slice(0,80)};
      this.finishedBy=i;this.game._finished=true;finish();
     }};
    const g=root.BioSuiteGames[game](env);g.w=640;g.h=480;g.start();return g;
   });
   const mobile=()=>typeof matchMedia==='function'&&matchMedia('(max-width:700px)').matches;
   this.game={w:mobile()?640:1280,h:mobile()?790:550,_finished:false,draw:ctx=>this.draw(ctx),hud:()=>this.hud()};
  }
  score(board,index){
   const v=board||(this.games[index]?.networkSnapshot());
   if(!v)return {score:0,progress:0,finished:false};
   return game==='g03'
    ?{score:Math.max(0,Math.floor((v.depth||0)+(v.bonus||0))),progress:Math.max(0,Math.floor(v.depth||0)),finished:!!v.finished}
    :{score:Math.max(0,Math.floor(v.score||0)),progress:Math.max(0,(v.stage-1)*100+Math.floor(v.hits||0)),finished:!!v.finished};
  }
  step(dt,local,remote){
   if(!this.host)throw Error('guest-authority');
   if(this.game._finished)return;
   this.tick++;
   for(const [i,v]of [local,remote].entries()){
    this.games[i].update(dt,v||{});
    if(this.game._finished)break; // first finisher freezes both authoritative boards
   }
  }
  capture(){
   const boards=this.games.map(g=>g.networkSnapshot());
   return {game,chapter:this.chapter,tick:this.tick,boards,scores:boards.map((b,i)=>this.score(b,i)),
    ended:this.game._finished,finished:this.game._finished,endedBy:this.finishedBy,outcomes:this.players.map(p=>p?{...p}:null)};
  }
  reliableKey(v){return v.ended+':'+v.scores.map(x=>Math.floor(x.score/100)+':'+Math.floor(x.progress/100)).join('|');}
  result(v=this.capture()){
   const players=v.scores.map((s,i)=>({id:i===0?'host':'guest',score:s.score,progress:s.progress,finished:s.finished,won:!!v.outcomes?.[i]?.won}));
   const winner=players[0].score===players[1].score?null:players[0].score>players[1].score?0:1;
   return {game,chapter:this.chapter,winner,endedBy:v.endedBy,players,score:players.map(p=>p.score),win:winner!==null};
  }
  receive(tick,v,immediate=false){
   if(this.host||!int(tick,1e8)||tick<this.lastTick||tick===this.lastTick&&!immediate||
     !valid(v,game,this.chapter)||v.tick<this.tick||v.tick>tick)return false;
   this.lastTick=tick;this.tick=v.tick;
   for(let i=0;i<2;i++)if(!this.games[i].applyNetworkState(v.boards[i]))return false;
   this.game._finished=v.ended;this.finishedBy=v.endedBy;this.players=v.outcomes.map(p=>p?{...p}:null);return true;
  }
  render(){} // Guest never advances the authoritative game worlds.
  draw(ctx){
   const mobile=typeof matchMedia==='function'&&matchMedia('(max-width:700px)').matches;
   const w=mobile?640:1280,h=mobile?790:550;
   if(this.game.w!==w||this.game.h!==h){this.game.w=w;this.game.h=h;}
   ctx.save();ctx.fillStyle='#071a2a';ctx.fillRect(0,0,w,h);
   const order=mobile?(this.host?[0,1]:[1,0]):[0,1];
   const slots=mobile?[{x:12,y:44,w:616,h:457},{x:164,y:545,w:312,h:219}]:
     [{x:12,y:43,w:616,h:461},{x:652,y:43,w:616,h:461}];
   const names=['HOST','FRIEND'];
   for(let j=0;j<2;j++){
    const id=order[j],r=slots[j],g=this.games[id];
    ctx.save();ctx.translate(r.x,r.y);ctx.beginPath();ctx.rect(0,0,r.w,r.h);ctx.clip();
    ctx.scale(r.w/g.w,r.h/g.h);g.draw(ctx);ctx.restore();
    ctx.save();ctx.strokeStyle=id===(this.host?0:1)?'#64e8e1':'#6595c5';ctx.lineWidth=3;ctx.strokeRect(r.x,r.y,r.w,r.h);
    ctx.fillStyle='#ddfaff';ctx.font='bold '+(mobile?18:20)+'px sans-serif';ctx.fillText(names[id]+'  '+this.score(null,id).score, r.x+8,r.y-12);ctx.restore();
   }
   ctx.restore();
  }
  hud(){return this.games.map((g,i)=>'<span>'+(i?'FRIEND':'HOST')+' <b>'+this.score(null,i).score+'</b></span>').join('');}
  dispose(){this.games=[];this.players=[];this.game._finished=true;}
 }
 return Object.freeze({TAG:tag,MODES:MODES[game],EDGES:['fire','jump'],input,
  snapshot:v=>valid(v,game,Number(v?.chapter)||1),Adapter,
  prepare:heroes=>[root.BioGuardianArt?.preload(heroes)||Promise.resolve(true),
   root.BioWorldArt?.preload(game==='g03'?'shaft':'laboratory')||Promise.resolve(true)]});
}
root.BioG03Network=adapter('g03');
root.BioG04Network=adapter('g04');
})(typeof window==='undefined'?globalThis:window);
