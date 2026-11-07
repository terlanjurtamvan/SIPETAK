# SIPETAK v3.12.3-rc1 — Integrasi referensi Meta AI

**Status:** kode untuk staging; belum diterapkan ke GitHub/Cloudflare atau diverifikasi pada iPhone.

## Yang digabungkan

- Identitas risalah: Tahun Sidang, Masa Persidangan, Rapat Ke-, Acara Rapat, di samping data yang sudah ada.
- Penanda manual saat perekaman: Ketua Rapat, Anggota, Sekretaris/Setwan, Narasumber, nama sendiri, dan penanda waktu. Waktu perkiraan dihitung sejak tombol rekam ditekan, dibuat per sesi.
- Penanda disimpan sebagai `speakerMarkers` pada masing-masing data transkrip di brankas terenkripsi tanpa mengubah skema Supabase. Tidak ada penyimpanan audio di brankas; WAV tetap harus diunduh.
- Penanda ditampilkan sebagai catatan terpisah pada Notulen dan Risalah, **tidak** otomatis diatribusikan ke kalimat transkrip.

## Tidak diganti

- Mesin perekaman WAV + speech recognition Chrome yang telah dicoba pengguna.
- File HTML Meta AI yang ternyata tidak menggunakan MediaRecorder/getUserMedia untuk menyimpan audio.
- Perlindungan klasifikasi Terbatas dan persetujuan perekaman.

## Urutan commit yang aman

1. Cadangkan branch produksi; buat branch `staging/meta-referensi-3.12.3` dari commit yang diketahui aktif.
2. Jika branch sekarang sudah v3.12.2-rc1, pakai PATCH; untuk basis berbeda, bandingkan dan gunakan FULL pada branch staging **tanpa menimpa konfigurasi rahasia**.
3. Jalankan `npm run verify` dengan Node.js >=20. Uji manual: Chrome + mikrofon, simpan WAV, teks realtime; tekan peran saat rekam; berhenti; periksa Notulen/Risalah; refresh dan buka riwayat; cek data lama.
4. Review perubahan dan merge setelah pengujian nyata berhasil. Jangan commit `node_modules`, `.env`, token, atau `notulenrek.html`.

> Penanda pembicara adalah tindakan notulis, bukan identifikasi suara otomatis. Risalah yang dibuat berstatus KONSEP sampai diverifikasi/disahkan sesuai aturan instansi.
