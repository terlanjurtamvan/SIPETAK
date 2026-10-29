# SIPETAK v3.7 — Panduan update sekali jalan dari iPhone

## Yang Anda dapatkan

1. **Lifecycle Orchestrator:** catatan pekerjaan baru otomatis memiliki siklus; saat sumber mulai diproses, tahap awal berubah menjadi **Dikerjakan**. Reviu, pemeriksaan, pelaporan, arsip **tidak otomatis dinyatakan disetujui**.
2. **Evidence Automation:** bukti yang memilih tugas/agenda sumber otomatis ditautkan ke siklus yang bersangkutan; RHK diturunkan hanya jika rujukannya jelas, unik, dan tahun cocok.
3. **SKP & Performance Aggregation:** bahan hitung tugas, keluaran selesai, dan hasil berbukti berdasarkan RHK/IKI; **tidak menyimpan angka ini sebagai realisasi IKI** atau menganggap 100%.
4. **Monitoring & Notification:** menu baru **Pusat Otomasi** di sidebar + kartu Dashboard: tugas terlambat, tugas selesai tanpa bukti, bukti belum lengkap, pemetaan RHK, rencana aksi yang sudah Proses menjelang akhir bulan. Pengingat push 24 jam setelah tugas selesai tanpa bukti **hanya bila layanan Smart Push v3.5 dan Worker sudah aktif**, telah diizinkan di iPhone, dan jadwal berhasil tersinkron saat online.

## Langkah sederhana (iPhone)

1. **Cadangkan brankas terlebih dahulu** dari SIPETAK: Pengaturan → Unduh Cadangan. Bila menggunakan dua perangkat, pastikan Supabase selesai sinkron sebelum mengganti aplikasi.
2. Di aplikasi **File**, buka ZIP **SIPETAK_v3_7_PATCH_GITHUB.zip**, ketuk untuk ekstrak.
3. Dari Safari, buka repository GitHub **https://github.com/terlanjurtamvan/SIPETAK**.
4. Upload **seluruh 9 berkas** dari ZIP PATCH (berada di root folder):
   - `index.html`
   - `app.js`
   - `push-client.js`
   - `sw.js`
   - `skp-planner.js`
   - `guide.js`
   - `automation-engine.js`
   - `automation-ui.js`
   - `automation.css`
5. Klik **Commit changes**. Cloudflare Pages yang terhubung GitHub akan melakukan deploy otomatis.
6. Setelah deploy sukses, tutup lalu buka lagi SIPETAK dari ikon Layar Utama iPhone. Pada menu **Pusat Otomasi**, periksa alur, bukti dan bahan SKP.
7. Uji dengan satu tugas contoh: tandai Proses → siklus Dikerjakan → tambahkan bukti lewat tugas → lihat relasi pada Pusat Otomasi. Tandai Selesai tanpa bukti → lihat peringatan. Tambahkan bukti → lihat peringatan hilang.

### SANGAT PENTING — Konfigurasi yang sudah ada

`index.html` dalam ZIP PATCH dibuat berdasarkan **index terakhir yang Anda kirim**. Project URL dan `sb_publishable_...` lama **dipertahankan**. Kunci rahasia Supabase (service role/secret key) **tidak ada** di dalamnya.

**Jika URL Cloudflare Worker Smart Push sudah Anda isi di situs saat ini**, jangan langsung menimpa `index.html` ini, sebab `sipetak-push-worker-url` di paket masih kosong. Salin nilai URL Worker lama ke metadata tersebut pada `index.html` baru sebelum di-upload. Jika Worker belum dipasang, biarkan kosong. Jangan memasukkan URL Supabase pada kolom Worker.

Data lokal dan cloud tidak dihapus oleh update berkas. Tetapi praktik aman tetap buat cadangan sebelum deployment.

### Apakah perlu SQL atau membuat Worker baru?

**Tidak** untuk empat fitur otomasi di dalam aplikasi, karena semua perubahan disimpan di dalam JSON brankas terenkripsi yang sudah ada.

Untuk *Web Push saat aplikasi ditutup*, masih perlu instalasi **SQL migrasi v3.5 + Cloudflare Worker + VAPID + izin notifikasi** yang pernah disediakan. Jika itu sudah berfungsi, cukup pertahankan URL Worker di index dan patch `push-client.js` akan ikut memakai layanan lama. Jika belum aktif, dashboard dan Pusat Otomasi tetap bekerja ketika brankas terbuka, tetapi notifikasi latar belakang belum tersedia.

### Batasan keamanan

- Reviu, persetujuan, penetapan IKI/SKP, keaslian dokumen, kewenangan Sekwan, dan pengesahan risalah tetap manual sesuai prosedur resmi.
- Hasil agregasi adalah **bahan verifikasi**, bukan nilai capaian. Bukti yang terdeteksi lengkap artinya metadata tersedia, bukan bahwa berkas telah sah atau diperiksa.
- Data rinci tetap dalam brankas AES-GCM di perangkat, dan dikirim ke Supabase hanya sebagai envelope terenkripsi bila sinkron aktif. Jadwal push mengirim ID acak dan waktu, bukan judul pekerjaan atau isi dokumen.
- Browser iPhone dapat menutup PWA di belakang layar. Modul ini **tidak** menjamin pekerjaan lokal akan dipantau saat aplikasi tertutup; hanya Web Push server yang aktif bisa mengirim notifikasi sistem saat aplikasi tidak dibuka.
- Fitur **Tetap Masuk 7/30 hari dari v3.6** tetap ada; keamanan perangkat pribadi dan cadangan penting.

### Hasil pengujian

13 uji Node otomatis untuk relasi tahun, pencegahan siklus ganda, tidak otomatis meluluskan reviu, tidak otomatis mengisi realisasi SKP, tindak lanjut bukti privat, serta tampilan menu berhasil. Semua JavaScript lolos `node --check` dan seluruh aset `index.html` diverifikasi ada. **Browser iPhone/Cloudflare/Supabase sungguhan belum diuji**; Playwright di lingkungan pembuatan paket dibatasi administrator.
