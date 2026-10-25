/* Scene textures are decoration; all platforms, roads, goals and collisions remain game geometry. */
(()=>{'use strict';
const script=document.currentScript,base=new URL('worlds/',script.src).href,cache=new Map();
function get(key){if(cache.has(key))return cache.get(key);while(cache.size>=3)cache.delete(cache.keys().next().value);const image=new Image(),item={image,ready:false,error:false,promise:null};image.decoding='async';item.promise=new Promise(resolve=>{image.onload=()=>{item.ready=true;resolve(true)};image.onerror=()=>{item.error=true;resolve(false)}});image.src=base+key+'.webp?v=20261025.5';cache.set(key,item);return item;}
function draw(ctx,key,w,h,{scroll=0,pan=0,shade=0}={}){const item=get(key);if(!item.ready)return false;const im=item.image;ctx.save();
 if(key==='shaft'){const scale=w/im.width,ih=im.height*scale,y=-((scroll*.32)%ih+ih)%ih;ctx.drawImage(im,0,y,w,ih);ctx.drawImage(im,0,y+ih,w,ih);}
 else{const safePan=Math.max(-20,Math.min(20,pan)),zoom=Math.max((w+Math.abs(safePan)*2)/im.width,h/im.height),iw=im.width*zoom,ih=im.height*zoom;ctx.drawImage(im,(w-iw)*.5+safePan,(h-ih)*.5,iw,ih);}
 if(shade){ctx.fillStyle=`rgba(2,13,26,${shade})`;ctx.fillRect(0,0,w,h);}ctx.restore();return true;}
window.BioWorldArt=Object.freeze({version:'20261025.5',preload:key=>get(key).promise,draw,inspect:()=>[...cache.entries()].map(([key,item])=>({key,ready:item.ready,error:item.error}))});
})();
