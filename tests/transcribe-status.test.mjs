import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestGet,onRequestPost} from '../functions/api/transcribe-status.js';

const db = {prepare:(sql)=>({first:async()=>({ok:1})})};
const ready = {TRANSCRIBE_LIVE_ENABLED:'true',TRANSCRIBE_ENABLED:'true',OPENAI_API_KEY:'test-secret',TRANSCRIBE_DB:db,
 SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'};
async function result(env){const res=await onRequestGet({env}); assert.equal(res.status,200);assert.match(res.headers.get('cache-control'),/no-store/);return await res.json();}
test('public health reports disabled, missing key, binding, uninitialized table, auth config and ready state safely',async()=>{
 assert.equal((await result({})).live.reason,'not-enabled');
 assert.equal((await result({...ready,OPENAI_API_KEY:''})).live.reason,'key-missing');
 assert.equal((await result({...ready,TRANSCRIBE_DB:null})).live.reason,'d1-missing');
 assert.equal((await result({...ready,TRANSCRIBE_DB:{prepare:()=>({first:async()=>{throw Error('table does not exist')}})}})).live.reason,'d1-table-missing');
 assert.equal((await result({...ready,SUPABASE_URL:''})).live.reason,'auth-config-missing');
 const ok=await result(ready);assert.equal(ok.live.ready,true);assert.equal(ok.upload.ready,true);
 assert.ok(!JSON.stringify(ok).includes(ready.OPENAI_API_KEY),'Never leak API key in health payload');
 assert.equal((await onRequestPost()).status,405);
});
