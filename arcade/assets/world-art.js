/* Scene textures are decoration; all platforms, roads, goals and collisions remain game geometry. */
(()=>{'use strict';
const script=document.currentScript,base=new URL('worlds/',script.src).href,cache=new Map();
function get(key){if(cache.has(key))return cache.get(key);while(cache.size>=3)cache.delete(cache.keys().next().value);const image=new Image(),item={image,ready:false,error:false,promise:null};image.decoding='async';item.promise=new Promise(resolve=>{image.onload=()=>{item.ready=true;resolve(true)};image.onerror=()=>{item.error=true;resolve(false)}});image.src=base+key+'.webp?v=20261025.5';cache.set(key,item);return item;}
function draw(ctx,key,w,h,{scroll=0,pan=0,shade=0}={}){const item=get(key);if(!item.ready)return false;const im=item.image;ctx.save();
 if(key==='shaft'){const scale=w/im.width,ih=im.height*scale,y=-((scroll*.32)%ih+ih)%ih;ctx.drawImage(im,0,y,w,ih);ctx.drawImage(im,0,y+ih,w,ih);}
 else{const safePan=Math.max(-20,Math.min(20,pan)),zoom=Math.max((w+Math.abs(safePan)*2)/im.width,h/im.height),iw=im.width*zoom,ih=im.height*zoom;ctx.drawImage(im,(w-iw)*.5+safePan,(h-ih)*.5,iw,ih);}
 if(shade){ctx.fillStyle=`rgba(2,13,26,${shade})`;ctx.fillRect(0,0,w,h);}ctx.restore();return true;}
function chapterAtmosphere(ctx,key,w,h,chapter=1,time=0){const c=Math.max(1,Math.min(5,Number(chapter)||1));if(c===1)return;ctx.save();const palettes={street:['','#69e6b5','#86b5f6','#f1a577','#df80ed'],defense:['','#89e0a9','#82cef6','#ed9e80','#f49cce'],shaft:['','#83cea5','#7bb8ec','#e6a174','#e69ae3'],laboratory:['','#67cdbe','#82bef5','#eea184','#e8a0ee'],arena:['','#8cddbb','#84c1ec','#dd9ddd','#f5be8a'],race:['','#75d7a1','#81bff4','#e9a47c','#e49ced']};const accent=(palettes[key]||palettes.street)[c-1];
ctx.globalAlpha=.17;ctx.fillStyle=accent;ctx.fillRect(0,0,w,h);ctx.globalAlpha=.55;ctx.lineWidth=Math.max(1,w/600);const baseline=h*(key==='shaft'?.13:.42);
for(let n=0;n<12;n++){const x=((n*173+c*43)%997)/997*w,y=baseline+Math.sin(time*.5+n*.8+c)*h*.025;ctx.strokeStyle=accent;ctx.beginPath();if(c===2){ctx.moveTo(x,y);ctx.lineTo(x-13,y-18);ctx.lineTo(x+21,y-25)}else if(c===3){ctx.moveTo(x-12,y);ctx.lineTo(x+18,y-12);ctx.lineTo(x+4,y-24);ctx.lineTo(x+27,y-35)}else if(c===4){ctx.moveTo(x-16,y);ctx.lineTo(x+14,y-11);ctx.lineTo(x-5,y-22);ctx.lineTo(x+18,y-34)}else{ctx.arc(x,y,11+n%4*5,0,Math.PI*1.7)}ctx.stroke()}
ctx.restore()}

/* Chapter-specific original procedural landmarks supplement, not replace, the WebP art.
   Geometry and colliders are intentionally owned by the game engines. */
function chapterLandmarks(ctx,key,w,h,chapter=1,time=0){
 const c=Math.max(1,Math.min(5,Number(chapter)||1));if(c===1)return;
 ctx.save();const isShaft=key==='shaft',isRace=key==='race',floor=isShaft?h*.22:isRace?h*.34:h*.43;
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

window.BioWorldArt=Object.freeze({version:'20261025.14',preload:key=>get(key).promise,draw,chapterAtmosphere,chapterLandmarks,inspect:()=>[...cache.entries()].map(([key,item])=>({key,ready:item.ready,error:item.error}))});
})();
