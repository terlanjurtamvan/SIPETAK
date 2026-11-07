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
 assert.match(html,/Transkripsi Suara & Notulensi/);
 assert.match(html,/Ubah rekaman menjadi teks/);
 assert.match(html,/id="transcriptRecordIndicator"/);
 assert.ok(html.indexOf('id="transcriptStatus"')<html.indexOf('id="transcriptPreview"'),'recording status must appear above preview and consent');
 assert.equal((html.match(/id="transcriptStatus"/g)||[]).length,1,'avoid duplicate status targets');
 assert.ok(!html.includes('<script>'));assert.ok(html.includes('Unggah rekaman'));
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
