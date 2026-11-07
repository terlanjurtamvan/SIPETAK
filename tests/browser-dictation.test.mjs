import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function setup({classification='Internal',consent=true,support=true}={}){
 const nodes={
  transcriptTitle:{value:'Rapat kerja'},transcriptText:{value:'Pembukaan rapat.'},
  transcriptClass:{value:classification},transcriptConsent:{checked:consent},
  transcriptVerified:{checked:true,disabled:false},transcriptMeeting:{value:''},
  transcriptStatus:{textContent:'',style:{}},transcriptLiveBanner:{textContent:'',classList:{toggle(){}}}
 };
 const buttons={'transcript-dictate':{textContent:'',setAttribute(){}},'transcript-save':{disabled:false}};
 const doc={getElementById:key=>nodes[key]||null,querySelector:selector=>buttons[selector.match(/data-action="([^"]+)"/)?.[1]]||null};
 const dat={transcriptions:[],meetings:[],tasks:[],evidence:[]};
 let saves=0,instances=[];
 class BrowserSpeech{
  constructor(){this.started=0;this.stopped=0;instances.push(this);}
  start(){this.started++;this.onstart?.();}
  stop(){this.stopped++;this.onend?.();}
  fire(transcript,isFinal=false){const results=[[{transcript}]];results[0].isFinal=isFinal;this.onresult?.({resultIndex:0,results});}
 }
 const c={window:null,document:doc,data:dat,vaultKey:true,
  myYearArchived:()=>false,myActiveYear:()=>2026,myItems:()=>[],myAllowWrite:()=>true,
  today:()=> '2026-11-07',isoNow:()=> '2026-11-07T08:00:00Z',uid:()=> 'ABC',
  fmtBytes:x=>x+'B',queueSave:async()=>{saves++;},render:()=>{},toast:()=>{},
  confirm:()=>true,wfAudit:()=>{},lcAutoRegister:async()=>{},
  navigator:{onLine:true},URL,Blob,File,FormData,AbortController,console,
  setTimeout,clearTimeout,fetch:()=>{throw Error('NO HTTP REQUEST ALLOWED');}
 };
 if(support)c.webkitSpeechRecognition=BrowserSpeech;
 c.window=c;vm.createContext(c);
 for(const name of ['quick-entry.js','modules/transcription/transcription-utils.js','modules/transcription/transcription.js'])vm.runInContext(readFileSync(name,'utf8'),c,{filename:name});
 return {c,dat,nodes,buttons,instances,saves:()=>saves};
}
const action=(c,name)=>c.SIPETAK_TRANSCRIPT.action({dataset:{action:name}});

test('one tap uses native browser recognizer instead of Cloudflare; interim text appears and is not auto saved',()=>{
 const {c,dat,nodes,instances,saves}=setup();
 assert.match(c.SIPETAK_TRANSCRIPT.page(),/Mulai Rekam \+ Tulis Langsung/);assert.match(c.SIPETAK_TRANSCRIPT.page(),/Dikte saja/);
 action(c,'transcript-dictate');
 assert.equal(instances.length,1);
 assert.equal(instances[0].lang,'id-ID');
 instances[0].fire('Selamat pagi',false);
 assert.equal(nodes.transcriptText.value,'Pembukaan rapat. Selamat pagi');
 instances[0].fire('Selamat pagi semuanya',true);
 assert.equal(nodes.transcriptText.value,'Pembukaan rapat. Selamat pagi semuanya');
 assert.equal(saves(),0);
 action(c,'transcript-stop');
 assert.equal(instances[0].stopped,1);
 assert.equal(dat.transcriptions.length,0);
 assert.equal(nodes.transcriptText.value,'Pembukaan rapat. Selamat pagi semuanya');
});

test('restarting dictation appends new speech instead of replacing existing words',()=>{
 const {c,nodes,instances}=setup();
 action(c,'transcript-dictate');instances[0].fire('Agenda pertama',true);
 action(c,'transcript-stop');
 action(c,'transcript-dictate');instances[1].fire('Agenda kedua',true);
 assert.equal(nodes.transcriptText.value,'Pembukaan rapat. Agenda pertama Agenda kedua');
 action(c,'transcript-stop');
});

test('consent required and restricted material never handed to browser speech recognition',()=>{
 for(const options of [{consent:false},{classification:'Terbatas'}]){
  const {c,nodes,instances}=setup(options);action(c,'transcript-dictate');
  assert.equal(instances.length,0);
  assert.match(nodes.transcriptStatus.textContent,options.consent===false?/Centang izin/:/Terbatas/);
 }
});

test('unsupported browser shows iPhone keyboard microphone fallback, not fake success',()=>{
 const {c,nodes}=setup({support:false});action(c,'transcript-dictate');
 assert.match(nodes.transcriptStatus.textContent,/mikrofon pada keyboard iPhone/);
 assert.equal(nodes.transcriptText.value,'Pembukaan rapat.');
});

test('browser error shows actionable guidance, never server activation message',()=>{
 const {c,nodes,instances}=setup();action(c,'transcript-dictate');
 instances[0].onerror({error:'not-allowed'});
 instances[0].onend();
 assert.match(nodes.transcriptStatus.textContent,/Izin mikrofon ditolak/);
 assert.doesNotMatch(nodes.transcriptStatus.textContent,/Cloudflare|TRANSCRIBE_LIVE_ENABLED/);
});
