'use strict';
/* SIPETAK 3.4 — draf SKP, IKI, RHK, dan rencana aksi tahunan/bulanan.
 * Disimpan di JSON brankas terenkripsi lokal yang sudah disinkronkan sebagai satu envelope.
 * Tidak menyamakan rencana dengan SKP disetujui atau capaian nyata.
 */
const SIPETAK_SKP=Object.freeze({version:1, months:['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']});
let skpSelectedMonth=new Date().getMonth()+1;
// Referensi draf pribadi Renstra, SOP, dan rencana aksi 2026. Read-only, tidak mengubah catatan pengguna.
const SIPETAK_PTK_2026=Object.freeze({"status":"DRAF_BELUM_DISEPAKATI_ATASAN","sop":[{"id":"SOP-01","nama":"Penerimaan dan registrasi penugasan","langkah":["1. Terima arahan melalui jalur kedinasan dan klarifikasi hasil yang diminta.","2. Catat penugasan sekali di SIPETAK: asal, tanggal, tenggat, klasifikasi, dan RHK terkait.","3. Konfirmasi prioritas serta batas kewenangan dengan atasan.","4. Pecah tugas menjadi langkah kerja dan jadwal pemantauan.","5. Rekam status serta bukti penugasan yang boleh disimpan."],"output":"Kartu pekerjaan, tanggal jatuh tempo, RHK, sumber perintah, bukti penerimaan.","pihak_verifikasi":"Penelaah mencatat; Kabag/atasan mengarahkan dan mengonfirmasi.","batas_waktu":"Catat segera setelah penugasan; tenggat berdasarkan arahan.","rhk_ref":"RHK-PTK-01 s.d. 06"},{"id":"SOP-02","nama":"Telaahan teknis kebijakan","langkah":["1. Registrasi isu/pertanyaan dan ruang lingkup.","2. Himpun fakta, dokumen, dasar hukum, dan sumber resmi.","3. Pisahkan fakta, asumsi, dan masalah yang perlu dikonfirmasi.","4. Analisis pilihan kebijakan, manfaat, risiko, dan kesesuaian tugas.","5. Susun draf telaahan serta checklist sumber/struktur.","6. Serahkan kepada Kabag/atasan untuk koreksi; perbaiki dan catat versinya.","7. Arsipkan draf akhir yang disampaikan dan bukti penerimaan."],"output":"Telaahan/nota analisis draf, daftar rujukan, catatan reviu dan versi.","pihak_verifikasi":"Penelaah menyusun draf; atasan memeriksa/menyetujui sesuai kewenangan.","batas_waktu":"Sesuai tenggat penugasan, bukan batas baku Renstra.","rhk_ref":"RHK-PTK-01"},{"id":"SOP-03","nama":"Penyiapan bahan rapat dan persidangan","langkah":["1. Terima jadwal dan jenis rapat dari pejabat/sekretariat terkait.","2. Identifikasi kebutuhan bahan, rancangan agenda dan rujukan.","3. Gunakan daftar periksa: surat/agenda, daftar pihak, bahan substansi, dokumen terdahulu, dan perlengkapan dokumen.","4. Koordinasikan kekurangan kepada pihak berwenang.","5. Serahkan paket bahan untuk pemeriksaan sebelum rapat.","6. Catat versi bahan dan bukti penyerahan."],"output":"Paket bahan rapat, checklist kelengkapan, log penyerahan.","pihak_verifikasi":"Penelaah menyiapkan materi sesuai penugasan; pimpinan rapat/pejabat terkait menetapkan agenda resmi.","batas_waktu":"Sesuai batas internal yang disepakati sebelum rapat.","rhk_ref":"RHK-PTK-02"},{"id":"SOP-04","nama":"Penyusunan konsep risalah","langkah":["1. Terima penugasan pencatatan dan dokumen rapat.","2. Catat waktu, peserta menurut daftar hadir, agenda, inti pembahasan dan rumusan hasil yang terkonfirmasi.","3. Tandai bagian tidak jelas untuk konfirmasi, jangan mengarang pernyataan atau keputusan.","4. Susun konsep risalah memakai format yang ditetapkan.","5. Cocokkan dengan catatan dan lampiran yang tersedia.","6. Serahkan untuk verifikasi pejabat yang berwenang; revisi dengan riwayat perubahan.","7. Simpan bukti pengiriman dan versi yang telah diperiksa."],"output":"Konsep risalah, daftar hadir (jika boleh diakses), daftar verifikasi, berita tindak lanjut.","pihak_verifikasi":"Penelaah menyiapkan konsep; verifikasi/pengesahan oleh pejabat sesuai tata tertib.","batas_waktu":"Tenggat ditentukan atasan/prosedur rapat.","rhk_ref":"RHK-PTK-03"},{"id":"SOP-05","nama":"Penelaahan Raperda dan DIM","langkah":["1. Terima naskah Raperda, dasar penugasan dan batas pembahasan.","2. Susun tabel nomor pasal/ayat, isu, rujukan, alternatif dan alasan.","3. Verifikasi silang naskah terhadap bahan hukum yang tersedia; tandai yang memerlukan konsultasi hukum.","4. Susun konsep DIM secara terstruktur dan identifikasi konflik/ketidakjelasan redaksi.","5. Minta reviu Kabag/pejabat berwenang; tindak lanjuti koreksi.","6. Simpan naskah per versi dan tautannya ke penugasan."],"output":"Matriks penelaahan, DIM draf, daftar sumber/pasal, riwayat revisi.","pihak_verifikasi":"Penelaah mengolah bahan; keputusan atas substansi normatif bukan kewenangan pribadi.","batas_waktu":"Sesuai jadwal pembahasan yang ditetapkan.","rhk_ref":"RHK-PTK-04"},{"id":"SOP-06","nama":"Pemantauan tindak lanjut hasil rapat","langkah":["1. Terima rumusan hasil rapat yang sudah dikonfirmasi.","2. Daftarkan butir tindak lanjut, unit/PIC, tenggat dan status awal.","3. Konfirmasi informasi dengan pihak pelaksana melalui jalur resmi.","4. Perbarui status: belum mulai, proses, selesai dilaporkan, atau perlu eskalasi.","5. Ingatkan tenggat dan laporkan hambatan kepada atasan.","6. Tutup butir hanya jika bukti penyelesaian dan persetujuan yang diperlukan tersedia."],"output":"Register tindak lanjut dan bukti konfirmasi/pelaporan.","pihak_verifikasi":"Penelaah memantau informasi penugasan; PIC bertanggung jawab atas pelaksanaan.","batas_waktu":"Pembaruan berkala sesuai instruksi; eskalasi sebelum tenggat bila berisiko.","rhk_ref":"RHK-PTK-05"},{"id":"SOP-07","nama":"Bukti dukung, rekap bulanan, dan SKP","langkah":["1. Pilih pekerjaan yang selesai/dalam proses di SIPETAK.","2. Tautkan bukti sesuai ID pekerjaan dan tahun kinerja.","3. Lengkapi metadata: tanggal, jenis, sumber, klasifikasi akses, ringkasan, RHK.","4. Periksa apakah isi berkas memang boleh disimpan/sinkron/diolah AI.","5. Buat rekap bulanan berbasis pekerjaan dan bukti.","6. Hitung angka IKI dari pembilang dan penyebut riil; jika tak ada penugasan, tampilkan N/A.","7. Ajukan draf capaian kepada atasan untuk verifikasi; jangan otomatis tetapkan nilai."],"output":"Indeks bukti, rekap kerja, draf capaian RHK/IKI, daftar bukti kurang.","pihak_verifikasi":"Penelaah mengisi/melaporkan; atasan menilai atau mengesahkan sesuai mekanisme SKP.","batas_waktu":"Konsolidasi akhir setiap bulan; review triwulanan.","rhk_ref":"RHK-PTK-06"},{"id":"SOP-08","nama":"Pemakaian Asisten AI SIPETAK secara aman","langkah":["1. Pastikan materi tidak termasuk dokumen berklasifikasi yang dilarang dikirim ke penyedia AI.","2. Pilih atau ketik konteks minimal yang diperlukan, tanpa identitas sensitif.","3. Baca pratinjau materi dan setujui hanya jika diizinkan.","4. Gunakan hasil sebagai draf; uji setiap pasal, nomor peraturan, kutipan dan fakta pada sumber resmi.","5. Koreksi dan mintakan pemeriksaan sesuai prosedur.","6. Simpan hanya hasil yang sesuai izin klasifikasi dan dokumentasikan bahwa AI digunakan sebagai alat bantu."],"output":"Draf AI terverifikasi, sumber resmi, catatan koreksi; tidak ada pengesahan otomatis.","pihak_verifikasi":"Penelaah memeriksa; atasan memvalidasi sesuai kewenangan; admin AI tidak mengambil kewenangan.","batas_waktu":"Hanya jika diperlukan dan diizinkan; tanpa kewajiban pemakaian.","rhk_ref":"RHK-PTK-01/03/04/06"}],"months":[{"bulan":1,"nama_bulan":"Januari","aksi":"Klarifikasi ekspektasi RHK/IKI dan tenggat bersama atasan; sinkronkan agenda persidangan awal tahun; gunakan checklist SIPETAK.","bukti":"Draf SKP disepakati setelah dialog, daftar tugas aktif, agenda dan daftar bukti awal.","rhk_ref":"01-06"},{"bulan":2,"nama_bulan":"Februari","aksi":"Pelaksanaan telaahan dan penyiapan bahan rapat sesuai penugasan; mulai pemantauan ketepatan bahan dan reviu.","bukti":"Telaahan/agenda/bahan, checklist kelengkapan, log reviu.","rhk_ref":"01-03"},{"bulan":3,"nama_bulan":"Maret","aksi":"Lanjutkan pelayanan rapat/risalah dan telaahan DIM jika ada; evaluasi ketepatan waktu triwulan I.","bukti":"Rekap TW I, konsep risalah/DIM sesuai penugasan, daftar tindak lanjut.","rhk_ref":"02-06"},{"bulan":4,"nama_bulan":"April","aksi":"Perkuat basis rujukan kajian perundang-undangan; perbarui register tindak lanjut dan status bukti.","bukti":"Matriks pasal/DIM jika ditugaskan, register tindak lanjut tervalidasi.","rhk_ref":"01,04-06"},{"bulan":5,"nama_bulan":"Mei","aksi":"Fokus penyiapan bahan persidangan dan telaahan sesuai agenda aktual; lakukan pemeriksaan silang bukti.","bukti":"Paket rapat, telaahan, checklist dan arsip versi.","rhk_ref":"01-06"},{"bulan":6,"nama_bulan":"Juni","aksi":"Evaluasi semester I: periksa IKI dengan data pembilang/penyebut, telaah ketepatan waktu dan kualitas output.","bukti":"Laporan semester I berbasis bukti, daftar perbaikan SOP.","rhk_ref":"01-06"},{"bulan":7,"nama_bulan":"Juli","aksi":"Tindak lanjuti arahan penyesuaian semester II; rapikan matriks pekerjaan-RHK sesuai SKP yang disepakati.","bukti":"Rencana aksi diperbarui setelah dialog, registrasi tugas semester II.","rhk_ref":"01-06"},{"bulan":8,"nama_bulan":"Agustus","aksi":"Perbarui kualitas bahan kajian hukum, DIM, dan risalah; dokumentasikan revisi dan rujukan.","bukti":"Konsep risalah/telaahan/matriks sesuai penugasan, log versi.","rhk_ref":"01-04,06"},{"bulan":9,"nama_bulan":"September","aksi":"Evaluasi TW III: telaah tugas terlambat, bukti belum lengkap, dan tindak lanjut yang memerlukan eskalasi.","bukti":"Rekap TW III, daftar isu dan rekomendasi tindak lanjut.","rhk_ref":"05-06"},{"bulan":10,"nama_bulan":"Oktober","aksi":"Konsolidasikan kegiatan dan bukti menjelang akhir tahun; inventarisasi keluaran yang masih membutuhkan reviu.","bukti":"Daftar keluaran belum final, bukti belum lengkap, prioritas penyelesaian.","rhk_ref":"01-06"},{"bulan":11,"nama_bulan":"November","aksi":"Penyelesaian sesuai agenda terakhir; finalisasi konsep dan rekap yang telah diverifikasi, tanpa mengubah kewenangan pengesahan.","bukti":"Paket dokumen akhir sesuai penugasan, rekap penyelesaian dan bukti.","rhk_ref":"01-06"},{"bulan":12,"nama_bulan":"Desember","aksi":"Rekonsiliasi tahunan pekerjaan, indikator, dan arsip; susun bahan evaluasi SKP dan usulan perbaikan tahun berikut.","bukti":"Laporan draf kinerja tahunan, matriks IKI real, daftar arsip serta usulan 2027.","rhk_ref":"01-06"}]});
let skpRoleFilter='utama'; // Tugas utama tampil dahulu; tugas tambahan tersimpan tanpa dihapus.
function skpRoleIsExtra(row){return String(row?.peran||'').startsWith('Tambahan')||String(row?.id||'').startsWith('RHK-AS-');}
function skp2026Guide(year,month,role){
 if(role!=='utama')return `<section class="card"><h3>Tugas tambahan Asisten Sekwan</h3><p class="hint">Hanya berlaku berdasarkan arahan atau penugasan yang sah. Tidak otomatis menjadi RHK jabatan utama atau kewenangan Sekwan.</p></section>`;
 const focus=year===2026?SIPETAK_PTK_2026.months.find(x=>x.bulan===month):null;
 const items=SIPETAK_PTK_2026.sop;
 return `<section class="card skp-ptk-reference"><div class="section-head"><div><h3>Acuan kerja Penelaah Teknis Kebijakan</h3><p>Renstra Setwan 2025–2029 (Rancangan Akhir) · Usulan RHK, SOP operasional dan rencana aksi pribadi 2026.</p></div></div>
 <div class="callout"><b>Referensi, bukan penetapan SKP atau SOP resmi.</b> Hanya tugas yang benar-benar ditugaskan yang dilaksanakan. Pembahasan, verifikasi, dan pengesahan tetap sesuai kewenangan pejabat terkait.</div>
 ${focus?`<div class="skp-ptk-focus"><b>Fokus ${txt(focus.nama_bulan)} 2026</b><p>${txt(focus.aksi)}</p><div><b>Bukti yang perlu disiapkan:</b> ${txt(focus.bukti)}</div></div>`:`<p class="hint">Rencana aksi 12 bulan dari draf hanya berlaku untuk 2026. Sesuaikan tahun lain dengan Renja dan SKP yang disepakati.</p>`}
 <details class="skp-ptk-details"><summary>8 panduan SOP pekerjaan (buka untuk membaca)</summary><div class="skp-ptk-procedures">${items.map(sop=>`<details><summary><b>${txt(sop.id)}</b> — ${txt(sop.nama)}</summary><ol>${sop.langkah.map(x=>`<li>${txt(x.replace(/^\d+\.\s*/,''))}</li>`).join('')}</ol><p><b>Keluaran:</b> ${txt(sop.output)}</p><p><b>Verifikasi:</b> ${txt(sop.pihak_verifikasi)}</p><p><b>Waktu:</b> ${txt(sop.batas_waktu)}</p></details>`).join('')}</div></details>
 <p class="hint">Jejak perencanaan: Renstra → sasaran pelayanan → outcome persidangan dan kajian peraturan → Program 4.02.02 → kegiatan/subkegiatan yang relevan → RHK individu → pekerjaan → bukti. Kaitan ini bersifat usulan, bukan otomatis menetapkan capaian organisasi.</p></section>`;
}

const skpMonthLabel=m=>SIPETAK_SKP.months[Number(m)-1]||'—';
function skpSeedCollections(){
 if(!Array.isArray(data.skpPlans))data.skpPlans=[];
 if(!Array.isArray(data.skpActions))data.skpActions=[];
 if(!Array.isArray(data.skpActuals))data.skpActuals=[];
 if(!Array.isArray(data.ikiTargets))data.ikiTargets=[];
}
function skpGetPlan(year=myActiveYear()){return (data.skpPlans||[]).find(p=>p.year===Number(year));}
function skpActionTitle(code){const mapping={
  'RHK-PTK-01':['Inventarisasi isu dan penyusunan konsep telaahan teknis sesuai penugasan','Daftar isu, telaahan dan rujukan hukum'],
  'RHK-PTK-02':['Menyiapkan dan memeriksa kelengkapan bahan persidangan DPRD','Daftar periksa, bahan rapat dan agenda'],
  'RHK-PTK-03':['Menyusun konsep risalah dan menindaklanjuti hasil reviu','Konsep risalah dan jejak verifikasi'],
  'RHK-PTK-04':['Menginventarisasi isu pasal dan memperbarui matriks pembahasan Raperda/DIM','Matriks DIM dan referensi pasal'],
  'RHK-PTK-05':['Memantau butir hasil rapat yang ditugaskan dan pembaruan status tindak lanjut','Log tindak lanjut dengan PIC dan tenggat'],
  'RHK-PTK-06':['Memetakan hasil pekerjaan ke RHK dan memeriksa kelengkapan bukti dukung','Daftar bukti, klasifikasi dan rekap RHK'],
  'RHK-AS-01':['Memutakhirkan agenda Sekwan sesuai arahan dan konfirmasi kegiatan','Agenda dan daftar kebutuhan bahan'],
  'RHK-AS-02':['Menyiapkan ringkasan briefing dan bahan koordinasi Sekwan sesuai penugasan','Briefing note dan daftar isu prioritas'],
  'RHK-AS-03':['Mencatat dan memantau disposisi Sekwan yang ditugaskan','Log disposisi dan status konfirmasi'],
  'RHK-AS-04':['Merekap koordinasi lintas Bagian dan menyiapkan ringkasan tindak lanjut','Rekap koordinasi dan daftar prioritas']
 };return mapping[code]||['Melaksanakan hasil kerja sesuai penugasan','Dokumen atau keluaran pekerjaan'];}
// RACI adalah pemetaan kerja pribadi per aksi (bukan persetujuan/penunjukan jabatan resmi).
// Data lama yang tidak memiliki "raci" tetap sah. Tidak ada autofill peran atau migrasi brankas.
function skpRaciGet(action){
 const v=action?.raci&&typeof action.raci==='object'&&!Array.isArray(action.raci)?action.raci:{};
 return {
  responsible:String(v.responsible??'').slice(0,240),
  accountable:String(v.accountable??'').slice(0,160),
  consulted:String(v.consulted??'').slice(0,400),
  informed:String(v.informed??'').slice(0,400)
 };
}
function skpRaciComplete(action){const r=skpRaciGet(action);return Boolean(r.responsible.trim()&&r.accountable.trim());}
function skpRaciDisplay(action){
 const r=skpRaciGet(action);
 if(!Object.values(r).some(x=>x.trim()))return '<div class="skp-raci-empty">RACI belum diisi · buka Ubah / RACI</div>';
 const rows=[['R','Pelaksana',r.responsible],['A','Penanggung jawab hasil',r.accountable],['C','Konsultasi',r.consulted],['I','Diberi informasi',r.informed]];
 return `<div class="skp-raci-summary" aria-label="Matriks RACI draf">${rows.map(([code,label,value])=>`<div class="skp-raci-line"><b title="${txt(label)}">${code}</b><span>${value?txt(value):'<i>Belum diisi</i>'}</span></div>`).join('')}</div><small class="skp-raci-note">${skpRaciComplete(action)?'Draf pembagian peran; konfirmasi dengan atasan.':'Lengkapi minimal R dan A agar pembagian peran jelas.'}</small>`;
}
function skpRaciFromForm(v){
 const values={responsible:String(v.raciResponsible||'').trim().slice(0,240),accountable:String(v.raciAccountable||'').trim().slice(0,160),consulted:String(v.raciConsulted||'').trim().slice(0,400),informed:String(v.raciInformed||'').trim().slice(0,400)};
 return Object.values(values).some(Boolean)?values:null;
}
function skpFindOrSeedRhk(ref,year){
 const matches=myItems('rhks',year);
 let row=matches.find(x=>x.catalogRhkId===ref.id) || matches.find(x=>String(x.title||'').trim().toLowerCase()===String(ref.rumusan_hasil).trim().toLowerCase());
 if(!row){row={id:uid('RHK'),title:ref.rumusan_hasil,indicator:(KATALOG.iki_individu||[]).filter(z=>z.rhk_id===ref.id).map(z=>z.nama).join('; '),target:'',notes:'Draf otomatis dari katalog usulan SIPETAK. Wajib disesuaikan dengan SKP dan arahan atasan.',period:String(year),performanceYear:year,status:'Draf',catalogRhkId:ref.id,createdAt:isoNow(),updatedAt:isoNow()};data.rhks.push(row);}
 else if(!row.catalogRhkId)row.catalogRhkId=ref.id;
 return row;
}
function skpCreateDraft(year=myActiveYear()){
 skpSeedCollections();if(skpGetPlan(year))return false;
 if(myYearArchived(year))return false;
 const plan={year,version:1,status:'Draf otomatis',createdAt:isoNow(),updatedAt:isoNow(),source:'Katalog RHK/IKI usulan dan referensi Tata Tertib 2024, Perbup 57/2021, Rancangan Akhir Renstra 2025–2029',quantities:{},monthQuantities:{},monthTargets:{},notes:'Target persentase awal dari katalog IKI usulan, bukan SKP ditetapkan. Target kuantitas hanya dibuat setelah pengguna mengisinya.'};
 const refs=KATALOG.rhk_individu||[],iki=KATALOG.iki_individu||[];
 for(const r of refs){const local=skpFindOrSeedRhk(r,year);const [action,output]=skpActionTitle(r.id);
  for(let m=1;m<=12;m++){
   if(!data.skpActions.some(x=>x.performanceYear===year&&x.rhkId===local.id&&x.month===m))data.skpActions.push({id:uid('AKS'),performanceYear:year,month:m,rhkId:local.id,catalogRhkId:r.id,title:action,output,status:'Rencana',notes:'Berlaku apabila ada penugasan pada bulan ini. Tidak otomatis dinilai selesai.',createdAt:isoNow(),updatedAt:isoNow()});
  }
 }
 for(const k of iki){if(!data.ikiTargets.find(x=>x.year===year&&x.ikiId===k.id))data.ikiTargets.push({year,ikiId:k.id,target:String(k.target_usulan??''),unit:k.satuan||'%',status:'Draf',notes:'Angka awal berasal dari katalog IKI usulan, belum disepakati sebagai SKP.',updatedAt:isoNow()});}
 data.skpPlans.push(plan);if(typeof wfAudit==='function')wfAudit('skp','Draf otomatis dibuat',{id:'SKP-'+year,title:'SKP dan Rencana Aksi '+year});return true;
}
function skpEnsureWhenOpened(){if(!data||skpGetPlan())return false;if(!myAllowWrite())return false;const changed=skpCreateDraft();if(changed)queueSave().catch(fail);return changed;}
function skpAnnualIkitarget(id,year=myActiveYear()){
 const setting=(data.ikiTargets||[]).find(x=>x.year===year&&x.ikiId===id);
 const ref=(KATALOG.iki_individu||[]).find(x=>x.id===id);
 return {value:setting?.target!==undefined&&setting.target!==''?String(setting.target):String(ref?.target_usulan??''),unit:setting?.unit||ref?.satuan||'%',status:setting?.status||'Draf'};
}
function skpMonthlyIkitarget(id,month=skpSelectedMonth,year=myActiveYear()){
 const plan=skpGetPlan(year),annual=skpAnnualIkitarget(id,year);
 const override=plan?.monthTargets?.[`${id}:${month}`];
 // Percentages are REPEATED per month, never divided by 12. No automatic target without source.
 return override!==undefined?String(override):annual.value;
}
function skpMonthlyQuantity(annual,month){
 const total=Number(annual);if(annual===undefined||annual===null||String(annual)===''||!Number.isSafeInteger(total)||total<0)return null;
 const m=Number(month);return Math.floor(total*m/12)-Math.floor(total*(m-1)/12);
}
function skpQuantity(rhkId,month=skpSelectedMonth,year=myActiveYear()){
 const plan=skpGetPlan(year);if(!plan)return null;
 const override=plan.monthQuantities?.[`${rhkId}:${month}`];if(override!==undefined&&override!==null&&String(override)!=='')return Number(override);
 return skpMonthlyQuantity(plan.quantities?.[rhkId]?.quantity,month);
}
function skpMonthlyActivities(rhkId,month=skpSelectedMonth,year=myActiveYear()){
 const list=myItems('tasks',year).filter(x=>x.rhkId===rhkId&&String(x.date||'').slice(0,7)===`${year}-${String(month).padStart(2,'0')}`);
 const evidence=myItems('evidence',year).filter(x=>x.rhkId===rhkId&&String(x.date||'').slice(0,7)===`${year}-${String(month).padStart(2,'0')}`);
 return {tasks:list.length,completed:list.filter(x=>x.status==='Selesai').length,evidence:evidence.length};
}
function skpActual(id,month=skpSelectedMonth,year=myActiveYear()){
 const row=(data.skpActuals||[]).find(x=>x.year===year&&x.month===month&&x.ikiId===id);
 if(!row)return {state:'Belum dinilai',rate:null,row:null};
 if(row.denominator===0)return {state:'Tidak ada penugasan',rate:null,row};
 if(!Number.isFinite(Number(row.denominator))||Number(row.denominator)<0||Number(row.numerator)<0)return {state:'Belum dinilai',rate:null,row};
 return {state:'Realisasi mandiri',rate:Math.round(Number(row.numerator)/Number(row.denominator)*10000)/100,row};
}
function skpPerformanceIntegrity(year=myActiveYear()){
 const errors=[];
 for(const row of (data.skpActions||[]).filter(x=>x.performanceYear===year)){
  const match=data.rhks.find(x=>x.id===row.rhkId);
  if(!match||myYearOf(match,'rhks')!==year)errors.push('Aksi '+row.id+' tidak terhubung ke RHK pada tahun yang sama.');
 }
 return errors;
}
function skpIntro(){const p=skpGetPlan();return `<section class="card skp-intro"><div class="section-head"><div><h3>SKP & Rencana Aksi ${myActiveYear()}</h3><p>6 RHK dan 8 IKI tugas utama; tugas tambahan Asisten Sekwan dipisah. Draf untuk ditinjau dengan atasan.</p></div><button class="btn secondary" data-action="navigate" data-view="skp">Buka rencana SKP →</button></div><div class="skp-pillline"><span>◉ ${p?'Draf tersedia':'Belum disusun'}</span><span>◷ Target bulanan otomatis</span><span>▣ Bukti ditautkan ke RHK</span></div><p class="hint">Target katalog bukan penetapan SKP. Realisasi IKI harus memiliki pembilang/penyebut yang dapat dibuktikan.</p></section>`;}
function skpPage(){skpEnsureWhenOpened();const year=myActiveYear(), plan=skpGetPlan(year),locked=myYearArchived();if(!plan)return '<div class="callout warn">Tahun arsip belum memiliki draf SKP. Buka arsip hanya bila ada alasan sah untuk menambahkan data.</div>';
 const catalog=(KATALOG.rhk_individu||[]).filter(x=>skpRoleIsExtra(x)===(skpRoleFilter==='tambahan'));
 const shownIds=new Set(catalog.map(x=>x.id));
 const actions=(data.skpActions||[]).filter(x=>x.performanceYear===year&&x.month===skpSelectedMonth&&shownIds.has(x.catalogRhkId));
 const ikiCatalog=(KATALOG.iki_individu||[]).filter(x=>skpRoleFilter==='tambahan'?String(x.peran||'').startsWith('Tambahan')||String(x.id||'').startsWith('IKI-AS-'):String(x.peran||'').startsWith('Utama')||String(x.id||'').startsWith('IKI-PTK-'));
 const months=Array.from({length:12},(_,i)=>`<option value="${i+1}" ${skpSelectedMonth===i+1?'selected':''}>${skpMonthLabel(i+1)}</option>`).join('');
 const rhkRows=catalog.map(ref=>{const r=myItems('rhks',year).find(x=>x.catalogRhkId===ref.id);if(!r)return '';const q=plan.quantities?.[r.id]||{},n=skpQuantity(r.id),items=skpMonthlyActivities(r.id);return `<tr><td><b>${txt(ref.id)}</b><div class="subline">${txt(ref.peran.startsWith('Tambahan')?'Asisten Sekwan':'Penelaah Teknis Kebijakan')}</div></td><td class="wrap">${txt(r.title)}</td><td>${q.quantity===''||q.quantity===undefined?'Sesuai penugasan':txt(q.quantity+' '+(q.unit||'output'))}</td><td>${n===null?'—':txt(n+' '+(q.unit||'output'))}</td><td>${items.completed}/${items.tasks} tugas selesai<br><small>${items.evidence} bukti tertaut</small></td><td>${locked?'—':`<button class="btn sm ghost" data-action="skp-qty" data-id="${txt(r.id)}">Atur target</button>`}</td></tr>`;}).join('');
 const ikiRows=ikiCatalog.map(ref=>{const target=skpAnnualIkitarget(ref.id),monthly=skpMonthlyIkitarget(ref.id),result=skpActual(ref.id);return `<tr><td><b>${txt(ref.id)}</b><div class="subline wrap">${txt(ref.nama)}</div></td><td>${txt(target.value||'—')}${txt(target.unit)}</td><td>${txt(monthly||'—')}${txt(target.unit)}</td><td>${result.rate===null?txt(result.state):`${result.rate}% <span class="subline">(berdasarkan data input)</span>`}</td><td>${locked?'—':`<button class="btn sm ghost" data-action="skp-indicator" data-id="${txt(ref.id)}">Target / hasil</button>`}</td></tr>`;}).join('');
 const actionRows=actions.map(row=>{const ref=catalog.find(x=>x.id===row.catalogRhkId),counts=skpMonthlyActivities(row.rhkId),q=skpQuantity(row.rhkId);return `<div class="skp-action"><div><span class="tiny muted">${txt(row.catalogRhkId)} · ${txt(ref?.peran.startsWith('Tambahan')?'Asisten Sekwan':'Tugas utama')}</span><h4>${txt(row.title)}</h4><p>${txt(row.output)}</p><div class="subline">Target kuantitas bulan ini: ${q===null?'sesuai penugasan':txt(q)} · ${counts.tasks} tugas / ${counts.evidence} bukti tercatat</div>${skpRaciDisplay(row)}</div><div class="skp-action-right"><span class="tag ${row.status==='Selesai'?'green':''}">${txt(row.status)}</span>${locked?'':`<button class="btn sm ghost" data-action="skp-action-edit" data-id="${txt(row.id)}">Ubah / RACI</button>`}</div></div>`;}).join('');
 return `${window.SIPETAK_BKN_UI?.panel()||''}${window.SIPETAK_AUTO_UI?.skpPanel()||''}<div class="section-head"><div><h3>SKP & rencana aksi tahun ${year}</h3><p>Draf otomatis per bulan; pisahkan tugas jabatan utama dari penugasan tambahan.</p></div><div class="actions"><button class="btn secondary" data-action="skp-export">↓ CSV (semua peran)</button><button class="btn ghost" data-action="skp-print">Cetak / PDF</button></div></div><div class="callout warn"><b>Bukan SKP yang disahkan.</b> Dokumen yang tersedia adalah rancangan pribadi berdasarkan katalog usulan. Angka IKI adalah contoh target dan tugas tambahan Asisten Sekwan hanya berlaku sesuai penugasan. RHK resmi disepakati melalui dialog kinerja.</div><section class="card"><div class="section-head"><div><h3>Ringkasan periode</h3><p>Tahun ${year} · ${catalog.length} RHK dan ${ikiCatalog.length} IKI pada peran terpilih. ${locked?'Tahun sudah diarsipkan.':'Bisa diperbarui kapan pun sebelum arsip.'}</p></div><div class="actions"><label class="skp-month-select">Bulan <select id="skpMonthSelect">${months}</select></label><button class="btn sm ghost" data-action="navigate" data-view="tahun">Kelola tahun</button></div></div><div class="skp-role-switch" role="group" aria-label="Pilih kelompok tugas"><button type="button" class="btn sm ${skpRoleFilter==='utama'?'secondary':'ghost'}" data-action="skp-role" data-role="utama" aria-pressed="${skpRoleFilter==='utama'}">Tugas utama · PTK</button><button type="button" class="btn sm ${skpRoleFilter==='tambahan'?'secondary':'ghost'}" data-action="skp-role" data-role="tambahan" aria-pressed="${skpRoleFilter==='tambahan'}">Tambahan · Asisten Sekwan</button></div><div class="skp-metrics"><div><b>${catalog.length}</b><span>RHK</span></div><div><b>${ikiCatalog.length}</b><span>IKI</span></div><div><b>${actions.length}</b><span>Aksi ${skpMonthLabel(skpSelectedMonth)}</span></div><div><b>${actions.filter(x=>x.status==='Selesai').length}</b><span>Aksi ditandai selesai</span></div></div><p class="hint">Pembagian target jumlah dilakukan rata sepanjang 12 bulan. Target persentase adalah ambang yang berlaku setiap bulan, tidak dibagi 12.</p></section>${skp2026Guide(year,skpSelectedMonth,skpRoleFilter)}<section class="card"><h3>RHK & target kuantitas tahunan/bulanan</h3><div class="table-scroller"><table class="data-table"><thead><tr><th>RHK</th><th>Hasil kerja</th><th>Target tahun</th><th>Target ${skpMonthLabel(skpSelectedMonth)}</th><th>Aktivitas riil</th><th></th></tr></thead><tbody>${rhkRows}</tbody></table></div></section><section class="card"><h3>Target IKI tahunan & bulanan</h3><p class="hint">Isi realisasi hanya dari hasil yang dapat diverifikasi. Bulan tanpa penugasan ditampilkan “Tidak ada penugasan”, bukan 100%.</p><div class="table-scroller"><table class="data-table"><thead><tr><th>Indikator</th><th>Target setahun</th><th>Target ${skpMonthLabel(skpSelectedMonth)}</th><th>Realisasi</th><th></th></tr></thead><tbody>${ikiRows}</tbody></table></div></section><section class="card"><div class="section-head"><div><h3>Rencana aksi ${skpMonthLabel(skpSelectedMonth)} ${year}</h3><p>Rencana bersyarat: dijalankan jika ada penugasan relevan; tidak otomatis menjadi capaian.</p></div></div><p class="hint">RACI: R = pelaksana, A = satu pihak penanggung jawab hasil, C = pihak yang dikonsultasikan, I = pihak yang diberi informasi. Isian merupakan draf pribadi dan tidak memberi kewenangan atau persetujuan resmi.</p><div class="skp-action-list">${actionRows}</div></section>`;
}
function skpQuantityModal(rhkId){if(!myAllowWrite())return;const r=myItems('rhks').find(x=>x.id===rhkId),p=skpGetPlan();if(!r||!p)return;const v=p.quantities?.[rhkId]||{};openModal('Target jumlah hasil kerja','Target angka boleh dikosongkan jika memang bergantung pada penugasan.',`<div class="form-grid"><div class="field span2"><b>${txt(r.title)}</b></div>${field('Jumlah target tahunan (opsional)','quantity','number',v.quantity??'','Contoh: 12, sesuai target SKP yang disepakati',false,true,'min="0" step="1"')}${field('Satuan','unit','text',v.unit||'dokumen','Contoh: dokumen, laporan, kegiatan',false,true)}${field('Dasar target / catatan','notes','textarea',v.notes||'','Isi jika ada target dalam SKP',false,true)}</div><p class="hint">Jika target tahunan diisi, aplikasi membaginya ke 12 bulan sebagai rencana awal. Tidak mengubah target IKI persentase.</p>`,null,'skpQuantityForm');$('skpQuantityForm').addEventListener('submit',async e=>{e.preventDefault();const v=formValue(e.currentTarget);if(v.quantity!==''&&(!/^\d+$/.test(String(v.quantity))||Number(v.quantity)>1000000))return toast('Target jumlah harus bilangan bulat 0–1.000.000.',true);p.quantities[rhkId]={quantity:v.quantity,unit:String(v.unit||'output').trim().slice(0,60),notes:String(v.notes||'').trim().slice(0,1000)};if(r.status==='Draf'&&r.catalogRhkId){r.target=v.quantity===''?'Sesuai penugasan (draf)':v.quantity+' '+(v.unit||'output')+' (draf)';r.updatedAt=isoNow();}p.updatedAt=isoNow();wfAudit('skp','Target RHK diubah',{id:rhkId,title:r.title});await queueSave();closeModal();render();toast('Target tahunan dan pembagian bulan diperbarui.');});}
function skpIndicatorModal(id){if(!myAllowWrite())return;const ref=KATALOG.iki_individu.find(x=>x.id===id),p=skpGetPlan(),year=myActiveYear(),m=skpSelectedMonth;if(!ref||!p)return;const annual=skpAnnualIkitarget(id),monthly=skpMonthlyIkitarget(id,m),actual=skpActual(id,m).row;
 openModal('IKI '+id+' · '+skpMonthLabel(m),'Target persentase tahunan dan hasil bulanan disimpan secara terpisah.',`<div class="form-grid"><div class="field span2"><b>${txt(ref.nama)}</b></div>${field('Target tahunan (%)','annual','number',/^\d+(?:[.,]\d+)?%?$/.test(annual.value)?annual.value.replace('%','').replace(',','.'):'','Contoh: 95',true,false,'min="0" max="100" step="0.01"')}${field('Target bulan ini (%)','monthly','number',/^\d+(?:[.,]\d+)?%?$/.test(monthly)?monthly.replace('%','').replace(',','.'):'','Sama dengan target tahunan jika tidak diubah',true,false,'min="0" max="100" step="0.01"')}${field('Jumlah berhasil / memenuhi kriteria','numerator','number',actual?.numerator??'','Isi berdasarkan bukti nyata',false,false,'min="0" step="1"')}${field('Jumlah penugasan / item dinilai','denominator','number',actual?.denominator??'','0 artinya tidak ada penugasan',false,false,'min="0" step="1"')}${field('Catatan dan bukti pendukung','notes','textarea',actual?.notes||'','Rujukan sumber, tanggal dan bukti',false,true)}</div><p class="form-note">Target katalog hanyalah usulan. Realisasi tetap memerlukan verifikasi manusia. Denominator = 0 ditampilkan N/A, bukan 100%.</p>`,null,'skpIndicatorForm');$('skpIndicatorForm').addEventListener('submit',async e=>{e.preventDefault();const v=formValue(e.currentTarget);const a=Number(v.annual),mm=Number(v.monthly);if(!Number.isFinite(a)||a<0||a>100||!Number.isFinite(mm)||mm<0||mm>100)return toast('Target persentase harus antara 0 dan 100.',true);if((v.denominator!==''||v.numerator!=='')&&(!/^\d+$/.test(String(v.denominator))||!/^\d+$/.test(String(v.numerator))||Number(v.denominator)>1000000||Number(v.numerator)>Number(v.denominator)))return toast('Isi pembilang dan penyebut bilangan bulat; berhasil tidak boleh melebihi total.',true);const annualItem=data.ikiTargets.find(x=>x.year===year&&x.ikiId===id);if(annualItem){annualItem.target=String(a);annualItem.updatedAt=isoNow();annualItem.status='Draf';}else data.ikiTargets.push({year,ikiId:id,target:String(a),unit:'%',status:'Draf',updatedAt:isoNow(),notes:'Target pribadi sementara'});if(mm===a)delete p.monthTargets[`${id}:${m}`];else p.monthTargets[`${id}:${m}`]=String(mm);
 if(v.denominator!==''||v.numerator!==''){
  let row=data.skpActuals.find(x=>x.year===year&&x.month===m&&x.ikiId===id);const next={year,month:m,ikiId:id,numerator:Number(v.numerator),denominator:Number(v.denominator),notes:String(v.notes||'').slice(0,1000),updatedAt:isoNow()};if(row)Object.assign(row,next);else data.skpActuals.push(next);
 }
 p.updatedAt=isoNow();wfAudit('skp','IKI bulan ditinjau',{id:id,title:ref.nama});await queueSave();closeModal();render();toast('Target dan realisasi IKI disimpan sebagai catatan pribadi.');});}
function skpActionModal(id){
 if(!myAllowWrite())return;
 const a=data.skpActions.find(x=>x.id===id&&x.performanceYear===myActiveYear()),p=skpGetPlan();if(!a||!p)return;
 const q=p.monthQuantities?.[`${a.rhkId}:${a.month}`]??'',r=skpRaciGet(a);
 const statuses=['Rencana','Proses','Selesai','Tidak ada penugasan'];
 const statusOptions=statuses.map(s=>`<option value="${s}" ${s===a.status?'selected':''}>${s}</option>`).join('');
 const body=`<div class="form-grid">
 ${field('Uraian aksi','title','textarea',a.title,'',true,true)}
 ${field('Keluaran yang diharapkan','output','textarea',a.output,'',false,true)}
 ${field('Status','status','select','','',true,false,statusOptions)}
 ${field('Target jumlah bulan ini (opsional)','quantity','number',q,'Kosong = pembagian target tahunan',false,false,'min="0" step="1"')}
 ${field('Catatan pelaksanaan','notes','textarea',a.notes||'','Masukkan hasil dan referensi bukti jika selesai',false,true)}
 <div class="field span2 skp-raci-form-head"><h4>RACI · pembagian peran aksi ini</h4><p class="hint">Isi berdasarkan penugasan nyata; jangan menetapkan pejabat atau kewenangan secara otomatis. Jika menggunakan RACI, lengkapi minimal R dan A. A sebaiknya satu jabatan/pihak yang relevan.</p></div>
 ${field('R — Responsible / pelaksana','raciResponsible','text',r.responsible,'Pegawai/unit pelaksana, sesuai penugasan',false,true,'maxlength="240"')}
 ${field('A — Accountable / penanggung jawab hasil','raciAccountable','text',r.accountable,'Satu atasan/pejabat yang relevan',false,true,'maxlength="160"')}
 ${field('C — Consulted / dikonsultasikan','raciConsulted','textarea',r.consulted,'Pihak yang dimintai pertimbangan (opsional)',false,true)}
 ${field('I — Informed / diberi informasi','raciInformed','textarea',r.informed,'Pihak penerima laporan/informasi (opsional)',false,true)}
 </div><p class="form-note">RACI disimpan dalam brankas terenkripsi SIPETAK. Ini bukan alur persetujuan elektronik atau pengesahan SKP.</p>`;
 openModal('Rencana aksi '+skpMonthLabel(a.month),'Catat pekerjaan dan pembagian peran sesuai penugasan.',body,null,'skpActionForm');
 $('skpActionForm').addEventListener('submit',async e=>{
  e.preventDefault();if(!myAllowWrite())return;
  const v=formValue(e.currentTarget),raci=skpRaciFromForm(v);
  if(v.quantity!==''&&(!/^\d+$/.test(String(v.quantity))||Number(v.quantity)>1000000))return toast('Target bulan tidak valid.',true);
  if(v.status==='Selesai'&&!String(v.notes||'').trim())return toast('Beri catatan hasil untuk status selesai.',true);
  if(raci&&(!raci.responsible||!raci.accountable))return toast('Untuk RACI, isi R (pelaksana) dan A (penanggung jawab hasil).',true);
  // Semua validasi dilakukan sebelum data tersimpan agar formulir yang salah tidak mengubah catatan.
  a.title=String(v.title).trim().slice(0,600);a.output=String(v.output).trim().slice(0,400);
  a.status=v.status;a.notes=String(v.notes||'').trim().slice(0,1500);
  a.updatedAt=isoNow();a.completedAt=a.status==='Selesai'?isoNow():null;
  if(raci)a.raci={...(a.raci&&typeof a.raci==='object'&&!Array.isArray(a.raci)?a.raci:{}),...raci};
  else delete a.raci;
  if(v.quantity==='')delete p.monthQuantities[`${a.rhkId}:${a.month}`];else p.monthQuantities[`${a.rhkId}:${a.month}`]=v.quantity;
  p.updatedAt=isoNow();wfAudit('skp','Rencana aksi dan RACI diperbarui',{id:a.id,title:a.title});
  await queueSave();closeModal();render();toast('Rencana aksi dan RACI disimpan sebagai draf pribadi.');
 });
}
function skpCsvRows(){const year=myActiveYear(),p=skpGetPlan(year);if(!p)return [];
 const names={};for(const r of myItems('rhks',year))names[r.id]=r.title;
 const rows=[['Tahun','Bulan','Jenis','Kode','Uraian','Target tahunan','Target bulanan','Satuan','Status / realisasi','Keterangan','R · Pelaksana','A · Penanggung jawab hasil','C · Konsultasi','I · Informasi','Status RACI']];
 for(const c of KATALOG.rhk_individu||[]){const r=myItems('rhks',year).find(x=>x.catalogRhkId===c.id);if(!r)continue;for(let m=1;m<=12;m++){
  const q=p.quantities[r.id]||{},action=data.skpActions.find(x=>x.performanceYear===year&&x.month===m&&x.rhkId===r.id);
  rows.push([year,skpMonthLabel(m),'RHK/Aksi',c.id,r.title,q.quantity??'Sesuai penugasan',skpQuantity(r.id,m)??'Sesuai penugasan',q.unit||'output',action?.status||'Rencana',action?.title||'',skpRaciGet(action).responsible,skpRaciGet(action).accountable,skpRaciGet(action).consulted,skpRaciGet(action).informed,skpRaciComplete(action)?'Draf terisi, belum disahkan':'Belum lengkap']);
 }}
 for(const ref of KATALOG.iki_individu||[])for(let m=1;m<=12;m++){
  const a=skpActual(ref.id,m,year);rows.push([year,skpMonthLabel(m),'IKI',ref.id,ref.nama,skpAnnualIkitarget(ref.id,year).value,skpMonthlyIkitarget(ref.id,m,year),ref.satuan,a.rate===null?a.state:a.rate+'%',a.row?.notes||'','','','','','Tidak berlaku (IKI)']);
 }return rows;
}
function skpExport(){if(!skpGetPlan())return toast('Belum ada draf SKP.',true);const rows=skpCsvRows(),q=v=>{const value=String(v??'');const safe=/^\s*[=+\-@]/.test(value)?"'"+value:value;return '"'+safe.replace(/"/g,'""')+'"'};blobDownload('SIPETAK-SKP-RENCANA-AKSI-'+myActiveYear()+'.csv','\ufeff'+rows.map(row=>row.map(q).join(';')).join('\r\n'),'text/csv;charset=utf-8');toast('Rencana SKP dan target bulanan diekspor.');}
function skpPrint(){if(!skpGetPlan())return;const rows=skpCsvRows(),h=`<h1>DRAF SKP DAN RENCANA AKSI ${myActiveYear()}</h1><p>${txt(data.profile.name||'Pegawai')} — ${txt(data.profile.role||'Penelaah Teknis Kebijakan')}</p><p><b>DRAF OTOMATIS, BELUM DISEPAKATI/DISAHKAN.</b> Sumber: katalog IKI/RHK usulan. Sesuaikan target, penugasan, bukti dan kewenangan dengan SKP serta arahan atasan.</p><table><thead><tr>${rows[0].map(x=>`<th>${txt(x)}</th>`).join('')}</tr></thead><tbody>${rows.slice(1).map(row=>`<tr>${row.map(x=>`<td>${txt(x)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;documentPrint('Draf SKP dan rencana aksi '+myActiveYear(),h);}
function skpHandleClick(el){const a=el?.dataset?.action;if(!a||!a.startsWith('skp-'))return false;
 if(a==='skp-role'){if(['utama','tambahan'].includes(el.dataset.role)){skpRoleFilter=el.dataset.role;render();}}
 else if(a==='skp-qty')skpQuantityModal(el.dataset.id);
 else if(a==='skp-indicator')skpIndicatorModal(el.dataset.id);
 else if(a==='skp-action-edit')skpActionModal(el.dataset.id);
 else if(a==='skp-export')skpExport();else if(a==='skp-print')skpPrint();return true;}
function skpHandleChange(e){if(e.target?.id==='skpMonthSelect'){const m=Number(e.target.value);if(m>=1&&m<=12){skpSelectedMonth=m;render();}return true;}return false;}
window.SIPETAK_SKP_TEST={skpMonthlyQuantity,skpActionTitle,skpAnnualIkitarget,skpMonthlyIkitarget,skpCreateDraft,skpActual,skpRaciGet,skpRaciComplete,skpRaciFromForm,skpRaciDisplay,skpCsvRows};
