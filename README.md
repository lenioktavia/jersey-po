# Jersey PO

Website manajemen pesanan jersey berbasis HTML/CSS/JavaScript + Supabase.

## Fitur

- Dashboard statistik.
- CRUD Produk dengan foto Supabase Storage.
- CRUD Pesanan.
- Nomor order otomatis dari database, format `PO-YYYYMMDD-001`.
- Pilih produk dari dropdown.
- Foto dan link desain produk tampil saat produk dipilih.
- Link desain dan resi Google Drive.
- Filter dan pencarian pesanan.
- Pesanan terlambat dihitung otomatis: deadline lewat + status bukan `Selesai`.
- Responsive HP/tablet/laptop.
- Supabase Auth + Row Level Security.

## 1. Buat project Supabase

Buat project baru dengan nama **jersey-order** di Supabase.

## 2. Jalankan SQL

Buka **SQL Editor** di Supabase, lalu copy seluruh isi file `supabase.sql` dari project ini. Jalankan sekali.

SQL tersebut membuat tabel, trigger nomor order, index, RLS, dan bucket Storage.

## 3. Buat akun login

Setelah SQL selesai:

1. Buka **Authentication → Users**.
2. Pilih **Add user / Create user**.
3. Masukkan email dan password yang akan dipakai login ke Jersey PO.
4. Pastikan email/password authentication aktif.

Website menggunakan login Supabase Auth supaya tabel database tidak terbuka untuk publik.

## 4. Isi konfigurasi frontend

Buka:

`js/supabase.js`

Isi:

```javascript
const SUPABASE_URL = "https://PROJECT-ID.supabase.co";
const SUPABASE_ANON_KEY = "PASTE_ANON_OR_PUBLISHABLE_KEY";
```

Nilai bisa diambil dari **Supabase → Project Settings → API**.

**JANGAN memasukkan `service_role` key ke file frontend.**

## 5. Tes lokal

Karena browser dapat membatasi module/file tertentu, paling aman jalankan static server.

Jika punya Python:

```bash
python -m http.server 5500
```

Lalu buka:

`http://localhost:5500`

Atau gunakan VS Code + Live Server.

## 6. Upload ke GitHub

Buat repository:

`jersey-po`

Lalu:

```bash
git init
git add .
git commit -m "Initial Jersey PO"
git branch -M main
git remote add origin https://github.com/USERNAME/jersey-po.git
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub Anda.

## 7. Deploy gratis dengan GitHub Pages

1. Buka repository `jersey-po`.
2. Masuk **Settings → Pages**.
3. Pada **Build and deployment**, pilih **Deploy from a branch**.
4. Branch: `main`.
5. Folder: `/ (root)`.
6. Save.
7. Tunggu proses deploy.
8. URL biasanya:
   `https://USERNAME.github.io/jersey-po/`

## 8. Alternatif Cloudflare Pages

Buat project Pages baru dan hubungkan repository GitHub `jersey-po`.

Untuk project ini tidak perlu build command karena merupakan static website.

Output directory/root gunakan folder repository.

## 9. Update website

Setelah mengubah kode:

```bash
git add .
git commit -m "Update Jersey PO"
git push
```

GitHub Pages akan memperbarui website otomatis.

## Catatan database

- `orders.product_id` adalah foreign key ke `products.id`.
- `order_number` dibuat otomatis oleh trigger database sehingga lebih aman terhadap duplikat.
- `design_url` pada pesanan adalah snapshot/editable URL untuk pesanan tersebut. Saat pesanan baru dibuat, URL produk otomatis diisikan jika tersedia.
- Foto produk disimpan di Storage bucket `product-images`, sedangkan database hanya menyimpan URL/path.
- Bucket foto bersifat public-read agar gambar dapat ditampilkan langsung di website; upload/update/delete tetap dibatasi untuk user yang sudah login.
