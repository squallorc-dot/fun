// Only these runtime files can be packaged or served. Never use the repository as an asset root.
export const scripts=['arcade-hub.css','audio-policy.js','campaign-core.js','challenge-code.js','challenge-ui.js','control-profiles.js','controls.css','friend-audio.js','friend-invite.js','friend-lobby-auto.css','friend-lobby-auto.js','friend-lobby.css','friend-lobby.js','friend-session.js','friend-signaling.js','g01-network.js','g02-network-state.js','g02-network.js','g05-network.js','g06-network.js','game-guide.js','games-core.js','guardian-art.js','hub.js','peer-link.js','race-cup.js','session-runtime.js','shooter-bridge.js','world-art.js'];
export const audio=['bio-city-awakening-theme-v2.mp3','burner-sister-summoning-theme.mp3','mj-robot-kizamu-japanese-v1.mp3','mj-robot-kizamu-japanese-v2.mp3'];
export function staticPath(path){
 if(['/arcade/friends/','/arcade/friends/index.html','/arcade/challenge-v16/','/arcade/challenge-v16/index.html'].includes(path))return true;
 if(/^\/arcade\/(zh|ja)\/(index|shooter)\.html$/.test(path))return true;
 if(scripts.some(name=>path==='/arcade/assets/'+name)||path==='/arcade/assets/vendor/qrcode-generator-1.4.4.js')return true;
 if(/^\/arcade\/assets\/(guardians\/(2x\/)?|worlds\/|covers\/)[a-z0-9-]+\.(png|webp)$/.test(path))return true;
 if(['/assets/arcade-engine.js','/assets/arcade.css','/assets/navigation.js','/assets/navigation.css','/assets/arcade-integration.css'].includes(path))return true;
 if(/^\/images\/funai-care-(burner-sister|mj-robot|moo-moo|ye-bao-ex|jelly-trio|veggie-kid|oracle-guardian)\.png$/.test(path))return true;
 return audio.some(name=>path==='/music/'+name);
}
