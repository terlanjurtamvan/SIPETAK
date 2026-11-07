# SIPETAK Pribadi — v3.11.0-rc1

**Status: release candidate untuk diuji; belum dipasang di GitHub atau Cloudflare produksi.**

Aplikasi SIPETAK untuk pekerjaan, agenda, SKP/RHK, bukti dukung, dan draf notulensi. Data brankas terenkripsi lama tetap dipertahankan.

## Ketik langsung tanpa konfigurasi AI/Cloudflare

1. Buka SIPETAK → **Menu → Transkripsi Suara** dan pastikan brankas sudah dibuka.
2. Isi nama kegiatan (opsional saat mendikte; wajib sebelum menyimpan). Pilih **Umum** atau **Internal** hanya jika kontennya diizinkan diproses oleh layanan pengenal suara browser. **Terbatas** tidak dapat menggunakan layanan pengenal suara browser.
3. Centang izin pengenalan suara; klik **🎤 Mulai Ketik Langsung**, berikan izin mikrofon bila diminta, lalu bicara dalam bahasa Indonesia.
4. Teks langsung muncul dan dapat bertambah di kolom hasil. Tekan **■ Hentikan**; periksa teks, beri judul, centang verifikasi, lalu **Simpan teks terenkripsi**.
5. Jika Safari berhenti di tengah sesi, tekan Mulai lagi: teks sebelumnya tidak hilang. Jika Safari tidak mendukung pengenalan suara, **ketuk kolom teks lalu ikon mikrofon di keyboard iPhone**. Pastikan fitur Dikte iPhone aktif di Pengaturan → Umum → Keyboard.

**Tidak perlu OPENAI_API_KEY, TRANSCRIBE_ENABLED, D1, atau perubahan server** untuk mode utama. SIPETAK tidak mengirim audio melalui API miliknya saat memakai dikte browser, tetapi perangkat/browser mungkin memproses audio melalui layanan pihak ketiga. Jangan gunakan untuk materi terbatas atau yang tidak mendapat izin. Fitur ini memerlukan Safari/iOS yang mendukung Web Speech; dukungan iPhone tidak selalu stabil.

**Perbedaan penting:** Ketik Langsung menghasilkan teks, **tidak membuat file rekaman audio**. Untuk menyimpan audio, buka bagian **Rekam atau unggah file audio (pilihan tambahan)** dan gunakan perekam WAV terpisah. Menjalankan kedua pengambil mikrofon bersamaan pada Safari iPhone tidak dijamin berjalan. Fitur backend lama ada dalam kode untuk integrasi opsional, tetapi tidak diperlukan untuk mode utama.

## Hasil satu input

Transkrip yang diperiksa dapat disimpan dan digunakan untuk menyiapkan beberapa **draf** notulensi, ringkasan, tindak lanjut, dan metadata bukti. Tidak boleh dianggap sebagai berita acara atau keputusan resmi tanpa verifikasi.

## Pemasangan aman

- Cadangkan GitHub dan brankas sebelum memperbarui.
- Untuk versi v3.10.1-rc2, terapkan ZIP **PATCH** ke root repositori (isi folder `SIPETAK-main/`, bukan membungkus folder baru).
- Deploy staging di Cloudflare Pages, muat ulang Safari sampai footer bertuliskan **v3.11.0-rc1**, lalu uji suara nonrahasia.
- `npm run verify` menjalankan pemeriksaan struktur dan pengujian Node otomatis.
- Format brankas `sipetak-vault-v1` tidak diubah; belum diuji dengan browser Safari pada perangkat pengguna.

Panduan 1 halaman: [docs/PANDUAN-KETIK-LANGSUNG-3.11.md](docs/PANDUAN-KETIK-LANGSUNG-3.11.md).
