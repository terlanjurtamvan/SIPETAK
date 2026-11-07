import test from 'node:test';
import assert from 'node:assert/strict';
import '../modules/transcription/transcription-utils.js';
const U=globalThis.SIPETAK_TRANSCRIPT_UTILS;
const file=(name,size=100,type='audio/mp4')=>({name,size,type});
test('accepts iPhone M4A / Safari MP4 / desktop WAV and WEBM',()=>{
 for(const name of ['rapat.m4a','rekaman.mp4','tes.wav','rekaman.webm','memo.mp3'])assert.equal(U.validateAudio(file(name)),true);
});
test('rejects empty, oversize or unsupported file',()=>{
 assert.throws(()=>U.validateAudio(file('x.mp3',0)),/kosong/);
 assert.throws(()=>U.validateAudio(file('x.mp3',U.MAX_AUDIO_BYTES+1)),/20 MB/);
 assert.throws(()=>U.validateAudio(file('kode.exe')),/Format audio/);
});
test('notulensi creates draft without inventing decisions, names or PIC',()=>{
 const x=U.outputs('Rapat Pansus','Ketua menyampaikan agenda. Sekretariat perlu menyiapkan bahan.', '2026-11-07');
 assert.match(x.minutes,/BELUM DISAHKAN/);assert.match(x.minutes,/\[verifikasi\]/);assert.match(x.minutes,/Ketua menyampaikan agenda/);
 assert.match(x.followup,/Sekretariat perlu menyiapkan bahan/);assert.match(x.evidence,/BUKAN BUKTI RESMI/);
 assert.ok(!x.minutes.includes('Keputusan: disetujui'));
});
test('normalizes plain text safely; preview must be HTML escaped in browser',()=>{
 assert.equal(U.cleanText('abc\r\ndef\u0000'),'abc\ndef');
 assert.throws(()=>U.validateText(''),/belum berisi/);
 assert.throws(()=>U.validateText('a'.repeat(80001)),/80.000/);
 const x=U.outputs('<script>','<img src=x onerror=alert(1)>');assert.match(x.minutes,/<img src=x/); // unchanged data, no execution
});
