# Generator SKP e-Kinerja BKN · SIPETAK v3.16.0-rc1

## Tujuan

SIPETAK menjadi alat kerja **satu pengguna**, bukan pengganti layanan resmi e-Kinerja BKN. Cukup mencatat kegiatan di modul yang sudah ada; Generator SKP menyusun **bahan draf** per tahun dan RHK, memisahkan tugas jabatan utama dan dukungan tambahan Asisten Sekwan, serta memberi daftar bukti yang perlu diverifikasi. Tidak ada nilai SKP, persetujuan, atau impor langsung yang dihasilkan secara otomatis.

## Cara menggunakan dari awal sampai cetak

1. Masuk ke **SIPETAK > Tahun Kinerja**, pastikan tahun aktif tepat.
2. Buka **Pemetaan RHK**, salin rumusan RHK individu dan indikator/target **berdasarkan SKP yang disepakati**, bukan katalog contoh. RHK hasil katalog tetap berstatus draf usulan.
3. Buka **Catatan Kerja**, **Tugas Harian**, **Telaahan**, **Persidangan**, **DIM/Raperda**, atau **Asisten Sekwan**. Catat pekerjaan cukup satu kali, seperti biasa. Untuk aktivitas terkait, gunakan RHK pada form tugas saat sudah diketahui.
4. Buka **Peta Kinerja > Generator SKP BKN** atau menu **SKP & Rencana Aksi**. Bagian **Rekap otomatis** memperlihatkan kegiatan dan bukti per RHK. Pekerjaan dari satu catatan yang menurunkan beberapa draf dihitung sekali sebagai kegiatan unik.
5. Buka **Pemetaan kerja**. Pilih RHK bagi sumber yang masih “Perlu dipetakan”. Jika RHK sudah diisi di Tugas Harian, relasi itu digunakan otomatis. Draf turunan catatan mewarisi tautan sumber yang cocok. Pemetaan tersimpan di brankas terenkripsi.
6. Di bagian rekap per RHK, tekan **RHK pimpinan yang diintervensi**. Masukkan teks RHK pimpinan **untuk RHK individu tersebut** berdasarkan klarifikasi ekspektasi, bukan dugaan.
7. Isi tab **Identitas & ekspektasi**: nama, NIP bila diketahui, jabatan, pejabat penilai, periode, pendekatan kualitatif/kuantitatif, catatan dialog kinerja, dan ekspektasi perilaku kerja. Data kosong tidak dibuat-buat.
8. Buka **Pratinjau SKP** untuk memeriksa hasil kerja utama, hasil kerja tambahan, indikator, target, dan lampiran aktivitas/bukti. Perbaiki RHK dan bukti sebelum mengeluarkan dokumen.
9. Tekan **Cetak / Simpan PDF** (dialog browser), **Word (RTF)** untuk pengeditan di Microsoft Word, atau **Tabel bantu CSV** untuk referensi pengisian manual. RTF bukan DOCX dan CSV **bukan format impor e-Kinerja BKN**.
10. Cocokkan dokumen dengan format yang digunakan instansi dan entri dalam **layanan e-Kinerja BKN**. Finalisasi, dialog kinerja, dan penilaian resmi tetap dilakukan pada jalur kepegawaian yang berlaku.

## Batasan yang sengaja dipertahankan

- **Tidak menebak** RHK pimpinan, IKI, target, realisasi, angka kredit, status persetujuan atau predikat hasil kerja. Hitungan aktivitas bukan angka capaian.
- Tidak mengirim data ke BKN/AI melalui Generator SKP. Penyimpanan melalui **brankas AES-GCM** dan mekanisme sinkron yang sudah ada jika diaktifkan pengguna.
- Referensi bukti berstatus “perlu diperiksa” kecuali diberi status verifikasi dan mempunyai materi/uraian. Metadata bukti draf otomatis **bukan bukti sah**.
- Isi sumber berkategori **Terbatas** tetap dapat terlihat saat membaca brankas lokal, tetapi judulnya disamarkan saat mencetak/mengekspor dokumen SKP.
- Data dikelompokkan menurut tahun. Tahun arsip tidak dapat diubah melalui generator.
- Jika suatu kegiatan tidak memiliki tahun yang bisa ditentukan dari tanggal/metadata, generator **tidak otomatis mengelompokkannya**.
- Pengelompokan **utama/tambahan** berasal dari kategori katalog RHK yang sudah dipakai SIPETAK atau penanda peran pada RHK; konfirmasi keterkaitan dengan SKP individu.
- Bukan alat pengunggah data otomatis ke e-Kinerja BKN. Tidak ada integrasi dengan akun/otentikasi BKN.

## Rujukan regulasi

- PermenPANRB 6 Tahun 2022 tentang Pengelolaan Kinerja Pegawai ASN (status berlaku pada JDIH BPK).
- Surat Edaran Kepala BKN 1 Tahun 2023 tentang Pedoman Teknis Pengelolaan Kinerja Pegawai ASN; menyebut format SKP sebagai panduan yang dapat dikembangkan instansi, wajib menggambarkan ekspektasi hasil dan perilaku kerja dari dialog kinerja.
- Peraturan BKN 2 Tahun 2026 tentang Layanan E-Kinerja BKN; berlaku sejak 8 April 2026 menurut JDIH BKN.

SIPETAK mengikuti unsur yang relevan untuk penyusunan **bahan draf**, tetapi tampilan dan format ekspor belum diverifikasi sama persis dengan formulir akun e-Kinerja BKN yang aktif untuk instansi pengguna.

## Pengujian sebelum produksi

1. Uji satu catatan → draf tugas otomatis → pemetaan RHK satu kali → rekap. Pastikan hanya satu kegiatan unik.
2. Uji satu penugasan **utama** dan satu **Asisten Sekwan**, pastikan kelompok dokumen terpisah.
3. Tautkan bukti draf dan bukti terverifikasi; pastikan status dan jumlahnya tidak tercampur.
4. Periksa ekspor PDF, RTF, CSV untuk XSS, judul Terbatas, dan kesesuaian teks dengan data sebenarnya.
5. Logout, masuk kembali, periksa pemetaan dan identitas tetap ada di brankas.
6. Uji tahun lain serta arsip, dan pastikan perubahan tak merusak data lama.
7. Bandingkan hasil dengan SKP resmi instansi dan lakukan uji lapangan pada Cloudflare staging.
