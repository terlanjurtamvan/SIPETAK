## v3.16.0-rc1 — Generator SKP BKN (draf bantu)

- Terintegrasi pada **Peta Kinerja → SKP & Rencana Aksi**; bukan aplikasi terpisah.
- Membaca Catatan Kerja, Tugas Harian, Telaahan, Persidangan, DIM, Disposisi, tracking Raperda Asisten Sekwan, Bukti Dukung dari brankas AES-GCM saat tampilan dibuka.
- Relasi RHK berasal dari yang sudah diisi di modul; catatan lain dipetakan sekali oleh pengguna, tidak ditentukan AI otomatis.
- Mengelompokkan hasil kerja utama dan tambahan, menduplikasi-capture aktivitas sesuai sumber note, tidak menghitung dua kali turunan yang sama.
- Ekspor bahan bantu CSV dan print/PDF; tidak mengirim data ke BKN atau layanan eksternal.
- Tidak mengisi nilai evaluasi, target, NIP, ekspektasi pimpinan, atau status pengesahan tanpa sumber.
- Tahun kinerja terisolasi; tahun arsip hanya baca; rekaman dan dokumen yang sudah ada tidak diubah.
- Rujukan: PermenPANRB 6/2022, SE BKN 1/2023, PerBKN 2/2026. Bentuk akhir e-Kinerja tetap harus diperiksa pengguna.

## v3.15.0-rc1 — Peta Flowchart Interaktif (desain modern)

- Peta Kerja **AS-IS** kini berupa diagram node dan panah dengan simpul pemeriksaan berbentuk berlian; **TO-BE** menandai target dengan garis putus-putus.
- Peta **Asisten Sekwan** menunjukkan percabangan dari catatan/kunjungan ke tracking Raperda, disposisi, telepon cepat, tugas, dan laporan.
- Semua simpul adalah tombol navigasi aktif ke halaman/modul yang sudah ada. Pada layar kecil muncul timeline vertikal (tanpa horizontal overflow).
- Mesin perekaman, brankas, modul Notulen/Risalah, dan data Supabase tidak diubah. Tidak ada penyimpanan, API, atau telemetri baru.
- Diagram menunjukkan **navigasi/alur operasional**, bukan klaim bahwa perpindahan data atau keputusan dilakukan otomatis.

# SIPETAK v3.14.0-rc1 — Peta Kerja Interaktif & Catatan Pribadi

Versi ini ditujukan untuk **satu pengguna**. Tambahan: peta navigasi interaktif **Saat Ini (AS-IS)** dan **Target Otomatis (TO-BE)**, serta **Catatan Kerja** sebagai pengganti buku catatan pribadi.

Lihat `docs/PETA-OPERASIONAL-DAN-CATATAN-PRIBADI-3.13.md` untuk kemampuan aktual, batasan dan panduan uji. Mesin transkripsi suara dan format dokumen sama persis dengan v3.12.5.

## v3.14.0-rc1 — Panduan penggunaan sampai print/PDF (7 November 2026)

Panduan 8 langkah ditambahkan langsung di **Transkripsi Suara** (panel 📘 yang dapat dibuka/tutup), dan di menu **Panduan Penggunaan** (cari “rekam”, “notulen”, “risalah”, atau “cetak”). Di dekat tombol **Cetak / PDF Notulen/Risalah** terdapat instruksi printer/PDF serta solusi ketika pop-up diblokir. Panduan cetak rinci tersedia di [docs/PANDUAN-TRANSKRIPSI-SAMPAI-CETAK-3.12.5.md](docs/PANDUAN-TRANSKRIPSI-SAMPAI-CETAK-3.12.5.md).

**Tidak ada perubahan pada mesin rekaman, backend, kunci API, Supabase, atau format brankas.** Kandidat uji staging; cek hasil PDF serta output mesin sebelum produksi.

## Update v3.12.4-rc1 — Kejelasan alur rekaman (7 November 2026)

Perbaikan berdasarkan tangkapan layar: kotak izin harus dicentang secara sadar sebelum merekam, tombol Hentikan dan penanda pembicara tidak aktif saat idle, panduan langkah tampil dekat tombol mulai, dan tag PWA standar untuk peringatan Console Chrome. Mesin WAV + transkripsi browser dan keamanan data tidak diubah.

# SIPETAK Pribadi — v3.12.3-rc1 (integrasi referensi Meta AI)

**Status: kandidat uji/staging; belum diterapkan ke GitHub atau Cloudflare produksi dan belum diuji pada Safari iPhone pengguna.**

SIPETAK membantu pekerjaan, agenda, SKP/RHK, bukti dukung, dan draf notulensi. **Pembaruan 3.12.1 menambahkan konsep Notulen dan Risalah DPRD secara otomatis dari satu transkrip yang diperiksa; tersedia ekspor Word dan pratinjau cetak/PDF. Fitur rekam + tulis Chrome tidak diubah.** Versi ini menambahkan satu tombol **🔴 Mulai Rekam + Tulis Langsung**, yang mencoba merekam audio WAV dan menuliskan ucapan di kolom teks *pada saat bersamaan* menggunakan layanan pengenal suara bawaan browser. Tidak perlu kunci API atau konfigurasi Cloudflare khusus SIPETAK untuk mode browser.

**Batasan yang wajib diketahui:** Safari iPhone dapat membisukan `getUserMedia()` saat `SpeechRecognition` berjalan, sehingga audio atau teks bisa tidak lengkap walaupun antarmukanya menampilkan proses aktif. Kode mendeteksi kejadian `mute` dan menampilkan peringatan. Pengujian otomatis **tidak membuktikan mode gabungan bekerja pada iPhone nyata**. Untuk kebutuhan yang benar-benar andal gunakan satu aliran audio ke server transkripsi streaming atau aplikasi iPhone native.

## Cara pemakaian

1. Buka brankas → **Menu → Transkripsi Suara**. Isi nama agenda.
2. Untuk materi **Umum** atau **Internal yang diizinkan** diproses browser, centang persetujuan rekaman dan pengenalan suara. Materi **Terbatas** tidak boleh memakai mode ini.
3. Ketuk **Mulai Rekam + Tulis Langsung** dan izinkan mikrofon. Lihat indikator terpisah **Audio** dan **Teks**. Tulisan muncul bertahap jika browser mendukung penggunaan mikrofon secara bersamaan.
4. Tekan **Hentikan**; putar WAV untuk mengecek isinya. SIPETAK mencoba mengunduh audio; **pastikan file ada di Files**. Jika belum, ketuk **Unduh rekaman WAV ke perangkat** (Safari: Bagikan → Simpan ke File). Audio hanya sementara pada halaman sebelum diunduh.
5. Koreksi transkrip, konfirmasi pemeriksaan, **Simpan teks terenkripsi**, lalu pilih draf notulensi, bahan ringkasan, tugas atau metadata bukti.

Pengenalan suara browser bisa menggunakan layanan eksternal penyedia browser, termasuk saat tidak memakai API milik SIPETAK. Jangan gunakan untuk konten rahasia tanpa izin. Teks yang dihasilkan adalah **draf**, bukan keputusan atau berita acara resmi.

## Pembaruan aman

1. Buat backup aplikasi dan branch staging; jangan hapus database Supabase.
2. Untuk repositori **v3.11.0-rc1**, pasang paket PATCH ke root repo: ekstrak ZIP dan salin **isi folder `SIPETAK-main/`** (bukan folder pembungkusnya). Jika memerlukan salinan utuh, gunakan paket FULL.
3. Jalankan `npm run verify` dengan Node 20+.
4. Deploy staging melalui mekanisme Cloudflare Pages yang sekarang digunakan; tunggu sampai footer menampilkan `v3.12.0-rc1`.
5. Uji dengan ucapan tidak rahasia di iPhone: **WAV bisa diputar dan teks muncul sebelum menghentikan rekaman**. Jika salah satu gagal, jangan lepaskan sebagai fitur produksi; gunakan mode alternatif atau lakukan implementasi server/native.

Informasi lengkap: [docs/REKAM-KETIK-BERSAMA-3.12.md](docs/REKAM-KETIK-BERSAMA-3.12.md). Untuk pengembalian versi lama, pulihkan commit v3.11.0-rc1; format brankas tidak berubah.

## Notulen dan risalah

Lihat [panduan format notulen dan risalah](docs/NOTULEN-RISALAH-DPRD-3.12.1.md). Notulen dan Risalah dihasilkan dari satu transkrip, metadata dapat diisi sekali, ekspor `.doc` bisa diedit Word/Pages, serta dialog Cetak dapat disimpan sebagai PDF. Semua hasil berstatus KONSEP sampai diverifikasi.


Untuk perbaikan terbaru Transkripsi Suara, lihat [Audit 3.12.2](docs/AUDIT-TRANSKRIPSI-3.12.2.md).

## Integrasi referensi Meta AI 3.12.3

Form rapat menambah Tahun Sidang, Masa Persidangan, Rapat Ke-, dan Acara Rapat. Saat merekam, notulis dapat menambahkan penanda pembicara/waktu **secara manual**. Penanda tersimpan di brankas terenkripsi bersama transkrip dan dicetak dalam lampiran konsep Notulen/Risalah. Ini bukan identifikasi pembicara otomatis. Mesin Rekam WAV + Dikte Chrome **tidak diubah**. Berkas Meta AI `notulenrek.html` **tidak perlu dan tidak boleh diunggah sebagai pengganti aplikasi**. Lihat `docs/INTEGRASI-REFERENSI-META-AI-3.12.3.md`.

## v3.14.0-rc1: Peta Kerja & Asisten Sekwan
- Peta Kerja AS-IS menampilkan alur operasional yang tersedia beserta tombol navigasi ke modul nyata; TO-BE kini menampilkan alur dan target terpisah yang ditandai belum aktif.
- Asisten Sekwan memuat flowchart navigasi aktif, register tracking Raperda (tahap, PIC, tenggat, hambatan), Buku Tamu pribadi, dan Telepon Cepat (klik panggil).
- Sekali menyimpan catatan Raperda/kunjungan yang berisi tindak lanjut dapat dibuat draf Tugas Harian secara otomatis. Tidak membuat keputusan/persetujuan resmi.
- Data baru disimpan dalam JSON brankas terenkripsi yang sudah ada, tanpa migrasi Supabase. Kontak telepon dan identitas tamu jangan diunggah ke layanan pihak ketiga tanpa izin.
- Pemutar/mesin rekam audio, transkripsi, dan Notulen/Risalah tidak diubah. Uji dahulu di staging.

Panduan pemakaian dan commit: `docs/PETA-KERJA-SEKWAN-v3.14.md`.
