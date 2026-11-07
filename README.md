# SIPETAK Pribadi — v3.10.1-rc2

**Status: RELEASE CANDIDATE / STAGING — BELUM DINYATAKAN SIAP PRODUKSI.**

Aplikasi web/PWA offline-first untuk pekerjaan Sekretariat DPRD Kabupaten Kapuas Hulu: tugas, agenda Sekwan, persidangan, telaahan, RHK/SKP, bukti dukung, AI, sinkronisasi Supabase terenkripsi, dan **Transkripsi Suara**.

## Menggunakan aplikasi

1. Buka SIPETAK melalui HTTPS, buat/buka **brankas pribadi**.
2. Buka **Transkripsi Suara** dari menu. Ketik nama kegiatan dan pilih klasifikasi.
3. Gunakan **Unggah rekaman**, atau **Mulai rekam → Hentikan**. Pilihan lain: **Ketik saat bicara** jika browser mendukung pengenalan suara (butuh izin dan hanya untuk klasifikasi Umum).
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
- `modules/transcription/recording-engine.js`: perekaman MediaRecorder tanpa *timeslice* dan WAV 16 kHz untuk iPhone, tanpa menyimpan audio ke brankas.
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

## Catatan perbaikan suara 3.9.1-rc2 (iPhone)

- Header CSP sebelumnya mengizinkan `blob:` untuk gambar tetapi **tidak untuk audio**, sehingga pemutar rekaman lokal dapat menampilkan *Kesalahan*. `_headers` kini mencantumkan `media-src 'self' blob:`. Ini **tidak** memberi izin ke domain media eksternal.
- iPhone memilih perekaman mono WAV 16 kHz agar lebih kompatibel; pengguna lain tetap menggunakan format terbaik yang didukung `MediaRecorder`. Tombol **Rekam kompatibel (WAV)** tersedia sebagai alternatif manual.
- Pada `MediaRecorder` digunakan `start()` tanpa `timeslice=1000`, sehingga mengurangi masalah pemutaran MP4 di beberapa versi Safari.
- Rekaman hanya berada pada memori halaman. Untuk menyimpannya di perangkat, tekan **unduh rekaman** sebelum menutup atau mengunci SIPETAK. Rekaman lama yang terlanjur gagal belum bisa dipulihkan tanpa berkas aslinya.
- Mode WAV berukuran lebih besar dan berhenti pada batas unggah 20 MB (sekitar 10 menit pada 16 kHz mono). Untuk rapat panjang, gunakan Memo Suara lalu unggah hasilnya.
- Perbarui *service worker* dan muat ulang aplikasi setelah deploy. Uji dengan rekaman tanpa informasi rahasia sebelum menggunakan audio rapat dinas.


## Rekam + teks langsung (v3.10.1-rc2)

Mode utama: rekam audio WAV lokal sekaligus transkripsi live gpt-live-transcribe via WebRTC. Aktifkan Cloudflare Pages function `/api/transcribe-live` dengan secret OPENAI_API_KEY, D1 TRANSCRIBE_DB, serta `TRANSCRIBE_LIVE_ENABLED=true`. Sistem memerlukan Supabase login, persetujuan, klasifikasi Umum atau Internal, koneksi HTTPS, dan izin mikrofon. Transkrip disimpan terenkripsi hanya setelah koreksi/konfirmasi pengguna. Klasifikasi Terbatas tidak dikirim ke layanan eksternal. Sesinya dibatasi pada pengguna melalui kuota D1, tetapi durasi/billing server-side harus dimonitor sebelum rilis produksi. Teks dapat muncul tertunda dan bagian yang masih sementara dapat berubah; uji Safari iPhone nyata wajib sebelum deploy utama.

## Perbaikan server transkripsi v3.10.1-rc2

Jika tampilan menyebut "transkripsi server belum diaktifkan", buka **Transkripsi Suara → Periksa kesiapan server** untuk melihat komponen cloud yang belum siap. Baca `docs/PERBAIKAN-TEKS-LANGSUNG-3.10.1-rc2.md` dan aktifkan variable/secret/binding pada Cloudflare Pages. Browser tidak dapat mengaktifkan layanan atau mengetahui kunci API secara otomatis. Dalam mode gagal, audio WAV tetap direkam lokal, **bukan** transkrip realtime. Tidak ada migrasi data Supabase.
