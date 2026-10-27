// Preserve child exit codes and ordinary output, with a bounded failure
// annotation readable through the Checks API when hosted log downloads fail.
import {spawn} from 'node:child_process';
const escape=value=>value.replaceAll('%','%25').replaceAll('\r','%0D').replaceAll('\n','%0A');
for(const file of process.argv.slice(2)){
 let diagnostic='';
 const child=spawn(process.execPath,[file],{stdio:['inherit','inherit','pipe']});
 child.stderr.on('data',chunk=>{process.stderr.write(chunk);diagnostic=(diagnostic+chunk.toString()).slice(-6000);});
 const code=await new Promise(resolve=>{child.on('error',error=>{diagnostic+=String(error);resolve(1);});child.on('close',value=>resolve(value??1));});
 if(code!==0){console.error(`::error file=${file}::${escape(diagnostic||'Browser check failed with exit '+code)}`);process.exitCode=code;break;}
}
