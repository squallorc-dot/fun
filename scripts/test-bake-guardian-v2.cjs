/* No extra packages: generate synthetic transparent poses, bake and inspect every cell. */
'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {bake,decodePNG,encodePNG,timeline,TILES,ANCHOR,REQUIRED,OPTIONAL}=require('./bake-guardian-v2.cjs');
let checks=0;function check(test,reason){assert(test,reason);checks++;}
function synthetic(id,width=80,height=96){const n=Number(id.slice(1)),pixels=Buffer.alloc(width*height*4),c=[10+n*11,20+n*9,30+n*7];
 for(let y=8;y<height-4;y++)for(let x=18;x<width-18;x++){
  if(y<22&&Math.abs(x-width*.5)>10)continue;
  const p=(y*width+x)*4;pixels[p]=c[0];pixels[p+1]=c[1];pixels[p+2]=c[2];pixels[p+3]=255;
 }return {buffer:encodePNG(width,height,pixels),color:c};}
function rgbaAt(image,x,y){const p=(y*image.width+x)*4;return [...image.data.subarray(p,p+4)];}
function cellPixels(image,index,tile){let nonzero=0,minX=tile,minY=tile,maxX=-1,maxY=-1,colors=new Set();const ox=index%8*tile,oy=Math.floor(index/8)*tile;
 for(let y=0;y<tile;y++)for(let x=0;x<tile;x++){
  const px=rgbaAt(image,ox+x,oy+y);if(px[3]===0)continue;
  nonzero++;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
  colors.add(px.slice(0,3).join(':'));
 }return {nonzero,minX,minY,maxX,maxY,colors};}
(async()=>{const temp=fs.mkdtempSync(path.join(os.tmpdir(),'g-v2-bake-'));
 try{
  const source=path.join(temp,'input'),out=path.join(temp,'output');fs.mkdirSync(source);
  const colors={};for(const [id,name]of Object.entries({...REQUIRED,K13:OPTIONAL.K13,K14:OPTIONAL.K14})){
   const {buffer,color}=synthetic(id);fs.writeFileSync(path.join(source,id+'-'+name+'.png'),buffer);colors[id]=color.join(':');
  }
  const report=await bake({key:'burner-sister',sourceDir:source,outputDir:out,portable:true});
  check(report.frames.length===71&&report.hardCut===true&&report.crossFade===false,'hard-cut 71-frame record');
  check(report.frames[24].key==='K07'&&report.frames[30].key==='K08'&&report.frames[37].key==='K09','hit frames 24/30/37 mapped exactly');
  const two=decodePNG(fs.readFileSync(path.join(out,'2x','burner-sister.png'))),one=decodePNG(fs.readFileSync(path.join(out,'1x','burner-sister.png')));
  check(two.width===2560&&two.height===2880,'2x 8x9 native 320 tile');
  check(one.width===1280&&one.height===1440,'1x 8x9 native 160 tile');
  for(const [size,image]of [[320,two],[160,one]]){
   for(let frame=0;frame<71;frame++){
    const content=cellPixels(image,frame,size),expected=colors[report.frames[frame].key];
    check(content.nonzero>300,'frame '+frame+' at '+size+' is nonempty');
    check(content.colors.size===1&&content.colors.has(expected),'frame '+frame+' at '+size+' contains only one input pose with no crossfade');
    const clip=report.frames[frame].clip;
    if(clip==='idle'||clip==='land'||clip.startsWith('attack')){
     const anchor=size===320?ANCHOR.high:ANCHOR.low;
     check(Math.abs((content.maxY+1)-anchor.y)<=2,'foot anchor '+size+'/'+frame);
     check(Math.abs((content.maxX+content.minX)/2-anchor.x)<=2,'horizontal center '+size+'/'+frame);
    }
   }
   check(cellPixels(image,71,size).nonzero===0,'unused 72nd cell is entirely transparent '+size);
  }
  for(const density of ['1x','2x']){
   const dir=path.join(out,density),m=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'))),img=fs.readFileSync(path.join(dir,'burner-sister.png'));
   check(m.columns===8&&m.rows===9&&m.frames===71&&m.tile===(density==='1x'?160:320),'manifest grid matches existing runtime '+density);
   check(m.anchor.x===80&&m.anchor.y===140,'logical anchor matches runtime '+density);
   check(m.atlases[0].sha256===crypto.createHash('sha256').update(img).digest('hex')&&m.atlases[0].bytes===img.length,'manifest PNG bytes hash '+density);
   check(Object.keys(m.clips).length===12&&m.clips.attack1.offset===21&&m.clips.attack2.offset===27&&m.clips.attack3.offset===33,'clip offsets retained '+density);
  }
  check(timeline(new Set(Object.keys({...REQUIRED,K15:OPTIONAL.K15,K16:OPTIONAL.K16}))).includes('K16'),'optional 3rd and 4th walk poses supported');
  for(const [id,name]of Object.entries({K15:OPTIONAL.K15,K16:OPTIONAL.K16}))fs.writeFileSync(path.join(source,id+'-'+name+'.png'),synthetic(id).buffer);
  const report16=await bake({key:'enemy-brute',sourceDir:source,outputDir:path.join(temp,'enemy'),portable:true});
  check(report16.sourceCount===16&&report16.frames.some(f=>f.key==='K15')&&report16.frames.some(f=>f.key==='K16'),'16-pose bake and enemy 320 master retained');
  check(fs.existsSync(path.join(temp,'enemy','2x','enemy-brute.png')),'enemy keeps 2x master for future');
  await assert.rejects(()=>bake({key:'burner-sister',sourceDir:source,outputDir:path.join(__dirname,'..','arcade/assets/guardians'),portable:true}),/Refusing to overwrite/);checks++;
  fs.unlinkSync(path.join(source,'K01-idle.png'));
  await assert.rejects(()=>bake({key:'burner-sister',sourceDir:source,outputDir:path.join(temp,'invalid'),portable:true}),/Missing required/);checks++;
  console.log('BAKE GUARDIAN V2 PASS '+checks+' checks; 71 nonempty/72 blank, anchors, hard-cut, hit frames, manifests, 12–16 poses, no official writes');
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
})().catch(err=>{console.error(err);process.exitCode=1;});
