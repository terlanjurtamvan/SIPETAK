# SIPETAK v3.11.0-rc1 — Ketik Langsung (tanpa server AI)

**Sebelumnya:** pesan `TRANSCRIBE_LIVE_ENABLED` muncul karena tombol utama mengandalkan server berbayar yang belum diaktifkan. **Sekarang:** tombol utama memakai `SpeechRecognition`/`webkitSpeechRecognition` pada browser. Tidak ada panggilan API Cloudflare dari tombol ini dan tidak ada kunci API yang dibutuhkan.

## Cara pakai di iPhone

1. Buka SIPETAK lewat Safari (bukan browser dalam WhatsApp), buka brankas dan masuk Menu → Transkripsi Suara.
2. Centang izin (rekaman tidak harus disimpan). Tekan **Mulai Ketik Langsung**.
3. Izinkan mikrofon bila diminta. Ucapkan kalimat pendek bahasa Indonesia. Lihat teks pada kolom. Tekan **Hentikan**.
4. Periksa teks, isi nama kegiatan, centang verifikasi, klik **Simpan teks terenkripsi**.

## Jika tombol dikte tidak jalan

1. Ketuk kolom teks hingga papan ketik iPhone tampil.
2. Ketuk ikon **mikrofon** pada papan ketik iPhone, lalu bicara. Teks akan masuk ke kolom SIPETAK langsung.
3. Jika ikon tak ada: Pengaturan iPhone → Umum → Papan Ketik → Aktifkan Dikte.

Tidak ada cara aman bagi situs web untuk menekan tombol mikrofon keyboard iPhone secara otomatis. Pengguna perlu mengetuknya sendiri.

## Batasan

- Ini **dikte teks**, bukan **rekaman audio bersamaan**. Untuk file audio, gunakan tombol Rekam WAV terpisah. Dukungan Web Speech pada Safari iOS bersifat parsial; jangan menganggap semua versi iOS berhasil.
- Pengenalan suara browser mungkin menggunakan layanan online penyedia browser, walaupun tanpa API key SIPETAK. Jangan masukkan materi Terbatas dan patuhi aturan instansi.
- Hasil ucapan perlu koreksi; Safari bisa berhenti di tengah kalimat. Jika itu terjadi, tekan tombol mulai lagi untuk melanjutkan teks.
- Tidak diperlukan Cloudflare D1, fungsi transkripsi, OPENAI_API_KEY, atau `TRANSCRIBE_LIVE_ENABLED` untuk mode ini.

## Deploy & validasi

Buat cadangan kode dan brankas, terapkan patch pada repositori **v3.10.1-rc2** di branch staging, lalu deploy Cloudflare Pages. Pastikan footer **v3.11.0-rc1**. Tes ucapkan kalimat nonrahasia, cek teks muncul, berhenti, verifikasi, lalu simpan. Jangan menyatakan produksi siap sebelum uji iPhone dan pemulihan data lama.
