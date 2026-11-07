# SIPETAK v3.12.0-rc1 — Rekam WAV + Tulis Langsung (mode browser eksperimental)

**Tujuan:** satu ketukan memulai dua fungsi: simpan audio sebagai WAV sementara, sambil menampilkan teks hasil pengenal suara bawaan browser. Pengguna tidak harus mengetik ulang ucapan yang berhasil dikenali.

## Cara pengguna

1. Buka brankas; pilih **Menu → Transkripsi Suara** dan isi judul agenda.
2. Gunakan materi **Umum** atau **Internal** yang memang diizinkan diproses layanan pengenal suara browser; jangan gunakan materi **Terbatas**.
3. Centang izin rekaman dan pengenalan suara; ketuk **Mulai Rekam + Tulis Langsung** sekali, lalu izinkan mikrofon.
4. Ucapkan kalimat pendek dahulu. Lihat indikator **Audio** dan **Teks**. Jika teks mulai muncul, lanjutkan berbicara. Jangan kunci layar.
5. Tekan **Hentikan**. Putar WAV untuk memeriksa suara, periksa apakah unduhan otomatis berhasil, lalu ketuk **Unduh rekaman WAV ke perangkat** bila perlu. Di Safari bila hanya terbuka, gunakan Bagikan → Simpan ke File. Rekaman belum disimpan permanen sebelum diunduh.
6. Periksa teks, centang konfirmasi, klik **Simpan teks terenkripsi**, dan gunakan draf notulensi/daftar tindak lanjut.

## Penting — keterbatasan Safari iPhone

Safari iOS dapat menghentikan/membisukan `getUserMedia()` ketika `SpeechRecognition` mulai memakai mikrofon. Dengan **tanpa server atau API tambahan**, tidak ada cara web-browser yang terbukti andal untuk merekam file audio dan melakukan pengenalan suara bawaan **secara bersamaan di semua iPhone**. Versi ini merupakan **upaya browser eksperimental**, bukan jaminan bahwa dua hasil tersedia di perangkat Anda. Aplikasi mendeteksi kejadian `mute` pada track perekam dan memperingatkan ketika audio mungkin kosong. Pengenal suara juga bisa gagal atau tidak didukung.

Jika perlu kepastian produksi pada Safari iPhone, pilih **SATU jalur tangkap mikrofon** dan teruskan audio ke layanan transkripsi streaming di server (perlu pengaturan pengelola satu kali dan layanan berbiaya) atau buat aplikasi iOS native yang menggunakan Audio/Apple Speech framework. Jangan mengandalkan metode dua mikrofon web untuk rekaman rapat resmi tanpa uji lapangan.

## Konfigurasi & keamanan

- Mode utama ini **tidak memerlukan OPENAI_API_KEY, TRANSCRIBE_ENABLED, D1 atau endpoint Cloudflare SIPETAK**; browser dapat menggunakan layanan speech-to-text daring miliknya sendiri.
- Izin rekaman dan persetujuan untuk mengenali suara harus jelas; materi `Terbatas` diblokir dalam mode gabungan.
- Berkas audio **tetap lokal** pada halaman, tidak dikirim ke Supabase dan tidak otomatis dimasukkan ke brankas; pengguna harus mengunduhnya sebelum menutup halaman.
- Teks perlu diperiksa manual sebelum tombol Simpan terenkripsi diaktifkan; hasil bukan notulensi/keputusan resmi otomatis.
- Batasi sesi perekaman sekitar 10 menit/20MB (WAV mono 16kHz). Untuk rapat panjang, gunakan segmen pendek dan simpan tiap segmen.
- ZIP hanya berisi kode. Belum deploy GitHub/Cloudflare, belum ada pengujian nyata di iPhone pengguna.

## Pemasangan aman

1. **Backup** repo GitHub sekarang. Buat branch staging.
2. Jika memakai versi 3.11.0-rc1, ekstrak paket PATCH, salin **isi di dalam `SIPETAK-main/`** ke root repo Anda (jangan buat folder bertingkat baru). Paket FULL berisi semua aplikasi bila butuh salinan lengkap.
3. Jalankan `npm run verify` pada komputer yang memiliki Node 20+.
4. Deploy ke *staging*, buka Safari dan periksa footer `v3.12.0-rc1` (reload jika masih versi lama).
5. Uji dengan ucapan tak-rahasia dan cek **dua hal secara terpisah**: WAV dapat diputar dan teks muncul sebelum menekan Hentikan.
6. Kalau `Audio: mikrofon dibisukan` atau `Teks: dikte bermasalah`, jangan deploy sebagai fitur rapat resmi. Gunakan opsi terpisah sambil menentukan arsitektur realtime yang andal.

## Rollback

Kembalikan commit staging ke versi 3.11.0-rc1 dan deploy ulang; format brankas terenkripsi tidak berubah. Tidak ada migrasi Supabase.
