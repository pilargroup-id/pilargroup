# Testing Guide — User CRUD (pilargroup.id)

Base URL: `http://localhost:8001/api`

---

## Akses Berdasarkan Role

| Endpoint | IT | User Biasa |
|----------|-----|-----------|
| `GET /users` | ✅ | ❌ |
| `GET /users/{id}` | ✅ | ❌ |
| `POST /users` | ✅ | ❌ |
| `PUT /users/{id}` | ✅ | ❌ |
| `GET /auth/me` | ✅ | ✅ |
| `PUT /auth/change-profile` | ✅ | ✅ |
| `GET /master/departments` | ✅ | ✅ |
| `GET /master/projects` | ✅ | ✅ |

---

## 0. Login

```
POST /auth/login
{
  "username": "azi.fauzi",
  "password": "password123"
}
```
Simpan `token` dari response. Semua request berikutnya pakai:
```
Authorization: Bearer {token}
```

---

## — USER BIASA —

## 1. Lihat Data Diri Sendiri

```
GET /auth/me
```
Response: data user yang sedang login beserta `apps` yang bisa diakses.

## 2. Update Profil Diri Sendiri

```
PUT /auth/change-profile
{
  "current_password": "password123",
  "new_username": "username.baru",
  "new_password": "passwordbaru123",
  "email": "email@pilargroup.id",
  "phone": "081234567890"
}
```
Semua field opsional kecuali `current_password`. Kirim hanya field yang ingin diubah.

| Field | Keterangan |
|-------|-----------|
| `current_password` | **Wajib**, password saat ini |
| `new_username` | Min 3 karakter, harus unik |
| `new_password` | Min 6 karakter |
| `email` | Format email valid |
| `phone` | Max 20 karakter |

---

## — IT ONLY —

## 3. List Semua User

```
GET /users
```
Response: array of users dengan field `apps` berisi slug project.

## 4. Detail User

```
GET /users/{id}
```

## 5. Register User Baru

```
POST /users
{
  "username": "test.user",
  "password": "password123",
  "name": "Test User",
  "email": "test@pilargroup.id",
  "phone": "081234567890",
  "department_id": 8,
  "job_position": "Programmer",
  "job_level": "Staff",
  "internal_id": 9999,
  "apps": ["touchpoint", "treeview"]
}
```
Response `201`: `{ "message": "User registered successfully", "user_id": "..." }`

**Validasi yang dicek:**
- `username` belum ada di DB
- `internal_id` belum ada di DB
- `department_id` harus ada di `master_departments`
- `apps` harus slug yang ada di `master_projects`

## 6. Update User

```
PUT /users/{id}
{
  "username": "test.user.baru",
  "password": "passwordbaru123",
  "name": "Test User Updated",
  "email": "updated@pilargroup.id",
  "phone": "089876543210",
  "department_id": 8,
  "job_position": "Senior Programmer",
  "job_level": "Senior Staff",
  "internal_id": 9999,
  "is_active": false,
  "apps": ["touchpoint", "treeview"]
}
```
Semua field **opsional** — kirim hanya field yang ingin diubah.

| Field | Keterangan |
|-------|-----------|
| `username` | Min 3 karakter, harus unik |
| `password` | Min 6 karakter, otomatis di-hash |
| `name` | Nama lengkap |
| `email` | Format email valid |
| `phone` | Max 20 karakter |
| `department_id` | INT, harus ada di `master_departments` |
| `job_position` | Jabatan |
| `job_level` | Level jabatan |
| `internal_id` | INT, harus unik |
| `is_active` | `true` / `false` untuk aktif/nonaktif user |
| `apps` | Array slug: `touchpoint`, `treeview`, `ticketing` |

## 7. Master Departments

```
GET /master/departments        → list (semua user)
POST /master/departments       → { "id": 20, "name": "Operations" }
PUT /master/departments/{id}   → { "name": "Operations Baru" }
DELETE /master/departments/{id}
```
> DELETE gagal jika department masih dipakai user (422)

## 8. Master Projects

```
GET /master/projects           → list (semua user)
POST /master/projects          → { "name": "New App", "slug": "newapp", "description": "..." }
PUT /master/projects/{id}      → { "name": "New App Updated", "is_active": false }
DELETE /master/projects/{id}
```
> DELETE gagal jika project masih dipakai user (422)

---

## Error Codes

| Code | Keterangan |
|------|-----------|
| 401 | Token tidak ada / expired |
| 403 | Bukan IT department |
| 404 | Data tidak ditemukan |
| 422 | Validasi gagal |
| 500 | Server error, cek log |