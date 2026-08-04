# Dokumentasi FE — User Import Preview & Commit

## Ringkasan perubahan

Alur import user di PilarGroup berubah dari proses **langsung import** menjadi:

```text
Download template
      ↓
Upload file untuk preview
      ↓
Tampilkan hasil validasi dan perubahan
      ↓
User memilih Commit atau Cancel
      ↓
Commit data valid
      ↓
Download file invalid jika tersedia
```

Pada proses preview, backend **belum mengubah data user**. Perubahan data baru dilakukan setelah FE memanggil endpoint commit.

Semua endpoint import hanya dapat digunakan oleh user divisi **IT** dan tetap membutuhkan JWT PilarGroup.

---

## Base URL

Contoh local:

```text
http://localhost:8000/api
```

Contoh production:

```text
https://pilargroup.id/api
```

Semua request yang membutuhkan autentikasi harus mengirim header:

```http
Authorization: Bearer <JWT_TOKEN>
Accept: application/json
```

---

# Perubahan endpoint

## Endpoint yang dihapus

Endpoint import lama berikut sudah tidak digunakan:

```http
POST /api/users/import
```

Endpoint tersebut sebelumnya langsung membuat atau memperbarui user setelah file di-upload.

FE tidak boleh lagi memanggil endpoint ini.

---

## Endpoint baru

| Method | Endpoint | Fungsi |
|---|---|---|
| `POST` | `/api/users/import/preview` | Upload file dan membuat preview import tanpa mengubah database |
| `POST` | `/api/users/import/{batchId}/commit` | Menyimpan seluruh row valid dari hasil preview |
| `GET` | `/api/users/import/{batchId}/invalid-file` | Download XLSX berisi row invalid setelah commit |
| `DELETE` | `/api/users/import/{batchId}` | Membatalkan preview dan menghapus file temporary |

## Endpoint yang tetap ada

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/api/users/import-template` | Download template import user |
| `GET` | `/api/users/export` | Export seluruh user ke XLSX |

Endpoint CRUD user lainnya tidak berubah.

---

# 1. Download template import

```http
GET /api/users/import-template
```

## Fungsi

Mengunduh template XLSX untuk import user.

Template berisi sheet utama `Users` dan beberapa sheet referensi:

- `Job Levels Reference`
- `Departments Reference`
- `Companies Reference`
- `Apps Reference`
- `Employment Type Reference`

## Response

Response berupa file XLSX.

Contoh FE dengan Axios:

```javascript
const response = await api.get('/users/import-template', {
  responseType: 'blob',
});

const url = window.URL.createObjectURL(response.data);
const link = document.createElement('a');
link.href = url;
link.download = 'users_import_template.xlsx';
link.click();
window.URL.revokeObjectURL(url);
```

---

# 2. Preview import

```http
POST /api/users/import/preview
```

## Fungsi

Endpoint ini digunakan untuk:

- upload file import;
- memvalidasi header dan isi setiap row;
- menentukan row yang akan membuat user baru;
- menentukan row yang akan memperbarui user lama;
- mendeteksi row yang tidak memiliki perubahan;
- mendeteksi row invalid;
- menampilkan perbandingan nilai lama dan baru;
- menghasilkan `batch_id` untuk proses commit atau cancel.

Endpoint ini **tidak mengubah data user**.

## Request

Content type:

```http
multipart/form-data
```

Field:

| Field | Type | Wajib | Keterangan |
|---|---|---:|---|
| `file` | File | Ya | Format `.xlsx`, `.xls`, atau `.csv` |

Contoh Axios:

```javascript
const formData = new FormData();
formData.append('file', selectedFile);

const response = await api.post('/users/import/preview', formData, {
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});
```

## Response sukses

```json
{
  "message": "User import preview generated",
  "batch_id": "b76286e7-55f4-49f8-9990-fdd3458ae456",
  "expires_at": "2026-08-04T16:00:00+07:00",
  "summary": {
    "total": 100,
    "valid": 90,
    "invalid": 10,
    "create": 35,
    "update": 50,
    "skip": 5
  },
  "rows": [
    {
      "row": 2,
      "username": "jdoe",
      "status": "VALID",
      "action": "UPDATE",
      "changes": {
        "name": {
          "old": "John Doe",
          "new": "John Doe Updated"
        },
        "department_ids": {
          "old": [8],
          "new": [1, 8]
        }
      },
      "errors": []
    },
    {
      "row": 3,
      "username": "new.user",
      "status": "VALID",
      "action": "CREATE",
      "changes": {
        "username": {
          "old": null,
          "new": "new.user"
        },
        "password": {
          "old": null,
          "new": "Password will be set"
        }
      },
      "errors": []
    },
    {
      "row": 4,
      "username": "invalid.user",
      "status": "INVALID",
      "action": null,
      "changes": [],
      "errors": [
        "Job level ID does not exist.",
        "primary_department_id must be included in department_ids."
      ]
    }
  ]
}
```

## Arti summary

| Field | Keterangan |
|---|---|
| `total` | Total row berisi data yang diperiksa |
| `valid` | Total row valid, termasuk `CREATE`, `UPDATE`, dan `SKIP` |
| `invalid` | Total row yang gagal validasi |
| `create` | Total user baru yang akan dibuat |
| `update` | Total user lama yang akan diperbarui |
| `skip` | Total row valid tetapi tidak memiliki perubahan |

## Arti status row

### `VALID`

Row lolos validasi dan dapat diproses ketika commit.

### `INVALID`

Row tidak akan diproses ketika commit. Penyebabnya tersedia di properti `errors`.

## Arti action row

### `CREATE`

Username belum tersedia di database. Backend akan membuat user baru ketika commit.

### `UPDATE`

Username sudah tersedia dan terdapat perubahan data.

### `SKIP`

Username sudah tersedia tetapi seluruh kolom yang diisi sama dengan data saat ini. Row tidak akan diubah.

### `null`

Digunakan untuk row `INVALID`.

## Bentuk `changes`

Setiap field yang berubah mempunyai struktur:

```json
{
  "field_name": {
    "old": "nilai lama",
    "new": "nilai baru"
  }
}
```

Field yang dapat muncul antara lain:

- `name`
- `email`
- `phone`
- `job_position`
- `job_level_id`
- `employment_type_code`
- `internal_id`
- `department_ids`
- `primary_department_id`
- `company_ids`
- `primary_company_id`
- `apps`
- `is_active`
- `password`

Nilai password asli tidak pernah dikirim kembali ke FE.

## Tampilan FE yang disarankan

Tampilkan minimal:

- summary total, valid, invalid, create, update, dan skip;
- nomor row Excel;
- username;
- status;
- action;
- daftar perubahan lama dan baru;
- daftar error untuk row invalid;
- tombol `Commit`;
- tombol `Cancel`.

FE boleh menyediakan filter berdasarkan:

```text
ALL | CREATE | UPDATE | SKIP | INVALID
```

## Error response

### Header `username` tidak ditemukan — 422

```json
{
  "message": "Invalid import file. Header username is required."
}
```

### Terdapat header tidak dikenal — 422

```json
{
  "message": "Invalid import file. Unknown header found.",
  "unknown_headers": ["division"],
  "supported_headers": [
    "username",
    "password",
    "name"
  ]
}
```

### File gagal diproses — 500

```json
{
  "message": "Error while generating user import preview",
  "error": "Detail error"
}
```

---

# 3. Commit hasil preview

```http
POST /api/users/import/{batchId}/commit
```

## Fungsi

Menyimpan row valid dari preview ke database.

Ketentuan:

- row `CREATE` dibuat sebagai user baru;
- row `UPDATE` memperbarui user yang sudah ada;
- row `SKIP` dilewati;
- row `INVALID` tidak disimpan;
- row yang gagal saat commit ditambahkan sebagai invalid;
- sinkronisasi Snipe-IT tetap dijalankan sesuai perubahan user;
- sinkronisasi Ticket sudah tidak dilakukan.

## Request body

Tidak membutuhkan request body.

Contoh Axios:

```javascript
const response = await api.post(
  `/users/import/${batchId}/commit`
);
```

## Response sukses tanpa row invalid

```json
{
  "message": "User import committed",
  "batch_id": "b76286e7-55f4-49f8-9990-fdd3458ae456",
  "summary": {
    "created": 35,
    "updated": 50,
    "skipped": 5,
    "invalid": 0,
    "failed_during_commit": 0
  },
  "invalid_file_url": null
}
```

Jika `invalid_file_url` bernilai `null`, seluruh proses telah selesai dan folder temporary sudah dihapus oleh backend.

## Response sukses dengan row invalid

```json
{
  "message": "User import committed",
  "batch_id": "b76286e7-55f4-49f8-9990-fdd3458ae456",
  "summary": {
    "created": 35,
    "updated": 50,
    "skipped": 5,
    "invalid": 10,
    "failed_during_commit": 0
  },
  "invalid_file_url": "https://pilargroup.id/api/users/import/b76286e7-55f4-49f8-9990-fdd3458ae456/invalid-file"
}
```

Jika `invalid_file_url` tidak `null`, FE harus otomatis mengunduh file tersebut.

## Arti summary commit

| Field | Keterangan |
|---|---|
| `created` | User baru yang berhasil dibuat |
| `updated` | User existing yang berhasil diperbarui |
| `skipped` | Row tanpa perubahan yang dilewati |
| `invalid` | Row yang sudah invalid sejak preview |
| `failed_during_commit` | Row valid saat preview tetapi gagal ketika commit |

## Error response

### Batch tidak tersedia untuk commit — 409

```json
{
  "message": "Import batch is not available for commit.",
  "status": "COMMITTED"
}
```

### Batch expired — 410

```json
{
  "message": "Import batch has expired."
}
```

### Batch tidak ditemukan — 404

```json
{
  "message": "Import batch not found."
}
```

### Batch bukan milik user login — 403

```json
{
  "message": "You are not allowed to access this import batch."
}
```

## Pencegahan double submit

Saat user menekan tombol Commit:

- disable tombol Commit dan Cancel;
- tampilkan loading;
- jangan mengirim request commit lebih dari sekali;
- setelah sukses, tutup atau reset modal preview.

---

# 4. Download file row invalid

```http
GET /api/users/import/{batchId}/invalid-file
```

## Fungsi

Mengunduh file XLSX yang berisi seluruh row invalid.

File berisi kolom asli ditambah:

- `import_row`
- `import_status`
- `import_errors`

File juga menyertakan sheet referensi agar user dapat langsung memperbaiki data dan meng-import ulang.

## Ketentuan penting

Endpoint ini hanya bisa dipanggil:

- setelah commit berhasil;
- jika `invalid_file_url` dari response commit tidak `null`;
- oleh user yang membuat batch tersebut.

Setelah file selesai dikirim, backend langsung menghapus seluruh folder temporary batch. Karena itu endpoint download sebaiknya hanya dipanggil satu kali.

## Contoh download otomatis dengan Axios

Lebih aman gunakan path endpoint dengan instance API yang sama agar header JWT tetap terkirim.

```javascript
async function downloadInvalidImportFile(batchId) {
  const response = await api.get(
    `/users/import/${batchId}/invalid-file`,
    {
      responseType: 'blob',
    }
  );

  const contentDisposition = response.headers['content-disposition'];
  let fileName = 'users_import_invalid.xlsx';

  const match = contentDisposition?.match(/filename="?([^";]+)"?/i);
  if (match?.[1]) {
    fileName = match[1];
  }

  const blobUrl = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}
```

## Contoh alur setelah commit

```javascript
const commitResponse = await api.post(
  `/users/import/${batchId}/commit`
);

const result = commitResponse.data;

if (result.invalid_file_url) {
  await downloadInvalidImportFile(result.batch_id);
}

// Tampilkan notifikasi hasil commit dan reset tampilan preview.
```

## Error response

### Belum commit — 409

```json
{
  "message": "Invalid file is only available after commit."
}
```

### Tidak ada file invalid — 404

```json
{
  "message": "No invalid rows file is available for this batch."
}
```

---

# 5. Cancel preview

```http
DELETE /api/users/import/{batchId}
```

## Fungsi

Membatalkan import sebelum commit dan menghapus seluruh temporary file untuk batch tersebut.

Tidak ada perubahan data user.

## Contoh Axios

```javascript
await api.delete(`/users/import/${batchId}`);
```

## Response sukses

```json
{
  "message": "User import batch canceled.",
  "batch_id": "b76286e7-55f4-49f8-9990-fdd3458ae456"
}
```

Setelah cancel berhasil, FE harus:

- menghapus state `batch_id`;
- menghapus data preview;
- mereset input file;
- menutup modal atau kembali ke halaman upload.

---

# Masa berlaku batch

Setiap batch preview berlaku selama **2 jam**.

Waktu kedaluwarsa dikirim melalui:

```json
{
  "expires_at": "2026-08-04T16:00:00+07:00"
}
```

FE disarankan:

- menyimpan `expires_at` bersama `batch_id`;
- menampilkan informasi bahwa preview bersifat sementara;
- menolak commit dari UI ketika waktu sudah lewat;
- tetap menangani response backend `410` sebagai sumber kebenaran.

Batch yang tidak dilanjutkan akan dibersihkan otomatis oleh backend.

---

# Alur implementasi FE lengkap

## State minimum

```javascript
const initialImportState = {
  file: null,
  batchId: null,
  expiresAt: null,
  summary: null,
  rows: [],
  isPreviewing: false,
  isCommitting: false,
  isCanceling: false,
};
```

## Flow

### A. Upload dan preview

1. User memilih file.
2. FE memanggil `POST /users/import/preview`.
3. Simpan:
   - `batch_id`;
   - `expires_at`;
   - `summary`;
   - `rows`.
4. Tampilkan halaman atau modal preview.

### B. Commit

1. User menekan Commit.
2. FE menampilkan konfirmasi.
3. FE memanggil `POST /users/import/{batchId}/commit`.
4. Tampilkan summary hasil commit.
5. Jika `invalid_file_url` tersedia, download file invalid otomatis.
6. Reset seluruh state import.
7. Refresh daftar user.

### C. Cancel

1. User menekan Cancel.
2. FE memanggil `DELETE /users/import/{batchId}`.
3. Reset seluruh state import.

### D. User menutup browser atau meninggalkan halaman

Tidak wajib memanggil cancel secara otomatis. Batch temporary akan expired dan dibersihkan backend setelah maksimal dua jam.

Jangan mengandalkan request `beforeunload` karena browser tidak menjamin request tersebut selesai.

---

# Contoh service FE

```javascript
export async function downloadUserImportTemplate(api) {
  return api.get('/users/import-template', {
    responseType: 'blob',
  });
}

export async function previewUserImport(api, file) {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/users/import/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
}

export async function commitUserImport(api, batchId) {
  return api.post(`/users/import/${batchId}/commit`);
}

export async function cancelUserImport(api, batchId) {
  return api.delete(`/users/import/${batchId}`);
}

export async function downloadInvalidUserImport(api, batchId) {
  return api.get(`/users/import/${batchId}/invalid-file`, {
    responseType: 'blob',
  });
}
```

---

# Penanganan status HTTP

| Status | Kondisi | Tindakan FE |
|---:|---|---|
| `200` | Preview, commit, cancel, atau download berhasil | Lanjutkan flow |
| `401` | JWT tidak valid atau expired | Arahkan login ulang |
| `403` | Bukan IT atau batch milik user lain | Tampilkan akses ditolak |
| `404` | Batch atau file tidak ditemukan | Reset state preview |
| `409` | Status batch tidak sesuai | Hentikan proses dan refresh state |
| `410` | Batch expired | Reset state dan minta upload ulang |
| `422` | File/header/input tidak valid | Tampilkan pesan validasi |
| `500` | Error internal backend | Tampilkan pesan gagal dan jangan lanjut commit |

---

# Catatan perubahan sinkronisasi Ticket

Sinkronisasi user ke aplikasi Ticket sudah dihapus dari proses user management dan import.

FE tidak perlu melakukan request tambahan ke Ticket setelah:

- membuat user;
- memperbarui user;
- menghapus user;
- import user.

Ticket sekarang menggunakan JWT dan data autentikasi dari PilarGroup.

---

# Checklist FE

- [ ] Hapus pemanggilan `POST /api/users/import` lama.
- [ ] Tambahkan upload ke `POST /api/users/import/preview`.
- [ ] Simpan `batch_id` dari response preview.
- [ ] Tampilkan summary dan detail row.
- [ ] Bedakan badge `CREATE`, `UPDATE`, `SKIP`, dan `INVALID`.
- [ ] Tampilkan nilai `old` dan `new` pada perubahan.
- [ ] Tambahkan tombol Commit dan Cancel.
- [ ] Disable tombol selama request berlangsung.
- [ ] Setelah commit, cek `invalid_file_url`.
- [ ] Download file invalid menggunakan `responseType: 'blob'`.
- [ ] Refresh daftar user setelah commit.
- [ ] Reset state setelah commit, cancel, expired, atau batch tidak ditemukan.
