# Audit dan perbaikan Transkripsi Suara — SIPETAK v3.12.2-rc1

Tanggal: 7 November 2026. **Rilis kandidat untuk pengujian staging, belum diuji produksi/perangkat nyata.**

## Dasar

Basis kode `v3.12.1-rc2` yang sebelumnya dilaporkan berhasil merekam sambil mengetik di Google Chrome. Modul tersebut dipertahankan; tidak dipaksakan menggunakan API AI untuk alur utama. Tidak tersedia kode atau berkas Meta AI yang dapat diverifikasi pada saat paket audit disusun, jadi **kode Meta AI belum dibandingkan atau diintegrasikan**.

## Temuan dan tindakan

| Area | Risiko | Tindakan |
|---|---|---|
| Teks saat bicara | Teks hilang bila ditutup sebelum simpan | Cadangan **teks saja** setiap ~12 detik ke brankas terenkripsi yang sudah ada dan saat berhenti. Berstatus `CADANGAN BELUM DIPERIKSA`. |
| Dokumen resmi | Cadangan hasil rekam keliru dianggap dokumen terverifikasi | Catatan cadangan memiliki `verifiedAt: null`; belum boleh dipakai sebagai sumber tugas/bukti terverifikasi sampai dibuka, diperiksa, dicentang, dan disimpan manual. |
| Mikrofon | Rekaman WAV terbentuk tetapi nyaris sunyi | Lacak amplitudo puncak selama perekaman WAV; jika 3+ detik hampir tak ada sinyal, berikan peringatan saat selesai, **tanpa membuang berkas**. |
| Kembali/menu/riwayat | Tidak sengaja meninggalkan perekam yang masih berjalan atau mengganti WAV belum disimpan | Konfirmasi sebelum meninggalkan perekam aktif; cegah tombol transkrip baru/buka riwayat selama merekam; peringatan sebelum tab tertutup bila audio belum diunduh. |
| Teks duplikat | Hasil interim lama bisa tetap berada dalam array setelah koreksi hasil dikte | Sinkronisasi panjang array hasil pembacaan sesuai hasil browser terbaru. |
| Penggunaan harian | File audio hanya sementara pada halaman | Tautan `Unduh rekaman WAV` tetap jelas. Catatan: audio tidak disimpan otomatis ke brankas; unduh sendiri ke Files. |

## Yang sengaja tidak diubah

- Tidak mengubah skema Supabase, file SQL, atau format enkripsi `sipetak-vault-v1`.
- Tidak mengubah jalur **Chrome** utama menjadi jalur server/Cloudflare.
- Tidak memproses materi `Terbatas` dengan pengenal suara browser.
- Tidak menganggap transkrip, notulen, maupun risalah otomatis sebagai dokumen yang sudah disahkan.

## Pemasangan dan pengujian lapangan

1. Backup repo dan database/brankas terlebih dahulu. Buat branch `staging/transkripsi-3.12.2`.
2. Gunakan ZIP PATCH hanya jika basisnya `v3.12.1-rc2`; jika tidak yakin, gunakan ZIP FULL ke branch staging lalu bandingkan konfigurasi.
3. Jalankan `npm run verify` pada Node 20+; periksa footer menampilkan `v3.12.2-rc1` setelah deploy staging.
4. Uji di **Chrome**: buka brankas, centang izin, Mulai Rekam + Tulis Langsung, bicara 20–30 detik, pastikan teks bertambah sebelum Hentikan; setelah berhenti uji pemutaran WAV dan unduh audio ke Files.
5. Tanpa centang verifikasi, keluar lalu buka kembali transkrip dari riwayat: harus muncul `CADANGAN BELUM DIPERIKSA`, teks masih ada, tugas/evidence tidak bisa dihasilkan sebagai catatan terverifikasi.
6. Ulangi dengan Chrome Safari iPhone secara nyata. Firefox belum mendukung pengenal suara browser yang dipakai; jangan menjanjikan mode gabungan pada Firefox tanpa jalur transkripsi server.
7. Uji kondisi mikrofon ditolak, pindah menu saat merekam, audio sunyi, koneksi terputus, tab ditutup, brankas terkunci, dan batas ukuran ~20 MB.

## Catatan penggunaan, keamanan dan batas

- Fitur transkripsi simultan di browser menggunakan Web Speech API bila didukung. Browser dapat memakai pengenalan suara eksternal milik browser; pastikan izin rapat dan klasifikasi materi sesuai aturan instansi.
- **Cadangan otomatis hanya teks**, tidak mencadangkan audio atau menjamin keselamatan rekaman yang belum diunduh ketika ponsel mati atau browser crash. Sebuah browser yang tertutup paksa mungkin tidak sempat membuat cadangan terakhir.
- File WAV disimpan sebagai Blob sementara; ukuran maksimum per sesi dibatasi. Rekaman rapat yang panjang harus dipecah menjadi beberapa sesi, atau nanti tambahkan desain penyimpanan terenkripsi bertahap di perangkat.
- Belum ada uji mikrofon nyata di Firefox/Safari/Chrome pada perangkat pengguna maupun pengujian cloud sinkronisasi produk; status tetap `STAGING_NOT_PRODUCTION_VERIFIED`.
