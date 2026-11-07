'use strict';
/* SIPETAK Transkripsi: non-destructive feature module. No raw audio is stored in the vault. */
(function(root){
 const U=root.SIPETAK_TRANSCRIPT_UTILS;
 const allowedClass=['Umum','Internal','Terbatas'];
 let draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};
 let audioFile=null,audioUrl='',recorder=null,micStream=null,working=false,controller=null;
 let recognition=null,speechBase='',speechResults=[],discardOnStop=false;
 let recordingPending=false,recordingRequestId=0,recordingTimer=null,recordingStartedAt=0;
 const el=id=>document.getElementById(id);
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function status(message,isError=false){const x=el('transcriptStatus');if(x){x.textContent=message;x.style.color=isError?'#b73b32':'';}else if(isError&&typeof toast==='function')toast(message,true);}
 function available(){return !!data&&!!vaultKey;}
 function records(){if(!available())return [];if(!Array.isArray(data.transcriptions))data.transcriptions=[];return data.transcriptions;}
 function previewAudio(file){if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl='';audioFile=file;if(file){audioUrl=URL.createObjectURL(file);draft.filename=file.name;}const mount=el('transcriptPreview');if(mount){mount.innerHTML=file?`<audio controls preload="metadata" src="${esc(audioUrl)}"></audio><p class="hint">${esc(file.name)} (${fmtBytes(file.size)}) · Audio hanya disimpan sementara di halaman. <a href="${esc(audioUrl)}" download="${esc(file.name)}">Unduh rekaman sebelum menutup halaman</a>.</p>`:'';const audio=mount.querySelector?.('audio');audio?.addEventListener?.('error',()=>status('File audio terbentuk tetapi tidak bisa diputar oleh browser ini. Unduh rekaman sebelum menutup halaman; coba buka lewat aplikasi File/Voice Memos, atau rekam dengan aplikasi bawaan lalu unggah ke SIPETAK.',true),{once:true});}}
 function readyOutputs(){try{return U.outputs(draft.title,draft.text,today());}catch{return null;}}
 function page(){
  if(!available())return '<section class="card">Brankas harus dibuka dahulu.</section>';
  const readonly=!!myYearArchived(),list=records().filter(x=>Number(x.performanceYear)===Number(myActiveYear())).slice().reverse();
  const meetingChoices=myItems('meetings').map(m=>`<option value="${esc(m.id)}" ${draft.meetingId===m.id?'selected':''}>${esc(m.title||'Agenda tanpa nama')}</option>`).join('');
  return `<div class="section-head"><div><h3>🎙 Transkripsi Suara & Notulensi</h3><p>Rekam atau unggah sekali, kemudian periksa transkrip untuk membuat berbagai draf pekerjaan.</p></div></div>
  <div class="callout warn"><b>Privasi:</b> Audio hanya dikirim ke penyedia AI setelah Anda menyetujui. Jangan kirim rapat rahasia/terbatas atau rapat yang belum mendapat izin rekam. Hasil AI bisa keliru. Brankas hanya menyimpan teks yang Anda setujui, bukan audio. Mode dikte browser bisa menggunakan layanan pengenal suara pihak ketiga.</div>
  <div class="transcript-pane">
   <section class="card transcript-card">
    <div class="field"><label for="transcriptTitle">Nama kegiatan / agenda</label><input id="transcriptTitle" maxlength="160" placeholder="Contoh: Rapat pembahasan Raperda" value="${esc(draft.title)}" ${readonly?'disabled':''}></div>
    <div class="field"><label for="transcriptClass">Klasifikasi rekaman</label><select id="transcriptClass" ${readonly?'disabled':''}>${allowedClass.map(x=>`<option ${x===draft.classification?'selected':''}>${x}</option>`).join('')}</select><p class="hint">Klasifikasi Terbatas tidak boleh dikirim ke layanan transkripsi eksternal.</p></div>
    <div class="field"><label for="transcriptFile">Unggah rekaman (MP3, M4A, WAV, MP4, WEBM · maks. 20 MB)</label><input type="file" accept=".mp3,.m4a,.wav,.mp4,.webm,.mpeg,.mpga,audio/*" id="transcriptFile" ${readonly?'disabled':''}></div>
    <div class="transcript-grid-actions"><button type="button" class="btn secondary" data-action="transcript-record" aria-pressed="false" ${readonly?'disabled':''}>● Mulai rekam</button><button type="button" class="btn ghost" data-action="transcript-stop" ${readonly?'disabled':''}>■ Hentikan</button><button type="button" class="btn secondary" data-action="transcript-dictate" ${readonly?'disabled':''}>🎤 Ketik saat bicara (opsional)</button></div>
    <p id="transcriptRecordIndicator" class="transcript-record-indicator" aria-live="polite">Mikrofon belum aktif</p>
    <p class="transcript-status" id="transcriptStatus" role="status" aria-live="polite">Tekan Mulai rekam, lalu izinkan akses mikrofon bila diminta.</p>
    <p class="hint">Langkah: Mulai rekam → izinkan mikrofon → berbicara → Hentikan → dengarkan hasil → Ubah rekaman menjadi teks. Teks tidak muncul selama mode rekam biasa.</p>
    <div id="transcriptPreview">${audioFile?`<audio controls preload="metadata" src="${esc(audioUrl)}"></audio><p class="hint">${esc(audioFile.name)} (${fmtBytes(audioFile.size)})</p>`:''}</div>
    <label class="transcript-prompt"><input type="checkbox" id="transcriptConsent" ${draft.consent?'checked':''} ${readonly?'disabled':''}> Saya sudah memperoleh izin perekaman dan memastikan konten ini boleh diproses oleh layanan pengenal suara sesuai aturan instansi.</label>
    <div class="transcript-grid-actions"><button class="btn" data-action="transcript-process" ${readonly?'disabled':''}>✦ Ubah rekaman menjadi teks</button><button class="btn ghost" data-action="transcript-cancel" >Batal proses</button></div>
    <div class="field"><label for="transcriptText">Hasil ketik otomatis — koreksi di sini</label><textarea id="transcriptText" maxlength="80000" placeholder="Hasil rekaman akan muncul di sini. Anda juga boleh menempel hasil dari perangkat lain atau mengetik manual." ${readonly?'disabled':''}>${esc(draft.text)}</textarea><p class="hint">${draft.text.length.toLocaleString('id-ID')} karakter. Periksa nama, angka, kutipan, dan keputusan secara manual.</p></div>
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
 function mimeChoice(){
  // Let Safari select its native format when a declared preference is unsupported.
  const options=['audio/mp4','audio/webm;codecs=opus','audio/webm'];
  return options.find(v=>root.MediaRecorder?.isTypeSupported?.(v))||'';
 }
 function microphoneError(err){
  if(err?.name==='NotAllowedError'||err?.name==='PermissionDeniedError'||err?.name==='SecurityError')return 'Akses mikrofon ditolak. Buka SIPETAK langsung di Safari/Chrome melalui HTTPS, izinkan Mikrofon untuk situs ini, muat ulang halaman, lalu coba lagi.';
  if(err?.name==='NotFoundError'||err?.name==='DevicesNotFoundError')return 'Mikrofon tidak ditemukan. Pastikan perangkat memiliki mikrofon yang aktif.';
  if(err?.name==='NotReadableError'||err?.name==='TrackStartError')return 'Mikrofon sedang digunakan aplikasi lain atau tidak dapat dibaca. Tutup aplikasi perekam/panggilan lain, lalu coba lagi.';
  if(err?.name==='OverconstrainedError')return 'Pengaturan mikrofon tidak sesuai dengan perangkat. Coba lagi di browser utama.';
  return err?.message||'Gagal memulai rekaman. Periksa izin mikrofon dan coba dari browser Safari/Chrome.';
 }
 function recordingUI(active,pending=false){
  const button=document.querySelector?.('[data-action="transcript-record"]');
  if(button){button.textContent=pending?'◌ Menunggu izin mikrofon':active?'● Sedang merekam':'● Mulai rekam';button.setAttribute?.('aria-pressed',String(active));}
  const indicator=el('transcriptRecordIndicator');
  if(indicator){indicator.textContent=pending?'◌ Menunggu izin mikrofon…':active?'● Mikrofon aktif — suara sedang direkam':'Mikrofon belum aktif';indicator.dataset.state=pending?'pending':active?'recording':'idle';}
 }
 function clearRecordingTimer(){if(recordingTimer){clearInterval(recordingTimer);recordingTimer=null;}recordingStartedAt=0;recordingUI(false);}
 function recordingElapsed(){return Math.max(0,Math.floor((Date.now()-recordingStartedAt)/1000));}
 function stopMicrophone(){micStream?.getTracks().forEach(t=>{try{t.stop();}catch{}});micStream=null;}
 async function startRecording(){
  if(recordingPending||recorder?.state==='recording'){status('Rekaman sudah berlangsung atau sedang menunggu izin mikrofon.');return;}
  if(!root.isSecureContext||!navigator.mediaDevices?.getUserMedia||!root.MediaRecorder)throw Error('Perekaman memerlukan browser dengan dukungan mikrofon dan situs HTTPS. Buka SIPETAK di Safari/Chrome, bukan browser di dalam aplikasi lain.');
  stopDictation();recordingPending=true;const requestId=++recordingRequestId;
  recordingUI(false,true);
  status('Meminta izin mikrofon. Pilih Izinkan / Allow pada permintaan browser.');
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}
  catch(err){if(requestId===recordingRequestId){recordingPending=false;recordingUI(false);throw Error(microphoneError(err));}return;}
  if(requestId!==recordingRequestId){stream.getTracks().forEach(t=>t.stop());return;}
  recordingPending=false;micStream=stream;
  const mimeType=mimeChoice();let activeRecorder;
  try{
   activeRecorder=new root.MediaRecorder(stream,mimeType?{mimeType}:undefined);
   recorder=activeRecorder;discardOnStop=false;
   const chunks=[];
   activeRecorder.addEventListener('dataavailable',event=>{if(event.data?.size)chunks.push(event.data);});
   activeRecorder.addEventListener('error',event=>{status('Perekaman gagal: '+microphoneError(event.error),true);if(activeRecorder.state==='recording')activeRecorder.stop();});
   activeRecorder.addEventListener('stop',()=>{
    const discarded=discardOnStop;
    const type=chunks.find(c=>c.type)?.type||activeRecorder.mimeType||mimeType||'audio/webm';
    const ext=/mp4|aac/.test(type)?'m4a':/wav/.test(type)?'wav':'webm';
    const file=new File([new Blob(chunks,{type})],'rekaman-sipetak-'+Date.now()+'.'+ext,{type});
    clearRecordingTimer();stopMicrophone();if(recorder===activeRecorder)recorder=null;
    if(discarded){discardOnStop=false;return;}
    try{U.validateAudio(file);previewAudio(file);status('Rekaman selesai ('+fmtBytes(file.size)+'). Dengarkan audio, lalu tekan Ubah rekaman menjadi teks.');}
    catch(err){status('Tidak ada audio yang dapat disimpan: '+(err.message||'rekaman kosong')+'. Pastikan izin mikrofon aktif dan coba lagi.',true);}
   },{once:true});
   activeRecorder.start(); // Safari handles final dataavailable on stop more reliably without a timeslice.
   recordingStartedAt=Date.now();recordingUI(true);
   status('● Sedang merekam (00:00). Tekan Hentikan untuk menyelesaikan audio.');
   recordingTimer=setInterval(()=>{
    if(recorder!==activeRecorder||activeRecorder.state!=='recording'){clearRecordingTimer();return;}
    const n=recordingElapsed();status('● Sedang merekam ('+String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')+'). Tekan Hentikan untuk menyelesaikan audio.');
   },1000);
   for(const track of stream.getAudioTracks()){track.addEventListener?.('ended',()=>{if(recorder===activeRecorder&&activeRecorder.state==='recording'){status('Mikrofon terputus. Mengakhiri rekaman…',true);activeRecorder.stop();}},{once:true});}
  }catch(err){clearRecordingTimer();stopMicrophone();recorder=null;throw Error(microphoneError(err));}
 }
 function stopRecording(){
  if(recordingPending){status('Browser masih meminta izin mikrofon. Jawab permintaan Izinkan, lalu tekan Hentikan.');return;}
  if(recorder?.state==='recording'){status('Mengakhiri rekaman dan menyiapkan audio…');clearRecordingTimer();recorder.stop();}
  else status(audioFile?'Rekaman sudah selesai. Dengarkan hasil, kemudian ubah menjadi teks.':'Belum ada rekaman aktif. Tekan Mulai Rekam terlebih dahulu.');
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
  requireChecked();const recs=records(),current=recs.find(x=>x.id===draft.id),other=recs.filter(x=>x.id!==draft.id);
  if(!current&&recs.length>=30)throw Error('Maksimal 30 transkrip. Unduh dan hapus riwayat lama terlebih dahulu.');
  if(other.reduce((n,x)=>n+String(x.text||'').length,0)+draft.text.length>800000)throw Error('Kapasitas teks brankas transkrip mencapai 800.000 karakter. Arsipkan riwayat lama.');
  const now=isoNow(),record={id:current?.id||uid('TRS'),title:draft.title,text:draft.text,classification:draft.classification,sourceFilename:draft.filename||current?.sourceFilename||'',performanceYear:current?.performanceYear||myActiveYear(),createdAt:current?.createdAt||now,verifiedAt:now,updatedAt:now,classificationNote:'Draf, belum disahkan'};
  if(current)Object.assign(current,record);else recs.push(record);
  await queueSave();draft.id=record.id;render();showBundle();toast('Transkrip tersimpan terenkripsi. Paket draf otomatis tersedia. Audio tidak disimpan.');
 }
 async function process(){
  if(working)throw Error('Proses masih berjalan.');
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
  if(working)throw Error('Batalkan transkripsi yang berjalan terlebih dahulu.');stopRecording();stopDictation();previewAudio(null);
  draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};render();
 }
 function load(id){const row=records().find(x=>x.id===id);if(!row)throw Error('Transkrip tidak ditemukan.');stopDictation();if(recorder?.state==='recording')stopRecording();previewAudio(null);
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
 function stopAll(){if(controller)controller.abort();controller=null;working=false;recordingRequestId++;recordingPending=false;stopDictation();if(recorder?.state==='recording')recorder.stop();clearRecordingTimer();stopMicrophone();}
 function leave(){stopAll();}
 function secureLock(){discardOnStop=true;stopAll();if(audioUrl)URL.revokeObjectURL(audioUrl);audioUrl='';audioFile=null;draft={title:'',text:'',classification:'Internal',verified:false,consent:false,meetingId:'',id:'',filename:''};}
 function action(button){const a=button?.dataset?.action||'';if(!a.startsWith('transcript-'))return false;
  const actions={'transcript-record':startRecording,'transcript-stop':stopRecording,'transcript-dictate':startDictation,'transcript-process':process,'transcript-cancel':cancel,'transcript-save':save,'transcript-new':clearDraft,'transcript-export':downloadText,'transcript-bundle':showBundle,'transcript-export-bundle':exportBundle,'transcript-output':()=>showOutput(button.dataset.kind),'transcript-copy-output':copyOutput,'transcript-load':()=>load(button.dataset.id),'transcript-delete':()=>remove(button.dataset.id),'transcript-link':linkMeeting,'transcript-create-task':createTask,'transcript-create-evidence':createEvidence};
  // Invoke immediately within the click gesture; some mobile browsers require it for microphone access.
  try{Promise.resolve(actions[a]?.()).catch(e=>{if(e.name==='AbortError')status('Permintaan dibatalkan.');else status(e.message||'Operasi gagal.',true);});}
  catch(e){status(e.message||'Operasi gagal.',true);}return true;
 }
 root.SIPETAK_TRANSCRIPT={page,action,change,input,stopAll,leave,secureLock,records,outputs:U.outputs};
})(window);
