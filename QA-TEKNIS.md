# Catatan QA SIPETAK v3.7

## Ruang lingkup
- Basis: Frontend SIPETAK v3.5 yang telah ditambahkan `app.js`, `supabase-sync.js`, dan `sw.js` PATCH v3.6 (Tetap Masuk iPhone).
- Index diambil dari unggahan pengguna terbaru (menjaga URL + publishable key Supabase), ditambahkan modul otomasi dan referensi Smart Push. Jangan mengganti URL Worker yang mungkin telah diisi pengguna belakangan.
- Pengujian otomatis: 10 kasus logic + 3 UI smoke, semua PASS.
- Semua `.js` lolos pemeriksaan sintaks Node.
- HTML assets, ID, cache SW, meta Supabase diverifikasi statis.
- Browser otomatis file:// dan localhost tidak dapat diakses (`ERR_BLOCKED_BY_ADMINISTRATOR`), sehingga tidak diklaim sudah browser-tested.

## Efek samping terencana
- `queueSave()` merekonsiliasi sumber pekerjaan secara idempotent sebelum snapshot dienkripsi, dengan batas `years.status='arsip'`.
- Registrasi siklus hanya tahap `diterima`; perubahan otomatis hanya ke `dikerjakan` ketika isian sumber mendukung. **Tidak** otomatis menandai `untuk_reviu`, `terverifikasi_internal`, `dilaporkan`, `diarsipkan`.
- Tautan bukti dibuat berdasarkan referensi ID eksplisit dan kecocokan tahun, bukan kemiripan judul.
- Pemetaan RHK dari sumber hanya jika satu RHK valid dan bukan konflik.
- Draf hitung SKP/IKI hanya baca; `skpActuals` tetap ditulis melalui alur penilaian manual yang sudah ada.
- Pengingat bukti yang tidak lengkap di push dijadwalkan satu kali, 24 jam setelah `completedAt` jika jadwal belum berlalu ketika SIPETAK terbuka dan sinkron. Worker lama hanya mengirim pesan umum.
- `automationEvents` (maksimal 300), `automationSnoozes` tersimpan dalam envelope vault yang sama; **tidak ada migrasi SQL baru**.

## Risiko residu
- Rekap agregasi sangat tergantung kualitas relasi RHK/IKI yang dimasukkan pengguna dan tidak mencakup formula resmi IKI.
- Keberhasilan sinkronisasi cloud tergantung koneksi, akun, dan konflik versi; lakukan uji di perangkat iPhone dan MacBook sebelum memakai untuk pekerjaan nyata.
- Notifikasi saat SIPETAK tertutup memerlukan SQL/Worker Push v3.5 aktif dan izin iOS; tidak ada background execution lokal yang dijanjikan.
- Edit sumber yang dihapus lewat jalur tak biasa dapat menghasilkan lifecycle orphan; gunakan menu pemeriksaan konsistensi.
