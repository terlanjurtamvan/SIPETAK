# SIPETAK v3.8.4 — Tampilan Dokumen Hasil AI (iPhone)

Pembaruan ini memperbaiki **tampilan hasil AI**; bukan pemasangan Worker, migrasi database, atau perubahan kata sandi.

## Berkas yang diganti di repository GitHub `terlanjurtamvan/SIPETAK`

1. `ai-assistant.js` — penampil dokumen aman, pemformatan Markdown, label tidak berganda, tombol salin teks rapi.
2. `ai-assistant.css` — desain dokumen, judul, identitas, daftar dan paragraf yang sesuai iPhone/MacBook/tema terang-gelap.
3. `sw.js` — versi baru cache PWA agar pembaruan dimuat.

**Jangan mengganti `index.html`, `app.js`, `supabase-sync.js`, atau file Cloudflare Worker.** URL dan publishable key Supabase serta alamat Worker AI yang sudah berfungsi tidak perlu diubah. Tidak ada SQL baru.

## Pemasangan tanpa Terminal melalui Safari iPhone

1. Pastikan SIPETAK sudah memiliki cadangan data terbaru dan sinkronisasi aman.
2. Unduh ZIP PATCH, buka aplikasi **File**, lalu ketuk ZIP untuk mengekstrak.
3. Buka https://github.com/terlanjurtamvan/SIPETAK pada Safari dan login GitHub.
4. Pada folder utama repository, ganti ketiga berkas tersebut (jangan membuat folder baru). Gunakan pilihan **Edit** atau **Upload files**, pilih `Commit changes`.
5. Tunggu status deploy **Success** pada Cloudflare Pages.
6. Tutup jendela SIPETAK dari pengalih aplikasi iPhone, lalu buka kembali lewat ikon SIPETAK di layar utama. Bila versi lama masih terlihat, buka sekali https://sipetak.pages.dev/ di Safari ketika terhubung internet dan buka ulang PWA.
7. Buka **Asisten AI**. Jalankan contoh telaahan aman yang sudah Anda gunakan atau buka salah satu draf lama dengan tombol **Lihat**.

## Perubahan tampilan

- Dokumen ditampilkan sebagai halaman baca biasa, **tanpa kotak kecil yang harus digulir sendiri**.
- Judul seperti `**TELAAHAN STAF**` dan `**I. POKOK PERSOALAN**` muncul sebagai judul sungguhan.
- `Kepada`, `Dari`, `Tanggal`, dan `Perihal` ditata dalam blok identitas.
- Daftar bernomor dan poin dipisah; paragraf lebih mudah dibaca.
- Peringatan “DRAF AI — WAJIB VERIFIKASI” hanya tampil satu kali di atas pratinjau, jika AI menaruh label identik di awal teks.
- Tombol **Salin teks rapi** menyalin tulisan tanpa tanda `**` dan `#` ke clipboard.
- Tautan **Lihat teks asli dari AI (Markdown)** dapat dibuka bila perlu memeriksa teks asli.
- **Simpan draf terenkripsi** tetap menyimpan teks asli, sehingga draf lama tidak hilang atau ditulis ulang.
- **Buka di formulir Telaahan** mengisi kolom analisis dengan versi teks rapi; **belum menyimpan atau mengesahkan** dokumen.

## Keamanan dan batasan

- Perubahan hanya pada tampilan dan clipboard. AI tetap memerlukan login Supabase dan persetujuan sebelum pengiriman.
- Teks hasil AI diperlakukan sebagai data tidak tepercaya; pemformatan dilakukan dari unsur teks yang telah di-escape. HTML dari AI tidak dieksekusi.
- Ini adalah penampil Markdown terbatas: judul, tebal, miring, paragraf, daftar, tabel sederhana, kutipan, kode. Bukan editor Word atau pemeriksa fakta.
- Hasil AI **tetap konsep** yang perlu verifikasi faktual dan hukum sesuai proses instansi.
- Pengujian kode dan simulasi lokal berhasil; belum diuji pada iPhone Anda atau situs produksi.

Jika setelah deploy tampilan belum berubah, kirim screenshot menu **Hasil konsep AI** atau status Cloudflare Pages, bukan kata sandi dan bukan dokumen kedinasan rahasia.
