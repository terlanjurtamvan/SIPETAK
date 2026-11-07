# SIPETAK v3.14.0-rc1 — Peta Kerja Interaktif dan Asisten Sekwan

## Ringkasan

SIPETAK adalah alat bantu **pribadi untuk satu pengguna** (bukan portal multi-pengguna). Pembaruan ini membuat **Peta Kerja Saat Ini (AS-IS)** dan **Target Otomatis (TO-BE)** berbeda secara visual serta memberi navigasi nyata ke modul yang tersedia.

Modul **Asisten Sekwan** sekarang mempunyai peta operasional dan tiga buku kerja personal: Tracking Raperda, Buku Tamu, dan Telepon Cepat. Disposisi, DIM, Tugas, SLA, Bukti, Persidangan, serta Laporan tetap memakai modul SIPETAK yang sudah ada.

## Cara pakai cepat

1. Buka **Peta Kerja** lewat menu samping. Pilih **Saat Ini (AS-IS)** untuk melihat modul yang benar-benar sudah tersedia. Klik salah satu kartu untuk membuka modulnya.
2. Pilih **Target Otomatis (TO-BE)** untuk melihat pengembangan yang direncanakan. Kotak bergaris putus-putus bertanda **BELUM AKTIF** bukan fitur yang sudah jalan. Tombol lain membawa Anda ke modul yang ada.
3. Buka **Asisten Sekwan**, pilih **Peta Sekwan**. Klik kotak **Tracking Raperda**, **Buku Tamu**, **Telepon Cepat**, **Disposisi**, **Tugas**, **SLA** atau **Laporan**.
4. Di **Tracking Raperda**, isi judul, tahapan yang diketahui, PIC koordinasi, tenggat, langkah berikutnya, dan hambatan. Pilih **Buat draf tugas otomatis** jika ada tindak lanjut. Catatan Raperda tidak mengesahkan tahap hukum.
5. Di **Buku Tamu**, isi nama, instansi, tanggal, keperluan. Jika ada tindak lanjut, isi uraian dan tenggat agar draf tugas bisa dibuat sekaligus. Jika nomor valid dan opsi diizinkan, kontak cepat disiapkan otomatis tanpa mengetik ulang.
6. Di **Telepon Cepat**, masukkan nama dan nomor. Tombol **☎ Panggil** hanya menjalankan tautan `tel:` setelah Anda menekannya; ponsel/browser yang mengatur konfirmasi panggilan.
7. Cek **Tugas Harian** untuk tindak lanjut yang dibuat otomatis, lalu lengkapi hasilnya jika sudah dikerjakan. Buka **Pengaturan** untuk cadangan terenkripsi.

## Apa yang otomatis dan apa yang belum

- **Sudah diimplementasikan dalam kode:** navigasi antarhalaman, peta klik, catatan Raperda, buku tamu, kontak cepat, satu kali catat → draf tugas tindak lanjut, satu kali catat tamu → kontak bila dipilih, penyimpanan dalam brankas yang sudah ada.
- **Belum otomatis:** menerima surat/disposisi dari sistem kantor, mengetahui tahapan Raperda dari data pemerintah, mendeteksi identitas pengunjung, menelepon tanpa ketukan, menyetujui dokumen, memutuskan status hukum, atau menilai SKP.
- Mesin **Transkripsi Suara, rekam WAV, Notulen/Risalah** tidak diubah oleh pembaruan ini.

## Keamanan

- Nama, nomor telepon, dan buku tamu disimpan di struktur data JSON yang terenkripsi dengan brankas SIPETAK yang sudah ada. Jika sinkronisasi terenkripsi aktif, data itu dapat termasuk dalam payload sinkronisasi; verifikasi izin instansi sebelum mengaktifkannya.
- Data baru tidak dikirim ke API AI oleh modul ini. Tidak ada penyimpanan publik.
- Jangan masukkan dokumen berkategori Terbatas atau informasi personal yang tidak perlu jika aturan instansi tidak mengizinkannya.
- Cadangkan file `.sipetak` sebelum pembaruan, dan uji pemulihan cadangan secara aman.

## Memasang ke GitHub

**Untuk GitHub yang sekarang sudah berisi v3.13.0-rc1:**

1. Buat branch `staging/sipetak-3.14.0` dan cadangkan brankas `.sipetak`.
2. Unduh ZIP **PATCH v3.14.0-rc1**, ekstrak, salin *isi* ZIP ke **root repositori** (bukan mengunggah ZIP sebagai satu file).
3. Jalankan `npm run verify` bila ada Node.js 20+; lalu commit: `feat: peta kerja interaktif dan asisten sekwan pribadi`.
4. Deploy branch staging melalui Cloudflare Pages dan uji pada Chrome Mac + Safari/Chrome iPhone sesuai penggunaan.
5. Uji: peta AS-IS → klik modul; peta TO-BE → label BELUM AKTIF; Asisten Sekwan → tambah satu Raperda → muncul tugas terkait; buku tamu → kontak cepat; backup → pulihkan pada lingkungan uji.
6. Pastikan semua fungsi lama termasuk Transkripsi Suara tidak bermasalah sebelum merge ke `main`.

**Jika versi GitHub belum 3.13.0-rc1:** gunakan ZIP **FULL** dengan perbandingan berkas dan cabang staging, bukan PATCH 3.14 yang menimpa versi tidak cocok.

## Pengujian & batas kepastian

- `npm run verify`: pengujian unit/mock dan struktur lulus (termasuk uji baru untuk penyimpanan yang gagal, validasi nomor, rute, dan pembuatan tugas).
- Pratinjau HTML/CSS desktop dan 390px telah dirender secara statis. Tidak ada pelebaran horizontal pada pratinjau.
- **Belum diuji:** seluruh aksi end-to-end pada situs live, Chrome/Safari iPhone nyata, Cloudflare Pages produksi, Supabase aktual, serta proses panggilan telepon dari perangkat nyata. Lingkungan browser otomatis menolak navigasi URL, sehingga pengujian real-browser penuh tidak bisa diklaim.
- Paket kode **belum di-commit dan belum di-deploy** oleh asisten.
