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
    if(a==='ai-copy'){if(currentOutput)navigator.clipboard.writeText(copyText(currentOutput)).then(()=>toast('Teks rapi disalin tanpa tanda Markdown.')).catch(()=>toast('Gagal menyalin. Periksa izin Safari.',true));return true}
    if(a==='ai-save-draft'){saveDraft().catch(fail);return true}
    if(a==='ai-open-draft'){const d=(data.aiDrafts||[]).find(x=>x.id===el.dataset.id&&Number(x.performanceYear)===myActiveYear());if(!d)return true;currentOutput=d.content;mode=MODES[d.mode]?d.mode:'telaahan';selected='';currentSource=d.sourceKey||'';notes='';render();return true}
    if(a==='ai-delete-draft'){if(myYearArchived())return true;if(!confirm('Hapus draf AI ini?'))return true;data.aiDrafts=(data.aiDrafts||[]).filter(x=>x.id!==el.dataset.id);queueSave().then(()=>{render();toast('Draf AI dihapus.')}).catch(fail);return true}
    if(a==='ai-to-review'){if(!currentOutput||mode!=='telaahan'||myYearArchived())return true;const draft=copyText(currentOutput);const source=currentSource;navigate('telaah');entityModal('review','');const form=document.getElementById('entityForm');if(!form)return true;form.elements.title.value='Konsep telaahan AI — wajib diperiksa';form.elements.issue.value='Disusun dari materi pilihan pengguna. Verifikasi kronologi, sumber, dan dasar hukum.';form.elements.analysis.value=draft;form.elements.status.value='Draf';if(source.startsWith('tasks:')){const id=source.slice(6);if([...form.elements.taskId.options].some(x=>x.value===id))form.elements.taskId.value=id}const more=form.querySelector('.form-more');if(more)more.open=true;toast('Konsep dipindahkan ke formulir, belum disimpan. Periksa dahulu.');return true}
    return false;
  }
  root.SIPETAK_AI={MODES,list,sourceText,compose,endpoint,page,action,change,input,clear,renderDocument,displaySource,copyText};
  if(typeof module!=='undefined'&&module.exports)module.exports={MODES,list,sourceText,compose,endpoint,renderDocument,displaySource,copyText};
})(typeof window!=='undefined'?window:globalThis);
