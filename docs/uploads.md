# Upload File — Presigned URL (Panduan Frontend)

Sistem upload memakai **presigned URL** (signed URL). Frontend **tidak** mengirim multipart/form-data. Alurnya **3 langkah**:

1. **Minta URL** → `POST /api/uploads/presign` (perlu login) → dapat `uploadUrl`.
2. **Kirim file** → `PUT {uploadUrl}` dengan **raw bytes** file → dapat `tempKey`.
3. **Commit** → panggil endpoint fitur (mis. update-profile) dengan `tempKey` → file dipindah ke lokasi final, URL tersimpan di DB.

File yang sudah di-`PUT` **belum** benar-benar tersimpan sebagai data user. Hanya setelah **commit** (`avatarTempKey` diterima endpoint fitur) file jadi final.

---

## Struktur Folder

File disimpan di bawah root storage (`STORAGE_LOCAL_PATH`, default `./storage`), dibagi 3 area sibling:

```
storage/
├── public/    # file final akses publik   — diserve GET /api/storage/public/*
├── private/   # file final akses privat   — diserve GET /api/storage/private/*
└── temp/      # staging upload            — TIDAK PERNAH diserve, auto-hapus oleh sweep (TTL default 24 jam)
```

**Aturan:**
- **`temp/` tidak pernah diserve.** Tidak ada route yang membacanya; file di sini hanya hidup sementara sampai di-commit atau disapu.
- **File final selalu di subfolder bermakna**, bukan loose di root: `public/users/avatars/<uuid>.png`, `private/<userId>/<category>/<uuid>.pdf`, dst. Root `public/`/`private/` jangan diisi file langsung.
- **DB menyimpan relative key**, bukan full URL: `public/users/avatars/<uuid>.png`. Prefix host (`STORAGE_PUBLIC_URL` atau `{APP_BASE_URL}/api/storage`) di-resolve saat read oleh `StorageUrlSubscriber`. Ganti storage backend (local → S3/MinIO) cukup ubah env, tanpa migrasi data.

---

## 1. Minta Presigned URL

```
POST /api/uploads/presign
```

**Auth**: wajib login (cookie session Better Auth).

**Request body:**
```json
{
  "purpose": "avatar"        // "avatar" | "document"
}
```

**Response `200/201`:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "http://localhost:3000/api/uploads/temp/avatar.1754300000000.userId.<signature>",
    "token": "avatar.1754300000000.userId.<signature>",
    "expiresAt": 1754300000000,
    "purpose": "avatar"
  }
}
```

| Field | Arti |
|---|---|
| `uploadUrl` | URL untuk **PUT file** (langkah 2). |
| `expiresAt` | Waktu kedaluwarsa token (15 menit sejak presign). Lewat waktu → PUT ditolak `401`. |
| `token` | Isi token (embed di URL). |

---

## 2. Upload File ke Temp

```
PUT {uploadUrl}
```

**Tidak perlu** cookie/login — token di URL itulah otorisasi.

**Headers:**
| Header | Nilai | Wajib |
|---|---|---|
| `Content-Type` | MIME file, mis. `image/png`, `image/jpeg`, `application/pdf` | ya |
| `Content-Length` | ukuran byte (otomatis oleh browser) | tidak |

**Body: raw bytes file** — bukan multipart, bukan base64, bukan JSON.

**Batasan per `purpose`:**
| purpose | Ukuran maks | Tipe yang diterima |
|---|---|---|
| `avatar` | 2 MB | jpeg, png, gif, webp, svg |
| `document` | 5 MB | pdf, doc, docx, xls, xlsx |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "tempKey": "temp/avatar/9f01239f-a6ee-4b5b-b302-85bed9120e0d.png",
    "filename": "9f01239f-a6ee-4b5b-b302-85bed9120e0d.png",
    "mimeType": "image/png",
    "size": 70
  }
}
```

| Field | Arti |
|---|---|
| `tempKey` | Referensi file temp. **Simpan** — inilah yang dikirim saat commit. |

### Error umum
| Status | Penyebab |
|---|---|
| `401` | Token salah/kedaluwarsa. Ambil presign baru. |
| `413` | Ukuran melebihi batas purpose. |
| `400` | Tipe file tidak cocok dengan `purpose` (magic bytes terdeteksi server). |
| `415` | `Content-Type` `application/json` / `application/x-www-form-urlencoded` — kirim raw bytes! |

---

## 3. Commit — File jadi Final

Panggil endpoint fitur yang menerima `avatarTempKey`.

### Update profil sendiri (avatar)
```
PUT /api/me/update-profile
```
**Auth**: wajib login.
```json
{
  "avatarTempKey": "temp/avatar/9f01239f-a6ee-4b5b-b302-85bed9120e0d.png"
}
```
Field lain tetap opsional (`name`, `phoneNumber`, `avatarUrl`).

### Admin ganti avatar user
```
PUT /api/admin/users/{userId}
```
**Auth**: login admin + permission `user.update`.
```json
{
  "avatarTempKey": "temp/avatar/9f01239f-a6ee-4b5b-b302-85bed9120e0d.png"
}
```

### Setelah commit
- File dipindah `storage/temp/...` → `storage/public/users/avatars/<uuid>.png`.
- `avatarUrl` user di-update ke URL final.
- File temp otomatis terhapus oleh proses *sweep* (TTL default 24 jam).

> **Catatan**: `tempKey` hanya bisa di-commit **sekali**. Commit ulang tempKey yang sama → `404`.

---

## Contoh Implementasi (JavaScript)

```js
// 1. Presign
async function presign(purpose) {
  const res = await fetch('/api/uploads/presign', {
    method: 'POST',
    credentials: 'include',                     // cookie session
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ purpose }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;                             // { uploadUrl, token, expiresAt, purpose }
}

// 2. Upload file ke temp (file = File object dari <input type="file">)
async function uploadToTemp(file, purpose) {
  const { uploadUrl } = await presign(purpose);
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },      // raw bytes
    body: file,                                   // File/Blob → dikirim mentah
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data;                              // { tempKey, filename, mimeType, size }
}

// 3. Commit avatar
async function setAvatar(file) {
  const { tempKey } = await uploadToTemp(file, 'avatar');
  const res = await fetch('/api/me/update-profile', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ avatarTempKey: tempKey }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message);
  return json.data.user.avatarUrl;               // URL final avatar
}
```

---

## Ringkasan endpoint

| # | Method | URL | Auth | Body | Keterangan |
|---|---|---|---|---|---|
| 1 | POST | `/api/uploads/presign` | login | `{ purpose }` | Dapatkan signed upload URL |
| 2 | PUT | `/api/uploads/temp/:token` | token di URL | raw bytes | Simpan file ke temp, dapatkan `tempKey` |
| 3 | PUT | `/api/me/update-profile` | login | `{ avatarTempKey, ... }` | Commit avatar user sendiri |
| 3' | PUT | `/api/admin/users/:userId` | admin | `{ avatarTempKey, ... }` | Commit avatar user lain |
| 4 | GET | `/api/storage/public/*path` | publik | — | Serve file final (mis. `<img src>`) |

### Mengapa presigned URL?
Upload biasa butuh cookie pada request upload — menyulitkan jika upload dilakukan di luar sesi atau dari `<input type="file">` langsung. Dengan signed URL, server menandatangani URL untuk waktu singkat (15 menit), client boleh PUT ke URL itu tanpa cookie, tapi **hanya** ke file itu, **hanya** untuk purpose itu, **hanya** sampai expired. Setelah upload, commit tetap butuh login untuk mencegah siapa pun memakai `tempKey` orang lain.
