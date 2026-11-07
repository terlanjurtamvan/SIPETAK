# SIPETAK v3.10.0-rc1 — Rekam + Teks Langsung

## Permintaan utama

Tombol **🔴 Mulai Rekam + Teks Langsung** adalah aksi utama baru: pengguna memberi persetujuan, membuka mikrofon, merekam audio **WAV lokal**, dan memperoleh teks sementara yang diperbarui dari model `gpt-live-transcribe` di kolom transkripsi selama pembicaraan berlangsung. Pengguna menekan **■ Hentikan**, membaca/memperbaiki teks, mencentang verifikasi, dan menyimpan transkrip terenkripsi bila diinginkan. Tombol **Rekam audio saja**, **Rekam kompatibel (WAV)** dan **Unggah rekaman** tetap tersedia untuk kondisi tanpa koneksi atau transkripsi realtime gagal. Aplikasi tidak menganggap transkrip/hasil rapat sebagai keputusan resmi.

## Cara menerapkan pada Cloudflare Pages

1. **Cadangkan** GitHub dan ekspor brankas terenkripsi, gunakan branch `feature/live-transkripsi-v3-10` dan deploy **preview/staging**. Jangan hapus isi Supabase atau pengaturan brankas yang sudah ada. Paket FULL adalah snapshot proyek, PATCH adalah file yang berubah dari `3.9.1-rc2`.
2. Pada Cloudflare Pages staging, pastikan folder `functions/` tidak diperlakukan sebagai berkas statis; endpoint **POST `/api/transcribe-live`** harus aktif. File `_headers` mempertahankan `Permissions-Policy: microphone=(self)` dan CSP `connect-src 'self' https: wss:` serta `media-src 'self' blob:`.
3. Tambahkan secret **`OPENAI_API_KEY`** di Cloudflare (jangan dimasukkan ke GitHub atau halaman HTML). Sediakan binding **D1 `TRANSCRIBE_DB`** dan jalankan `cloudflare/transcription-quota.sql` bila belum dibuat.
4. Tambahkan variabel **`TRANSCRIBE_LIVE_ENABLED=true`**, opsional `TRANSCRIBE_LIVE_DAILY_LIMIT=6`, `TRANSCRIBE_LIVE_GLOBAL_DAILY_LIMIT=60`. Lanjutkan konfigurasi Supabase `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` dan opsional `TRANSCRIBE_ALLOWED_USER_IDS`. Gunakan secret/variabel terpisah di preview dan production.
5. Jalankan `npm run verify` lalu tes langsung dengan akun percobaan dan audio nonsensitif. Setelah dianggap lulus, merge via pull request, deploy production dan lihat footer harus menampilkan **v3.10.0-rc1**.

## Alur sistem

```text
Klik Rekam + Teks Langsung (persetujuan & klasifikasi Umum/Internal)
  -> Mikrofon iPhone/desktop + perekam WAV lokal (maks. 10 menit / 20 MB)
  -> POST SDP `/api/transcribe-live` + access token Supabase
  -> Cloudflare memverifikasi Supabase + origin + klasifikasi + D1 kuota
  -> Cloudflare menghubungkan SDP ke OpenAI `gpt-live-transcribe`
  -> Audio WebRTC dari browser ke OpenAI; kunci API utama hanya di server
  -> DataChannel menerima delta/completed -> teks tampil saat berbicara
  -> Hentikan; file WAV sementara bisa diputar / diunduh
  -> Pengguna koreksi, centang verifikasi dan simpan ke vault terenkripsi
  -> Notulensi, ringkasan bahan, calon tindak lanjut, metadata bukti
```

## Keterbatasan yang belum teruji di perangkat asli

- **Tidak ada layanan cloud yang dikonfigurasi pada ZIP.** Tanpa `TRANSCRIBE_LIVE_ENABLED=true`, API key OpenAI, D1, autentikasi Supabase dan internet, audio tetap terekam lokal tetapi **teks langsung tidak muncul**. Pesan error harus tampil. Tidak ada fallback diam-diam yang mengirim audio ke layanan lain.
- iPhone Safari harus memakai **HTTPS** dan izin mikrofon; WebRTC perlu diuji langsung di iPhone. Transkrip sementara bisa bergeser/mengalami koreksi, ada latensi dan tidak selalu sempurna saat suara tumpang tindih.
- UI mematikan sesi setelah **10 menit** dan audio WAV 16 kHz batas ~20 MB. **Pembatas waktu dalam browser tidak membatasi token/API secara keras terhadap klien yang dimodifikasi.** Saat rollout, tetapkan batas pemakaian OpenAI dan monitoring biaya di sisi penyedia; untuk produksi skala besar perlu pengendalian durasi di sisi server/provider dan kebijakan retensi.
- Materi **Terbatas** tidak boleh dikirim ke API eksternal. `Internal` hanya jika kebijakan instansi membolehkan, ada persetujuan perekaman/pemrosesan, serta tujuan pemakaian benar. Pertimbangkan pengolahan on-premise bila dokumen memang tidak boleh keluar instansi.
- ZIP belum mengubah GitHub atau Cloudflare. Verifikasi pengujian unit bukan bukti lulusnya browser iOS/layanan AI nyata. Aktifkan **preview** lebih dulu.

## Uji manual pada iPhone (setelah deploy)

1. Periksa footer **v3.10.0-rc1**; jika masih versi lama, tutup PWA, buka Safari dan muat ulang (service worker versi baru juga mengganti cache shell).
2. Buka brankas dan login Supabase; masuk menu Transkripsi; pilih klasifikasi `Umum`, centang persetujuan dan isi nama agenda.
3. Ketuk **🔴 Mulai Rekam + Teks Langsung**, pilih Izinkan Mikrofon. Tunggu notifikasi **Tersambung**; katakan: “Selamat pagi, rapat pembahasan rancangan peraturan daerah dimulai.”
4. Pastikan **teks bertambah saat berbicara**, bukan setelah menekan Hentikan. Lalu **Hentikan**, putar WAV, unduh cadangan audio jika ingin menyimpannya.
5. Perbaiki transkrip, centang **Saya sudah membaca dan mengoreksi** lalu Simpan. Buka lagi dan tes ekspor TXT, notulensi dan kaitkan agenda.
6. Uji kondisi offline, menolak mikrofon, internet putus, klasifikasi Terbatas, API tidak dikonfigurasi, token kedaluwarsa, dan navigasi saat merekam. Pastikan ada pesan jelas dan tidak terjadi penyimpanan/pengiriman diam-diam.

Rujukan API resmi: https://developers.openai.com/api/docs/guides/realtime-transcription dan https://developers.openai.com/api/docs/guides/realtime-webrtc
