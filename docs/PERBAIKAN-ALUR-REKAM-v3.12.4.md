# SIPETAK v3.12.4-rc1 — Perbaikan alur Rekam + Tulis (berdasarkan screenshot 7 November 2026)

## Apa yang sebenarnya terjadi dalam screenshot

- Tombol **Mulai Rekam + Tulis Langsung** belum memulai sesi; indikator **Audio: belum aktif** dan **Teks: belum aktif**.
- Checkbox persetujuan mikrofon **belum dicentang**. Persetujuan harus diberikan dengan sadar; aplikasi tidak akan mencentangnya otomatis.
- Pesan merah **“Mulai rekaman dahulu, lalu tandai pembicara atau waktu”** muncul karena tombol penanda bisa diklik ketika tidak ada sesi. Itu sebelumnya diperlakukan sebagai kesalahan, padahal hanya urutan penggunaan.
- Peringatan Chrome DevTools tentang meta `apple-mobile-web-app-capable` adalah **peringatan kompatibilitas PWA**, bukan penyebab kegagalan perekaman. Diperbaiki dengan menambah `mobile-web-app-capable`.

## Apa yang diubah

1. Petunjuk **Langkah 1: centang izin, Langkah 2: tekan Mulai** tampil tepat di atas tombol perekam.
2. Jika Mulai ditekan tanpa persetujuan, SIPETAK menunjuk ke checkbox dan memberi pesan biasa (bukan kesalahan merah). Mikrofon tidak diaktifkan.
3. **Hentikan** dan **Penanda Pembicara/Waktu** otomatis nonaktif saat belum merekam, aktif setelah rekaman berjalan, lalu nonaktif kembali sesudah berhenti.
4. Saat persetujuan dicabut di tengah perekaman, SIPETAK menghentikan rekaman dan dikte.
5. Status Audio/Teks, penyimpanan transkrip, pembuat Notulen/Risalah dan mesin perekaman WAV **tetap dipertahankan**.
6. Tambah tag PWA standar untuk mengatasi peringatan meta Chrome.

## Mengunggah ke GitHub

Dari GitHub versi **v3.12.3-rc1** gunakan paket **PATCH v3.12.4-rc1**. Buat branch staging/cadangan, ekstrak ZIP, lalu unggah **isi ZIP** ke root repo dengan struktur folder dipertahankan. Jangan mengunggah ZIP sebagai satu file. Jalankan `npm run verify`, periksa diff, commit, lalu deploy Cloudflare Pages. Pastikan aplikasi online menampilkan versi **v3.12.4-rc1**; jika masih lama, muat ulang tab agar service worker diperbarui.

Jika GitHub tidak pasti masih v3.12.3-rc1, gunakan ZIP **FULL** di staging setelah membandingkan file, jangan langsung menimpa `main` produksi tanpa backup.

## Uji 30 detik di Chrome

1. Buka **Transkripsi Suara**, pilih klasifikasi `Internal` (atau `Umum` sesuai kebijakan). Isi agenda bila tersedia.
2. **Centang kotak izin** merekam. Tombol Hentikan dan penanda masih nonaktif, itu normal.
3. Tekan **Mulai Rekam + Tulis Langsung**. Izinkan mikrofon pada prompt Chrome.
4. Pastikan **Audio: merekam WAV**. Ucapkan satu kalimat; pastikan **Teks** mulai terisi sebelum menekan Hentikan.
5. Coba tekan **Ketua Rapat** saat sedang merekam. Penanda waktu dibuat manual.
6. Tekan **Hentikan**, putar audio WAV, lalu **Unduh rekaman WAV**. Periksa teks sebelum simpan dan membuat Notulen/Risalah.

**Catatan:** jika Audio aktif tetapi teks tidak keluar, itu masalah dukungan/izin layanan SpeechRecognition browser, bukan kesalahan warna status. Chrome yang berhasil pada pengujian Anda sebelumnya adalah pilihan awal. Perekaman plus dikte bersamaan belum dapat dijamin di Safari atau Firefox.

## Batas klaim

Pengujian otomatis Node: **54/54 lulus** (termasuk regresi keadaan awal, persetujuan, dan siklus tombol). Ini **belum diuji dengan mikrofon nyata** di Chrome/Safari pengguna, **belum di-commit GitHub**, dan **belum dideploy**. Tidak ada kunci API atau kredensial yang perlu dikirim.
