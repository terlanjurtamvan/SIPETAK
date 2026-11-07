# PILIH FILE INI UNTUK GITHUB — SIPETAK v3.12.3-rc1

**Rekomendasi:** gunakan `SIPETAK_v3.12.3-rc1_META_REFERENSI_FULL.zip` untuk basis repo yang belum pasti, pada branch staging, setelah backup; unzip lalu commit **isi foldernya**, bukan ZIP dan bukan `notulenrek.html`. Bila GitHub sudah persis `v3.12.2-rc1`, boleh gunakan `SIPETAK_v3.12.3-rc1_META_REFERENSI_PATCH.zip` yang lebih kecil.

> Jangan menghapus repo atau isi data Supabase. Pembaruan front-end tidak mengubah data terenkripsi, dan tidak perlu memasukkan token atau file `.env` ke GitHub.

## Langkah aman

1. Di GitHub buat branch baru `staging/sipetak-3.12.3-meta` dari branch aplikasi saat ini.
2. Unduh ZIP lengkap; ekstrak. Upload **isi folder** ke root repositori pada branch staging, pertahankan `.github/`, `.gitignore` dan `functions/` (jangan mengunggah `notulenrek.html` dari Meta AI sebagai pengganti `index.html`). Jika ada konfigurasi produksi khusus milik Anda, review perbedaan sebelum menimpa.
3. Jalankan `npm run verify` (Node >=20); di paket ini **52/52** pengujian otomatis lulus.
4. Deploy branch tersebut ke Cloudflare Pages sebagai preview/staging. Uji *langsung pada Chrome* izin mikrofon, audio WAV dapat diputar/diunduh, teks muncul saat berbicara, tekan tombol pembicara saat rekam, cek penanda tersimpan dan muncul di Risalah, ulang buka hasil riwayat.
5. Hanya setelah hasil nyata lulus, gabungkan ke `main` lalu deploy produksi. Jika tidak, kembalikan commit/branch semula.

## Perubahan sejak 3.12.2

- Menambah metadata rapat: Tahun Sidang, Masa Persidangan, Rapat Ke-, Acara Rapat.
- Menambah penanda manual pembicara/waktu (diaktifkan saat rekaman berlangsung) per sesi, disimpan dalam brankas terenkripsi sebagai `speakerMarkers`.
- Menambah bagian catatan penanda manual pada Notulen dan Risalah, tanpa mengarang nama/keputusan.
- Menambah empat pengujian otomatis baru.
- Mempertahankan kode inti `combined-engine.js` dan `recording-engine.js` **tanpa perubahan**.

**Belum diverifikasi:** perekaman simultan di Safari iPhone/Firefox dan uji mikrofon produksi. Firefox tetap memerlukan jalur transkripsi server bila fitur dikte bawaan tidak tersedia.
