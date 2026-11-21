/* Bio-City v2: 12–16 right-facing transparent key poses -> hard-cut 71-frame atlases.
 * Standalone QA bake, never writes checked-in guardians/ or guardians/2x/.
 * Node 20 built-ins only for CI; reuses optional Sharp PNG writer from the
 * existing scripts/build-guardian-art.cjs when available (no new dependency).
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const runtime={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'arcade/assets/guardian-art.js'),'utf8'),runtime,{filename:'guardian-art.js'});
const art=runtime.window.BioGuardianArt;
const SIGNATURE=Buffer.from([137,80,78,71,13,10,26,10]);
const REQUIRED=Object.freeze({
 K01:'idle',K02:'walk-a',K03:'walk-b',K04:'jump',K05:'land',K06:'attack-windup',
 K07:'attack1-hit',K08:'attack2-hit',K09:'attack3-hit',K10:'hurt',K11:'dodge',K12:'skill'
});
const OPTIONAL=Object.freeze({K13:'ko',K14:'celebrate',K15:'walk-c',K16:'walk-d'});
const TILES=Object.freeze({columns:8,rows:9,frames:71,high:320,low:160});
const ANCHOR=Object.freeze({high:{x:160,y:280},low:{x:80,y:140}});
const crcTable=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(data){let c=0xffffffff;for(const byte of data)c=crcTable[(c^byte)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function pngChunk(type,data){const name=Buffer.from(type,'ascii'),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc]);}
function encodePNG(w,h,rgba){if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1||rgba.length!==w*h*4)throw Error('Invalid RGBA image');
 const head=Buffer.alloc(13);head.writeUInt32BE(w,0);head.writeUInt32BE(h,4);head[8]=8;head[9]=6;
 const raw=Buffer.alloc(h*(w*4+1));for(let y=0;y<h;y++)Buffer.from(rgba.buffer,rgba.byteOffset+y*w*4,w*4).copy(raw,y*(w*4+1)+1);
 return Buffer.concat([SIGNATURE,pngChunk('IHDR',head),pngChunk('IDAT',zlib.deflateSync(raw,{level:9})),pngChunk('IEND',Buffer.alloc(0))]);
}
function decodePNG(buffer){if(!Buffer.isBuffer(buffer)||!buffer.subarray(0,8).equals(SIGNATURE))throw Error('Input must be a PNG');
 let p=8,w=0,h=0,type=-1,depth=0,interlace=0,palette=null,trns=null,seenEnd=false;const idats=[];
 while(p+12<=buffer.length){const n=buffer.readUInt32BE(p);if(n>buffer.length-p-12)throw Error('Truncated PNG chunk');const name=buffer.toString('ascii',p+4,p+8),bytes=buffer.subarray(p+8,p+8+n);const expected=buffer.readUInt32BE(p+8+n);
  if(crc32(buffer.subarray(p+4,p+8+n))!==expected)throw Error('PNG chunk CRC mismatch: '+name);
  p+=n+12;
  if(name==='IHDR'){if(n!==13)throw Error('Bad IHDR');w=bytes.readUInt32BE(0);h=bytes.readUInt32BE(4);depth=bytes[8];type=bytes[9];interlace=bytes[12];if(bytes[10]!==0||bytes[11]!==0)throw Error('Unsupported PNG compression/filter');}
  else if(name==='PLTE')palette=Buffer.from(bytes);
  else if(name==='tRNS')trns=Buffer.from(bytes);
  else if(name==='IDAT')idats.push(bytes);
  else if(name==='IEND'){seenEnd=true;break;}
 }
 if(!seenEnd||w<1||h<1||w>4096||h>4096||w*h>16000000||depth!==8||interlace!==0||![0,2,3,4,6].includes(type))throw Error('Only non-interlaced 8-bit PNG (RGBA/RGB/indexed/gray) is supported');
 const bpp=({0:1,2:3,3:1,4:2,6:4})[type],stride=w*bpp;
 const raw=zlib.inflateSync(Buffer.concat(idats),{maxOutputLength:h*(stride+1)});
 if(raw.length!==h*(stride+1))throw Error('Invalid PNG scanline length');
 const rgba=Buffer.alloc(w*h*4),prev=Buffer.alloc(stride),line=Buffer.alloc(stride);let q=0;
 for(let y=0;y<h;y++){const filter=raw[q++];if(filter>4)throw Error('Invalid PNG filter');
  for(let x=0;x<stride;x++){const a=x>=bpp?line[x-bpp]:0,b=prev[x],c=x>=bpp?prev[x-bpp]:0;
   const predictor=a+b-c,pa=Math.abs(predictor-a),pb=Math.abs(predictor-b),pc=Math.abs(predictor-c),pr=pa<=pb&&pa<=pc?a:pb<=pc?b:c;
   line[x]=(raw[q++]+(filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):pr))&255;
  }
  for(let x=0;x<w;x++){const k=x*bpp,out=(y*w+x)*4;
   if(type===6){rgba[out]=line[k];rgba[out+1]=line[k+1];rgba[out+2]=line[k+2];rgba[out+3]=line[k+3];}
   else if(type===2){rgba[out]=line[k];rgba[out+1]=line[k+1];rgba[out+2]=line[k+2];rgba[out+3]=255;}
   else if(type===0){rgba[out]=rgba[out+1]=rgba[out+2]=line[k];rgba[out+3]=255;}
   else if(type===4){rgba[out]=rgba[out+1]=rgba[out+2]=line[k];rgba[out+3]=line[k+1];}
   else{const idx=line[k];if(!palette||idx*3+2>=palette.length)throw Error('Invalid palette index');rgba[out]=palette[idx*3];rgba[out+1]=palette[idx*3+1];rgba[out+2]=palette[idx*3+2];rgba[out+3]=trns?.[idx]??255;}
  }
  line.copy(prev);
 }
 return {width:w,height:h,data:rgba};
}
function bounds(im){let left=im.width,top=im.height,right=-1,bottom=-1;
 for(let y=0;y<im.height;y++)for(let x=0;x<im.width;x++)if(im.data[(y*im.width+x)*4+3]>8){left=Math.min(x,left);right=Math.max(x,right);top=Math.min(y,top);bottom=Math.max(y,bottom);}
 if(right<left)throw Error('Input pose is fully transparent');return {left,top,right,bottom,w:right-left+1,h:bottom-top+1};
}
const posesForClip=Object.freeze({
 idle:['K01','K01','K01','K01','K01','K01'],
 walk:['K02','K02','K15','K03','K03','K03','K16','K02'],
 jump:['K04','K04','K04','K04'],land:['K05','K05','K01'],
 attack1:['K06','K06','K06','K07','K07','K01'],
 attack2:['K06','K06','K06','K08','K08','K01'],
 attack3:['K06','K06','K06','K06','K09','K09','K09','K01'],
 hurt:['K10','K10','K10','K01'],dodge:['K11','K11','K11','K11','K11','K01'],
 skill:['K12','K12','K12','K12','K12','K12','K12','K01'],
 ko:['K13','K13','K13','K13','K13','K13'],
 celebrate:['K14','K14','K14','K14','K14','K14']
});
function timeline(available){const ids=[];
 for(const [clip,c] of Object.entries(art.clips)){const poses=posesForClip[clip];if(!poses||poses.length!==c.frames||ids.length!==c.offset)throw Error('Guardian clip contract changed: '+clip);
  poses.forEach((id,i)=>ids.push((id==='K15'||id==='K16')&&!available.has(id)?i%2?'K03':'K02':id==='K13'&&!available.has(id)?'K10':id==='K14'&&!available.has(id)?'K01':id));
 }
 if(ids.length!==71||ids[24]!=='K07'||ids[30]!=='K08'||ids[37]!=='K09')throw Error('Hit-frame alignment regression');return ids;
}
function drawPose(atlas,pitch,tile,row,index,source,box,scale,clip,phase){
 const ax=tile*.5,ay=tile*.875,squash=clip==='land'?[.86,.94,1][phase]:1;
 const lift=clip==='jump'?[0,14,25,8][phase]:0;
 const bob=clip==='idle'?[0,-1,-2,-1,0,1][phase]:clip==='walk'?[0,-2,0,1,0,-2,0,1][phase]:0;
 const knock=clip==='hurt'?[4,7,3,0][phase]:0;
 const sx=scale,sy=scale*squash,dw=Math.max(1,Math.round(box.w*sx)),dh=Math.max(1,Math.round(box.h*sy));
 const cx=(index%8)*tile,cy=Math.floor(index/8)*tile,dx=Math.round(cx+ax-dw/2+knock*(tile/320)),dy=Math.round(cy+ay-dh-lift*(tile/320)+bob*(tile/320));
 for(let y=0;y<dh;y++){const fromY=box.top+Math.min(box.h-1,Math.floor((y+.5)/sy));for(let x=0;x<dw;x++){
  const fromX=box.left+Math.min(box.w-1,Math.floor((x+.5)/sx)),src=(fromY*source.width+fromX)*4,px=dx+x,py=dy+y;
  if(px<cx||py<cy||px>=cx+tile||py>=cy+tile)continue;
  const dst=(py*pitch+px)*4;atlassafeCopy(atlas,dst,source.data,src);
 }}
 return {source:row,footY:dy+dh-cy,centerX:dx+Math.floor(dw/2)-cx,bob,lift};
}
function atlassafeCopy(dst,i,src,j){dst[i]=src[j];dst[i+1]=src[j+1];dst[i+2]=src[j+2];dst[i+3]=src[j+3];}
function down2(source,w,h){const nw=w/2,nh=h/2,out=Buffer.alloc(nw*nh*4);
 for(let y=0;y<nh;y++)for(let x=0;x<nw;x++){
  let alpha=0,r=0,g=0,b=0;
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){const p=((y*2+j)*w+(x*2+i))*4,a=source[p+3];alpha+=a;r+=source[p]*a;g+=source[p+1]*a;b+=source[p+2]*a;}
  const q=(y*nw+x)*4;out[q+3]=Math.round(alpha/4);if(alpha){out[q]=Math.round(r/alpha);out[q+1]=Math.round(g/alpha);out[q+2]=Math.round(b/alpha);}
 }return out;
}
function drawEffect(pixels,pitch,index,tile){ // optional independent energy stroke; never a second pose
 const x=index%8*tile,y=Math.floor(index/8)*tile,midX=Math.round(x+tile*.74),midY=Math.round(y+tile*.32);
 for(let i=0;i<34;i++){const px=midX+Math.round(i*.45),py=midY+Math.round(Math.sin(i/10)*5),p=(py*pitch+px)*4;
  if(px>=x+tile||py>=y+tile||px<x||py<y)continue;
  pixels[p]=170;pixels[p+1]=246;pixels[p+2]=255;pixels[p+3]=210;
 }
}
function safeOutput(out){const real=path.resolve(out),protectedDirs=[path.join(root,'arcade/assets/guardians'),path.join(root,'arcade/assets/guardians/2x')];
 if(protectedDirs.some(dir=>real===dir||real.startsWith(dir+path.sep)))throw Error('Refusing to overwrite checked-in guardian atlases');return real;
}
async function bake({key,sourceDir,outputDir,portable=false,effects=false}={}){
 if(!art.keys.includes(key))throw Error('Unknown hero/enemy key');
 if(!sourceDir||!outputDir)throw Error('Expected sourceDir and outputDir');
 const out=safeOutput(outputDir),files=fs.readdirSync(sourceDir).filter(n=>/\.png$/i.test(n)),images=new Map();
 for(const [id,label]of Object.entries({...REQUIRED,...OPTIONAL})){
  const file=id+'-'+label+'.png',found=files.includes(file);
  if(!found&&REQUIRED[id])throw Error('Missing required transparent pose: '+file);
  if(found){const im=decodePNG(fs.readFileSync(path.join(sourceDir,file)));if(!im.data.some((v,i)=>i%4===3&&v<255))throw Error(file+' must have transparent pixels');images.set(id,{...im,box:bounds(im)});}
 }
 if(images.size<12||images.size>16||files.length!==images.size)throw Error('Expected 12–16 exactly named Kxx transparent PNG poses');
 const frameIDs=timeline(new Set(images.keys())),largestW=Math.max(...[...images.values()].map(p=>p.box.w)),largestH=Math.max(...[...images.values()].map(p=>p.box.h));
 const scale=Math.min(248/largestW,248/largestH,4),w=2560,h=2880,high=Buffer.alloc(w*h*4),details=[];
 for(const [name,c]of Object.entries(art.clips))for(let i=0;i<c.frames;i++){
  const frame=c.offset+i,id=frameIDs[frame],input=images.get(id);
  details.push({frame,clip:name,key:id,...drawPose(high,w,320,id,frame,input,input.box,scale,name,i)});
  if(effects&&['attack1','attack2','attack3'].includes(name)&&[24,30,37].includes(frame))drawEffect(high,w,frame,320);
 }
 // Box filtering is alpha-premultiplied, avoiding dark fringes in transparent 3D sprites.
 const low=down2(high,w,h);fs.mkdirSync(path.join(out,'2x'),{recursive:true});fs.mkdirSync(path.join(out,'1x'),{recursive:true});
 let sharp=null;if(!portable)try{sharp=require(require.resolve('sharp',{paths:[root]}));}catch{} // Same optional dependency as build-guardian-art.cjs.
 const write=async(file,pixels,ww,hh)=>{
  if(sharp)await sharp(pixels,{raw:{width:ww,height:hh,channels:4}}).png({compressionLevel:9,palette:false}).toFile(file);
  else fs.writeFileSync(file,encodePNG(ww,hh,pixels));
 };
 const render=[['2x',w,h,high],['1x',w/2,h/2,low]];
 for(const [density,ww,hh,pixels]of render){const dir=path.join(out,density),file=key+'.png';await write(path.join(dir,file),pixels,ww,hh);
  const bytes=fs.readFileSync(path.join(dir,file)),isHigh=density==='2x';
  const manifest={version:'2.0-phase1b1',...(isHigh?{logicalTile:160,source:'scripts/bake-guardian-v2.cjs; hard-cut transparent key poses'}:{}),tile:isHigh?320:160,columns:8,rows:9,frames:71,anchor:{x:80,y:140},clips:art.clips,atlases:[{key,file,bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')}]};
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
 }
 const report={key,sourceCount:images.size,hardCut:true,crossFade:false,sourceScale:scale,anchor:ANCHOR,frames:details,hitFrames:{attack1:24,attack2:30,attack3:37},outputs:['1x','2x']};
 fs.writeFileSync(path.join(out,'bake-report.json'),JSON.stringify(report,null,2)+'\n');
 return report;
}
async function cli(args=process.argv.slice(2)){const opts={};for(let i=0;i<args.length;i++){
  const a=args[i];if(a==='--portable'||a==='--effects')opts[a.slice(2)]=true;
  else if(['--key','--source','--output'].includes(a)){if(!args[i+1])throw Error('Missing value '+a);opts[a.slice(2)]=args[++i];}
  else throw Error('Unknown option '+a);
 }
 if(!opts.key)throw Error('Usage: node scripts/bake-guardian-v2.cjs --key burner-sister [--source path] [--output path] [--portable] [--effects]');
 return bake({key:opts.key,sourceDir:opts.source||path.join(root,'arcade/assets/guardians/v2-source',opts.key),outputDir:opts.output||path.join(root,'arcade/qa/guardian-v2-bake',opts.key),portable:opts.portable,effects:opts.effects});
}
if(require.main===module)cli().then(report=>console.log('G2 BAKE PASS '+report.key+' '+report.frames.length+' hard-cut frames')).catch(err=>{console.error(err);process.exitCode=1;});
module.exports={bake,cli,decodePNG,encodePNG,timeline,TILES,ANCHOR,REQUIRED,OPTIONAL};
