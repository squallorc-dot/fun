// Run only in an extracted disposable ZIP. This configures files locally; it does not publish.
import {readFile,writeFile} from 'node:fs/promises';
const [candidateInput,signalInput=candidateInput]=process.argv.slice(2);
function httpsOrigin(input){
 const url=new URL(input);
 if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('Provide a complete HTTPS origin only (no path, credentials, query or fragment).');
 return url.origin;
}
try {
 const candidate=httpsOrigin(candidateInput),signal=httpsOrigin(signalInput);
 if(candidate==='https://squallorc-dot.github.io')throw Error('The formal GitHub Pages origin cannot be used for this candidate.');
 const page='arcade/friends/index.html',config='signaling/worker/wrangler.toml';
 const html=await readFile(page,'utf8'),toml=await readFile(config,'utf8');
 const placeholder='<meta name="bio-signaling-endpoint" content="">';
 if(html.split(placeholder).length!==2)throw Error('Expected exactly one unconfigured candidate page.');
 if(!/^workers_dev\s*=\s*false\s*$/m.test(toml)||!/^preview_urls\s*=\s*false\s*$/m.test(toml)||/^\s*(routes?|custom_domain)\s*=/m.test(toml)||/^\s*\[\[?\s*routes?\s*\]\]?/m.test(toml))throw Error('Worker config must disable workers.dev and previews and contain no routes.');
 if((toml.match(/^ALLOWED_ORIGINS\s*=.*$/gm)||[]).length!==1)throw Error('Expected exactly one ALLOWED_ORIGINS.');
 await writeFile(page,html.replace(placeholder,`<meta name="bio-signaling-endpoint" content="${signal}">`));
 await writeFile(config,toml.replace(/^ALLOWED_ORIGINS\s*=.*$/m,`ALLOWED_ORIGINS = "${candidate}"`));
 console.log('Prepared local candidate and exact origin; no service was deployed or opened.');
} catch(error){console.error(error.message);process.exitCode=1;}
