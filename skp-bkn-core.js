'use strict';
/* SIPETAK BKN helper v1 — local, deterministic, no API, no fabricated assessment. */
(function(root){
 const LABELS={tugas:'Tugas Harian',catatan:'Catatan Kerja',telaah:'Telaahan Staf',bukti:'Bukti Dukung',disposisi:'Disposisi',rapat:'Persidangan',dim:'Raperda / DIM',sekwan:'Tracking Raperda Sekwan'};
 const SOURCES=[['tasks','tugas'],['personalNotes','catatan'],['reviews','telaah'],['evidence','bukti'],['directives','disposisi'],['meetings','rapat'],['dims','dim'],['sekwanBills','sekwan']];
 const BEHAVIORS=['Berorientasi Pelayanan','Akuntabel','Kompeten','Harmonis','Loyal','Adaptif','Kolaboratif'];
 const clean=(x,max=240)=>String(x??'').trim().slice(0,max);
 const yearOf=(row,kind)=>{
  const explicit=Number(row?.performanceYear);
  if(Number.isInteger(explicit)&&explicit>=2000&&explicit<=2100)return explicit;
  for(const k of (kind==='disposisi'?['receivedAt','date','createdAt']:kind==='rapat'?['meetingAt','date','createdAt']:['date','createdAt'])){
   const m=String(row?.[k]||'').match(/^(\d{4})[-/]/);if(m)return Number(m[1]);
  }
  return null; // no guessing from the active year
 };
 function sources(vault,year){
  const list=[];
  for(const [collection,kind] of SOURCES){
   for(const x of Array.isArray(vault?.[collection])?vault[collection]:[]){
    if(yearOf(x,kind)!==Number(year)||!x?.id)continue;
    const title=clean(x.title||x.name||x.perda||x.issue||x.purpose||'Catatan tanpa judul',250);
    const date=clean(x.date||x.meetingAt||x.receivedAt||x.createdAt,32).slice(0,10);
    const status=clean(x.status||x.prepStatus||x.verificationStatus||'',90);
    const sourceNoteId=clean(x.sourceNoteId||x.sourceTextNoteId,100);
    list.push({kind,collection,id:clean(x.id,100),key:kind+':'+clean(x.id,100),title,date,status,classification:clean(x.classification||'Internal',30),rhkId:clean(x.rhkId,100),taskId:clean(x.taskId,100),sourceNoteId,verifiedEvidence:kind==='bukti'&&['Terverifikasi','Diverifikasi','Diperiksa'].includes(x.verificationStatus),hasMaterial:kind==='bukti'&&!!(x.file||clean(x.description)),root:sourceNoteId||clean(x.id,100),generated:!!sourceNoteId});
   }
  }
  return list.sort((a,b)=>b.date.localeCompare(a.date)||a.key.localeCompare(b.key));
 }
 function resolveRhk(row,rows,links,validIds){
  const manual=links.find(x=>x.key===row.key);if(manual)return validIds.has(manual.rhkId)?manual.rhkId:'';
  const assigned=clean(row.rhkId,100);if(validIds.has(assigned))return assigned;
  if(row.sourceNoteId){
   const note=links.find(x=>x.key==='catatan:'+row.sourceNoteId)?.rhkId;
   if(validIds.has(note))return note;
  }
  if(row.kind==='catatan'){
   const derived=rows.filter(x=>x.sourceNoteId===row.id&&validIds.has(x.rhkId));
   const unique=[...new Set(derived.map(x=>x.rhkId))];if(unique.length===1)return unique[0];
  }
  if(row.kind==='bukti'&&row.taskId){
   const task=rows.find(x=>x.kind==='tugas'&&x.id===row.taskId);
   if(task){const mapped=links.find(x=>x.key===task.key)?.rhkId||task.rhkId;if(validIds.has(mapped))return mapped;}
  }
  return '';
 }
 function compute(vault,year){
  const y=Number(year);if(!Number.isInteger(y)||y<2000||y>2100)throw Error('Tahun SKP tidak valid.');
  const rhks=(Array.isArray(vault?.rhks)?vault.rhks:[]).filter(x=>yearOf(x,'rhk')===y||!x.performanceYear&&String(x.period||'').includes(String(y)));
  const ids=new Set(rhks.map(x=>x.id)),rows=sources(vault,y);
  const links=(Array.isArray(vault?.skpBknLinks)?vault.skpBknLinks:[]).filter(x=>x.year===y);
  const linked=rows.map(r=>({...r,mappedRhkId:resolveRhk(r,rows,links,ids)}));
  const sections=rhks.map(r=>{
   const entries=linked.filter(x=>x.mappedRhkId===r.id),work=entries.filter(x=>x.kind!=='bukti'),ev=entries.filter(x=>x.kind==='bukti'),done=work.filter(x=>x.kind==='tugas'&&x.status==='Selesai');
   return {rhk:r,role:/^(RHK-AS-)/.test(r.catalogRhkId||'')||r.skpRole==='tambahan'?'tambahan':'utama',entries,workCount:new Set(work.map(x=>x.root)).size,completedCount:new Set(done.map(x=>x.root)).size,evidenceCount:ev.length,checkedEvidenceCount:ev.filter(x=>x.verifiedEvidence&&x.hasMaterial).length};
  });
  return {year:y,rhks:sections,rows:linked,unmapped:linked.filter(x=>!x.mappedRhkId),summary:{work:new Set(linked.filter(x=>x.kind!=='bukti'&&x.mappedRhkId).map(x=>x.root)).size,unmapped:linked.filter(x=>!x.mappedRhkId).length,evidence:linked.filter(x=>x.kind==='bukti'&&x.mappedRhkId).length}};
 }
 function profile(vault,year){
  const r=(Array.isArray(vault?.skpBknProfiles)?vault.skpBknProfiles:[]).find(x=>x.year===Number(year))||{};
  return {year:Number(year),name:clean(r.name||vault?.profile?.name,150),nip:clean(r.nip,32),position:clean(r.position||vault?.profile?.role,140),unit:clean(r.unit||vault?.profile?.unit,180),organization:clean(r.organization||vault?.profile?.organization,190),reviewer:clean(r.reviewer,150),reviewerNip:clean(r.reviewerNip,32),reviewerPosition:clean(r.reviewerPosition,140),parentRhk:clean(r.parentRhk,900),approach:['Kualitatif','Kuantitatif'].includes(r.approach)?r.approach:'Kualitatif',start:r.start||`${year}-01-01`,end:r.end||`${year}-12-31`,expectation:clean(r.expectation,2000),behavior:BEHAVIORS.map((_,i)=>clean(r.behavior?.[i],500)),lastDialogue:clean(r.lastDialogue,30),dialogueNote:clean(r.dialogueNote,1200),sourceDocument:clean(r.sourceDocument,500)};
 }
 function validateProfile(v,year){
  const p={year:Number(year),name:clean(v.name,150),nip:clean(v.nip,32),position:clean(v.position,140),unit:clean(v.unit,180),organization:clean(v.organization,190),reviewer:clean(v.reviewer,150),reviewerNip:clean(v.reviewerNip,32),reviewerPosition:clean(v.reviewerPosition,140),parentRhk:clean(v.parentRhk,900),approach:v.approach==='Kuantitatif'?'Kuantitatif':'Kualitatif',start:v.start,end:v.end,expectation:clean(v.expectation,2000),behavior:BEHAVIORS.map((_,i)=>clean(v['behavior'+i],500)),lastDialogue:clean(v.lastDialogue,30),dialogueNote:clean(v.dialogueNote,1200),sourceDocument:clean(v.sourceDocument,500)};
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.start)||!/^\d{4}-\d{2}-\d{2}$/.test(p.end)||p.start>p.end||!p.start.startsWith(String(year))||!p.end.startsWith(String(year)))throw Error('Periode SKP harus tanggal valid di tahun kinerja aktif.');
  for(const k of ['nip','reviewerNip'])if(p[k]&&!/^\d{8,20}$/.test(p[k]))throw Error('NIP harus berisi angka, atau biarkan kosong jika belum tersedia.');
  return p;
 }
 const escapeHTML=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const printable=x=>x.classification==='Terbatas'?'[Materi Terbatas — judul disembunyikan]':x.title;
 function documentModel(vault,year){const result=compute(vault,year),person=profile(vault,year);
  return {result,person,sections:result.rhks.map(s=>({id:s.rhk.id,parentRhk:((vault.skpBknRhkDetails||[]).find(r=>r.year===Number(year)&&r.rhkId===s.rhk.id)?.parentRhk||''),kind:s.role==='tambahan'?'HASIL KERJA TAMBAHAN':'HASIL KERJA UTAMA',title:s.rhk.title,indicator:s.rhk.indicator||'',target:s.rhk.target||'',status:s.rhk.status||'Draf',activities:s.entries.filter(x=>x.kind!=='bukti'),evidences:s.entries.filter(x=>x.kind==='bukti'),total:s.workCount,completed:s.completedCount}))};
 }
 function csvRows(vault,year){const m=documentModel(vault,year);const out=[['Tahun','Jenis hasil kerja','RHK individu (draf)','RHK pimpinan yang diintervensi (isi sesuai SKP resmi)','Indikator','Target','Status RHK','Referensi aktivitas','Tanggal','Status pekerjaan','Referensi bukti','Catatan']];
  for(const s of m.sections){const ev=s.evidences.map(e=>e.id).join(', ');if(s.activities.length){for(const a of s.activities)out.push([year,s.kind,s.title,s.parentRhk,s.indicator,s.target,s.status,a.kind+':'+a.id,a.date,a.status,ev,'Draf bantuan; cek kecocokan dengan SKP resmi']);}
   else out.push([year,s.kind,s.title,s.parentRhk,s.indicator,s.target,s.status,'','','',ev,'Belum ada aktivitas terkait']);}
  return out;
 }
 function printableHTML(vault,year){const m=documentModel(vault,year),e=escapeHTML;const cell=x=>e(x||'—');let n=0;
  const table=kind=>{
   const rows=m.sections.filter(x=>x.kind===kind);return `<h2>${e(kind)}</h2><table><thead><tr><th>No.</th><th>RHK Pimpinan yang Diintervensi</th><th>Rencana Hasil Kerja Individu</th><th>Indikator Kinerja Individu</th><th>Target / Ekspektasi</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${++n}</td><td>${cell(x.parentRhk)}</td><td>${cell(x.title)}<br><small>${cell(x.status)}</small></td><td>${cell(x.indicator)}</td><td>${cell(x.target)}</td></tr>`).join('')||'<tr><td colspan="5">Belum ada RHK.</td></tr>'}</tbody></table>`;
  };
  const output=m.sections.map(s=>`<h3>${e(s.kind)} — ${cell(s.title)}</h3><p>Catatan kegiatan unik: ${s.total}; tugas selesai tercatat: ${s.completed}. <b>Bukan skor SKP.</b></p><table><thead><tr><th>Tanggal</th><th>Sumber</th><th>Uraian singkat</th><th>Status</th></tr></thead><tbody>${s.activities.map(a=>`<tr><td>${cell(a.date)}</td><td>${cell(LABELS[a.kind])} (${cell(a.id)})</td><td>${cell(printable(a))}</td><td>${cell(a.status)}</td></tr>`).join('')||'<tr><td colspan="4">Belum ada aktivitas yang dipetakan.</td></tr>'}</tbody></table><p><b>Referensi bukti:</b> ${s.evidences.map(x=>cell(x.id)+(x.verifiedEvidence&&x.hasMaterial?' (terverifikasi)':' (perlu periksa)')).join('; ')||'Belum ada'}</p>`).join('');
  return `<div class="skp-bkn-print"><h1>RANCANGAN SASARAN KINERJA PEGAWAI (SKP)</h1><p class="skp-bkn-stamp">BAHAN BANTU PENGISIAN E-KINERJA BKN — BELUM DISEPAKATI / DISAHKAN</p><p>Periode: ${cell(m.person.start)} s.d. ${cell(m.person.end)} · Pendekatan: ${cell(m.person.approach)}</p><table><tbody><tr><th>PEGAWAI</th><th>PEJABAT PENILAI KINERJA</th></tr><tr><td>Nama: ${cell(m.person.name)}<br>NIP: ${cell(m.person.nip)}<br>Jabatan: ${cell(m.person.position)}<br>Unit: ${cell(m.person.unit)}</td><td>Nama: ${cell(m.person.reviewer)}<br>NIP: ${cell(m.person.reviewerNip)}<br>Jabatan: ${cell(m.person.reviewerPosition)}<br>Organisasi: ${cell(m.person.organization)}</td></tr></tbody></table><p>Rujukan dokumen resmi: ${cell(m.person.sourceDocument)}<br>Dialog kinerja: ${cell(m.person.lastDialogue)} — ${cell(m.person.dialogueNote)}</p>${table('HASIL KERJA UTAMA')}${table('HASIL KERJA TAMBAHAN')}<h2>PERILAKU KERJA YANG DIHARAPKAN</h2><table><thead><tr><th>Nilai</th><th>Ekspektasi pimpinan (perlu konfirmasi)</th></tr></thead><tbody>${BEHAVIORS.map((b,i)=>`<tr><td>${e(b)}</td><td>${cell(m.person.behavior[i])}</td></tr>`).join('')}</tbody></table><p><b>Ekspektasi umum:</b> ${cell(m.person.expectation)}</p><h2>LAMPIRAN REKAP REALISASI (BAHAN PEMERIKSAAN)</h2>${output}<p class="skp-bkn-stamp">Tidak ada penetapan nilai/label evaluasi otomatis. Jumlah pekerjaan, catatan, dan bukti bukan capaian SKP tanpa verifikasi atasan dan bukti empiris.</p><p>Dibuat di SIPETAK pribadi. Untuk pengisian manual ke e-Kinerja; bukan file impor resmi BKN.</p></div>`;
 }

 function rtfDocument(vault,year){
  const m=documentModel(vault,year);
  const esc=x=>String(x??'—').replace(/\\/g,'\\\\').replace(/[{}]/g,c=>'\\'+c).replace(/\r/g,'').replace(/\n/g,'\\par ').replace(/[^\x00-\x7f]/g,c=>{const n=c.charCodeAt(0);return `\\u${n>32767?n-65536:n}?`});
  const line=x=>'\\par '+esc(x);
  let out='{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Calibri;}}\\fs22 ';
  out+='\\b RANCANGAN SASARAN KINERJA PEGAWAI (SKP) \\b0';
  out+=line('BAHAN BANTU PENGISIAN E-KINERJA BKN — BELUM DISEPAKATI / DISAHKAN');
  for(const [label,value] of [['Tahun',year],['Pegawai',m.person.name],['NIP',m.person.nip],['Jabatan',m.person.position],['Unit kerja',m.person.unit],['Pejabat penilai',m.person.reviewer],['NIP penilai',m.person.reviewerNip],['Jabatan penilai',m.person.reviewerPosition],['Periode',m.person.start+' sampai '+m.person.end],['Pendekatan',m.person.approach],['Sumber dokumen SKP',m.person.sourceDocument],['Dialog kinerja',m.person.lastDialogue+' '+m.person.dialogueNote]])out+=line(label+': '+(value||'—'));
  for(const s of m.sections){out+=line('');out+='\\par\\b '+esc(s.kind)+'\\b0';out+=line('RHK individu: '+s.title);out+=line('RHK pimpinan diintervensi: '+(s.parentRhk||'—'));out+=line('Indikator: '+(s.indicator||'—'));out+=line('Target: '+(s.target||'—'));out+=line('Status: '+s.status);out+=line('Aktivitas unik: '+s.total+' (bukan skor evaluasi)');for(const a of s.activities)out+=line('• '+a.date+' '+LABELS[a.kind]+' '+a.id+' — '+printable(a));out+=line('Referensi bukti: '+(s.evidences.map(a=>a.id).join(', ')||'—'));}
  out+='\\par\\b PERILAKU KERJA \\b0';for(let i=0;i<BEHAVIORS.length;i++)out+=line(BEHAVIORS[i]+': '+(m.person.behavior[i]||'—'));
  out+=line('Ekspektasi umum: '+(m.person.expectation||'—'));
  out+=line('Draf pribadi, bukan file impor e-Kinerja. Perlu dialog dan persetujuan pejabat penilai.');
  return out+'}';
 }

 const api={LABELS,BEHAVIORS,yearOf,sources,resolveRhk,compute,profile,validateProfile,documentModel,csvRows,printableHTML,rtfDocument,escapeHTML};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 root.SIPETAK_BKN_CORE=api;
})(typeof window==='undefined'?globalThis:window);
