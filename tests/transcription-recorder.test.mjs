import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function createRecorderTest({getUserMedia}={}){
 const controls={
  transcriptStatus:{textContent:'',style:{color:''}},
  transcriptRecordIndicator:{textContent:'',dataset:{}},
  transcriptPreview:{innerHTML:''},
  transcriptTitle:{value:'Rapat percobaan'},transcriptClass:{value:'Umum'},
  transcriptText:{value:''},transcriptConsent:{checked:true},
  transcriptVerified:{checked:false},transcriptMeeting:{value:''}
 };
 const recordBtn={textContent:'● Mulai rekam',setAttribute(){}};
 const stoppedTracks=[];
 const stream={getTracks:()=>[{stop:()=>stoppedTracks.push('stopped')}],getAudioTracks:()=>[{addEventListener(){}}]};
 let created=0;
 class FakeRecorder{
  static isTypeSupported(x){return x==='audio/mp4';}
  constructor(){created++;this.state='inactive';this.mimeType='audio/mp4';this.listeners={};}
  addEventListener(key,fn){(this.listeners[key] ||= []).push(fn);}
  dispatch(key,evt){for(const fn of this.listeners[key]||[])fn(evt);}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.dispatch('dataavailable',{data:new Blob(['audio data'],{type:'audio/mp4'})});this.dispatch('stop',{});}
 }
 const doc={getElementById:id=>controls[id]||null,querySelector:()=>recordBtn};
 const ctx={window:null,document:doc,data:{transcriptions:[],tasks:[],evidence:[],meetings:[]},vaultKey:true,isSecureContext:true,MediaRecorder:FakeRecorder,
  navigator:{mediaDevices:{getUserMedia:getUserMedia||(()=>Promise.resolve(stream))}},
  myYearArchived:()=>false,myActiveYear:()=>2026,myItems:()=>[],myAllowWrite:()=>true,
  today:()=> '2026-11-07',isoNow:()=> '2026-11-07T01:00:00.000Z',uid:p=>p+'-ABC12345',
  fmtBytes:n=>n+' bytes',queueSave:async()=>{},render:()=>{},toast:()=>{},
  URL,Blob,File,AbortController,setInterval,clearInterval,setTimeout,clearTimeout,console
 };
 ctx.window=ctx;vm.createContext(ctx);
 for(const file of ['modules/transcription/transcription-utils.js','modules/transcription/transcription.js'])vm.runInContext(readFileSync(file,'utf8'),ctx,{filename:file});
 return {ctx,controls,recordBtn,stream,stoppedTracks,getCreated:()=>created};
}
const tick=()=>new Promise(r=>setTimeout(r,20));

test('recording starts immediately in gesture and creates playable file after stop',async()=>{
 const {ctx,controls,recordBtn,getCreated}=createRecorderTest();
 assert.equal(ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-record'}}),true);
 assert.match(controls.transcriptStatus.textContent,/Meminta izin mikrofon/,'should request microphone synchronously from click');
 assert.match(controls.transcriptRecordIndicator.textContent,/Menunggu izin mikrofon/,'visible indicator must update at click');
 await tick();
 assert.equal(getCreated(),1);
 assert.match(controls.transcriptStatus.textContent,/Sedang merekam/);
 assert.equal(controls.transcriptRecordIndicator.dataset.state,'recording');
 assert.match(recordBtn.textContent,/Sedang merekam/);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-stop'}});
 await tick();
 assert.match(controls.transcriptStatus.textContent,/Rekaman selesai/);
 assert.match(controls.transcriptPreview.innerHTML,/<audio controls/);
 assert.match(controls.transcriptPreview.innerHTML,/Unduh rekaman/);
 assert.equal(recordBtn.textContent,'● Mulai rekam');
 assert.equal(controls.transcriptRecordIndicator.dataset.state,'idle');
});

test('permission denial gives actionable error and no fake active recorder',async()=>{
 const e=Object.assign(new Error('blocked'),{name:'NotAllowedError'});
 const {ctx,controls,getCreated}=createRecorderTest({getUserMedia:()=>Promise.reject(e)});
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-record'}});await tick();
 assert.match(controls.transcriptStatus.textContent,/Akses mikrofon ditolak/);
 assert.equal(controls.transcriptRecordIndicator.dataset.state,'idle');
 assert.equal(getCreated(),0);
});

test('late permission is revoked after secure lock and never starts audio recording',async()=>{
 let allow;
 const permission=new Promise(resolve=>{allow=resolve;});
 const {ctx,stream,stoppedTracks,getCreated}=createRecorderTest({getUserMedia:()=>permission});
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-record'}});
 ctx.SIPETAK_TRANSCRIPT.secureLock();
 allow(stream);await tick();
 assert.equal(getCreated(),0);
 assert.equal(stoppedTracks.length,1);
});
