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
  let mode='telaahan',selected='',notes='',currentOutput='',currentSource='',currentTitle='',busy=false,abort=null;
  const maxPreview=7700;
  const clean=x=>String(x??'').replace(/\u0000/g,'').trim();
  const escape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isRestricted=r=>/^(terbatas|rahasia|sangat rahasia|confidential|secret)$/i.test(clean(r?.classification));
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
      const s=root.SIPETAK_AUTOMATION?.summarize(vault,year,m);
      if(!s)return 'Tidak ada ringkasan yang tersedia.';
      return `Tahun: ${year}, bulan: ${m}\nPekerjaan tercatat: ${s.total}\nPekerjaan selesai: ${s.done}\nPekerjaan selesai dengan hasil dan bukti metadata lengkap: ${s.proven}\nRHK (hitungan draf): ${JSON.stringify(s.byRhk.map((x,i)=>({rhk:clean((vault.rhks||[]).find(r=>r.id===x.key)?.title||`RHK ${i+1}`),pekerjaan:x.tasks,selesai:x.completed,berbukti:x.supported})))}\nIKI (hitungan draf): ${JSON.stringify(s.byIki.map((x,i)=>({indikator:`IKI ${i+1} (periksa kode indikator di SIPETAK)`,pekerjaan:x.tasks,selesai:x.completed,berbukti:x.supported})))}\nPERINGATAN: angka tersebut bukan realisasi SKP resmi, bukan validasi kualitas bukti.`;
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
  function compose(vault,year,which=mode,key=selected,extra=notes){
    if(!MODES[which])throw Error('Jenis bantuan AI tidak dikenali.');
    const src=sourceText(vault,year,key,which),note=clean(extra);
    if(note.length>1800)throw Error('Catatan tambahan maksimal 1.800 karakter.');
    const full=[src&&'MATERI CATATAN TERPILIH:\n'+src,note&&'KONTEKS YANG ANDA KETIK:\n'+note].filter(Boolean).join('\n\n');
    if(!full)throw Error('Pilih catatan pekerjaan atau tuliskan konteks sendiri.');
    if(full.length>maxPreview)throw Error('Materi melebihi 7.700 karakter. Ringkas catatan terlebih dahulu.');
    return {mode:which,sourceText:full,consent:true};
  }
  function endpoint(raw){
    const s=clean(raw);if(!s)throw Error('Alamat Worker AI belum diisi.');
    const u=new URL(s);const h=u.hostname.toLowerCase();
    if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.port||u.pathname!=='/'||!(h.endsWith('.workers.dev')||h==='sipetak.pages.dev'))throw Error('Masukkan alamat HTTPS Worker *.workers.dev (tanpa path/parameter).');
    if(!h.endsWith('.workers.dev')&&h!=='sipetak.pages.dev')throw Error('Alamat Worker tidak diizinkan.');
    return u.origin;
  }
  function savedUrl(){return clean(data?.aiSettings?.workerUrl||document.querySelector('meta[name="sipetak-ai-worker-url"]')?.content||'');}
  function options(){return `<option value="">— Ketik konteks sendiri / tanpa sumber —</option>`+list(data,myActiveYear()).map(x=>`<option value="${escape(x.key)}" ${x.key===selected?'selected':''}>${escape(x.label)}</option>`).join('')}
  function getPreview(){try{return compose(data,myActiveYear()).sourceText}catch(e){return 'Belum ada materi untuk dikirim: '+e.message}}
  function drafts(){return (data.aiDrafts||[]).filter(x=>Number(x.performanceYear)===Number(myActiveYear())).slice().reverse().slice(0,15)}
  function page(){const opts=Object.entries(MODES).map(([id,m])=>`<option value="${id}" ${mode===id?'selected':''}>${escape(m.label)}</option>`).join(''),url=savedUrl(),preview=getPreview();
    return `<div class="section-head"><div><h3>✦ Asisten AI SIPETAK</h3><p>Lima alat bantu penyusunan konsep. Anda memilih materi yang dikirim dan memeriksa setiap hasil.</p></div><button class="btn ghost" data-action="navigate" data-view="panduan">Panduan →</button></div>
    <div class="callout warn"><b>Perhatian data kedinasan:</b> layanan AI eksternal menerima teks yang disetujui. Jangan mengirim data rahasia, pribadi, dokumen belum diizinkan instansi, atau berkas berklasifikasi Terbatas. Lampiran tidak dikirim otomatis. AI dapat keliru dan tidak mengesahkan keputusan, hukum, risalah, atau SKP.</div>
    <div class="ai-grid"><section class="card ai-work"><h3>1 · Pilih bantuan AI</h3><div class="field"><label for="aiMode">Jenis bantuan</label><select id="aiMode">${opts}</select></div><p class="hint">${escape(MODES[mode].hint)}</p>
    <div class="field"><label for="aiSource">Catatan yang akan digunakan (tahun ${myActiveYear()})</label><select id="aiSource">${options()}</select></div>
    <div class="field"><label for="aiNotes">Konteks tambahan (maks. 1.800 karakter)</label><textarea id="aiNotes" rows="5" maxlength="1800" placeholder="Uraikan fakta yang aman dan boleh dikirim, tujuan draf, atau pertanyaan yang ingin dijawab.">${escape(notes)}</textarea></div>
    <h3>2 · Periksa tepat apa yang akan dikirim</h3><p class="hint">Tidak ada data lain dari brankas yang dikirim. ID internal, file lampiran, dan kunci brankas tidak disertakan.</p><pre id="aiPreview" class="ai-preview">${escape(preview)}</pre>
    <label class="ai-consent"><input type="checkbox" id="aiConsent"> <span>Saya sudah memeriksa teks di atas dan memastikan informasi ini <b>boleh diproses oleh penyedia AI</b> sesuai aturan instansi. Saya paham hasilnya hanya draf.</span></label>
    <div class="actions"><button type="button" class="btn" data-action="ai-send" ${busy?'disabled':''}>${busy?'Memproses…':'✦ Buat konsep dengan AI'}</button><button type="button" class="btn ghost" data-action="ai-reset">Kosongkan materi</button></div>
    <div id="aiStatus" role="status" aria-live="polite" class="hint">${busy?'Menghubungi layanan AI…':'AI hanya berjalan ketika Anda menekan tombol dan menyetujui materinya.'}</div></section>
    <div class="ai-side"><section class="card"><h3>Pengaturan koneksi</h3><p class="hint">Gunakan alamat Worker Cloudflare tersendiri. Tidak perlu API key AI pada iPhone.</p><div class="field"><label for="aiWorkerUrl">Alamat Worker AI</label><input id="aiWorkerUrl" type="url" value="${escape(url)}" placeholder="https://sipetak-asisten-ai.nama.workers.dev" autocomplete="off"></div><button class="btn secondary sm" data-action="ai-save-url">Simpan alamat di brankas</button><p class="hint">${url?'Alamat sudah tersimpan/tersedia.':'Belum dihubungkan. AI tidak bisa menghasilkan teks sampai Worker dipasang.'} Login Supabase aktif diperlukan untuk AI.</p></section>
    <section class="card"><h3>3 · Hasil konsep AI</h3><div id="aiResult">${currentOutput?resultHtml():'<p class="hint">Setelah diproses, hasil AI muncul di sini. Anda dapat menyalin atau menyimpan sebagai draf terenkripsi.</p>'}</div></section></div></div>
    <section class="card"><h3>Draf AI tersimpan dalam brankas tahun ${myActiveYear()}</h3><p class="hint">Draf bukan dokumen resmi, bukan bukti sah, dan tidak mengubah SKP atau status pekerjaan. Maksimal 30 draf terakhir tersimpan.</p><div class="ai-drafts">${drafts().length?drafts().map(x=>`<div class="ai-draft"><div><b>${escape(MODES[x.mode]?.label||'Draf AI')}</b><small>${escape(new Date(x.createdAt).toLocaleString('id-ID'))} · Draf untuk diverifikasi</small></div><div class="actions"><button class="btn sm ghost" data-action="ai-open-draft" data-id="${escape(x.id)}">Lihat</button><button class="btn sm danger" data-action="ai-delete-draft" data-id="${escape(x.id)}" ${myYearArchived()?'disabled':''}>Hapus</button></div></div>`).join(''):'<p class="hint">Belum ada draf AI yang disimpan.</p>'}</div></section>`;
  }
  function resultHtml(){return `<div class="ai-result-note">HASIL AI — DRAF, BUKAN DOKUMEN RESMI</div><pre class="ai-result-text">${escape(currentOutput)}</pre><div class="actions"><button class="btn sm secondary" data-action="ai-copy">Salin hasil</button><button class="btn sm secondary" data-action="ai-save-draft" ${myYearArchived()?'disabled':''}>Simpan draf terenkripsi</button>${mode==='telaahan'&&!myYearArchived()?'<button class="btn sm ghost" data-action="ai-to-review">Buka di formulir Telaahan</button>':''}</div>`}
  function previewUpdate(){const el=document.getElementById('aiPreview');if(el)el.textContent=getPreview();const c=document.getElementById('aiConsent');if(c)c.checked=false;}
  function change(e){if(e.target?.id==='aiMode'){mode=e.target.value;selected='';notes='';currentOutput='';currentSource='';render();return true}if(e.target?.id==='aiSource'){selected=e.target.value;currentOutput='';previewUpdate();const out=document.getElementById('aiResult');if(out)out.innerHTML='<p class="hint">Materi berubah. Buat konsep baru.</p>';return true}return false}
  function input(e){if(e.target?.id==='aiNotes'){notes=e.target.value;currentOutput='';previewUpdate();const out=document.getElementById('aiResult');if(out)out.innerHTML='<p class="hint">Materi berubah. Buat konsep baru.</p>';return true}return false}
  function status(text,bad=false){const el=document.getElementById('aiStatus');if(el){el.textContent=text;el.classList.toggle('ai-error',bad)}else if(bad)toast(text,true)}
  async function send(){if(busy)return;let payload,url;
    try{if(!document.getElementById('aiConsent')?.checked)throw Error('Centang persetujuan setelah membaca materi yang akan dikirim.');payload=compose(data,myActiveYear());url=endpoint(savedUrl());if(!window.SIPETAK_SB_AI_TOKEN)throw Error('Penghubung Supabase belum tersedia.');}
    catch(err){status(err.message,true);return}
    busy=true;currentOutput='';currentSource=selected;const requestMode=mode,requestSelected=selected,requestNotes=notes;const btn=document.querySelector('[data-action="ai-send"]');if(btn){btn.disabled=true;btn.textContent='Memproses…'}status('Menghubungi AI. Jangan tutup aplikasi selama membuat konsep.');
    abort=new AbortController();const timer=setTimeout(()=>abort?.abort(),45000);
    try{
      const token=await window.SIPETAK_SB_AI_TOKEN();
      const response=await fetch(url+'/assist',{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',redirect:'error',headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:abort.signal});
      const body=await response.json().catch(()=>({}));
      if(!response.ok)throw Error(body.error||'Layanan AI gagal (HTTP '+response.status+').');
      if(!body.draft||typeof body.draft!=='string')throw Error('Layanan AI tidak menghasilkan teks.');
      if(!vaultKey||!data||view!=='ai'||mode!==requestMode||selected!==requestSelected||notes!==requestNotes)return;
      currentOutput=body.draft.slice(0,12000);
      document.getElementById('aiResult').innerHTML=resultHtml();status('Draf berhasil dibuat. Periksa fakta, pasal, dan ketepatan hasil sebelum digunakan.');
    }catch(err){if(vaultKey&&view==='ai')status(err.name==='AbortError'?'Waktu koneksi AI habis. Coba lagi.':err.message,true)}
    finally{clearTimeout(timer);abort=null;busy=false;if(vaultKey&&view==='ai'){const b=document.querySelector('[data-action="ai-send"]');if(b){b.disabled=false;b.textContent='✦ Buat konsep dengan AI'}}}
  }
  async function saveDraft(){if(!currentOutput||!vaultKey||!data)throw Error('Belum ada hasil AI.');if(myYearArchived())throw Error('Tahun kinerja sudah diarsipkan.');data.aiDrafts||=[];const d={id:uid('AI'),createdAt:isoNow(),performanceYear:myActiveYear(),mode,sourceKey:currentSource,content:currentOutput,classification:'Draf AI - belum diverifikasi'};data.aiDrafts.push(d);if(data.aiDrafts.length>30)data.aiDrafts.splice(0,data.aiDrafts.length-30);await queueSave();render();toast('Konsep AI tersimpan terenkripsi sebagai draf, bukan dokumen resmi.')}
  function clear(){abort?.abort();abort=null;busy=false;currentOutput='';currentSource='';notes='';selected='';}
  function action(el){const a=el?.dataset?.action;if(!a?.startsWith('ai-'))return false;
    if(a==='ai-save-url'){try{if(myYearArchived())throw Error('Tahun sedang diarsipkan.');const url=endpoint(document.getElementById('aiWorkerUrl')?.value||'');data.aiSettings={...(data.aiSettings||{}),workerUrl:url};queueSave().then(()=>{render();toast('Alamat Worker AI tersimpan dalam brankas.')}).catch(fail)}catch(err){status(err.message,true)}return true}
    if(a==='ai-reset'){notes='';selected='';currentOutput='';render();return true}
    if(a==='ai-send'){send();return true}
    if(a==='ai-copy'){if(currentOutput)navigator.clipboard.writeText(currentOutput).then(()=>toast('Hasil disalin.')).catch(()=>toast('Gagal menyalin. Periksa izin Safari.',true));return true}
    if(a==='ai-save-draft'){saveDraft().catch(fail);return true}
    if(a==='ai-open-draft'){const d=(data.aiDrafts||[]).find(x=>x.id===el.dataset.id&&Number(x.performanceYear)===myActiveYear());if(!d)return true;currentOutput=d.content;mode=MODES[d.mode]?d.mode:'telaahan';selected='';currentSource=d.sourceKey||'';notes='';render();return true}
    if(a==='ai-delete-draft'){if(myYearArchived())return true;if(!confirm('Hapus draf AI ini?'))return true;data.aiDrafts=(data.aiDrafts||[]).filter(x=>x.id!==el.dataset.id);queueSave().then(()=>{render();toast('Draf AI dihapus.')}).catch(fail);return true}
    if(a==='ai-to-review'){if(!currentOutput||mode!=='telaahan'||myYearArchived())return true;const draft=currentOutput;const source=currentSource;navigate('telaah');entityModal('review','');const form=document.getElementById('entityForm');if(!form)return true;form.elements.title.value='Konsep telaahan AI — wajib diperiksa';form.elements.issue.value='Disusun dari materi pilihan pengguna. Verifikasi kronologi, sumber, dan dasar hukum.';form.elements.analysis.value=draft;form.elements.status.value='Draf';if(source.startsWith('tasks:')){const id=source.slice(6);if([...form.elements.taskId.options].some(x=>x.value===id))form.elements.taskId.value=id}const more=form.querySelector('.form-more');if(more)more.open=true;toast('Konsep dipindahkan ke formulir, belum disimpan. Periksa dahulu.');return true}
    return false;
  }
  root.SIPETAK_AI={MODES,list,sourceText,compose,endpoint,page,action,change,input,clear};
  if(typeof module!=='undefined'&&module.exports)module.exports={MODES,list,sourceText,compose,endpoint};
})(typeof window!=='undefined'?window:globalThis);
