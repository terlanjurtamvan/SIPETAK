'use strict';
/* Personal navigation map and one-entry work notebook; vault persistence stays in app.js. */
(function(root){
 const modules=[
  {id:'dashboard',name:'Dashboard',group:'Ringkasan',what:'Ringkasan catatan dan pekerjaan',state:'ada'},
  {id:'catatan',name:'Catatan Kerja',group:'Masukan',what:'Satu catatan pribadi, draf tugas dan bukti',state:'baru'},
  {id:'transkripsi',name:'Transkripsi Suara',group:'Masukan',what:'Rekam WAV + ketik di browser yang mendukung',state:'terbatas'},
  {id:'persidangan',name:'Persidangan',group:'Rapat',what:'Agenda dan draf hasil rapat',state:'ada'},
  {id:'sekretaris',name:'Asisten Sekwan',group:'Rapat',what:'Peta alur, Raperda, tamu, kontak cepat',state:'ada'},
  {id:'raperda',name:'Raperda / DIM',group:'Rapat',what:'Catatan pembahasan dan matriks DIM',state:'ada'},
  {id:'tugas',name:'Tugas Harian',group:'Pekerjaan',what:'Jurnal pribadi dan tenggat',state:'ada'},
  {id:'telaah',name:'Telaahan Staf',group:'Pekerjaan',what:'Draf telaahan dan kajian',state:'ada'},
  {id:'bukti',name:'Bukti Dukung',group:'Pekerjaan',what:'Metadata, lampiran dan tautan',state:'ada'},
  {id:'otomasi',name:'Pusat Otomasi',group:'Otomasi',what:'Menghubungkan sumber, siklus dan bukti',state:'ada'},
  {id:'siklus',name:'Siklus Kerja',group:'Otomasi',what:'Jejak kerja dari diterima sampai arsip',state:'ada'},
  {id:'sla',name:'SLA & Pengingat',group:'Otomasi',what:'Pantau tenggat yang sudah diisi',state:'terbatas'},
  {id:'ai',name:'Asisten AI',group:'Otomasi',what:'Draf opsional dengan pengaturan layanan',state:'opsional'},
  {id:'asisten',name:'Asisten Draf',group:'Otomasi',what:'Pemeriksaan kelengkapan lokal',state:'ada'},
  {id:'tahun',name:'Tahun Kinerja',group:'Kinerja',what:'Tahun aktif dan arsip',state:'ada'},
  {id:'rhk',name:'Pemetaan RHK',group:'Kinerja',what:'Pemetaan berdasarkan SKP yang diperiksa',state:'ada'},
  {id:'skp',name:'SKP & Rencana Aksi',group:'Kinerja',what:'Draf rencana aksi, belum pengesahan',state:'ada'},
  {id:'referensi',name:'Peta Kinerja',group:'Kinerja',what:'Rujukan IKU/IKI/RHK',state:'ada'},
  {id:'laporan',name:'Laporan',group:'Hasil',what:'Rekap pribadi, cetak PDF dan CSV',state:'ada'},
  {id:'pustaka',name:'Pustaka Hukum',group:'Hasil',what:'Daftar referensi untuk diverifikasi',state:'ada'},
  {id:'supabase',name:'Supabase',group:'Simpan',what:'Sinkronisasi bila dikonfigurasi',state:'opsional'},
  {id:'sinkron',name:'Sinkronisasi',group:'Simpan',what:'Layanan server opsional',state:'opsional'},
  {id:'pengaturan',name:'Pengaturan',group:'Simpan',what:'Cadangan dan keamanan brankas',state:'ada'},
  {id:'panduan',name:'Panduan Penggunaan',group:'Simpan',what:'Langkah kerja dan cara cetak',state:'ada'}
 ];
 const label={ada:'Ada di kode',baru:'Baru',terbatas:'Tergantung browser/izin',opsional:'Perlu layanan/konfigurasi'};
 let tab='as-is';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function link(id,labelText,extra=''){return `<button type="button" class="solo-module" data-action="navigate" data-view="${esc(id)}"><span class="solo-module-name">${esc(labelText)}</span>${extra?`<span class="solo-module-hint">${esc(extra)}</span>`:''}<span aria-hidden="true">↗</span></button>`;}
 function mapFlow(isNow){
  if(!root.SIPETAK_FLOW)return '';
  const common={
   id:isNow?'solo-current':'solo-target',
   kicker:isNow?'AS-IS / PETA TERSEDIA':'TO-BE / VISI OTOMASI',
   title:isNow?'Dari satu catatan ke hasil kerja':'Satu input. Banyak hasil. Tetap Anda yang kendalikan.',
   subtitle:isNow?'Alur yang sudah ada dalam kode. Pilih simpul untuk membuka halaman.':'Rancangan otomatisasi lintas modul. Garis putus-putus adalah target, bukan fitur yang sudah aktif.',
   chip:isNow?'PETA MODUL AKTIF':'TARGET / BELUM SEMUA AKTIF',
   footer:isNow?'Proses dapat berpindah modul lewat satu ketukan. Setiap draf dan bukti tetap Anda verifikasi.':'Target pengembangan, bukan janji otomatisasi sudah berjalan. Simpul mengarah ke modul terkait yang sudah ada.'
  };
  const current={
   nodes:[
    {id:'note',title:'Catatan sekali input',note:'Catatan Kerja pribadi',icon:'✎',tone:'mint',x:125,y:115,view:'catatan'},
    {id:'record',title:'Rekam + transkrip',note:'Rekaman WAV dan teks',icon:'◉',tone:'blue',x:125,y:400,view:'transkripsi'},
    {id:'sekwan',title:'Asisten Sekwan',note:'Disposisi, tamu, Raperda',icon:'◈',tone:'violet',x:385,y:115,view:'sekretaris'},
    {id:'meeting',title:'Agenda persidangan',note:'Rapat dan bahan kerja',icon:'▣',tone:'blue',x:385,y:400,view:'persidangan'},
    {id:'review',title:'Sudah diperiksa?',note:'Koreksi draf / fakta',icon:'✓',tone:'amber',x:630,y:250,view:'asisten',shape:'decision'},
    {id:'reports',title:'Notulen & Risalah',note:'Draf dari transkrip',icon:'▤',tone:'pink',x:872,y:105,view:'transkripsi'},
    {id:'task',title:'Tugas dan bukti',note:'Tautan pekerjaan',icon:'☑',tone:'mint',x:872,y:270,view:'tugas'},
    {id:'archive',title:'Laporan / PDF',note:'Rekap dan cetak',icon:'⇩',tone:'violet',x:872,y:440,view:'laporan'}
   ],
   edges:[{from:'note',to:'sekwan'},{from:'record',to:'meeting'},{from:'sekwan',to:'review'},{from:'meeting',to:'review'},{from:'review',to:'reports'},{from:'review',to:'task'},{from:'review',to:'archive'}],
   mobileOrder:['note','record','sekwan','meeting','review','reports','task','archive'],
   legend:['● Input dan modul nyata','◇ Pemeriksaan manual','➜ Klik simpul = buka halaman']
  };
  const future={
   nodes:[
    {id:'source',title:'Satu masukan',note:'Catatan / suara / dokumen',icon:'✦',tone:'mint',x:118,y:260,view:'catatan'},
    {id:'sort',title:'Jenis kegiatan?',note:'Pilih alur terkait',icon:'◇',tone:'amber',shape:'decision',x:345,y:260,view:'otomasi'},
    {id:'rapat',title:'Draf rapat',note:'Notulen & Risalah',icon:'▣',tone:'pink',x:563,y:106,view:'transkripsi'},
    {id:'tugas',title:'Draf pekerjaan',note:'Tugas & pengingat',icon:'☑',tone:'blue',x:563,y:270,view:'tugas'},
    {id:'sekwan',title:'Tindak lanjut Sekwan',note:'Tracking & koordinasi',icon:'◈',tone:'violet',x:563,y:435,view:'sekretaris',planned:true},
    {id:'verify',title:'Verifikasi saya',note:'Validasi & koreksi',icon:'✓',tone:'amber',shape:'decision',x:778,y:270,view:'asisten'},
    {id:'deliver',title:'Output & arsip',note:'PDF / bukti / rekap',icon:'⇩',tone:'mint',x:938,y:270,view:'laporan',planned:true}
   ],
   edges:[{from:'source',to:'sort'},{from:'sort',to:'rapat'},{from:'sort',to:'tugas'},{from:'sort',to:'sekwan',planned:true},{from:'rapat',to:'verify'},{from:'tugas',to:'verify'},{from:'sekwan',to:'verify',planned:true},{from:'verify',to:'deliver',planned:true}],
   mobileOrder:['source','sort','rapat','tugas','sekwan','verify','deliver'],
   legend:['● Fitur tersedia/sebagian','◇ Langkah verifikasi','⇢ Garis putus = target belum otomatis']
  };
  return root.SIPETAK_FLOW.render({...common,...(isNow?current:future)});
 }
 function mapPage(){
   const groups=['Masukan','Rapat','Pekerjaan','Otomasi','Kinerja','Hasil','Simpan','Ringkasan'];
   const isNow=tab==='as-is';
   const routeNow=[
     {num:'01',title:'CATAT & REKAM',desc:'Masukan pribadi',nodes:[['catatan','Catatan Kerja'],['transkripsi','Rekam + transkrip'],['persidangan','Agenda rapat']]},
     {num:'02',title:'KELOLA',desc:'Draf kerja terhubung',nodes:[['sekretaris','Asisten Sekwan'],['raperda','DIM / Raperda'],['tugas','Tugas harian']]},
     {num:'03',title:'PERIKSA',desc:'Cek isi sebelum digunakan',nodes:[['asisten','Pemeriksa draf'],['bukti','Bukti pendukung'],['sla','Pantau tenggat']]},
     {num:'04',title:'HASIL',desc:'Simpan, cetak, pakai ulang',nodes:[['laporan','Laporan / PDF'],['pengaturan','Cadangan terenkripsi'],['peta','Kembali ke peta']]}
   ];
   const routeFuture=[
     {num:'01',title:'SATU MASUKAN',desc:'Satu catatan / hasil rekam',nodes:[['catatan','Catatan sekali input'],['transkripsi','Transkrip diperiksa']]},
     {num:'02',title:'KETERKAITAN',desc:'Draf otomatis sesuai jenis',nodes:[['otomasi','Aturan & relasi'],['sekretaris','Asisten Sekwan']]},
     {num:'03',title:'TINJAU PRIBADI',desc:'Tidak mengarang keputusan',nodes:[['asisten','Verifikasi draf'],['bukti','Pemeriksaan bukti']]},
     {num:'04',title:'BANYAK KELUARAN',desc:'Cetak dan arsip',nodes:[['laporan','Ringkasan & laporan'],['pengaturan','Arsip / backup']]}
   ];
   const route=isNow?routeNow:routeFuture;
   const lane=route.map((s,i)=>`<section class="solo-route-stage"><span class="solo-route-index">${s.num}</span><h4>${esc(s.title)}</h4><p>${esc(s.desc)}</p><div class="solo-route-links">${s.nodes.map(([id,name])=>link(id,name)).join('')}</div>${i<route.length-1?'<span class="solo-route-next" aria-hidden="true">→</span>':''}</section>`).join('');
   const groupsHtml=groups.map(g=>`<details class="solo-group" ${['Masukan','Rapat'].includes(g)?'open':''}><summary>${esc(g)} <span>${modules.filter(m=>m.group===g).length} modul</span></summary><div class="solo-group-content">${modules.filter(m=>m.group===g).map(m=>`<div class="solo-module-wrap">${link(m.id,m.name,m.what)}<span class="solo-state ${esc(m.state)}">${esc(label[m.state])}</span></div>`).join('')}</div></details>`).join('');
   const futureRows=[
     {title:'Catatan kerja',source:'catatan',result:'Tugas, agenda, telaahan, metadata bukti',status:'Sebagian sudah berjalan',target:'Pemilahan otomatis lintas modul yang lebih lengkap',open:'otomasi'},
     {title:'Rekaman rapat',source:'transkripsi',result:'Transkrip, Notulen, Risalah',status:'Bekerja pada browser yang mendukung',target:'Pengenalan suara lintas browser tanpa benturan mikrofon',open:'transkripsi'},
     {title:'Asistensi Sekwan',source:'sekretaris',result:'Disposisi, tracking Raperda, tamu, kontak cepat',status:'Register pribadi tersedia',target:'Pengingat dan tindak lanjut terpadu dari semua sumber',open:'sekretaris'},
     {title:'Kinerja pribadi',source:'skp',result:'RHK, bukti, rencana aksi, laporan',status:'Draf dan relasi tersedia',target:'Rekap otomatis yang tetap bisa diaudit',open:'laporan'}
   ];
   return `<section class="solo-map-hero"><div><span class="solo-map-eyebrow">NAVIGASI PRIBADI · MODUL SIPETAK</span><h3>🗺 Peta Kerja Interaktif</h3><p>Buka pekerjaan langsung dari simpul flowchart yang saling terhubung. Dibuat untuk <b>satu pengguna</b>, sebagai pengganti buku catatan dan kertas kerja.</p></div><button class="btn secondary" data-action="navigate" data-view="catatan">＋ Mulai catatan</button></section>
   <div class="solo-tabs" role="group" aria-label="Mode peta"><button type="button" class="${isNow?'active':''}" aria-pressed="${isNow}" data-action="solo-map-tab" data-tab="as-is">● Saat Ini (AS-IS)</button><button type="button" class="${!isNow?'active':''}" aria-pressed="${!isNow}" data-action="solo-map-tab" data-tab="to-be">◇ Target Otomatis (TO-BE)</button></div>
   <section class="solo-map-overview"><div><b>${isNow?'Alur yang bisa digunakan sekarang':'Rancangan alur yang ingin dicapai'}</b><p>${isNow?'Simpul di bawah membuka modul nyata. Ketersediaan fitur bergantung pada browser, izin, dan konfigurasi.':'Target bukan janji fitur aktif. Kartu berwarna solid membuka modul yang sudah ada; simpul bergaris putus adalah pengembangan mendatang.'}</p></div><span class="solo-mode-chip">${isNow?'TERSEDIA DALAM KODE':'PETA PENGEMBANGAN'}</span></section>
   ${mapFlow(isNow)||`<div class="solo-route" aria-label="Peta alur kerja ${isNow?'saat ini':'target'}">${lane}</div>`}
   ${isNow?`<div class="solo-note"><b>Batas saat ini:</b> audio WAV diunduh manual; hasil otomatis harus diperiksa; Supabase/AI butuh konfigurasi; otomatisasi antar semua modul belum menyeluruh.</div><div class="solo-map-sectionhead"><h3>Semua modul — klik untuk membuka</h3><p>Kelompokkan sesuai pekerjaan. Pilih kelompok untuk melihat tombol modul.</p></div><div class="solo-groups solo-accordions">${groupsHtml}</div>`:
     `<div class="solo-note"><b>Status target:</b> hanya otomatisasi catatan dan draf tertentu sudah tersedia. Sinkronisasi penuh, pengesahan dokumen dan penilaian resmi bukan tindakan otomatis.</div><div class="solo-map-sectionhead"><h3>Jalur pengembangan prioritas</h3><p>Klik "Buka modul" untuk melihat fitur yang sudah ada; target bergaris putus belum tersedia.</p></div><div class="solo-future-lanes">${futureRows.map(x=>`<article class="solo-future"><div class="solo-future-top">${link(x.source,x.title)}<span class="solo-future-status">${esc(x.status)}</span></div><div class="solo-future-built"><span>HASIL SAAT INI</span><p>${esc(x.result)}</p></div><div class="solo-future-target"><span>RENCANA BERIKUTNYA · BELUM AKTIF</span><p>${esc(x.target)}</p></div>${link(x.open,'Buka modul terkait →')}</article>`).join('')}</div>`}
   <section class="card solo-bottom"><h3>${isNow?'Mulai tanpa mengisi berulang':'Kembangkan tanpa mengganggu pekerjaan'}</h3><p>${isNow?'Gunakan Catatan Kerja sekali input atau ambil transkrip terverifikasi. Draf turunannya tertaut ke sumber.':'Perluasan dilakukan bertahap dan diuji. Hasil rapat, keputusan, data hukum, serta nilai SKP tetap harus Anda periksa.'}</p><div class="actions"><button class="btn" data-action="navigate" data-view="catatan">＋ Catatan Kerja</button><button class="btn secondary" data-action="navigate" data-view="sekretaris">◈ Peta Asisten Sekwan</button></div></section>`;
 }
 function notesPage(){
  const checkedTranscripts=(data?.transcriptions||[]).filter(x=>x?.verifiedAt&&Number(x.performanceYear)===Number(myActiveYear()));
  const notes=(Array.isArray(data?.personalNotes)?data.personalNotes:[]).filter(x=>Number(x.performanceYear)===Number(myActiveYear())).slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  return `<div class="solo-heading"><h3>Catatan Kerja Pribadi</h3><p>Pengganti buku catatan. Sekali input dapat membuat draf tugas, agenda, telaahan dan metadata bukti yang saling terhubung. Semuanya tetap perlu diperiksa.</p><div class="actions"><button class="btn ghost" data-action="navigate" data-view="peta">🗺 Buka Peta Kerja</button><button class="btn ghost" data-action="navigate" data-view="pengaturan">🔒 Cadangan Data</button></div></div>
  <section class="card solo-entry"><h3>＋ Catatan baru</h3><form id="soloNoteForm">${checkedTranscripts.length?`<div class="solo-import"><label for="soloTranscriptSelect">Gunakan transkrip yang sudah diperiksa (opsional)</label><div class="solo-import-row"><select id="soloTranscriptSelect"><option value="">— Pilih transkrip —</option>${checkedTranscripts.map(t=>`<option value="${esc(t.id)}">${esc(t.title)} · ${esc((t.createdAt||'').slice(0,10))}</option>`).join('')}</select><button type="button" class="btn secondary" data-action="solo-import-transcript">Isi dari transkrip</button></div><small id="soloImportStatus">Teks disalin ke formulir ini secara lokal. Periksa sebelum menyimpan.</small></div>`:''}<input type="hidden" name="sourceTranscriptionId" id="soloTranscriptId" value=""><div class="solo-formgrid"><label>Judul catatan <input name="title" maxlength="180" required placeholder="Contoh: Menyiapkan bahan rapat Bapemperda" ${myYearArchived()?'disabled':''}></label><label>Jenis catatan <select name="type" ${myYearArchived()?'disabled':''}><option value="tugas">Tugas / pekerjaan</option><option value="rapat">Rapat / persidangan</option><option value="telaah">Telaahan / kajian</option><option value="dokumen">Dokumen / bahan kerja</option><option value="disposisi">Disposisi / arahan</option><option value="raperda">Raperda / DIM</option><option value="catatan">Catatan bebas</option></select></label><label>Tanggal <input name="date" type="date" value="${esc(today())}" required ${myYearArchived()?'disabled':''}></label><label>Klasifikasi <select name="classification" ${myYearArchived()?'disabled':''}><option>Internal</option><option>Umum</option><option>Terbatas</option></select></label><label>Tenggat (jika ada) <input name="deadlineAt" type="datetime-local" ${myYearArchived()?'disabled':''}></label></div><label class="solo-body-label">Isi catatan <textarea name="content" rows="6" maxlength="30000" required placeholder="Tuliskan informasi sekali di sini. Tugas dan dokumen akan merujuk ke catatan sumber." ${myYearArchived()?'disabled':''}></textarea></label><label class="solo-check"><input type="checkbox" name="auto" value="yes" checked ${myYearArchived()?'disabled':''}> Buat otomatis draf terkait (tugas, agenda/telaahan bila sesuai, dan metadata bukti bila relevan)</label><p class="hint">Tidak memerlukan AI/API. Draf metadata bukti <b>belum menjadi bukti sah</b>. Tidak mengirim catatan ke layanan AI. Untuk materi Terbatas, ikuti aturan instansi.</p><button class="btn" type="submit" ${myYearArchived()?'disabled':''}>Simpan sekali, buat draf terkait</button><span id="soloFeedback" role="status" class="solo-feedback"></span></form></section>
  <section class="card"><div class="section-head"><div><h3>Catatan tersimpan · ${esc(myActiveYear())}</h3><p>${notes.length} catatan tersimpan dalam brankas terenkripsi perangkat ini</p></div></div>${notes.length?`<div class="solo-notes">${notes.map(n=>`<article class="solo-saved"><div><div class="solo-note-head"><b>${esc(n.title)}</b><small>${esc(n.date)} · ${esc(n.type)} · ${esc(n.classification)}</small></div><p>${esc(n.content.slice(0,350))}${n.content.length>350?'…':''}</p><p class="hint">${n.generated?.length?'Draf terkait: '+n.generated.length+' keluaran · ':''}Status: belum diverifikasi</p></div><div class="solo-related">${(n.generated||[]).map(item=>link(item.target,({tasks:'Tugas',meetings:'Persidangan',reviews:'Telaahan',directives:'Disposisi',dims:'Raperda / DIM',evidence:'Metadata bukti'})[item.collection]||item.collection)).join('')}</div></article>`).join('')}</div>`:'<p class="hint">Belum ada catatan. Isi formulir di atas untuk membuat catatan pertama.</p>'}</section>`;
 }
 function dashboard(){return `<section class="solo-dashboard"><div><b>Ruang kerja satu orang</b><span>Catat sekali, hubungkan draf, periksa, lalu cetak atau arsipkan.</span></div><div class="actions"><button class="btn secondary" data-action="navigate" data-view="catatan">＋ Catatan Baru</button><button class="btn ghost" data-action="navigate" data-view="peta">🗺 Peta Kerja</button></div></section>`;}
 function automationPanel(){const notes=(data?.personalNotes||[]).filter(x=>Number(x.performanceYear)===Number(myActiveYear()));const outputs=notes.reduce((n,x)=>n+(x.generated?.length||0),0);return `<section class="card solo-automation"><h3>Otomasi catatan pribadi</h3><p>Aturan lokal menghasilkan draf terhubung, bukan dokumen yang disahkan. Tugas dan tenggat masuk daftar kerja; metadata bukti baru dianggap lengkap setelah diperiksa.</p><div class="solo-stats"><span><b>${notes.length}</b> catatan sumber</span><span><b>${outputs}</b> draf tertaut</span></div><div class="actions"><button class="btn secondary" data-action="navigate" data-view="catatan">Kelola catatan</button><button class="btn ghost" data-action="navigate" data-view="peta">Lihat peta alur</button></div></section>`;}
 function action(el){
   if(el.dataset.action==='solo-map-tab'){tab=el.dataset.tab==='to-be'?'to-be':'as-is';render();return true}
   if(el.dataset.action==='solo-import-transcript'){
     const id=document.getElementById('soloTranscriptSelect')?.value,record=(data?.transcriptions||[]).find(x=>x.id===id&&x.verifiedAt&&Number(x.performanceYear)===Number(myActiveYear()));
     if(!record){toast('Pilih transkrip yang sudah diperiksa dahulu.',true);return true}
     if(String(record.text||'').length>30000){toast('Transkrip terlalu panjang untuk satu catatan. Bagi menjadi beberapa bagian sebelum impor.',true);return true}
     const form=document.getElementById('soloNoteForm');if(!form)return true;
     if(form.elements.content?.value.trim()&&!confirm('Ganti isi catatan yang belum disimpan dengan teks transkrip?'))return true;
     form.elements.title.value=String(record.title||'').slice(0,180);
     form.elements.content.value=String(record.text||'');
     form.elements.type.value='rapat';
     form.elements.classification.value=record.classification||'Internal';
     form.elements.sourceTranscriptionId.value=record.id;
     const status=document.getElementById('soloImportStatus');if(status)status.textContent='Transkrip terverifikasi diisi ke formulir. Periksa lalu tekan Simpan sekali.';
     form.elements.content.focus();return true;
   }
   return false;
  }
 async function save(event){event.preventDefault();if(!data||!myAllowWrite())return;const form=event.target,btn=form.querySelector('[type="submit"]'),feedback=document.getElementById('soloFeedback');const v=Object.fromEntries(new FormData(form));btn.disabled=true;feedback.textContent='Menyimpan di brankas…';try{
   const core=root.SIPETAK_SOLO_CORE;if(!core)throw Error('Mesin catatan belum dimuat.');const now=isoNow(),note=core.normalize(v,{id:uid('CTT'),now,year:myActiveYear()});
   if(Array.isArray(data.personalNotes)&&data.personalNotes.some(x=>x.id===note.id))throw Error('Catatan duplikat.');
   const d=core.derivatives(note,uid,{auto:v.auto==='yes'});const auditsBefore=data.audit?.length||0;const eventsBefore=data.automationEvents?.length||0;const lifecycleBefore=data.lifecycle?.length||0;const result=core.apply(data,note,d);if(!result.created)throw Error('Catatan ini sudah ada.');
   for(const entry of d){if(typeof wfAudit==='function')wfAudit(entry.collection,'Draf otomatis dari catatan pribadi',entry.record)}
   if(typeof wfAudit==='function')wfAudit('catatan','Dicatat',note);
   try{await queueSave()}catch(e){ // Do not misrepresent encrypted persistence on failure.
     const i=data.personalNotes?.findIndex(x=>x.id===note.id);if(i>=0)data.personalNotes.splice(i,1);
     for(const entry of d){const a=data[entry.collection];const idx=a.findIndex(x=>x.id===entry.record.id);if(idx>=0)a.splice(idx,1)}
     if(Array.isArray(data.audit))data.audit.splice(0,Math.max(0,data.audit.length-auditsBefore));
     if(Array.isArray(data.lifecycle))data.lifecycle.splice(lifecycleBefore);
     if(Array.isArray(data.automationEvents))data.automationEvents.splice(eventsBefore);
     throw e;
   }
   render();toast(`Catatan tersimpan. ${d.length} draf terkait dibuat.`);
  }catch(e){feedback.textContent=e.message||'Gagal menyimpan';btn.disabled=false;toast(e.message||'Gagal membuat catatan',true)}
 }
 root.SIPETAK_SOLO={modules,mapPage,notesPage,dashboard,automationPanel,action,save};
})(window);
