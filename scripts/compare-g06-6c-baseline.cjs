'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{execFileSync}=require('node:child_process'),assert=require('node:assert/strict'),{setup}=require('./lib/race-probe.cjs');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'g06-baseline-'));
try{fs.mkdirSync(path.join(dir,'arcade/assets'),{recursive:true});fs.writeFileSync(path.join(dir,'arcade/assets/games-core.js'),execFileSync('git',['show','71630e630c42076fe62d73317e4a7b3096cb567d:arcade/assets/games-core.js']));let count=0;
 for(let chapter=1;chapter<=5;chapter++)for(const difficulty of ['normal','hard','expert'])for(let hero=0;hero<7;hero++){
  const a=setup({chapter,difficulty,hero,sourceRoot:dir}).g,b=setup({chapter,difficulty,hero}).g;
  for(let i=0;i<720;i++){const input={moveX:i%240<120?.1:-.1,fire:i%240<100};a.update(1/120,input);b.update(1/120,input);}
  assert.equal(JSON.stringify(b.inspectRace()),JSON.stringify(a.inspectRace()),`single-player drift ch${chapter} ${difficulty} hero${hero}`);count++;
 }
 console.log(`G06 SOLO BASELINE PASS: ${count} seeded six-second states, 5 chapters / 3 difficulties / 7 heroes`);
}finally{fs.rmSync(dir,{recursive:true,force:true});}
