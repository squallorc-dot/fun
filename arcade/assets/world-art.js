/* Scene textures are decoration; all platforms, roads, goals and collisions remain game geometry. */
(()=>{'use strict';
const script=document.currentScript,base=new URL('worlds/',script.src).href,cache=new Map(),rasters=new Map(),rasterLimit=16*1024*1024;
let rasterBytes=0,rasterHits=0,rasterBuilds=0,rasterEvictions=0;
function removeRaster(key){const item=rasters.get(key);if(!item)return;rasters.delete(key);rasterBytes-=item.bytes;item.canvas.width=item.canvas.height=0;rasterEvictions++;}
function dropImageRasters(image){for(const [key,item]of rasters)if(item.image===image)removeRaster(key);}
function get(key,retry=false){
 if(retry&&cache.get(key)?.error){dropImageRasters(cache.get(key).image);cache.delete(key);}
 if(cache.has(key)){const item=cache.get(key);cache.delete(key);cache.set(key,item);return item;}
 while(cache.size>=3){const oldest=cache.keys().next().value;dropImageRasters(cache.get(oldest).image);cache.delete(oldest);}
 const image=new Image(),item={image,ready:false,error:false,promise:null};image.decoding='async';
 item.promise=new Promise(resolve=>{
  let settled=false;const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;item.ready=ok;item.error=!ok;resolve(ok);};
  const timer=setTimeout(()=>finish(false),12000);
  image.onload=()=>{Promise.resolve().then(()=>image.decode?.()).then(()=>finish(true),()=>finish(false));};image.onerror=()=>finish(false);
 });
 cache.set(key,item);image.src=base+key+'.webp?v=20261025.5';return item;
}
// Cache only static, axis-aligned cover images at the actual device pixel scale.
// Scrolling tiles, heading pans, fractional transforms and hills keep the original draw path.
function raster(ctx,key,item,w,h){
 if(typeof OffscreenCanvas!=='function'&&typeof document.createElement!=='function')return null;
 const m=typeof ctx.getTransform==='function'?ctx.getTransform():null,ratio=m?.a||1;
 if(m&&(m.b!==0||m.c!==0||m.a!==m.d||m.a<=0||!Number.isInteger(m.e)||!Number.isInteger(m.f)))return null;
 const pw=w*ratio,ph=h*ratio;if(!Number.isInteger(pw)||!Number.isInteger(ph)||pw<=0||ph<=0)return null;
 const bytes=pw*ph*4;if(bytes>rasterLimit)return null;
 const smooth=ctx.imageSmoothingEnabled!==false,quality=typeof ctx.imageSmoothingQuality==='string'?ctx.imageSmoothingQuality:'low',id=key+'/'+pw+'/'+ph+'/'+smooth+'/'+quality;
 if(rasters.has(id)){const entry=rasters.get(id);rasters.delete(id);rasters.set(id,entry);rasterHits++;return entry.canvas;}
 let canvas,paint;
 try{canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(pw,ph):document.createElement('canvas');canvas.width=pw;canvas.height=ph;paint=canvas.getContext('2d');if(!paint)return null;
  paint.setTransform(ratio,0,0,ratio,0,0);paint.imageSmoothingEnabled=smooth;paint.imageSmoothingQuality=quality;
  const im=item.image,zoom=Math.max(w/im.width,h/im.height),iw=im.width*zoom,ih=im.height*zoom;paint.drawImage(im,(w-iw)*.5,(h-ih)*.5,iw,ih);
 }catch{return null;}
 while(rasterBytes+bytes>rasterLimit&&rasters.size)removeRaster(rasters.keys().next().value);
 rasters.set(id,{canvas,bytes,image:item.image});rasterBytes+=bytes;rasterBuilds++;return canvas;
}
function draw(ctx,key,w,h,{scroll=0,pan=0,shade=0,horizon=null}={}){const item=get(key);if(!item.ready)return false;const im=item.image;ctx.save();
 if(key==='shaft'){
  // Mirror adjacent tiles: a shared edge samples the same source row. A plain
  // repeat of this non-tileable painting exposed a horizontal seam each 720px.
  const ih=im.height*w/im.width,offset=scroll*.32,first=Math.floor(offset/ih);
  for(let tile=first;tile*ih-offset<h;tile++){const y=tile*ih-offset;ctx.save();ctx.translate(0,y+(tile%2?ih:0));ctx.scale(1,tile%2?-1:1);ctx.drawImage(im,0,0,w,ih);ctx.restore();}
 }
 else if(key==='race'&&Number.isFinite(horizon)){
  // Only source sky / tower tops are allowed in the horizon layer. The lower
  // painting contains elevated transit and water; it cannot define our road.
  const sh=Math.floor(im.height*.18),safePan=Math.max(-20,Math.min(20,pan)),zoom=Math.max((w+Math.abs(safePan)*2)/im.width,horizon/sh);
  ctx.drawImage(im,0,0,im.width,sh,(w-im.width*zoom)*.5+safePan,horizon-sh*zoom,im.width*zoom,sh*zoom);
 }
 else{const surface=pan===0&&!Number.isFinite(horizon)?raster(ctx,key,item,w,h):null;
  if(surface)ctx.drawImage(surface,0,0,w,h);
  else{const safePan=Math.max(-20,Math.min(20,pan)),zoom=Number.isFinite(horizon)?(w+Math.abs(safePan)*2)/im.width:Math.max((w+Math.abs(safePan)*2)/im.width,h/im.height),iw=im.width*zoom,ih=im.height*zoom;ctx.drawImage(im,(w-iw)*.5+safePan,Number.isFinite(horizon)?horizon-im.height*.35*zoom:(h-ih)*.5,iw,ih);}
 }
 if(shade){ctx.fillStyle=`rgba(2,13,26,${shade})`;ctx.fillRect(0,0,w,h);}ctx.restore();return true;}
function livingScene(ctx,key,w,h,c,time){
 ctx.save();const tone=['#9ddcd9','#8fe0ba','#9ccbec','#e9ba97','#d1ace8'][c-1];ctx.strokeStyle=tone;ctx.fillStyle=tone;ctx.lineWidth=1;
 if(key==='street'||key==='defense'){
  // Animated distant light traffic stays above the playable floor.
  for(let i=0;i<6;i++){const x=((time*(12+i*3)*(i%2?-1:1)+i*173)%(w+80)+w+80)%(w+80)-40,y=h*(key==='defense'?(i%2?.965:.035):.27+(i%3)*.04);ctx.globalAlpha=.12;ctx.fillRect(x,y,18+i%3*7,2);ctx.globalAlpha=.3;ctx.fillRect(x+12,y,3,2);}
  for(let i=0;i<4;i++){const x=w*(key==='defense'?(i%2?.975:.025):.12+i*.25),y=h*(key==='defense'?.2+Math.floor(i/2)*.6:.39);ctx.globalAlpha=.12+Math.sin(time*1.8+i)*.07;ctx.beginPath();ctx.ellipse(x,y,w*.035,h*.005,0,0,Math.PI*2);ctx.fill();}
 }else if(key==='shaft'){
  for(let side=0;side<2;side++)for(let i=0;i<6;i++){const y=((i*h/6+time*24)%(h+20))-10;ctx.globalAlpha=.13;ctx.fillRect(side?w-12:5,y,7,10);}
  if(c===3||c===5){ctx.globalAlpha=.18;for(let i=0;i<7;i++){const x=((time*55+i*91)%(w+70))-35,y=h*(.2+i*.10);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+31,y-2);ctx.stroke();}}
 }else if(key==='laboratory'){
  ctx.globalAlpha=.11;const x=w*.5,y=h*.37;for(let i=0;i<3;i++){const r=Math.min(w,h)*(.19+i*.045);ctx.beginPath();ctx.arc(x,y,r,time*(i%2?-.16:.12)+i,Math.PI*1.5+time*(i%2?-.16:.12)+i);ctx.stroke();}
 }else if(key==='arena'){
  for(let i=0;i<20;i++){ctx.globalAlpha=.10+Math.max(0,Math.sin(time*2-i*.4))*.15;ctx.fillRect(w*(i+.2)/20,h*.16,w*.018,h*.012);}
  ctx.globalAlpha=.10;ctx.beginPath();ctx.moveTo(w*.12,h*.05);ctx.lineTo(w*.25+Math.sin(time*.3)*w*.035,h*.65);ctx.lineTo(w*.30+Math.sin(time*.3)*w*.035,h*.65);ctx.closePath();ctx.fill();
 }
 ctx.restore();
}
function chapterAtmosphere(ctx,key,w,h,chapter=1,time=0){const c=Math.max(1,Math.min(5,Number(chapter)||1));livingScene(ctx,key,w,h,c,time);if(c===1)return;ctx.save();const palettes={street:['','#69e6b5','#86b5f6','#f1a577','#df80ed'],defense:['','#89e0a9','#82cef6','#ed9e80','#f49cce'],shaft:['','#83cea5','#7bb8ec','#e6a174','#e69ae3'],laboratory:['','#67cdbe','#82bef5','#eea184','#e8a0ee'],arena:['','#8cddbb','#84c1ec','#dd9ddd','#f5be8a'],race:['','#75d7a1','#81bff4','#e9a47c','#e49ced']};const accent=(palettes[key]||palettes.street)[c-1];
ctx.globalAlpha=.17;ctx.fillStyle=accent;ctx.fillRect(0,0,w,h);ctx.globalAlpha=.55;ctx.lineWidth=Math.max(1,w/600);const baseline=h*(key==='shaft'?.13:.42);
for(let n=0;n<12;n++){const x=((n*173+c*43)%997)/997*w,y=(key==='defense'?h*(n%2?.97:.03):baseline)+Math.sin(time*.5+n*.8+c)*h*(key==='defense'?.008:.025);ctx.strokeStyle=accent;ctx.beginPath();if(c===2){ctx.moveTo(x,y);ctx.lineTo(x-13,y-18);ctx.lineTo(x+21,y-25)}else if(c===3){ctx.moveTo(x-12,y);ctx.lineTo(x+18,y-12);ctx.lineTo(x+4,y-24);ctx.lineTo(x+27,y-35)}else if(c===4){ctx.moveTo(x-16,y);ctx.lineTo(x+14,y-11);ctx.lineTo(x-5,y-22);ctx.lineTo(x+18,y-34)}else{ctx.arc(x,y,11+n%4*5,0,Math.PI*1.7)}ctx.stroke()}
ctx.restore()}

/* Chapter-specific original procedural landmarks supplement, not replace, the WebP art.
   Geometry and colliders are intentionally owned by the game engines. */
function chapterLandmarks(ctx,key,w,h,chapter=1,time=0){
 const c=Math.max(1,Math.min(5,Number(chapter)||1));if(c===1)return;
 ctx.save();if(key==='defense'){
  // Reproject chapter machinery into top-view perimeter modules, rather than
  // clipping away a skyline or painting false oblique obstacles across actors.
  const count=[0,0,6,20,9,12][c],tone=['','','#56d9af','#84ccf4','#f3aa85','#c49aff'][c];
  ctx.strokeStyle=tone;ctx.lineWidth=1;for(let i=0;i<count;i++){
   const side=i%4,u=(Math.floor(i/4)+1)/(Math.ceil(count/4)+1),x=side===0?w*.025:side===1?w*.975:w*u,y=side===2?h*.025:side===3?h*.975:h*u;
   ctx.fillStyle='#102d3c';ctx.fillRect(x-6,y-6,12,12);ctx.globalAlpha=.48;ctx.strokeRect(x-6,y-6,12,12);ctx.globalAlpha=.35+.13*Math.sin(time*1.8+i);ctx.fillStyle=tone;ctx.fillRect(x-3,y-3,6,2);ctx.fillRect(x-3,y+1,6,2);
  }ctx.restore();return;
 }const isShaft=key==='shaft',isRace=key==='race',floor=isShaft?h*.22:isRace?h*.34:h*.43;
 const colors=['','#56d9af','#84ccf4','#f3aa85','#c49aff'],tone=colors[c-1];
 ctx.globalAlpha=isShaft?.30:.38;ctx.strokeStyle=tone;ctx.fillStyle=tone;ctx.lineWidth=Math.max(1.3,w*.002);
 const bar=(x,y,ww,hh)=>ctx.fillRect(x,y,ww,hh);
 const beam=(x1,y1,x2,y2)=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke()};
 if(c===2){
   // Power stations and lift rails: clear rectilinear structures.
   for(let i=0;i<6;i++){const x=w*(.075+i*.17),height=h*(.13+(i%3)*.045);bar(x,floor-height,w*.018,height);bar(x-w*.02,floor-height*.7,w*.06,h*.009);bar(x+w*.005,floor-height*.8,w*.05,h*.007);beam(x,floor-height,x+w*.05,floor-height*.9);}
 }else if(c===3){
   // Suspended transit spans, illuminated air shafts and staggered platforms.
   for(let i=0;i<4;i++){const y=floor-h*(.06+i*.052);beam(0,y,w,y);for(let j=0;j<5;j++){const x=w*(j*.23+(i%2)*.065);bar(x,y-h*.009,w*.13,h*.014);bar(x+w*.06,y-h*.045,w*.005,h*.045);}}
 }else if(c===4){
   // Fractured industrial silhouettes with visible broken diagonals.
   for(let i=0;i<9;i++){const x=w*(i/9),height=h*(.08+(i*7%5)*.034);ctx.beginPath();ctx.moveTo(x,floor);ctx.lineTo(x+w*.05,floor-height);ctx.lineTo(x+w*.08,floor-height*.55);ctx.lineTo(x+w*.125,floor);ctx.closePath();ctx.fill();beam(x+w*.02,floor-height*.30,x+w*.115,floor-height*.80);}
 }else if(c===5){
   // Entropy reactor: concentric cores and energy filaments.
   const cx=w*.52,cy=floor-h*.105;for(let i=0;i<5;i++){const radius=Math.min(w,h)*(.08+i*.045);ctx.beginPath();ctx.arc(cx,cy,radius,time*.11+i*.1,Math.PI*1.7+time*.11+i*.1);ctx.stroke();}
   for(let i=0;i<7;i++){const x=w*(i+.5)/7,depth=h*(.07+i%3*.026);beam(x,floor-depth,x+w*.027,floor+depth*.3);bar(x-w*.008,floor-depth,w*.015,h*.012);}
 }
 ctx.restore();
}

// Original resolution-independent surface work. Never introduces a collider,
// fake hazard, vanishing-point road or foreground object in the playable area.
function playfield(ctx,key,w,h,{scroll=0}={}){
 ctx.save();ctx.lineWidth=1;ctx.strokeStyle='#8ce7de18';
 const line=(x,y,xx,yy)=>{ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(xx,yy);ctx.stroke();};
 if(key==='street'){
  const wash=ctx.createLinearGradient(0,h*.49,0,h);wash.addColorStop(0,'#0d263000');wash.addColorStop(1,'#081d3250');ctx.fillStyle=wash;ctx.fillRect(0,h*.49,w,h*.51);
  // Ground panels share the painting's central vanishing point.
  for(let i=1;i<7;i++){const y=h*(.49+.51*(i/6)**1.65);line(0,y,w,y);}
  for(let i=-3;i<=3;i++)line(w*.5+i*w*.025,h*.49,w*.5+i*w*.27,h);
  ctx.strokeStyle='#f4cc801f';line(0,h*.87,w,h*.87);
 }else if(key==='defense'){
  // Strict top view, no oblique silhouettes through the central battlefield.
  ctx.fillStyle='#071c2930';ctx.fillRect(0,0,w,h);for(let x=0;x<=w;x+=w/10)line(x,0,x,h);for(let y=0;y<=h;y+=h/10)line(0,y,w,y);
  ctx.strokeStyle='#9addd83d';ctx.strokeRect(w*.015,h*.015,w*.97,h*.97);
 }else if(key==='shaft'){
  for(const side of [0,1]){const x=side?w-13:7;ctx.fillStyle='#051a32aa';ctx.fillRect(x-3,0,7,h);ctx.strokeStyle='#9ce8e555';line(x-2,0,x-2,h);
   const offset=((scroll*.32)%96+96)%96;for(let y=-offset;y<h;y+=96){ctx.fillStyle='#d8c796';ctx.fillRect(x-4,y,9,3);ctx.fillStyle='#091728';ctx.fillRect(x-1,y+1,2,1);}}
 }else if(key==='laboratory'){
  ctx.fillStyle='#081d29a0';ctx.fillRect(w*.035,h*.05,w*.93,h*.74);ctx.strokeStyle='#84ddcf22';
  for(let x=w*.1;x<w*.95;x+=w*.1)line(x,h*.06,x,h*.78);for(let y=h*.1;y<h*.79;y+=h*.1)line(w*.04,y,w*.96,y);
  ctx.strokeStyle='#d2ebdf66';line(w*.025,h*.04,w*.025,h*.79);ctx.strokeStyle='#02101ccc';ctx.lineWidth=4;line(w*.975,h*.04,w*.975,h*.79);
 }else if(key==='arena'){
  // These are floor joints only; the existing table / volley projection wins.
  ctx.fillStyle='#09232e50';ctx.fillRect(0,h*.36,w,h*.64);ctx.strokeStyle='#b5dbcc17';
  for(let y=h*.4;y<h;y+=h*.08){line(0,y,w,y);for(let x=(Math.round(y/h*100)%2)*w*.08;x<w;x+=w*.16)line(x,y,x,y+h*.08);}
 }
 ctx.restore();
}
function foreground(ctx,key,w,h){
 if(key!=='street')return;const item=get(key);if(!item.ready)return;
 // Repaint only the existing near-corner planter lips, below the walking
 // floor, before HUD/FX. Characters and attack warnings keep their full area.
 const im=item.image,zoom=Math.max(w/im.width,h/im.height),iw=im.width*zoom,ih=im.height*zoom;
 ctx.save();ctx.beginPath();ctx.rect(0,h*.87,w*.12,h*.13);ctx.rect(w*.88,h*.87,w*.12,h*.13);ctx.clip();ctx.drawImage(im,(w-iw)*.5,(h-ih)*.5,iw,ih);ctx.restore();
}
window.BioWorldArt=Object.freeze({version:'20261027.3',inspectRenderCache:()=>({entries:rasters.size,bytes:rasterBytes,limit:rasterLimit,hits:rasterHits,builds:rasterBuilds,evictions:rasterEvictions}),preload:key=>get(key,true).promise,draw,playfield,foreground,chapterAtmosphere,chapterLandmarks,inspect:()=>[...cache.entries()].map(([key,item])=>({key,ready:item.ready,error:item.error,width:item.ready?item.image.naturalWidth:0,height:item.ready?item.image.naturalHeight:0}))});
})();
