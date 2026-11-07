# Cara commit SIPETAK v3.12.5-rc1 — Panduan Rekam sampai Cetak

Basis: **SIPETAK v3.12.4-rc1**. Fitur yang ditambahkan hanya petunjuk kerja sampai print/PDF; mesin perekaman tidak berubah.

1. Cadangkan versi kerja GitHub saat ini dan, jika perlu, cadangkan brankas terenkripsi; **jangan** unggah file rekaman, isi brankas, atau kredensial rahasia ke GitHub.
2. Di GitHub buat branch misalnya `staging/transkripsi-panduan-cetak-3.12.5` dari versi yang sedang terpasang.
3. Jika GitHub **persis v3.12.4-rc1**, gunakan ZIP **PATCH**: ekstrak lalu salin **isi file** ke root repositori, pertahankan struktur direktori. Jika versi dasar tidak pasti, gunakan ZIP **FULL** setelah cadangan dan tinjau diff secara hati-hati.
4. Commit file yang berubah: `index.html`, `BUILD-INFO.json`, `package.json`, `sw.js`, `README.md`, `guide.js`, `modules/transcription/transcription.js`, `modules/transcription/transcription.css`, serta dokumen/tes baru. **Jangan commit ZIP itu sendiri**.
5. Jalankan `npm run verify` dengan Node >=20, lalu deploy branch staging melalui alur Cloudflare Pages proyek. Pastikan versi terlihat **v3.12.5-rc1**.
6. Uji panduan pada **Transkripsi Suara** (panel 📘) dan **Panduan Penggunaan** (cari “cetak”). Uji tampilan di Mac dan iPhone; periksa dialog cetak dari tombol “Cetak / PDF Notulen/Risalah” dan hasil PDF A4.
7. Lakukan uji mikrofon Chrome memakai materi uji yang diizinkan, simpan WAV dan transkrip, lalu buat dokumen. Barulah gabungkan branch setelah diverifikasi.

Panduan cetak: `docs/PANDUAN-TRANSKRIPSI-SAMPAI-CETAK-3.12.5.md`. Status hasil tetap **KONSEP**, perlu pemeriksaan/pengesahan instansi. Tidak ada perubahan skema Supabase, kunci, backend atau format brankas.
