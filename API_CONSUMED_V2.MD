# Pilargroup API — Dokumentasi untuk Frontend Developer

> Base URL: `https://pilargroup.id/api`  
> Auth: semua endpoint (kecuali `/auth/login`) wajib kirim header `Authorization: Bearer <token>`

---

## Perubahan Breaking dari Versi Sebelumnya

| Yang lama | Yang baru | Keterangan |
|---|---|---|
| `department_id` (integer) di response user | dihapus | diganti dengan array `departments` |
| `department` (string) di response user | tetap ada | sekarang adalah **primary department** saja, untuk backward-compat |
| Tidak ada `companies` | tambah array `companies` | multi-company |
| POST/PUT user kirim `department_id` | kirim `departments` (array) | lihat contoh di bawah |

---

## Auth

### POST `/auth/login`
Login dan dapatkan JWT token.

**Request body:**
```json
{
  "username": "john.doe",
  "password": "secret123"
}
```

**Response `200`:**
```json
{
  "token": "eyJ...",
  "user": {
    "id": "uuid",
    "internal_id": 101,
    "username": "john.doe",
    "name": "John Doe",
    "email": "john@pilargroup.id",
    "phone": "08123456789",
    "departments": [
      { "id": 8,  "name": "IT",      "class": "IT",      "code": "SIT", "is_primary": 1 },
      { "id": 13, "name": "Product", "class": "Product", "code": "PRO", "is_primary": 0 }
    ],
    "companies": [
      { "id": "comp-pnm-0001", "code": "PNM", "name": "Pilar Nusantara Makmur", "is_primary": 1 }
    ],
    "department_id": 8,
    "department": "IT",
    "company_id": "comp-pnm-0001",
    "company": "Pilar Nusantara Makmur",
    "job_position": "Backend Engineer",
    "job_level": "Staff",
    "job_level_value": 8,
    "apps": ["treeview", "touchpoint", "ticket"],
    "cv": 1
  }
}
```

> `department` dan `department_id` di root level adalah **primary department** (backward compat).  
> Untuk tampil semua department user, pakai array `departments`.

---

### POST `/auth/logout`
*Header auth wajib.*

**Request body:**
```json
{ "user_id": "uuid" }
```

**Response `200`:** `{ "message": "Logged out successfully" }`

---

### GET `/auth/me`
Ambil data user dari token aktif.

**Response:** sama dengan object `user` di login response.

---

### GET `/auth/status`
Dipakai sub-project untuk polling validitas token.

**Query params:** `user_id`, `auth_cv`

**Response:**
```json
{ "valid": true, "token_version": 3 }
```

---

### PUT `/auth/change-profile`
User ubah data profile sendiri.

**Request body:**
```json
{
  "current_password": "secret123",
  "new_username": "john.baru",
  "new_password": "newpass456",
  "email": "john.baru@pilargroup.id",
  "phone": "08199999999"
}
```
Semua field selain `current_password` opsional, tapi minimal satu harus diisi.

**Response `200`:**
```json
{ "success": true, "message": "Berhasil mengubah username dan password" }
```

---

## Users (IT Only)

### GET `/users`
List semua user.

**Response `200`:** array of user object.

```json
[
  {
    "id": "uuid",
    "internal_id": 101,
    "username": "john.doe",
    "name": "John Doe",
    "email": "john@pilargroup.id",
    "phone": "08123456789",
    "job_position": "Backend Engineer",
    "job_level_id": 8,
    "job_level": "Staff",
    "job_level_value": 8,
    "is_active": 1,
    "departments": [
      { "id": 8, "name": "IT", "class": "IT", "code": "SIT", "is_primary": 1 }
    ],
    "companies": [
      { "id": "comp-pnm-0001", "code": "PNM", "name": "Pilar Nusantara Makmur", "is_primary": 1 }
    ],
    "apps": ["treeview", "ticket"],
    "created_at": "2024-01-01 08:00:00",
    "updated_at": "2024-06-01 10:00:00"
  }
]
```

---

### GET `/users/{id}`
Detail satu user. Response shape sama dengan item di GET `/users`.

---

### POST `/users`
Buat user baru.

**Request body:**
```json
{
  "username": "jane.doe",
  "password": "secret123",
  "name": "Jane Doe",
  "email": "jane@pilargroup.id",
  "phone": "08111111111",
  "internal_id": 102,
  "job_position": "Frontend Engineer",
  "job_level_id": 8,
  "departments": [
    { "id": 8,  "is_primary": true  },
    { "id": 13, "is_primary": false }
  ],
  "apps": ["treeview", "touchpoint"]
}
```

**Field wajib:** `username`, `password`, `name`, `departments` (min 1 item), `apps`

**Catatan `departments`:**
- `id` — integer, id dari `master_departments`
- `is_primary` — boolean, **tepat 1 harus true**. Kalau tidak ada yang true, item pertama otomatis jadi primary.
- `companies` **tidak perlu dikirim** — otomatis di-derive dari departments yang dipilih.

**Response `201`:**
```json
{ "message": "User berhasil dibuat", "user_id": "uuid" }
```

---

### PUT `/users/{id}`
Update user. Semua field opsional — kirim hanya yang mau diubah.

**Request body (contoh update department + apps):**
```json
{
  "departments": [
    { "id": 7,  "is_primary": true  },
    { "id": 13, "is_primary": false }
  ],
  "apps": ["treeview", "ticket", "framelens"],
  "job_level_id": 7
}
```

**Request body (contoh update nama saja):**
```json
{
  "name": "Jane Doe Updated"
}
```

> Kalau `departments` tidak dikirim → pivot tidak berubah.  
> Kalau `apps` tidak dikirim → project access tidak berubah.

**Response `200`:**
```json
{ "message": "User berhasil diupdate" }
```

---

### DELETE `/users/{id}`
Hapus user beserta semua pivot (departments, companies, projects).

**Response `200`:**
```json
{ "message": "User berhasil dihapus" }
```

---

## Master Data

### GET `/master/departments`
List semua department.

**Query params (opsional):**
- `company_id` — filter by company
- `root_only=true` — hanya parent departments (tanpa sub-department GOTO Store cabang)

**Response `200`:**
```json
[
  {
    "id": 15,
    "name": "GOTO Store",
    "class": "Store HO",
    "code": "STO",
    "company_id": "comp-pnm-0001",
    "company_name": "Pilar Nusantara Makmur",
    "company_code": "PNM",
    "parent_id": null,
    "parent_name": null,
    "is_active": 1
  },
  {
    "id": 22,
    "name": "GOTO Store",
    "class": "Store 1 Pasar Lama",
    "code": "STO",
    "company_id": "comp-pnm-0001",
    "company_name": "Pilar Nusantara Makmur",
    "company_code": "PNM",
    "parent_id": 15,
    "parent_name": "GOTO Store",
    "is_active": 1
  }
]
```

---

### POST `/master/departments` *(IT Only)*

**Request body:**
```json
{
  "name": "Supply Chain",
  "class": "Supply Chain",
  "code": "SCH",
  "company_id": "comp-pnm-0001",
  "parent_id": null,
  "is_active": 1
}
```

**Response `201`:** `{ "id": 35, "message": "Department created" }`

---

### PUT `/master/departments/{id}` *(IT Only)*

**Request body:** semua field opsional, kirim yang mau diubah saja.  
`parent_id` bisa dikirim `null` untuk jadikan root department.

**Response `200`:** `{ "message": "Department updated" }`

---

### DELETE `/master/departments/{id}` *(IT Only)*

Gagal kalau:
- Masih ada user di department ini
- Masih ada sub-department (hapus sub dulu)

**Response `200`:** `{ "message": "Department deleted" }`  
**Response `422`:** `{ "message": "..." }`

---

### GET `/master/companies`
List semua company.

**Response `200`:**
```json
[
  { "id": "comp-pnm-0001", "code": "PNM", "name": "Pilar Nusantara Makmur", "is_active": 1 },
  { "id": "comp-pks-0001", "code": "PKS", "name": "Pilar Karang Samudra",   "is_active": 1 },
  { "id": "comp-pkp-0001", "code": "PKP", "name": "Pilar Kargo Perkasa",    "is_active": 1 }
]
```

---

### POST `/master/companies` *(IT Only)*

**Request body:**
```json
{ "code": "PKB", "name": "Pilar Karya Bersama", "is_active": 1 }
```

**Response `201`:** `{ "id": "uuid", "message": "Company created" }`

---

### PUT `/master/companies/{id}` *(IT Only)*

**Request body:** semua opsional.  
**Response `200`:** `{ "message": "Company updated" }`

---

### DELETE `/master/companies/{id}` *(IT Only)*

Gagal kalau masih ada department yang terhubung ke company ini.

**Response `200`:** `{ "message": "Company deleted" }`

---

### GET `/master/projects`

**Query params:** `limit` (integer, -1 = semua)

**Response `200`:**
```json
[
  { "id": "uuid", "name": "Treeview", "slug": "treeview", "url": "https://treeview.pilargroup.id", "is_active": 1 }
]
```

---

### POST `/master/projects` *(IT Only)*
```json
{ "name": "Treeview", "url": "https://treeview.pilargroup.id", "description": "...", "is_active": 1 }
```
Slug di-generate otomatis dari `name` (lowercase, no space).

**Response `201`:** `{ "message": "Project created" }`

---

### PUT `/master/projects/{id}` *(IT Only)*
**Response `200`:** `{ "message": "Project updated" }`

### DELETE `/master/projects/{id}` *(IT Only)*
Gagal kalau masih ada user yang punya akses ke project ini.

---

### GET `/master/job-levels`

**Response `200`:**
```json
[
  { "id": 8, "name": "Staff", "level": 8 },
  { "id": 5, "name": "Manager", "level": 5 }
]
```

---

### POST `/master/job-levels` *(IT Only)*
```json
{ "name": "Senior Staff", "level": 8 }
```

### PUT `/master/job-levels/{id}` *(IT Only)*
### DELETE `/master/job-levels/{id}` *(IT Only)*

---

## Error Responses Standar

| Code | Artinya |
|---|---|
| `401` | Token tidak valid / expired / tidak ada |
| `403` | Tidak punya akses (bukan IT) |
| `404` | Data tidak ditemukan |
| `422` | Validasi gagal — cek field `message` |
| `500` | Server error — cek field `error` |

---

## Catatan untuk FE

1. **`departments` adalah array** — saat render profile user, iterate array ini. `department` (string) di root masih ada tapi hanya primary, jangan andalkan untuk tampil semua department user.
2. **`companies` auto-derive** — FE tidak perlu kirim companies saat create/update user, cukup kirim `departments`.
3. **`is_primary`** — gunakan untuk highlight/badge primary department di UI.
4. **GOTO Store cabang** — di response departments, cabang punya `parent_id` non-null. Bisa dipakai untuk grouping di dropdown.
5. **`apps`** — array slug string. Gunakan ini untuk kontrol navigasi antar project di dashboard.