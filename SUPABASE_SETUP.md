# Menghubungkan RuangMod ke Supabase

## Konfigurasi yang sudah disiapkan

- `supabase-config.js` berisi Project URL, publishable key, dan nama bucket.
- `supabase-schema.sql` membuat tabel katalog, ringkasan jumlah mod per kategori yang dianalisis Supabase Cron setiap 30 menit, batas integritas metadata dan jalur file, indeks katalog, kebijakan Row Level Security (RLS), bucket unggahan, kebijakan file, dan publikasi Realtime. Kolom `is_published` memungkinkan mod disembunyikan tanpa menghapus metadata atau file.
- `app.js` menggunakan `public.mods` sebagai satu-satunya sumber data katalog (tanpa localStorage atau data contoh), memuat hasil secara bertahap agar melampaui batas baris API, mendukung akun email untuk kontribusi dan Google OAuth untuk unduhan, mengunggah ZIP dan preview, lalu memperbarui daftar lewat Realtime, polling, dan saat tab kembali aktif.

Publishable key memang dipakai di browser. Jangan pernah menambahkan `service_role` key, password database, atau secret key ke file frontend.

## Aktifkan backend

1. Buka proyek Supabase `vkbkmajlwtyrcternuzt` di Dashboard.
2. Buka **SQL Editor**, tempel seluruh isi `supabase-schema.sql`, lalu jalankan dengan hak pemilik proyek. Skrip dapat dijalankan ulang; saat diterapkan ke tabel yang sudah berisi data, periksa error constraint/indeks dan bereskan data lama yang tidak sesuai sebelum mencoba ulang. Skrip membuat bucket arsip menjadi privat, jadi terapkan sebelum deploy frontend yang mensyaratkan Google untuk unduhan.
3. Di **Authentication → Providers**, aktifkan provider **Email**. Atur URL redirect situs publik dan alamat redirect konfirmasi email sesuai domain hosting.
4. Login Google diwajibkan untuk mengunduh arsip. Siapkan OAuth client pada Google Cloud Console. Masukkan domain situs sebagai **Authorized JavaScript origin** dan callback `https://vkbkmajlwtyrcternuzt.supabase.co/auth/v1/callback` sebagai **Authorized redirect URI**. Masukkan OAuth Client ID dan Client Secret di **Supabase → Authentication → Providers → Google**. Simpan Client Secret hanya di Dashboard Supabase, jangan di file situs.
5. Di **Authentication → URL Configuration**, isi **Site URL** dengan URL HTTPS situs yang akan diterbitkan dan tambahkan URL preview/development yang benar ke **Redirect URLs**.
6. Untuk deploy di Vercel, hubungkan repository GitHub ke Vercel dan gunakan **Framework Preset: Other**, root proyek saat ini, tanpa build command dan tanpa output directory terpisah. `index.html` berada di root dan `vercel.json` mengatur header keamanan.
7. Workflow `.github/workflows/deploy-vercel.yml` dapat melakukan deploy produksi otomatis setiap kali perubahan di-push ke branch `main`. Di GitHub buka **Settings → Secrets and variables → Actions** dan tambahkan:
   - Repository variable `VERCEL_ORG_ID`: ID team/account dari pengaturan project Vercel.
   - Repository variable `VERCEL_PROJECT_ID`: ID project dari pengaturan project Vercel.
   - Repository secret `VERCEL_TOKEN`: token Vercel yang dibuat di akun pemilik.
   Jangan masukkan token tersebut ke source code. Setelah commit dan push pertama, periksa hasilnya di tab **Actions** GitHub.
8. Di Supabase **Authentication → URL Configuration**, tambahkan URL produksi dan URL preview Vercel yang diperlukan ke **Redirect URLs**. Perbarui juga **Site URL** ke domain produksi.
9. Untuk uji lokal, layani folder ini dari web server lokal; jangan membuka `index.html` sebagai `file://`. Situs publik harus menggunakan HTTPS.
10. Setelah pengguna menekan **Simpan & tambahkan ke katalog**, aplikasi mengunggah ZIP/preview ke Supabase Storage dan menyimpan metadata ke `public.mods`; pengguna tidak perlu menulis SQL untuk setiap mod. Setelah berhasil, mod muncul pada kartu kategori yang sesuai saat kartu itu dibuka. Realtime memperbarui halaman yang sedang terbuka, dengan polling sebagai cadangan. SQL Editor hanya diperlukan untuk menyiapkan atau mengubah struktur/kebijakan database. Perubahan struktur database Supabase tidak diterapkan otomatis oleh workflow deploy situs; jalankan SQL/migrasi database secara terpisah setelah ditinjau.

## Alur perubahan dari VS Code

1. Edit dan simpan file di VS Code.
2. Buka **Source Control**, stage file yang diubah, lalu buat commit.
3. Push commit ke branch `main`.
4. GitHub Actions menjalankan deploy ke Vercel. Setelah status job berhasil, muat ulang situs publik untuk melihat versi baru.

Menyimpan file lokal saja tidak menerbitkan perubahan ke internet. Deployment pada setiap save tidak digunakan agar perubahan belum selesai atau salah tidak langsung dipublikasikan.

## Batas dan perilaku

- Bucket `ruangmod-mods` bersifat privat. Arsip ZIP untuk mod yang dipublikasikan hanya dapat dibaca oleh sesi Google OAuth dengan provider Google di metadata JWT yang diverifikasi RLS di Storage; login email RuangMod tidak cukup untuk mengunduh. Preview gambar dapat dibaca publik menggunakan signed URL sementara. Pengguna terautentikasi dapat mengunggah ke folder UUID miliknya sendiri.
- Database memvalidasi kategori, ukuran, checksum, metadata non-kosong, dan jalur ZIP/preview yang terikat ke pemilik serta ID mod; indeksnya mengikuti urutan katalog (`created_at`, lalu `id`). Pengguna tidak dapat menghapus metadata mod langsung dari API karena penghapusan metadata tanpa file akan meninggalkan unduhan publik yatim; unggahan yang gagal tetap dibersihkan melalui kebijakan hapus Storage milik pengguna.
- Mod Farmland disembunyikan dari katalog publik dengan `is_published = false`; metadata dan file ZIP tetap tersimpan.
- Mod Benson dalam kategori Vehicles juga disembunyikan dengan `is_published = false`; metadata dan file ZIP tetap tersimpan, dan jumlah kategori diperbarui oleh trigger.
- Setelah SQL diterapkan, tautan publik lama ke ZIP tidak lagi berfungsi. Pengunjung perlu login Google, lalu menekan tombol unduh lagi setelah kembali ke situs. File yang sudah diunduh sebelumnya atau salinan yang dibagikan di luar situs tidak dapat ditarik kembali.
- Batas arsip adalah 100 MiB. Sesuaikan batas ini di SQL dan `app.js` hanya bila paket dan kuota proyek memang mendukungnya.
- Daftar katalog diperbarui melalui Supabase Realtime; polling berkala menjadi cadangan saat halaman aktif.
- Jumlah pada kartu kategori berasal dari `public.mod_category_counts`. Trigger database memperbarui hitungan langsung saat mod dipublikasikan, diubah kategori/status publikasinya, atau dihapus; `pg_cron` menjalankan rekonsiliasi lengkap setiap 30 menit. Perubahan langsung tampil melalui Realtime, dengan pembacaan ulang berkala sebagai cadangan.
- Setelah pengguna menekan tombol simpan dan unggahan berhasil, mod langsung dipublikasikan setelah metadata tersimpan. Tidak ada moderasi maupun pemindaian malware server-side. File executable tetap berisiko walaupun situs hanya mengemasnya ke ZIP.
- Kunci publishable tidak memberi hak admin; akses dikendalikan oleh RLS. Jangan menonaktifkan kebijakan RLS untuk mengatasi error.

## Jika gagal tersambung

Jika muncul error `PGRST205` atau `Could not find the table 'public.mods' in the schema cache`, database proyek belum memiliki tabel katalog. Buka **Supabase Dashboard → SQL Editor**, jalankan seluruh isi `supabase-schema.sql` menggunakan akun pemilik proyek, pastikan query berhasil tanpa error, lalu muat ulang situs. Publishable key di browser tidak memiliki hak membuat tabel, sehingga frontend tidak dapat memperbaiki schema secara otomatis.

Jika tabel sudah ada, periksa apakah SQL sukses dijalankan, publikasi Realtime aktif, provider Email diaktifkan, dan URL/key di `supabase-config.js` sesuai proyek. Error izin biasanya berarti grant RLS atau kebijakan Storage belum terpasang.
