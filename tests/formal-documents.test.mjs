import test from 'node:test';
import assert from 'node:assert/strict';
import '../modules/transcription/formal-documents.js';
const F=globalThis.SIPETAK_FORMAL_DOCS;
const input={title:'Rapat test1',transcript:'kita coba Apakah bisa merekam sambil mengetik langsung kalau bisa berarti berhasil ternyata di Chrome bisa di Firefox tidak bisa Oke terima kasih kasih',classification:'Internal',details:{date:'2026-11-07',chair:'',place:'',summary:'Uji coba perekaman dan transkripsi di Chrome dan Firefox.'}};
test('makes notulen and risalah from one input without invented participants/decisions',()=>{
 const n=F.makeText('notulen',input),r=F.makeText('risalah',input);
 assert.match(n,/NOTULEN RAPAT/);assert.match(r,/RISALAH RAPAT/);
 assert.match(n,/Sabtu, 7 November 2026/);assert.match(n,/Uji coba perekaman/);
 assert.match(r,/ternyata di Chrome bisa di Firefox tidak bisa/);
 assert.match(r,/\[perlu verifikasi/);assert.match(n,/\[Belum dicatat/);
 assert.ok(!n.includes('Keputusan: disetujui'));
});
test('escapes untrusted transcript and headers for HTML print and Word exports',()=>{
 const h=F.makeHtml('risalah',{...input,title:'Rapat <script>alert(1)</script>',transcript:'<img src=x onerror=alert(1)> & kata',details:{chair:'<svg onload=alert(1)>'}});
 assert.ok(h.includes('&lt;script&gt;'));assert.ok(h.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!h.includes('<script>'));assert.ok(!h.includes('<img '));assert.ok(!h.includes('<svg '));
 assert.match(h,/@page\{size:A4/);assert.match(h,/BELUM DIPERIKSA/);
});
test('rejects empty, unknown document kind and excessive transcripts',()=>{
 assert.throws(()=>F.makeText('risalah',{...input,transcript:''}),/kosong/);
 assert.throws(()=>F.makeText('decision',input),/tidak dikenal/);
 assert.throws(()=>F.makeText('notulen',{...input,transcript:'a'.repeat(80001)}),/80.000/);
});
test('manual, confirmed decisions may appear but are not automatically generated',()=>{
 const n=F.makeText('notulen',{...input,details:{decisions:'Perbaikan pencatatan disetujui oleh pimpinan setelah verifikasi.'}});
 assert.match(n,/Perbaikan pencatatan disetujui/);
 assert.ok(!n.includes('[Belum dicatat — wajib dikonfirmasi kepada pimpinan rapat.]'));
});

test('adds sidang metadata and manually selected speaking-time markers without inventing diarization',()=>{
 const input2={...input,details:{...input.details,sessionYear:'2026',sessionPeriod:'Masa Persidangan I',meetingNumber:'3',agenda:'Pembahasan Raperda'},markers:[{session:1,seconds:72,speaker:'Ketua Rapat'},{session:1,seconds:83,speaker:'Sekretaris / Setwan'}]};
 const risalah=F.makeText('risalah',input2),notulen=F.makeText('notulen',input2);
 assert.match(risalah,/Masa Persidangan I/);assert.match(notulen,/Pembahasan Raperda/);
 assert.match(risalah,/Sesi 1 · 00:01:12 · Ketua Rapat \(ditandai manual\)/);
 assert.match(risalah,/bukan pengenalan identitas otomatis/i);
 assert.match(notulen,/PENANDA PEMBICARA DAN WAKTU \(MANUAL\)/);
});
test('manual labels are bounded and escaped; legacy records with no markers still export',()=>{
 const h=F.makeHtml('risalah',{...input,markers:[{session:-1,seconds:-10,speaker:'<img src=x onerror=alert(1)>'}]});
 assert.ok(h.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert.ok(!h.includes('<img '));
 assert.match(F.makeText('risalah',input),/Belum ada penanda pembicara manual/);
 const m=F.sanitizeMarkers([{session:5,seconds:59,speaker:'abc'},null,{}, {speaker:'x'.repeat(1000)}]);
 assert.equal(m.length,2);assert.equal(m[1].speaker.length,90);
});
