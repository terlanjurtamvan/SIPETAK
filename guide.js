 'use strict';
/* SIPETAK - Panduan penggunaan interaktif, statis, tanpa membaca data pribadi. */
(function(root){
  const TOPICS=[
    {id:'mulai',group:'Dasar',label:'Mulai menggunakan SIPETAK',page:'pengaturan',where:'Pengaturan, Tahun Kinerja, dan Supabase',required:'Tahun kinerja aktif dan ruang kerja pribadi yang sudah dibuka.',steps:[
      'Buka ruang kerja dengan kata sandi brankas Anda.',
      'Periksa Tahun Kinerja pada bagian atas. Pilih tahun pekerjaan yang benar.',
      'Untuk perangkat pertama, buat satu pekerjaan contoh dan unduh cadangan terenkripsi.',
      'Jika hendak menggunakan perangkat lain, masuk ke menu Supabase, login dan kirim brankas terenkripsi terlebih dahulu.'
    ],sample:'Contoh awal: Tahun kinerja 2026, tugas “Menyiapkan bahan pembahasan Raperda”.',note:'Login akun Supabase dan kata sandi brankas adalah dua hal berbeda. Jangan menimpa data yang belum dicadangkan.'},
    {id:'catat',group:'Tugas',label:'Catat Cepat — pekerjaan harian',page:'dashboard',action:'quick-focus',where:'Dashboard → Catat cepat',required:'Uraian pekerjaan saja. Hasil dan tenggat dapat diisi kemudian.',steps:[
      'Ketik kegiatan secara singkat dan spesifik pada “Apa yang Anda kerjakan?”.',
      'Jika sudah ada hasil, isi “Hasil pekerjaan” dan centang Selesai. Bila belum, biarkan kosong.',
      'Bila ada batas waktu, isi Tenggat. Klik “＋ Simpan pekerjaan”.',
      'Pekerjaan masuk ke Tugas Harian dan Siklus Kerja. Gunakan “Selesaikan” atau “＋ Bukti” saat diperlukan.'
    ],sample:'Uraian: “Menyiapkan bahan rapat Bapemperda”. Hasil: “Bahan paparan dan daftar isu selesai disusun”.',note:'Kategori yang disarankan oleh sistem bukan penetapan IKI/RHK resmi. Satu kegiatan cukup dicatat sekali.'},
    {id:'tugas',group:'Tugas',label:'Mengubah, menyelesaikan, dan menindaklanjuti tugas',page:'tugas',where:'Tugas Harian atau Siklus Kerja',required:'Pilih tugas yang telah dicatat.',steps:[
      'Buka Tugas Harian dan cari pekerjaan berdasarkan nama.',
      'Gunakan tombol edit untuk menambah tanggal, sumber penugasan, RHK atau keluaran jika diperlukan.',
      'Pilih “Selesaikan” untuk mencatat hasil nyata. Jangan menyelesaikan tugas tanpa hasil.',
      'Gunakan “＋ Bukti” untuk menghubungkan berkas atau rujukan arsip ke pekerjaan tersebut.'
    ],sample:'Pekerjaan: “Koordinasi dengan fraksi terkait agenda rapat”. Hasil: “Poin kesepakatan dan isu tindak lanjut tercatat”.',note:'Tahapan internal bukan persetujuan resmi pejabat, dan perlu diperiksa terhadap penugasan yang sah.'},
    {id:'sekwan',group:'Kedinasan',label:'Mencatat arahan dan disposisi Sekwan',page:'sekretaris',where:'Asisten Sekwan → ＋ Disposisi / Agenda',required:'Uraian penugasan, tanggal/jam diterima, dan tenggat; lengkapi asal arahan bila ada.',steps:[
      'Buka Asisten Sekwan dan tekan “＋ Disposisi / Agenda”.',
      'Isi Uraian penugasan, pilih Jenis dan periksa tanggal/jam diterima.',
      'Periksa tenggat yang disarankan. Ubah bila ada tenggat sesuai arahan atasan.',
      'Simpan. Jika selesai, perbarui status, output dan catatan koordinasi; siapkan bahan briefing bila diperlukan.'
    ],sample:'Penugasan: “Menyiapkan bahan briefing Sekwan untuk rapat Bamus”. Sumber: “Arahan langsung tanggal …”.',note:'SLA aplikasi hanya nilai contoh dan dapat disesuaikan; tidak mengubah kewenangan Anda sebagai asisten Sekwan.'},
    {id:'rapat',group:'Kedinasan',label:'Memasukkan agenda dan hasil persidangan',page:'persidangan',where:'Persidangan → ＋ Agenda Rapat',required:'Nama agenda dan jadwal rapat.',steps:[
      'Buka Persidangan, lalu tekan “＋ Agenda Rapat”.',
      'Isi judul, jenis rapat, waktu, dan tempat bila diketahui.',
      'Periksa batas penyiapan bahan dan penyusunan risalah; ubah bila berbeda dengan jadwal penugasan.',
      'Setelah rapat, ubah catatan hasil dan status bahan/risalah, kemudian cetak konsep jika diperlukan.'
    ],sample:'Agenda: “Rapat kerja Bapemperda terkait pembahasan Raperda”. Hasil: “Poin isu dan tindak lanjut sesuai catatan rapat”.',note:'Risalah atau keputusan di aplikasi hanya konsep kerja sampai diverifikasi dan ditetapkan sesuai prosedur instansi.'},
    {id:'telaah',group:'Kedinasan',label:'Menyusun telaahan staf',page:'telaah',where:'Telaahan Staf → ＋ Telaahan Baru',required:'Perihal telaahan dan persoalan; unsur lainnya dilengkapi bertahap.',steps:[
      'Tekan “＋ Telaahan Baru”, isi perihal dan persoalan yang ditelaah.',
      'Buka “Lengkapi rincian lain” untuk fakta, sumber, dasar hukum, analisis, alternatif, dan rekomendasi.',
      'Tautkan telaahan ke tugas jika tersedia agar riwayat kerja tidak terputus.',
      'Simpan konsep, telaah kembali sumber hukum, lalu ekspor RTF untuk penyuntingan Word atau Pages.'
    ],sample:'Perihal: “Telaahan teknis usulan perubahan pasal Raperda”. Persoalan: “Perlu pemeriksaan kesesuaian rumusan pasal dengan aturan terkait”.',note:'Aplikasi tidak memastikan keberlakuan dasar hukum secara otomatis. Verifikasi sumber resmi wajib dilakukan.'},
    {id:'dim',group:'Kedinasan',label:'Mencatat pembahasan Raperda dan DIM',page:'raperda',where:'Raperda / DIM → ＋ Tambah Baris DIM',required:'Raperda, pasal, dan pokok masalah yang dibahas.',steps:[
      'Buka menu Raperda / DIM dan buat satu baris untuk setiap isu pasal.',
      'Isi nama Raperda, pasal, permasalahan dan rumusan yang diusulkan.',
      'Tambahkan dasar hukum, kesimpulan pembahasan, dan status setelah diverifikasi.',
      'Gunakan ekspor CSV atau cetak/PDF untuk rekap yang akan diperiksa lebih lanjut.'
    ],sample:'Raperda: “Raperda tentang …”. Pasal: “Pasal 7”. Masalah: “Istilah pada ayat (2) perlu penegasan”.',note:'DIM pribadi bukan naskah keputusan ataupun hasil pembahasan resmi sebelum dikonfirmasi.'},
    {id:'bukti',group:'Kinerja',label:'Menautkan bukti pekerjaan untuk SKP',page:'bukti',where:'Tugas Harian → ＋ Bukti atau Bukti Dukung → tambah bukti',required:'Nama bukti dan tanggal; unggahan berkas opsional.',steps:[
      'Untuk bukti dari suatu tugas, pilih “＋ Bukti” dari baris tugas agar tautannya terisi otomatis.',
      'Isi nama bukti, jenis dan tanggal, lalu pilih RHK terkait jika sudah ada.',
      'Cantumkan lokasi dokumen resmi, nomor, atau keterangan; lampiran opsional mengikuti batas ukuran aplikasi.',
      'Periksa apakah bukti yang sama sudah ada; jangan memasukkan dokumen Terbatas/Rahasia tanpa izin.'
    ],sample:'Bukti: “Konsep telaahan bahan rapat Bamus tanggal …”. Jenis: “Ringkasan bahan rapat”.',note:'Tidak semua dokumen dapat diunggah; klasifikasi informasi dan aturan arsip instansi tetap berlaku.'},
    {id:'skp',group:'Kinerja',label:'Mengisi SKP dan rencana aksi bulanan',page:'skp',where:'Peta Kinerja → SKP & Rencana Aksi',required:'Tahun kinerja aktif. Draf 10 RHK dan 14 IKI dibuat otomatis saat pertama membuka menu.',steps:[
      'Pastikan tahun kinerja di header sesuai periode yang ingin direncanakan.',
      'Buka SKP & Rencana Aksi. Sistem membuat draf RHK, IKI, dan rencana Januari–Desember jika belum ada.',
      'Isi target jumlah tahunan hanya bila tersedia dasar dari SKP/penugasan. Sistem membaginya ke bulan tanpa mengubah total.',
      'Pilih bulan untuk meninjau aksi, menyesuaikan target dan mengisi realisasi yang didukung bukti.',
      'Ekspor CSV atau cetak draf untuk pembahasan dengan atasan sebelum dijadikan acuan pribadi.'
    ],sample:'Target 24 bahan telaahan setahun → pembagian awal 2 per bulan. Target IKI 95% tetap 95% tiap bulan, bukan 95÷12.',note:'Target dan rumusan awal hanyalah usulan, bukan SKP yang telah disepakati. Bulan tanpa penugasan bukan 100% capaian.'},
    {id:'ai',group:'Pendukung',label:'Asisten AI — telaahan, persidangan, DIM, SKP dan prioritas',page:'ai',where:'Asisten AI',required:'Login Supabase, Worker AI terhubung, dan materi yang boleh diproses oleh penyedia AI.',steps:[
      'Buka menu Asisten AI. Pilih fungsi: Telaahan Staf, Persidangan, Raperda/DIM, SKP/RHK, atau Prioritas Harian.',
      'Pilih tepat satu catatan sumber tahun aktif atau isi konteks aman secara manual. Lampiran tidak ikut dikirim.',
      'Baca pratinjau teks. Jangan kirim data rahasia, identitas pribadi, atau dokumen yang belum diizinkan instansi.',
      'Centang persetujuan dan tekan Buat konsep dengan AI. Pastikan sudah login Supabase dan alamat Worker AI diisi.',
      'Periksa fakta, dasar hukum dan hasilnya. Salin, simpan sebagai draf terenkripsi, atau pindahkan konsep telaahan ke formulir untuk diedit.'
    ],sample:'Pilih tugas “Telaah bahan rapat Bapemperda” → pratinjau materi → Buat konsep → periksa dan salin draf ke Telaahan Staf.',note:'AI tidak otomatis membaca semua data. Draf AI tidak mengesahkan dokumen, membuat capaian resmi SKP, atau membuktikan keberlakuan peraturan. Biaya inferensi Cloudflare Workers AI mengikuti akun dan kuota.'},
    {id:'otomasi',group:'Kinerja',label:'Pusat Otomasi — siklus, data, bukti & SKP',page:'otomasi',where:'Pusat Otomasi',required:'Cukup catat pekerjaan di menu biasanya dan tautkan bukti menggunakan pilihan pekerjaan yang tersedia.',steps:[
      'Simpan pekerjaan di Catat Cepat, Tugas, Asisten Sekwan, Persidangan, atau DIM; siklus dasar dibuat otomatis.',
      'Setelah pekerjaan mulai diproses, tahap awal diperbarui. Tahapan pemeriksaan, laporan dan arsip tetap perlu diputuskan pengguna.',
      'Tambah bukti dari tugas atau pilih pekerjaan/agenda sumber pada formulir bukti; tautannya akan ditambahkan pada siklus tahun yang sama.',
      'Buka Pusat Otomasi untuk melihat tenggat lewat, hasil selesai tanpa bukti, RHK belum dipetakan, dan relasi yang kurang lengkap.',
      'Periksa bagian Bahan Verifikasi IKI/RHK sebelum mengisi realisasi resmi di menu SKP. Gunakan tombol Ekspor Draf jika diperlukan.'
    ],sample:'Satu catatan “Menyusun konsep risalah Bamus” → status Proses → lampirkan referensi konsep risalah → ringkasan bukti tercantum di Pusat Otomasi.',note:'Statistik otomatis bukan angka capaian resmi atau persetujuan atasan. Push ketika aplikasi ditutup hanya bekerja jika Cloudflare Worker dan izin iPhone sudah diaktifkan.'},
    {id:'sla',group:'Pendukung',label:'Mengatur tenggat, bunyi dan kalender',page:'sla',where:'SLA & Pengingat',required:'Isi tanggal dan jam tenggat pada tugas, disposisi, atau rapat.',steps:[
      'Buat atau ubah tugas dan isi tanggal/jam tenggat sebenarnya.',
      'Buka SLA & Pengingat untuk melihat tenggat mendekat dan terlambat.',
      'Tekan “Aktifkan bunyi & notifikasi”, lalu “Uji bunyi” ketika aplikasi terbuka.',
      'Ekspor Kalender .ics bila menginginkan pengingat melalui Kalender MacBook/iPhone saat aplikasi ditutup.'
    ],sample:'Tenggat: “30 Oktober 2026 pukul 14.00”. Pengingat: 24 jam, 3 jam, 30 menit dan saat jatuh tempo.',note:'Web Push saat aplikasi tertutup membutuhkan layanan server dan izin OS; bunyi dapat dipengaruhi Mode Fokus atau volume.'},
    {id:'smart-push',group:'Pendukung',label:'Notifikasi otomatis meskipun SIPETAK ditutup',page:'sla',where:'SLA & Pengingat → Smart Notification',required:'Login Supabase, aplikasi PWA terpasang di iPhone/Mac, dan layanan Worker sudah dikonfigurasi.',steps:[
      'Pastikan pekerjaan mempunyai tenggat tanggal dan jam yang benar. Pastikan data lokal sudah dikirim ke Supabase.',
      'Buka SLA & Pengingat, gulir ke Smart Notification dan tekan “Aktifkan Push di perangkat ini”.',
      'Izinkan notifikasi pada iPhone/Mac. Gunakan “Uji Push Server” untuk memeriksa kiriman dari server.',
      'Jika tenggat diubah atau pekerjaan selesai, pastikan jadwal tersinkron ketika perangkat terhubung internet.',
      'Untuk menonaktifkan, gunakan “Matikan di perangkat ini”.'
    ],sample:'Tenggat Jumat pukul 14.00 → notifikasi 24 jam, 3 jam, 30 menit, dan ketika waktu tercapai.',note:'Apple mengatur suara sistem sesuai Mode Fokus/Senyap. Layanan push menerima ID dan waktu, bukan isi dokumen. Jika perangkat offline, perubahan tenggat belum tentu tersinkron.'},
    {id:'laporan',group:'Kinerja',label:'Membuat laporan kerja dan arsip tahun',page:'laporan',where:'Laporan, Tahun Kinerja, Pengaturan',required:'Pekerjaan dan bukti sudah tercatat pada tahun yang tepat.',steps:[
      'Pilih tahun aktif untuk menentukan periode rekap.',
      'Buka Laporan, tentukan bulan yang diperlukan dan tinjau catatan pekerjaan.',
      'Gunakan ekspor CSV atau Cetak/PDF untuk menyusun bahan pelaporan resmi.',
      'Sebelum mengarsipkan suatu tahun, buat cadangan, periksa relasi tugas–RHK–bukti, kemudian gunakan menu Tahun Kinerja.'
    ],sample:'Laporan bulanan Oktober 2026: daftar pekerjaan, hasil, bukti, dan referensi RHK yang telah dicatat.',note:'Arsip yang dikunci tetap dapat dibaca. Jangan arsipkan tahun sebelum seluruh data terverifikasi.'},
    {id:'supabase',group:'Pendukung',label:'Menyimpan dan membuka data dari perangkat lain',page:'supabase',where:'Supabase → Masuk → Kirim data terenkripsi / Ambil data',required:'Akun Supabase, brankas lokal, dan kata sandi brankas.',steps:[
      'Pada perangkat sumber, buat cadangan terlebih dahulu lalu buka menu Supabase.',
      'Login dengan akun Anda dan kirim brankas terenkripsi ke cloud.',
      'Di perangkat baru, buka alamat SIPETAK, pilih “Masuk dari perangkat baru”, lalu login akun yang sama.',
      'Ambil brankas dan buka menggunakan kata sandi brankas dari perangkat sumber.',
      'Jika ada konflik versi, cadangkan kedua perangkat sebelum memutuskan data mana yang dipulihkan.'
    ],sample:'MacBook → kirim brankas → iPhone → login → masukkan kata sandi brankas → data terbuka.',note:'Jangan menyebarkan publishable key bersama secret key; tidak ada kebutuhan memasukkan URL proyek di tiap perangkat.'}
  ];
  let group='Semua';
  const esc=v=>String(v??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  function card(t){
    return `<article class="guide-topic" data-guide-card data-group="${esc(t.group)}">
      <details><summary><span class="guide-topic-label">${esc(t.label)}</span><span class="guide-topic-tag">${esc(t.group)}</span></summary>
        <div class="guide-topic-body"><div class="guide-where"><b>Di mana?</b> ${esc(t.where)}</div><p><b>Isian minimum:</b> ${esc(t.required)}</p>
        <ol class="guide-steps">${t.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
        <div class="guide-example"><b>Contoh pengisian</b><p>${esc(t.sample)}</p></div>
        <p class="guide-note"><b>Perlu diketahui:</b> ${esc(t.note)}</p>
        <button class="btn secondary" type="button" data-action="${t.action||'navigate'}" ${t.action?'':`data-view="${esc(t.page)}"`}>${t.action==='quick-focus'?'Buka Catat Cepat':'Buka '+esc(t.where.split(' → ')[0])} →</button>
        </div></details></article>`;
  }
  function page(){
    const groups=['Semua','Dasar','Tugas','Kedinasan','Kinerja','Pendukung'];
    return `<section class="card guide-hero"><div><div class="guide-eyebrow">PANDUAN SIPETAK</div><h3>Kerja cukup dicatat sekali.</h3><p>Pilih jenis pekerjaan, ikuti langkah ringkasnya, lalu langsung buka menu yang diperlukan. Semua contoh hanya ilustrasi—tidak otomatis masuk ke data Anda.</p></div><button class="btn" data-action="quick-focus">＋ Mulai Catat Cepat</button></section>
    <section class="card guide-start"><h3>Alur paling sederhana</h3><div class="guide-flow"><span>1. Catat pekerjaan</span><span>2. Isi hasil</span><span>3. Tautkan bukti</span><span>4. Hubungkan RHK</span><span>5. Rekap laporan</span></div><p class="hint">Kolom wajib dibuat sedikit mungkin. Rincian lain dapat dilengkapi saat diperlukan.</p></section>
    <section class="guide-panel"><div class="guide-toolbar"><label for="guideSearch">Cari panduan</label><input id="guideSearch" type="search" autocomplete="off" placeholder="Contoh: persidangan, SKP, bukti, disposisi …" aria-label="Cari panduan"/><div class="guide-filters" role="group" aria-label="Filter kategori panduan">${groups.map(g=>`<button type="button" data-action="guide-filter" data-group="${esc(g)}" class="guide-chip ${group===g?'active':''}" aria-pressed="${group===g?'true':'false'}">${esc(g)}</button>`).join('')}</div><p id="guideCount" class="hint" aria-live="polite"></p></div>
    <div class="guide-list">${TOPICS.map(card).join('')}</div><div id="guideEmpty" class="card guide-empty" hidden>Tidak ada panduan yang sesuai. Coba kata kunci lain atau pilih kategori Semua.</div></section>
    <section class="card"><h3>Jika menemui kendala</h3><p>Pekerjaan belum tersimpan? Periksa apakah uraian telah diisi, tahun aktif tidak diarsipkan, dan pesan kesalahan di bawah formulir. Sebelum memulihkan data cloud, buat cadangan brankas terlebih dahulu.</p><div class="actions"><button class="btn secondary" type="button" data-action="navigate" data-view="pengaturan">Buka Pengaturan</button><button class="btn ghost" type="button" data-action="navigate" data-view="supabase">Cek Supabase</button></div></section>`;
  }
  function applyFilter(){
    const input=document.getElementById('guideSearch');if(!input)return;
    const q=input.value.trim().toLocaleLowerCase('id-ID');let count=0;
    document.querySelectorAll('[data-guide-card]').forEach(card=>{
      const matchGroup=group==='Semua'||card.dataset.group===group;
      const matchText=!q||card.textContent.toLocaleLowerCase('id-ID').includes(q);
      const shown=matchGroup&&matchText;card.hidden=!shown;if(shown)count++;
    });
    const empty=document.getElementById('guideEmpty');if(empty)empty.hidden=count!==0;
    const hint=document.getElementById('guideCount');if(hint)hint.textContent=`${count} dari ${TOPICS.length} panduan`;
  }
  function action(el){if(el?.dataset?.action!=='guide-filter')return false;
    group=el.dataset.group||'Semua';document.querySelectorAll('[data-action="guide-filter"]').forEach(btn=>{const active=btn.dataset.group===group;btn.classList.toggle('active',active);btn.setAttribute('aria-pressed',String(active));});applyFilter();return true;}
  function search(e){if(e?.target?.id!=='guideSearch')return false;applyFilter();return true;}
  root.SIPETAK_GUIDE={page,action,search,applyFilter,topics:TOPICS.map(x=>({id:x.id,group:x.group,label:x.label,page:x.page}))};
})(window);
