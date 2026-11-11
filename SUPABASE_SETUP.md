# Menghubungkan RuangMod ke Supabase

## Konfigurasi yang sudah disiapkan

- `supabase-config.js` berisi Project URL, publishable key, dan nama bucket.
- `supabase-schema.sql` membuat tabel katalog, kebijakan Row Level Security (RLS), bucket unggahan, kebijakan file, dan publikasi Realtime.
- `app.js` membaca katalog bersama, mendukung akun email dan Google OAuth, mengunggah ZIP dan preview, lalu memperbarui katalog lewat Realtime.

Publishable key memang dipakai di browser. Jangan pernah menambahkan `service_role` key, password database, atau secret key ke file frontend.

## Aktifkan backend

1. Buka proyek Supabase `vkbkmajlwtyrcternuzt` di Dashboard.
2. Buka **SQL Editor**, tempel seluruh isi `supabase-schema.sql`, lalu jalankan dengan hak pemilik proyek.
3. Di **Authentication → Providers**, aktifkan provider **Email**. Atur URL redirect situs publik dan alamat redirect konfirmasi email sesuai domain hosting.
4. Untuk login Google, siapkan OAuth client pada Google Cloud Console. Masukkan domain situs sebagai **Authorized JavaScript origin** dan callback `https://vkbkmajlwtyrcternuzt.supabase.co/auth/v1/callback` sebagai **Authorized redirect URI**. Masukkan OAuth Client ID dan Client Secret di **Supabase → Authentication → Providers → Google**. Simpan Client Secret hanya di Dashboard Supabase, jangan di file situs.
5. Di **Authentication → URL Configuration**, isi **Site URL** dengan URL HTTPS situs yang akan diterbitkan dan tambahkan URL preview/development yang benar ke **Redirect URLs**.
6. Untuk deploy di Vercel, hubungkan repository GitHub ke Vercel dan gunakan **Framework Preset: Other**, root proyek saat ini, tanpa build command dan tanpa output directory terpisah. `index.html` berada di root dan `vercel.json` mengatur header keamanan.
7. Workflow `.github/workflows/deploy-vercel.yml` dapat melakukan deploy produksi otomatis setiap kali perubahan di-push ke branch `main`. Di GitHub buka **Settings → Secrets and variables → Actions** dan tambahkan:
   - Repository variable `VERCEL_ORG_ID`: ID team/account dari pengaturan project Vercel.
   - Repository variable `VERCEL_PROJECT_ID`: ID project dari pengaturan project Vercel.
   - Repository secret `VERCEL_TOKEN`: token Vercel yang dibuat di akun pemilik.
   Jangan masukkan token tersebut ke source code. Setelah commit dan push pertama, periksa hasilnya di tab **Actions** GitHub.
8. Di Supabase **Authentication → URL Configuration**, tambahkan URL produksi dan URL preview Vercel yang diperlukan ke **Redirect URLs**. Perbarui juga **Site URL** ke domain produksi.
9. Untuk uji lokal, layani folder ini dari web server lokal; jangan membuka `index.html` sebagai `file://`. Situs publik harus menggunakan HTTPS.
10. Perubahan data mod melalui aplikasi langsung tersimpan di Supabase dan katalog memperbarui pengunjung lain lewat Realtime. Perubahan kode situs diterbitkan oleh workflow Vercel setelah push. Perubahan struktur database Supabase tidak diterapkan otomatis oleh workflow deploy situs; jalankan SQL/migrasi database secara terpisah setelah ditinjau.

## Alur perubahan dari VS Code

1. Edit dan simpan file di VS Code.
2. Buka **Source Control**, stage file yang diubah, lalu buat commit.
3. Push commit ke branch `main`.
4. GitHub Actions menjalankan deploy ke Vercel. Setelah status job berhasil, muat ulang situs publik untuk melihat versi baru.

Menyimpan file lokal saja tidak menerbitkan perubahan ke internet. Deployment pada setiap save tidak digunakan agar perubahan belum selesai atau salah tidak langsung dipublikasikan.

## Batas dan perilaku

- Bucket `ruangmod-mods` bersifat publik untuk unduhan; hanya pengguna terautentikasi yang dapat mengunggah ke folder UUID miliknya sendiri.
- Batas arsip adalah 100 MiB. Sesuaikan batas ini di SQL dan `app.js` hanya bila paket dan kuota proyek memang mendukungnya.
- Daftar katalog diperbarui melalui Supabase Realtime; polling berkala menjadi cadangan saat halaman aktif.
- Unggahan langsung dipublikasikan setelah metadata tersimpan. Tidak ada moderasi maupun pemindaian malware server-side. File executable tetap berisiko walaupun situs hanya mengemasnya ke ZIP.
- Kunci publishable tidak memberi hak admin; akses dikendalikan oleh RLS. Jangan menonaktifkan kebijakan RLS untuk mengatasi error.

## Jika gagal tersambung

Periksa apakah SQL sukses dijalankan, tabel `public.mods` tersedia, publikasi Realtime aktif, provider Email diaktifkan, dan URL/key di `supabase-config.js` sesuai proyek. Error izin biasanya berarti kebijakan RLS atau kebijakan Storage belum terpasang.
