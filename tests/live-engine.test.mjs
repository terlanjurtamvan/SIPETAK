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
