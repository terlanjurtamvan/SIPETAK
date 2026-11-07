# SIPETAK v3.15.0-rc1 — Flowchart Interaktif Modern

**Tujuan:** memperbarui tampilan navigasi Peta Kerja dan Peta Asisten Sekwan tanpa menambah beban isian atau mengubah mesin kerja.

## Perubahan tampilan

- **AS-IS (Saat Ini):** kanvas alur berwarna dengan garis panah, dua masukan (Catatan dan Transkripsi), proses Asisten Sekwan / Persidangan, simpul pemeriksaan berbentuk belah ketupat, dan tiga jalur hasil. Kotak adalah **tautan navigasi**, bukan bukti bahwa setiap perpindahan otomatis.
- **TO-BE (Target):** alur Catatan Tunggal → Jenis Kegiatan → Draf Rapat/Tugas/Sekwan → Verifikasi → Hasil. Tautan target yang belum otomatis ditandai **TARGET** dan garis putus-putus; tombol masih membuka modul terkait yang sudah ada.
- **Asisten Sekwan:** alur arahan/catatan dan tamu → jenis urusan → Raperda/disposisi/kontak → tugas dan rekap. Tracking Raperda, Buku Tamu, dan Telepon Cepat dapat dibuka dengan mengetuk simpul.
- **Mobile:** flowchart otomatis ditampilkan sebagai timeline langkah vertikal. Tidak ada area horizontal yang harus digeser. Pengguna tidak perlu memasukkan data tambahan untuk melihat peta.

## Cara menggunakan

1. Buka **Peta Kerja** di menu kiri SIPETAK.
2. Pilih **Saat Ini (AS-IS)** untuk pekerjaan nyata atau **Target Otomatis (TO-BE)** untuk melihat rencana.
3. Tekan simpul seperti **Catatan Sekali Input**, **Rekam + Transkrip**, **Notulen & Risalah**, **Tugas**, atau **Laporan/PDF** untuk membuka halaman tersebut.
4. Untuk urusan Sekwan, buka **Asisten Sekwan → Peta Sekwan**, lalu ketuk **Tracking Raperda**, **Buku Tamu**, atau **Telepon Cepat**.
5. Setelah pekerjaan selesai, periksa hasil dan gunakan menu **Laporan** atau tombol **Cetak/PDF** yang sudah tersedia untuk mencetak.

## Keamanan dan kompatibilitas

- Tidak ada perubahan schema brankas, pemrosesan data, koneksi Supabase, penyimpanan, izin, ataupun mesin audio.
- Semua teks node di-escape sebagai HTML. SVG hanya menggambar konektor, tidak menjalankan perintah.
- Pengujian dilakukan pada kode dan rendering browser Chromium headless desktop/mobile; belum mengubah situs produksi pengguna.
- Jika file flow-visual.js gagal dimuat, peta lama tetap menjadi fallback agar navigasi tidak hilang.

## GitHub

**Dasar patch:** v3.14.0-rc1. Buat branch staging dari versi tersebut, ekstrak dan salin isi patch ke root repo, jalankan `npm run verify`, lalu deploy preview Cloudflare Pages. Setelah uji klik semua simpul, mobile, dikte, dan backup, barulah merge ke `main`.
