# Aktivasi Transkripsi SIPETAK di Cloudflare Pages

## 1. Pastikan basis sistem terlindungi

1. Unduh cadangan terenkripsi `.sipetak` di SIPETAK lama. Pastikan file bisa dibaca/diimpor pada *staging* tanpa menggunakan berkas rahasia.
2. Buat Git branch `feature/transkripsi-suara-v3.9` dari commit produksi, kemudian salin perubahan paket ini; **jangan timpa repository produksi tanpa review**.
3. Jalankan `npm run verify`. Jangan mengganti isi password brankas, payload schema 3, atau `supabase/` migrations tanpa rencana migrasi terpisah.

## 2. Siapkan Cloudflare Pages

- Proyek Cloudflare Pages dengan **root folder repositori** dan output folder root (`.`) seperti konfigurasi statis lama. Folder `functions/` perlu ikut di root agar tersedia sebagai Pages Function.
- Pastikan Cloudflare Pages Functions aktif dan ruta `POST /api/transcribe` tersedia pada domain HTTPS SIPETAK.
- Pastikan file `_headers` diterapkan: `microphone=(self)`. Akses mikrofon tetap meminta izin browser. Kamera dan geolokasi tetap diblokir.
- Jangan deploy `functions/` sekadar sebagai berkas static; fungsi harus dijalankan Cloudflare Pages.

## 3. Secret dan variabel runtime

Di **Cloudflare Workers & Pages → Project SIPETAK → Settings → Variables and Secrets** (atur staging/preview dan production secara terpisah):

| Nama | Jenis | Keterangan |
|---|---|---|
| `OPENAI_API_KEY` | **Secret** | Kunci API akun penyedia transkripsi dengan penagihan aktif. Tidak tampil di browser. |
| `TRANSCRIBE_ENABLED` | Variable | `true` hanya bila diizinkan. `false` jika ingin mematikan tanpa menghapus modul. |
| `TRANSCRIBE_DAILY_LIMIT` | Variable opsional | Misal `8` permintaan/pengguna/hari (default 8). |
| `TRANSCRIBE_GLOBAL_DAILY_LIMIT` | Variable opsional | Misal `200` permintaan/hari di seluruh instansi (default 200). |
| `TRANSCRIBE_ALLOWED_USER_IDS` | Variable opsional | Daftar *user ID* Supabase, dipisahkan koma, untuk rollout terbatas. |
| `SUPABASE_URL` | Variable | URL Supabase yang sama dengan `index.html`. |
| `SUPABASE_PUBLISHABLE_KEY` | Variable | Public key Supabase, sama dengan `index.html`; **bukan** service_role. |

Tanpa semua komponen wajib, endpoint **gagal tertutup (503)**; tidak ada fallback yang membocorkan kunci di klien.

## 4. Siapkan Cloudflare D1

1. Buat basis data D1 baru untuk *quota*, misalnya `sipetak-transcription-quota`.
2. Jalankan `cloudflare/transcription-quota.sql` di konsol D1 (atau lewat CLI Cloudflare) untuk membuat tabel `transcription_quota`.
3. Di **Pages project → Settings → Bindings → Add D1**, bind basis data tersebut dengan **nama tepat `TRANSCRIBE_DB`**, pada lingkungan yang benar.
4. Redeploy agar secret dan binding efektif.

Basis data hanya menyimpan penghitung per pengguna/hari. Konten audio dan transkrip tidak disimpan pada D1. Pengelola harus menetapkan retensi dan membersihkan counter lama menurut kebijakan.

## 5. Alur transkripsi

```
SIPETAK (HTTPS, brankas terbuka + Supabase login)
  -> rekam / unggah + izin eksplisit
  -> POST same-origin /api/transcribe dengan token Supabase
  -> Pages Function verifikasi sesi ke Supabase /auth/v1/user
  -> verifikasi format / ukuran / klasifikasi + kuota atomik D1
  -> OpenAI /v1/audio/transcriptions, model gpt-transcribe
  -> JSON teks (draft), tanpa menyimpan audio mentah di server
  -> pengguna koreksi + simpan AES-GCM di brankas lokal
  -> draf notulensi/tugas/bukti via modul SIPETAK
```

Tipe audio: MP3, MPEG, MPGA, MP4, M4A, WAV, WEBM; maksimal **20 MB** untuk menghindari melampaui limit unggahan penyedia (25 MB). Untuk rekaman panjang, kompres atau pecah secara eksternal sebelum unggah; **pemotongan otomatis belum tersedia**. Beberapa browser tidak mendukung dikte langsung, termasuk perbedaan dukungan Safari.

## 6. Pertimbangan keamanan dan tata kelola

- Dapatkan izin perekaman serta persetujuan pemrosesan eksternal dari instansi. **Terbatas** diblokir secara UI dan server. Label **Internal** hanya boleh diproses bila kebijakan instansi mengizinkan dan pengguna menyatakan persetujuannya.
- Sistem tidak mengunggah rekaman saat memilih berkas / merekam; unggah baru terjadi setelah tombol **Ubah rekaman menjadi teks** ditekan.
- Dikte browser adalah fitur pihak browser yang **tidak selalu beroperasi lokal**; dibatasi untuk Umum dengan persetujuan eksplisit. Untuk materi yang tidak boleh keluar perangkat, **gunakan pengetikan manual atau mesin ASR lokal/on-premise yang disetujui**.
- Fungsi tidak memanggil OpenAI jika token Supabase, binding D1, atau secret belum tersedia; no-store untuk respons; tidak mencatat isi audio maupun transkrip dalam kode endpoint.
- D1 melakukan dua pemotongan kuota terpisah (global dan pengguna). Jika kuota global sudah dipotong tetapi kuota pengguna habis, satu slot global mungkin tetap dihitung. Ini pembatas biaya konservatif, bukan akuntansi biaya presisi.
- Kebijakan retensi data penyedia eksternal, biaya model dan kepatuhan data sensitif harus diverifikasi oleh instansi sebelum produksi.
- Nilai biaya dan SLA belum ditetapkan otomatis. Tetapkan batas tagihan API di sisi penyedia dan monitor penggunaan Cloudflare/OpenAI di luar proyek.

## 7. Perintah pengecekan

```sh
npm run verify
```

Bila sudah dipasang dan disetujui, uji dengan akun percobaan: audio tidak rahasia, transkrip singkat, koreksi, simpan lokal, ekspor TXT, hubungkan agenda, buat tugas draf, tutup dan buka brankas, backup-restore, dan cek daftar kuota Cloudflare.

Referensi teknis:
- https://developers.openai.com/api/docs/guides/speech-to-text
- https://developers.cloudflare.com/pages/functions/bindings/
