# Design: JagoanGadget-be → Starter Backend Template

Tanggal: 2026-08-08
Status: Draft untuk review

## Ringkasan

Ubah repo `JagoanGadget-be` (backend NestJS "Gadgetin") menjadi **starter template** yang bisa dipakai ulang. Projek lain tinggal clone dari GitHub template, jalankan `pnpm init-project <nama>`, dan langsung punya backend dengan auth + RBAC + storage + uploads + monitoring (Prometheus + Grafana) + dokumentasi API yang berfungsi.

## Tujuan & Non-Tujuan

### Tujuan
- Repo layak jadi GitHub template ("Use this template").
- Script `init-project` mengganti identitas projek dengan cepat & konsisten.
- Template berisi full fitur yang sudah berjalan: auth (Better Auth), RBAC (menus/permissions/roles), users, storage local, uploads presigned, dokumentasi API (Swagger/Scalar), seed superadmin, logging pino, Redis permission cache.
- Tambah fitur monitoring: Prometheus + Grafana (library sudah terinstall), mengikuti best practice BE senior.
- Dokumen README jelas, bahasa Inggris, untuk developer berpengalaman.

### Non-Tujuan (sesuai instruksi: JANGAN ubah kode berjalan)
- Tidak ada perubahan logika pada module yang sudah ada: `src/modules/*`, `src/common/*`, `src/lib/auth.ts`, `src/database/*`, seed service, redis.
- Redis tetap **wajib** (tanpa fallback in-memory). Tidak menambah driver cache alternatif.
- Metrics bersifat **additive**: module baru `src/modules/metrics/` + config infra, tanpa mengubah logika module existing (kecuali satu baris ignore di pino logging — lihat Section 6).
- Tidak ada pengurangan fitur.
- Tanpa Dockerfile / BE di-container. Strategi: compose **infra saja**, BE jalan di host.

## Keputusan Kunci

| Topik | Keputusan |
|-------|-----------|
| Mekanisme distribusi | GitHub template + script `init-project` |
| Scope fitur bawaan | Full, semua yang ada sekarang |
| Scope script init | Rename identitas saja (tanpa hapus module, tanpa DB setup) |
| Target konsumen | Developer berpengalaman; README English ringkas |
| Status repo | Murni template — branding bebas dinetralkan |
| Typo config | DIPERBOLEHKAN dibersihkan: `cofiguration.ts` → `configuration.ts` (satu-satunya perubahan kode pada file existing) |
| Redis | Tetap wajib, tanpa fallback |
| Docker strategy | Compose **infra saja** (postgres, redis, prometheus, grafana); BE jalan di host via pnpm |
| Monitoring | Prometheus + Grafana, library `@willsoto/nestjs-prometheus` v6 (sudah terinstall) |
| Endpoint metrics | **Open**, env toggle `METRICS_ENABLED`; path `/metrics` (di luar prefix `/api`) |
| Kredit | Footer halaman + README: "Rangga Prathama", `ranggaprathama9@gmail.com` |
| Bahasa README | Inggris |

## Perubahan yang Direncanakan

### 1. Branding & Hygiene

File yang disentuh hanya branding/konfigurasi (default string), bukan logika:

| File | Sekarang | Jadi |
|------|----------|------|
| `package.json` `name` | `nest-typescript-starter` | `my-starter-project` (default; script ganti per-projek) |
| `package.json` `description` | `Nest TypeScript starter repository` | `NestJS + PostgreSQL + Better Auth + RBAC backend starter` |
| `package.json` `version` | `1.0.0` | `0.1.0` |
| `.env.example` `APP_NAME` | `Gadgetin API` | `NestJS API` (lihat Q2) |
| `.env.example` `DATABASE_NAME` | `gadgetin` | `app_db` |
| `.env.example` `SEED_SUPERADMIN_EMAIL` | `superadmin@jagoangadget.local` | `superadmin@localhost` |
| `.env.example` `REDIS_KEY_PREFIX` | `gadgetin:rbac` | `app:rbac` |
| `views/index.hbs` hero-desc | "Backend engine for **Gadgetin**" | "Backend engine for **your project**" |
| `views/main.hbs` meta-description | "Gadgetin e-commerce platform" | "NestJS backend starter" |
| `views/main.hbs` footer | "Built by Rangga Prathama" | **Tetap** "Built by Rangga Prathama" |
| `src/config/cofiguration.ts` defaults (app.name, db.name, redis.keyPrefix) | `'Gadgetin API'`, `'gadgetin'`, `'gadgetin:rbac'` | `'NestJS API'`, `'app_db'`, `'app:rbac'` |
| `src/config/env.validation.ts` defaults (APP_NAME, REDIS_KEY_PREFIX) | `'Gadgetin API'`, `'gadgetin:rbac'` | `'NestJS API'`, `'app:rbac'` |
| `src/docs/api-documentation.ts` | `setTitle('Gadgetin API')`, desc "Gadgetin e-commerce platform" | Title + desc dinamis dari `ConfigService.get('app.name')`; hapus hardcode Gadgetin |

**Catatan:** perubahan `env.validation.ts` dan `cofiguration.ts` hanya **nilai default string** — tidak mengubah skema/logika.

**TIDAK diganti:** `docs/uploads.md` (sudah netral), `public/` (favicon/asset netral).

### 2. Fix Typo Config (satu-satunya perubahan kode pada file existing)

- Rename `src/config/cofiguration.ts` → `src/config/configuration.ts`.
- Update import di `src/app.module.ts` dan `src/main.ts` (`from './config/cofiguration'` → `'./config/configuration'`).
- Update `CLAUDE.md` & `AGENTS.md` "Known Issues" — hapus baris typo yang sudah fix.

### 3. Script `init-project`

**Lokasi:** `scripts/init-project.mjs`, npm script `init-project`.

**Cara pakai:** `pnpm init-project <nama-projek>` — nama wajib `kebab-case`, divalidasi (tolak karakter illegal / kosong).

**Yang diganti** (contoh dengan input `my-app`):

| Tempat | Placeholder → |
|--------|----------------|
| `package.json` `name` | `my-starter-project` → `my-app` |
| `package.json` `description` | → `my-app API — NestJS + PostgreSQL + Better Auth + RBAC backend` |
| `.env.example` `APP_NAME` | `NestJS API` → `My App API` (Title Case) |
| `.env.example` `DATABASE_NAME` | `app_db` → `my_app` (snake_case) |
| `.env.example` `SEED_SUPERADMIN_EMAIL` | `superadmin@localhost` → `superadmin@my_app.local` |
| `.env.example` `REDIS_KEY_PREFIX` | `app:rbac` → `my_app:rbac` |
| `views/*.hbs` | teks netral → nama projek |
| `src/config/configuration.ts` + `env.validation.ts` default `NestJS API` | → `${Title} API` |

**Replace `views/*.hbs`:** target string eksplisit — `index.hbs` hero-desc "Backend engine for your project" → "Backend engine for ${Title}", `main.hbs` meta-description "NestJS backend starter" → "${Title} backend". Nama projek tetap dikontrol `{{appName}}` dari config, jadi teks hero cukup satu string yang diganti.

**TIDAK disentuh script:** `src/modules/*`, `docs/`, `public/`, lockfile (`package-lock.json`/`pnpm-lock.yaml` — regenerasi sendiri saat `pnpm install` pertama di projek baru).

**README tidak diganti script** — README memakai placeholder `<project-name>` dan **tidak pernah hardcode** `my-starter-project`, sehingga grep verifikasi tetap bersih.

**Error handling:** argumen kosong/format salah → exit kode non-nol + pesan jelas; file target tidak ditemukan → abort + daftar file; idempotent (aman dijalankan ulang).

**Output:** pesan sukses + langkah berikutnya: `cp .env.example .env`, `pnpm install`, `docker compose up -d`, `pnpm run migration:run`, `pnpm run seed`, `pnpm run start:dev`.

### 4. Dokumentasi

**`README.md`** — rewrite total, **bahasa Inggris**:
- Intro: NestJS backend starter — auth (Better Auth), RBAC, storage, uploads, Redis cache, monitoring (Prometheus + Grafana), Swagger/Scalar.
- Fitur utama + tech stack.
- Quickstart: clone → `pnpm init-project <nama>` → `cp .env.example .env` → `docker compose up -d` (infra: postgres, redis, prometheus, grafana) → `pnpm install` → `pnpm run migration:run` → `pnpm run seed` → `pnpm run start:dev`.
- Monitoring: endpoint `/metrics`, Grafana `http://localhost:3001`, Prometheus `http://localhost:9090`, env `METRICS_ENABLED`.
- Perintah lengkap (build/test/lint/migration), struktur projek, env vars.
- Kredit: **Rangga Prathama** — `ranggaprathama9@gmail.com`.

**`AGENTS.md` / `CLAUDE.md`** — update ringan (tetap bahasa Indonesia, dokumen dev internal):
- Hapus "Known Issues" yang sudah fix (typo config, README default).
- Netralkan referensi Gadgetin di deskripsi.
- Tambah module `metrics` ke daftar module yang sudah ada.

### 5. Infra & Testing (docker-compose)

**`docker-compose.yaml`** (sekarang kosong, 0 byte) — isi dengan **4 service infra saja** (tanpa BE):

| Service | Image | Port | Catatan |
|---------|-------|------|---------|
| `postgres` | postgres:16 | 5432 | env postgres/postgres, named volume, healthcheck |
| `redis` | redis:7 | 6379 | healthcheck |
| `prometheus` | prom/prometheus | 9090 | mount `prometheus/prometheus.yml` + volume data |
| `grafana` | grafana/grafana | 3001:3000 | provisioning mount, default creds admin/admin (warning di README) |

- Semua service `restart: unless-stopped`.
- Detail prometheus/grafana config di Section 6.

**`pnpm-workspace.yaml`** — sinkronkan dengan pnpm 11:
- `pnpm.onlyBuiltDependencies` di `package.json` sudah tidak dibaca pnpm 11. Pindahkan/satukan dengan `allowBuilds` yang sudah ada di `pnpm-workspace.yaml`. (Config-only, tanpa sentuh kode.)

**Test stale** — `app.controller.spec.ts` masih referensi `AppService` (kelas sudah dihapus di working tree):
- **FLAG UNTUK REVIEW USER:** file test ini di template pasti gagal (`pnpm test`). Usulan: hapus test yang stale, atau tulis ulang untuk `getHome()` yang benar. Ini bukan kode berjalan — test file — tapi tetap penyimpangan dari aturan "jangan ubah". Perlu persetujuan.

### 6. Monitoring (Prometheus + Grafana) — FITUR BARU

**Library:** `@willsoto/nestjs-prometheus@6.1.0` + `prom-client@15.1.3` (sudah terinstall di package.json, **belum dipakai**).

**Arsitektur:**
- BE jalan di **host** (port 3000), ekspos endpoint metrics.
- Prometheus (container) scrape `host.docker.internal:3000/metrics` — dari container ke BE host.
- Grafana (container) visualisasi dari datasource Prometheus.
- Endpoint `/metrics` **di luar prefix `/api`**: library `@willsoto/nestjs-prometheus` v6 memasang path via metadata pada controller, yang **melewati** `setGlobalPrefix('api')`. Verifikasi saat implementasi.

**Code (additive, module baru `src/modules/metrics/`):**
- `metrics.module.ts`:
  - `PrometheusModule.register({ defaultMetrics: { enabled: true }, path: '/metrics' })` — aktifkan `collectDefaultMetrics` (process_cpu, nodejs_heap, event_loop_lag, dll).
  - Daftarkan provider metric + `APP_INTERCEPTOR` global (metrics interceptor).
  - Module di-import **kondisional** di `app.module.ts` saat `METRICS_ENABLED=true`.
- `metrics.providers.ts` — metric custom:
  - `http_requests_total` — counter (label: method, route, status).
  - `http_request_duration_seconds` — histogram (label: method, route), buckets `[0.01, 0.05, 0.1, 0.3, 0.5, 1, 2.5, 5, 10]`.
  - `http_errors_total` — counter (label: method, route, status) untuk status >=400.
- `metrics.interceptor.ts` — catat status + durasi per request; diberi `@AllowAnonymous()` agar metrics tak butuh auth.
- `src/app.module.ts`: import `MetricsModule` kondisional; **satu baris** tambah `/metrics` ke `autoLogging.ignore` pino (biar log tak penuh scrape Prometheus). Ini-satunya perubahan pada file existing selain rename config.

**Env (`.env.example` + `env.validation.ts`, additive & optional):**
- `METRICS_ENABLED` — bool, Joi default `false`, `.env.example` set `true`.
- `METRICS_PORT` — opsional, default 3000 (port app).

**Infra config files:**
- `prometheus/prometheus.yml`:
  ```yaml
  scrape_configs:
    - job_name: 'nestjs-be'
      scrape_interval: 15s
      metrics_path: /metrics
      static_configs:
        - targets: ['host.docker.internal:3000']
  ```
- `grafana/provisioning/datasources/prometheus.yml` — auto-register datasource `Prometheus` (`http://prometheus:9090`).
- `grafana/provisioning/dashboards/dashboard.yml` + `grafana/dashboards/nestjs-overview.json` — auto-load dashboard berisi: request rate, error rate (5xx), latency p50/p95/p99, active request, nodejs heap usage, event loop lag.
- Grafana **tanpa env creds** di compose — biarkan default Grafana (`admin`/`admin`), tidak redundan diset eksplisit. Dokumentasikan di README: wajib ganti di produksi (bisa via env `GF_SECURITY_ADMIN_PASSWORD` atau UI).

**Akses:** Grafana `http://localhost:3001`, Prometheus `http://localhost:9090`, metrics `http://localhost:3000/metrics`.

**Non-goal:** alerting (Alertmanager) di luar scope — cukup ekspos + visualisasi untuk template.

**Smoke test tambahan:** dengan `METRICS_ENABLED=true`, `curl localhost:3000/metrics` mengembalikan metric; Grafana load dashboard dari datasource Prometheus.

## Risiko & Catatan

- **GitHub template aktif** ("Use this template") tidak bisa di-set dari dalam repo — dilakukan manual di GitHub UI oleh user setelah commit.
- **Dirty working tree besar** (banyak file untracked/modified): perlu commit baseline yang rapi dulu supaya template yang di-clone lengkap. Ini prasyarat smoke test.
- **pnpm 11** butuh konfigurasi build yang benar (`allowBuilds`/`onlyBuiltDependencies`) — @swc/core saat ini disable build; verifikasi `pnpm run build` jalan.
- **`host.docker.internal`** hanya jalan di Docker Desktop (Windows/Mac). Di Linux butuh `--add-host=host.docker.internal:host-gateway` pada prometheus service (tulis di compose sebagai comment).
- **`/metrics` open** — cocok untuk template/dev. Untuk produksi, dokumentasikan opsi basic auth di README (di luar scope implementasi).
- **Grafana admin/admin** default — dokumentasikan di README bahwa wajib diganti di produksi.
- **Library `/metrics` bypass prefix** — endpoint jadi `/metrics` bukan `/api/metrics`. Ini sesuai best practice (metrics di root), tapi pastikan scrape config cocok.

## Ruang Lingkup Implementasi

Perubahan satu paket terfokus: branding + typo fix + script init + docs + infra (docker-compose) + metrics module. Cocok untuk satu implementation plan. Tidak perlu decomposisi.

## Keputusan Final (hasil review user)

1. **`app.controller.spec.ts`** — **TULIS ULANG** agar test `getHome()` benar (tanpa `AppService`), `pnpm test` hijau.
2. **`.env.example` `APP_NAME`** — default **`NestJS API`** (langsung jalan tanpa init-project).
3. **`pnpm-workspace.yaml`** — **PINDAHKAN** `onlyBuiltDependencies` dari package.json ke `pnpm-workspace.yaml`, gabung dengan `allowBuilds`.
4. **Grafana creds** — **OPSI 2**: biarkan default Grafana `admin/admin`, tanpa env creds di compose. Warning ganti di produksi di README.
