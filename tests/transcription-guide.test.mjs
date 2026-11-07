import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const read=f=>readFileSync(f,'utf8');
test('Panduan Penggunaan includes 8-step record-to-print workflow and navigation',()=>{
 const ctx={window:null};ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(read('guide.js'),ctx,{filename:'guide.js'});
 const match=ctx.SIPETAK_GUIDE.topics.filter(x=>x.id==='rekam-cetak');
 assert.equal(match.length,1);
 assert.equal(match[0].page,'transkripsi');
 const html=ctx.SIPETAK_GUIDE.page();
 for(const phrase of ['Transkripsi Suara','Cetak / PDF Notulen','Cetak / PDF Risalah','Simpan sebagai PDF','Unduh rekaman WAV','pop-up','KONSEP'])
   assert.ok(html.includes(phrase),`missing guide: ${phrase}`);
 assert.match(html,/data-view="transkripsi"/);
});

test('Transcription page contains functional in-app guide and print troubleshooting',()=>{
 const source=read('modules/transcription/transcription.js');
 const fragment=source.slice(source.indexOf(' function page(){'),source.indexOf(' function load('));
 assert.match(fragment,/id="transcriptUsageGuide"/);
 assert.match(fragment,/8 langkah/);
 assert.match(fragment,/data-action="navigate" data-view="panduan"/);
 assert.match(fragment,/data-action="transcript-formal-print" data-kind="notulen"/);
 assert.match(fragment,/data-action="transcript-formal-print" data-kind="risalah"/);
 assert.match(fragment,/pilih <b>Printer<\/b> atau <b>Save as PDF/);
 assert.match(fragment,/Audio dan Teks/);
});

test('Print guidance matches real print handler, printable A4 draft and Word fallback',()=>{
 const transcript=read('modules/transcription/transcription.js');
 const doc=read('modules/transcription/formal-documents.js');
 const guide=read('docs/PANDUAN-TRANSKRIPSI-SAMPAI-CETAK-3.12.5.md');
 assert.match(transcript,/function printFormal\(which\)/);
 assert.match(transcript,/window\.open\('about:blank','_blank'\)/);
 assert.match(transcript,/popup\.print\(\)/);
 assert.match(transcript,/function exportFormalWord\(which\)/);
 assert.match(doc,/@page\{size:A4/);
 assert.match(doc,/KONSEP — BELUM DIPERIKSA \/ BELUM DISAHKAN/);
 assert.match(guide,/Ctrl\+P/);
 assert.match(guide,/⌘P/);
 assert.match(guide,/tercatat.*di luar brankas|di luar brankas/);
});
