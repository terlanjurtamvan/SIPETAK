'use strict';
/* Pure, testable helpers. Keep the outputs factual: no invented attendees, decisions, or speakers. */
(function(root){
 const MAX_AUDIO_BYTES=20*1024*1024,MAX_TEXT_CHARS=80000;
 const ALLOWED_EXT=new Set(['mp3','mp4','mpeg','mpga','m4a','wav','webm']);
 function extension(name){return String(name||'').split('.').pop().toLowerCase();}
 function validateAudio(file){
  if(!file||!Number.isFinite(file.size)||file.size<1)throw Error('Pilih rekaman audio yang tidak kosong.');
  if(file.size>MAX_AUDIO_BYTES)throw Error('Rekaman maksimal 20 MB. Kompres atau bagi rekaman sebelum dikirim.');
  if(!ALLOWED_EXT.has(extension(file.name)))throw Error('Format audio harus MP3, MP4, M4A, WAV, MPEG, MPGA, atau WEBM.');
  if(file.type && !(/^(audio\/|video\/mp4$|application\/octet-stream$)/i.test(file.type)))throw Error('Jenis isi berkas tidak dikenali sebagai audio.');
  return true;
 }
 function cleanText(text){return String(text||'').replace(/\r\n?/g,'\n').replace(/\u0000/g,'').trim();}
 function validateText(text){const s=cleanText(text);if(!s)throw Error('Transkrip belum berisi teks.');if(s.length>MAX_TEXT_CHARS)throw Error('Transkrip melebihi 80.000 karakter. Simpan rekaman dalam beberapa bagian.');return s;}
 function clips(text,max=7){return cleanText(text).split(/(?<=[.!?])\s+|\n+/u).map(s=>s.trim()).filter(Boolean).slice(0,max);}
 function outputs(title,text,date=''){
  const name=String(title||'Rekaman suara').trim().slice(0,160),full=validateText(text);
  const excerpts=clips(full,7);
  const lines=full.split(/\n+|(?<=[.!?])\s+/u).map(s=>s.trim()).filter(Boolean);
  const proposed=lines.filter(s=>/\b(tindak lanjut|ditugaskan|perlu|akan menyiapkan|diminta untuk|menugaskan)\b/i.test(s)).slice(0,12);
  const heading=`${name}${date?' · '+date:''}`;
  return {
   transcript:full,
   minutes:`KONSEP CATATAN / NOTULENSI RAPAT — BELUM DISAHKAN\nAgenda: ${heading}\nPeserta: [isi berdasarkan daftar hadir]\nPimpinan rapat: [verifikasi]\n\nCATATAN PEMBAHASAN (TRANSKRIP YANG DIPERIKSA)\n${full}\n\nRUMUSAN HASIL / KEPUTUSAN: [verifikasi terhadap hasil rapat resmi]\nTINDAK LANJUT / PIC / TENGGAT: [konfirmasi dalam rapat]\n\nCatatan: Tidak ada keputusan resmi yang dihasilkan otomatis.`,
   summary:`PETIKAN AWAL UNTUK BAHAN RINGKASAN — BUKAN RANGKUMAN AI\n${heading}\n\n${excerpts.map((v,i)=>`${i+1}. ${v}`).join('\n')}\n\nPeriksa keseluruhan transkrip sebelum menyusun kesimpulan.`,
   followup:`CALON TINDAK LANJUT — WAJIB KONFIRMASI\n${heading}\n\n${proposed.length?proposed.map((v,i)=>`${i+1}. ${v}`).join('\n'):'Belum ditemukan kalimat eksplisit tentang tindak lanjut. Tambahkan berdasarkan rapat yang telah diverifikasi.'}\n\nPIC dan tenggat belum ditetapkan oleh SIPETAK.`,
   evidence:`METADATA BAHAN BUKTI DUKUNG (BUKAN BUKTI RESMI)\nKegiatan: ${heading}\nBentuk: Transkrip/catatan hasil rekaman yang diperiksa\nStatus: Draf pribadi; perlu verifikasi dan pengesahan sesuai tata kerja instansi.`,
   taskTitle:`Menyiapkan dan memeriksa catatan ${name}`.slice(0,180)
  };
 }
 const api={MAX_AUDIO_BYTES,MAX_TEXT_CHARS,validateAudio,validateText,cleanText,outputs,extension};
 root.SIPETAK_TRANSCRIPT_UTILS=api;
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 })(typeof window!=='undefined'?window:globalThis);
