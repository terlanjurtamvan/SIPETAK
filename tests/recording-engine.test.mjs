import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function boot({ios=false,wav=true}={}){
 let tracksStopped=0, mediaInstance=null, audioContext=null;
 const track={stop(){tracksStopped++;}},stream={getTracks(){return [track];}};
 const ctx={window:null,File,Blob,ArrayBuffer,DataView,Float32Array,Date,
  isSecureContext:true,
  navigator:{userAgent:ios?'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X)':'Desktop Safari',platform:ios?'iPhone':'MacIntel',maxTouchPoints:ios?5:0,mediaDevices:{getUserMedia:async()=>stream}},
  console};
 class MR{
  static isTypeSupported(m){return m==='audio/mp4'||m==='audio/webm';}
  constructor(s,options={}){this.stream=s;this.mimeType=options.mimeType||'audio/mp4';this.state='inactive';this.listeners={};mediaInstance=this;this.startArgs=null;}
  addEventListener(type,callback){(this.listeners[type]??=[]).push(callback);}
  emit(type,event){for(const callback of this.listeners[type]||[])callback(event);}
  start(...args){this.startArgs=args;this.state='recording';}
  stop(){this.state='inactive';this.emit('dataavailable',{data:new Blob(['mock-audio'.repeat(100)],{type:this.mimeType})});this.emit('stop',{});}
 }
 class AudioContext{
  constructor(){this.state='running';this.sampleRate=48000;this.destination={};this.closed=false;audioContext=this;}
  createMediaStreamSource(){return {connect(){},disconnect(){}};}
  createScriptProcessor(){const p={onaudioprocess:null,connect(){},disconnect(){}};this.processor=p;return p;}
  resume(){this.state='running';return Promise.resolve();}
  close(){this.closed=true;return Promise.resolve();}
 }
 ctx.MediaRecorder=MR;
 if(wav)ctx.AudioContext=AudioContext;
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(readFileSync('modules/transcription/recording-engine.js','utf8'),ctx);
 return {ctx,getTracksStopped:()=>tracksStopped,getMedia:()=>mediaInstance,getAudioContext:()=>audioContext};
}
test('Safari/iPhone automatic WAV recording produces valid RIFF PCM WAVE at 16k mono',async()=>{
 const {ctx,getAudioContext,getMedia,getTracksStopped}=boot({ios:true});
 const recording=await ctx.SIPETAK_RECORDER.start();
 assert.equal(recording.mode,'wav');assert.equal(getMedia(),null);
 const p=getAudioContext().processor;
 p.onaudioprocess({inputBuffer:{getChannelData:()=>Float32Array.from({length:4800},(_,i)=>Math.sin(i/50))}});
 const file=await recording.stop();
 assert.match(file.name,/\.wav$/);assert.equal(file.type,'audio/wav');assert.ok(file.size>44);
 const b=Buffer.from(await file.arrayBuffer());
 assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
 assert.equal(b.readUInt32LE(24),16000);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt16LE(34),16);
 assert.equal(b.length,b.readUInt32LE(4)+8);assert.equal(getTracksStopped(),1);
 assert.equal(getAudioContext().closed,true);
});
test('MediaRecorder captures as a single complete file without timeslice, stops tracks',async()=>{
 const {ctx,getMedia,getTracksStopped}=boot();
 const recording=await ctx.SIPETAK_RECORDER.start();
 assert.equal(recording.mode,'mediarecorder');assert.equal(getMedia().startArgs.length,0,'Safari MP4 corruption guard: start() with no timeslice');
 const file=await recording.stop();assert.match(file.name,/\.m4a$/);
 assert.equal(file.type,'audio/mp4');assert.equal(getTracksStopped(),1);
});
test('explicit WAV mode supported on desktop and abort cleans up microphone',async()=>{
 const {ctx,getTracksStopped}=boot();
 const recording=await ctx.SIPETAK_RECORDER.start({forceWav:true});assert.equal(recording.mode,'wav');
 recording.abort();assert.equal(getTracksStopped(),1);
});
test('iPhone falls back to MediaRecorder if WebAudio is unavailable',async()=>{
 const {ctx,getMedia}=boot({ios:true,wav:false});
 const recording=await ctx.SIPETAK_RECORDER.start();
 assert.equal(recording.mode,'mediarecorder');assert.equal(getMedia().startArgs.length,0);
 await recording.stop();
});
test('CSP explicitly allows only local/self and blob audio and loads recorder first',()=>{
 const policy=readFileSync('_headers','utf8');
 assert.match(policy,/media-src 'self' blob:/);
 const html=readFileSync('index.html','utf8');
 assert.ok(html.indexOf('modules/transcription/recording-engine.js')<html.indexOf('modules/transcription/transcription.js'));
 const sw=readFileSync('sw.js','utf8');assert.ok(sw.includes('modules/transcription/recording-engine.js'));
});
