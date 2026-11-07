# SIPETAK Pribadi — v3.9.1-rc2

**Status: RELEASE CANDIDATE / STAGING — BELUM DINYATAKAN SIAP PRODUKSI.**

Aplikasi web/PWA offline-first untuk pekerjaan Sekretariat DPRD Kabupaten Kapuas Hulu: tugas, agenda Sekwan, persidangan, telaahan, RHK/SKP, bukti dukung, AI, sinkronisasi Supabase terenkripsi, dan **Transkripsi Suara**.

## Menggunakan aplikasi

1. Buka SIPETAK melalui HTTPS, buat/buka **brankas pribadi**.
2. Buka **Transkripsi Suara** dari menu. Ketik nama kegiatan dan pilih klasifikasi.
3. Gunakan **Unggah rekaman**, atau **Mulai rekam → Izinkan mikrofon → Hentikan**. Saat merekam terlihat hitungan waktu; setelah dihentikan muncul pemutar audio serta tautan unduh sementara. Pilihan lain: **Ketik saat bicara** jika browser mendukung pengenalan suara (butuh izin dan hanya untuk klasifikasi Umum).
4. Untuk mengubah audio menjadi teks: pastikan ada izin merekam/pemrosesan, centang pernyataan persetujuan, login ke **Supabase**, lalu tekan **Ubah rekaman menjadi teks**. Cloudflare Pages harus dikonfigurasi oleh pengelola.
5. **Baca & koreksi** transkripsi, lalu centang pemeriksaan dan tekan **Simpan teks terenkripsi**. Rekaman mentah tidak disimpan dalam brankas.
6. Gunakan hasil **Draf notulensi**, **Petikan bahan ringkasan**, **Calon tindak lanjut**, dan **Metadata bukti dukung**. Opsional: hubungkan ke agenda yang sudah ada atau buat satu tugas pemrosesan draf.
7. Paket draf lengkap langsung dihasilkan setelah teks disimpan; hasilnya bisa diunduh sebagai TXT. Status hasil otomatis selalu **draf**. Jangan mencantumkan sebagai keputusan/risalah/bukti resmi tanpa verifikasi sesuai prosedur.

Jika API belum diaktifkan, kolom teks tetap bisa digunakan secara **manual** dan disimpan terenkripsi. Jika browser tidak mendukung rekam/dikte, gunakan fitur unggah audio.

## Struktur saat ini

- `index.html` dan `app.js`: shell aplikasi lama. Disengaja **tidak** ditulis ulang; kompatibilitas brankas lebih penting daripada refaktor besar tanpa uji lapangan.
- `workflow.js`, `skp-planner.js`, `supabase-sync.js`, `ai-assistant.js`: fitur lama dipertahankan.
- `modules/transcription/transcription-utils.js`: fungsi murni, dapat diuji tanpa browser.
- `modules/transcription/transcription.js`: antarmuka dan integrasi tugas/persidangan/brankas.
- `modules/transcription/transcription.css`: gaya modul terisolasi.
- `functions/api/transcribe.js`: autentikasi Supabase, validasi unggah, kuota D1, dan penyedia transkripsi.
- `cloudflare/transcription-quota.sql`: tabel kuota.
- `tests/`: unit test dan uji backend tiruan.
- `scripts/check-project.mjs`: validasi sintaks, aset, header, versi.
- `docs/`: dokumentasi, keamanan, checklist staging/produksi.

## Jalankan pengujian otomatis

Node.js 20+ diperlukan untuk pengujian (aplikasi statis tidak memerlukan bundler).

```sh
npm run verify
```

## Instalasi dan aktivasi di Cloudflare Pages

Petunjuk lengkap: [docs/DEPLOY-TRANSKRIPSI.md](docs/DEPLOY-TRANSKRIPSI.md).

Yang wajib disiapkan pengelola di lingkungan **staging**:

- `OPENAI_API_KEY` sebagai **secret** Cloudflare, tidak boleh di-commit.
- `TRANSCRIBE_ENABLED=true` (di staging lebih dulu).
- Binding Cloudflare D1 bernama **`TRANSCRIBE_DB`**, dengan skema `cloudflare/transcription-quota.sql` telah diterapkan.
- Opsional: `TRANSCRIBE_DAILY_LIMIT=8`, `TRANSCRIBE_GLOBAL_DAILY_LIMIT=200`, `TRANSCRIBE_ALLOWED_USER_IDS=<daftar id akun Supabase yang diizinkan>`.
- Pengaturan Supabase pada `index.html` dan endpoint `functions/api/transcribe.js` harus menunjuk ke proyek yang tepat. `sb_publishable_` adalah kunci publik, bukan rahasia; jangan menaruh `sb_secret_` atau `service_role` di browser.

**Jangan** mengaktifkan fitur dengan data rapat sesungguhnya sebelum izin dan kebijakan pengolahan informasi instansi ditetapkan.

## Kompatibilitas dan pemulihan

- Format brankas masih `sipetak-vault-v1` AES-GCM dan payload `schema:3`; **tidak ada migrasi destruktif**.
- `data.transcriptions` adalah koleksi opsional baru di JSON terenkripsi; brankas lama tetap bisa dibuka.
- **Buat cadangan terenkripsi `.sipetak` dari versi yang sedang berjalan**, simpan secara offline, uji pemulihan di staging, baru terapkan pembaruan.
- Jika penerapan gagal: kembalikan aset aplikasi/versi sebelumnya dan pulihkan cadangan `.sipetak` bila diperlukan. Tidak ada perubahan tabel vault Supabase.

## Batasan / yang belum diuji

Pengujian di repositori ini memakai Node dan mock backend; belum ada bukti keberhasilan transaksi OpenAI nyata, binding Cloudflare D1 produksi, Safari iPhone PWA, pengambilan mikrofon pada perangkat nyata, atau pemulihan brankas pengguna di server sebenarnya. Jangan menganggap CI hijau sebagai persetujuan produksi. Lihat [docs/QA-DAN-ROLLBACK.md](docs/QA-DAN-ROLLBACK.md).

## Perbaikan perekaman v3.9.1-rc2

Permintaan mikrofon sekarang dipicu langsung dari klik pengguna, menampilkan status izin/merekam beserta durasi, menangani penolakan/konflik perangkat dengan pesan bahasa Indonesia, dan menyediakan unduh audio sebelum menutup halaman. Tes dengan Safari iPhone asli tetap wajib. Pembaruan ini tidak mengaktifkan transkripsi server tanpa secret/binding Cloudflare.


### Perbaikan perekaman v3.9.2-rc3
Status mikrofon sekarang tepat di bawah tombol rekam, dengan indikator Menunggu izin / Mikrofon aktif. Pesan kesalahan pemutar audio tidak lagi tersembunyi di bawah tombol transkripsi. Jika tombol tidak bereaksi di aplikasi online, periksa versi footer, status izin Safari, dan pastikan deploy file baru plus service worker baru berhasil. Jangan menghapus aplikasi iPhone tanpa cadangan brankas: ini bisa menghapus penyimpanan lokal.
