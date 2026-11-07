import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/transcribe.js';
const token='x'.repeat(30);
const url='https://sipetak.pages.dev/api/transcribe';
function env(override={}){const quotas=new Map();return {TRANSCRIBE_ENABLED:'true',OPENAI_API_KEY:'fake-server-only-key',TRANSCRIBE_DAILY_LIMIT:8,TRANSCRIBE_GLOBAL_DAILY_LIMIT:200,TRANSCRIBE_DB:{prepare:()=>({bind:(key,date,limit)=>({first:async()=>{const k=key+':'+date,n=quotas.get(k)||0;if(n>=limit)return null;quotas.set(k,n+1);return {used:n+1};}})})},...override};}
function req({name='rekaman.m4a',type='audio/mp4',size=8,classification='Umum',auth=true,origin=url.replace('/api/transcribe',''),method='POST'}={}){
 const body=new FormData();body.append('file',new File([new Uint8Array(size)],name,{type}));body.append('classification',classification);
 return new Request(url,{method,headers:{...(auth?{Authorization:'Bearer '+token}:{}),Origin:origin},body});
}
async function mockFetch(action){const old=globalThis.fetch;globalThis.fetch=async(url,options)=>{
 if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'abcd1234-56ef-90ab-cdef-123456789012'});
 if(String(url).endsWith('/v1/audio/transcriptions')){const file=options.body.get('file');assert.equal(options.body.get('model'),'gpt-transcribe');assert.equal(file.name,'rekaman.m4a');return Response.json({text:'Catatan rapat dari suara.'});}
 return Response.json({error:'unexpected URL'},{status:500});
 };try{return await action();}finally{globalThis.fetch=old;}}
test('rejects cross-origin, unauthenticated, disabled, unavailable quota',async()=>{
 assert.equal((await onRequestPost({request:req({origin:'https://evil.example'}),env:env()})).status,403);
 assert.equal((await onRequestPost({request:req({auth:false}),env:env()})).status,401);
 assert.equal((await onRequestPost({request:req(),env:env({TRANSCRIBE_ENABLED:'false'})})).status,503);
 assert.equal((await onRequestPost({request:req(),env:env({TRANSCRIBE_DB:null})})).status,503);
});
test('rejects restricted audio and invalid formats after authentication',async()=>mockFetch(async()=>{
 assert.equal((await onRequestPost({request:req({classification:'Terbatas'}),env:env()})).status,403);
 assert.equal((await onRequestPost({request:req({name:'file.exe'}),env:env()})).status,415);
}));
test('valid upload returns draft text; daily quota enforces second request',async()=>mockFetch(async()=>{
 const config=env({TRANSCRIBE_DAILY_LIMIT:1});
 const response=await onRequestPost({request:req(),env:config});
 assert.equal(response.status,200);assert.deepEqual((await response.json()).status,'draft-needs-review');
 const second=await onRequestPost({request:req(),env:config});assert.equal(second.status,429);
}));
