# Checklist QA, rilis, pemulihan SIPETAK v3.9.1-rc2

## Uji yang telah dijalankan dalam pembuatan paket

- [x] Pemeriksaan sintaks seluruh berkas `.js` / `.mjs` dengan Node 22.
- [x] Konsistensi versi BUILD-INFO, package, HTML; keberadaan aset lokal pada `index.html`.
- [x] Pengecekan Service Worker memasukkan skrip/style modul baru; izin `microphone=(self)`.
- [x] Unit test validasi audio, klasifikasi draf, pembentukan konsep tanpa keputusan palsu.
- [x] Backend mock: akun tidak login ditolak, asal situs silang ditolak, penonaktifan layanan, D1 wajib, format ditolak, klasifikasi Terbatas ditolak, kuota dipatuhi, transkripsi normal mengembalikan draf.
- [x] Kuota SQLite `UPSERT RETURNING` diverifikasi di SQLite lokal untuk 3 permintaan dan satu penolakan.
- [ ] End-to-end browser Chromium: terhalang kebijakan lingkungan `ERR_BLOCKED_BY_ADMINISTRATOR` (bukan berarti aplikasi lolos/gagal).
- [ ] Login Supabase produksi dan worker OpenAI nyata: tidak ada secret/akun akses di sesi ini.
- [ ] iPhone Safari/PWA, izin mikrofon, file rekaman M4A, putus koneksi, telepon terkunci: perlu perangkat nyata.
- [ ] Pemulihan brankas lama anonim di staging, sinkronisasi multi-perangkat, konflik data: belum diverifikasi nyata.

## Checklist sebelum tayang

- [ ] Tetapkan izin merekam, klasifikasi informasi, retensi, dan sumber pendanaan layanan AI.
- [ ] Staging Cloudflare Pages siap, D1 sudah disetel, OpenAI key tersedia hanya sebagai secret.
- [ ] Masuk Supabase dan cek endpoint 401, 403, 413, 429, 503, dan 200 pada staging.
- [ ] Konfirmasi file audio tidak masuk log/koleksi DB publik, token tidak bocor ke origin lain.
- [ ] Verifikasi 20 MB limit, 25 MB upstream provider, file kosong/tidak didukung dan error provider.
- [ ] Uji rekam/unggah dari iPhone dan laptop. Pastikan mikrofon berhenti saat pengguna pindah menu atau mengunci aplikasi.
- [ ] Tampilkan transkrip Bahasa Indonesia dan koreksi angka/nama/pembicara; cocokkan dengan audio sumber.
- [ ] Simpan transkrip terenkripsi, logout/lock, buka ulang, cek restore backup `.sipetak` dari data lama.
- [ ] Cek fitur lama: tugas, persidangan, SKP/RHK, laporan, AI worker, sync, buku hukum, backup, kunci otomatis.
- [ ] Persetujuan pemilik sistem dan uji lapangan dalam lingkungan instansi sebelum release produksi.

## Rollback

1. **Nonaktifkan upload** dengan Cloudflare `TRANSCRIBE_ENABLED=false` agar kode endpoint menolak permintaan baru.
2. Jika UI juga harus kembali: redeploy komit produksi sebelumnya atau kembalikan ZIP asli, tetapi **jangan** menghapus brankas atau data Supabase.
3. Jika terjadi masalah data: pulihkan cadangan `.sipetak` terenkripsi yang diuji; perhatikan data yang dibuat setelah tanggal backup tidak termasuk.
4. Data `transcriptions` opsional; sistem lama tidak menggunakan field ini tetapi sebaiknya **jangan melakukan downgrade permanen** dengan data baru tanpa ekspor teks/backup.
5. Audit insiden dan periksa penggunaan API dan D1 tanpa membuka isi rekaman.

## Batas proyek

Refaktor dilakukan **secara bertahap** dan aman: modul transkripsi menjadi folder terpisah, tes/CI/dokumentasi ditambah, kode inti aplikasi lama tetap. Pemecahan total `app.js`, `workflow.js`, `ai-assistant.js` belum dilakukan karena berisiko migrasi yang merusak data bila tanpa pengujian produksi. Paket ini adalah release candidate, bukan sertifikasi produksi.

## Uji khusus iPhone untuk v3.9.1-rc2

1. Pastikan `_headers` aktif dengan `media-src 'self' blob:` pada domain SIPETAK, bukan hanya di repositori.
2. Perbarui PWA/service worker; tutup aplikasi sepenuhnya, buka lagi dan cek versi pada footer.
3. Buka menu Transkripsi di Safari; beri izin mikrofon; rekam contoh 10–15 detik lalu Hentikan.
4. Pastikan pratinjau WAV dapat diputar; ketuk **unduh rekaman** sebagai cadangan.
5. Coba tombol **Ubah rekaman menjadi teks** hanya bila endpoint Cloudflare dan API key telah diaktifkan; kalau tidak, cek pesan error server.
6. Uji unggah file dari Memo Suara dan pastikan hasilnya dapat diputar.
7. Uji menutup/mengunci brankas saat sedang merekam; indikator mikrofon harus padam dan audio mentah tidak tersimpan otomatis.
8. Jangan terapkan ke produksi sampai semua langkah lulus pada iPhone nyata, termasuk restore backup dan tes sinkronisasi.

Jika audio masih gagal, catat versi iOS, jenis browser/PWA, nama/ukuran berkas, dan pesan status transkripsi; kirim tanpa konten audio sensitif.
