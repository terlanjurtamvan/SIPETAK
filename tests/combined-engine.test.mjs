import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function env({speech=true,recorderFails=false,audioPeak}={}){
 const events=[],messages=[],lines=[],recognizers=[];
 const track={muted:false,listeners:{},addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);},removeEventListener(type,fn){this.listeners[type]=(this.listeners[type]||[]).filter(x=>x!==fn);},emit(type){for(const cb of this.listeners[type]||[])cb();}};
 let stopped=false,aborted=false;
 const recorder={start(options){
  events.push('record-start');
  if(recorderFails)return Promise.reject(Error('denied'));
  return Promise.resolve({stream:{getAudioTracks:()=>[track]},audioPeak,durationSeconds:4,
   async stop(){stopped=true;events.push('record-stop');return {name:'meeting.wav',size:64000,type:'audio/wav'};},
   abort(){aborted=true;}});
 }};
 class Speech{
  constructor(){recognizers.push(this);}
  start(){events.push('speech-start');this.onstart?.();}
  stop(){events.push('speech-stop');this.onend?.();}
  emit(transcript,final=false){const results=[[{transcript}]];results[0].isFinal=final;this.onresult({resultIndex:0,results});}
  fail(code){this.onerror({error:code});this.onend();}
 }
 const ctx={window:null,SIPETAK_RECORDER:recorder,console,setTimeout,clearTimeout,isSecureContext:true};
 if(speech)ctx.webkitSpeechRecognition=Speech;
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(readFileSync('modules/transcription/combined-engine.js','utf8'),ctx);
 function make(){return ctx.SIPETAK_COMBINED_ENGINE.start({onText:value=>lines.push(value),onError:(message,code)=>messages.push({message,code}),onState:state=>events.push(state)});}
 return {ctx,events,messages,lines,track,recognizers,make,get stopped(){return stopped;},get aborted(){return aborted;}};
}

test('one user gesture starts WAV capture and speech recognition; text grows while audio records',async()=>{
 const e=env(),h=e.make();
 assert.deepEqual(e.events.slice(0,3),['record-start','speech-start','speech-started']);
 assert.equal(e.recognizers[0].lang,'id-ID');
 assert.equal(e.recognizers[0].interimResults,true);
 await h.ready;
 e.recognizers[0].emit('Selamat pagi');
 assert.equal(e.lines.at(-1),'Selamat pagi');
 assert.equal(h.hasText,true);
 assert.equal(e.stopped,false);
 e.recognizers[0].emit('Selamat pagi rapat dimulai',true);
 assert.equal(e.lines.at(-1),'Selamat pagi rapat dimulai');
 const audio=await h.stop();
 assert.equal(audio.name,'meeting.wav');assert.equal(e.stopped,true);
 assert.equal(e.events.includes('speech-stop'),true);
 assert.equal(h.text,'Selamat pagi rapat dimulai');
});

test('Safari mute event is reported; never pretends recording succeeded silently',async()=>{
 const e=env(),h=e.make();await h.ready;
 e.track.muted=true;e.track.emit('mute');
 assert.equal(h.audioMuted,true);
 assert.equal(e.messages.at(-1).code,'mic-muted');
 assert.match(e.messages.at(-1).message,/membisukan mikrofon/);
 const audio=await h.stop();assert.equal(audio.name,'meeting.wav');
});

test('dikte error does not discard recorded WAV; error is explicit',async()=>{
 const e=env(),h=e.make();await h.ready;
 e.recognizers[0].fail('audio-capture');
 assert.equal(h.speechAvailable,false);
 assert.equal(e.messages.at(-1).code,'audio-capture');
 assert.equal((await h.stop()).name,'meeting.wav');
});

test('no speech constructor rejects before requesting microphone (no silent audio-only mode)',()=>{
 const e=env({speech:false});
 assert.equal(e.ctx.SIPETAK_COMBINED_ENGINE.supported(),false);
 assert.throws(()=>e.make(),/tidak tersedia/);
 assert.equal(e.events.length,0);
});

test('failed WAV permission stops browser dictation and reports failure',async()=>{
 const e=env({recorderFails:true}),h=e.make();
 await assert.rejects(h.ready,/denied/);
 assert.equal(e.messages.at(-1).code,'record-failed');
 assert.equal(e.recognizers[0]?.stop!==undefined,true);
});


test('near-silent microphone audio raises warning but still returns the WAV file',async()=>{
 const e=env({audioPeak:0.00001});const h=e.make();await h.ready;
 const file=await h.stop();
 assert.equal(file.name,'meeting.wav');
 assert.equal(e.messages.at(-1).code,'audio-maybe-silent');
 assert.match(e.messages.at(-1).message,/hampir tidak menangkap suara/);
});

test('audible microphone signal does not produce a false silent-audio warning',async()=>{
 const e=env({audioPeak:0.2});const h=e.make();await h.ready;
 await h.stop();
 assert.equal(e.messages.some(x=>x.code==='audio-maybe-silent'),false);
});
