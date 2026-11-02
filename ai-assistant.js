'use strict';
/* SIPETAK v3.8 — AI opt-in, no automatic vault submission. No browser-side AI secrets.
   Outputs remain unverified drafts. All records stored in the existing AES-GCM vault. */
(function(root){
  const MODES={
    telaahan:{label:'Telaahan staf',hint:'Konsep persoalan, dasar, analisis, alternatif dan rekomendasi.',purpose:'Susun konsep telaahan staf secara sistematis berdasarkan hanya materi yang diberikan. Tandai dasar hukum yang belum diverifikasi. Jangan mengarang pasal atau data.',collections:['tasks','reviews','directives','dims']},
    persidangan:{label:'Persidangan DPRD',hint:'Draf ringkasan bahan rapat atau risalah; bukan risalah yang disahkan.',purpose:'Buat draf ringkasan persidangan, agenda, pokok pembahasan, tindak lanjut dan daftar fakta yang masih harus dilengkapi. Jangan mengarang peserta, pernyataan, keputusan atau hasil voting.',collections:['meetings','tasks']},
    dim:{label:'Raperda & DIM',hint:'Draf inventarisasi isu dan alternatif rumusan.',purpose:'Analisis isu dan opsi redaksi DIM/Raperda dari teks yang tersedia. Pisahkan fakta, ketentuan yang dapat dirujuk, dan hal yang perlu cek hukum terbaru. Jangan mengarang nomor pasal.',collections:['dims','reviews','tasks']},
    skp:{label:'SKP & RHK',hint:'Narasi capaian berdasarkan data, bukan penetapan angka realisasi.',purpose:'Susun draf narasi kinerja dari data terbatas yang diberikan. Jangan menyatakan target tercapai 100%, menghitung capaian resmi IKI/SKP, atau menyatakan bukti telah diverifikasi.',collections:['tasks','reviews','evidence'],summary:true},
    harian:{label:'Prioritas harian',hint:'Saran prioritas dan langkah tindak lanjut.',purpose:'Urutkan rekomendasi langkah kerja harian, tenggat dan risiko dari data yang tersedia. Jangan mengubah status, menilai dokumen sah, atau menganggap arahan AI sebagai disposisi atasan.',collections:['tasks','directives','meetings'],alerts:true}
  };
  const FIELDS={
    tasks:['title','date','deadlineAt','deadline','priority','category','status','source','output','notes','rhkId','ikiId'],
    reviews:['title','date','status','assignment','issue','facts','law','analysis','alternatives','recommendation','followup'],
    directives:['title','type','receivedAt','dueAt','priority','status','source','output','notes'],
    meetings:['title','type','meetingAt','place','source','prepDueAt','prepStatus','minutesDueAt','minutesStatus','materials','result','followup'],
    dims:['title','perda','article','dueAt','status','current','issue','proposal','law','result'],
    evidence:['title','date','type','classification','description','rhkId']
  };
  let mode='telaahan',selected='',selectedKeys=[],notes='',previewEdited=false,currentOutput='',currentSource='',currentTitle='',busy=false,abort=null,localPlan=null,dashSnapshot=null,dashCategories=['tasks','directives','meetings'];
  const maxPreview=7700;
  const clean=x=>String(x??'').replace(/\u0000/g,'').trim();
  const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isRestricted=r=>/^(?:sangat\s+rahasia|rahasia|terbatas|confidential|secret)(?:\b|$)/i.test(clean(r?.classification));
  function list(vault,year,which=mode){
    const config=MODES[which];if(!config)return [];
    const arr=[];
    for(const collection of config.collections){
      for(const r of vault[collection]||[]){
        if(Number(r.performanceYear)!==Number(year)||!r.id||isRestricted(r))continue;
        arr.push({key:collection+':'+r.id,label:(collection==='tasks'?'Tugas':collection==='reviews'?'Telaahan':collection==='directives'?'Disposisi':collection==='meetings'?'Rapat':collection==='dims'?'DIM':'Bukti')+' · '+clean(r.title||r.perda||r.id).slice(0,70),collection,record:r});
      }
    }
    if(config.summary)arr.unshift({key:'special:skp',label:'Ringkasan SKP bulan ini (angka draf saja)',special:'skp'});
    if(config.alerts)arr.unshift({key:'special:alerts',label:'Daftar pemantauan prioritas tahun ini',special:'alerts'});
    return arr.slice(0,150);
  }
  function sourceText(vault,year,key,which=mode){
    if(!key)return '';
    const item=list(vault,year,which).find(x=>x.key===key);
    if(!item)throw Error('Catatan tidak ditemukan atau tidak diizinkan untuk AI.');
    if(item.special==='skp'){
      const m=new Date().getFullYear()===Number(year)?new Date().getMonth()+1:1;
      // Ringkasan hanya dari metadata catatan yang tidak berklasifikasi terbatas.
      const safe={...vault};for(const name of ['tasks','reviews','directives','meetings','dims','evidence','skpActions','rhks','ikis'])if(Array.isArray(vault[name]))safe[name]=vault[name].filter(x=>!isRestricted(x));
      const s=root.SIPETAK_AUTOMATION?.summarize(safe,year,m);
      if(!s)return 'Tidak ada ringkasan yang tersedia.';
      return `Tahun: ${year}, bulan: ${m}\nPekerjaan tercatat: ${s.total}\nPekerjaan selesai: ${s.done}\nPekerjaan selesai dengan hasil dan bukti metadata lengkap: ${s.proven}\nRHK (hitungan draf): ${JSON.stringify(s.byRhk.map((x,i)=>({rhk:clean((safe.rhks||[]).find(r=>r.id===x.key)?.title||`RHK ${i+1}`),pekerjaan:x.tasks,selesai:x.completed,berbukti:x.supported})))}\nIKI (hitungan draf): ${JSON.stringify(s.byIki.map((x,i)=>({indikator:`IKI ${i+1} (periksa kode indikator di SIPETAK)`,pekerjaan:x.tasks,selesai:x.completed,berbukti:x.supported})))}\nPERINGATAN: angka tersebut bukan realisasi SKP resmi, bukan validasi kualitas bukti.`;
    }
    if(item.special==='alerts'){
      const keyByKind={task:'tasks',review:'reviews',directive:'directives',meeting:'meetings',dim:'dims',evidence:'evidence',skp:'skpActions'};
      const alerts=(root.SIPETAK_AUTOMATION?.alerts(vault,year)||[]).filter(x=>{const collection=keyByKind[x.kind];const record=collection&&(vault[collection]||[]).find(r=>r.id===x.sourceId);return record&&!isRestricted(record)}).slice(0,12);
      return alerts.length?alerts.map((x,i)=>`${i+1}. ${x.kind}: ${x.title} — ${x.message}`).join('\n'):'Belum ada temuan prioritas yang terdeteksi. Periksa data sumber sebelum menganggap tidak ada pekerjaan.';
    }
    if(isRestricted(item.record))throw Error('Dokumen berklasifikasi terbatas/rahasia tidak boleh dikirim ke AI.');
    const row=Object.fromEntries((FIELDS[item.collection]||[]).filter(k=>typeof item.record[k]==='string'&&clean(item.record[k])).map(k=>[k,clean(item.record[k])]));
    return `Jenis: ${item.collection}\nTahun: ${year}\n`+Object.entries(row).map(([k,v])=>`${k}: ${v}`).join('\n');
  }
  // Sumber yang dipilih eksplisit; tidak menyalin seluruh brankas, ID atau lampiran.
  function compose(vault,year,which=mode,key=selectedKeys,extra=notes){
    if(!MODES[which])throw Error('Jenis bantuan AI tidak dikenali.');
    const keys=(Array.isArray(key)?key:[key]).filter(Boolean);
    if(keys.length>3||new Set(keys).size!==keys.length)throw Error('Pilih maksimal 3 catatan berbeda.');
    const src=keys.map((id,i)=>'CATATAN TERPILIH '+(i+1)+':\n'+sourceText(vault,year,id,which)).join('\n\n---\n\n');
    const note=clean(extra);
    if(note.length>1800)throw Error('Catatan tambahan maksimal 1.800 karakter.');
    const full=[src,note&&'KONTEKS YANG ANDA KETIK:\n'+note].filter(Boolean).join('\n\n');
    if(!full)throw Error('Pilih catatan pekerjaan atau tuliskan konteks sendiri.');
    if(full.length>maxPreview)throw Error('Materi melebihi 7.700 karakter. Hapus informasi yang tidak diperlukan di pratinjau.');
    return {mode:which,sourceText:full,consent:true};
  }
  // TAHAP 6: rekomendasi berbasis aturan dibuat HANYA dari catatan yang dipilih.
  // Tidak ada pemindaian seluruh brankas, perubahan data, atau pengiriman jaringan.
  const localDate=(value)=>{
    const m=clean(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/);
    if(!m)return null;
    const y=Number(m[1]),mo=Number(m[2]),d=Number(m[3]);
    const date=new Date(y,mo-1,d,12,0,0);
    return date.getFullYear()===y&&date.getMonth()+1===mo&&date.getDate()===d?date:null;
  };
  const localDay=(value)=>{const dt=localDate(value);return dt?`${String(dt.getFullYear())}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`:'';};
  const priorityDate=(kind,record)=>{
    const field={tasks:['deadlineAt','deadline'],directives:['dueAt'],meetings:['prepDueAt','minutesDueAt','meetingAt'],dims:['dueAt'],reviews:[],evidence:[]}[kind]||[];
    return field.map(key=>localDay(record[key])).filter(Boolean).sort()[0]||'';
  };
  const doneStatus=s=>/^(selesai|tuntas|ditutup|final|disahkan|telah selesai)$/i.test(clean(s));
  const suggestedStep=kind=>({tasks:'Periksa keluaran pekerjaan, selesaikan tahapan tersisa, dan perbarui status setelah bukti diperiksa.',directives:'Konfirmasi batas waktu dan siapkan tindak lanjut disposisi sesuai kewenangan.',meetings:'Periksa bahan rapat, ringkasan hasil, dan tenggat pekerjaan setelah rapat.',dims:'Periksa rumusan, isu hukum yang perlu diverifikasi, dan status pembahasan DIM.',reviews:'Periksa fakta, dasar hukum, alternatif, serta persetujuan atas konsep telaahan.',evidence:'Periksa kelengkapan metadata dan lokasi bukti pada penyimpanan yang disetujui.'}[kind]||'Periksa catatan dan tentukan tindak lanjut yang diperlukan.');
  function localAnalysis(vault,year,keys,now=new Date(),which=mode){
    if(!Array.isArray(keys)||keys.length<1||keys.length>3||new Set(keys).size!==keys.length)throw Error('Pilih 1 sampai 3 catatan berbeda untuk analisis lokal.');
    const allowed=list(vault,year,which);
    const base=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);
    const entries=keys.map((key,index)=>{
      const found=allowed.find(x=>x.key===key);
      if(!found||found.special||!found.record||isRestricted(found.record))throw Error('Analisis lokal hanya berlaku untuk catatan biasa yang masih diizinkan.');
      const row=found.record,deadline=priorityDate(found.collection,row),due=localDate(deadline);
      const days=due?Math.round((due-base)/86400000):null;
      const done=doneStatus(row.status),urgent=/^(tinggi|mendesak|urgent|kritik|kritis)$/i.test(clean(row.priority));
      const score=done?0:(days!==null&&days<0?5:days!==null&&days<=3?4:days!==null&&days<=7?3:urgent?3:days!==null?2:1);
      const flag=done?'Sudah ditandai selesai':days!==null&&days<0?'Lewat tenggat':days!==null&&days<=3?'Tenggat dekat':urgent?'Prioritas tinggi':days===null?'Tenggat tidak tersedia':'Dalam pemantauan';
      const suggestion=done?'Periksa kelengkapan hasil dan bukti; jangan mengubah status tanpa kebutuhan.':suggestedStep(found.collection);
      return {key,index:index+1,title:clean(row.title||row.perda||'Catatan tanpa judul').slice(0,110),kind:found.collection,deadline,days,status:clean(row.status)||'Belum dicatat',priority:clean(row.priority)||'Tidak dicatat',flag,score,suggestion};
    });
    entries.sort((a,b)=>b.score-a.score||a.index-b.index);
    return {year:Number(year),which,keys:[...keys],entries};
  }
  function validLocalPlan(){
    if(!localPlan||localPlan.year!==Number(myActiveYear())||localPlan.which!==mode||localPlan.keys.join('|')!==selectedKeys.join('|'))return null;
    // Kaji ulang tiap pilihan, termasuk klasifikasi/status/tenggat yang mungkin berubah.
    try{
      const current=localAnalysis(data,myActiveYear(),selectedKeys,new Date(),mode);
      return JSON.stringify(current.entries)===JSON.stringify(localPlan.entries)?localPlan:null;
    }catch{return null}
  }
  function localPlanText(plan,includeTitles=false){
    return ['RENCANA TINDAK LANJUT (SARAN LOKAL — BUKAN DISPOSISI ATAU KEPUTUSAN)','Tahun kinerja: '+plan.year,
      ...plan.entries.map(x=>`Catatan pilihan ${x.index}${includeTitles?' ('+x.title+')':''}: ${x.flag}; status ${x.status}; tenggat ${x.deadline||'belum tersedia'}. Saran: ${x.suggestion}`),
      'Verifikasi ulang fakta, tenggat, kewenangan, dan bukti sebelum menerapkan perubahan.'].join('\n');
  }
  function localPlanHtml(){
    const plan=validLocalPlan();
    if(!plan)return '<p class="hint">Belum ada analisis. Pilih catatan lalu tekan Analisis lokal. Tidak ada data yang dikirim.</p>';
    return `<p class="hint">Analisis aturan sederhana dari ${plan.entries.length} catatan yang kamu pilih. Prioritas bukan perintah atasan atau penilaian resmi.</p>`+
      plan.entries.map(x=>`<div class="ai-plan-item"><div class="ai-plan-line"><b>${escape(x.title)}</b><span class="ai-plan-flag">${escape(x.flag)}</span></div><p class="hint">${escape(x.kind)} · Status: ${escape(x.status)} · Tenggat: ${escape(x.deadline||'tidak tercatat')}</p><p>${escape(x.suggestion)}</p>${(['tasks','reviews'].includes(x.kind)&&!myYearArchived())?`<button type="button" class="btn ghost sm" data-action="ai-open-selected-form" data-key="${escape(x.key)}">Buka formulir untuk ditinjau</button>`:''}</div>`).join('')+
      `<div class="actions"><button type="button" class="btn secondary sm" data-action="ai-use-plan">Tambahkan saran ke pratinjau AI</button><button type="button" class="btn ghost sm" data-action="ai-save-plan" ${myYearArchived()?'disabled':''}>Simpan rencana sebagai draf terenkripsi</button></div><p class="hint">Menambah saran akan menghapus persetujuan sebelumnya. Tidak ada perubahan status otomatis.</p>`;
  }
  function updateLocalPanel(){const out=document.getElementById('aiLocalResult');if(out)out.innerHTML=localPlanHtml();}
  function invalidateLocalPlan(){localPlan=null;updateLocalPanel();}
  function analyzeLocally(){
    try{
      localPlan=localAnalysis(data,myActiveYear(),selectedKeys,new Date(),mode);
      updateLocalPanel();status('Analisis lokal selesai. Tidak ada catatan yang dikirim ke Worker.');
    }catch(err){localPlan=null;updateLocalPanel();status(err.message,true)}
  }
  function useLocalPlan(){
    const plan=validLocalPlan();if(!plan){status('Analisis sudah tidak sesuai dengan catatan terbaru. Buat analisis lokal lagi.',true);return}
    const input=document.getElementById('aiPreview');if(!input){status('Kolom pratinjau tidak tersedia.',true);return}
    const marker='RENCANA TINDAK LANJUT (SARAN LOKAL — BUKAN DISPOSISI ATAU KEPUTUSAN)';
    // Tahan teks yang sudah dihapus pengguna; jangan menyisipkan kembali judul atau isi mentah.
    const content=String(input.value||'');
    const start=content.indexOf(marker);
    const base=start<0?content:content.slice(0,start).trimEnd();
    const merged=base.trimEnd()+'\n\n'+localPlanText(plan);
    if(merged.length>maxPreview){status('Rencana melebihi kapasitas pratinjau. Ringkas atau hapus materi terlebih dahulu.',true);return}
    input.value=merged;previewEdited=true;invalidateDraft();
    const hint=document.getElementById('aiPreviewHint');if(hint)hint.textContent='Saran lokal ditambahkan. Sunting informasi sensitif dan centang persetujuan lagi jika ingin meminta draf AI.';
    status('Saran telah ditambahkan ke pratinjau (BELUM DIKIRIM). Periksa kembali sebelum meminta AI.');
  }
  async function saveLocalPlan(){
    const plan=validLocalPlan();if(!plan)throw Error('Jalankan ulang analisis sebelum menyimpan.');
    if(myYearArchived())throw Error('Tahun kinerja sudah diarsipkan.');
    if(!vaultKey||!data)throw Error('Buka brankas terlebih dahulu.');
    if(!confirm('Simpan rekomendasi ini hanya sebagai DRAF dalam brankas terenkripsi? Tidak mengubah status pekerjaan.'))return;
    const draft={id:uid('AI'),createdAt:isoNow(),performanceYear:myActiveYear(),mode:'harian',sourceKey:'',content:localPlanText(plan,true),classification:'Draf AI - belum diverifikasi'};
    data.aiDrafts||=[];data.aiDrafts.push(draft);
    if(data.aiDrafts.length>30)data.aiDrafts.splice(0,data.aiDrafts.length-30);
    await queueSave();render();toast('Rencana disimpan terenkripsi sebagai draf. Status pekerjaan tidak berubah.');
  }
  function openSelectedForm(key){
    const plan=validLocalPlan(),entry=plan?.entries.find(x=>x.key===key);
    if(!entry||!['tasks','reviews'].includes(entry.kind)||myYearArchived())throw Error('Formulir catatan tidak tersedia atau pilihan berubah.');
    // Bukalah formulir native. Pengguna sendiri yang meninjau dan menekan Simpan.
    const item=list(data,myActiveYear(),mode).find(x=>x.key===key);
    if(!item||isRestricted(item.record))throw Error('Catatan tidak lagi diizinkan.');
    const kind=entry.kind==='tasks'?'task':'review';
    navigate(kind==='task'?'tugas':'telaah');entityModal(kind,item.record.id);
    toast('Formulir terbuka. Tidak ada perubahan yang disimpan otomatis.');
  }
  // TAHAP 7: dashboard opt-in dari METADATA tahun/kategori yang dipilih.
  // Tidak otomatis meninjau isi brankas atau mengirim permintaan jaringan.
  const DASHBOARD_TYPES={tasks:'Tugas',directives:'Disposisi',meetings:'Rapat',dims:'Raperda/DIM',reviews:'Telaahan'};
  const DASHBOARD_START='[RINGKASAN DASHBOARD SIPETAK - SARAN LOKAL]';
  const DASHBOARD_END='[/RINGKASAN DASHBOARD SIPETAK]';
  function dashboardData(vault,year,categories,now=new Date()){
    if(!vault||!Array.isArray(categories)||!categories.length||categories.length>5||new Set(categories).size!==categories.length||categories.some(c=>!DASHBOARD_TYPES[c]))throw Error('Pilih sedikitnya satu kategori dashboard yang tersedia.');
    const start=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12,0,0);
    const rows=[];
    const count={total:0,pending:0,done:0,overdue:0,soon:0,unknown:0};
    for(const kind of categories){
      for(const r of (Array.isArray(vault[kind])?vault[kind]:[])){
        if(!r||!r.id||Number(r.performanceYear)!==Number(year)||isRestricted(r)||/\b(?:rahasia|terbatas|confidential|secret)\b/i.test(clean(r.classification)))continue;
        // Metadata saja: tidak mengakses notes, facts, material, proposal atau file.
        const state=kind==='meetings'
          ?[r.prepStatus,r.minutesStatus].filter(x=>clean(x)).length===2&&doneStatus(r.prepStatus)&&doneStatus(r.minutesStatus)
          :doneStatus(r.status);
        const day=kind==='meetings'
          ?[!doneStatus(r.prepStatus)&&r.prepDueAt,!doneStatus(r.minutesStatus)&&r.minutesDueAt].filter(Boolean).map(localDay).filter(Boolean).sort()[0]||''
          :priorityDate(kind,r);
        const when=localDate(day);
        const days=when?Math.round((when-start)/86400000):null;
        const overdue=!state&&days!==null&&days<0;
        const soon=!state&&days!==null&&days>=0&&days<=7;
        const important=/^(tinggi|mendesak|urgent|kritis|kritik)$/i.test(clean(r.priority));
        const score=state?0:overdue?6:soon&&days<=3?5:soon?4:important?3:days!==null?2:1;
        const flag=state?'Ditandai selesai':overdue?'Lewat tenggat':soon?'Tenggat 7 hari':important?'Prioritas tinggi':days===null?'Belum ada tenggat':'Dalam pemantauan';
        count.total++;if(state)count.done++;else count.pending++;
        if(overdue)count.overdue++;if(soon)count.soon++;if(!state&&days===null)count.unknown++;
        rows.push({key:kind+':'+String(r.id),kind,title:clean(r.title||r.perda||'Catatan tanpa judul').slice(0,100),day,
          status:kind==='meetings'?`Persiapan: ${clean(r.prepStatus)||'belum dicatat'}; risalah: ${clean(r.minutesStatus)||'belum dicatat'}`:(clean(r.status)||'Tidak dicatat'),score,flag,step:suggestedStep(kind)});
      }
    }
    rows.sort((a,b)=>b.score-a.score||((a.day||'9999').localeCompare(b.day||'9999'))||a.key.localeCompare(b.key));
    return {year:Number(year),categories:[...categories],date:localDay(now),count,rows:rows.slice(0,12)};
  }
  function validDashboard(){
    if(!dashSnapshot||dashSnapshot.year!==Number(myActiveYear())||dashSnapshot.categories.join('|')!==dashCategories.join('|'))return null;
    try{
      const check=dashboardData(data,myActiveYear(),dashCategories,new Date());
      if(JSON.stringify(check)!==JSON.stringify(dashSnapshot)){dashSnapshot=null;return null}
      return dashSnapshot;
    }catch{dashSnapshot=null;return null}
  }
  function dashboardText(result){
    const c=result.count;
    return [DASHBOARD_START,`Data ringkasan lokal tahun ${result.year}; kategori: ${result.categories.map(x=>DASHBOARD_TYPES[x]).join(', ')}.`,
      `Total catatan: ${c.total}; belum ditandai selesai: ${c.pending}; ditandai selesai: ${c.done}; melewati tenggat: ${c.overdue}; tenggat 7 hari: ${c.soon}; tanpa tenggat: ${c.unknown}.`,
      'Saran (bukan keputusan/penugasan): periksa pekerjaan melewati tenggat, konfirmasi status pekerjaan aktif, dan pastikan tenggat serta bukti dukung sesuai sumber.',
      'Ini ringkasan metadata untuk perencanaan, bukan hasil audit atau nilai SKP.',DASHBOARD_END].join('\n');
  }
  function dashboardHtml(){
    const report=validDashboard();
    if(!report)return '<p class="hint">Belum ada ringkasan aktif. Pilih kategori lalu tekan Tampilkan dashboard. Data tidak diproses untuk dashboard sebelum kamu meminta.</p>';
    const c=report.count;
    const metrics=[['Catatan',c.total],['Belum selesai',c.pending],['Lewat tenggat',c.overdue],['7 hari ke depan',c.soon],['Selesai (label)',c.done]];
    const metricHtml=metrics.map(([label,num])=>`<div class="ai-dashboard-metric"><strong>${num}</strong><span>${escape(label)}</span></div>`).join('');
    return `<p class="hint">Ringkasan lokal tahun ${report.year} • ${escape(report.categories.map(x=>DASHBOARD_TYPES[x]).join(', '))}. Hanya metadata catatan nonrahasia yang dipilih berdasarkan kategori; tanpa pengiriman jaringan.</p>`+
      `<div class="ai-dashboard-metrics">${metricHtml}</div>`+
      `<h4>Prioritas yang perlu ditinjau (maksimal 12)</h4>`+
      (report.rows.length?report.rows.map(r=>`<div class="ai-dashboard-item"><div class="ai-plan-line"><b>${escape(r.title)}</b><span class="ai-plan-flag">${escape(r.flag)}</span></div><p class="hint">${escape(DASHBOARD_TYPES[r.kind])} • ${escape(r.status)} • Tenggat: ${escape(r.day||'belum dicatat')}</p><p>${escape(r.step)}</p><button type="button" class="btn ghost sm" data-action="ai-dashboard-open" data-key="${escape(r.key)}">Buka modul ${escape(DASHBOARD_TYPES[r.kind])}</button></div>`).join(''):'<p class="hint">Tidak ada catatan nonrahasia dalam pilihan kategori dan tahun ini.</p>')+
      `<div class="actions"><button class="btn secondary sm" type="button" data-action="ai-dashboard-use">Tambahkan ringkasan tanpa judul catatan ke pratinjau AI</button></div><p class="hint">Tombol hanya menyiapkan teks, tidak mengirimnya. Periksa pratinjau dan beri persetujuan baru sebelum meminta AI.</p>`;
  }
  function dashboardPanel(){
    return `<section class="card ai-dashboard" aria-label="JARVIS Dashboard Cerdas"><div class="ai-dashboard-header"><div><h3>✦ JARVIS Dashboard Cerdas · Tahap 7</h3><p class="hint">Pilih kategori untuk ringkasan tahun kerja aktif. Penghitungan dilakukan <b>hanya di perangkat</b> setelah kamu menekan tombol; tidak membuka isi dokumen, lampiran, atau data berklasifikasi rahasia.</p></div><span class="ai-dashboard-local">Lokal</span></div>`+
      `<fieldset class="ai-dashboard-scope"><legend>Pilih kategori sumber (metadata saja)</legend>`+
      Object.entries(DASHBOARD_TYPES).map(([key,label])=>`<label><input type="checkbox" data-ai-dashboard-type="${key}" ${dashCategories.includes(key)?'checked':''}> ${escape(label)}</label>`).join('')+
      `</fieldset><div class="actions"><button type="button" class="btn secondary sm" data-action="ai-dashboard-run">Tampilkan dashboard</button><button type="button" class="btn ghost sm" data-action="ai-dashboard-clear">Kosongkan ringkasan</button></div><div id="aiDashboardResult" role="status" aria-live="polite">${dashboardHtml()}</div></section>`;
  }
  function updateDashboard(){const el=document.getElementById('aiDashboardResult');if(el)el.innerHTML=dashboardHtml();}
  function runDashboard(){
    try{dashSnapshot=dashboardData(data,myActiveYear(),dashCategories,new Date());updateDashboard();status('Dashboard lokal dibuat. Tidak ada data yang dikirim ke AI atau disimpan.');}
    catch(err){dashSnapshot=null;updateDashboard();status(err.message,true)}
  }
  function useDashboard(){
    const result=validDashboard();if(!result){updateDashboard();status('Ringkasan berubah atau sudah tidak berlaku. Tampilkan ulang dashboard.',true);return}
    const input=document.getElementById('aiPreview');if(!input){status('Kolom pratinjau tidak tersedia.',true);return}
    // Hapus hanya blok ringkasan lama. Teks lain yang telah diedit pengguna dipertahankan.
    let base=String(input.value||'');const start=base.indexOf(DASHBOARD_START);
    if(start!==-1){const end=base.indexOf(DASHBOARD_END,start);
      if(end===-1){status('Ringkasan lama telah diedit sebagian. Hapus penanda ringkasan lama secara manual dahulu.',true);return}
      base=(base.slice(0,start)+base.slice(end+DASHBOARD_END.length)).trim();
    }
    if(base.startsWith('Belum ada materi untuk dikirim:'))base='';
    const merged=[base,dashboardText(result)].filter(Boolean).join('\n\n');
    if(merged.length>maxPreview){status('Pratinjau terlalu panjang. Kurangi materi sebelum menambahkan ringkasan.',true);return}
    input.value=merged;previewEdited=true;invalidateDraft();
    const hint=document.getElementById('aiPreviewHint');if(hint)hint.textContent='Ringkasan dashboard ditambahkan tanpa nama atau isi catatan. Periksa, sunting, lalu setujui kembali jika ingin mengirim ke AI.';
    status('Ringkasan lokal ditambahkan ke pratinjau (BELUM DIKIRIM).');
  }
  function dashboardOpen(key){
    const report=validDashboard();if(!report||!report.rows.some(x=>x.key===key)){updateDashboard();throw Error('Pilihan dashboard berubah. Buat ringkasan baru.');}
    const kind=key.split(':')[0],route={tasks:'tugas',directives:'sekretaris',meetings:'persidangan',dims:'raperda',reviews:'telaah'}[kind];
    if(!route)throw Error('Modul tidak dikenali.');
    navigate(route); // Hanya membuka modul, tidak memperbarui catatan.
  }
  // Perlindungan tambahan di browser dan tetap diverifikasi ulang di Worker.
  const restrictedText=x=>/(?:^|\n)\s*(?:classification|klasifikasi)\s*:\s*(?:terbatas|rahasia|sangat rahasia|confidential|secret)\b/i.test(x);
  // Jangan pernah kirim token Supabase ke hostname Worker sembarang.
  // Host di bawah berasal dari dokumentasi Worker SIPETAK yang diunggah.
  // Jika deployment dipindahkan, daftar ini harus ditinjau di source code.
  const TRUSTED_AI_HOSTS=new Set(['sipetak-asisten-ai.terlanjurtamvan18.workers.dev','sipetak.pages.dev']);
  function endpoint(raw){
    const s=clean(raw);if(!s)throw Error('Alamat Worker AI belum diisi.');
    let u;try{u=new URL(s)}catch{throw Error('Alamat Worker AI harus berupa URL HTTPS yang lengkap.')}
    const h=u.hostname.toLowerCase();
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||u.pathname!=='/'||!TRUSTED_AI_HOSTS.has(h)){
      throw Error('Alamat Worker AI tidak diizinkan. Gunakan alamat SIPETAK yang tercantum dalam panduan proyek.');
    }
    return u.origin;
  }
  function healthText(info){
    if(!info||info.service!=='sipetak-asisten-ai'||typeof info.configured!=='boolean'||!info.checks||typeof info.checks!=='object'){
      return {ok:false,text:'Respons /health tidak dikenali sebagai layanan SIPETAK AI.'};
    }
    const labels={aiBinding:'AI binding',rateLimit:'pembatasan pemakaian',supabasePublicConfig:'konfigurasi publik Supabase',allowedOrigin:'alamat website yang diizinkan'};
    const missing=Object.entries(labels).filter(([key])=>info.checks[key]!==true).map(([,label])=>label);
    if(info.configured===true&&missing.length===0){
      return {ok:true,text:'Koneksi Worker siap'+(typeof info.version==='string'?' (versi '+info.version.slice(0,30)+')':'')+'. Ini belum menguji login pengguna atau jawaban model AI.'};
    }
    return {ok:false,text:'Worker terhubung, tetapi perlu konfigurasi: '+(missing.join(', ')||'periksa status konfigurasi Worker')+'. Periksa Cloudflare Workers Settings.'};
  }
  async function checkConnection(){
    const el=document.getElementById('aiHealthStatus');
    const btn=document.querySelector('[data-action="ai-test-connection"]');
    if(!el)return;
    let url;
    try{url=endpoint(document.getElementById('aiWorkerUrl')?.value||savedUrl())}
    catch(err){el.textContent=err.message;el.classList.add('ai-error');return}
    if(btn){btn.disabled=true;btn.textContent='Memeriksa…'}
    el.classList.remove('ai-error');el.textContent='Memeriksa konfigurasi Worker tanpa mengirim token atau catatan…';
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(url+'/health',{method:'GET',mode:'cors',cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
      if(!response.ok)throw Error('HTTP '+response.status);
      const result=healthText(await response.json());
      el.textContent=result.text;el.classList.toggle('ai-error',!result.ok);
    }catch(err){
      el.textContent=err?.name==='AbortError'?'Pemeriksaan melewati 10 detik. Coba lagi.':'Status Worker belum bisa dibaca ('+(err?.message||'koneksi gagal')+'). Periksa alamat, deployment, dan CORS /health.';
      el.classList.add('ai-error');
    }finally{clearTimeout(timer);if(btn){btn.disabled=false;btn.textContent='Uji koneksi AI'}}
  }
  function savedUrl(){return clean(data?.aiSettings?.workerUrl||document.querySelector('meta[name="sipetak-ai-worker-url"]')?.content||'');}
  function options(){return `<option value="">— Pilih catatan untuk ditambahkan —</option>`+list(data,myActiveYear()).filter(x=>!selectedKeys.includes(x.key)).map(x=>`<option value="${escape(x.key)}">${escape(x.label)}</option>`).join('')}
  function selectedSummary(){const allowed=list(data,myActiveYear());const picks=selectedKeys.map(key=>allowed.find(x=>x.key===key)).filter(Boolean);
    return picks.length?picks.map(x=>`<div class="ai-picked"><span>${escape(x.label)}</span><button class="btn ghost sm" type="button" data-action="ai-unpick" data-key="${escape(x.key)}" aria-label="Hapus ${escape(x.label)}">Hapus</button></div>`).join(''):'<p class="hint">Belum ada catatan dipilih. Kamu tetap dapat mengetik konteks sendiri.</p>'}
  function sourcePickerUpdate(){const target=document.getElementById('aiSelectedSources');if(target)target.innerHTML=selectedSummary();const sel=document.getElementById('aiSource');if(sel){sel.innerHTML=options();sel.disabled=selectedKeys.length>=3}const counter=document.getElementById('aiSourceCounter');if(counter)counter.textContent=selectedKeys.length+' dari 3 catatan dipilih.';}
  function getPreview(){try{return compose(data,myActiveYear()).sourceText}catch(e){return 'Belum ada materi untuk dikirim: '+e.message}}
  function drafts(){return (data.aiDrafts||[]).filter(x=>Number(x.performanceYear)===Number(myActiveYear())).slice().reverse().slice(0,15)}
  function page(){const opts=Object.entries(MODES).map(([id,m])=>`<option value="${id}" ${mode===id?'selected':''}>${escape(m.label)}</option>`).join(''),url=savedUrl(),preview=getPreview();
    return `<div class="section-head"><div><h3>✦ Asisten AI SIPETAK</h3><p>Pilih hingga 3 catatan, sunting materi yang boleh dikirim, lalu buat draf hanya setelah persetujuan.</p></div><button class="btn ghost" data-action="navigate" data-view="panduan">Panduan →</button></div>
    <div class="callout warn"><b>Perhatian data kedinasan:</b> layanan AI eksternal menerima teks yang disetujui. Jangan mengirim data rahasia, pribadi, dokumen belum diizinkan instansi, atau berkas berklasifikasi Terbatas. Lampiran tidak dikirim otomatis. AI dapat keliru dan tidak mengesahkan keputusan, hukum, risalah, atau SKP.</div>
    ${dashboardPanel()}
    ${root.SIPETAK_LEGAL_RAG?.panel(data?.laws||[],'ai')||''}
    <div class="ai-grid"><section class="card ai-work"><h3>1 · Pilih bantuan AI</h3><div class="field"><label for="aiMode">Jenis bantuan</label><select id="aiMode">${opts}</select></div><p class="hint">${escape(MODES[mode].hint)}</p>
    <div class="field"><label for="aiSource">Pilih catatan kerja (tahun ${myActiveYear()}, maksimal 3)</label><select id="aiSource" ${selectedKeys.length>=3?'disabled':''}>${options()}</select><div class="ai-picked-list" id="aiSelectedSources">${selectedSummary()}</div><p class="hint" id="aiSourceCounter">${selectedKeys.length} dari 3 catatan dipilih. Sumber tidak pernah dipilih otomatis.</p></div>
    <div class="field"><label for="aiNotes">Konteks tambahan (maks. 1.800 karakter)</label><textarea id="aiNotes" rows="5" maxlength="1800" placeholder="Tujuan draf atau pertanyaan yang ingin dijawab. Jangan masukkan data rahasia/pribadi.">${escape(notes)}</textarea></div>
    <section class="ai-plan-box" aria-label="Asisten Kerja Cerdas"><h3>✦ Asisten Kerja Cerdas · Analisis Lokal</h3><p class="hint">Analisis <b>hanya catatan yang dipilih</b> untuk menemukan tenggat, urutan prioritas, dan langkah berikutnya. Diproses di perangkat — tanpa koneksi AI, tanpa membaca seluruh brankas.</p><div class="actions"><button type="button" class="btn secondary sm" data-action="ai-local-analyze">Analisis 1–3 catatan terpilih</button></div><div id="aiLocalResult" role="status" aria-live="polite">${localPlanHtml()}</div></section>
    <h3>2 · Periksa dan sunting tepat apa yang akan dikirim</h3><p class="hint">Pratinjau ini dapat diedit untuk menghapus nama, data pribadi, dan rincian sensitif. <b>Hanya teks dalam kotak ini</b> yang dikirim setelah kamu memberi persetujuan. Tidak ada lampiran, ID internal, atau kunci brankas yang dikirim.</p><label for="aiPreview" class="hint">Materi untuk AI (maks. 7.700 karakter)</label><textarea id="aiPreview" class="ai-preview ai-preview-editable" rows="12" maxlength="7700" spellcheck="false">${escape(preview)}</textarea><p class="hint" id="aiPreviewHint">Sunting jika perlu; setiap perubahan membatalkan persetujuan sebelumnya.</p>
    <label class="ai-consent"><input type="checkbox" id="aiConsent"> <span>Saya sudah memeriksa teks di atas dan memastikan informasi ini <b>boleh diproses oleh penyedia AI</b> sesuai aturan instansi. Saya paham hasilnya hanya draf.</span></label>
    <div class="actions"><button type="button" class="btn" data-action="ai-send" ${busy?'disabled':''}>${busy?'Memproses…':'✦ Buat konsep dengan AI'}</button><button type="button" class="btn ghost" data-action="ai-reset">Kosongkan materi</button></div>
    <div id="aiStatus" role="status" aria-live="polite" class="hint">${busy?'Menghubungi layanan AI…':'AI hanya berjalan ketika Anda menekan tombol dan menyetujui materinya.'}</div></section>
    <div class="ai-side"><section class="card"><h3>Pengaturan koneksi</h3><p class="hint">Gunakan alamat Worker Cloudflare tersendiri. Tidak perlu API key AI pada iPhone.</p><div class="field"><label for="aiWorkerUrl">Alamat Worker AI</label><input id="aiWorkerUrl" type="url" value="${escape(url)}" placeholder="https://sipetak-asisten-ai.terlanjurtamvan18.workers.dev" autocomplete="off"></div><div class="actions"><button class="btn secondary sm" data-action="ai-save-url">Simpan alamat di brankas</button><button type="button" class="btn ghost sm" data-action="ai-test-connection">Uji koneksi AI</button></div><p id="aiHealthStatus" class="hint" role="status" aria-live="polite">Pemeriksaan koneksi tidak mengirim token login maupun materi pekerjaan.</p><p class="hint">${url?'Alamat sudah tersimpan/tersedia.':'Belum dihubungkan. AI tidak bisa menghasilkan teks sampai Worker dipasang.'} Login Supabase aktif diperlukan untuk membuat draf AI.</p></section>
    <section class="card"><h3>3 · Hasil konsep AI</h3><div id="aiResult">${currentOutput?resultHtml():'<p class="hint">Setelah diproses, hasil AI muncul di sini. Anda dapat menyalin atau menyimpan sebagai draf terenkripsi.</p>'}</div></section></div></div>
    <section class="card"><h3>Draf AI tersimpan dalam brankas tahun ${myActiveYear()}</h3><p class="hint">Draf bukan dokumen resmi, bukan bukti sah, dan tidak mengubah SKP atau status pekerjaan. Maksimal 30 draf terakhir tersimpan.</p><div class="ai-drafts">${drafts().length?drafts().map(x=>`<div class="ai-draft"><div><b>${escape(MODES[x.mode]?.label||'Draf AI')}</b><small>${escape(new Date(x.createdAt).toLocaleString('id-ID'))} · Draf untuk diverifikasi</small></div><div class="actions"><button class="btn sm ghost" data-action="ai-open-draft" data-id="${escape(x.id)}">Lihat</button><button class="btn sm danger" data-action="ai-delete-draft" data-id="${escape(x.id)}" ${myYearArchived()?'disabled':''}>Hapus</button></div></div>`).join(''):'<p class="hint">Belum ada draf AI yang disimpan.</p>'}</div></section>`;
  }
  // Render only a small, safe Markdown subset. Never trust AI text as HTML.
  // Source text in the AES-GCM vault remains unchanged; this is presentation only.
  function displaySource(source){
    let lines=String(source??'').replace(/\r\n?/g,'\n').split('\n');
    const notice=/^\*{0,2}\s*(?:DRAF\s+AI\s*[—–-]\s*WAJIB\s+VERIFIKASI|HASIL\s+AI\s*[—–-]\s*DRAF\s*[,;—–-]?\s*BUKAN\s+DOKUMEN\s+RESMI)\s*\*{0,2}\s*$/i;
    // Many AI models repeat their own disclaimer before the actual document.
    // Remove only consecutive notices at the beginning; never substantive content.
    let removed=0;
    while(lines.length&&removed<6){
      if(!lines[0].trim()){lines.shift();continue}
      if(notice.test(lines[0].trim())){lines.shift();removed++;continue}
      break;
    }
    return lines.join('\n').trim();
  }
  function inlineDoc(source){
    // Escape FIRST, then introduce only fixed, locally-authored tags.
    return String(source??'').split(/(`[^`\n]{1,400}`)/g).map(part=>{
      if(part.startsWith('`')&&part.endsWith('`')&&part.length>1)return '<code>'+escape(part.slice(1,-1))+'</code>';
      return escape(part).replace(/\*\*([^*\n]{1,900})\*\*/g,'<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]{1,900})\*(?!\*)/g,'$1<em>$2</em>');
    }).join('');
  }
  function metaRow(line){
    const m=line.match(/^\s*(?:\*\*([^*:\n]{1,45}):\*\*|([A-Za-zÀ-ÿ ]{2,45}):)\s*(.*?)\s*$/);
    if(!m)return null;
    const label=(m[1]||m[2]).trim();
    return /^(kepada|dari|tanggal|perihal|nomor|lampiran|sifat|hal|tempat)$/i.test(label)?{label,value:m[3]}:null;
  }
  function headingFromBold(line){
    const m=line.match(/^\s*\*\*([^*\n]{3,125})\*\*\s*$/);if(!m)return '';
    const content=m[1].trim();
    return /[A-ZÀ-Ý]/.test(content)&&content===content.toLocaleUpperCase('id-ID')&&!content.endsWith(':')?content:'';
  }
  function renderDocument(source){
    const lines=displaySource(source).split('\n').slice(0,900);
    const out=[];let i=0,seenHeading=false;
    const isBlank=l=>!l.trim();
    const isRule=l=>/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(l);
    const isHeader=l=>/^\s*#{1,5}\s+\S/.test(l)||!!headingFromBold(l);
    const isList=l=>/^\s{0,8}(?:[-+*]\s+|\d{1,3}[.)]\s+)/.test(l);
    const isFence=l=>/^\s*```/.test(l);
    const isQuote=l=>/^\s*>/.test(l);
    const pipeCells=l=>l.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(x=>x.trim());
    const isTableSep=l=>/^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(l);
    while(i<lines.length){
      const line=lines[i];
      if(isBlank(line)){i++;continue}
      if(isFence(line)){
        i++;const code=[];
        while(i<lines.length&&!isFence(lines[i]))code.push(lines[i++]);
        if(i<lines.length)i++;
        out.push('<pre class="ai-code"><code>'+escape(code.join('\n'))+'</code></pre>');continue;
      }
      if(isRule(line)){out.push('<hr class="ai-doc-rule">');i++;continue}
      if(isHeader(line)){
        let text='';
        const m=line.match(/^\s*(#{1,5})\s+(.+)$/);
        if(m){text=m[2];}else{text=headingFromBold(line)}
        const level=seenHeading?3:2;
        out.push('<h'+level+'>'+inlineDoc(text)+'</h'+level+'>');seenHeading=true;i++;continue;
      }
      if(metaRow(line)){
        const rows=[];
        while(i<lines.length&&metaRow(lines[i])){rows.push(metaRow(lines[i]));i++}
        out.push('<dl class="ai-document-meta">'+rows.map(r=>'<div class="ai-meta-row"><dt>'+escape(r.label)+'</dt><dd>'+inlineDoc(r.value)+'</dd></div>').join('')+'</dl>');continue;
      }
      if(isQuote(line)){
        const quotes=[];while(i<lines.length&&isQuote(lines[i]))quotes.push(lines[i++].replace(/^\s*>\s?/,''));
        out.push('<blockquote>'+quotes.map(inlineDoc).join('<br>')+'</blockquote>');continue;
      }
      if(isList(line)){
        let kind='';const items=[];
        while(i<lines.length&&isList(lines[i])){
          const l=lines[i],ordered=/^\s{0,8}\d{1,3}[.)]\s+/.test(l),nextKind=ordered?'ol':'ul';
          if(kind&&kind!==nextKind)break;
          i++;const text=l.replace(/^\s{0,8}(?:[-+*]\s+|\d{1,3}[.)]\s+)/,'');
          kind=nextKind;items.push('<li>'+inlineDoc(text)+'</li>');
        }
        out.push('<'+(kind||'ul')+'>'+items.join('')+'</'+(kind||'ul')+'>');continue;
      }
      if(i+1<lines.length&&line.includes('|')&&isTableSep(lines[i+1])){
        const head=pipeCells(line);i+=2;const rows=[];
        while(i<lines.length&&lines[i].includes('|')&&!isBlank(lines[i])&&rows.length<40){rows.push(pipeCells(lines[i++]));}
        out.push('<div class="ai-table-scroller"><table><thead><tr>'+head.map(x=>'<th>'+inlineDoc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+head.map((_,n)=>'<td>'+inlineDoc(row[n]||'')+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');continue;
      }
      const para=[];
      while(i<lines.length&&!isBlank(lines[i])&&!isFence(lines[i])&&!isRule(lines[i])&&!isHeader(lines[i])&&!metaRow(lines[i])&&!isList(lines[i])&&!isQuote(lines[i])){
        if(i+1<lines.length&&lines[i].includes('|')&&isTableSep(lines[i+1]))break;
        para.push(lines[i++].trim());
      }
      if(para.length)out.push('<p>'+inlineDoc(para.join(' '))+'</p>');
      else i++; // Defensive forward progress on malformed Markdown.
    }
    return out.join('')||'<p class="hint">Tidak ada isi draf untuk ditampilkan.</p>';
  }
  function copyText(source){
    // Pasting into notes/telaahan should not contain raw ** and # markup.
    return displaySource(source).split('\n').map(line=>{
      if(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line))return '';
      return line.replace(/^\s*#{1,5}\s+/,'').replace(/`([^`]+)`/g,'$1')
        .replace(/\*\*([^*]+)\*\*/g,'$1').replace(/(^|[^*])\*([^*]+)\*(?!\*)/g,'$1$2')
        .replace(/^\s*>\s?/,'').replace(/^\s*```\w*\s*$/,'');
    }).join('\n').replace(/\n{3,}/g,'\n\n').trim();
  }
  function resultHtml(){return `<div class="ai-result-note"><span class="ai-draft-mark">DRAF AI · WAJIB VERIFIKASI</span><small>Konsep awal, bukan dokumen resmi</small></div><article class="ai-document" aria-label="Pratinjau dokumen hasil AI">${renderDocument(currentOutput)}</article><details class="ai-raw-details"><summary>Lihat teks asli dari AI (Markdown)</summary><pre class="ai-original">${escape(currentOutput)}</pre></details><div class="actions ai-result-actions"><button class="btn sm secondary" data-action="ai-copy">Salin teks rapi</button><button class="btn sm secondary" data-action="ai-save-draft" ${myYearArchived()?'disabled':''}>Simpan draf terenkripsi</button>${mode==='telaahan'&&!myYearArchived()?'<button class="btn sm ghost" data-action="ai-to-review">Buka di formulir Telaahan</button>':''}</div>`}

  function addLegalContext(hit){
    if(!vaultKey||!data)throw Error('Buka brankas terlebih dahulu.');
    if(view!=='ai')navigate('ai');
    const target=document.getElementById('aiPreview');if(!target)throw Error('Pratinjau AI tidak ditemukan.');
    // Citations are numbered in the current, user-editable preview; no vault IDs.
    const prior=String(target.value||'');const nums=[...prior.matchAll(/\[S(\d{1,2})\]/g)].map(x=>Number(x[1]));
    const next=nums.length?Math.max(...nums)+1:1;
    if(next>6)throw Error('Maksimal enam potongan sumber. Kurangi referensi dalam pratinjau.');
    const block=root.SIPETAK_LEGAL_RAG.context(hit,next);
    const base=prior.startsWith('Belum ada materi untuk dikirim:')?'':prior;
    const content=(base.trim()?base.trim()+'\n\n':'')+'RUJUKAN PUSTAKA HUKUM TERPILIH — gunakan hanya sebagai kutipan; sertakan [S1], [S2] sesuai sumber dan jangan mengarang dasar hukum.\n'+block;
    if(content.length>maxPreview)throw Error('Materi melewati 7.700 karakter. Hapus teks tidak penting sebelum menambah kutipan.');
    target.value=content;previewEdited=true;invalidateDraft();
    const hint=document.getElementById('aiPreviewHint');if(hint)hint.textContent='Kutipan sumber resmi ditambahkan. Periksa isi/kerahasiaan, relevansi, dan URL sumber; persetujuan wajib diberikan ulang.';
    target.scrollIntoView?.({behavior:'smooth',block:'center'});status('Kutipan siap ditinjau, belum dikirim ke Worker.');
  }
  function invalidateDraft(){currentOutput='';const out=document.getElementById('aiResult');if(out)out.innerHTML='<p class="hint">Materi berubah. Buat konsep baru.</p>';const c=document.getElementById('aiConsent');if(c)c.checked=false;}
  function previewUpdate(){invalidateLocalPlan();previewEdited=false;const el=document.getElementById('aiPreview');if(el)el.value=getPreview();invalidateDraft();}
  function change(e){
    if(e.target?.dataset?.aiDashboardType){
      const kind=e.target.dataset.aiDashboardType;
      if(!DASHBOARD_TYPES[kind])return true;
      dashCategories=e.target.checked?[...new Set([...dashCategories,kind])]:dashCategories.filter(x=>x!==kind);
      dashSnapshot=null;updateDashboard();return true;
    }
    if(e.target?.id==='aiMode'){localPlan=null;mode=e.target.value;selected='';selectedKeys=[];notes='';previewEdited=false;currentOutput='';currentSource='';render();return true}
    if(e.target?.id==='aiSource'){
      const key=e.target.value;
      if(!key)return true;
      if(!list(data,myActiveYear()).some(x=>x.key===key)){status('Catatan tidak tersedia atau tidak diizinkan untuk AI.',true);e.target.value='';return true}
      if(selectedKeys.length>=3){status('Maksimal 3 catatan. Hapus pilihan lain terlebih dahulu.',true);e.target.value='';return true}
      if(!selectedKeys.includes(key))selectedKeys.push(key);
      selected=selectedKeys[0]||'';sourcePickerUpdate();previewUpdate();return true;
    }
    return false;
  }
  function input(e){
    if(e.target?.id==='aiNotes'){notes=e.target.value;previewUpdate();return true}
    if(e.target?.id==='aiPreview'){previewEdited=true;invalidateDraft();const hint=document.getElementById('aiPreviewHint');if(hint)hint.textContent='Materi disunting. Periksa ulang dan centang persetujuan sebelum mengirim.';return true}
    if(e.target?.id==='aiWorkerUrl'){const el=document.getElementById('aiHealthStatus');if(el){el.textContent='Alamat berubah. Tekan Uji koneksi AI untuk memeriksa alamat baru.';el.classList.remove('ai-error')}return true}
    return false;
  }
  function status(text,bad=false){const el=document.getElementById('aiStatus');if(el){el.textContent=text;el.classList.toggle('ai-error',bad)}else if(bad)toast(text,true)}
  async function send(){if(busy)return;let payload,url;
    try{
      if(!document.getElementById('aiConsent')?.checked)throw Error('Centang persetujuan setelah membaca materi yang akan dikirim.');
      // Validasi ulang daftar pilihan pada tahun aktif untuk mencegah kebocoran
      // jika data atau klasifikasinya berubah setelah pratinjau disusun.
      if(selectedKeys.length)for(const key of selectedKeys)sourceText(data,myActiveYear(),key,mode);
      const exactText=String(document.getElementById('aiPreview')?.value||'');
      if(exactText.trim().length<4||exactText.length>maxPreview||exactText.startsWith('Belum ada materi untuk dikirim:'))throw Error('Materi belum valid. Pilih catatan atau ketik konteks yang boleh dikirim.');
      if(restrictedText(exactText))throw Error('Materi berlabel rahasia/terbatas tidak boleh dikirim.');
      payload={mode,sourceText:exactText,consent:true};
      url=endpoint(savedUrl());if(!window.SIPETAK_SB_AI_TOKEN)throw Error('Penghubung Supabase belum tersedia.');
    }catch(err){status(err.message,true);return}
    busy=true;currentOutput='';currentSource=selectedKeys.length===1?selectedKeys[0]:'';const requestMode=mode,requestSelected=selectedKeys.join('|'),requestNotes=notes,requestPreview=payload.sourceText;const btn=document.querySelector('[data-action="ai-send"]');if(btn){btn.disabled=true;btn.textContent='Memproses…'}status('Menghubungi AI. Jangan tutup aplikasi selama membuat konsep.');
    abort=new AbortController();const timer=setTimeout(()=>abort?.abort(),45000);
    try{
      const requestBody=JSON.stringify(payload);
      const sendWithToken=async token=>fetch(url+'/assist',{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:requestBody,signal:abort.signal});
      let response=await sendWithToken(await window.SIPETAK_SB_AI_TOKEN());
      // Worker verifies the user BEFORE AI inference. A 401 is safe to retry once
      // after refreshing the session; a 503 is NOT a password error.
      if(response.status===401){
        status('Sesi Supabase perlu diperbarui. Mencoba memperbarui login…');
        try{response=await sendWithToken(await window.SIPETAK_SB_AI_TOKEN(true));}
        catch{throw Error('Sesi Supabase tidak dapat diperbarui. Buka menu Supabase, masuk dengan akun yang benar, lalu coba lagi.');}
      }
      const body=await response.json().catch(()=>({}));
      if(!response.ok){
        const code=String(body.code||'');
        const tips={
          AI_SUPABASE_CONFIG:'Pengaturan Supabase pada Cloudflare Worker AI belum tepat. Pasang PATCH Worker terbaru, lalu periksa /health.',
          AI_SUPABASE_NETWORK:'Worker tidak dapat menghubungi Supabase. Periksa /health dan koneksi server.',
          AI_SUPABASE_TIMEOUT:'Koneksi Worker ke Supabase melewati batas waktu. Coba lagi.',
          AI_SUPABASE_UPSTREAM:'Supabase sedang menolak atau gagal melayani pemeriksaan. Coba lagi atau periksa dashboard Supabase.',
          AI_SUPABASE_RESPONSE:'Respons Supabase tidak dikenali. Periksa Worker AI dan konfigurasi proyek.',
          AI_SESSION_INVALID:'Sesi Supabase tidak sah. Buka menu Supabase dan masuk kembali dengan akun yang benar.'
        };
        throw Error(tips[code]||body.error||'Layanan AI gagal (HTTP '+response.status+').');
      }
      if(!body.draft||typeof body.draft!=='string')throw Error('Layanan AI tidak menghasilkan teks.');
      if(!vaultKey||!data||view!=='ai'||mode!==requestMode||selectedKeys.join('|')!==requestSelected||notes!==requestNotes||String(document.getElementById('aiPreview')?.value||'')!==requestPreview)return;
      currentOutput=body.draft.slice(0,12000);
      document.getElementById('aiResult').innerHTML=resultHtml();status('Draf berhasil dibuat. Periksa fakta, pasal, dan ketepatan hasil sebelum digunakan.');
    }catch(err){if(vaultKey&&view==='ai')status(err.name==='AbortError'?'Waktu koneksi AI habis. Coba lagi.':err.message,true)}
    finally{clearTimeout(timer);abort=null;busy=false;if(vaultKey&&view==='ai'){const b=document.querySelector('[data-action="ai-send"]');if(b){b.disabled=false;b.textContent='✦ Buat konsep dengan AI'}}}
  }
  async function saveDraft(){if(!currentOutput||!vaultKey||!data)throw Error('Belum ada hasil AI.');if(myYearArchived())throw Error('Tahun kinerja sudah diarsipkan.');data.aiDrafts||=[];const d={id:uid('AI'),createdAt:isoNow(),performanceYear:myActiveYear(),mode,sourceKey:currentSource,content:currentOutput,classification:'Draf AI - belum diverifikasi'};data.aiDrafts.push(d);if(data.aiDrafts.length>30)data.aiDrafts.splice(0,data.aiDrafts.length-30);await queueSave();render();toast('Konsep AI tersimpan terenkripsi sebagai draf, bukan dokumen resmi.')}
  function clear(){abort?.abort();abort=null;busy=false;localPlan=null;dashSnapshot=null;dashCategories=['tasks','directives','meetings'];currentOutput='';currentSource='';notes='';selected='';selectedKeys=[];previewEdited=false;}
  function action(el){const a=el?.dataset?.action;if(!a?.startsWith('ai-'))return false;
    if(a==='ai-dashboard-run'){runDashboard();return true}
    if(a==='ai-dashboard-clear'){dashSnapshot=null;updateDashboard();status('Ringkasan dashboard dibersihkan dari tampilan.');return true}
    if(a==='ai-dashboard-use'){useDashboard();return true}
    if(a==='ai-dashboard-open'){try{dashboardOpen(el.dataset.key)}catch(err){status(err.message,true)}return true}
    if(a==='ai-local-analyze'){analyzeLocally();return true}
    if(a==='ai-use-plan'){useLocalPlan();return true}
    if(a==='ai-save-plan'){saveLocalPlan().catch(err=>status(err.message,true));return true}
    if(a==='ai-open-selected-form'){try{openSelectedForm(el.dataset.key)}catch(err){status(err.message,true)}return true}
    if(a==='ai-test-connection'){checkConnection();return true}
    if(a==='ai-save-url'){try{if(myYearArchived())throw Error('Tahun sedang diarsipkan.');const url=endpoint(document.getElementById('aiWorkerUrl')?.value||'');data.aiSettings={...(data.aiSettings||{}),workerUrl:url};queueSave().then(()=>{render();toast('Alamat Worker AI tersimpan dalam brankas.')}).catch(fail)}catch(err){status(err.message,true)}return true}
    if(a==='ai-reset'){localPlan=null;notes='';selected='';selectedKeys=[];previewEdited=false;currentOutput='';render();return true}
    if(a==='ai-unpick'){selectedKeys=selectedKeys.filter(key=>key!==el.dataset.key);selected=selectedKeys[0]||'';sourcePickerUpdate();previewUpdate();return true}
    if(a==='ai-send'){send();return true}
    if(a==='ai-copy'){if(currentOutput)navigator.clipboard.writeText(copyText(currentOutput)).then(()=>toast('Teks rapi disalin tanpa tanda Markdown.')).catch(()=>toast('Gagal menyalin. Periksa izin Safari.',true));return true}
    if(a==='ai-save-draft'){saveDraft().catch(fail);return true}
    if(a==='ai-open-draft'){localPlan=null;const d=(data.aiDrafts||[]).find(x=>x.id===el.dataset.id&&Number(x.performanceYear)===myActiveYear());if(!d)return true;currentOutput=d.content;mode=MODES[d.mode]?d.mode:'telaahan';selected='';selectedKeys=[];previewEdited=false;currentSource=d.sourceKey||'';notes='';render();return true}
    if(a==='ai-delete-draft'){if(myYearArchived())return true;if(!confirm('Hapus draf AI ini?'))return true;data.aiDrafts=(data.aiDrafts||[]).filter(x=>x.id!==el.dataset.id);queueSave().then(()=>{render();toast('Draf AI dihapus.')}).catch(fail);return true}
    if(a==='ai-to-review'){if(!currentOutput||mode!=='telaahan'||myYearArchived())return true;const draft=copyText(currentOutput);const source=currentSource;navigate('telaah');entityModal('review','');const form=document.getElementById('entityForm');if(!form)return true;form.elements.title.value='Konsep telaahan AI — wajib diperiksa';form.elements.issue.value='Disusun dari materi pilihan pengguna. Verifikasi kronologi, sumber, dan dasar hukum.';form.elements.analysis.value=draft;form.elements.status.value='Draf';if(source.startsWith('tasks:')){const id=source.slice(6);if([...form.elements.taskId.options].some(x=>x.value===id))form.elements.taskId.value=id}const more=form.querySelector('.form-more');if(more)more.open=true;toast('Konsep dipindahkan ke formulir, belum disimpan. Periksa dahulu.');return true}
    return false;
  }
  root.SIPETAK_AI={addLegalContext,MODES,list,sourceText,compose,localAnalysis,localPlanText,dashboardData,dashboardText,endpoint,healthText,checkConnection,page,action,change,input,clear,renderDocument,displaySource,copyText};
  if(typeof module!=='undefined'&&module.exports)module.exports={MODES,list,sourceText,compose,localAnalysis,localPlanText,dashboardData,dashboardText,endpoint,healthText,checkConnection,renderDocument,displaySource,copyText};
})(typeof window!=='undefined'?window:globalThis);
