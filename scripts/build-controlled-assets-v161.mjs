import {mkdir,readFile,writeFile,rm,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {staticPath} from '../signaling/worker/static-policy.mjs';
export async function build(){
 const root=fileURLToPath(new URL('../',import.meta.url)),out=resolve(root,'signaling/worker/candidate-assets');
 await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});let files=0,bytes=0;
 async function copy(source,target=source){
  if(!staticPath('/'+target))return;
  let data=await readFile(join(root,source));
  if(target==='arcade/assets/challenge-ui.js')data=Buffer.from(data.toString().replaceAll('../friends-v16/index.html','../friends/index.html'));
  if(target.endsWith('.html')){
   let html=data.toString();
   // Candidate pages never load production tracking. CSP also blocks external requests.
   html=html.replace(/<script\b[^>]*>[\s\S]*?googletagmanager[\s\S]*?<\/script>/gi,'').replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi,'');
   if(source.includes('/qa/challenge-'))html=html.replaceAll('../../assets/','../assets/').replaceAll('../friends-v16/index.html','../friends/index.html');
   if(target==='arcade/friends/index.html')html=html.replace('href="../../zh/index.html"','href="../zh/index.html"');
   html=html.replaceAll('../qa/friends-v16/index.html','../friends/index.html');
   data=Buffer.from(html);
  }
  if(data.length>25*1024*1024)throw Error('Asset exceeds Free static file limit: '+target);
  await mkdir(resolve(out,target,'..'),{recursive:true});await writeFile(join(out,target),data);files++;bytes+=data.length;
 }
 async function walk(dir){for(const item of await readdir(join(root,dir),{withFileTypes:true})){const path=dir+'/'+item.name;if(item.isDirectory())await walk(path);else if(item.isFile())await copy(path);}}
 await walk('arcade/assets');await walk('assets');await walk('images');await walk('music');
 for(const locale of ['zh','ja'])for(const page of ['index','shooter'])await copy(`arcade/${locale}/${page}.html`);
 await copy('arcade/friends/index.html');await copy('arcade/qa/challenge-v16/index.html','arcade/challenge-v16/index.html');
 console.log(`Controlled bundle: ${files} files, ${bytes} bytes; no deployment.`);return {out,files,bytes};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await build();
