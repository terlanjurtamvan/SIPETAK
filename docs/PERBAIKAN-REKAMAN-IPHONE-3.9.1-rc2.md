# Perbaikan rekaman iPhone — SIPETAK v3.9.1-rc2

**Masalah yang terlihat:** rekaman di iPhone berukuran sekitar 721,6 KB bernama `rekaman-sipetak-….m4a`, tetapi pemutar HTML menampilkan **Kesalahan**.

## Akar masalah utama yang ditemukan pada kode

Header Cloudflare `_headers` memakai `Content-Security-Policy: default-src 'self'` tetapi tidak memiliki aturan `media-src`. Audio hasil perekaman dibuka lewat URL sementara `blob:`. Karena `media-src` mengikuti `default-src` jika tidak didefinisikan, pemutar browser dapat menolak blob lokal, sekalipun file audio sebenarnya ada. Ini cocok dengan gejala tangkapan layar.

**Perbaikan utama:** `_headers` sekarang berisi `media-src 'self' blob:`. Kebijakan tetap tidak memberi izin memuat media dari domain luar.

## Perlindungan tambahan untuk iOS Safari

- iPhone/iPad memilih perekaman lokal WAV mono PCM 16-bit, 16 kHz menggunakan Web Audio. Ini membantu menghindari masalah kontainer M4A/MP4 pada beberapa versi Safari.
- Tombol `Rekam kompatibel (WAV)` disediakan pada semua perangkat; bila metode bawaan tidak bekerja, bisa mencoba metode ini.
- `MediaRecorder` tidak lagi menggunakan interval potong `start(1000)`; sekarang `start()` tanpa potongan berkala dan file disusun setelah stop.
- Akses Web Audio diaktifkan langsung saat pengguna menekan tombol agar izin audio iOS lebih kompatibel.
- Pemutar memberi pesan yang lebih jelas bila audio gagal diputar, dan menampilkan **unduh rekaman** untuk menyelamatkan salinan sebelum menutup halaman.
- Kode merekam hanya secara lokal sebelum pengguna menekan `Ubah rekaman menjadi teks`. Data audio mentah tidak ditulis ke brankas atau D1.

**Batas:** rekaman WAV tidak terkompresi, maksimal 20 MB (sekitar 10 menit pada 16 kHz mono). Untuk rapat lebih panjang, rekam di aplikasi Memo Suara, lalu unggah berkas audio ke SIPETAK.

## Cara menerapkan kode

1. Backup kode produksi, data brankas terenkripsi, dan konfigurasi Cloudflare yang berlaku.
2. Buat branch `fix/iphone-audio-v3.9.1-rc2` dari repo saat ini.
3. Gunakan ZIP FULL hanya untuk memperbarui file aplikasi dalam repositori, atau ZIP PATCH untuk menimpa file yang berubah. **Jangan hapus secret, binding D1, atau data Supabase.**
4. Pastikan file `_headers` ikut terdeploy oleh Cloudflare Pages, dan **header respons situs** benar-benar mengandung `media-src 'self' blob:`; jangan mengandalkan keberadaan file di GitHub saja.
5. Jalankan `npm run verify` dan deploy lebih dulu ke staging HTTPS.
6. Muat ulang PWA/Safari, pastikan footer menunjukkan `v3.9.1-rc2`. Jika aplikasi terpasang di Layar Utama, tutup dan buka kembali untuk mengaktifkan service worker baru.
7. Di menu Transkripsi, rekam audio nonrahasia 10–15 detik. Hentikan dan putar. Jika gagal, gunakan `Rekam kompatibel (WAV)`, lalu laporkan versi iOS dan pesan kesalahan.
8. Saat pemutar berfungsi, coba transkripsi AI. Jika gagal setelah klik `Ubah rekaman menjadi teks`, cek Cloudflare Pages Functions, `OPENAI_API_KEY`, D1 `TRANSCRIBE_DB`, `TRANSCRIBE_ENABLED` dan login Supabase. Itu jalur masalah yang **berbeda** dari pemutar audio.
9. Uji restore/sinkronisasi brankas, navigasi, tugas, dan persidangan sebelum merge produksi.

**Batas verifikasi:** pengujian otomatis JavaScript 15/15 lulus, `ffprobe` berhasil membaca file WAV sintetis dari engine. Uji iPhone fisik, Cloudflare production header, API transkripsi asli, dan keberhasilan deploy belum diverifikasi.

**Rujukan:** https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/media-src
