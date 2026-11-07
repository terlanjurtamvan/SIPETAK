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
