/* G02 render-only snapshot v1. The authoritative physics never consumes this data. */
((root)=>{'use strict';
const LIMIT=28000,object=v=>!!v&&typeof v==='object'&&!Array.isArray(v),finite=v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1e7;
const exact=(v,k)=>object(v)&&Object.keys(v).length===k.length&&Object.keys(v).every(x=>k.includes(x));
function data(v,depth=0){if(depth>6)return false;if(v===null||typeof v==='boolean')return true;if(typeof v==='number')return finite(v);if(typeof v==='string')return v.length<=100;if(Array.isArray(v))return v.length<=512&&v.every(x=>data(x,depth+1));return object(v)&&Object.keys(v).length<=60&&Object.entries(v).every(([k,x])=>/^[A-Za-z][A-Za-z0-9]*$/.test(k)&&data(x,depth+1));}
function valid(s){
 if(!exact(s,['version','world','chapter','difficulty','phase','game'])||s.version!==1||!exact(s.world,['width','height'])||s.world.width!==600||s.world.height!==600||!Number.isInteger(s.chapter)||s.chapter<1||s.chapter>5||!['normal','hard','expert'].includes(s.difficulty)||!['playing','paused','victory','defeat'].includes(s.phase)||!data(s))return false;
 try{if(JSON.stringify(s).length>LIMIT)return false;}catch{return false;}
 const g=s.game,fields=['hero','mode','p','wave','score','kills','t','spawnLeft','spawnTime','enemies','projectiles','hostiles','pickups','fx','hazards','boss','transition','over','shake','p2','hero2','revives','rescueCooldown'];
 if(!exact(g,fields)||!Array.isArray(g.enemies)||g.enemies.length>16||!['projectiles','hostiles','pickups','fx','hazards'].every(k=>Array.isArray(g[k]))||g.projectiles.length>180||g.hostiles.length>180||g.pickups.length>40||g.fx.length>400||g.hazards.length>3)return false;
 const player=p=>object(p)&&['x','y','hp','maxHp','skill','inv','shield','dashTime'].every(k=>finite(p[k]))&&p.x>=18&&p.x<=582&&p.y>=20&&p.y<=580&&p.maxHp>0&&p.hp>=0&&p.hp<=p.maxHp&&p.skill>=0&&p.skill<=100&&typeof p.down==='boolean';
 if(!player(g.p)||!player(g.p2)||!Number.isInteger(g.p2.heroIndex)||g.p2.heroIndex<0||g.p2.heroIndex>6||!object(g.hero)||!object(g.hero2)||!object(g.mode))return false;
 if(!Number.isInteger(g.wave)||g.wave<1||g.wave>3||!Number.isInteger(g.kills)||g.kills<0||!Number.isInteger(g.revives)||g.revives<0||g.revives>2||!['score','t','spawnLeft','spawnTime','transition','shake','rescueCooldown'].every(k=>finite(g[k])))return false;
 const point=p=>object(p)&&finite(p.x)&&finite(p.y)&&Math.abs(p.x)<=2000&&Math.abs(p.y)<=2000;
 const color=v=>typeof v==='string'&&/^#[0-9a-f]{3,8}$/i.test(v);
 if(!g.enemies.every(e=>point(e)&&['drone','dash','sniper','brute'].includes(e.type)&&finite(e.hp)&&finite(e.maxHp)&&e.maxHp>0&&finite(e.r)&&e.r>0&&finite(e.fire)&&finite(e.flash)&&color(e.color))||g.boss!==null&&(!point(g.boss)||!finite(g.boss.hp)||!finite(g.boss.maxHp)||g.boss.maxHp<=0||!finite(g.boss.r)||g.boss.r<=0||!finite(g.boss.fire)))return false;
 if(!g.projectiles.every(p=>point(p)&&['vx','vy','r'].every(k=>finite(p[k]))&&p.r>0&&color(p.color))||!g.hostiles.every(p=>point(p)&&['vx','vy','r'].every(k=>finite(p[k]))&&p.r>0)||!g.pickups.every(point))return false;
 if(!g.fx.every(f=>point(f)&&['dot','ring'].includes(f.type)&&finite(f.life)&&finite(f.max)&&f.max>0&&color(f.color)&&(f.type==='ring'?finite(f.radius)&&f.radius>=0:finite(f.r)&&f.r>=0&&finite(f.vx)&&finite(f.vy))))return false;
 return g.hazards.every(z=>point(z)&&finite(z.r)&&z.r>0&&['reactor','skyway','fracture','entropy'].includes(z.kind)&&typeof z.active==='boolean'&&typeof z.warning==='boolean');
}
function encode(s){if(!object(s)||!object(s.game))return null;let v;try{v=JSON.parse(JSON.stringify(s));}catch{return null;}delete v.game.p1;return valid(v)?v:null;}
root.BioG02State=Object.freeze({VERSION:1,LIMIT,valid,encode});
})(typeof window==='undefined'?globalThis:window);
