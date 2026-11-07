import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const code=readFileSync(new URL('../modules/transcription/live-engine.js',import.meta.url),'utf8');
function instance(){const ctx={};ctx.window=ctx;ctx.setTimeout=setTimeout;vm.runInNewContext(code,ctx);const texts=[];const errors=[];
 const session=ctx.SIPETAK_LIVE_ENGINE.create({onText:(t)=>texts.push(t),onError:(e)=>errors.push(e)});return {session,texts,errors};}
test('live deltas are visible before completed transcripts and finals replace partial',()=>{
 const {session,texts}=instance();
 session.accept({type:'conversation.item.input_audio_transcription.delta',item_id:'a',delta:'Selamat '});
 session.accept({type:'conversation.item.input_audio_transcription.delta',item_id:'a',delta:'pagi'});
 assert.equal(texts.at(-1),'Selamat pagi');
 session.accept({type:'conversation.item.input_audio_transcription.completed',item_id:'a',transcript:'Selamat pagi.'});
 assert.equal(texts.at(-1),'Selamat pagi.');
 session.accept({type:'conversation.item.input_audio_transcription.delta',item_id:'b',delta:'Rapat '});
 assert.equal(texts.at(-1),'Selamat pagi.\nRapat ');
 session.accept({type:'conversation.item.input_audio_transcription.completed',item_id:'b',transcript:'Rapat dibuka.'});
 assert.equal(session.combined(),'Selamat pagi.\nRapat dibuka.');
});
test('invalid events ignored, server error visibly reported, abort ignores late events',()=>{
 const {session,errors}=instance();
 session.accept({type:'error',error:{message:'Koneksi gagal'}});
 assert.deepEqual(errors,['Koneksi gagal']);
 session.accept({type:'conversation.item.input_audio_transcription.delta',delta:'ignored'});
 assert.equal(session.combined(),'');
 session.abort();session.accept({type:'conversation.item.input_audio_transcription.delta',item_id:'a',delta:'again'});
 assert.equal(session.combined(),'');
});

test('manual commit cannot send while the realtime data channel is closed',()=>{
 const {session}=instance();assert.equal(session.commit(),false);session.abort();assert.equal(session.commit(),false);
});

test('WebRTC data channel sends manual commit and flushes final turn',async()=>{
 const messages=[];let dc;
 class FakePC{
  constructor(){this.connectionState='new';}
  addTrack(){}
  createDataChannel(){dc={readyState:'open',send:s=>messages.push(JSON.parse(s)),close(){this.readyState='closed'}};return dc;}
  async createOffer(){return {sdp:'v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n'};}
  async setLocalDescription(){}
  async setRemoteDescription(){}
  close(){}
 }
 const ctx={window:null,RTCPeerConnection:FakePC,setInterval,clearInterval,setTimeout,fetch:async()=>new Response('v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n',{status:201})};ctx.window=ctx;
 vm.runInNewContext(code,ctx);
 const session=ctx.SIPETAK_LIVE_ENGINE.create();
 await session.connect({stream:{getAudioTracks:()=>[{}]},token:'token',classification:'Umum'});
 dc.onopen();
 assert.equal(session.commit(),true);
 assert.deepEqual(messages.at(-1),{type:'input_audio_buffer.commit'});
 await session.stop({graceMs:0});
 assert.equal(messages.length,2);
 assert.equal(session.commit(),false);
});
