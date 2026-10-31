// Real local Workerd, using documentation-only test addresses; no credentials or rooms printed.
import assert from 'node:assert/strict';
const endpoint='http://127.0.0.1:8787/rooms';
async function create(ip){return fetch(endpoint,{method:'POST',headers:{Origin:'http://127.0.0.1:8790','CF-Connecting-IP':ip}});}
const source='198.51.100.1',other='203.0.113.1';
const same=await Promise.all(Array.from({length:20},()=>create(source)));assert.equal(same.filter(r=>r.status===201).length,12);assert.equal(same.filter(r=>r.status===429).length,8);
assert.equal((await create(other)).status,201,'different source has a separate window');
console.log('PASS local Workerd: cross-room per-source creation limit and isolated sources');
