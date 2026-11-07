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
 for(const name of ['quick-entry.js','modules/transcription/transcription-utils.js','modules/transcription/formal-documents.js','modules/transcription/transcription.js'])vm.runInContext(readFileSync(name,'utf8'),ctx,{filename:name});
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
 assert.equal(data.transcriptions.length,1,'Unverified text is backed up to encrypted vault');
 assert.equal(data.transcriptions[0].verifiedAt,null,'Auto-backup must never become a confirmed transcript');
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
 assert.equal(data.transcriptions.length,1,'transcript text should be recoverable as encrypted provisional draft');
 assert.equal(data.transcriptions[0].verifiedAt,null,'draft backup is not a verified official record');
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

test('formal document actions create editable Word and printable concepts from the same transcript',async()=>{
 const {ctx,controls}=build();
 const downloads=[];ctx.blobDownload=(name,body,type)=>downloads.push({name,body,type});
 controls.transcriptTitle.value='Rapat test1';controls.transcriptText.value='uji merekam sambil mengetik langsung';
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-formal-preview',kind:'notulen'}});await tick();
 assert.match(controls.transcriptOutput.innerHTML,/NOTULEN RAPAT/);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-formal-preview',kind:'risalah'}});await tick();
 assert.match(controls.transcriptOutput.innerHTML,/RISALAH RAPAT/);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-formal-word',kind:'notulen'}});await tick();
 assert.equal(downloads.length,1);assert.match(downloads[0].name,/SIPETAK-Notulen-Rapat-test1\.doc/);
 assert.match(downloads[0].body,/KONSEP/);
 assert.equal(downloads[0].type,'application/msword;charset=utf-8');
});

test('formal details are saved with transcript without replacing old encrypted vault schema',async()=>{
 const {ctx,controls,data}=build();
 controls.formal_chair={value:'Ketua Rapat Verifikasi'};
 controls.formal_date={value:'2026-11-07'};
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-save'}});await tick();
 assert.equal(data.transcriptions[0].formalDetails.chair,'Ketua Rapat Verifikasi');
 assert.equal(data.transcriptions[0].formalDetails.date,'2026-11-07');
 assert.ok(!('audio' in data.transcriptions[0]));
});


test('automatic draft backup cannot be linked to a meeting before explicit verification',async()=>{
 const {ctx,controls,data}=build();
 controls.transcriptConsent.checked=true;
 controls.transcriptPreview={innerHTML:'',querySelector:()=>null};
 controls.transcriptAudioIndicator={textContent:''};
 controls.transcriptTextIndicator={textContent:''};
 ctx.SIPETAK_COMBINED_ENGINE={supported:()=>true,start:({onText,onFinished})=>{
  onText('Draf rapat yang belum diperiksa');
  return {ready:Promise.resolve({}),stop:async()=>{const f=new ctx.File([new Uint8Array(4096)],'draf.wav',{type:'audio/wav'});onFinished(f,null);return f;},abort:()=>{}};
 }};
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-combined'}});await tick();
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-stop'}});await tick();
 assert.equal(data.transcriptions.length,1);
 assert.equal(data.transcriptions[0].verifiedAt,null);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-create-task'}});await tick();
 assert.equal(data.tasks.length,0);
 assert.match(controls.transcriptStatus.textContent,/Periksa teks dan centang konfirmasi/);
 ctx.SIPETAK_TRANSCRIPT.secureLock();
});

test('navigation away from active microphone can be cancelled to preserve recording',async()=>{
 const {ctx,controls}=build();controls.transcriptConsent.checked=true;
 ctx.confirm=()=>false;
 let aborts=0;
 ctx.SIPETAK_COMBINED_ENGINE={supported:()=>true,start:()=>({ready:Promise.resolve({}),stop:async()=>null,abort:()=>{aborts++;}})};
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-combined'}});await tick();
 assert.equal(ctx.SIPETAK_TRANSCRIPT.leave(),false);
 assert.equal(aborts,0,'No audio should be discarded after cancelling navigation');
 ctx.confirm=()=>true;
 assert.equal(ctx.SIPETAK_TRANSCRIPT.leave(),true);
 assert.equal(aborts,1);
});

test('speaker/time annotation during a combined recording is stored with the encrypted transcript and shown in Risalah',async()=>{
 const {ctx,controls,data}=build();
 controls.transcriptConsent.checked=true;
 controls.transcriptSpeakerMarkers={innerHTML:''};
 ctx.SIPETAK_COMBINED_ENGINE={supported:()=>true,start:({onText,onFinished})=>{
  onText('Pimpinan membuka rapat');
  return {ready:Promise.resolve({}),stop:async()=>{
   const wav=new ctx.File([new Uint8Array(4096)],'uji.wav',{type:'audio/wav'});
   onFinished(wav,null);
   return wav;
  },abort:()=>{}};
 }};
 assert.match(ctx.SIPETAK_TRANSCRIPT.page(),/Penanda Pembicara & Waktu/);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-combined'}});
 await tick();
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-marker',speaker:'Ketua Rapat'}});
 await tick();
 assert.match(controls.transcriptSpeakerMarkers.innerHTML,/Ketua Rapat/);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-stop'}});
 await tick();
 assert.equal(data.transcriptions.length,1);
 assert.equal(data.transcriptions[0].speakerMarkers.length,1);
 assert.equal(data.transcriptions[0].speakerMarkers[0].speaker,'Ketua Rapat');
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-formal-preview',kind:'risalah'}});
 await tick();
 assert.match(controls.transcriptOutput.innerHTML,/Ketua Rapat/);
 assert.match(controls.transcriptOutput.innerHTML,/PENANDA/);
 ctx.SIPETAK_TRANSCRIPT.secureLock();
});

test('marker cannot be added without an active recording',async()=>{
 const {ctx,controls}=build();
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-marker',speaker:'Ketua Rapat'}});
 await tick();
 assert.match(controls.transcriptStatus.textContent,/Mulai rekaman dahulu/);
});

test('idle screenshot regression: explains consent and disables stop + markers before recording',async()=>{
 const {ctx,controls}=build();
 const html=ctx.SIPETAK_TRANSCRIPT.page();
 assert.match(html,/Langkah 1: centang izin merekam/);
 assert.match(html,/data-action="transcript-stop" disabled/);
 assert.match(html,/data-action="transcript-marker" data-speaker="Ketua Rapat" disabled/);
 assert.match(html,/Tombol penanda aktif setelah rekaman benar-benar dimulai/);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-marker',speaker:'Ketua Rapat'}});
 assert.match(controls.transcriptStatus.textContent,/Mulai rekaman dahulu/);
 assert.equal(controls.transcriptStatus.style.color,'','Idle guidance must not appear as a red error');
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-combined'}});
 assert.match(controls.transcriptStatus.textContent,/Centang izin perekaman/);
 assert.equal(controls.transcriptStatus.style.color,'','Consent is a normal first-time setup step');
 ctx.SIPETAK_TRANSCRIPT.secureLock();
});

test('consent grants startup and marker buttons turn active only while recording',async()=>{
 const {ctx,controls}=build();ctx.SIPETAK_TRANSCRIPT.page();
 let markerEnabled=null,recordStopped=false;
 const start={disabled:false,textContent:''},stop={disabled:true,textContent:''};
 const speaker={disabled:true},nameButton={disabled:true},timeButton={disabled:true};
 const markerCustom={disabled:true},markerHint={textContent:''};
 const help={textContent:''},wrap={classList:{toggle(){},add(){}}};
 Object.assign(controls, {transcriptCustomSpeaker:markerCustom,transcriptMarkerHint:markerHint,transcriptStartHelp:help,transcriptConsentWrap:wrap,transcriptSpeakerMarkers:{innerHTML:''}});
 ctx.document.querySelector=(sel)=>sel.includes('transcript-combined')?start:sel.includes('transcript-stop')?stop:null;
 ctx.document.querySelectorAll=()=>[speaker,nameButton,timeButton];
 ctx.SIPETAK_COMBINED_ENGINE={supported:()=>true,start:({onFinished})=>({ready:Promise.resolve(),stop:async()=>{
  recordStopped=true;onFinished(new ctx.File([new Uint8Array(1024)],'hasil.wav',{type:'audio/wav'}),null);
 },abort:()=>{}})};
 ctx.SIPETAK_TRANSCRIPT.change({target:{id:'transcriptConsent',checked:true}}); // first update from checkbox is controlled by DOM
 controls.transcriptConsent.checked=true;
 ctx.SIPETAK_TRANSCRIPT.change({target:{id:'transcriptConsent',checked:true}});
 assert.match(help.textContent,/Izin sudah dicentang/);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-combined'}});await tick();
 assert.equal(start.disabled,true);assert.equal(stop.disabled,false);
 assert.equal(speaker.disabled,false);assert.equal(nameButton.disabled,false);assert.equal(markerCustom.disabled,false);
 assert.match(markerHint.textContent,/Rekaman aktif/);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-marker',speaker:'Ketua Rapat'}});
 assert.match(controls.transcriptSpeakerMarkers.innerHTML,/Ketua Rapat/);
 ctx.SIPETAK_TRANSCRIPT.action({dataset:{action:'transcript-stop'}});await tick();
 assert.equal(recordStopped,true);assert.equal(stop.disabled,true);assert.equal(speaker.disabled,true);assert.equal(markerCustom.disabled,true);
 ctx.SIPETAK_TRANSCRIPT.secureLock();
});
