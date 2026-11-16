# Panduan Setup Serverless Backend & CDN Gratis (Kyounime)

Seluruh kode sinkronisasi latar belakang, cermin cover `.webp`, dan Edge Worker sudah disiapkan di folder `serverless-backend/` ini.
Total biaya: **Rp 0 (Gratis)** menggunakan **GitHub Actions + Cloudflare Pages + Cloudflare Workers**.

---

## Langkah 1: Buat Repository GitHub Baru (Public)
1. Buka [github.com/new](https://github.com/new), buat repository **Public** (misalnya: `kyounime-backend`).
   *(Penting: pilih **Public** supaya kuota GitHub Actions cron 4 jam tidak dibatasi).*
2. Upload **semua isi folder `serverless-backend/`** ke root repository tersebut:
   - `.github/workflows/sync-anime.yml`
   - `scripts/sync-catalog.mjs`
   - `worker/worker.js` & `worker/wrangler.toml`
   - `public/index.html`
   - `package.json`
3. Buka tab **Settings -> Actions -> General -> Workflow permissions**, pilih **Read and write permissions**, lalu klik **Save**.

## Langkah 2: Jalankan Sinkronisasi Pertama di GitHub Actions
1. Buka tab **Actions** di repo GitHub Anda -> klik workflow **Sync Kyounime Catalog & WebP Covers**.
2. Klik **Run workflow** -> tunggu proses pertama (~3-8 menit karena mengunduh & mengompres 2.000+ cover ke `.webp`).
3. Setelah selesai, folder `public/api/` dan `public/covers/*.webp` otomatis tersimpan di repo Anda, dan selanjutnya akan diperbarui otomatis setiap 4 jam sekali!

## Langkah 3: Hubungkan ke Cloudflare Pages (CDN JSON + WebP Gratis)
1. Login ke [dash.cloudflare.com](https://dash.cloudflare.com) -> **Workers & Pages -> Create -> Pages -> Connect to Git**.
2. Pilih repository `kyounime-backend` Anda.
3. Pada **Build settings**:
   - **Framework preset:** `None`
   - **Build command:** *(kosongkan saja)*
   - **Build output directory:** `public`
4. Klik **Save and Deploy**.
5. Anda akan mendapatkan URL CDN gratis, misalnya:
   `https://kyounime-backend.pages.dev`
   Cek di browser: `https://kyounime-backend.pages.dev/api/home.json` harus menampilkan JSON anime!

## Langkah 4: Deploy Cloudflare Worker (Edge Stream Resolver & Domain Adapter)
1. Di dashboard Cloudflare -> **Workers & Pages -> Create -> Create Worker** (beri nama misal `kyounime-worker`).
2. Klik **Deploy**, lalu klik **Edit code**.
3. Copy seluruh isi file `worker/worker.js` dan paste ke editor Cloudflare Worker, lalu klik **Deploy**.
4. Di tab **Settings -> Variables and Secrets** Worker tersebut, tambahkan variable:
   - `CDN_BASE_URL` = `https://kyounime-backend.pages.dev` *(URL Cloudflare Pages dari Langkah 3)*.
5. Catat URL Worker Anda, misalnya:
   `https://kyounime-worker.<subdomain>.workers.dev`

## Langkah 5: Hubungkan ke Aplikasi Android di AI Studio
1. Buka panel **Secrets** di Google AI Studio (sidebar kiri / menu Secrets).
2. Masukkan dua variabel berikut:
   - `KYOUNIME_CDN_BASE_URL` = `https://kyounime-backend.pages.dev`
   - `KYOUNIME_WORKER_BASE_URL` = `https://kyounime-worker.<subdomain>.workers.dev`
3. Build ulang / refresh preview aplikasi Anda.

---

## Catatan Penting Saat Domain Sumber Berubah di Masa Depan
Jika suatu saat domain seperti Sokuja atau Kuronime ganti alamat:
- **TIDAK PERLU update/compile ulang APK.**
- Cukup edit domain di `public/api/config.json` / `scripts/sync-catalog.mjs` di repo GitHub Anda, dan aplikasi seluruh pengguna otomatis memakai domain baru secara langsung.
