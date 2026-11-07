'use strict';
/* SIPETAK Transkripsi: non-destructive feature module. No raw audio is stored in the vault. */
(function(root){
 const U=root.SIPETAK_TRANSCRIPT_UTILS;
 const allowedClass=['Umum','Internal','Terbatas'];
 let draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};
 let audioFile=null,audioUrl='',recorder=null,recordStarting=false,recordStopping=false,working=false,controller=null;
 let recognition=null,speechBase='',speechCommitted='',speechResults=[],dictationWanted=false,dictationRetryTimer=null,dictationRestarts=0,dictationHadResults=false,dictationLastError='',discardOnStop=false,recorderEpoch=0;
 let liveHandle=null,liveStarting=false,liveBaseText='',liveConnected=false,liveTimer=null;
 let combinedHandle=null,combinedStarting=false,combinedStopping=false,combinedHadText=false,combinedMuted=false,combinedProblem='',combinedEpoch=0;
 function indicators(audio,text){if(audio&&el('transcriptAudioIndicator'))el('transcriptAudioIndicator').textContent='Audio: '+audio;if(text&&el('transcriptTextIndicator'))el('transcriptTextIndicator').textContent='Teks: '+text;}
 const el=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function status(message,isError=false){const x=el('transcriptStatus');if(x){x.textContent=message;x.style.color=isError?'#b73b32':'';}const banner=el('transcriptLiveBanner');if(banner){banner.textContent=message;banner.classList?.toggle?.('is-live',!isError&&!!(liveStarting||liveHandle||combinedHandle));}else if(isError&&typeof toast==='function')toast(message,true);}
 function available(){return !!data&&!!vaultKey;}
 function records(){if(!available())return [];if(!Array.isArray(data.transcriptions))data.transcriptions=[];return data.transcriptions;}
 function previewAudio(file){
  if(audioUrl)URL.revokeObjectURL(audioUrl);
  audioUrl='';audioFile=file;
  if(file){audioUrl=URL.createObjectURL(file);draft.filename=file.name;}
  const mount=el('transcriptPreview');if(!mount)return;
  mount.innerHTML=file?`<audio controls preload="metadata" aria-label="Putar rekaman untuk pemeriksaan" src="${esc(audioUrl)}"></audio><p class="hint">${esc(file.name)} (${fmtBytes(file.size)}). Audio masih sementara pada halaman ini.</p><a class="btn secondary transcript-audio-download" href="${esc(audioUrl)}" download="${esc(file.name)}">⬇ Unduh rekaman WAV ke perangkat</a><p class="hint">Di Safari, jika file dibuka, gunakan Bagikan → Simpan ke File. Jangan tutup halaman sebelum tersimpan.</p><p class="transcript-audio-error" id="transcriptAudioError" role="alert" hidden></p>`:'';
  if(!file)return;
  const player=mount.querySelector('audio');
  player?.addEventListener('error',()=>{
   const message='Audio tidak dapat diputar di browser ini. Simpan file WAV terlebih dahulu, lalu coba buka lewat Files/Voice Memos di iPhone. Jangan kirim file rusak untuk transkripsi.';
   const target=el('transcriptAudioError');if(target){target.textContent=message;target.hidden=false;}
   status(message,true);
  });
 }
 function tryAutoDownload(){try{el('transcriptPreview')?.querySelector?.('a[download]')?.click?.();}catch{/* Safari may block automatic downloads; visible link remains. */}}
 function readyOutputs(){try{return U.outputs(draft.title,draft.text,today());}catch{return null;}}
 function page(){
  if(!available())return '<section class="card">Brankas harus dibuka dahulu.</section>';
  const readonly=!!myYearArchived(),list=records().filter(x=>Number(x.performanceYear)===Number(myActiveYear())).slice().reverse();
  const meetingChoices=myItems('meetings').map(m=>`<option value="${esc(m.id)}" ${draft.meetingId===m.id?'selected':''}>${esc(m.title||'Agenda tanpa nama')}</option>`).join('');
  return `<div class="section-head"><div><h3>🎙️ Rekam + Tulis Langsung</h3><p>Satu tombol untuk merekam WAV dan menuliskan ucapan saat berbicara — tanpa API SIPETAK.</p></div></div>
  <div class="callout warn"><b>Privasi:</b> Pengenalan suara bawaan browser dapat mengirim audio ke layanan penyedia browser. Gunakan hanya untuk materi yang diizinkan instansi. Materi <b>Terbatas</b> tidak bisa memakai mode ini.</div>
  <div class="transcript-pane">
   <section class="card transcript-card">
    <div class="field"><label for="transcriptTitle">Nama kegiatan / agenda</label><input id="transcriptTitle" maxlength="160" placeholder="Contoh: Rapat pembahasan Raperda" value="${esc(draft.title)}" ${readonly?'disabled':''}></div>
    <div class="field"><label for="transcriptClass">Klasifikasi materi</label><select id="transcriptClass" ${readonly?'disabled':''}>${allowedClass.map(x=>`<option ${x===draft.classification?'selected':''}>${x}</option>`).join('')}</select><p class="hint">Tidak berlaku untuk materi Terbatas yang tidak boleh diproses layanan pihak ketiga.</p></div>
    <label class="transcript-prompt"><input type="checkbox" id="transcriptConsent" ${draft.consent?'checked':''} ${readonly?'disabled':''}> Saya sudah mendapat izin merekam dan mengizinkan pengenalan suara browser sesuai aturan instansi.</label>
    <div class="transcript-primary-actions"><button class="btn transcript-live-start" data-action="transcript-combined" ${readonly?'disabled':''}>🔴 Mulai Rekam + Tulis Langsung</button><button class="btn ghost" data-action="transcript-stop" ${readonly?'disabled':''}>■ Hentikan</button></div>
    <div id="transcriptLiveBanner" class="transcript-live-banner" role="status" aria-live="polite">Siap. Tekan Mulai, izinkan mikrofon, lalu bicara. Teks muncul jika browser mendukung perekaman dan dikte bersamaan.</div>
    <p class="hint">Audio direkam sebagai WAV di perangkat. <b>Setelah berhenti, ketuk “Unduh rekaman WAV” agar file tersimpan di iPhone.</b> File belum disimpan otomatis ke brankas.</p><div class="transcript-dual-status"><span id="transcriptAudioIndicator">Audio: belum aktif</span><span id="transcriptTextIndicator">Teks: belum aktif</span></div>
    <div id="transcriptPreview" class="transcript-preview">${audioFile?`<audio controls preload="metadata" src="${esc(audioUrl)}"></audio><p class="hint">${esc(audioFile.name)} (${fmtBytes(audioFile.size)}) · <a href="${esc(audioUrl)}" download="${esc(audioFile.name)}">⬇ Unduh rekaman WAV</a></p>`:''}</div>
    <p class="transcript-status" id="transcriptStatus" role="status" aria-live="polite"></p>
    <div class="field"><label for="transcriptText">Teks otomatis saat merekam — periksa setelah selesai</label><textarea id="transcriptText" maxlength="80000" placeholder="Ucapan yang dikenali browser akan muncul di sini selama merekam. Anda juga dapat mengedit atau menempelkan teks." ${readonly?'disabled':''}>${esc(draft.text)}</textarea><p class="hint">${draft.text.length.toLocaleString('id-ID')} karakter. Periksa nama, angka, kutipan dan keputusan.</p></div>
    <details class="transcript-audio-tools"><summary>Pilihan tambahan jika browser tidak mendukung gabungan</summary>
      <div class="transcript-grid-actions"><button class="btn secondary" data-action="transcript-dictate" ${readonly?'disabled':''}>🎤 Dikte saja (tanpa audio)</button><button class="btn secondary" data-action="transcript-record-wav" ${readonly?'disabled':''}>🎙️ Rekam WAV saja</button></div>
      <div class="field"><label for="transcriptFile">Atau unggah rekaman (MP3, M4A, WAV, MP4, WEBM · maks. 20 MB)</label><input type="file" accept=".mp3,.m4a,.wav,.mp4,.webm,.mpeg,.mpga,audio/*" id="transcriptFile" ${readonly?'disabled':''}></div>
      <p class="hint">Safari iPhone bisa membisukan salah satu akses mikrofon saat pengenalan suara dan perekaman dijalankan bersama. Jika muncul peringatan, audio atau teks mungkin tidak lengkap. Solusi gabungan yang konsisten memerlukan transkripsi streaming di server atau aplikasi native.</p>
    </details>
    <label class="transcript-prompt"><input type="checkbox" id="transcriptVerified" ${draft.verified?'checked':''} ${readonly?'disabled':''}> Saya sudah membaca dan mengoreksi teks di atas. Simpan sebagai <b>draf pribadi</b>, bukan dokumen resmi.</label>
    <div class="transcript-grid-actions"><button class="btn" data-action="transcript-save" ${readonly?'disabled':''}>✓ Simpan teks terenkripsi</button><button class="btn secondary" data-action="transcript-new">＋ Transkrip baru</button><button class="btn ghost" data-action="transcript-export">↓ Unduh TXT</button></div>
    <h4>Hasil dari satu teks</h4><p class="hint">Satu kali transkrip disimpan, semua jenis draf dapat dihasilkan tanpa mengetik ulang.</p><div class="transcript-grid-actions"><button class="btn" data-action="transcript-bundle">✦ Buat semua draf sekaligus</button><button class="btn secondary" data-action="transcript-export-bundle">↓ Unduh paket draf TXT</button></div><div class="transcript-results">${[['minutes','Draf notulensi'],['summary','Petikan bahan ringkasan'],['followup','Calon tindak lanjut'],['evidence','Metadata bukti dukung']].map(([id,label])=>`<button class="btn secondary" data-action="transcript-output" data-kind="${id}">${label}</button>`).join('')}</div>
    <div id="transcriptOutput" class="transcript-output" aria-live="polite"></div>
   </section>
   <aside class="card transcript-card">
    <h3>Hubungkan ke pekerjaan</h3><p class="hint">Setelah transkrip diperiksa dan disimpan, siapkan catatan tugas dan bukti secara otomatis. Keputusan resmi tetap perlu pengesahan.</p>
    <div class="field"><label for="transcriptMeeting">Agenda rapat yang sudah ada (opsional)</label><select id="transcriptMeeting"><option value="">Tidak ditautkan</option>${meetingChoices}</select></div>
    <div class="transcript-grid-actions"><button class="btn secondary" data-action="transcript-link" ${readonly?'disabled':''}>↗ Isi bahan agenda</button><button class="btn secondary" data-action="transcript-create-task" ${readonly?'disabled':''}>＋ Draf tugas</button><button class="btn secondary" data-action="transcript-create-evidence" ${readonly?'disabled':''}>＋ Metadata bukti</button></div>
    <p class="hint">Tindakan di atas membutuhkan transkrip tersimpan dan konfirmasi. Tidak ada perubahan otomatis tanpa persetujuan.</p>
    <h3>Riwayat tersimpan · ${myActiveYear()}</h3><div class="transcript-catalog">${list.length?list.map(r=>`<div class="transcript-record"><strong>${esc(r.title)}</strong><p class="hint">${esc((r.createdAt||'').slice(0,10))} · ${esc(r.classification||'Internal')} · ${Number(r.text?.length||0).toLocaleString('id-ID')} karakter</p><div class="actions"><button class="btn sm ghost" data-action="transcript-load" data-id="${esc(r.id)}">Buka</button><button class="btn sm danger" data-action="transcript-delete" data-id="${esc(r.id)}" ${readonly?'disabled':''}>Hapus</button></div></div>`).join(''):'<p class="hint">Belum ada transkrip tersimpan.</p>'}</div>
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
 }
 function change(e){
  const id=e.target?.id;
  if(id==='transcriptFile'){
   if(!e.target.files?.length)return true;
   try{const f=e.target.files[0];U.validateAudio(f);previewAudio(f);status('Rekaman dipilih. Periksa klasifikasi dan centang izin sebelum mengirim.');}
   catch(err){e.target.value='';status(err.message,true);}return true;
  }
  if(['transcriptClass','transcriptConsent','transcriptVerified','transcriptMeeting'].includes(id)){updateDraftFromUI();return true;}
  return false;
 }
 function input(e){
  if(!['transcriptTitle','transcriptText'].includes(e.target?.id))return false;
  const oldText=draft.text;updateDraftFromUI();if(e.target.id==='transcriptText'&&oldText!==draft.text)draft.verified=false;
  const verify=el('transcriptVerified');if(verify&&e.target.id==='transcriptText')verify.checked=false;
  return true;
 }
 function markLiveEditing(active){
  const area=el('transcriptText');if(area)area.readOnly=active;
  const verified=el('transcriptVerified');if(verified){verified.checked=false;verified.disabled=active;}
  const saveBtn=document.querySelector?.('[data-action="transcript-save"]');if(saveBtn)saveBtn.disabled=active;
  const startBtn=document.querySelector?.('[data-action="transcript-combined"]');if(startBtn){startBtn.disabled=active;startBtn.textContent=active?'● Sedang merekam — periksa status teks':'🔴 Mulai Rekam + Tulis Langsung';}
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
   recorder=session;discardOnStop=false;previewAudio(null);
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
  if(!draft.consent)throw Error('Centang izin perekaman dan pengenalan suara terlebih dahulu.');
  if(draft.classification==='Terbatas')throw Error('Materi Terbatas tidak boleh dikirim ke pengenal suara browser.');
  if(!root.SIPETAK_COMBINED_ENGINE?.supported?.())throw Error('Browser tidak mendukung perekaman dan dikte langsung bersamaan. Gunakan pilihan tambahan Rekam WAV saja atau Dikte saja.');
  if(audioFile&&!confirm('Ada rekaman sebelumnya yang hanya tersimpan sementara di halaman. Pastikan sudah diunduh. Mulai rekaman baru dan ganti file sebelumnya?'))return;
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
     draft.verified=false;
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
  finally{if(combinedHandle===handle)combinedHandle=null;combinedStopping=false;combinedStarting=false;markLiveEditing(false);}
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
   recorder=session;discardOnStop=false;
   previewAudio(null);
   status(session.mode==='wav'?'Sedang merekam dalam format WAV yang kompatibel dengan iPhone. Tekan Hentikan saat selesai.':'Sedang merekam. Tekan Hentikan saat selesai.');
  }finally{recordStarting=false;}
 }
 function finishedAudio(file,message){
  U.validateAudio(file);
  previewAudio(file);
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
  }finally{clearTimeout(liveTimer);liveTimer=null;if(recorder===session)recorder=null;recordStopping=false;markLiveEditing(false);}
 }
 function setDictationButton(active){
  const button=document.querySelector?.('[data-action="transcript-dictate"]');
  if(button){button.textContent=active?'⏹ Berhenti Ketik Langsung':'🎤 Mulai Ketik Langsung';button.setAttribute?.('aria-pressed',active?'true':'false');}
  const banner=el('transcriptLiveBanner');if(banner)banner.classList?.toggle?.('is-live',active);
 }
 function updateSpeechText(cycleText){
  const base=[speechBase,speechCommitted,cycleText].filter(Boolean).join(' ').trim();
  draft.text=base.slice(0,U.MAX_TEXT_CHARS);draft.verified=false;
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
  const now=isoNow(),record={id:current?.id||uid('TRS'),title:draft.title,text:draft.text,classification:draft.classification,sourceFilename:draft.filename||current?.sourceFilename||'',performanceYear:current?.performanceYear||myActiveYear(),createdAt:current?.createdAt||now,verifiedAt:now,updatedAt:now,classificationNote:'Draf, belum disahkan'};
  if(current)Object.assign(current,record);else recs.push(record);
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
   draft.text=(draft.text?draft.text.trim()+'\n\n':'')+next;draft.verified=false;
   if(draft.text.length>U.MAX_TEXT_CHARS)throw Error('Hasil gabungan terlalu panjang. Simpan rekaman terpisah.');
   const area=el('transcriptText');if(area)area.value=draft.text;
   const box=el('transcriptVerified');if(box)box.checked=false;
   status('Berhasil. Periksa ejaan, nama, dan angka sebelum menyimpan.');
  }finally{working=false;controller=null;}
 }
 function requireStored(){requireChecked();const record=records().find(x=>x.id===draft.id);if(!record||record.text!==draft.text||record.title!==draft.title)throw Error('Simpan versi transkrip yang sudah diperiksa terlebih dahulu.');return record;}
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
  if(working)throw Error('Batalkan transkripsi yang berjalan terlebih dahulu.');stopAll();stopDictation();previewAudio(null);
  draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};render();
 }
 function load(id){const row=records().find(x=>x.id===id);if(!row)throw Error('Transkrip tidak ditemukan.');stopAll();previewAudio(null);
  draft={title:row.title,text:row.text,classification:row.classification||'Internal',verified:true,consent:false,meetingId:'',id:row.id,filename:row.sourceFilename||''};render();status('Transkrip tersimpan dibuka. Perubahan baru harus diperiksa lagi sebelum disimpan.');
 }
 async function remove(id){if(myYearArchived())throw Error('Tahun diarsipkan.');const idx=records().findIndex(x=>x.id===id);if(idx<0)throw Error('Transkrip tidak ditemukan.');if(!confirm('Hapus transkrip dari riwayat? Salinan yang sudah ditautkan ke agenda atau dibuat sebagai metadata/tugas TIDAK ikut dihapus. Unduh TXT bila dibutuhkan.'))return;
  data.transcriptions.splice(idx,1);await queueSave();if(draft.id===id){draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};}render();toast('Transkrip dihapus dari brankas lokal.');
 }
 function downloadText(){updateDraftFromUI();const text=U.validateText(draft.text);blobDownload('SIPETAK-Transkrip-'+today()+'.txt',text,'text/plain;charset=utf-8');}
 function bundleText(){updateDraftFromUI();const all=U.outputs(draft.title,draft.text,today());return [all.minutes,all.summary,all.followup,all.evidence].join('\n\n'+'='.repeat(45)+'\n\n');}
 function showBundle(){showText(bundleText());}
 function exportBundle(){const content=bundleText();blobDownload('SIPETAK-Paket-Draf-'+today()+'.txt',content,'text/plain;charset=utf-8');}
 function showOutput(which){updateDraftFromUI();const content=U.outputs(draft.title,draft.text,today())[which];if(!content)throw Error('Jenis draf tidak dikenal.');
  showText(content);
 }
 function showText(content){const parent=el('transcriptOutput');if(!parent)return;
  parent.innerHTML=`<div class="field"><label for="transcriptOutputText">Pratinjau hasil (draf)</label><textarea readonly id="transcriptOutputText">${esc(content)}</textarea></div><button type="button" class="btn ghost" data-action="transcript-copy-output">Salin draf</button>`;
 }
 async function copyOutput(){const val=el('transcriptOutputText')?.value||'';if(!val)throw Error('Buka hasil draf dahulu.');await navigator.clipboard.writeText(val);status('Draf berhasil disalin. Verifikasi sebelum digunakan.');}
 function cancel(){if(controller)controller.abort();controller=null;working=false;status('Proses dibatalkan. Rekaman tetap lokal pada halaman ini.');}
 function stopAll(){clearTimeout(liveTimer);liveTimer=null;combinedEpoch++;combinedHandle?.abort();combinedHandle=null;combinedStarting=false;combinedStopping=false;recorderEpoch++;liveHandle?.abort();liveHandle=null;liveStarting=false;liveConnected=false;markLiveEditing(false);if(controller)controller.abort();controller=null;working=false;stopDictation();discardOnStop=true;recorder?.abort();recorder=null;recordStopping=false;}
 function leave(){stopAll();}
 function secureLock(){discardOnStop=true;stopAll();if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl='';audioFile=null;draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};}
 function action(button){const a=button?.dataset?.action||'';if(!a.startsWith('transcript-'))return false;
  const actions={'transcript-combined':startCombined,'transcript-live':startLive,'transcript-service-check':checkServerStatus,'transcript-record':()=>startRecording(false),'transcript-record-wav':()=>startRecording(true),'transcript-stop':stopRecording,'transcript-dictate':startDictation,'transcript-process':process,'transcript-cancel':cancel,'transcript-save':save,'transcript-new':clearDraft,'transcript-export':downloadText,'transcript-bundle':showBundle,'transcript-export-bundle':exportBundle,'transcript-output':()=>showOutput(button.dataset.kind),'transcript-copy-output':copyOutput,'transcript-load':()=>load(button.dataset.id),'transcript-delete':()=>remove(button.dataset.id),'transcript-link':linkMeeting,'transcript-create-task':createTask,'transcript-create-evidence':createEvidence};
  // Execute immediately within the real tap/click gesture (important for iOS microphone/Web Audio permissions).
  try{Promise.resolve(actions[a]?.()).catch(e=>{if(e.name==='AbortError')status('Permintaan dibatalkan.');else status(e.message||'Operasi gagal.',true);});}
  catch(e){status(e.message||'Operasi gagal.',true);}return true;
 }
 root.SIPETAK_TRANSCRIPT={page,action,change,input,stopAll,leave,secureLock,records,outputs:U.outputs};
})(window);
