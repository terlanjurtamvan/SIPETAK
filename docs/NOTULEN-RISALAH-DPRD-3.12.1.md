# SIPETAK v3.12.1-rc2 — Notulen dan Risalah Sekali Transkrip

## Tujuan

Satu kali merekam di Chrome dan meninjau transkrip dapat menghasilkan **dua dokumen yang berbeda**: Notulen Rapat (pokok pembahasan, simpulan, tindak lanjut) dan Risalah Rapat (uraian pembicaraan lebih lengkap), dengan metadata rapat bersama.

**Status semua keluaran: KONSEP, bukan dokumen kedinasan yang telah disahkan.** Format dirancang agar mudah disesuaikan dengan Tata Tertib DPRD Kabupaten Kapuas Hulu, pedoman tata naskah dinas, dan kop/penomoran resmi instansi. Kami tidak mengklaim bahwa kop/tanda tangan/penomoran kosong ini adalah bentuk final yang sudah disahkan.

## Cara paling singkat

1. Buka **Transkripsi Suara** di SIPETAK. Gunakan rekam + tulis langsung seperti yang sudah berhasil di Chrome; hentikan dan periksa audio WAV serta teks.
2. Isi **Nama kegiatan / agenda**. Periksa dan koreksi seluruh transkrip.
3. Buka panel **Identitas rapat & hasil terverifikasi**. Isi informasi yang diketahui *sekali* untuk kedua dokumen: jenis rapat, tanggal, waktu, tempat, sifat rapat, pimpinan, sekretaris, daftar hadir/undangan, notulis, kesimpulan dan tindak lanjut. Kolom boleh kosong dan akan ditandai untuk verifikasi.
4. Tekan **Buat Notulen** atau **Buat Risalah** untuk pratinjau teks; **Word Notulen/Risalah** untuk mengunduh berkas `.doc` yang dapat dibuka dan diedit di Word/Pages; atau **Cetak / PDF** untuk membuka dialog cetak dan memilih Simpan sebagai PDF.
5. Centang **teks diperiksa**, kemudian tekan **Simpan teks terenkripsi**. Isi metadata formulir akan disimpan bersama rekaman teks dalam brankas, tanpa mengubah skema Supabase atau menyimpan audio. Untuk menyiapkan lima keluaran teks sekaligus, gunakan **Buat semua draf sekaligus** (Notulen, Risalah, petikan, calon tindak lanjut, metadata bukti).

## Perbedaan dokumen

- **Notulen:** agenda, metadata rapat, pokok pembahasan *yang dapat diedit*, kesimpulan/keputusan yang dimasukkan petugas, tindak lanjut/PIC/tenggat, dan lampiran transkrip.
- **Risalah:** metadata rapat, pembukaan dan kuorum (memerlukan pemeriksaan), keseluruhan uraian jalannya rapat berdasarkan transkrip yang masih perlu dilengkapi identitas pembicara, penutupan, serta pengesahan.
- **Tidak ada keputusan/kuorum/nama pembicara yang dibuat otomatis.** Jika tidak ada informasi, ditulis `[perlu verifikasi]`, bukan kesimpulan palsu.

## Batasan penting

- Ekspor Word memakai `.doc` berisi HTML terformat sehingga bisa diedit di Word atau Pages; jika dibutuhkan `.docx`, buka lalu pilih **Save As** `.docx`. Alternatif tanpa Word adalah **Cetak / PDF**.
- Untuk risalah rapat resmi yang mensyaratkan uraian lengkap menurut pembicara, petugas perlu mengoreksi teks, mengisi pembicara dan mencocokkan dengan rekaman asli. Pengenalan suara tanpa diarization tidak dapat mengisi nama pembicara dengan akurat.
- Hindari ekspor dokumen rapat rahasia ke perangkat bersama tanpa izin. Berkas Word/PDF yang diunduh berada **di luar brankas terenkripsi**; atur penyimpanan sesuai SOP instansi.
- Tidak ada panggilan AI, Cloudflare atau layanan eksternal tambahan untuk *membuat dokumen*. Modul hanya memformat teks yang sudah ada di aplikasi.

## Pemasangan aman

Basis: `SIPETAK v3.12.0-rc1` — paket yang sebelumnya telah Anda gunakan dan dilaporkan berhasil mengetik di Chrome. Backup dan buat branch staging terlebih dahulu; terapkan patch dan jalankan `npm run verify` (Node 20+). Setelah deploy, pastikan footer `v3.12.1-rc2`. Uji pratinjau, unduhan `.doc`, dialog Cetak PDF, serta penyimpanan dan pembukaan kembali metadata. Jangan mengganti data Supabase, secret, atau format brankas.

## Acuan penyusunan

- PP Nomor 12 Tahun 2018 tentang Pedoman Penyusunan Tata Tertib DPRD Provinsi, Kabupaten, Kota.
- Peraturan DPRD Kabupaten Kapuas Hulu Nomor 1 Tahun 2024 tentang Tata Tertib DPRD, yang disebut pada berita resmi Pemerintah Kabupaten Kapuas Hulu. Naskah lengkap dan ketentuan format lokal **perlu diverifikasi dengan Bagian Persidangan** sebelum digunakan sebagai format kedinasan baku.
