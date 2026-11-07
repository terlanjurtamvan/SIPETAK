import test from 'node:test';
import assert from 'node:assert/strict';
import {onRequestPost} from '../functions/api/transcribe-live.js';
const url='https://sipetak.example/api/transcribe-live';
const validSdp='v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';
const auth='Bearer '+ 'a'.repeat(35);
function req({headers={},body=validSdp}={}){return new Request(url,{method:'POST',headers:{Authorization:auth,'Content-Type':'application/sdp','X-Sipetak-Classification':'Internal',...headers},body});}
function env(){return {TRANSCRIBE_LIVE_ENABLED:'true',OPENAI_API_KEY:'server-secret',TRANSCRIBE_DB:{prepare:()=>({bind:()=>({first:async()=>({used:1})})})}};}
test('live SDP endpoint rejects unsafe requests before spending quota',async()=>{
 assert.equal((await onRequestPost({request:req(),env:{}})).status,503);
 assert.equal((await onRequestPost({request:req({headers:{Origin:'https://evil.example'}}),env:env()})).status,403);
 assert.equal((await onRequestPost({request:req({headers:{'X-Sipetak-Classification':'Terbatas'}}),env:env()})).status,403);
 assert.equal((await onRequestPost({request:req({headers:{Authorization:''}}),env:env()})).status,401);
});
test('authenticated live SDP is forwarded with transcription-only session config',async()=>{
 const old=globalThis.fetch;let calls=0,captured;
 globalThis.fetch=async (resource,options)=>{
  calls++;
  if(String(resource).includes('auth/v1/user'))return new Response(JSON.stringify({id:'user_0001'}),{status:200});
  captured={resource,options};return new Response(validSdp,{status:201});
 };
 try{
  const response=await onRequestPost({request:req(),env:env()});
  assert.equal(response.status,201);assert.equal(await response.text(),validSdp);
  assert.equal(calls,2);
  const config=JSON.parse(captured.options.body.get('session'));
  assert.equal(config.type,'transcription');
  assert.equal(config.audio.input.transcription.model,'gpt-live-transcribe');
  assert.equal(config.audio.input.transcription.languages[0],'id');
  assert.equal(config.audio.input.turn_detection,null,'gpt-live-transcribe must not use server_vad');
  assert.equal(captured.options.headers.Authorization,'Bearer server-secret');
 }finally{globalThis.fetch=old;}
});
test('transcribe-live fails closed if database binding not present',async()=>{
 const fakeEnv=env();delete fakeEnv.TRANSCRIBE_DB;
 assert.equal((await onRequestPost({request:req(),env:fakeEnv})).status,503);
});
