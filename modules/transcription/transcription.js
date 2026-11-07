'use strict';
/* SIPETAK Transkripsi: non-destructive feature module. No raw audio is stored in the vault. */
(function(root){
 const U=root.SIPETAK_TRANSCRIPT_UTILS;
 const F=root.SIPETAK_FORMAL_DOCS;
 const emptyFormal=()=>({date:(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');})(),meetingType:'Rapat',sessionYear:'',sessionPeriod:'',meetingNumber:'',agenda:'',nature:'',place:'',startTime:'',endTime:'',chair:'',secretary:'',notulis:'',attendees:'',invitees:'',summary:'',decisions:'',followup:'',signPlace:''});
 let formalDetails=emptyFormal();
 let speakerMarkers=[],speakerSession=0,recordClockStart=0;
 const allowedClass=['Umum','Internal','Terbatas'];
 let draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};
 let audioFile=null,audioUrl='',recorder=null,recordStarting=false,recordStopping=false,working=false,controller=null;
 let recognition=null,speechBase='',speechCommitted='',speechResults=[],dictationWanted=false,dictationRetryTimer=null,dictationRestarts=0,dictationHadResults=false,dictationLastError='',discardOnStop=false,recorderEpoch=0;
 let liveHandle=null,liveStarting=false,liveBaseText='',liveConnected=false,liveTimer=null;
 let combinedHandle=null,combinedStarting=false,combinedStopping=false,combinedHadText=false,combinedMuted=false,combinedProblem='',combinedEpoch=0;
 let autosaveTimer=null, autosaveBusy=false, autosaveAgain=false, audioDownloadAttempted=false;
 function indicators(audio,text){if(audio&&el('transcriptAudioIndicator'))el('transcriptAudioIndicator').textContent='Audio: '+audio;if(text&&el('transcriptTextIndicator'))el('transcriptTextIndicator').textContent='Teks: '+text;}
 const el=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function status(message,isError=false){const x=el('transcriptStatus');if(x){x.textContent=message;x.style.color=isError?'#b73b32':'';}const banner=el('transcriptLiveBanner');if(banner){banner.textContent=message;banner.classList?.toggle?.('is-live',!isError&&!!(liveStarting||liveHandle||combinedHandle));}else if(isError&&typeof toast==='function')toast(message,true);syncRecordingControls();}
 // Controls depend on the recording state, not only on what was last clicked.
 // Marker buttons are disabled when idle so a normal first-time user cannot get a red error.
 function recordingActive(){return !!(combinedHandle||recorder);}
 function recordingPending(){return !!(combinedStarting||recordStarting||liveStarting);}
 function syncRecordingControls(){
  const active=recordingActive(),pending=recordingPending();
  const blocked=!available()||myYearArchived();
  const start=document.querySelector?.('[data-action="transcript-combined"]');
  if(start){start.disabled=blocked||active||pending||combinedStopping||recordStopping||working;start.textContent=pending?'◌ Menyiapkan mikrofon…':active?'● Sedang merekam — lihat status Audio dan Teks':'🔴 Mulai Rekam + Tulis Langsung';}
  const stop=document.querySelector?.('[data-action="transcript-stop"]');
  if(stop)stop.disabled=blocked||!(active||pending||dictationWanted||recognition||liveHandle);
  const markers=document.querySelectorAll?.('[data-action="transcript-marker"], [data-action="transcript-marker-custom"], [data-action="transcript-marker-time"]')||[];
  for(const marker of markers)marker.disabled=blocked||!active||pending||combinedStopping||recordStopping;
  const custom=el('transcriptCustomSpeaker');if(custom)custom.disabled=blocked||!active||pending||combinedStopping||recordStopping;
  const hint=el('transcriptMarkerHint');if(hint)hint.textContent=active&&!pending?'Rekaman aktif. Ketuk pembicara yang sedang berbicara; penandaan ini dilakukan manual.':'Tombol penanda aktif setelah rekaman benar-benar dimulai.';
 }
 function updateStartHelp(){
  const hint=el('transcriptStartHelp'),consent=el('transcriptConsent');
  if(hint)hint.textContent=consent?.checked?'Izin sudah dicentang. Tekan Mulai, izinkan mikrofon Chrome, kemudian berbicara.':'Langkah 1: centang izin merekam di atas. Langkah 2: tekan Mulai Rekam + Tulis Langsung.';
  el('transcriptConsentWrap')?.classList?.toggle?.('needs-attention',false);
 }
 function promptConsent(){
  status('Centang izin perekaman di atas dahulu, lalu tekan Mulai lagi. Tidak ada rekaman yang dimulai.');
  const checkbox=el('transcriptConsent');
  el('transcriptConsentWrap')?.classList?.add?.('needs-attention');
  checkbox?.focus?.();
 }
 function available(){return !!data&&!!vaultKey;}
 function records(){if(!available())return [];if(!Array.isArray(data.transcriptions))data.transcriptions=[];return data.transcriptions;}
 function previewAudio(file){
  if(audioUrl)URL.revokeObjectURL(audioUrl);
  audioUrl='';audioFile=file;audioDownloadAttempted=false;
  if(file){audioUrl=URL.createObjectURL(file);draft.filename=file.name;}
  const mount=el('transcriptPreview');if(!mount)return;
  mount.innerHTML=file?`<audio controls preload="metadata" aria-label="Putar rekaman untuk pemeriksaan" src="${esc(audioUrl)}"></audio><p class="hint">${esc(file.name)} (${fmtBytes(file.size)}). Audio masih sementara pada halaman ini.</p><a class="btn secondary transcript-audio-download" href="${esc(audioUrl)}" download="${esc(file.name)}">⬇ Unduh rekaman WAV ke perangkat</a><p class="hint">Di Safari, jika file dibuka, gunakan Bagikan → Simpan ke File. Jangan tutup halaman sebelum tersimpan.</p><p class="transcript-audio-error" id="transcriptAudioError" role="alert" hidden></p>`:'';
  if(!file)return;
  mount.querySelector('a[download]')?.addEventListener?.('click',event=>{if(event.isTrusted)audioDownloadAttempted=true;});
  const player=mount.querySelector('audio');
  player?.addEventListener('error',()=>{
   const message='Audio tidak dapat diputar di browser ini. Simpan file WAV terlebih dahulu, lalu coba buka lewat Files/Voice Memos di iPhone. Jangan kirim file rusak untuk transkripsi.';
   const target=el('transcriptAudioError');if(target){target.textContent=message;target.hidden=false;}
   status(message,true);
  });
 }
 function tryAutoDownload(){try{el('transcriptPreview')?.querySelector?.('a[download]')?.click?.();}catch{/* Safari may block automatic downloads; visible link remains. */}}
 // The auto-backup stores ONLY text in the existing encrypted vault; never store WAV in localStorage.
 // A recovered draft is intentionally unverified and cannot create official task/evidence links.
 async function autosaveDraft(){
  if(!available()||myYearArchived()||!draft.text?.trim())return;
  if(autosaveBusy){autosaveAgain=true;return;}
  autosaveBusy=true;
  try{
   const recs=records();let current=recs.find(x=>x.id===draft.id);
   if(current?.verifiedAt && current.text===draft.text && current.title===draft.title && JSON.stringify(F.sanitizeMarkers(current.speakerMarkers||[]))===JSON.stringify(F.sanitizeMarkers(speakerMarkers)) && JSON.stringify(F.meta(current.formalDetails||{}))===JSON.stringify(F.meta(formalDetails)))return;
   // Never overwrite a confirmed transcript without preserving the original.
   if(current?.verifiedAt){current=null;draft.id='';}
   if(!current&&recs.length>=30)throw Error('Riwayat transkrip penuh. Unduh TXT lalu kosongkan riwayat untuk membuat cadangan.');
   const others=recs.filter(x=>x.id!==current?.id);
   if(others.reduce((n,x)=>n+String(x.text||'').length,0)+draft.text.length>800000)throw Error('Kapasitas brankas transkrip penuh.');
   const now=isoNow(),item={id:current?.id||uid('TRS'),title:draft.title.trim()||('Rekaman '+today()),text:draft.text.slice(0,U.MAX_TEXT_CHARS),classification:draft.classification,sourceFilename:draft.filename||'',performanceYear:current?.performanceYear||myActiveYear(),createdAt:current?.createdAt||now,updatedAt:now,verifiedAt:null,classificationNote:'CADANGAN OTOMATIS — BELUM DIPERIKSA',formalDetails:F.meta(formalDetails),speakerMarkers:F.sanitizeMarkers(speakerMarkers)};
   if(current)Object.assign(current,item);else recs.push(item);
   draft.id=item.id;await queueSave();
  }finally{autosaveBusy=false;if(autosaveAgain){autosaveAgain=false;scheduleAutosave(250);}}
 }
 function scheduleAutosave(delay=12000){
  if(autosaveTimer)clearTimeout(autosaveTimer);
  autosaveTimer=setTimeout(()=>{autosaveTimer=null;autosaveDraft().catch(error=>status('Cadangan teks tidak tersimpan: '+error.message+'. Unduh TXT sekarang.',true));},delay);
 }
 function backupTextNow(){if(autosaveTimer){clearTimeout(autosaveTimer);autosaveTimer=null;}
  return autosaveDraft().catch(error=>status('Cadangan teks gagal: '+error.message+'. Unduh TXT sebelum keluar.',true));
 }
 function readyOutputs(){try{return U.outputs(draft.title,draft.text,today());}catch{return null;}}
 function formalField(id,label,wide=false,rows=0,readonly=false){
  const value=formalDetails[id]||'';
  return `<div class="field ${wide?'form-wide':''}"><label for="formal_${id}">${esc(label)}</label>${rows?`<textarea id="formal_${id}" maxlength="8000" rows="${rows}" ${readonly?'disabled':''}>${esc(value)}</textarea>`:`<input id="formal_${id}" type="${id==='date'?'date':id==='startTime'||id==='endTime'?'time':'text'}" maxlength="250" value="${esc(value)}" ${readonly?'disabled':''}>`}</div>`;
 }
 function formalForm(readonly){
  return `<details class="transcript-formal-options"><summary>Identitas rapat & hasil terverifikasi — isi sekali untuk dua dokumen</summary><p class="hint">Data opsional. Yang kosong ditandai perlu verifikasi, bukan diisi otomatis oleh SIPETAK.</p><div class="transcript-formal-fields">
  ${formalField('date','Tanggal (YYYY-MM-DD)',false,0,readonly)}${formalField('meetingType','Jenis rapat (Paripurna/Komisi/Badan/dll.)',false,0,readonly)}
  ${formalField('sessionYear','Tahun Sidang',false,0,readonly)}${formalField('sessionPeriod','Masa Persidangan',false,0,readonly)}
  ${formalField('meetingNumber','Rapat Ke-',false,0,readonly)}${formalField('agenda','Acara Rapat',false,0,readonly)}
  ${formalField('nature','Sifat (terbuka/tertutup)',false,0,readonly)}${formalField('place','Tempat rapat',false,0,readonly)}
  ${formalField('startTime','Waktu mulai',false,0,readonly)}${formalField('endTime','Waktu selesai',false,0,readonly)}
  ${formalField('chair','Pimpinan rapat',false,0,readonly)}${formalField('secretary','Sekretaris rapat',false,0,readonly)}
  ${formalField('notulis','Nama notulis',false,0,readonly)}${formalField('signPlace','Tempat penandatanganan',false,0,readonly)}
  ${formalField('attendees','Anggota/peserta hadir (sesuai daftar hadir)',true,3,readonly)}${formalField('invitees','Undangan yang hadir',true,2,readonly)}
  ${formalField('summary','Pokok pembahasan yang sudah diperiksa (opsional)',true,3,readonly)}
  ${formalField('decisions','Kesimpulan/keputusan — hanya yang benar-benar diputuskan',true,3,readonly)}
  ${formalField('followup','Tindak lanjut, PIC dan tenggat (jika ada)',true,3,readonly)}
  </div></details>`;
 }
 function formalOptions(){updateDraftFromUI();return {title:draft.title,text:draft.text,transcript:draft.text,classification:draft.classification,details:formalDetails,markers:speakerMarkers};}
 function markerListHtml(){
  return speakerMarkers.length?speakerMarkers.slice(-25).map((m,index)=>`<div class="transcript-marker-line">Sesi ${m.session} · ${F.markerTime(m.seconds)} · ${esc(m.speaker)} <span class="hint">(manual)</span></div>`).join(''):'<p class="hint">Belum ada penanda. Mulai rekam untuk menandai pembicara.</p>';
 }
 function addSpeakerMarker(speaker){
  if(!available()||myYearArchived())throw Error('Buka brankas dan pilih tahun yang aktif.');
  if(!(combinedHandle||recorder)){status('Mulai rekaman dahulu untuk memakai penanda pembicara atau waktu.');return;}
  if(speakerMarkers.length>=300)throw Error('Penanda sudah mencapai batas 300. Simpan dan mulai sesi rapat baru.');
  const name=String(speaker||'').trim().slice(0,90);
  if(!name)throw Error('Masukkan nama atau jabatan pembicara.');
  const elapsed=Math.max(0,Math.floor((Date.now()-recordClockStart)/1000));
  speakerMarkers.push({session:speakerSession||1,seconds:elapsed,speaker:name});
  draft.verified=false;const check=el('transcriptVerified');if(check)check.checked=false;
  const mount=el('transcriptSpeakerMarkers');if(mount)mount.innerHTML=markerListHtml();
  scheduleAutosave();status('Penanda manual: '+name+' ('+F.markerTime(elapsed)+') dicatat.');
 }
 function page(){
  if(!available())return '<section class="card">Brankas harus dibuka dahulu.</section>';
  const readonly=!!myYearArchived(),list=records().filter(x=>Number(x.performanceYear)===Number(myActiveYear())).slice().reverse();
  const meetingChoices=myItems('meetings').map(m=>`<option value="${esc(m.id)}" ${draft.meetingId===m.id?'selected':''}>${esc(m.title||'Agenda tanpa nama')}</option>`).join('');
  return `<div class="section-head"><div><h3>🎙️ Rekam + Tulis Langsung</h3><p>Satu tombol untuk merekam WAV dan menuliskan ucapan saat berbicara — tanpa API SIPETAK.</p></div></div>
  <div class="callout warn"><b>Privasi:</b> Pengenalan suara bawaan browser dapat mengirim audio ke layanan penyedia browser. Gunakan hanya untuk materi yang diizinkan instansi. Materi <b>Terbatas</b> tidak bisa memakai mode ini.</div>
  <details class="transcript-usage-guide" id="transcriptUsageGuide">
   <summary>📘 Cara menggunakan: dari rekam hingga cetak Notulen & Risalah <span class="transcript-guide-count">8 langkah</span></summary>
   <div class="transcript-guide-body">
    <p class="hint">Gunakan Chrome untuk mode rekam + tulis yang sudah berhasil diuji oleh pengguna. Buka brankas dan pilih tahun kinerja yang tepat. Panduan ini tidak merekam atau mengirim data apa pun.</p>
    <ol>
     <li><b>Isi agenda rapat.</b> Masukkan nama kegiatan pada kolom Nama kegiatan / agenda dan pilih klasifikasi informasi yang diperbolehkan.</li>
     <li><b>Pastikan izin.</b> Centang persetujuan setelah memperoleh izin perekaman dan pengenalan suara sesuai aturan instansi.</li>
     <li><b>Mulai rekam + tulis.</b> Tekan “Mulai Rekam + Tulis Langsung”, izinkan mikrofon, lalu ucapkan kalimat uji. Pastikan indikator Audio dan Teks berjalan serta kata-kata muncul saat berbicara.</li>
     <li><b>Tandai pembicara bila perlu.</b> Selagi merekam, tekan Ketua Rapat / Anggota / Narasumber atau Tandai waktu. Semua penanda dibuat manual dan harus dicocokkan dengan audio.</li>
     <li><b>Hentikan dan amankan audio.</b> Tekan Hentikan, putar rekaman WAV, lalu tekan “Unduh rekaman WAV ke perangkat”. Pastikan berkas tersimpan sebelum menutup halaman.</li>
     <li><b>Periksa dan simpan teks.</b> Koreksi nama, angka, istilah, dan kutipan. Centang “Saya sudah membaca dan mengoreksi teks”, lalu tekan “Simpan teks terenkripsi”.</li>
     <li><b>Siapkan dua dokumen.</b> Buka “Identitas rapat &amp; hasil terverifikasi”, isi tanggal, jenis rapat, pimpinan, daftar hadir, keputusan dan tindak lanjut yang sudah dipastikan. Tekan “Buat Notulen” / “Buat Risalah” untuk meninjau, atau “Word Notulen” / “Word Risalah” bila perlu mengedit di Word/Pages.</li>
     <li><b>Cetak atau simpan PDF.</b> Tekan “Cetak / PDF Notulen” atau “Cetak / PDF Risalah”. Pada dialog browser pilih printer untuk kertas atau “Simpan sebagai PDF / Save as PDF”. Periksa pratinjau, ukuran A4 dan isi dokumen sebelum mencetak.</li>
    </ol>
    <div class="transcript-print-tip"><b>Jika dialog cetak tidak muncul:</b> izinkan pop-up/tab baru untuk situs SIPETAK. Di tab dokumen cetak, gunakan Ctrl+P (Windows) atau ⌘P (Mac). Untuk iPhone, gunakan menu Bagikan → Cetak / Simpan ke File bila tersedia. Sebagai alternatif, unduh Word lalu cetak dari Word/Pages.</div>
    <p class="hint"><b>Penting:</b> file WAV, Word dan PDF yang diunduh berada di luar brankas terenkripsi. Semua Notulen/Risalah tetap KONSEP sampai diperiksa dan disahkan menurut tata kerja instansi.</p>
    <button class="btn secondary" type="button" data-action="navigate" data-view="panduan">Lihat panduan lengkap SIPETAK →</button>
   </div>
  </details>
  <div class="transcript-pane">
   <section class="card transcript-card">
    <div class="field"><label for="transcriptTitle">Nama kegiatan / agenda</label><input id="transcriptTitle" maxlength="160" placeholder="Contoh: Rapat pembahasan Raperda" value="${esc(draft.title)}" ${readonly?'disabled':''}></div>
    <div class="field"><label for="transcriptClass">Klasifikasi materi</label><select id="transcriptClass" ${readonly?'disabled':''}>${allowedClass.map(x=>`<option ${x===draft.classification?'selected':''}>${x}</option>`).join('')}</select><p class="hint">Tidak berlaku untuk materi Terbatas yang tidak boleh diproses layanan pihak ketiga.</p></div>
    <label class="transcript-prompt" id="transcriptConsentWrap"><input type="checkbox" id="transcriptConsent" ${draft.consent?'checked':''} ${readonly?'disabled':''}> Saya sudah mendapat izin merekam dan mengizinkan pengenalan suara browser sesuai aturan instansi.</label>
    <p id="transcriptStartHelp" class="transcript-start-help" aria-live="polite">${draft.consent?'Izin sudah dicentang. Tekan Mulai, izinkan mikrofon Chrome, kemudian berbicara.':'Langkah 1: centang izin merekam di atas. Langkah 2: tekan Mulai Rekam + Tulis Langsung.'}</p>
    <div class="transcript-primary-actions"><button class="btn transcript-live-start" data-action="transcript-combined" ${(readonly||recordingActive()||recordingPending())?'disabled':''}>🔴 Mulai Rekam + Tulis Langsung</button><button class="btn ghost" data-action="transcript-stop" ${readonly||!(recordingActive()||recordingPending()||dictationWanted)?'disabled':''}>■ Hentikan</button></div>
    <div id="transcriptLiveBanner" class="transcript-live-banner" role="status" aria-live="polite">Siap merekam. Audio dan Teks akan ditampilkan terpisah setelah Mulai ditekan.</div>
    <p class="hint">Audio WAV tetap di perangkat dan perlu diunduh. <b>Teks dicadangkan otomatis ke brankas terenkripsi sebagai KONSEP belum diperiksa.</b> Setelah berhenti, ketuk Unduh rekaman WAV agar audio tidak hilang.</p><div class="transcript-dual-status"><span id="transcriptAudioIndicator">Audio: belum aktif</span><span id="transcriptTextIndicator">Teks: belum aktif</span></div>
    <div id="transcriptPreview" class="transcript-preview">${audioFile?`<audio controls preload="metadata" src="${esc(audioUrl)}"></audio><p class="hint">${esc(audioFile.name)} (${fmtBytes(audioFile.size)}) · <a href="${esc(audioUrl)}" download="${esc(audioFile.name)}">⬇ Unduh rekaman WAV</a></p>`:''}</div>
    <p class="transcript-status" id="transcriptStatus" role="status" aria-live="polite"></p>
    <div class="field"><label for="transcriptText">Teks otomatis saat merekam — periksa setelah selesai</label><textarea id="transcriptText" maxlength="80000" placeholder="Ucapan yang dikenali browser akan muncul di sini selama merekam. Anda juga dapat mengedit atau menempelkan teks." ${readonly?'disabled':''}>${esc(draft.text)}</textarea><p class="hint">${draft.text.length.toLocaleString('id-ID')} karakter. Periksa nama, angka, kutipan dan keputusan.</p></div>
    <div class="transcript-speaker-panel"><h4>Penanda Pembicara & Waktu (manual)</h4>
    <p class="hint" id="transcriptMarkerHint">${recordingActive()&&!recordingPending()?'Rekaman aktif. Ketuk pembicara yang sedang berbicara; penandaan ini dilakukan manual.':'Tombol penanda aktif setelah rekaman benar-benar dimulai.'}</p>
    <div class="transcript-grid-actions">${['Ketua Rapat','Anggota','Sekretaris / Setwan','Narasumber'].map(role=>`<button type="button" class="btn secondary" data-action="transcript-marker" data-speaker="${esc(role)}" ${(readonly||!recordingActive()||recordingPending())?'disabled':''}>${esc(role)}</button>`).join('')}</div>
    <div class="transcript-speaker-custom"><label for="transcriptCustomSpeaker">Nama pembicara lain (opsional)</label><input id="transcriptCustomSpeaker" type="text" maxlength="90" placeholder="Nama/jabatan sesuai daftar hadir" ${(readonly||!recordingActive()||recordingPending())?'disabled':''}><button type="button" class="btn ghost" data-action="transcript-marker-custom" ${(readonly||!recordingActive()||recordingPending())?'disabled':''}>+ Tandai nama</button><button type="button" class="btn ghost" data-action="transcript-marker-time" ${(readonly||!recordingActive()||recordingPending())?'disabled':''}>◷ Tandai waktu</button></div>
    <div id="transcriptSpeakerMarkers" class="transcript-marker-list" aria-live="polite">${markerListHtml()}</div></div>
    <details class="transcript-audio-tools"><summary>Pilihan tambahan jika browser tidak mendukung gabungan</summary>
      <div class="transcript-grid-actions"><button class="btn secondary" data-action="transcript-dictate" ${readonly?'disabled':''}>🎤 Dikte saja (tanpa audio)</button><button class="btn secondary" data-action="transcript-record-wav" ${readonly?'disabled':''}>🎙️ Rekam WAV saja</button></div>
      <div class="field"><label for="transcriptFile">Atau unggah rekaman (MP3, M4A, WAV, MP4, WEBM · maks. 20 MB)</label><input type="file" accept=".mp3,.m4a,.wav,.mp4,.webm,.mpeg,.mpga,audio/*" id="transcriptFile" ${readonly?'disabled':''}></div>
      <p class="hint">Safari iPhone bisa membisukan salah satu akses mikrofon saat pengenalan suara dan perekaman dijalankan bersama. Jika muncul peringatan, audio atau teks mungkin tidak lengkap. Solusi gabungan yang konsisten memerlukan transkripsi streaming di server atau aplikasi native.</p>
    </details>
    <label class="transcript-prompt"><input type="checkbox" id="transcriptVerified" ${draft.verified?'checked':''} ${readonly?'disabled':''}> Saya sudah membaca dan mengoreksi teks di atas. Simpan sebagai <b>draf pribadi</b>, bukan dokumen resmi.</label>
    <div class="transcript-grid-actions"><button class="btn" data-action="transcript-save" ${readonly?'disabled':''}>✓ Simpan teks terenkripsi</button><button class="btn secondary" data-action="transcript-new">＋ Transkrip baru</button><button class="btn ghost" data-action="transcript-export">↓ Unduh TXT</button></div>
    <h4>Notulen & Risalah Rapat</h4><p class="hint">Satu transkrip menghasilkan dua konsep dokumen. Hasil Word bisa diedit; cetak bisa disimpan sebagai PDF. <b>Bukan dokumen yang sudah disahkan.</b></p>
    ${formalForm(readonly)}
    <div class="transcript-grid-actions"><button class="btn" data-action="transcript-formal-preview" data-kind="notulen">📄 Buat Notulen</button><button class="btn" data-action="transcript-formal-preview" data-kind="risalah">📑 Buat Risalah</button><button class="btn secondary" data-action="transcript-formal-word" data-kind="notulen">↓ Word Notulen</button><button class="btn secondary" data-action="transcript-formal-word" data-kind="risalah">↓ Word Risalah</button></div>
    <div class="transcript-grid-actions"><button class="btn ghost" data-action="transcript-formal-print" data-kind="notulen">🖨 Cetak / PDF Notulen</button><button class="btn ghost" data-action="transcript-formal-print" data-kind="risalah">🖨 Cetak / PDF Risalah</button></div>
    <p class="hint transcript-print-shorthelp">Panduan cetak: pilih salah satu tombol di atas → izinkan tab baru bila diminta → pada dialog pilih <b>Printer</b> atau <b>Save as PDF / Simpan sebagai PDF</b> → cek A4 dan pratinjau. Dokumen masih <b>KONSEP</b>.</p>
    <h4>Hasil dari satu teks</h4><p class="hint">Satu kali transkrip disimpan, semua jenis draf dapat dihasilkan tanpa mengetik ulang.</p><div class="transcript-grid-actions"><button class="btn" data-action="transcript-bundle">✦ Buat semua draf sekaligus</button><button class="btn secondary" data-action="transcript-export-bundle">↓ Unduh paket draf TXT</button></div><div class="transcript-results">${[['minutes','Draf notulensi'],['summary','Petikan bahan ringkasan'],['followup','Calon tindak lanjut'],['evidence','Metadata bukti dukung']].map(([id,label])=>`<button class="btn secondary" data-action="transcript-output" data-kind="${id}">${label}</button>`).join('')}</div>
    <div id="transcriptOutput" class="transcript-output" aria-live="polite"></div>
   </section>
   <aside class="card transcript-card">
    <h3>Hubungkan ke pekerjaan</h3><p class="hint">Setelah transkrip diperiksa dan disimpan, siapkan catatan tugas dan bukti secara otomatis. Keputusan resmi tetap perlu pengesahan.</p>
    <div class="field"><label for="transcriptMeeting">Agenda rapat yang sudah ada (opsional)</label><select id="transcriptMeeting"><option value="">Tidak ditautkan</option>${meetingChoices}</select></div>
    <div class="transcript-grid-actions"><button class="btn secondary" data-action="transcript-link" ${readonly?'disabled':''}>↗ Isi bahan agenda</button><button class="btn secondary" data-action="transcript-create-task" ${readonly?'disabled':''}>＋ Draf tugas</button><button class="btn secondary" data-action="transcript-create-evidence" ${readonly?'disabled':''}>＋ Metadata bukti</button></div>
    <p class="hint">Tindakan di atas membutuhkan transkrip tersimpan dan konfirmasi. Tidak ada perubahan otomatis tanpa persetujuan.</p>
    <h3>Riwayat tersimpan · ${myActiveYear()}</h3><div class="transcript-catalog">${list.length?list.map(r=>`<div class="transcript-record"><strong>${esc(r.title)}</strong><p class="hint">${esc((r.createdAt||'').slice(0,10))} · ${r.verifiedAt?'Sudah diperiksa':'CADANGAN BELUM DIPERIKSA'} · ${esc(r.classification||'Internal')} · ${Number(r.text?.length||0).toLocaleString('id-ID')} karakter</p><div class="actions"><button class="btn sm ghost" data-action="transcript-load" data-id="${esc(r.id)}">Buka</button><button class="btn sm danger" data-action="transcript-delete" data-id="${esc(r.id)}" ${readonly?'disabled':''}>Hapus</button></div></div>`).join(''):'<p class="hint">Belum ada transkrip tersimpan.</p>'}</div>
   </aside>
  </div>`;
 }
 function updateDraftFromUI(){
  if(el('transcriptTitle'))draft.title=el('transcriptTitle').value;
  if(el('transcriptText'))draft.text=el('transcriptText').value;
  if(el('transcriptClass'))draft.classification=el('transcriptClass').value;
  if(el('transcriptConsent'))draft.consent=el('transcriptConsent').checked;
  if(el('transcriptVerified'))draft.verified=el('transcriptVerified').checked;
  if(el('transcriptMeeting'))draft.meetingId=el('transcriptMeeting').value;
  for(const key of F.FIELDS){const field=el('formal_'+key);if(field)formalDetails[key]=field.value;}
 }
 function change(e){
  const id=e.target?.id;
  if(id==='transcriptFile'){
   if(!e.target.files?.length)return true;
   try{const f=e.target.files[0];U.validateAudio(f);previewAudio(f);status('Rekaman dipilih. Periksa klasifikasi dan centang izin sebelum mengirim.');}
   catch(err){e.target.value='';status(err.message,true);}return true;
  }
  if(id?.startsWith('formal_')){updateDraftFromUI();return true;}
  if(['transcriptClass','transcriptConsent','transcriptVerified','transcriptMeeting'].includes(id)){updateDraftFromUI();if(id==='transcriptConsent'){updateStartHelp();if(draft.consent)status('Izin telah diberikan. Tekan Mulai Rekam + Tulis Langsung untuk memulai.');else if(recordingActive())stopRecording().catch(error=>status('Gagal menghentikan setelah izin dicabut: '+error.message,true));else status('Izin belum dicentang. Centang kotak izin di atas sebelum memulai rekaman.');}return true;}
  return false;
 }
 function input(e){
  if(e.target?.id?.startsWith('formal_')){updateDraftFromUI();return true;}
  if(!['transcriptTitle','transcriptText'].includes(e.target?.id))return false;
  const oldText=draft.text;updateDraftFromUI();if(e.target.id==='transcriptText'&&oldText!==draft.text){draft.verified=false;scheduleAutosave();}
  const verify=el('transcriptVerified');if(verify&&e.target.id==='transcriptText')verify.checked=false;
  return true;
 }
 function markLiveEditing(active){
  const area=el('transcriptText');if(area)area.readOnly=active;
  const verified=el('transcriptVerified');if(verified){verified.checked=false;verified.disabled=active;}
  const saveBtn=document.querySelector?.('[data-action="transcript-save"]');if(saveBtn)saveBtn.disabled=active;
  syncRecordingControls();
 }
 async function checkServerStatus(){
  if(!root.SIPETAK_TRANSCRIBE_SERVICE)throw Error('Modul pemeriksa server belum dimuat. Perbarui cache SIPETAK.');
  const panel=el('transcriptServiceStatus');
  if(panel)panel.textContent='Memeriksa pengaturan server…';
  try {
   const result=await root.SIPETAK_TRANSCRIBE_SERVICE.check();
   const msg='Teks langsung: '+root.SIPETAK_TRANSCRIBE_SERVICE.statusMessage(result.live)
     +' Transkripsi file: '+(result.upload.ready?'siap konfigurasi':'belum aktif ('+String(result.upload.reason)+')')+'.';
   if(panel)panel.textContent=msg;
   return result;
  }catch(error){if(panel)panel.textContent=error.message;throw error;}
 }
 async function startLive(){
  if(combinedHandle||combinedStarting||liveStarting||recordStarting||recordStopping||recorder||working)throw Error('Ada perekaman atau proses lain yang masih berjalan. Tekan Hentikan dahulu.');
  if(!available()||myYearArchived())throw Error('Brankas harus dibuka dan tahun aktif tidak boleh diarsipkan.');
  updateDraftFromUI();
  if(draft.classification==='Terbatas')throw Error('Materi Terbatas tidak boleh diproses oleh layanan transkripsi eksternal.');
  if(!draft.consent)throw Error('Centang izin perekaman dan pemrosesan suara terlebih dahulu.');
  if(!navigator.onLine)throw Error('Rekam + Teks Langsung membutuhkan internet. Untuk offline pilih Rekam kompatibel WAV.');
  if(typeof root.SIPETAK_SB_AI_TOKEN!=='function')throw Error('Login Supabase belum tersedia.');
  if(!root.SIPETAK_RECORDER||!root.SIPETAK_LIVE_ENGINE)throw Error('Modul terbaru belum termuat. Muat ulang aplikasi setelah deploy.');
  liveStarting=true;const epoch=recorderEpoch;liveBaseText=draft.text.trim();liveConnected=false;
  draft.verified=false;markLiveEditing(true);
  status('Meminta mikrofon dan mulai menyimpan audio lokal…');
  try{
   stopDictation();
   // This must be invoked in the original tap gesture for iOS Web Audio activation.
   // Start capturing during the user's direct tap (Safari Web Audio gesture requirement).
   // Check server readiness concurrently, never expose API keys in the browser.
   const readinessPromise=root.SIPETAK_TRANSCRIBE_SERVICE?.check?.()
     .catch(error=>({live:{ready:false,reason:'unknown'},message:error.message}));
   const recordingPromise=root.SIPETAK_RECORDER.start({forceWav:true,onLimit:(file,error)=>{
    if(discardOnStop)return;
    if(recorder){recorder=null;liveHandle?.stop({graceMs:0}).catch(()=>{});liveHandle=null;}
    clearTimeout(liveTimer);liveTimer=null;
    markLiveEditing(false);
    if(error)status(error.message||'Batas rekaman tercapai.',true);
    else try{finishedAudio(file,'Batas ukuran audio tercapai. Simpan teks dan unduh rekaman sekarang.');}catch(e){status(e.message,true);}
   }});
   const session=await recordingPromise;
   if(epoch!==recorderEpoch){session.abort();return;}
   recorder=session;discardOnStop=false;recordClockStart=Date.now();speakerSession=Math.max(0,...speakerMarkers.map(m=>Number(m.session)||0))+1;previewAudio(null);
   liveTimer=setTimeout(()=>{if(recorder===session)stopRecording().catch(e=>status(e.message,true));},10*60*1000);
   status('Audio sedang direkam di perangkat. Memeriksa server teks langsung…');
   const readiness=await readinessPromise;
   if(epoch!==recorderEpoch)return;
   if(readiness&&!readiness.live?.ready){
    const detail=readiness.message||root.SIPETAK_TRANSCRIBE_SERVICE.statusMessage(readiness.live);
    const btn=document.querySelector?.('[data-action="transcript-live"]');
    if(btn)btn.textContent='● Rekam audio saja (server belum siap)';
    const panel=el('transcriptServiceStatus');if(panel)panel.textContent=detail;
    status('Audio lokal tetap direkam, tetapi teks belum tersedia: '+detail+' Tekan Hentikan untuk menyimpan WAV, lalu unduh. Jangan mengira teks sudah dibuat.',true);
    return;
   }
   status('Audio sedang direkam di perangkat. Menghubungkan teks langsung…');
   const live=root.SIPETAK_LIVE_ENGINE.create({
    onText:(value)=>{
     if(recorderEpoch!==epoch||liveHandle!==live)return;
     draft.text=(liveBaseText?liveBaseText+'\n\n':'')+value;
     if(draft.text.length>U.MAX_TEXT_CHARS)draft.text=draft.text.slice(0,U.MAX_TEXT_CHARS);
     draft.verified=false;
     const textarea=el('transcriptText');if(textarea){textarea.value=draft.text;textarea.scrollTop=textarea.scrollHeight;}
    },
    onStatus:msg=>{if(recorderEpoch===epoch){liveConnected=true;status(msg);}},
    onError:msg=>{if(recorderEpoch===epoch)status(msg+' Audio lokal tetap direkam. Tekan Hentikan lalu gunakan Ubah rekaman menjadi teks jika perlu.',true);}
   });
   liveHandle=live;
   try{
    const token=await root.SIPETAK_SB_AI_TOKEN();
    if(epoch!==recorderEpoch)return;
    await live.connect({stream:session.stream,token,classification:draft.classification});
    if(epoch===recorderEpoch)status('Rekam + Teks Langsung aktif. Teks akan muncul saat Anda berbicara.');
   }catch(error){
    live.abort();if(liveHandle===live)liveHandle=null;
    status('Rekaman audio lokal berjalan, tetapi teks langsung gagal: '+(error?.message||'server belum siap')+'. Tekan Hentikan untuk menyimpan audio sementara.',true);
   }
  }catch(error){
   markLiveEditing(false);
   liveHandle?.abort();liveHandle=null;
   throw error;
  }finally{liveStarting=false;}
 }
 function startCombined(){
  if(combinedHandle||combinedStarting||combinedStopping||recorder||recordStarting||recordStopping||liveStarting||working||dictationWanted)throw Error('Masih ada perekaman atau dikte aktif. Tekan Hentikan dahulu.');
  if(!available()||myYearArchived())throw Error('Buka brankas SIPETAK dan pilih tahun aktif.');
  updateDraftFromUI();
  if(!draft.consent){promptConsent();return;}
  if(draft.classification==='Terbatas')throw Error('Materi Terbatas tidak boleh dikirim ke pengenal suara browser.');
  if(!root.SIPETAK_COMBINED_ENGINE?.supported?.())throw Error('Browser tidak mendukung perekaman dan dikte langsung bersamaan. Gunakan pilihan tambahan Rekam WAV saja atau Dikte saja.');
  if(audioFile&&!confirm('Ada rekaman sebelumnya yang hanya tersimpan sementara di halaman. Pastikan sudah diunduh. Mulai rekaman baru dan ganti file sebelumnya?'))return;
  recordClockStart=Date.now();speakerSession=Math.max(0,...speakerMarkers.map(m=>Number(m.session)||0))+1;
  const epoch=++combinedEpoch,base=draft.text.trim();
  combinedStarting=true;combinedHadText=false;combinedMuted=false;combinedProblem='';draft.verified=false;
  if(el('transcriptVerified'))el('transcriptVerified').checked=false;
  markLiveEditing(true);previewAudio(null);indicators('meminta mikrofon','menunggu dikte');
  // Must start both devices inside the original user click, without awaiting a network call.
  try{
   const handle=root.SIPETAK_COMBINED_ENGINE.start({
    onText:value=>{
     if(epoch!==combinedEpoch)return;
     combinedHadText=!!value;indicators(null,combinedHadText?'sedang tertulis':'menunggu ucapan');
     draft.text=[base,value].filter(Boolean).join(base&&value?'\n\n':'').slice(0,U.MAX_TEXT_CHARS);
     draft.verified=false;scheduleAutosave();
     const area=el('transcriptText');if(area){area.value=draft.text;area.scrollTop=area.scrollHeight;}
     if(el('transcriptVerified'))el('transcriptVerified').checked=false;
    },
    onState:state=>{
     if(epoch!==combinedEpoch)return;
     if(state==='text-received'){indicators(combinedMuted?'mikrofon dibisukan':'merekam WAV','sedang tertulis');if(!combinedMuted)status('🔴 Merekam WAV + teks otomatis sedang ditulis.');}
     else if(state==='speech-unavailable'){indicators(null,'dikte berhenti');status('Audio masih direkam, tetapi dikte browser telah berhenti. Hentikan dan periksa audio.',true);}
     else if(state==='speech-restarting')status('Dikte browser terhenti sesaat, mencoba melanjutkan. Audio tetap direkam.');
    },
    onError:(message,code)=>{if(epoch===combinedEpoch){combinedProblem=message;if(code==='mic-muted'){combinedMuted=true;indicators('mikrofon dibisukan',null);}else indicators(null,'dikte bermasalah');status(message,true);}},
    onFinished:(file,error)=>{
     if(epoch!==combinedEpoch)return;
     combinedHandle=null;combinedStarting=false;combinedStopping=false;markLiveEditing(false);indicators(error?'gagal':'selesai',combinedHadText?'periksa hasil':'belum berhasil');
     if(error){status('Rekaman gagal: '+(error?.message||'kesalahan perekam'),true);return;}
     try{
      finishedAudio(file,combinedHadText?
       'Rekaman selesai dan teks telah muncul. SIPETAK mencoba mengunduh WAV; pastikan ada di Files. Jika belum, ketuk Unduh WAV. Periksa lalu simpan teks.':
       'Rekaman selesai, tetapi browser belum menghasilkan teks. Pastikan WAV terunduh, lalu periksa audio. Perangkat ini mungkin tidak mendukung dua fungsi bersamaan.');
      tryAutoDownload();
      if(combinedProblem&&/hampir tidak menangkap suara/i.test(combinedProblem))status(combinedProblem,true);
     }catch(e){status(e?.message||'Audio tidak valid.',true);}
    }
   });
   combinedHandle=handle;
   if(!combinedProblem)status('Meminta izin mikrofon. Rekam WAV dimulai; menunggu hasil pengenalan suara browser…');
   Promise.resolve(handle.ready).then(()=>{
    if(epoch!==combinedEpoch)return;
    combinedStarting=false;indicators(combinedMuted?'mikrofon dibisukan':'merekam WAV',combinedProblem?'gangguan, periksa pesan':combinedHadText?'sedang tertulis':'menunggu ucapan');
    if(!combinedProblem)status('● Sedang merekam audio WAV. Bicara sekarang; teks akan tampil jika browser mengizinkan kedua fitur bersamaan.');
   }).catch(error=>{
    if(epoch!==combinedEpoch)return;
    combinedHandle=null;combinedStarting=false;markLiveEditing(false);indicators('gagal','belum aktif');
    status('Gagal memulai rekaman: '+(error?.message||'izin mikrofon ditolak'),true);
   });
  }catch(error){combinedStarting=false;markLiveEditing(false);throw error;}
 }
 async function stopCombined(){
  if(combinedStopping)return;
  if(!combinedHandle){status('Belum ada perekaman aktif.');return;}
  combinedStopping=true;const handle=combinedHandle;
  status('Menghentikan audio dan menyelesaikan transkrip sementara…');
  try{await handle.stop();}
  catch(error){status('Gagal menyelesaikan rekaman: '+(error?.message||'kesalahan Safari')+'. Teks yang sudah tampil tetap tersedia.',true);}
  finally{if(combinedHandle===handle)combinedHandle=null;combinedStopping=false;combinedStarting=false;markLiveEditing(false);syncRecordingControls();}
 }
 async function startRecording(forceWav=false){
  if(combinedHandle||combinedStarting||liveStarting||recordStarting||recordStopping||recorder)throw Error('Rekaman masih berlangsung atau sedang disiapkan. Tekan Hentikan dahulu.');
  if(working)throw Error('Selesaikan transkripsi yang sedang berjalan sebelum mulai merekam.');
  if(!root.SIPETAK_RECORDER)throw Error('Modul perekam belum dimuat. Muat ulang SIPETAK agar kode terbaru aktif.');
  recordStarting=true;const thisEpoch=recorderEpoch;
  try{
   stopDictation();
   const session=await root.SIPETAK_RECORDER.start({forceWav,onLimit:(file,error)=>{
    if(recorder===session)recorder=null;
    if(discardOnStop)return;
    try{if(error)throw error;finishedAudio(file,'Batas ukuran rekaman tercapai. Audio disimpan sementara; unduh atau transkripsikan sekarang.');}
    catch(e){status(e.message||'Gagal menyelesaikan rekaman.',true);}
   }});
   if(thisEpoch!==recorderEpoch){session.abort();return;}
   recorder=session;discardOnStop=false;recordClockStart=Date.now();speakerSession=Math.max(0,...speakerMarkers.map(m=>Number(m.session)||0))+1;
   previewAudio(null);
   status(session.mode==='wav'?'Sedang merekam dalam format WAV yang kompatibel dengan iPhone. Tekan Hentikan saat selesai.':'Sedang merekam. Tekan Hentikan saat selesai.');
  }finally{recordStarting=false;syncRecordingControls();}
 }
 function finishedAudio(file,message){
  U.validateAudio(file);
  previewAudio(file);backupTextNow();
  status(message||'Rekaman selesai. Putar audio untuk memastikan terdengar sebelum menekan Ubah rekaman menjadi teks.');
 }
 async function stopRecording(){
  if(combinedHandle||combinedStarting){await stopCombined();return;}
  if(dictationWanted||recognition){stopDictation(true);return;}
  if(recordStarting||liveStarting)throw Error('Mikrofon/koneksi sedang disiapkan. Tekan Hentikan setelah proses awal selesai.');
  if(recordStopping)return;
  if(!recorder){status('Tidak ada rekaman aktif.');return;}
  recordStopping=true;const session=recorder;
  status('Mengakhiri rekaman dan membuat berkas audio…');
  try{
   const file=await session.stop();
   if(liveHandle){const live=liveHandle;try{await live.stop({graceMs:1400});}catch{}liveHandle=null;}
   if(!discardOnStop)finishedAudio(file,'Rekaman dihentikan. Teks yang muncul dapat diperiksa dan disimpan. Audio tetap lokal sampai Anda memilih untuk mengirimnya.');
  }finally{clearTimeout(liveTimer);liveTimer=null;if(recorder===session)recorder=null;recordStopping=false;markLiveEditing(false);syncRecordingControls();}
 }
 function setDictationButton(active){
  const button=document.querySelector?.('[data-action="transcript-dictate"]');
  if(button){button.textContent=active?'⏹ Berhenti Ketik Langsung':'🎤 Mulai Ketik Langsung';button.setAttribute?.('aria-pressed',active?'true':'false');}
  const banner=el('transcriptLiveBanner');if(banner)banner.classList?.toggle?.('is-live',active);
 }
 function updateSpeechText(cycleText){
  const base=[speechBase,speechCommitted,cycleText].filter(Boolean).join(' ').trim();
  draft.text=base.slice(0,U.MAX_TEXT_CHARS);draft.verified=false;scheduleAutosave();
  const area=el('transcriptText');if(area){area.value=draft.text;area.scrollTop=area.scrollHeight;}
  const box=el('transcriptVerified');if(box)box.checked=false;
 }
 function stopDictation(announce=false){
  dictationWanted=false;
  if(dictationRetryTimer){clearTimeout(dictationRetryTimer);dictationRetryTimer=null;}
  const r=recognition;recognition=null;
  if(r){try{r.stop();}catch{try{r.abort?.();}catch{}}}
  setDictationButton(false);
  if(announce)status('Ketik langsung dihentikan. Teks tetap tersedia. Periksa lalu simpan.');
 }
 function startSpeechCycle(Speech){
  if(!dictationWanted)return;
  const r=new Speech(),pieces=[];
  recognition=r;dictationHadResults=false;dictationLastError='';
  r.lang='id-ID';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
  r.onstart=()=>{if(recognition===r)status('🎤 Mendengarkan… Silakan bicara. Tulisan akan muncul di bawah.');};
  r.onresult=event=>{
   if(recognition!==r||!dictationWanted)return;
   for(let i=event.resultIndex;i<event.results.length;i++){
    const line=event.results[i];pieces[i]=String(line?.[0]?.transcript||'').trim();
   }
   dictationHadResults=true;dictationRestarts=0;
   updateSpeechText(pieces.filter(Boolean).join(' '));
   status('🎤 Teks sedang ditulis… Silakan lanjut bicara.');
  };
  r.onerror=e=>{
   if(recognition!==r)return;
   const code=String(e.error||'unknown');dictationLastError=code;
   const msgs={
    'not-allowed':'Izin mikrofon ditolak. Izinkan akses mikrofon di Safari, atau gunakan mikrofon keyboard iPhone.',
    'service-not-allowed':'Layanan dikte browser tidak diizinkan. Ketuk kolom teks lalu gunakan mikrofon keyboard iPhone.',
    'network':'Layanan pengenal suara browser tidak tersambung. Periksa koneksi internet atau gunakan mikrofon keyboard iPhone.',
    'no-speech':'Suara tidak terdengar. Coba berbicara dekat mikrofon.',
    'audio-capture':'Mikrofon tidak tersedia. Tutup perekam audio lain dan coba lagi.',
    'language-not-supported':'Bahasa Indonesia tidak didukung pengenal suara browser ini; gunakan mikrofon keyboard iPhone.'
   };
   const recoverable=code==='no-speech';
   if(!recoverable)dictationWanted=false;
   status(msgs[code]||('Dikte browser berhenti ('+code+'). Gunakan mikrofon keyboard iPhone jika perlu.'),true);
  };
  r.onend=()=>{
   if(recognition!==r)return;
   recognition=null;
   const complete=pieces.filter(Boolean).join(' ').trim();
   if(complete){speechCommitted=[speechCommitted,complete].filter(Boolean).join(' ');updateSpeechText('');}
   if(dictationWanted&&dictationRestarts<2){
    dictationRestarts++;
    status('Safari menjeda dikte. Mencoba melanjutkan…');
    dictationRetryTimer=setTimeout(()=>{
     dictationRetryTimer=null;
     if(!dictationWanted)return;
     try{startSpeechCycle(Speech);}catch(e){dictationWanted=false;setDictationButton(false);status('Dikte dijeda Safari. Tekan Mulai Ketik Langsung lagi untuk melanjutkan. Teks tidak hilang.',true);}
    },350);
    return;
   }
   dictationWanted=false;setDictationButton(false);
   if(!dictationLastError)status('Dikte berhenti. Tekan Mulai lagi untuk melanjutkan, atau periksa dan simpan teks.');
  };
  r.start();
 }
 function startDictation(){
  if(dictationWanted){stopDictation(true);return;}
  if(combinedHandle||combinedStarting||recorder||recordStarting||recordStopping||liveStarting||working)throw Error('Hentikan perekaman sebelum menggunakan dikte saja.');
  if(!available()||myYearArchived())throw Error('Buka brankas SIPETAK dan pilih tahun yang masih aktif.');
  updateDraftFromUI();
  if(!draft.consent)throw Error('Centang izin pengenalan suara terlebih dahulu.');
  if(draft.classification==='Terbatas')throw Error('Materi Terbatas tidak boleh diproses oleh layanan dikte browser. Gunakan input teks manual yang sesuai kebijakan instansi.');
  const Speech=root.SpeechRecognition||root.webkitSpeechRecognition;
  if(!Speech)throw Error('Browser ini belum mendukung tombol dikte. Ketuk kolom teks, lalu tekan mikrofon pada keyboard iPhone untuk mengetik langsung.');
  if(root.isSecureContext===false)throw Error('Dikte browser memerlukan situs HTTPS. Buka SIPETAK melalui alamat https.');
  speechBase=draft.text.trim();speechCommitted='';speechResults=[];dictationRestarts=0;dictationWanted=true;draft.verified=false;
  const verify=el('transcriptVerified');if(verify)verify.checked=false;
  try{startSpeechCycle(Speech);setDictationButton(true);status('🎤 Mengaktifkan dikte browser. Izinkan mikrofon jika diminta.');}
  catch(error){dictationWanted=false;recognition=null;setDictationButton(false);throw error;}
 }
 function requireChecked(){
  if(!available())throw Error('Brankas terkunci.');
  if(myYearArchived())throw Error('Tahun aktif sudah diarsipkan.');
  updateDraftFromUI();draft.text=U.validateText(draft.text);
  draft.title=draft.title.trim();if(!draft.title||draft.title.length>160)throw Error('Tuliskan nama agenda, maksimal 160 karakter.');
  if(!allowedClass.includes(draft.classification))throw Error('Klasifikasi tidak valid.');
  if(!draft.verified)throw Error('Periksa teks dan centang konfirmasi sebelum menyimpan.');
 }
 async function save(){
  if(recorder||liveStarting||combinedHandle||combinedStarting)throw Error('Tekan Hentikan sebelum menyimpan teks.');
  requireChecked();const recs=records(),current=recs.find(x=>x.id===draft.id),other=recs.filter(x=>x.id!==draft.id);
  if(!current&&recs.length>=30)throw Error('Maksimal 30 transkrip. Unduh dan hapus riwayat lama terlebih dahulu.');
  if(other.reduce((n,x)=>n+String(x.text||'').length,0)+draft.text.length>800000)throw Error('Kapasitas teks brankas transkrip mencapai 800.000 karakter. Arsipkan riwayat lama.');
  const now=isoNow(),record={id:current?.id||uid('TRS'),title:draft.title,text:draft.text,classification:draft.classification,sourceFilename:draft.filename||current?.sourceFilename||'',performanceYear:current?.performanceYear||myActiveYear(),createdAt:current?.createdAt||now,verifiedAt:now,updatedAt:now,classificationNote:'Draf, belum disahkan',formalDetails:F.meta(formalDetails),speakerMarkers:F.sanitizeMarkers(speakerMarkers)};
  if(current)Object.assign(current,record);else recs.push(record);
  if(autosaveTimer){clearTimeout(autosaveTimer);autosaveTimer=null;}
  await queueSave();draft.id=record.id;render();showBundle();toast('Transkrip tersimpan terenkripsi. Paket draf otomatis tersedia. Audio tidak disimpan.');
 }
 async function process(){
  if(working)throw Error('Proses masih berjalan.');
  if(recorder||liveStarting||recordStarting||combinedHandle||combinedStarting)throw Error('Hentikan rekaman dahulu sebelum memproses audio ulang.');
  if(!available()||myYearArchived())throw Error('Brankas/tahun aktif tidak bisa diubah.');
  updateDraftFromUI();if(!audioFile)throw Error('Rekam atau unggah audio terlebih dahulu.');
  U.validateAudio(audioFile);
  if(draft.classification==='Terbatas')throw Error('Rekaman klasifikasi Terbatas tidak dapat dikirim ke AI eksternal.');
  if(!draft.consent)throw Error('Persetujuan pemrosesan audio belum diberikan.');
  if(!navigator.onLine)throw Error('Transkripsi membutuhkan internet. File tetap ada di perangkat selama halaman terbuka.');
  if(typeof root.SIPETAK_SB_AI_TOKEN!=='function')throw Error('Penghubung login Supabase belum tersedia.');
  working=true;controller=new AbortController();status('Memverifikasi sesi Supabase…');
  try{
   let token=await root.SIPETAK_SB_AI_TOKEN();
   const body=new FormData();body.append('file',audioFile,audioFile.name);body.append('classification',draft.classification);
   const send=tok=>fetch('/api/transcribe',{method:'POST',headers:{Authorization:'Bearer '+tok},body,credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
   status('Mengirim audio dengan persetujuan Anda…');
   let response=await send(token);
   if(response.status===401){token=await root.SIPETAK_SB_AI_TOKEN(true);response=await send(token);}
   const result=await response.json().catch(()=>({error:'Respons server tidak valid.'}));
   if(!response.ok)throw Error(String(result.error||'Gagal mentranskripsikan audio.').slice(0,240));
   if(typeof result.text!=='string')throw Error('Server tidak mengembalikan teks.');
   const next=U.validateText(result.text);
   draft.text=(draft.text?draft.text.trim()+'\n\n':'')+next;draft.verified=false;scheduleAutosave(1500);
   if(draft.text.length>U.MAX_TEXT_CHARS)throw Error('Hasil gabungan terlalu panjang. Simpan rekaman terpisah.');
   const area=el('transcriptText');if(area)area.value=draft.text;
   const box=el('transcriptVerified');if(box)box.checked=false;
   status('Berhasil. Periksa ejaan, nama, dan angka sebelum menyimpan.');
  }finally{working=false;controller=null;}
 }
 function requireStored(){requireChecked();const record=records().find(x=>x.id===draft.id);if(!record||!record.verifiedAt||record.text!==draft.text||record.title!==draft.title)throw Error('Simpan versi transkrip yang sudah diperiksa terlebih dahulu.');return record;}
 async function linkMeeting(){
  const record=requireStored(),id=draft.meetingId||el('transcriptMeeting')?.value;
  const target=myItems('meetings').find(x=>x.id===id);
  if(!target)throw Error('Pilih agenda rapat yang ada terlebih dahulu.');
  if(!myAllowWrite(target))throw Error('Agenda tidak bisa diubah.');
  if(target.transcriptionIds?.includes(record.id))throw Error('Transkrip ini sudah ditautkan ke agenda tersebut.');
  if(!confirm('Tambahkan transkrip sebagai bahan rapat KONSEP (bukan keputusan resmi) pada agenda '+target.title+'?'))return;
  const excerpt=record.text.slice(0,9500),section='[TRANSKRIP KONSEP '+record.id+']\n'+excerpt+(record.text.length>9500?'\n[Transkrip terpotong. Buka modul Transkripsi untuk teks lengkap.]':'');
  target.materials=[target.materials||'',section].filter(Boolean).join('\n\n');
  target.transcriptionIds=[...(target.transcriptionIds||[]),record.id];target.updatedAt=isoNow();
  await queueSave();render();toast('Bahan konsep ditautkan ke agenda. Hasil/keputusan rapat tidak diubah.');
 }
 async function createTask(){
  const record=requireStored();if(!myAllowWrite())throw Error('Tahun aktif diarsipkan.');
  if(data.tasks.some(x=>x.transcriptionId===record.id))throw Error('Tugas dari transkrip ini sudah pernah dibuat.');
  if(!confirm('Buat satu tugas PROSES berupa pemeriksaan draf hasil rekaman? Status tidak otomatis menjadi Selesai.'))return;
  const out=U.outputs(record.title,record.text),now=isoNow();
  const task=root.SIPETAK_QUICK.toRecord({title:out.taskTitle,output:'',category:'Persidangan',source:'Transkripsi SIPETAK '+record.id},{year:myActiveYear(),date:today(),now,id:uid('TSK')});
  task.transcriptionId=record.id;task.notes='Periksa transkrip, notulensi, dan hasil rapat sebelum menjadi bahan administrasi resmi.';
  data.tasks.push(task);wfAudit('task','Draf tugas dari transkrip',task);
  if(typeof lcAutoRegister==='function')await lcAutoRegister('task',task);
  await queueSave();render();toast('Tugas pemeriksaan draf tersimpan (status Proses).');
 }
 async function createEvidence(){
  const record=requireStored();if(!myAllowWrite())throw Error('Tahun aktif diarsipkan.');
  if(data.evidence.some(x=>x.transcriptionId===record.id))throw Error('Metadata bukti dari transkrip ini sudah dibuat.');
  if(!confirm('Buat METADATA bahan bukti dukung tanpa menganggap transkrip sebagai bukti resmi?'))return;
  const now=isoNow(),ev={id:uid('BD'),title:'Metadata transkripsi: '+record.title.slice(0,130),date:today(),type:'Dokumentasi',classification:record.classification,taskId:'',rhkId:'',workflowRefId:'',description:U.outputs(record.title,record.text).evidence,file:null,transcriptionId:record.id,createdAt:now,updatedAt:now,performanceYear:myActiveYear()};
  data.evidence.push(ev);wfAudit('evidence','Metadata dari transkrip',ev);
  await queueSave();render();toast('Metadata bukti tersimpan, belum menjadi dokumen resmi.');
 }
 function clearDraft(){
  if(combinedHandle||combinedStarting||recorder||recordStarting||dictationWanted||liveHandle)throw Error('Tekan Hentikan dan unduh WAV sebelum membuat transkrip baru.');
  if(audioFile&&!audioDownloadAttempted&&!confirm('Audio masih sementara dan belum diunduh. Buat transkrip baru akan menghilangkan rekaman. Tetap lanjut?'))return;
  if(working)throw Error('Batalkan transkripsi yang berjalan terlebih dahulu.');stopAll();stopDictation();previewAudio(null);
  draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};formalDetails=emptyFormal();speakerMarkers=[];speakerSession=0;recordClockStart=0;render();
 }
 function load(id){const row=records().find(x=>x.id===id);if(!row)throw Error('Transkrip tidak ditemukan.');
  if(combinedHandle||combinedStarting||recorder||recordStarting||dictationWanted||liveHandle)throw Error('Hentikan rekaman dan unduh WAV sebelum membuka riwayat.');
  if(audioFile&&!audioDownloadAttempted&&!confirm('Audio masih sementara dan belum diunduh. Membuka riwayat akan menghilangkan rekaman. Tetap lanjut?'))return;
  stopAll();previewAudio(null);
  draft={title:row.title,text:row.text,classification:row.classification||'Internal',verified:!!row.verifiedAt,consent:false,meetingId:'',id:row.id,filename:row.sourceFilename||''};formalDetails={...emptyFormal(),...F.meta(row.formalDetails||{})};speakerMarkers=F.sanitizeMarkers(row.speakerMarkers||[]);speakerSession=0;recordClockStart=0;render();status('Transkrip tersimpan dibuka. Perubahan baru harus diperiksa lagi sebelum disimpan.');
 }
 async function remove(id){if(myYearArchived())throw Error('Tahun diarsipkan.');const idx=records().findIndex(x=>x.id===id);if(idx<0)throw Error('Transkrip tidak ditemukan.');if(!confirm('Hapus transkrip dari riwayat? Salinan yang sudah ditautkan ke agenda atau dibuat sebagai metadata/tugas TIDAK ikut dihapus. Unduh TXT bila dibutuhkan.'))return;
  data.transcriptions.splice(idx,1);await queueSave();if(draft.id===id){draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};formalDetails=emptyFormal();speakerMarkers=[];speakerSession=0;recordClockStart=0;}render();toast('Transkrip dihapus dari brankas lokal.');
 }
 function downloadText(){updateDraftFromUI();const text=U.validateText(draft.text);blobDownload('SIPETAK-Transkrip-'+today()+'.txt',text,'text/plain;charset=utf-8');}
 function bundleText(){updateDraftFromUI();const all=U.outputs(draft.title,draft.text,today());return [F.makeText('notulen',formalOptions()),F.makeText('risalah',formalOptions()),all.summary,all.followup,all.evidence].join('\n\n'+'='.repeat(45)+'\n\n');}
 function showBundle(){showText(bundleText());}
 function exportBundle(){const content=bundleText();blobDownload('SIPETAK-Paket-Draf-'+today()+'.txt',content,'text/plain;charset=utf-8');}
 function showOutput(which){updateDraftFromUI();const content=U.outputs(draft.title,draft.text,today())[which];if(!content)throw Error('Jenis draf tidak dikenal.');
  showText(content);
 }
 function showFormal(which){if(!F)throw Error('Paket dokumen resmi belum dimuat; muat ulang SIPETAK.');const content=F.makeText(which,formalOptions());showText(content);status((which==='notulen'?'Notulen':'Risalah')+' konsep dibuat dari transkrip. Lengkapi identitas dan verifikasi sebelum digunakan.');}
 function exportFormalWord(which){const options=formalOptions(),html=F.makeHtml(which,options),name=F.filename(which,options.title);blobDownload(name+'.doc','\ufeff'+html,'application/msword;charset=utf-8');status('Dokumen Word konsep diunduh. Periksa dan sesuaikan tata naskah sebelum pengesahan.');}
 function printFormal(which){const html=F.makeHtml(which,formalOptions());const popup=window.open('about:blank','_blank');if(!popup)throw Error('Browser memblokir tab cetak. Izinkan pop-up SIPETAK lalu coba lagi.');popup.document.open();popup.document.write(html);popup.document.close();popup.focus();popup.setTimeout(()=>popup.print(),350);status('Pratinjau cetak dibuka. Pilih Simpan sebagai PDF pada dialog cetak browser.');}
 function showText(content){const parent=el('transcriptOutput');if(!parent)return;
  parent.innerHTML=`<div class="field"><label for="transcriptOutputText">Pratinjau hasil (draf)</label><textarea readonly id="transcriptOutputText">${esc(content)}</textarea></div><button type="button" class="btn ghost" data-action="transcript-copy-output">Salin draf</button>`;
 }
 async function copyOutput(){const val=el('transcriptOutputText')?.value||'';if(!val)throw Error('Buka hasil draf dahulu.');await navigator.clipboard.writeText(val);status('Draf berhasil disalin. Verifikasi sebelum digunakan.');}
 function cancel(){if(controller)controller.abort();controller=null;working=false;status('Proses dibatalkan. Rekaman tetap lokal pada halaman ini.');}
 function stopAll(){if(autosaveTimer){clearTimeout(autosaveTimer);autosaveTimer=null;}clearTimeout(liveTimer);liveTimer=null;combinedEpoch++;combinedHandle?.abort();combinedHandle=null;combinedStarting=false;combinedStopping=false;recorderEpoch++;liveHandle?.abort();liveHandle=null;liveStarting=false;liveConnected=false;markLiveEditing(false);if(controller)controller.abort();controller=null;working=false;stopDictation();discardOnStop=true;recorder?.abort();recorder=null;recordStopping=false;syncRecordingControls();}
 function leave(){
  if(combinedHandle||combinedStarting||recorder||recordStarting||liveHandle||dictationWanted){
   if(!confirm('Rekaman/dikte masih berjalan. Keluar sekarang dapat menghilangkan audio yang belum diunduh. Hentikan dan unduh dulu. Tetap keluar?'))return false;
  }
  if(audioFile&&!audioDownloadAttempted&&!confirm('File audio belum diunduh. Keluar akan menghilangkan audio dari halaman. Tetap keluar?'))return false;
  backupTextNow();stopAll();return true;
 }
 function secureLock(){backupTextNow();discardOnStop=true;stopAll();if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl='';audioFile=null;draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};formalDetails=emptyFormal();speakerMarkers=[];speakerSession=0;recordClockStart=0;}
 function action(button){const a=button?.dataset?.action||'';if(!a.startsWith('transcript-'))return false;
  const actions={'transcript-combined':startCombined,'transcript-live':startLive,'transcript-service-check':checkServerStatus,'transcript-record':()=>startRecording(false),'transcript-record-wav':()=>startRecording(true),'transcript-stop':stopRecording,'transcript-dictate':startDictation,'transcript-process':process,'transcript-cancel':cancel,'transcript-save':save,'transcript-marker':()=>addSpeakerMarker(button.dataset.speaker),'transcript-marker-custom':()=>addSpeakerMarker(el('transcriptCustomSpeaker')?.value),'transcript-marker-time':()=>addSpeakerMarker('Penanda waktu'),'transcript-new':clearDraft,'transcript-export':downloadText,'transcript-formal-preview':()=>showFormal(button.dataset.kind),'transcript-formal-word':()=>exportFormalWord(button.dataset.kind),'transcript-formal-print':()=>printFormal(button.dataset.kind),'transcript-bundle':showBundle,'transcript-export-bundle':exportBundle,'transcript-output':()=>showOutput(button.dataset.kind),'transcript-copy-output':copyOutput,'transcript-load':()=>load(button.dataset.id),'transcript-delete':()=>remove(button.dataset.id),'transcript-link':linkMeeting,'transcript-create-task':createTask,'transcript-create-evidence':createEvidence};
  // Execute immediately within the real tap/click gesture (important for iOS microphone/Web Audio permissions).
  try{Promise.resolve(actions[a]?.()).catch(e=>{if(e.name==='AbortError')status('Permintaan dibatalkan.');else status(e.message||'Operasi gagal.',true);});}
  catch(e){status(e.message||'Operasi gagal.',true);}return true;
 }
 root.addEventListener?.('beforeunload',event=>{if(combinedHandle||combinedStarting||recorder||recordStarting||liveHandle||(audioFile&&!audioDownloadAttempted)){event.preventDefault?.();event.returnValue='';}});
 root.SIPETAK_TRANSCRIPT={page,action,change,input,stopAll,leave,secureLock,records,outputs:U.outputs};
})(window);
