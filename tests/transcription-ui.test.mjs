import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
function build(){
 const controls={
  transcriptTitle:{value:'Rapat tentang <script> Raperda'},
  transcriptText:{value:'Pimpinan membuka rapat. Sekretariat perlu menyiapkan bahan.',checked:false},
  transcriptClass:{value:'Internal'}, transcriptConsent:{checked:false},
  transcriptVerified:{checked:true}, transcriptMeeting:{value:''},
  transcriptStatus:{textContent:'',style:{color:''}}, transcriptOutput:{innerHTML:''}
 };
 const doc={getElementById:id=>controls[id]||null};
 const data={transcriptions:[],tasks:[],evidence:[],meetings:[]};let saves=0;
 const ctx={window:null,document:doc,data,vaultKey:true,
  myYearArchived:()=>false,myActiveYear:()=>2026,myItems:name=>data[name]||[],myAllowWrite:()=>true,
  today:()=> '2026-11-07',isoNow:()=> '2026-11-07T01:00:00.000Z',uid:p=>p+'-ABC12345',
  fmtBytes:n=>n+' bytes',queueSave:async()=>{saves++;},render:()=>{},toast:()=>{},
  wfAudit:()=>{},confirm:()=>true,lcAutoRegister:async()=>{},
  setTimeout,clearTimeout,console,navigator:{},AbortController,
  URL,Blob,File,FormData,fetch:()=>{throw Error('must not fetch in a local-only test');}
 };
 ctx.window=ctx;vm.createContext(ctx);
 for(const name of ['quick-entry.js','modules/transcription/transcription-utils.js','modules/transcription/transcription.js'])vm.runInContext(readFileSync(name,'utf8'),ctx,{filename:name});
 return {ctx,controls,data,getSaves:()=>saves};
}
const tick=()=>new Promise(r=>setTimeout(r,15));
test('module renders a navigation page without unescaped title and stores editable draft',async()=>{
 const {ctx,controls,data,getSaves}=build();
 const html=ctx.SIPETAK_TRANSCRIPT.page();
 assert.match(html,/Rekam \+ Tulis Langsung/);
 assert.match(html,/Mulai Rekam \+ Tulis Langsung/);
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('unggah rekaman'));assert.ok(!html.includes('Periksa kesiapan server'));
 assert.equal(ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-save'}}),true);
 await tick();
 assert.equal(getSaves(),1);assert.equal(data.transcriptions.length,1);
 assert.equal(data.transcriptions[0].title,'Rapat tentang <script> Raperda');
 assert.equal(data.transcriptions[0].text,controls.transcriptText.value);
 assert.equal(data.transcriptions[0].performanceYear,2026);
});
test('one confirmed transcript yields linked task and evidence metadata, never auto official',async()=>{
 const {ctx,data}=build();
 ctx.SIPETAK_TRANSCRIPT.page();
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-save'}});await tick();
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-create-task'}});await tick();
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-create-evidence'}});await tick();
 assert.equal(data.tasks.length,1);assert.equal(data.tasks[0].status,'Proses');
 assert.equal(data.tasks[0].transcriptionId,data.transcriptions[0].id);
 assert.equal(data.evidence.length,1);assert.equal(data.evidence[0].file,null);
 assert.match(data.evidence[0].description,/BUKAN BUKTI RESMI/);
 assert.equal(data.evidence[0].transcriptionId,data.transcriptions[0].id);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-create-task'}});await tick();
 assert.equal(data.tasks.length,1,'cannot duplicate tasks for same transcript');
});
test('UI preview safely escapes user text instead of inserting as executable HTML',async()=>{
 const {ctx,controls}=build();ctx.SIPETAK_TRANSCRIPT.page();
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-output',kind:'minutes'}});
 await tick();
 assert.match(controls.transcriptOutput.innerHTML,/&lt;script&gt;/);
 assert.ok(!controls.transcriptOutput.innerHTML.includes('<script>'));
 ctx.SIPETAK_TRANSCRIPT.secureLock();
});
test('one tap starts WAV recording and live text in the same draft without auto saving',async()=>{
 const {ctx,controls,data,getSaves}=build();
 controls.transcriptConsent.checked=true;ctx.navigator.onLine=true;
 let recorderStopped=false,streamSeen=false;
 ctx.SIPETAK_SB_AI_TOKEN=async()=> 'b'.repeat(40);
 ctx.SIPETAK_RECORDER={start:async()=>({mode:'wav',stream:{getAudioTracks:()=>[{kind:'audio'}]},stop:async()=>{recorderStopped=true;return new ctx.File([new Uint8Array(512)],'rekaman-test.wav',{type:'audio/wav'});},abort:()=>{}})};
 ctx.SIPETAK_LIVE_ENGINE={create:({onText})=>({
  connect:async({stream,classification})=>{streamSeen=stream.getAudioTracks().length===1&&classification==='Internal';onText('Rapat sudah dimulai');},
  stop:async()=>'',abort:()=>{}
 })};
 assert.match(ctx.SIPETAK_TRANSCRIPT.page(),/Mulai Rekam \+ Tulis Langsung/);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-live'}});await new Promise(r=>setTimeout(r,25));
 assert.equal(streamSeen,true);
 assert.match(controls.transcriptText.value,/Rapat sudah dimulai/);
 assert.equal(getSaves(),0,'Live text must not silently be saved to the vault');
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-stop'}});
 await new Promise(r=>setTimeout(r,35));
 assert.equal(recorderStopped,true);
 assert.equal(data.transcriptions.length,0,'Still needs verification and explicit save');
 ctx.SIPETAK_TRANSCRIPT.secureLock();
});

test('offline backend readiness never pretends that recording audio is live transcription',async()=>{
 const {ctx,controls,getSaves}=build();ctx.navigator.onLine=true;controls.transcriptConsent.checked=true;
 let stopped=false,liveCalls=0;
 ctx.SIPETAK_SB_AI_TOKEN=async()=> 'b'.repeat(40);
 ctx.SIPETAK_RECORDER={start:async()=>({mode:'wav',stream:{getAudioTracks:()=>[{kind:'audio'}]},stop:async()=>{stopped=true;return new ctx.File([new Uint8Array(512)],'rekaman.wav',{type:'audio/wav'});},abort:()=>{}})};
 ctx.SIPETAK_LIVE_ENGINE={create:()=>{liveCalls++;return {connect:async()=>{},abort:()=>{},stop:async()=>{}};}};
 ctx.SIPETAK_TRANSCRIBE_SERVICE={check:async()=>({live:{ready:false,reason:'not-enabled'},upload:{ready:false,reason:'not-enabled'}}),statusMessage:()=> 'TRANSCRIBE_LIVE_ENABLED belum diaktifkan'};
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-live'}});
 await new Promise(r=>setTimeout(r,25));
 assert.equal(liveCalls,0,'Do not attempt realtime connection when disabled');
 assert.match(controls.transcriptStatus.textContent,/Audio lokal tetap direkam, tetapi teks belum tersedia/);
 assert.equal(getSaves(),0);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-stop'}});await new Promise(r=>setTimeout(r,40));
 assert.equal(stopped,true);
 ctx.SIPETAK_TRANSCRIPT.secureLock();
});


test('one primary button records WAV and writes interim text before Stop; WAV remains downloadable',async()=>{
 const {ctx,controls,data,getSaves}=build();
 controls.transcriptConsent.checked=true;
 controls.transcriptPreview={innerHTML:'',querySelector:()=>null};
 controls.transcriptLiveBanner={textContent:'',classList:{toggle(){}}};
 controls.transcriptAudioIndicator={textContent:''};
 controls.transcriptTextIndicator={textContent:''};
 let received=false,stopped=false,speechCall,engineUsed=0;
 ctx.SIPETAK_COMBINED_ENGINE={supported:()=>true,start:function({onText,onFinished,onState}){
   engineUsed++; speechCall=onText;
   onState('audio-ready');
   return {ready:Promise.resolve({}),stop:async()=>{
     stopped=true;
     const file=new ctx.File([new Uint8Array(4096)],'rapat.wav',{type:'audio/wav'});
     onFinished(file,null);
     return file;
   },abort:()=>{}};
 }};
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-combined'}});await tick();
 assert.equal(engineUsed,1);
 speechCall('Rapat pembahasan telah dimulai');
 assert.equal(controls.transcriptText.value,'Pimpinan membuka rapat. Sekretariat perlu menyiapkan bahan.\n\nRapat pembahasan telah dimulai');
 assert.match(controls.transcriptTextIndicator.textContent,/tertulis/);
 assert.equal(getSaves(),0);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-stop'}});await tick();
 assert.equal(stopped,true);
 assert.match(controls.transcriptPreview.innerHTML,/download=/);
 assert.match(controls.transcriptPreview.innerHTML,/rapat.wav/);
 assert.equal(data.transcriptions.length,0,'transcript still needs review and explicit save');
});

test('combined mode refuses restricted material and missing consent without opening microphone',async()=>{
 for(const kind of ['Terbatas','tanpa izin']){
  const {ctx,controls}=build();
  let calls=0;controls.transcriptConsent.checked=kind==='Terbatas';
  controls.transcriptClass.value=kind==='Terbatas'?'Terbatas':'Internal';
  ctx.SIPETAK_COMBINED_ENGINE={supported:()=>true,start:()=>{calls++;throw Error('must not call');}};
  ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-combined'}});
  await tick();
  assert.equal(calls,0);
  assert.match(controls.transcriptStatus.textContent,kind==='Terbatas'?/Terbatas/:/Centang izin/);
 }
});
