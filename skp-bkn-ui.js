'use strict';
/* In-page BKN draft generator; all persistence uses the existing encrypted vault queue. */
(function(root){
 const core=root.SIPETAK_BKN_CORE;
 let tab='ringkasan',filter='belum',offset=0,busy=false;
 const e=core.escapeHTML;
 const size=55;
 const h=(text,name,type='text',other='')=>`<label class="bkn-field"><span>${e(text)}</span><input name="${name}" type="${type}" value="${e(other)}" ${type==='date'?'':'maxlength="2000"'}></label>`;
 const textarea=(text,name,value)=>`<label class="bkn-field bkn-wide"><span>${e(text)}</span><textarea name="${name}" rows="2" maxlength="2000">${e(value)}</textarea></label>`;
 const opt=(items,selected,label)=>`<option value="">${e(label)}</option>`+items.map(r=>`<option value="${e(r.id)}" ${r.id===selected?'selected':''}>${e((r.catalogRhkId||'')+' · '+r.title.slice(0,100))}</option>`).join('');
 function panel(){
  if(!data)return '';
  const y=myActiveYear(),m=core.compute(data,y),p=core.profile(data,y),arch=myYearArchived();
  const rhks=myItems('rhks',y);const unmapped=m.unmapped.length;
  let content='';
  if(tab==='identitas')content=`<form id="bknProfileForm" class="bkn-form"><div class="bkn-fields">
    ${h('Nama pegawai','name','text',p.name)}${h('NIP pegawai (opsional)','nip','text',p.nip)}
    ${h('Jabatan pegawai','position','text',p.position)}${h('Unit kerja','unit','text',p.unit)}
    ${h('Organisasi','organization','text',p.organization)}${h('Nama pejabat penilai','reviewer','text',p.reviewer)}
    ${h('NIP pejabat penilai','reviewerNip','text',p.reviewerNip)}${h('Jabatan pejabat penilai','reviewerPosition','text',p.reviewerPosition)}
    ${h('Periode mulai','start','date',p.start)}${h('Periode akhir','end','date',p.end)}
    <label class="bkn-field"><span>Pendekatan SKP</span><select name="approach"><option ${p.approach==='Kualitatif'?'selected':''}>Kualitatif</option><option ${p.approach==='Kuantitatif'?'selected':''}>Kuantitatif</option></select></label>
    ${h('Tanggal dialog kinerja (jika ada)','lastDialogue','date',p.lastDialogue)}
    ${textarea('RHK pimpinan yang diintervensi (salin dari SKP resmi)','parentRhk',p.parentRhk)}
    ${textarea('Dasar: dokumen SKP / penugasan / penetapan','sourceDocument',p.sourceDocument)}
    ${textarea('Catatan dialog / umpan balik pimpinan','dialogueNote',p.dialogueNote)}
    ${textarea('Ekspektasi umum pimpinan','expectation',p.expectation)}
    </div><h4>Perilaku kerja — lengkapi sesuai ekspektasi pimpinan</h4><div class="bkn-fields">${core.BEHAVIORS.map((b,i)=>textarea(b,'behavior'+i,p.behavior[i])).join('')}</div>
    <p class="hint">Identitas dan ekspektasi disimpan di brankas terenkripsi. Isi hanya informasi yang benar-benar diketahui; bagian kosong tetap ditandai pada cetakan.</p>
    ${arch?'<p class="hint">Tahun arsip hanya bisa dibaca.</p>':'<button class="btn" type="submit">🔒 Simpan identitas & ekspektasi</button>'}
   </form>`;
  if(tab==='pemetaan'){
   const rows=(filter==='belum'?m.unmapped:m.rows);
   const slice=rows.slice(offset,offset+size);
   content=`<div class="bkn-mapping-head"><p>Setiap pekerjaan yang sudah punya <b>RHK di Tugas Harian</b> langsung terbaca otomatis. Pekerjaan lain cukup dipetakan satu kali; draf turunan catatan ikut menggunakan relasi sumber yang sama.</p><div class="bkn-filter"><button type="button" class="btn sm ${filter==='belum'?'':'ghost'}" data-action="bkn-filter" data-value="belum">Perlu dipetakan (${m.unmapped.length})</button><button type="button" class="btn sm ${filter==='semua'?'':'ghost'}" data-action="bkn-filter" data-value="semua">Semua sumber (${m.rows.length})</button></div></div>
    <div class="bkn-sources">${slice.map(row=>`<div class="bkn-source"><div><b>${e(core.LABELS[row.kind])}</b><span>${e(row.date||'Tanggal belum diketahui')}</span><p>${e(row.title)}</p><small>${e(row.status||'Belum ada status')} · ${e(row.key)} ${row.sourceNoteId?' · dari catatan '+e(row.sourceNoteId):''}</small></div><label><span>RHK yang sesuai</span><select data-action="bkn-link" data-key="${e(row.key)}" ${arch?'disabled':''}>${opt(rhks,row.mappedRhkId,'— Belum dipetakan —')}</select></label></div>`).join('')||'<div class="bkn-empty">Semua sumber sudah dipetakan atau belum ada catatan di tahun ini.</div>'}</div>
    <div class="bkn-pagination">${offset>0?'<button class="btn ghost sm" data-action="bkn-prev">← Sebelumnya</button>':''}${offset+size<rows.length?'<button class="btn ghost sm" data-action="bkn-next">Berikutnya →</button>':''}<span>${rows.length?offset+1:0}–${Math.min(offset+size,rows.length)} dari ${rows.length} catatan</span></div>
    <p class="hint">Bila belum ada RHK yang sesuai, buka modul Pemetaan RHK lalu salin rumusan dari SKP resmi. SIPETAK tidak akan menebak RHK atau target Anda.</p><button class="btn secondary" data-action="navigate" data-view="rhk">◎ Buka Pemetaan RHK</button>`;
  }
  if(tab==='ringkasan'){
   const main=m.rhks.filter(x=>x.role==='utama'),extra=m.rhks.filter(x=>x.role==='tambahan');
   const section=(title,rows)=>`<div class="bkn-group"><h4>${title}</h4>${rows.length?rows.map(x=>`<article class="bkn-rhk"><div><strong>${e(x.rhk.title)}</strong><small>${e(x.rhk.catalogRhkId||x.rhk.id)} · ${e(x.rhk.status||'Draf')}</small><p><b>IKI:</b> ${e(x.rhk.indicator||'Belum dicatat')} · <b>Target:</b> ${e(x.rhk.target||'Belum dicatat')}</p><button class="btn sm ghost" type="button" data-action="bkn-rhk-edit" data-id="${e(x.rhk.id)}">RHK pimpinan yang diintervensi</button></div><div class="bkn-rhk-count"><b>${x.workCount}</b><span>kegiatan unik</span><small>${x.evidenceCount} referensi bukti · ${x.checkedEvidenceCount} diperiksa</small></div></article>`).join(''):'<div class="bkn-empty">Belum ada RHK pada kelompok ini.</div>'}</div>`;
   content=`<div class="bkn-summary"><div><b>${m.rhks.length}</b><span>RHK pada tahun ini</span></div><div><b>${m.summary.work}</b><span>Kegiatan unik tertaut</span></div><div><b>${m.summary.evidence}</b><span>Referensi bukti tertaut</span></div><div><b>${unmapped}</b><span>Catatan perlu RHK</span></div></div>${section('Hasil kerja utama',main)}${section('Tugas tambahan Asisten Sekwan',extra)}<div class="bkn-note"><b>Data dipakai ulang otomatis</b><p>Hitungan kegiatan dan bukti adalah <b>inventaris kerja, bukan nilai evaluasi</b>. Target, indikator, RHK pimpinan, dan perilaku kerja tetap diisi sesuai dialog kinerja.</p></div>`;
  }
  if(tab==='pratinjau'){
   const c=core.documentModel(data,y);content=`<div class="bkn-preview"><h4>Rancangan SKP ${y} — pratinjau ringkas</h4><p><b>Pegawai:</b> ${e(c.person.name||'—')} · <b>NIP:</b> ${e(c.person.nip||'—')}</p><p><b>Penilai:</b> ${e(c.person.reviewer||'—')} · <b>Pendekatan:</b> ${e(c.person.approach)}</p><p><b>RHK pimpinan:</b> ${e(c.person.parentRhk||'Belum diisi')}</p><div class="bkn-scroll"><table><thead><tr><th>Jenis</th><th>RHK</th><th>Indikator</th><th>Target</th><th>Kegiatan unik</th><th>Referensi bukti</th></tr></thead><tbody>${c.sections.map(s=>`<tr><td>${s.kind==='HASIL KERJA TAMBAHAN'?'Tambahan':'Utama'}</td><td>${e(s.title)}</td><td>${e(s.indicator||'—')}</td><td>${e(s.target||'—')}</td><td>${s.total}</td><td>${s.evidences.length}</td></tr>`).join('')}</tbody></table></div><p class="hint">Dokumen cetak memuat perilaku kerja, identitas penilai, serta lampiran realisasi dan ID bukti. Bahan Terbatas disamarkan pada ekspor.</p></div>`;
  }
  return `<section class="card bkn-card" id="bknGenerator"><div class="bkn-hero"><div><span class="bkn-eyebrow">◈ PETA KINERJA · SATU INPUT, BANYAK HASIL</span><h3>Generator SKP e-Kinerja BKN</h3><p>Draf SKP, rekap pekerjaan utama dan Asisten Sekwan, serta referensi bukti langsung dari brankas pribadi.</p></div><span class="bkn-version">2026 · DRAF BANTU</span></div>
  <div class="bkn-alert">Generator ini mengikuti struktur perencanaan SKP, <b>bukan integrasi atau format impor resmi e-Kinerja BKN</b>. Nilai, target dan persetujuan tidak dibuat otomatis. Tidak ada data dikirim ke layanan eksternal.</div>
  <div class="bkn-tabs" role="group" aria-label="Generator SKP BKN">${[['ringkasan','Rekap otomatis'],['pemetaan','Pemetaan kerja'],['identitas','Identitas & ekspektasi'],['pratinjau','Pratinjau SKP']].map(([id,t])=>`<button type="button" data-action="bkn-tab" data-tab="${id}" aria-pressed="${tab===id}" class="${tab===id?'active':''}">${t}</button>`).join('')}</div>
  <div class="bkn-body">${content}</div><div class="bkn-footer"><button class="btn" type="button" data-action="bkn-print">🖨 Cetak / Simpan PDF</button><button class="btn secondary" type="button" data-action="bkn-word">↓ Word (RTF)</button><button class="btn secondary" type="button" data-action="bkn-csv">↓ Tabel bantu CSV</button><button class="btn ghost" type="button" data-action="navigate" data-view="catatan">＋ Catat pekerjaan</button><button class="btn ghost" type="button" data-action="navigate" data-view="bukti">▣ Bukti Dukung</button></div><p class="bkn-footnote">Dasar: PermenPANRB 6/2022; SE BKN 1/2023; Peraturan BKN 2/2026. Bukan tindakan resmi dalam sistem BKN.</p></section>`;
 }
 function linkCard(){return `<div class="card bkn-link-card"><div><b>◈ Generator SKP e-Kinerja BKN</b><p>Sekali catat → pemetaan RHK → rekap utama/tambahan Asisten Sekwan → SKP & bukti siap diperiksa.</p></div><button class="btn" type="button" data-action="navigate" data-view="skp">Buka generator →</button></div>`;}
 async function safeChange(apply,rollback){if(busy||!myAllowWrite())return;busy=true;try{apply();await queueSave();render();toast('Pemetaan SKP disimpan terenkripsi.');}catch(err){rollback();toast('Gagal menyimpan: '+(err.message||err),true);render();}finally{busy=false;}}
 function change(evt){const el=evt.target;if(el?.dataset?.action!=='bkn-link')return false;
  const y=myActiveYear(),key=el.dataset.key,rhkId=el.value;
  const current=core.compute(data,y).rows.find(x=>x.key===key);
  if(!current||rhkId&&!myItems('rhks',y).some(r=>r.id===rhkId)){toast('RHK bukan dari tahun kinerja aktif.',true);return true;}
  const old=structuredClone(data.skpBknLinks||[]);const next=old.filter(x=>!(x.year===y&&x.key===key));next.push({year:y,key,rhkId,updatedAt:isoNow(),manual:true});
  safeChange(()=>{data.skpBknLinks=next;},()=>{data.skpBknLinks=old});return true;
 }
 function submit(evt){if(evt.target?.id!=='bknProfileForm')return false;evt.preventDefault();
  if(!myAllowWrite())return true;
  const y=myActiveYear();let p;
  try{p=core.validateProfile(Object.fromEntries(new FormData(evt.target)),y);}catch(err){toast(err.message,true);return true;}
  const old=structuredClone(data.skpBknProfiles||[]);
  safeChange(()=>{data.skpBknProfiles=[...old.filter(x=>x.year!==y),{...p,updatedAt:isoNow()}];},()=>{data.skpBknProfiles=old;});return true;
 }
 function editRhk(id){
  if(!myAllowWrite())return true;
  const y=myActiveYear(),r=myItems('rhks',y).find(x=>x.id===id);if(!r)return true;
  const cur=(data.skpBknRhkDetails||[]).find(x=>x.year===y&&x.rhkId===id);
  openModal('Intervensi RHK pimpinan','Isi berdasarkan RHK pimpinan yang sudah diklarifikasi; tidak ditebak SIPETAK.',`<div class="form-grid"><div class="field span2"><b>${e(r.title)}</b></div><label class="field span2">RHK pimpinan yang diintervensi<textarea name="parentRhk" maxlength="900" rows="4" placeholder="Salin dari e-Kinerja atau SKP pimpinan">${e(cur?.parentRhk||'')}</textarea></label></div><p class="hint">Indikator dan target RHK individu dapat diubah pada modul Pemetaan RHK. Intervensi ini hanya draf catatan pribadi.</p>`,null,'bknRhkForm');
  document.getElementById('bknRhkForm').addEventListener('submit',evt=>{
   evt.preventDefault();const value=String(new FormData(evt.target).get('parentRhk')||'').trim().slice(0,900);
   const old=structuredClone(data.skpBknRhkDetails||[]);const next=old.filter(x=>!(x.year===y&&x.rhkId===id));if(value)next.push({year:y,rhkId:id,parentRhk:value,updatedAt:isoNow()});
   safeChange(()=>{data.skpBknRhkDetails=next;},()=>{data.skpBknRhkDetails=old;}).then(()=>{closeModal()});
  });return true;
 }
 function action(el){const a=el?.dataset?.action;if(!a?.startsWith('bkn-'))return false;
  if(a==='bkn-tab'){tab=['ringkasan','pemetaan','identitas','pratinjau'].includes(el.dataset.tab)?el.dataset.tab:'ringkasan';offset=0;render();}
  if(a==='bkn-filter'){filter=el.dataset.value==='semua'?'semua':'belum';offset=0;render();}
  if(a==='bkn-next'){offset+=size;render();}
  if(a==='bkn-prev'){offset=Math.max(0,offset-size);render();}
  if(a==='bkn-rhk-edit')return editRhk(el.dataset.id);
  if(a==='bkn-print'){documentPrint('Bahan SKP e-Kinerja BKN '+myActiveYear(),core.printableHTML(data,myActiveYear()));}
  if(a==='bkn-word'){blobDownload('SIPETAK-BAHAN-SKP-BKN-'+myActiveYear()+'.rtf',core.rtfDocument(data,myActiveYear()),'application/rtf');toast('Dokumen RTF dapat dibuka dan diedit di Word. Bukan formulir resmi BKN.');}
  if(a==='bkn-csv'){
    const rows=core.csvRows(data,myActiveYear());const q=v=>{const s=String(v??'');return '"'+(/^\s*[=+\-@]/.test(s)?"'"+s:s).replace(/"/g,'""')+'"'};
    blobDownload('SIPETAK-BANTU-SKP-BKN-'+myActiveYear()+'.csv','\ufeff'+rows.map(r=>r.map(q).join(';')).join('\r\n'),'text/csv;charset=utf-8');toast('CSV bahan bantu SKP dibuat. Bukan format impor resmi BKN.');
  }
  return true;
 }
 root.SIPETAK_BKN_UI={panel,linkCard,change,submit,action};
})(window);
