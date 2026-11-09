import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
await import('../skp-bkn-core.js');
const bkn=globalThis.SIPETAK_BKN_CORE;
function fixture(){return {
 profile:{name:'Pegawai Uji',role:'Penelaah Teknis Kebijakan',unit:'Setwan'},
 rhks:[{id:'R1',performanceYear:2026,title:'Konsep telaahan kebijakan',catalogRhkId:'RHK-PTK-01',indicator:'Jumlah konsep',target:'12 konsep',status:'Dicatat sesuai SKP'},{id:'R2',performanceYear:2026,title:'Asistensi Sekwan',catalogRhkId:'RHK-AS-01',indicator:'Dokumen koordinasi',target:'Sesuai penugasan'}],
 tasks:[{id:'T1',date:'2026-11-08',status:'Selesai',title:'Bahan rapat',rhkId:'R1',output:'Dokumen',sourceNoteId:'N1'},{id:'T2',date:'2026-11-08',status:'Rencana',title:'Bahan rapat lama',rhkId:'R1',performanceYear:2025}],
 personalNotes:[{id:'N1',date:'2026-11-08',title:'Catatan hasil rapat',performanceYear:2026,classification:'Internal'},{id:'N2',date:'2026-11-08',title:'Sekwan menerima arahan',performanceYear:2026,classification:'Terbatas'}],
 evidence:[{id:'E1',date:'2026-11-08',title:'Metadata belum diperiksa',rhkId:'R1',sourceNoteId:'N1',verificationStatus:'Belum diperiksa',description:''},{id:'E2',date:'2026-11-08',title:'Bukti valid',rhkId:'R1',verificationStatus:'Terverifikasi',description:'Berita acara'}],
 sekwanBills:[{id:'SW1',performanceYear:2026,title:'Raperda penyelenggaraan XYZ',status:'Pembahasan'}],
};}
test('year isolation across all source types',()=>{const r=bkn.compute(fixture(),2026);assert.equal(r.rows.some(x=>x.id==='T2'),false);assert.equal(r.rows.length,6);});
test('same note and generated task count as one activity',()=>{const r=bkn.compute(fixture(),2026);const a=r.rhks.find(x=>x.rhk.id==='R1');assert.equal(a.workCount,1);assert.equal(a.completedCount,1);});
test('unverified evidence does not count as verified',()=>{const r=bkn.compute(fixture(),2026);const a=r.rhks[0];assert.equal(a.evidenceCount,2);assert.equal(a.checkedEvidenceCount,1);});
test('no automatic mapping of Asisten Sekwan by title',()=>{const r=bkn.compute(fixture(),2026);assert.ok(r.unmapped.some(x=>x.key==='sekwan:SW1'));});
test('manual mapping links Sekwan work to extra RHK',()=>{const v=fixture();v.skpBknLinks=[{year:2026,key:'sekwan:SW1',rhkId:'R2'}];assert.equal(bkn.compute(v,2026).rhks[1].workCount,1);});
test('mapping a note propagates to derivative when no existing RHK',()=>{const v=fixture();v.skpBknLinks=[{year:2026,key:'catatan:N2',rhkId:'R2'}];v.tasks.push({id:'D1',date:'2026-11-08',title:'Turunan dari catatan',sourceNoteId:'N2'});const r=bkn.compute(v,2026);assert.equal(r.rows.find(x=>x.id==='D1').mappedRhkId,'R2');assert.equal(r.rhks[1].workCount,1);});
test('manual correction overrides original task RHK without mutating task',()=>{const v=fixture();v.skpBknLinks=[{year:2026,key:'tugas:T1',rhkId:'R2'}];assert.equal(bkn.compute(v,2026).rows.find(x=>x.id==='T1').mappedRhkId,'R2');assert.equal(v.tasks[0].rhkId,'R1');});
test('manual blank mapping can unmap mistaken RHK',()=>{const v=fixture();v.skpBknLinks=[{year:2026,key:'tugas:T1',rhkId:''}];assert.equal(bkn.compute(v,2026).rows.find(x=>x.id==='T1').mappedRhkId,'');});
test('wrong year or unknown RHK cannot create silent mapping',()=>{const v=fixture();v.skpBknLinks=[{year:2026,key:'sekwan:SW1',rhkId:'NOPE'},{year:2027,key:'catatan:N2',rhkId:'R2'}];const r=bkn.compute(v,2026);assert.ok(r.unmapped.some(x=>x.id==='SW1'));assert.ok(r.unmapped.some(x=>x.id==='N2'));});
test('RHK main and extra sections remain distinct',()=>{const r=bkn.documentModel(fixture(),2026);assert.equal(r.sections[0].kind,'HASIL KERJA UTAMA');assert.equal(r.sections[1].kind,'HASIL KERJA TAMBAHAN');});
test('per RHK parent reference is respected',()=>{const v=fixture();v.skpBknRhkDetails=[{year:2026,rhkId:'R2',parentRhk:'Arahan pimpinan untuk layanan'}];const model=bkn.documentModel(v,2026);assert.equal(model.sections[1].parentRhk,'Arahan pimpinan untuk layanan');assert.equal(model.sections[0].parentRhk,'');});
test('profile defaults do not invent NIP/reviewer or official approval',()=>{const p=bkn.profile(fixture(),2026);assert.equal(p.name,'Pegawai Uji');assert.equal(p.nip,'');assert.equal(p.reviewer,'');assert.equal(p.behavior.length,7);});
test('invalid SKP period and NIP are rejected',()=>{assert.throws(()=>bkn.validateProfile({start:'2026-12-31',end:'2026-01-01'},2026));assert.throws(()=>bkn.validateProfile({start:'2026-01-01',end:'2026-12-31',nip:'12abc'},2026));});
test('printed export escapes HTML and redacts Terbatas title',()=>{const v=fixture();v.personalNotes[0].title='<script>alert(1)</script>';v.personalNotes[0].classification='Terbatas';v.skpBknLinks=[{year:2026,key:'catatan:N1',rhkId:'R1'}];const html=bkn.printableHTML(v,2026);assert.ok(html.includes('Materi Terbatas'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<script>alert(1)</script>'));});
test('export is a draft with evidence refs, not official grades',()=>{const html=bkn.printableHTML(fixture(),2026);assert.match(html,/BELUM DISEPAKATI/);assert.match(html,/Bukan skor SKP/);assert.match(html,/E1/);assert.match(html,/E2/);});
test('CSV rows preserve provenance IDs',()=>{const rows=bkn.csvRows(fixture(),2026);assert.ok(rows.some(x=>x.includes('tugas:T1')));});
test('integration points are present and original recorder remains included',async()=>{
 const app=await readFile(new URL('../app.js',import.meta.url),'utf8');const skp=await readFile(new URL('../skp-planner.js',import.meta.url),'utf8');const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
 assert.ok(app.includes('SIPETAK_BKN_UI?.action'));assert.ok(app.includes('SIPETAK_BKN_UI?.change'));assert.ok(app.includes('SIPETAK_BKN_UI?.submit'));assert.ok(skp.includes('SIPETAK_BKN_UI?.panel'));assert.ok(html.includes('skp-bkn-ui.js'));assert.ok(html.includes('combined-engine.js'));
});

test('Word RTF export uses valid header and escapes braces and Unicode',()=>{const v=fixture();v.personalNotes[0].title='Judul {berbahaya} \\ dan Rapat';v.skpBknLinks=[{year:2026,key:'catatan:N1',rhkId:'R1'}];const out=bkn.rtfDocument(v,2026);assert.ok(out.startsWith('{\\rtf1'));assert.ok(out.endsWith('}'));assert.ok(out.includes('\\{berbahaya\\}'));});
