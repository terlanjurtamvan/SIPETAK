import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('sekwan-desk.js','utf8');
const mapSource=fs.readFileSync('solo-workspace.js','utf8');
function harness({saveFailure=false}={}){
 let seq=0, rendered=0;
 const data={schema:3,tasks:[],directives:[],sekwanBills:[],sekwanContacts:[],sekwanVisitors:[]};
 const context={data,window:null,render(){rendered++},myActiveYear:()=>2026,myAllowWrite:()=>true,myItems:()=>[],today:()=> '2026-11-07',isoNow:()=> '2026-11-07T10:00:00.000Z',uid:p=>`${p}-U${++seq}`,queueSave:async()=>{if(saveFailure)throw Error('Tidak dapat ditulis')},toast:()=>{},confirm:()=>true,document:{querySelector:()=>null,querySelectorAll:()=>[]},structuredClone,Date,Error};
 context.window=context;vm.createContext(context);vm.runInContext(source,context);return {api:context.SIPETAK_SEKWAN,ctx:context,data,get renders(){return rendered}};
}
function form(id,kind,v){const submit={disabled:false};return {id, dataset:{kind},querySelector:()=>submit, __button:submit,...{}};}
function event(kind,input){const button={disabled:false},fields={id:'',...input};return {target:{id:`sw-form-${kind}`,dataset:{kind},querySelector:()=>button},formValues:fields,preventDefault(){this.prevented=true},button};}
function withFormData(fn){const Original=globalThis.FormData;globalThis.FormData=class{constructor(f){return Object.entries(f.__values||{});} };return Promise.resolve().then(fn).finally(()=>{globalThis.FormData=Original;});}
// Implement a FormData mock in VM, so event.target is processed without a real DOM.
async function submit(h,kind,v){const button={disabled:false};const target={id:`sw-form-${kind}`,dataset:{kind},__values:v,querySelector:()=>button};const event={target,preventDefault(){this.prevented=true}};h.ctx.FormData=class{constructor(f){return Object.entries(f.__values)}};const out=await h.api.save(event);assert.equal(out,true);assert.equal(event.prevented,true);return button;}

test('Peta Sekwan has clickable workflow nodes and separate destinations',()=>{
 const {api}=harness();const page=api.page();for(const keyword of ['Peta Operasional Asisten Sekwan','data-tab="raperda"','data-tab="tamu"','data-tab="kontak"','data-view="tugas"','data-view="laporan"','data-view="raperda"'])assert.ok(page.includes(keyword),keyword);
 assert.equal(api.showRegistry(),false);
});
test('Navigating to tracking renders actual form; saves Raperda and one followup task',async()=>{
 const h=harness();assert.equal(h.api.action({dataset:{action:'sw-tab',tab:'raperda'}}),true);assert.match(h.api.page(),/id="sw-form-raperda"/);
 await submit(h,'raperda',{title:'Raperda Uji',stage:'Pembahasan',number:'3/2026',nextAction:'Siapkan bahan rapat',autoTask:'yes',dueAt:'2026-11-20T10:00',pic:'Bidang Hukum'});
 assert.equal(h.data.sekwanBills.length,1);assert.equal(h.data.tasks.length,1);assert.equal(h.data.tasks[0].title,'Siapkan bahan rapat');assert.equal(h.data.sekwanBills[0].stage,'Pembahasan');
 // A second saved contact should not create an unrelated task.
 await submit(h,'kontak',{name:'Contoh',phone:'+6281234567890'});assert.equal(h.data.sekwanContacts.length,1);assert.equal(h.data.tasks.length,1);
});
test('Buku tamu is stored locally and can generate a draft task only when explicitly requested',async()=>{
 const h=harness();await submit(h,'tamu',{name:'Pengunjung',purpose:'Koordinasi',visitAt:'2026-11-07T11:30',nextAction:'Hubungi kembali',autoTask:'yes'});
 assert.equal(h.data.sekwanVisitors.length,1);assert.equal(h.data.tasks.length,1);assert.equal(h.data.tasks[0].status,'Rencana');
});
test('Invalid number and unsafe HTML are safely rejected or escaped',()=>{
 const h=harness();assert.equal(h.api.phoneURI('+62 812-345-67890'),'tel:+6281234567890');assert.equal(h.api.phoneURI('javascript:alert(1)'),'');
 assert.throws(()=>h.api.normalize('kontak',{name:'Uji',phone:'script:123'}));
 assert.throws(()=>h.api.normalize('raperda',{title:'',stage:'Pembahasan'}));
 h.data.sekwanContacts.push({id:'xx',name:'<img src=x onerror=alert(1)>',phone:'+6281234567890',role:'<svg>'});
 h.api.action({dataset:{action:'sw-tab',tab:'kontak'}});const page=h.api.page();assert.ok(page.includes('&lt;img'));assert.ok(!page.includes('<img src=x'));
});
test('Persistence failure restores state and avoids phantom task',async()=>{
 const h=harness({saveFailure:true});await submit(h,'raperda',{title:'Coba',stage:'Pembahasan',nextAction:'Bahan',autoTask:'yes'});assert.equal(h.data.sekwanBills.length,0);assert.equal(h.data.tasks.length,0);
});
test('Peta utama AS-IS and TO-BE are visually and structurally distinct and all link destinations are real',()=>{
 const h={window:null,render(){}};h.window=h;vm.createContext(h);vm.runInContext(mapSource,h);
 const asIs=h.SIPETAK_SOLO.mapPage();assert.match(asIs,/solo-accordions/);assert.match(asIs,/Saat Ini \(AS-IS\)/);assert.match(asIs,/data-view="sekretaris"/);
 h.SIPETAK_SOLO.action({dataset:{action:'solo-map-tab',tab:'to-be'}});
 const toBe=h.SIPETAK_SOLO.mapPage();assert.match(toBe,/solo-future-target/);assert.match(toBe,/BELUM AKTIF/);assert.doesNotMatch(toBe,/solo-accordions/);assert.notEqual(asIs,toBe);
});

test('Single visitor entry can also populate quick phonebook without duplicate phone number',async()=>{
 const h=harness();await submit(h,'tamu',{name:'Tamu A',purpose:'Koordinasi',visitAt:'2026-11-07T11:30',phone:'+6281234567890',autoContact:'yes'});
 assert.equal(h.data.sekwanVisitors.length,1);assert.equal(h.data.sekwanContacts.length,1);assert.equal(h.data.sekwanContacts[0].name,'Tamu A');
 await submit(h,'tamu',{name:'Tamu B',purpose:'Diskusi',visitAt:'2026-11-07T13:30',phone:'+6281234567890',autoContact:'yes'});
 assert.equal(h.data.sekwanVisitors.length,2);assert.equal(h.data.sekwanContacts.length,1);
});
test('Tracking Raperda in DIM route opens Sekwan tracker instead of a dead-end',()=>{
 const app=fs.readFileSync('app.js','utf8'),wf=fs.readFileSync('workflow.js','utf8');
 assert.match(wf,/data-action="sw-open" data-tab="raperda"/);assert.match(app,/SIPETAK_SEKWAN\?\.action\(el\)/);
 const h=harness();h.ctx.navigate=()=>{};assert.equal(h.api.action({dataset:{action:'sw-open',tab:'raperda'}}),true);assert.match(h.api.page(),/id="sw-form-raperda"/);
});
