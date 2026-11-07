'use strict';
/* SIPETAK Transkripsi: non-destructive feature module. No raw audio is stored in the vault. */
(function(root){
 const U=root.SIPETAK_TRANSCRIPT_UTILS;
 const allowedClass=['Umum','Internal','Terbatas'];
 let draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};
 let audioFile=null,audioUrl='',recorder=null,recordStarting=false,recordStopping=false,working=false,controller=null;
 let recognition=null,speechBase='',speechResults=[],discardOnStop=false,recorderEpoch=0;
 let liveHandle=null,liveStarting=false,liveBaseText='',liveConnected=false,liveTimer=null;
 const el=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function status(message,isError=false){const x=el('transcriptStatus');if(x){x.textContent=message;x.style.color=isError?'#b73b32':'';}const banner=el('transcriptLiveBanner');if(banner){banner.textContent=message;banner.classList?.toggle?.('is-live',!isError&&!!(liveStarting||liveHandle));}else if(isError&&typeof toast==='function')toast(message,true);}
 function available(){return !!data&&!!vaultKey;}
 function records(){if(!available())return [];if(!Array.isArray(data.transcriptions))data.transcriptions=[];return data.transcriptions;}
 function previewAudio(file){
  if(audioUrl)URL.revokeObjectURL(audioUrl);
  audioUrl='';audioFile=file;
  if(file){audioUrl=URL.createObjectURL(file);draft.filename=file.name;}
  const mount=el('transcriptPreview');if(!mount)return;
  mount.innerHTML=file?`<audio controls preload="metadata" aria-label="Putar rekaman untuk pemeriksaan" src="${esc(audioUrl)}"></audio><p class="hint">${esc(file.name)} (${fmtBytes(file.size)}). Audio hanya sementara pada halaman ini; <a href="${esc(audioUrl)}" download="${esc(file.name)}">unduh rekaman</a> sebelum menutup jika ingin menyimpan.</p><p class="transcript-audio-error" id="transcriptAudioError" role="alert" hidden></p>`:'';
  if(!file)return;
  const player=mount.querySelector('audio');
  player?.addEventListener('error',()=>{
   const message='Audio tidak dapat diputar di browser ini. Pada iPhone, rekam ulang dengan tombol “Rekam kompatibel (WAV)” atau unggah dari Memo Suara. Jangan kirim file rusak untuk transkripsi.';
   const target=el('transcriptAudioError');if(target){target.textContent=message;target.hidden=false;}
   status(message,true);
  });
 }
 function readyOutputs(){try{return U.outputs(draft.title,draft.text,today());}catch{return null;}}
 function page(){
  if(!available())return '<section class="card">Brankas harus dibuka dahulu.</section>';
  const readonly=!!myYearArchived(),list=records().filter(x=>Number(x.performanceYear)===Number(myActiveYear())).slice().reverse();
  const meetingChoices=myItems('meetings').map(m=>`<option value="${esc(m.id)}" ${draft.meetingId===m.id?'selected':''}>${esc(m.title||'Agenda tanpa nama')}</option>`).join('');
  return `<div class="section-head"><div><h3>🎙 Transkripsi Suara & Notulensi</h3><p>Tekan Rekam + Teks Langsung: suara direkam dan teks muncul selama Anda berbicara. Periksa hasil sebelum digunakan.</p></div></div>
  <div class="callout warn"><b>Privasi:</b> Audio hanya dikirim ke penyedia AI setelah Anda menyetujui. Jangan kirim rapat rahasia/terbatas atau rapat yang belum mendapat izin rekam. Hasil AI bisa keliru. Brankas hanya menyimpan teks yang Anda setujui, bukan audio. Mode dikte browser bisa menggunakan layanan pengenal suara pihak ketiga.</div>
  <div class="transcript-pane">
   <section class="card transcript-card">
    <div class="field"><label for="transcriptTitle">Nama kegiatan / agenda</label><input id="transcriptTitle" maxlength="160" placeholder="Contoh: Rapat pembahasan Raperda" value="${esc(draft.title)}" ${readonly?'disabled':''}></div>
    <div class="field"><label for="transcriptClass">Klasifikasi rekaman</label><select id="transcriptClass" ${readonly?'disabled':''}>${allowedClass.map(x=>`<option ${x===draft.classification?'selected':''}>${x}</option>`).join('')}</select><p class="hint">Klasifikasi Terbatas tidak boleh dikirim ke layanan transkripsi eksternal.</p></div>
    <div class="field"><label for="transcriptFile">Unggah rekaman (MP3, M4A, WAV, MP4, WEBM · maks. 20 MB)</label><input type="file" accept=".mp3,.m4a,.wav,.mp4,.webm,.mpeg,.mpga,audio/*" id="transcriptFile" ${readonly?'disabled':''}></div>
    <div class="transcript-grid-actions"><button class="btn transcript-live-start" data-action="transcript-live" ${readonly?'disabled':''}>🔴 Mulai Rekam + Teks Langsung</button><button class="btn secondary" data-action="transcript-record" ${readonly?'disabled':''}>● Rekam audio saja</button><button class="btn ghost" data-action="transcript-stop" ${readonly?'disabled':''}>■ Hentikan</button><button class="btn secondary" data-action="transcript-record-wav" ${readonly?'disabled':''}>🎙 Rekam kompatibel (WAV)</button><button class="btn secondary" data-action="transcript-dictate" ${readonly?'disabled':''}>🎤 Dikte browser (Umum)</button></div><p class="hint">Rekam + Teks Langsung membutuhkan internet, sesi Supabase, dan aktivasi layanan pada Cloudflare. Suara dikirim saat perekaman berlangsung setelah persetujuan. Teks muncul bertahap setelah koneksi berhasil; kata sementara bisa dikoreksi AI. Durasi maksimal 10 menit per sesi. Pada iPhone gunakan Safari dengan layar menyala.</p>
    <div id="transcriptLiveBanner" class="transcript-live-banner" role="status" aria-live="polite">Belum merekam. Tekan tombol Rekam + Teks Langsung untuk menampilkan teks sambil berbicara.</div>
    <div id="transcriptPreview">${audioFile?`<audio controls preload="metadata" src="${esc(audioUrl)}"></audio><p class="hint">${esc(audioFile.name)} (${fmtBytes(audioFile.size)})</p>`:''}</div>
    <label class="transcript-prompt"><input type="checkbox" id="transcriptConsent" ${draft.consent?'checked':''} ${readonly?'disabled':''}> Saya sudah memperoleh izin perekaman dan memastikan konten ini boleh diproses oleh layanan pengenal suara sesuai aturan instansi.</label>
    <div class="transcript-grid-actions"><button class="btn" data-action="transcript-process" ${readonly?'disabled':''}>✦ Ubah rekaman menjadi teks</button><button class="btn ghost" data-action="transcript-cancel" >Batal proses</button></div>
    <p class="transcript-status" id="transcriptStatus" role="status" aria-live="polite"></p>
    <div class="field"><label for="transcriptText">Teks dari suara — muncul langsung di sini, koreksi setelah berhenti</label><textarea id="transcriptText" maxlength="80000" placeholder="Saat Rekam + Teks Langsung aktif, kata-kata muncul di sini. Anda juga boleh menempel hasil dari perangkat lain atau mengetik manual." ${readonly?'disabled':''}>${esc(draft.text)}</textarea><p class="hint">${draft.text.length.toLocaleString('id-ID')} karakter. Periksa nama, angka, kutipan, dan keputusan secara manual.</p></div>
    <label class="transcript-prompt"><input type="checkbox" id="transcriptVerified" ${draft.verified?'checked':''} ${readonly?'disabled':''}> Saya sudah membaca dan mengoreksi teks di atas. Simpan sebagai <b>draf pribadi</b>, bukan dokumen resmi.</label>
    <div class="transcript-grid-actions"><button class="btn" data-action="transcript-save" ${readonly?'disabled':''}>✓ Simpan teks terenkripsi</button><button class="btn secondary" data-action="transcript-new">＋ Transkrip baru</button><button class="btn ghost" data-action="transcript-export">↓ Unduh TXT</button></div>
    <h4>Hasil dari satu rekaman</h4><p class="hint">Satu kali transkrip disimpan, semua jenis draf dapat dihasilkan tanpa mengetik ulang.</p><div class="transcript-grid-actions"><button class="btn" data-action="transcript-bundle">✦ Buat semua draf sekaligus</button><button class="btn secondary" data-action="transcript-export-bundle">↓ Unduh paket draf TXT</button></div><div class="transcript-results">${[['minutes','Draf notulensi'],['summary','Petikan bahan ringkasan'],['followup','Calon tindak lanjut'],['evidence','Metadata bukti dukung']].map(([id,label])=>`<button class="btn secondary" data-action="transcript-output" data-kind="${id}">${label}</button>`).join('')}</div>
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
  const startBtn=document.querySelector?.('[data-action="transcript-live"]');if(startBtn){startBtn.disabled=active;startBtn.textContent=active?'🔴 Sedang merekam & mengetik…':'🔴 Mulai Rekam + Teks Langsung';}
 }
 async function startLive(){
  if(liveStarting||recordStarting||recordStopping||recorder||working)throw Error('Ada perekaman atau proses lain yang masih berjalan. Tekan Hentikan dahulu.');
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
 async function startRecording(forceWav=false){
  if(liveStarting||recordStarting||recordStopping||recorder)throw Error('Rekaman masih berlangsung atau sedang disiapkan. Tekan Hentikan dahulu.');
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
 function stopDictation(){if(recognition){const r=recognition;recognition=null;try{r.stop();}catch{}}}
 function startDictation(){
  if(recognition){stopDictation();status('Dikte dihentikan. Periksa dan koreksi hasilnya.');return;}
  if(!draft.consent)throw Error('Centang persetujuan pemrosesan suara sebelum mulai dikte.');
  if(draft.classification!=='Umum')throw Error('Dikte browser hanya untuk klasifikasi Umum. Gunakan pengetikan manual untuk materi internal/terbatas.');
  const Speech=root.SpeechRecognition||root.webkitSpeechRecognition;
  if(!Speech)throw Error('Dikte langsung tidak tersedia di browser ini. Gunakan Rekam atau Unggah, lalu transkripsikan.');
  const r=new Speech();speechBase=draft.text;speechResults=[];r.lang='id-ID';r.continuous=true;r.interimResults=true;
  r.onresult=event=>{
   for(let i=event.resultIndex;i<event.results.length;i++)speechResults[i]={text:event.results[i][0].transcript,final:event.results[i].isFinal};
   const text=(speechBase+' '+speechResults.map(x=>x.text).join(' ')).trim().slice(0,U.MAX_TEXT_CHARS);
   draft.text=text;draft.verified=false;
   const area=el('transcriptText');if(area)area.value=text;
   const checkbox=el('transcriptVerified');if(checkbox)checkbox.checked=false;
   status('Dikte berjalan. Teks sementara bisa berubah; jangan tutup halaman.');
  };
  r.onerror=e=>status('Dikte browser: '+String(e.error||'tidak tersedia')+'. Coba rekam/upload.',true);
  r.onend=()=>{if(recognition===r){recognition=null;status('Dikte selesai. Periksa seluruh teks sebelum menyimpan.');}};
  recognition=r;r.start();status('Dikte berjalan. Ucapkan dengan jelas. Ketuk tombol dikte lagi untuk berhenti.');
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
  if(recorder||liveStarting)throw Error('Tekan Hentikan sebelum menyimpan teks.');
  requireChecked();const recs=records(),current=recs.find(x=>x.id===draft.id),other=recs.filter(x=>x.id!==draft.id);
  if(!current&&recs.length>=30)throw Error('Maksimal 30 transkrip. Unduh dan hapus riwayat lama terlebih dahulu.');
  if(other.reduce((n,x)=>n+String(x.text||'').length,0)+draft.text.length>800000)throw Error('Kapasitas teks brankas transkrip mencapai 800.000 karakter. Arsipkan riwayat lama.');
  const now=isoNow(),record={id:current?.id||uid('TRS'),title:draft.title,text:draft.text,classification:draft.classification,sourceFilename:draft.filename||current?.sourceFilename||'',performanceYear:current?.performanceYear||myActiveYear(),createdAt:current?.createdAt||now,verifiedAt:now,updatedAt:now,classificationNote:'Draf, belum disahkan'};
  if(current)Object.assign(current,record);else recs.push(record);
  await queueSave();draft.id=record.id;render();showBundle();toast('Transkrip tersimpan terenkripsi. Paket draf otomatis tersedia. Audio tidak disimpan.');
 }
 async function process(){
  if(working)throw Error('Proses masih berjalan.');
  if(recorder||liveStarting||recordStarting)throw Error('Hentikan rekaman dahulu sebelum memproses audio ulang.');
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
 function stopAll(){clearTimeout(liveTimer);liveTimer=null;recorderEpoch++;liveHandle?.abort();liveHandle=null;liveStarting=false;liveConnected=false;markLiveEditing(false);if(controller)controller.abort();controller=null;working=false;stopDictation();discardOnStop=true;recorder?.abort();recorder=null;recordStopping=false;}
 function leave(){stopAll();}
 function secureLock(){discardOnStop=true;stopAll();if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl='';audioFile=null;draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};}
 function action(button){const a=button?.dataset?.action||'';if(!a.startsWith('transcript-'))return false;
  const actions={'transcript-live':startLive,'transcript-record':()=>startRecording(false),'transcript-record-wav':()=>startRecording(true),'transcript-stop':stopRecording,'transcript-dictate':startDictation,'transcript-process':process,'transcript-cancel':cancel,'transcript-save':save,'transcript-new':clearDraft,'transcript-export':downloadText,'transcript-bundle':showBundle,'transcript-export-bundle':exportBundle,'transcript-output':()=>showOutput(button.dataset.kind),'transcript-copy-output':copyOutput,'transcript-load':()=>load(button.dataset.id),'transcript-delete':()=>remove(button.dataset.id),'transcript-link':linkMeeting,'transcript-create-task':createTask,'transcript-create-evidence':createEvidence};
  // Execute immediately within the real tap/click gesture (important for iOS microphone/Web Audio permissions).
  try{Promise.resolve(actions[a]?.()).catch(e=>{if(e.name==='AbortError')status('Permintaan dibatalkan.');else status(e.message||'Operasi gagal.',true);});}
  catch(e){status(e.message||'Operasi gagal.',true);}return true;
 }
 root.SIPETAK_TRANSCRIPT={page,action,change,input,stopAll,leave,secureLock,records,outputs:U.outputs};
})(window);
