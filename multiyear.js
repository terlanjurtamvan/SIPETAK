'use strict';
/* SIPETAK v3.2: multi-year overlay INSIDE the existing encrypted v2 vault payload.
   Historical records remain in the same vault; Supabase sees ciphertext only.
   The original schema:2 is retained for legacy compatibility; fields are additive. */
const MY_MIN_YEAR=2000,MY_MAX_YEAR=2100;
const MY_COLLECTIONS=['tasks','reviews','evidence','rhks','directives','meetings','dims'];
function myValidYear(y){return Number.isInteger(Number(y)) && Number(y)>=MY_MIN_YEAR && Number(y)<=MY_MAX_YEAR && /^\d{4}$/.test(String(y));}
function myDefaultYear(){return Number(new Date().getFullYear());}
function myStoredYear(y){return myValidYear(y)?Number(y):null;}
function myYearFromDate(x){const m=String(x??'').match(/^(\d{4})[-/]/);return m&&myValidYear(m[1])?Number(m[1]):null;}
function myYearOf(record,kind='tasks',fallback){
  const explicit=myStoredYear(record?.performanceYear);
  if(explicit)return explicit;
  if(kind==='rhks'){
    const m=String(record?.period||'').match(/(?:^|\D)((?:20)\d{2})(?:\D|$)/);
    if(m&&myValidYear(m[1]))return Number(m[1]);
  }
  const dates=kind==='meetings'?['meetingAt','createdAt']:
    kind==='directives'?['receivedAt','createdAt']:
    kind==='dims'?['createdAt','dueAt']:
    kind==='tasks'?['date','createdAt']:
    kind==='reviews'||kind==='evidence'?['date','createdAt']:['createdAt'];
  for(const key of dates){const yr=myYearFromDate(record?.[key]);if(yr)return yr;}
  return myStoredYear(fallback)||myDefaultYear();
}
function myEnsureYears(input){
  if(!input||typeof input!=='object')return false;
  let updated=false;
  const fallback=myStoredYear(input.profile?.skpYear)||myDefaultYear();
  if(!Array.isArray(input.years)){input.years=[];updated=true;}
  if(!Array.isArray(input.ikiTargets)){input.ikiTargets=[];updated=true;}
  const seen=new Set();const sanitized=[];
  for(const row of input.years){const year=myStoredYear(row?.year);if(!year||seen.has(year)){updated=true;continue;}
    seen.add(year);sanitized.push({...row,year,status:row.status==='arsip'?'arsip':'terbuka'});
  }
  input.years=sanitized;
  const candidates=new Set([fallback]);
  for(const key of MY_COLLECTIONS){
    if(!Array.isArray(input[key]))continue;
    for(const rec of input[key]){
      const year=myYearOf(rec,key,fallback);candidates.add(year);
      if(rec.performanceYear!==year){rec.performanceYear=year;updated=true;}
    }
  }
  for(const t of input.ikiTargets){
    const yr=myStoredYear(t?.year)||fallback;
    if(yr!==t.year){t.year=yr;updated=true;}
    candidates.add(yr);
  }
  for(const year of [...candidates].sort((a,b)=>a-b)){
    if(!seen.has(year)){input.years.push({year,status:'terbuka',createdAt:new Date().toISOString(),source:'Migrasi kompatibilitas / tahun baru'});updated=true;seen.add(year);}
  }
  input.years.sort((a,b)=>b.year-a.year);
  let selected=myStoredYear(input.activeYear);
  if(!selected||!seen.has(selected)){selected=fallback;input.activeYear=selected;updated=true;}
  if(input.multiyearVersion!==1){input.multiyearVersion=1;updated=true;}
  if(input.schema!==3){input.schema=3;updated=true;}
  return updated;
}
function ensureMultiYear(){return myEnsureYears(data);}
function myActiveYear(){return myStoredYear(data?.activeYear)||myDefaultYear();}
function myYearEntry(year=myActiveYear()){return data.years.find(x=>x.year===Number(year));}
function myYearArchived(year=myActiveYear()){return myYearEntry(year)?.status==='arsip';}
function myItems(key,year=myActiveYear()){return (Array.isArray(data?.[key])?data[key]:[]).filter(x=>myYearOf(x,key)===Number(year));}
function myAllowWrite(record=null){
  if(myYearArchived()){toast(`Tahun ${myActiveYear()} diarsipkan. Buka arsip terlebih dahulu untuk mengubah data.`,true);return false;}
  if(record && myYearOf(record,MY_COLLECTIONS.find(k=>data[k]?.includes(record))||'tasks')!==myActiveYear()){
    toast('Catatan berada pada tahun kinerja lain. Pilih tahunnya sebelum mengubah.',true);return false;
  }
  return true;
}
function mySelectionHtml(){
  const options=data.years.map(x=>`<option value="${x.year}" ${x.year===myActiveYear()?'selected':''}>${x.year}${x.status==='arsip'?' · Arsip':''}</option>`).join('');
  return `<label class="my-year-picker">Tahun kinerja <select id="myActiveYearSelect" aria-label="Pilih tahun kinerja">${options}</select></label>`;
}
function myBanner(){return `<div class="my-year-banner"><span>🗓️ <b>Tahun kinerja ${myActiveYear()}</b> ${myYearArchived()?'<span class="my-locked">Arsip · hanya baca</span>':'<span class="my-open">Aktif diedit</span>'}</span><button class="btn sm ghost" data-action="navigate" data-view="tahun">Kelola tahun →</button></div>`;}
function myStats(year){
  return {tasks:myItems('tasks',year).length,reviews:myItems('reviews',year).length,evidence:myItems('evidence',year).length,
    rhks:myItems('rhks',year).length,directives:myItems('directives',year).length,meetings:myItems('meetings',year).length,dims:myItems('dims',year).length,
    done:myItems('tasks',year).filter(x=>x.status==='Selesai').length};
}
function myYearIntegrity(year=myActiveYear()){
  const problems=[];
  const allRhks=data.rhks||[],allTasks=data.tasks||[],allWf=[...(data.directives||[]),...(data.meetings||[]),...(data.dims||[])];
  function refCheck(rec,refKey,refs,name){if(!rec[refKey])return;const target=refs.find(x=>x.id===rec[refKey]);if(!target)problems.push({entity:rec.title||rec.id,message:name+' tidak ditemukan'});
    else if(target.performanceYear!==year)problems.push({entity:rec.title||rec.id,message:name+' berasal dari tahun '+target.performanceYear});}
  for(const r of myItems('tasks',year)){refCheck(r,'rhkId',allRhks,'RHK');}
  for(const r of myItems('reviews',year)){refCheck(r,'taskId',allTasks,'Tugas');}
  for(const r of myItems('evidence',year)){refCheck(r,'taskId',allTasks,'Tugas');refCheck(r,'rhkId',allRhks,'RHK');refCheck(r,'workflowRefId',allWf,'Agenda/disposisi/DIM');}
  for(const key of ['directives','meetings','dims'])for(const r of myItems(key,year))refCheck(r,'rhkId',allRhks,'RHK');
  if(typeof LC!=='undefined'&&Array.isArray(data.lifecycle)){for(const issue of LC.orphaned(data,year))problems.push({entity:'Siklus kerja',message:issue});}
  return problems;
}
function myYearPage(){
  const year=myActiveYear(),archived=myYearArchived(),s=myStats(year),issues=myYearIntegrity(year);
  const rows=data.years.map(x=>{const st=myStats(x.year);return `<tr><td><b>${x.year}</b>${x.year===year?' · dipilih':''}</td><td>${x.status==='arsip'?'<span class="tag gray">Arsip / terkunci</span>':'<span class="tag">Terbuka</span>'}</td><td>${st.tasks}</td><td>${st.rhks}</td><td>${st.evidence}</td><td><button class="btn sm ghost" data-action="my-switch" data-year="${x.year}">Buka tahun</button></td></tr>`}).join('');
  const ikRows=(KATALOG.iki_individu||[]).map(k=>{
    const setting=(data.ikiTargets||[]).find(x=>x.year===year&&x.ikiId===k.id);
    const matched=myItems('tasks',year).filter(x=>x.ikiId===k.id).length+myItems('directives',year).filter(x=>x.ikiId===k.id).length+myItems('meetings',year).filter(x=>x.ikiId===k.id).length+myItems('dims',year).filter(x=>x.ikiId===k.id).length;
    return `<tr><td><b>${txt(k.id)}</b><div class="subline">${txt(k.nama||k.indikator||'Indikator individu')}</div></td><td>${txt(setting?.target||'Belum diatur')}<div class="subline">${txt(setting?.unit||'')}</div></td><td>${setting?.status==='Dicatat sesuai SKP'?'Dicatat sesuai SKP':'Draf / belum disahkan'}</td><td>${matched} catatan tertaut</td><td>${archived?'—':`<button class="btn sm ghost" data-action="my-iki-edit" data-id="${txt(k.id)}">Atur</button>`}</td></tr>`;
  }).join('');
  return `${myBanner()}${issues.length?`<div class="callout warn"><b>${issues.length} tautan perlu diperiksa</b> karena referensi tidak ditemukan atau mengarah ke tahun lain: ${issues.slice(0,5).map(x=>txt(x.entity+" — "+x.message)).join("; ")}. Perbaiki penautan sebelum mengarsipkan tahun.</div>`:""}<div class="section-head"><div><h3>Manajemen tahun kinerja</h3><p>Tahun berbeda, satu brankas. Data lama tidak terhapus ketika berganti tahun.</p></div><button class="btn" data-action="my-new">＋ Tahun Baru</button></div>
  <div class="stats"><div class="stat"><div class="label">Tugas ${year}</div><div class="value">${s.tasks}</div><div class="note">${s.done} selesai</div></div><div class="stat"><div class="label">RHK ${year}</div><div class="value">${s.rhks}</div><div class="note">Khusus periode ini</div></div><div class="stat"><div class="label">Bukti ${year}</div><div class="value">${s.evidence}</div><div class="note">Tak tercampur tahun lain</div></div><div class="stat"><div class="label">Persidangan & Sekwan</div><div class="value">${s.meetings+s.directives+s.dims}</div><div class="note">Tahun terpilih</div></div></div>
  <section class="card"><div class="section-head"><div><h3>Tahun yang tersimpan</h3><p>Buka tahun untuk melihat kembali pekerjaan dan hasilnya.</p></div></div><div class="table-scroller"><table class="data-table"><thead><tr><th>Tahun</th><th>Status</th><th>Tugas</th><th>RHK</th><th>Bukti</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table></div></section>
  <div class="split2"><section class="card"><h3>Transisi akhir tahun</h3><p class="hint">Salin RHK sebagai <b>draf tanpa target</b>; rumusan dan indikator perlu ditinjau berdasarkan SKP tahun baru. Tidak menyalin bukti/tugas tahun sebelumnya.</p><div class="actions"><button class="btn secondary" data-action="my-copy">Salin RHK ke tahun lain</button>${archived?'<button class="btn secondary" data-action="my-reopen">Buka kembali tahun arsip</button>':'<button class="btn danger" data-action="my-archive">Arsipkan & kunci tahun</button>'}</div><p class="hint">Pengarsipan adalah kunci edit dalam SIPETAK, bukan tanda tangan, penetapan SKP, atau arsip elektronik yang tak dapat diubah secara hukum.</p></section>
  <section class="card"><h3>Laporan tahunan</h3><p class="hint">Rekap semua catatan dengan penanda tahun kinerja, tanpa menghitung ganda satu pekerjaan dalam tahun berbeda.</p><div class="actions"><button class="btn secondary" data-action="my-annual-csv">↓ CSV Tahun ${year}</button><button class="btn ghost" data-action="my-annual-print">Cetak / PDF</button><button class="btn ghost" data-action="backup">Cadangan brankas</button></div><p class="hint">Saat mengarsipkan tahun, cadangkan seluruh brankas. Pemulihan cadangan akan mengganti semua tahun di perangkat.</p></section></div>
  <section class="card"><div class="section-head"><div><h3>Target IKI tahun ${year}</h3><p>Contoh indikator pribadi dari katalog usulan; target tahunan harus diisi berdasarkan SKP yang disepakati.</p></div></div><div class="callout warn">Angka catatan tertaut adalah <b>volume administrasi</b>, bukan otomatis realisasi atau nilai IKI. Indikator organisasi Renstra dan SKP resmi tidak diubah oleh aplikasi.</div><div class="table-scroller"><table class="data-table"><thead><tr><th>Indikator</th><th>Target tahun ini</th><th>Status</th><th>Tautan pekerjaan</th><th>Aksi</th></tr></thead><tbody>${ikRows}</tbody></table></div></section>`;
}
function myNewYearModal(){
  openModal('Tambahkan tahun kinerja','Tahun baru tetap memakai satu brankas terenkripsi, tanpa menghapus histori.',`<div class="form-grid">${field('Tahun baru','year','number',String(myActiveYear()+1),'Contoh: 2027',true,true,'min="2000" max="2100"')}</div><p class="hint">Data periode sebelumnya tetap disimpan. RHK dan target IKI tidak otomatis dipindahkan.</p>`,null,'myNewYearForm');
  $('myNewYearForm').addEventListener('submit',async e=>{e.preventDefault();const y=Number(new FormData(e.currentTarget).get('year'));if(!myValidYear(y))return toast('Masukkan tahun 2000–2100.',true);if(data.years.some(x=>x.year===y))return toast('Tahun tersebut sudah tersedia.',true);data.years.push({year:y,status:'terbuka',createdAt:isoNow(),source:'Dibuat pengguna'});data.years.sort((a,b)=>b.year-a.year);data.activeYear=y;data.profile.skpYear=String(y);reportMonth=`${y}-${today().slice(5,7)}`;wfAudit('tahun','Dibuat',{id:'YEAR-'+y,title:'Tahun kinerja '+y});await queueSave();closeModal();renderNav();render();toast('Tahun '+y+' siap digunakan.');});
}
async function mySwitchYear(y){
  if(!data.years.some(x=>x.year===y))return toast('Tahun tidak ditemukan.',true);
  data.activeYear=y;data.profile.skpYear=String(y);reportMonth=`${y}-${today().slice(5,7)}`;
  await queueSave();render();toast('Menampilkan tahun kinerja '+y+'.');
}
function myDuplicateRhks(sourceYear,targetYear){
  const source=myItems('rhks',sourceYear);let copies=0;
  if(!data.years.some(x=>x.year===targetYear&&x.status==='terbuka'))throw Error('Tahun tujuan tidak dapat diedit.');
  for(const r of source){
    if(data.rhks.some(x=>x.performanceYear===targetYear&&x.copiedFrom===r.id))continue;
    data.rhks.push({id:uid('RHK'),title:r.title,indicator:r.indicator||'',target:'',notes:'Salinan DRAF dari '+sourceYear+'. Verifikasi kembali terhadap SKP tahun '+targetYear+'.',period:String(targetYear),performanceYear:targetYear,status:'Draf',copiedFrom:r.id,createdAt:isoNow(),updatedAt:isoNow()});copies++;
  }return copies;
}
function myCopyRhksModal(){
  // Copying FROM an archived source is allowed; the archived records are never modified.
  const candidates=data.years.filter(x=>x.year!==myActiveYear()&&x.status!=='arsip');
  if(!candidates.length)return toast('Buat tahun tujuan yang terbuka terlebih dahulu.',true);
  const src=myItems('rhks');if(!src.length)return toast('Belum ada RHK pada tahun sumber.',true);
  const body=`<div class="form-grid"><div class="field span2"><label>Tahun tujuan</label><select name="year" required>${candidates.map(x=>`<option value="${x.year}">${x.year}</option>`).join('')}</select></div></div><div class="callout warn">Hanya <b>judul dan indikator</b> disalin sebagai DRAF. Target, evaluasi, status persetujuan dan bukti tidak ikut disalin. RHK salinan belum otomatis berlaku pada SKP tahun tujuan.</div>`;
  openModal('Salin RHK sebagai draf','Gunakan untuk menyusun SKP tahun berikutnya, lalu cocokkan dengan dokumen yang disepakati.',body,null,'myCopyForm');
  $('myCopyForm').addEventListener('submit',async e=>{e.preventDefault();const target=Number(new FormData(e.currentTarget).get('year'));if(!data.years.some(x=>x.year===target&&x.status==='terbuka'))return toast('Tahun tujuan tidak dapat diedit.',true);const copies=myDuplicateRhks(myActiveYear(),target);wfAudit('tahun','Salin RHK',{id:'YEAR-'+target,title:`${copies} RHK ke ${target} sebagai draf`});await queueSave();closeModal();render();toast(copies?`${copies} RHK disalin sebagai draf tanpa target.`:'Semua RHK sebelumnya sudah pernah disalin ke tahun tersebut.');});
}
function myIkiModal(id){if(!myAllowWrite())return;const r=(KATALOG.iki_individu||[]).find(x=>x.id===id);if(!r)return toast('IKI tidak dikenali.',true);const year=myActiveYear();const old=data.ikiTargets.find(x=>x.year===year&&x.ikiId===id)||{};openModal('Target IKI · '+id,'Setiap tahun mempunyai target dan dasar tersendiri.',`<div class="form-grid"><div class="field span2"><b>${txt(r.nama||r.indikator||id)}</b></div>${field('Target sesuai SKP (jangan otomatis memakai contoh)','target','text',old.target||'','Contoh: 95% / 12 dokumen',false,true)}${field('Satuan','unit','text',old.unit||r.satuan||'','Contoh: persen / dokumen',false,true)}${field('Status referensi','status','select','','',false,true,['Draf','Dicatat sesuai SKP'].map(s=>`<option value="${s}" ${s===(old.status||'Draf')?'selected':''}>${s}</option>`).join(''))}${field('Dasar, nomor SKP, dan catatan','notes','textarea',old.notes||'','Cantumkan sumber bila status sesuai SKP',false,true)}</div>`,null,'myIkiForm');$('myIkiForm').addEventListener('submit',async e=>{e.preventDefault();const v=formValue(e.currentTarget);if(v.status==='Dicatat sesuai SKP'&&!v.notes.trim())return toast('Isi rujukan SKP untuk status sesuai SKP.',true);const obj={year,ikiId:id,target:v.target.trim(),unit:v.unit.trim(),status:v.status,notes:v.notes.trim(),updatedAt:isoNow()};if(old.ikiId)Object.assign(old,obj);else data.ikiTargets.push(obj);wfAudit('iki','Diatur',{id:id+'-'+year,title:'Target IKI '+id+' tahun '+year});await queueSave();closeModal();render();toast('Target IKI '+year+' disimpan.');});}
async function myArchive(){if(!myAllowWrite())return;const year=myActiveYear();if(!data.lastBackupAt||Date.now()-Date.parse(data.lastBackupAt)>7*86400000){toast('Unduh cadangan terbaru (maksimal 7 hari) sebelum pengarsipan.',true);return;}
  const s=myStats(year),issues=myYearIntegrity(year);if(issues.length){toast("Periksa "+issues.length+" tautan lintas-tahun atau hilang sebelum mengarsipkan.",true);return;}const openTasks=myItems('tasks').filter(x=>x.status!=='Selesai').length;
  const entered=prompt(`Arsipkan tahun ${year}? ${openTasks} tugas belum selesai. Catatan terkunci untuk perubahan dan alarm tahun arsip dihentikan.\nKetik ARSIP ${year} untuk menyetujui:`);
  if(entered!==`ARSIP ${year}`)return;
  const row=myYearEntry();row.status='arsip';row.archivedAt=isoNow();row.archiveSummary=s;
  wfAudit('tahun','Diarsipkan',{id:'YEAR-'+year,title:'Tahun kinerja '+year});await queueSave();render();toast('Tahun '+year+' masuk arsip baca-saja.');
}
async function myReopen(){const row=myYearEntry();if(row?.status!=='arsip')return;const y=row.year;if(prompt(`Buka kembali tahun ${y} untuk mengubah data historis? Ketik BUKA ${y}:`)!==`BUKA ${y}`)return;
  row.status='terbuka';row.reopenedAt=isoNow();wfAudit('tahun','Dibuka kembali',{id:'YEAR-'+y,title:'Tahun kinerja '+y});await queueSave();render();toast('Tahun '+y+' kembali dapat diedit.');
}
function myAnnualRows(){const yr=myActiveYear();return [
  ...myItems('tasks').map(x=>[yr,'Tugas',x.date||'',x.title,x.status||'',x.output||'',x.rhkId||'']),
  ...myItems('reviews').map(x=>[yr,'Telaahan',x.date||'',x.title,x.status||'',x.recommendation||'',x.taskId||'']),
  ...myItems('evidence').map(x=>[yr,'Bukti',x.date||'',x.title,x.type||'',x.description||'',x.rhkId||'']),
  ...myItems('rhks').map(x=>[yr,'RHK',x.period||'',x.title,x.status||'Draf',x.target||'',x.id]),
  ...myItems('directives').map(x=>[yr,'Disposisi',x.receivedAt||'',x.title,x.status||'',x.output||'',x.rhkId||'']),
  ...myItems('meetings').map(x=>[yr,'Persidangan',x.meetingAt||'',x.title,x.minutesStatus||'',x.result||'',x.rhkId||'']),
  ...myItems('dims').map(x=>[yr,'DIM',x.dueAt||'',x.title,x.status||'',x.result||'',x.rhkId||''])
 ];}
function myAnnualCsv(){const q=v=>'"'+String(v??'').replace(/"/g,'""')+'"';const lines=[['Tahun Kinerja','Jenis','Tanggal / Periode','Uraian','Status','Output / Keterangan','Referensi'],...myAnnualRows()].map(row=>row.map(q).join(';'));blobDownload('SIPETAK-REKAP-TAHUN-'+myActiveYear()+'.csv','\ufeff'+lines.join('\r\n'),'text/csv;charset=utf-8');toast('Rekap tahun '+myActiveYear()+' siap diunduh.');}
function myAnnualPrint(){const s=myStats(myActiveYear());let html=`<h1>REKAP KINERJA TAHUN ${myActiveYear()}</h1><p>Nama: ${txt(data.profile.name||'—')} • Jabatan: ${txt(data.profile.role||'—')}</p><p>Tugas ${s.tasks} (selesai ${s.done}), telaahan ${s.reviews}, bukti ${s.evidence}, RHK ${s.rhks}, agenda/disposisi ${s.directives}, persidangan ${s.meetings}, DIM ${s.dims}.</p><p><b>Rekap ini merupakan catatan pribadi, bukan penilaian/evaluasi SKP resmi.</b></p><table><thead><tr><th>Jenis</th><th>Tanggal</th><th>Uraian</th><th>Status</th><th>Hasil</th></tr></thead><tbody>`;html+=myAnnualRows().map(r=>`<tr><td>${txt(r[1])}</td><td>${txt(r[2])}</td><td>${txt(r[3])}</td><td>${txt(r[4])}</td><td>${txt(r[5])}</td></tr>`).join('')+'</tbody></table>';documentPrint('Rekap tahunan SIPETAK',html);}
function myHandleClick(el){const a=el.dataset.action;if(!a?.startsWith('my-'))return false;
 if(a==='my-new')myNewYearModal();else if(a==='my-switch')mySwitchYear(Number(el.dataset.year)).catch(fail);else if(a==='my-copy')myCopyRhksModal();else if(a==='my-iki-edit')myIkiModal(el.dataset.id);else if(a==='my-archive')myArchive().catch(fail);else if(a==='my-reopen')myReopen().catch(fail);else if(a==='my-annual-csv')myAnnualCsv();else if(a==='my-annual-print')myAnnualPrint();return true;
}
function myHandleSelect(e){if(e.target?.id==='myActiveYearSelect'){mySwitchYear(Number(e.target.value)).catch(fail);return true;}return false;}
