# SIPETAK v3.9.1-rc2 — Perbaikan Mulai Rekam

Pembaruan dari v3.9.0-rc1 memperbaiki interaksi perekaman dan menambah petunjuk kesalahan. **Ini belum membuktikan akar masalah perangkat tertentu**, karena pengujian Safari/iPhone nyata belum dilakukan.

## Yang diperbaiki

- Permintaan mikrofon sekarang dipanggil langsung dari event klik, bukan ditunda ke microtask.
- Menampilkan tahap `Meminta izin mikrofon`, `Sedang merekam (MM:SS)`, `Mengakhiri rekaman`, dan `Rekaman selesai`.
- Memberikan petunjuk khusus saat izin ditolak, mikrofon tidak ada, atau perangkat sedang dipakai aplikasi lain.
- Mengakhiri rekaman lewat event `stop` MediaRecorder, tanpa timeslice agar browser dapat mengirim data final di akhir.
- Menawarkan tautan unduh audio sementara sebelum halaman ditutup (audio tetap tidak disimpan dalam brankas).
- Jika pengguna mengunci aplikasi saat prompt izin masih terbuka, permintaan lama dibatalkan secara logis dan stream dihentikan.
- Cache service worker dinaikkan ke `sipetak-shell-v3.9.1-rc2-audio-fix` supaya browser mengambil aset baru setelah deploy.

## Cara uji tanpa data rahasia

1. Gunakan perangkat iPhone Safari/Chrome atau desktop melalui URL `https://...` yang benar. Jangan buka situs dalam browser bawaan aplikasi perpesanan.
2. Masuk, buka brankas SIPETAK, lalu menu **Transkripsi Suara**.
3. Tekan **Mulai rekam** dan pilih **Izinkan** ketika diminta mikrofon.
4. Pastikan muncul **Sedang merekam (00:XX)**. Bicaralah 5–10 detik.
5. Tekan **Hentikan**. Pastikan muncul pemutar dan tautan unduh rekaman. Putar untuk memastikan ada suaranya.
6. Untuk membuat teks, setelah izin pemrosesan serta konfigurasi backend tersedia, centang persetujuan lalu tekan **Ubah rekaman menjadi teks**. Tombol **Ketik saat bicara** adalah opsi lain dan tidak sama dengan rekaman audio.
7. Jika gagal, catat teks pesan status yang muncul, model ponsel, browser, URL yang dibuka, serta apakah pernah muncul pop-up izin mikrofon. Jangan kirim rekaman rapat rahasia.

## Aktivasi transkripsi AI tetap terpisah

Agar **Ubah rekaman menjadi teks** berfungsi, pengelola tetap harus mengaktifkan Cloudflare Pages Function `/api/transcribe` dengan `OPENAI_API_KEY`, variabel `TRANSCRIBE_ENABLED=true`, Supabase auth dan D1 binding `TRANSCRIBE_DB`. Tanpa itu, rekaman lokal bisa selesai tetapi server belum dapat mengubahnya menjadi teks. Lihat `docs/DEPLOY-TRANSKRIPSI.md`.

## Batasan

- **13/13 tes otomatis lulus** pada Node.js termasuk tiga simulasi perekaman dan izin.
- Belum diuji dengan mikrofon iPhone nyata, Safari PWA, Cloudflare produk aktif, atau API transkripsi nyata.
- Simpan backup brankas `.sipetak` dan deploy di staging dahulu; jangan langsung menimpa produksi.
- Jika situs tetap menggunakan aset lama dari cache, periksa versi di footer dan reload melalui browser setelah deploy.

## Tambahan v3.9.2-rc3
Pesan status dan indikator mikrofon dipindah persis ke bawah tombol Mulai rekam. Gejala "tidak terjadi apa-apa" pada layar kecil bisa terjadi karena pesan lama tampil di bagian bawah formulir. Jika audio `.m4a` terbentuk tetapi pemutar menampilkan "Kesalahan", gunakan tautan unduh dan coba buka di aplikasi lokal; apabila tetap gagal, rekam dengan Voice Memos/Perekam Suara lalu unggah file. Masalah codec Safari belum bisa dinyatakan selesai tanpa pengujian nyata pada perangkat pengguna.

**Jangan uninstall PWA atau hapus data situs tanpa backup brankas** karena SIPETAK menyimpan data pekerjaan secara lokal terenkripsi.
