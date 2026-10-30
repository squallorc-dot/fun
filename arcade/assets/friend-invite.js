/* Invitation capability stays in the URL fragment; consume before loading analytics or external content. */
((root)=>{'use strict';
const roomPattern=/^[A-HJ-NP-Z2-9]{8}$/,tokenPattern=/^[a-f0-9]{64}$/;
function validTarget(url){return !url.username&&!url.password&&(url.protocol==='https:'||url.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(url.hostname));}
function create(page,room,token,lang='zh'){
 const url=new URL(page);if(!validTarget(url)||!roomPattern.test(room)||!tokenPattern.test(token)||!['zh','ja'].includes(lang))throw Error('invite-invalid');
 url.search='?lang='+lang;url.hash=new URLSearchParams({invite:'1',room,token}).toString();return url.href;
}
function consume(location,history){
 const url=new URL(location.href);if(!url.hash)return null;
 const fragment=url.hash.slice(1);url.hash='';history.replaceState(history.state,'',url.href);
 if(!validTarget(url)||fragment.length>128)throw Error('invite-invalid');
 const params=new URLSearchParams(fragment),keys=[...params.keys()];
 if(keys.length!==3||new Set(keys).size!==3||keys.some(k=>!['invite','room','token'].includes(k))||params.get('invite')!=='1'||!roomPattern.test(params.get('room')||'')||!tokenPattern.test(params.get('token')||''))throw Error('invite-invalid');
 return Object.freeze({room:params.get('room'),token:params.get('token')});
}
root.BioFriendInvite=Object.freeze({create,consume});
})(typeof window==='undefined'?globalThis:window);
