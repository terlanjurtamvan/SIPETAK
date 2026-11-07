# SIPETAK v3.10.1-rc2 — Perbaikan pesan server belum aktif dan transkripsi langsung

## Diagnosis dari screenshot iPhone, 7 November 2026

- **Rekaman WAV berhasil:** pemutar audio menunjukkan sekitar 21 detik dan file lokal ~659 KB.
- **Ketik otomatis gagal:** pesan menunjukkan server `/api/transcribe` dan `/api/transcribe-live` belum diaktifkan. Ini **bukan kerusakan mikrofon**. Kode aplikasi saja tidak menyediakan layanan cloud yang diperlukan.
- Kode v3.10.0-rc1 ternyata memakai `server_vad` dalam sesi `gpt-live-transcribe`, yang tidak didukung menurut dokumentasi API. Versi ini memakai `turn_detection: null` dan melakukan `input_audio_buffer.commit` melalui DataChannel secara berkala (~6 detik), dengan commit terakhir saat berhenti. Teks sementara dapat berubah ketika hasil akhir tiba.

## Yang telah diperbaiki dalam ZIP ini

1. **Pemeriksaan kesiapan server** `GET /api/transcribe-status` (hanya status, tidak memakai kunci atau kuota; tidak mengirim audio). Memeriksa flag, secret API, binding D1, tabel kuota, dan variabel Supabase tanpa menampilkan nilainya.
2. Tombol **↻ Periksa kesiapan server** di halaman transkripsi. Pesan memandu pengelola jika sebuah komponen belum dikonfigurasi, atau mendeteksi route 404 dan fallback HTML.
3. Saat pengguna menekan **Mulai Rekam + Teks Langsung**, aplikasi memulai izin mikrofon dari gesture iPhone, lalu memeriksa kesiapan server. **Jika server tidak siap, UI menyatakan hanya audio lokal yang direkam dan tidak berpura-pura sedang mengetik.** Audio dapat dihentikan, diputar, dan diunduh. Tidak ada unggahan otomatis yang disamarkan.
4. Mengganti konfigurasi realtime menjadi `turn_detection: null` dan commit berkala menggunakan DataChannel sesuai karakteristik `gpt-live-transcribe`.
5. Mempertahankan pengamanan klasifikasi **Terbatas**, pemeriksaan login Supabase dan kuota D1, penyimpanan brankas terenkripsi, serta tidak menyimpan raw audio di database.

## WAJIB: Aktivasi di Cloudflare Pages — ini tidak bisa diaktifkan dari ZIP

Gunakan akun Cloudflare yang mengelola SIPETAK. Pastikan layanan benar-benar menggunakan **Cloudflare Pages** (bukan hanya static hosting tanpa Pages Functions).

1. Buat branch GitHub cadangan dan deploy ZIP/PATCH v3.10.1-rc2 ke **preview/staging**. Pastikan folder `functions/api/` ikut dideploy sebagai **Cloudflare Pages Functions**.
2. Pada **Cloudflare Dashboard → Workers & Pages → proyek SIPETAK → Settings → Variables and Secrets**, isi untuk environment preview:
   - `TRANSCRIBE_LIVE_ENABLED` = `true` (variable biasa)
   - `TRANSCRIBE_ENABLED` = `true` (variable biasa, untuk transkripsi setelah rekaman selesai)
   - `OPENAI_API_KEY` = kunci API OpenAI yang aktif, **Encrypted Secret** (jangan kirim di chat/jangan commit ke GitHub)
   - `SUPABASE_URL` = URL proyek Supabase yang digunakan SIPETAK
   - `SUPABASE_PUBLISHABLE_KEY` = publishable/anon key publik proyek Supabase yang sama
   - opsional `TRANSCRIBE_LIVE_DAILY_LIMIT=6`, `TRANSCRIBE_LIVE_GLOBAL_DAILY_LIMIT=60`, dan allowlist user untuk rollout terbatas
3. Buat database **D1** misalnya `sipetak-transcription-quota`; jalankan SQL dalam `cloudflare/transcription-quota.sql` pada database tersebut.
4. Di **Pages Project → Settings → Bindings → Add → D1 database binding**, pilih D1 tersebut dan isi variable binding **tepat** `TRANSCRIBE_DB`.
5. **Redeploy** proyek setelah menambah variables, secret, dan binding. Pastikan semuanya dipasang pada environment yang sama (preview dan production berbeda).
6. Pastikan akun penyedia AI memiliki akses model & kuota/billing yang sesuai. Untuk produksi, tetapkan batas belanja dan pantau pemakaian sebelum memperluas akses.

## Uji satu kali dari iPhone

- Setelah deploy, muat ulang Safari/PWA hingga footer `v3.10.1-rc2`.
- Buka menu Transkripsi → ketuk **Periksa kesiapan server**. Harus menampilkan `Teks langsung: Server terkonfigurasi...` dan transkripsi file juga siap. Jika tetap belum siap, pesan menyebut konfigurasi yang perlu diaktifkan.
- Login Supabase & buka brankas; klasifikasi **Umum** untuk rekaman percobaan yang tidak sensitif; isi nama agenda dan centang izin.
- Ketuk **Mulai Rekam + Teks Langsung**, izinkan mikrofon, ucapkan kalimat percobaan beberapa detik. Tunggu koneksi, periksa apakah teks mulai muncul ketika berbicara.
- Ketuk **Hentikan**; putar WAV dan koreksi transkrip, lalu simpan hanya jika sudah diverifikasi.
- Jika status konfigurasi siap tetapi koneksi gagal, periksa **Cloudflare Pages Function logs**, error HTTP `/api/transcribe-live`, akses model dan kuota OpenAI, serta koneksi WebRTC jaringan iPhone. Jangan kirim kredensial ke chat.
- **Tetap lakukan pengujian real device** sebelum merge staging → produksi. Tes unit tidak menjamin koneksi WebRTC dengan layanan asli berhasil.

## Rollback aman

Kembali ke branch/commit produksi sebelumnya jika terjadi masalah. Jangan hapus database Supabase atau berkas brankas. Matikan `TRANSCRIBE_LIVE_ENABLED=false` dan `TRANSCRIBE_ENABLED=false` untuk menolak permintaan baru. Perubahan ini tidak membutuhkan migrasi skema Supabase.

**Dokumentasi resmi:**
- Cloudflare Pages bindings/secrets: https://developers.cloudflare.com/pages/functions/bindings/
- Transkripsi realtime: https://developers.openai.com/api/docs/guides/realtime-transcription
