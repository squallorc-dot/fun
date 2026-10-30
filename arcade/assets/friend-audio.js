/* The existing four OSTs and preference schema, without room/SDP persistence. */
((root)=>{'use strict';
const base=new URL('../../music/',document.currentScript.src),files=['bio-city-awakening-theme-v2.mp3','burner-sister-summoning-theme.mp3','mj-robot-kizamu-japanese-v1.mp3','mj-robot-kizamu-japanese-v2.mp3'];
class Audio{
 constructor(onChange=()=>{}){let saved;try{saved=JSON.parse(localStorage.getItem('bio_arcade_pref_v1'));}catch{}this.prefs=root.BioArcadeAudioPolicy.normalize(saved);this.media=new root.Audio();this.media.preload='metadata';this.status='idle';this.onChange=onChange;this.effects=new Set();this.previous=null;for(const name of ['playing','pause','error'])this.media.addEventListener(name,()=>{this.status=name==='error'?'error':name==='playing'?'playing':'paused';onChange();});}
 set(patch){this.prefs=root.BioArcadeAudioPolicy.normalize({...this.prefs,...patch});try{localStorage.setItem('bio_arcade_pref_v1',JSON.stringify(this.prefs));}catch{}this.media.volume=this.prefs.volume/100;this.media.loop=this.prefs.loop;if(this.prefs.playMode==='off'||this.prefs.volume===0)this.pause();this.onChange();}
 unlock(){try{this.context=this.context||new(root.AudioContext||root.webkitAudioContext)();this.context.resume()?.catch(()=>{});}catch{}}
 async play(){this.unlock();if(document.hidden||this.prefs.playMode==='off'||!this.prefs.volume)return;const url=new URL(files[this.prefs.track],base).href;if(this.media.src!==url)this.media.src=url;this.media.volume=this.prefs.volume/100;this.media.loop=this.prefs.loop;try{await this.media.play();this.status='playing';}catch{this.status='blocked';}this.onChange();}
 round(){if(this.prefs.playMode==='shuffle')this.prefs.track=root.BioArcadeAudioPolicy.nextTrack(4,this.previous);if(this.prefs.playMode==='scene')this.prefs.track=0;this.previous=this.prefs.track;if(this.prefs.auto)this.play();}
 pause(){this.resumeWanted=!this.media.paused||this.resumeWanted;this.media.pause();for(const o of this.effects)try{o.stop();}catch{}this.effects.clear();}
 resume(){if(this.resumeWanted){this.resumeWanted=false;this.play();}}
 effect(freq,len){if(!this.prefs.sfx||!this.context||this.context.state!=='running'||document.hidden)return;try{const o=this.context.createOscillator(),g=this.context.createGain();o.type='triangle';o.frequency.value=freq;g.gain.value=.045*this.prefs.sfx/100;g.gain.exponentialRampToValueAtTime(.00001,this.context.currentTime+len);o.connect(g);g.connect(this.context.destination);this.effects.add(o);o.onended=()=>this.effects.delete(o);o.start();o.stop(this.context.currentTime+len);}catch{}}
 dispose(){this.pause();this.media.removeAttribute('src');this.media.load();this.context?.close();}
}
root.BioFriendAudio=Audio;
})(window);
