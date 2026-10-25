/* Rebuild checked-in original combat PNG atlases: npm install --no-save sharp; node scripts/build-guardian-art.cjs
 * No dependency is needed by the site or normal build/CI. Exact vector source is kept here.
 * Character cues follow the seven existing FUNAI CARE illustrations; no source-card pixels are used.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),scope={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'arcade/assets/guardian-art.js'),'utf8'),scope);
const art=scope.window.BioGuardianArt;
const sharp=require(require.resolve('sharp',{paths:[root,process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||root]}));
const out=path.join(root,'arcade/assets/guardians');fs.mkdirSync(out,{recursive:true});
const n=x=>Math.round(x*100)/100;
const group=(s,t='')=>`<g${t?` transform="${t}"`:''}>${s}</g>`;
const ellipse=(x,y,rx,ry,fill,stroke='#102333',sw=1.8)=>`<ellipse cx="${n(x)}" cy="${n(y)}" rx="${n(rx)}" ry="${n(ry)}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;
const circle=(x,y,r,f,s='#102333',w=1.8)=>ellipse(x,y,r,r,f,s,w);
const poly=(pts,f,s='#102333',w=1.8)=>`<polygon points="${pts}" fill="${f}" stroke="${s}" stroke-width="${w}" stroke-linejoin="round"/>`;
const line=(pts,color,width=3)=>`<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const rect=(x,y,w,h,f,s='#102333',r=3)=>`<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" rx="${r}" fill="${f}" stroke="${s}" stroke-width="1.8"/>`;
const spark=(x,y,r,c)=>poly(`${x},${y-r} ${x+r*.3},${y-r*.3} ${x+r},${y} ${x+r*.3},${y+r*.3} ${x},${y+r} ${x-r*.3},${y+r*.3} ${x-r},${y} ${x-r*.3},${y-r*.3}`,c,c,.6);
const limb=(x,y,hand,c,w=8,bend=-2)=>{const [hx,hy]=hand,pts=`${x},${y} ${n((x+hx)/2+bend)},${n((y+hy)/2)} ${hx},${hy}`;return line(pts,'#102333',w+3)+line(pts,c,w)};
// Hand-authored key poses: torso lean, foot locations, hand locations, squash and facial expression.
// Frames are baked into the PNG. Clip timing/hit frames are shared with the combat engine.
const base={lean:0,bob:0,lh:[-23,-44],rh:[25,-46],lf:[-10,0],rf:[11,0],squash:1,tilt:0};
const poses={
 idle:[{}, {bob:-1,lh:[-24,-45],rh:[26,-47]}, {}, {bob:1}],
 walk:[{lf:[-20,-1],rf:[20,-6],lh:[-13,-42],rh:[32,-48],lean:4,bob:1},{lf:[-5,-9],rf:[5,0],lh:[-24,-43],rh:[26,-47],lean:3,bob:-3},{lf:[19,-5],rf:[-19,0],lh:[-31,-48],rh:[17,-42],lean:5,bob:1},{lf:[4,0],rf:[-4,-9],lh:[-24,-45],rh:[25,-46],lean:3,bob:-3},{lf:[-20,-1],rf:[20,-6],lh:[-13,-42],rh:[32,-48],lean:4,bob:1}],
 jump:[{lf:[-12,-5],rf:[11,-5],squash:.94},{lf:[-17,-15],rf:[19,-21],lh:[-27,-65],rh:[29,-65],bob:-3},{lf:[-15,-19],rf:[17,-15],lh:[-28,-57],rh:[30,-54]},{lf:[-8,-4],rf:[9,-3],lh:[-24,-45],rh:[25,-48]}],
 land:[{squash:.8,lf:[-14,0],rf:[16,0],lh:[-28,-38],rh:[29,-39],bob:10},{squash:.94,bob:3},{}],
 attack1:[{lean:-8,rh:[8,-56],lh:[-25,-47]},{lean:12,rh:[54,-56],lh:[-14,-42],rf:[18,0],lf:[-14,0]},{lean:10,rh:[49,-54],lh:[-14,-43]},{lean:0,rh:[27,-48]}],
 attack2:[{lean:-12,rh:[3,-43],lh:[-29,-59]},{lean:13,rh:[57,-40],lh:[-12,-55],rf:[22,0],lf:[-15,0]},{lean:9,rh:[45,-30],lh:[-12,-58]},{}],
 attack3:[{lean:-9,rh:[3,-68],lf:[-15,0],rf:[17,0]},{lean:-5,rh:[40,-67],lf:[-14,0],rf:[42,-34],lh:[-27,-54]},{lean:12,rh:[52,-37],lf:[-17,0],rf:[36,-24],lh:[-15,-50]},{lean:5,rf:[19,-6]},{}],
 hurt:[{lean:-18,bob:4,lh:[-10,-55],rh:[19,-50],lf:[-18,0],rf:[13,-4]},{lean:-10,bob:2,rh:[19,-58]},{}],
 dodge:[{lean:20,bob:12,squash:.83,lh:[-34,-35],rh:[33,-40],lf:[-23,-2],rf:[26,0]},{lean:30,bob:8,squash:.81,lh:[-34,-39],rh:[31,-43],lf:[-23,-12],rf:[26,-8]},{lean:14,bob:9,squash:.9},{lean:0}],
 skill:[{lean:-7,lh:[-16,-60],rh:[18,-60]},{bob:-3,lh:[-29,-86],rh:[32,-87],squash:1.03},{lean:8,bob:-4,lh:[-35,-66],rh:[52,-65],squash:1.02},{lean:4,lh:[-31,-49],rh:[42,-49]},{}],
 ko:[{lean:-14,bob:6,lh:[-14,-40],rh:[24,-40]},{lean:-28,bob:23,squash:.8,lf:[-18,0],rf:[21,0]},{tilt:-76,bob:16,lean:0,lf:[-18,-5],rf:[20,-3],lh:[-27,-40],rh:[25,-43]},{tilt:-86,bob:17,lean:0,lf:[-18,-5],rf:[20,-3],lh:[-27,-40],rh:[25,-43]}],
 celebrate:[{lh:[-22,-75],rh:[24,-82],bob:-1},{lh:[-28,-88],rh:[31,-92],bob:-6},{lh:[-22,-75],rh:[24,-82],bob:-1},{lh:[-28,-88],rh:[31,-92],bob:-6},{lh:[-22,-75],rh:[24,-82],bob:-1}]
};
function pose(clip,u){const a=poses[clip]||poses.idle,t=u*(a.length-1),i=Math.min(a.length-2,Math.floor(t)),v=t-i,p={};for(const k in base){const from=a[i][k]??base[k],to=a[i+1][k]??base[k];p[k]=Array.isArray(from)?from.map((x,j)=>n(x+(to[j]-x)*v)):n(from+(to-from)*v)}return p;}
function face(x,y,skin,robot=false){return ellipse(x,y,15,18,skin)+ (robot?rect(x-11,y-6,22,9,'#102a37','#a6d9de',3)+circle(x-5,y-2,2.5,'#8bfbff','none')+circle(x+6,y-2,2.5,'#8bfbff','none'):ellipse(x-5,y-2,1.8,3,'#253f47','none')+ellipse(x+6,y-2,1.8,3,'#253f47','none')+line(`${x-3},${y+8} ${x},${y+9} ${x+4},${y+7}`,'#774c3d',1.6));}
function humanoid(id,p,clip,u){const bronze=id===1,knight=id===3,burner=id===0,wood=id===5;
 const suit=bronze?'#a36b43':knight?'#2366a1':wood?'#497b36':'#c83943',light=bronze?'#dfb182':knight?'#e9b859':wood?'#c3dd83':'#f36b66';
 let s='';
 if(knight)s+=poly('-12,-76 -29,-18 10,-28 20,-74','#173f7b','#0d284c');
 if(burner)s+=poly('-16,-101 -26,-62 -15,-69 -6,-66 17,-72 19,-104','#b97832','#684d28');
 for(const [x,y,foot]of [[-8,-32,p.lf],[8,-32,p.rf]])s+=limb(x,y,foot,bronze?'#8b624b':knight?'#294b70':wood?'#578a3b':'#253443',9,foot[0]<0?-3:3)+ellipse(foot[0]+3,foot[1]-2,9,4,bronze?'#604e43':knight?'#244c6b':wood?'#775238':'#182c3e');
 s+=limb(-14,-65,p.lh,suit,9,-3);
 s+=poly('-13,-78 13,-78 17,-37 10,-30 -11,-30 -17,-42',suit,bronze?'#634c41':'#112c40',2.3);
 s+=poly('-8,-73 7,-73 8,-42 -7,-42',light,light,.5);
 s+=rect(-14,-38,29,7,bronze?'#71513d':knight?'#234760':'#775135',light,1);
 if(bronze){s+=circle(0,-59,8,'#75e7e3','#6a4f3c',3)+circle(0,-59,4,'#d7ffff','none');for(const x of [-14,14])s+=circle(x,-72,10,'#ba865a','#5e4940',2.5)+circle(x,-72,3,'#70dbe1','#e8c5a2',1);}
 if(knight)s+=poly('0,-74 8,-62 0,-50 -8,-62','#a8e9ed','#e9b859',2);
 s+=limb(14,-65,p.rh,suit,10,3)+circle(...p.rh,5,bronze?'#cc9d76':wood?'#8cac65':'#f8cda7');
 if(wood){s+=poly('-15,-87 15,-87 11,-68 -10,-68','#94ba64','#385c31');for(const [x,y,r]of [[-14,-106,12],[0,-114,16],[16,-106,13],[-20,-96,12],[4,-100,15],[23,-98,10]])s+=circle(x,y,r,['#396e30','#528b36','#6da33c'][Math.abs(x)%3],'#305e2c',1.7);s+=ellipse(-5,-83,2,3,'#19342a','none')+ellipse(6,-83,2,3,'#19342a','none')+line('-4,-75 1,-77 6,-75','#314b29',2);}
 else{s+=face(0,-94,bronze?'#c9976c':'#ffd8b6',bronze);if(bronze){s+=rect(-11,-114,22,7,'#b58b60','#54473f',2)+line('3,-114 3,-122','#cda673',3)+circle(3,-124,3,'#83f8ff','#b58b60');}
 else if(burner){s+=poly('-16,-96 -17,-109 -5,-116 10,-113 17,-102 8,-107 -4,-108 -11,-98','#efbe65','#9b692f',1.5)+poly('13,-104 21,-91 18,-69 12,-79','#dc9c44','#9b692f',1.3);}
 else if(knight)s+=poly('-16,-104 -13,-118 -6,-111 -3,-123 5,-114 14,-117 12,-106 19,-104','#eab650','#8a682c',1.7)+poly('-14,-102 13,-102 8,-95 -9,-95','#2a66a1','#e2b253',1.8)+circle(0,-99,3,'#a7efff','#f8d57f',1);}
 if(burner){s+=line('-2,-75 -3,-61 3,-56','#ffb3a0',1.5);if(clip.startsWith('attack')||clip==='skill'){const [x,y]=p.rh;s+=poly(`${x-6},${y+3} ${x-10},${y-12} ${x-2},${y-6} ${x+2},${y-23} ${x+8},${y-10} ${x+12},${y-15} ${x+10},${y+5}`,'#ff9c44','#ffdc79',1.3)+circle(x+2,y-3,5,'#fff0ac','none');}}
 if(knight||wood){const [x,y]=p.rh,blade=knight?'#b4f7ff':'#b99155';s+=line(`${x},${y+7} ${x},${y-12}`,'#825e36',4)+poly(`${x-4},${y-10} ${x-3},${y-41} ${x+2},${y-51} ${x+5},${y-12}`,blade,knight?'#e9bd66':'#6e5034',1.7)+line(`${x-9},${y-10} ${x+10},${y-10}`,knight?'#e9b859':'#775238',4);const [lx,ly]=p.lh;s+=poly(`${lx-14},${ly-14} ${lx+12},${ly-15} ${lx+14},${ly+10} ${lx},${ly+21} ${lx-14},${ly+9}`,knight?'#246aa3':'#967347',knight?'#efd082':'#473f2e',3);s+=knight?spark(lx,ly,10,'#a9ecff'):circle(lx,ly+1,6,'#99a8a0','#424d49',2);}
 if(bronze){s+=rect(p.rh[0]-7,p.rh[1]-9,15,14,'#b57c50','#604638',3)+rect(p.rh[0]+3,p.rh[1]-7,13,8,'#4ca1ad','#dfbc8f',2);if(clip==='skill')s+=spark(p.rh[0]+20,p.rh[1]-2,13,'#a5ffff');}
 return s;
}
function moo(p,clip){let s='';for(const [x,y,f]of [[-10,-34,p.lf],[11,-34,p.rf]])s+=limb(x,y,f,'#f0eadb',13)+ellipse(f[0]+1,f[1]-2,9,5,'#44483f');
 s+=limb(-20,-67,p.lh,'#e6e5d7',12)+ellipse(0,-55,28,34,'#f2efe5')+ellipse(4,-43,17,19,'#f2a4a3','#bf767d',1.6)+circle(-18,-69,6,'#373a39','none')+ellipse(18,-58,5,8,'#373a39','none');
 s+=line('24,-39 39,-29 43,-39','#e1dfd1',4)+ellipse(44,-40,4,6,'#4c4846');
 s+=ellipse(-22,-101,11,7,'#eee7d8')+ellipse(22,-101,11,7,'#eee7d8')+ellipse(0,-98,23,24,'#f4efe2');
 s+=poly('-16,-114 -19,-128 -10,-118','#d6ba87','#7a6e50')+poly('15,-115 18,-129 9,-119','#d6ba87','#7a6e50')+poly('-8,-119 -4,-126 2,-119 7,-125 8,-115','#fff9e8','#c3b393');
 s+=ellipse(11,-103,7,11,'#45433d','none')+circle(-8,-101,3,'#24353b','none')+circle(9,-101,3,'#182e36','none')+ellipse(0,-87,20,12,'#f1aaaa','#ba777e')+ellipse(-7,-88,2.7,4,'#ad6973','none')+ellipse(7,-88,2.7,4,'#ad6973','none');
 s+=line('-18,-75 0,-71 18,-75','#a06b30',4)+poly('-5,-72 4,-72 8,-63 -8,-63','#edc55d','#856436',1.5);
 s+=limb(20,-64,p.rh,'#eee9dc',12)+circle(...p.rh,6,'#42453e');
 const a=clip==='attack3'?-35:clip==='attack2'?35:clip==='skill'?0:-18;
 s+=group(line('0,15 0,-43','#73513a',7)+line('-1,15 -1,-43','#c69a61',2)+rect(-22,-64,44,30,'#6b7779','#d3c0a0',6)+rect(-17,-60,35,6,'#9ba4a0','#cbbb9e',1)+rect(-17,-42,35,5,'#535f64','#bcac91',1),`translate(${p.rh[0]} ${p.rh[1]}) rotate(${a})`);return s;}
function jelly(p,clip,u){const bounce=clip==='walk'?Math.sin(u*Math.PI*4)*3:0;let s='';const bodies=[[-25,-19,.72,'#ffd163'],[25,-18,.70,'#91d64c'],[0,-10,1,'#f98eb5']];for(const[x,y,k,c]of bodies){let b=ellipse(-10,-1,4,8,c)+ellipse(10,-1,4,8,c)+`<path d="M-22-10 Q-27-52 0-53 Q27-53 23-10 Q23 1 11 1 L-10 1 Q-23 1-22-10Z" fill="${c}" stroke="#823f65" stroke-width="1.8"/>`+ellipse(-10,-39,6,4,'#fff4c7','none',0)+ellipse(-8,-24,2.5,3.5,'#4c3541','none')+ellipse(8,-24,2.5,3.5,'#4c3541','none')+line('-4,-15 0,-12 4,-15','#843e56',1.8);for(const q of [[-14,-10],[13,-9],[14,-34],[-13,-28]])b+=circle(...q,1.6,'#ffffff88','none');
 if(c==='#ffd163')b+=rect(-15,-30,12,11,'none','#794c31',2)+rect(3,-30,12,11,'none','#794c31',2)+line('-3,-25 3,-25','#794c31',2);
 if(c==='#91d64c')b+=poly('0,-52 -10,-65 1,-61 11,-66 8,-54','#548f37','#346431',1.5);
 if(clip.startsWith('attack')||clip==='skill')b+=ellipse(24,-25,7,5,c)+spark(33,-26,8,'#fff0c9');
 s+=group(b,`translate(${x} ${y+bounce}) scale(${k} ${k})`);}return s;}
function oracle(p,clip,u){let s='';const sway=Math.sin(u*Math.PI*2)*3;
 s+=poly('-18,-90 -30,-56 -48,-30 -29,-39 -23,-5 -8,-18 0,-2 12,-20 27,-10 24,-41 46,-32 29,-59 18,-95','#3f91beaa','#83dffd',1.5);
 for(let i=-1;i<=1;i++)s+=`<path d="M${i*12}-93 Q${i*38+sway}-60 ${i*21}-31 T${i*34+sway} 4" fill="none" stroke="#b8f2ff" stroke-width="3" opacity=".6"/>`;
 s+=limb(-13,-72,p.lh,'#8ed3ef',6)+poly('-13,-80 14,-80 11,-51 21,-16 0,-23 -19,-15 -10,-51','#498fc5','#c1f3ff',1.6)+poly('0,-76 7,-65 0,-45 -6,-66','#a0dcf1','#daffff',1);
 s+=limb(14,-72,p.rh,'#95ddf4',6)+face(0,-99,'#bee7fc')+poly('-17,-99 -17,-112 -7,-122 8,-119 18,-106 11,-107 2,-114 -7,-109','#7bc8f2','#c5f8ff',1.5)+poly('-17,-107 -26,-91 -22,-54 -32,-37 -17,-44 -12,-77','#69b8e5aa','#baf3ff',1.3)+poly('14,-108 24,-88 19,-60 31,-46 15,-50 9,-85','#69b8e5aa','#baf3ff',1.3);
 s+=spark(0,-116,6,'#e0ffff')+circle(p.rh[0]+6,p.rh[1]-15,clip==='skill'?12:7,'#7ce6f299','#d0ffff',1.3)+spark(p.rh[0]+6,p.rh[1]-15,5,'#e4ffff');return s;}
function enemy(id,p,clip,u){const boss=id===10,brute=id===8,ranged=id===9,c=boss?'#83375c':brute?'#ac6449':ranged?'#72538b':'#495a71',trim=boss?'#fc629a':brute?'#ffb777':ranged?'#e7b4ff':'#e493ae';let s='';
 for(const[x,y,f]of [[-9,-31,p.lf],[9,-31,p.rf]])s+=limb(x,y,f,c,brute?13:10)+rect(f[0]-6,f[1]-8,17,9,'#25334a',trim,2);
 if(ranged)s+=poly('-20,-79 -30,-18 0,-30 26,-17 18,-80','#352e52','#8b6c9b',2);
 s+=limb(-16,-66,p.lh,c,brute?16:10)+poly('-17,-80 17,-80 23,-55 14,-30 -15,-30 -23,-54',c,trim,2)+poly('-9,-71 10,-71 5,-48 -6,-48','#25344a',trim,1.7);
 for(const x of [-21,21])s+=poly(`${x-11},-80 ${x+9},-83 ${x+15},-67 ${x-9},-66`,c,trim,2);
 s+=limb(16,-64,p.rh,c,brute?16:10)+rect(p.rh[0]-7,p.rh[1]-6,16,13,'#384454',trim,3);
 s+=poly('-16,-106 -10,-119 10,-119 19,-104 12,-83 -12,-83','#293246',trim,2)+poly('-11,-103 14,-103 7,-94 -8,-94',trim,trim,1)+line('-6,-90 9,-90','#121e30',3);
 if(boss){s+=poly('-12,-114 -27,-134 -19,-108','#59364e',trim,2)+poly('12,-115 25,-133 23,-109','#59364e',trim,2)+spark(0,-62,11,trim);}
 else if(brute)s+=rect(-12,-90,25,8,'#5e3c3b','#ffc18b',2);
 else if(ranged){s+=line(`${p.rh[0]},${p.rh[1]+26} ${p.rh[0]},${p.rh[1]-35}`,'#8c87b3',4)+circle(p.rh[0],p.rh[1]-38,9,'#9a70c7',trim,2)+spark(p.rh[0],p.rh[1]-38,5,'#f2dbff');}
 else s+=poly('-17,-114 -26,-120 -21,-103','#394a66',trim,1.5);return s;}
function render(id,p,clip,u){const enemyId=id>=7;let body=id===2?moo({...p,rh:[n(p.rh[0]*.45),Math.max(-74,p.rh[1])]},clip):id===4?jelly(p,clip,u):id===6?oracle(p,clip,u):enemyId?enemy(id,p,clip,u):humanoid(id,p,clip,u);
 if(clip==='skill'){const colors=['#ffb44b','#8ffaff','#ffe2a6','#a6eefa','#f9b2ea','#aff084','#bcefff'],col=colors[id]||'#ff8fbd';body+=`<ellipse cx="0" cy="-48" rx="${34+u*24}" ry="${18+u*13}" fill="none" stroke="${col}" stroke-width="2" opacity="${n(.8-u*.5)}"/>`;for(let j=0;j<4;j++)body+=spark(-37+j*25,-85+Math.sin(u*6+j)*15,3+u*3,col);}
 return group(group(body,`translate(${p.lean*.27} ${p.bob}) rotate(${p.tilt} 0 -22) skewX(${-p.lean*.33}) scale(1 ${p.squash})`),`translate(${clip==='ko'?12:0} ${clip==='ko'?-30:0}) scale(${clip==='ko'?.77:.87})`);
}
(async()=>{const rows=Math.ceil(art.totalFrames/art.columns),manifest={version:art.version,tile:art.frameSize,columns:art.columns,rows,frames:art.totalFrames,anchor:art.anchor,clips:art.clips,atlases:[]};
 for(let id=0;id<art.keys.length;id++){let cells='';for(const[clip,c]of Object.entries(art.clips))for(let i=0;i<c.frames;i++){const frame=c.offset+i,u=i/Math.max(1,c.frames-1),x=(frame%art.columns)*160+80,y=Math.floor(frame/art.columns)*160+140;cells+=`<svg x="${x-80}" y="${y-140}" width="160" height="160" viewBox="-80 -140 160 160" overflow="hidden">${render(id,pose(clip,u),clip,u)}</svg>`;}
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${art.columns*160}" height="${rows*160}" viewBox="0 0 ${art.columns*160} ${rows*160}">${cells}</svg>`;
 const file=art.keys[id]+'.png';await sharp(Buffer.from(svg)).png({compressionLevel:9,palette:true,colours:128,dither:0}).toFile(path.join(out,file));const stat=fs.statSync(path.join(out,file));manifest.atlases.push({key:art.keys[id],file,bytes:stat.size,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')});console.log(file,stat.size+' bytes');}
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
})().catch(e=>{console.error(e);process.exitCode=1});
