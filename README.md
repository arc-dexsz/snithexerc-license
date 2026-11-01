# Panxcz License Server

Panel manajemen license key dan custom endpoint berbasis Next.js 14 App Router. Proyek ini dapat dijalankan secara lokal dan di-deploy ke Vercel.

## Fitur

- Generate, validasi, revoke, dan reset device binding license key
- Manajemen server dan custom endpoint
- Dashboard statistik dan riwayat koneksi
- Admin panel dengan JWT session
- Bearer token untuk endpoint API yang membutuhkan otorisasi
- Rate limiting tersimpan di database agar tidak reset saat instance Vercel berganti
- Database lokal SQLite untuk development dan Turso/libSQL untuk production

## Menjalankan secara lokal

Persyaratan: Node.js 18+ dan npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Buka `http://localhost:3000`.

Untuk local development, isi `.env.local` dengan kredensial sendiri. Bila `TURSO_DATABASE_URL` tidak diisi, aplikasi memakai SQLite di `./data/app.db`.

## Deploy ke Vercel

**Production wajib memakai database remote.** Vercel menjalankan aplikasi sebagai serverless functions; file SQLite lokal tidak digunakan sebagai penyimpanan permanen. Proyek ini menggunakan Turso/libSQL melalui package `@libsql/client`.

### 1. Siapkan database Turso

Buat akun di [Turso](https://turso.tech/), lalu buat database baru. Dengan Turso CLI, langkah umumnya:

```bash
turso auth login
turso db create panxcz-license-server
turso db show panxcz-license-server --url
turso db tokens create panxcz-license-server
```

Simpan URL database dan token yang dihasilkan. Jangan masukkan token ke source code atau commit ke Git.

### 2. Push proyek ke GitHub

Upload isi folder proyek ini ke repository GitHub. Pastikan `package.json` berada di root repository (atau atur Root Directory proyek Vercel ke folder ini).

### 3. Import ke Vercel

1. Buka [Vercel Dashboard](https://vercel.com/dashboard) dan pilih **Add New → Project**.
2. Import repository GitHub.
3. Framework Preset akan terdeteksi sebagai **Next.js**.
4. Build Command gunakan default `next build` (atau `npm run build`).
5. Output Directory biarkan default.

### 4. Tambahkan Environment Variables

Di Vercel: **Project → Settings → Environment Variables**. Tambahkan variabel berikut untuk Production (dan Preview bila diperlukan):

| Name | Required | Value |
|---|---:|---|
| `TURSO_DATABASE_URL` | Ya | URL dari `turso db show ... --url` |
| `TURSO_AUTH_TOKEN` | Ya | Token dari `turso db tokens create ...` |
| `ADMIN_USER` | Disarankan | Username admin awal |
| `ADMIN_PASS` | Ya | Password admin awal yang panjang dan unik |
| `API_TOKEN` | Opsional | Bearer token API; dibuat acak dan disimpan di database jika kosong |
| `SESSION_SECRET` | Opsional | Secret JWT; dibuat acak dan disimpan di database jika kosong |

Jangan beri prefix `NEXT_PUBLIC_` pada variabel rahasia tersebut.

**Catatan akun awal:** `ADMIN_USER` dan hash `ADMIN_PASS` hanya di-seed ketika tabel settings pertama kali dibuat. Mengubah Environment Variables setelah database sudah terinisialisasi tidak otomatis mengganti akun yang tersimpan. Username dan API token dapat dikelola dari halaman Settings setelah login. Gunakan database baru atau ubah data settings secara terkontrol bila perlu mengganti kredensial awal.

### 5. Deploy

Klik **Deploy**. Setelah deployment berhasil, buka URL Vercel. Halaman utama akan mengarahkan ke `/admin`.

Saat request pertama masuk, aplikasi akan membuat tabel yang diperlukan dan menambahkan default server. Database harus sudah terhubung sebelum mengakses aplikasi.

## Environment variables

| Variable | Keterangan |
|---|---|
| `DATABASE_PATH` | Path SQLite lokal; hanya untuk development |
| `TURSO_DATABASE_URL` | URL database Turso/libSQL untuk production |
| `TURSO_AUTH_TOKEN` | Token akses database Turso |
| `ADMIN_USER` | Username admin awal; default lokal `admin` |
| `ADMIN_PASS` | Password admin awal; default lokal `admin123`, wajib di production |
| `API_TOKEN` | Token Bearer API; bila kosong dibuat acak saat database pertama dibuat |
| `SESSION_SECRET` | Secret tanda tangan JWT; bila kosong dibuat acak saat database pertama dibuat |

Jangan commit `.env`, `.env.local`, atau token database ke repository.

## API utama

### Public

| Method | Endpoint | Keterangan |
|---|---|---|
| GET/POST | `/api/connect` | Validasi license key dan device binding |
| GET | `/api/servers` | Daftar server |
| GET | `/api/stats` | Statistik dashboard |

### Memerlukan Bearer token

Kirim header `Authorization: Bearer <API_TOKEN>`.

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/keys/generate` | Membuat license key |
| POST | `/api/keys/revoke` | Revoke license key |
| POST | `/api/keys/reset-device` | Reset device binding |
| GET | `/api/keys/check?key=...` | Memeriksa status key |
| POST | `/api/servers` | Membuat server |
| POST | `/api/endpoints` | Membuat custom endpoint |

Custom endpoint yang aktif dapat diakses melalui `/api/{path}` sesuai konfigurasi di tabel `custom_endpoints`.

## Pemeriksaan lokal sebelum deploy

```bash
npm ci
npm run build
```

Jika `npm run build` berhasil, push perubahan ke GitHub dan Vercel akan menjalankan build yang sama saat deployment.
