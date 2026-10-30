/* Offline challenge conditions. CRC detects accidental damage, not forgery. */
((root)=>{'use strict';
const VERSION=1,RULES=Object.freeze({g03:'g03-6b-v1-960x540',g04:'g04-6b-v1-960x540'}),MAX=512;
const exact=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
function validate(v){
 if(!exact(v,['version','game','seed','chapter','difficulty','mode','rule'])||v.version!==VERSION||!Object.hasOwn(RULES,v.game)||v.rule!==RULES[v.game]||!integer(v.seed,0,0xffffffff)||!integer(v.chapter,1,5)||!['normal','hard','expert'].includes(v.difficulty)||v.mode!=='standard')throw Error('challenge-invalid');
 return {version:VERSION,game:v.game,seed:v.seed,chapter:v.chapter,difficulty:v.difficulty,mode:'standard',rule:RULES[v.game]};
}
function checksum(text){let c=0xffffffff;for(let i=0;i<text.length;i++){c^=text.charCodeAt(i);for(let j=0;j<8;j++)c=(c>>>1)^(0xedb88320&-(c&1));}return ((c^0xffffffff)>>>0).toString(16).padStart(8,'0');}
function encode(value){const json=JSON.stringify(validate(value)),payload=btoa(json).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');return `BC6B1.${payload}.${checksum(json)}`;}
function decode(code){
 if(typeof code!=='string'||code.length>MAX||!/^BC6B1\.[A-Za-z0-9_-]+\.[a-f0-9]{8}$/.test(code))throw Error('challenge-format');
 const [,payload,check]=code.split('.');let json,v;try{json=atob(payload.replaceAll('-','+').replaceAll('_','/'));if(json.length>384||checksum(json)!==check)throw Error();v=validate(JSON.parse(json));}catch{throw Error('challenge-invalid');}
 if(encode(v)!==code)throw Error('challenge-noncanonical');return v;
}
function create(game,seed,chapter,difficulty){return validate({version:VERSION,game,seed,chapter,difficulty,mode:'standard',rule:RULES[game]});}
function resultValue(value){
 if(!exact(value,['challenge','win','score','elapsedMs','depth','shots','hits'])||typeof value.win!=='boolean'||!['score','elapsedMs','depth','shots','hits'].every(k=>integer(value[k],0,100000000)))throw Error('result-invalid');
 const challenge=validate(value.challenge);if(challenge.game==='g03'&&(value.shots||value.hits)||challenge.game==='g04'&&value.depth)throw Error('result-invalid');
 return {challenge,win:value.win,score:value.score,elapsedMs:value.elapsedMs,depth:value.depth,shots:value.shots,hits:value.hits};
}
function encodeResult(value){const json=JSON.stringify(resultValue(value)),payload=btoa(json).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');return `BC6BR1.${payload}.${checksum(json)}`;}
function decodeResult(code){
 if(typeof code!=='string'||code.length>MAX||!/^BC6BR1\.[A-Za-z0-9_-]+\.[a-f0-9]{8}$/.test(code))throw Error('result-format');
 const [,payload,check]=code.split('.');let json,v;try{json=atob(payload.replaceAll('-','+').replaceAll('_','/'));if(json.length>384||checksum(json)!==check)throw Error();v=resultValue(JSON.parse(json));}catch{throw Error('result-invalid');}
 if(encodeResult(v)!==code)throw Error('result-noncanonical');return v;
}
function comparable(a,b){return encode(validate(a))===encode(validate(b));}
root.BioChallenge=Object.freeze({VERSION,RULES,MAX,create,encode,decode,encodeResult,decodeResult,comparable});
})(typeof window==='undefined'?globalThis:window);
