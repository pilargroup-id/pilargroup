# User Excel Import Documentation

Dokumentasi ini menjelaskan cara FE menggunakan fitur import user dari Excel di Pilargroup.

---

# 1. Overview

Fitur import user digunakan untuk create/update data user melalui file Excel.

Import ini bersifat:

```txt
Upsert / Patch by username
```

Artinya:

```txt
username belum ada  => create user baru
username sudah ada  => update user existing
```

Untuk update user existing:

```txt
kolom tidak ada di Excel      => tidak mengubah data
kolom ada tapi cell kosong    => tidak mengubah data
kolom ada dan cell terisi     => update data sesuai cell
```

Import hanya bisa dilakukan oleh user IT.

---

# 2. Access

Endpoint import hanya untuk:

```txt
IT only
```

Middleware backend:

```txt
auth.central
it.only
```

HCGA tidak upload/import langsung ke sistem.

Flow kerja:

```txt
1. HCGA download template atau minta template ke IT.
2. HCGA isi data user di Excel.
3. HCGA kirim file ke IT.
4. IT review/finalize data.
5. IT upload file ke sistem.
```

---

# 3. Endpoints

## 3.1 Download Import Template

```http
GET /api/users/import-template
```

Access:

```txt
IT only
```

Response:

```txt
File Excel .xlsx
```

FE usage:

```js
async function downloadUserImportTemplate() {
  const response = await api.get('/users/import-template', {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');

  link.href = url;
  link.setAttribute('download', 'users_import_template.xlsx');
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}
```

---

## 3.2 Import Users

```http
POST /api/users/import
```

Access:

```txt
IT only
```

Content-Type:

```txt
multipart/form-data
```

Request body:

```txt
file
```

FE usage:

```js
async function importUsers(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/users/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
```

Supported file type:

```txt
.xlsx
.xls
.csv
```

Recommended:

```txt
.xlsx
```

---

# 4. Excel Template Structure

Template utama menggunakan sheet:

```txt
Users
```

Sheet `Users` berisi header berikut:

```txt
username
password
name
email
phone
job_position
job_level_id
employment_type_code
internal_id
department_ids
primary_department_id
company_ids
primary_company_id
apps
is_active
```

Selain sheet `Users`, template juga punya reference sheet:

```txt
Job Levels Reference
Departments Reference
Companies Reference
Apps Reference
Employment Type Reference
```

Reference sheet hanya untuk membantu user mengisi data. Backend hanya memproses sheet `Users`.

---

# 5. Column Rules

## 5.1 Main Key

Kolom utama:

```txt
username
```

`username` wajib ada di setiap row yang ingin diproses.

Backend menggunakan `username` untuk menentukan apakah row akan create user baru atau update user existing.

---

## 5.2 Supported Columns

| Column                  | Create New User | Update Existing User | Description                                                |
| ----------------------- | --------------: | -------------------: | ---------------------------------------------------------- |
| `username`              |        Required |             Required | Key utama. Dipakai untuk lookup user.                      |
| `password`              |        Required |             Optional | Jika terisi saat update, password akan diubah dan di-hash. |
| `name`                  |        Required |             Optional | Nama user.                                                 |
| `email`                 |        Optional |             Optional | Harus format email valid jika diisi.                       |
| `phone`                 |        Optional |             Optional | Maksimal 20 karakter.                                      |
| `job_position`          |        Optional |             Optional | Jabatan user.                                              |
| `job_level_id`          |        Optional |             Optional | ID dari `master_job_levels`.                               |
| `employment_type_code`  |        Optional |             Optional | `UP`, `OS`, atau `HL`.                                     |
| `internal_id`           |        Optional |             Optional | Harus unique jika diisi.                                   |
| `department_ids`        |        Required |             Optional | Comma-separated department IDs.                            |
| `primary_department_id` |        Optional |             Optional | Harus termasuk di `department_ids` jika diisi.             |
| `company_ids`           |        Optional |             Optional | Comma-separated company IDs.                               |
| `primary_company_id`    |        Optional |             Optional | Harus termasuk di `company_ids` jika diisi.                |
| `apps`                  |        Optional |             Optional | Comma-separated app slugs.                                 |
| `is_active`             |        Optional |             Optional | `1/0`, `true/false`, `active/inactive`.                    |

---

# 6. Create User Behavior

Jika `username` belum ada di database, backend akan membuat user baru.

Minimal kolom yang wajib untuk create:

```txt
username
password
name
department_ids
```

Contoh create minimal:

```txt
username | password   | name     | department_ids
jdoe     | Welcome123 | John Doe | 8
```

Contoh create recommended:

```txt
username | password   | name     | email            | phone       | job_position | job_level_id | employment_type_code | internal_id | department_ids | primary_department_id | company_ids      | primary_company_id | apps           | is_active
jdoe     | Welcome123 | John Doe | john@example.com | 08123456789 | Manager      | 5            | UP                   | 123         | 8,1            | 8                     | comp-pnm-0001    | comp-pnm-0001       | ticket,lawdesk | 1
```

Jika `company_ids` kosong saat create, backend akan otomatis derive company dari department yang dipilih.

Jika `primary_department_id` kosong, backend akan otomatis menjadikan department pertama dari `department_ids` sebagai primary.

Jika `primary_company_id` kosong, backend akan otomatis menjadikan company pertama dari `company_ids` sebagai primary.

Jika `is_active` kosong saat create, default-nya:

```txt
1
```

---

# 7. Update User Behavior

Jika `username` sudah ada di database, backend akan update user existing.

Update bersifat patch:

```txt
hanya kolom yang ada dan cell-nya terisi yang diproses
```

Contoh update `employment_type_code` saja:

```txt
username | employment_type_code
jdoe     | HL
```

Hasil:

```txt
jdoe.employment_type_code = HL
field lain tidak berubah
```

Contoh update phone saja:

```txt
username | phone
jdoe     | 08123456789
```

Hasil:

```txt
jdoe.phone berubah
field lain tidak berubah
```

Contoh update password:

```txt
username | password
jdoe     | NewPassword123
```

Hasil:

```txt
password user berubah
password di-hash oleh backend
token_version increment
user perlu login ulang
```

---

# 8. Blank Cell Behavior

Rule penting:

```txt
kolom tidak ada di Excel      => skip / tidak update
kolom ada tapi cell kosong    => skip / tidak update
kolom ada dan cell terisi     => update
```

Contoh:

```txt
username | email | phone
jdoe     |       | 08123456789
```

Hasil:

```txt
email tidak berubah
phone berubah
```

Blank cell tidak digunakan untuk menghapus data.

Untuk versi saat ini belum ada marker clear value seperti `__CLEAR__`.

---

# 9. Many-to-Many Columns

Beberapa kolom mewakili relasi many-to-many.

## 9.1 Departments

Kolom:

```txt
department_ids
primary_department_id
```

Format:

```txt
department_ids = 1,8
primary_department_id = 8
```

Behavior:

```txt
department_ids tidak ada / kosong  => department user tidak berubah
department_ids terisi              => replace seluruh department mapping user
```

Jika `primary_department_id` kosong, backend akan menjadikan department pertama sebagai primary.

Jika `primary_department_id` diisi, value harus termasuk di dalam `department_ids`.

---

## 9.2 Companies

Kolom:

```txt
company_ids
primary_company_id
```

Format:

```txt
company_ids = comp-pnm-0001,comp-pks-0001
primary_company_id = comp-pnm-0001
```

Behavior update:

```txt
company_ids tidak ada / kosong  => company user tidak berubah
company_ids terisi              => replace seluruh company mapping user
```

Behavior create:

```txt
company_ids kosong  => auto derive dari department_ids
company_ids terisi  => pakai company_ids dari Excel
```

Jika `primary_company_id` kosong, backend akan menjadikan company pertama sebagai primary.

Jika `primary_company_id` diisi, value harus termasuk di dalam `company_ids`.

---

## 9.3 Apps / Project Access

Kolom:

```txt
apps
```

Format:

```txt
apps = ticket,lawdesk,papertrail
```

Value harus menggunakan `slug` dari `master_projects`.

Contoh:

```txt
username | apps
jdoe     | ticket,lawdesk
```

Backend akan translate:

```txt
central_users.username -> central_users.id
master_projects.slug   -> master_projects.id
```

Lalu backend akan mengisi pivot:

```txt
central_user_projects.user_id
central_user_projects.project_id
```

Behavior:

```txt
apps tidak ada / kosong  => apps user tidak berubah
apps terisi              => replace seluruh apps/project access user
```

Jadi jika user sebelumnya punya:

```txt
ticket,papertrail,lawdesk
```

lalu Excel berisi:

```txt
apps = ticket,lawdesk
```

maka final apps user menjadi:

```txt
ticket,lawdesk
```

---

# 10. Separator List

Untuk kolom list, gunakan comma-separated value:

```txt
1,8
ticket,lawdesk
comp-pnm-0001,comp-pks-0001
```

Backend juga mendukung semicolon:

```txt
1;8
ticket;lawdesk
```

Namun untuk konsistensi, FE/template disarankan menggunakan comma `,`.

---

# 11. Employment Type

Kolom:

```txt
employment_type_code
```

Accepted values:

| Code | Label        |
| ---- | ------------ |
| `UP` | Under Pilar  |
| `OS` | Outsourced   |
| `HL` | Harian Lepas |

Contoh:

```txt
username | employment_type_code
jdoe     | UP
```

FE mapping:

```js
const EMPLOYMENT_TYPE_LABELS = {
  UP: 'Under Pilar',
  OS: 'Outsourced',
  HL: 'Harian Lepas',
};
```

---

# 12. is_active Values

Kolom:

```txt
is_active
```

Accepted truthy values:

```txt
1
true
yes
y
active
aktif
```

Accepted falsy values:

```txt
0
false
no
n
inactive
nonactive
nonaktif
```

Output ke database:

```txt
1 or 0
```

---

# 13. Import Response

Success response:

```json
{
  "message": "User import finished",
  "summary": {
    "created": 2,
    "updated": 5,
    "skipped": 1,
    "failed": 1
  },
  "results": [
    {
      "row": 2,
      "username": "jdoe",
      "status": "created",
      "message": "User created successfully."
    },
    {
      "row": 3,
      "username": "asmith",
      "status": "updated",
      "message": "User updated successfully."
    },
    {
      "row": 4,
      "username": "bwayne",
      "status": "skipped",
      "message": "No filled column to update."
    },
    {
      "row": 5,
      "username": "unknown",
      "status": "failed",
      "message": "Job level ID does not exist."
    }
  ]
}
```

Summary meaning:

| Status    | Meaning                                          |
| --------- | ------------------------------------------------ |
| `created` | Row berhasil create user baru.                   |
| `updated` | Row berhasil update user existing.               |
| `skipped` | Row valid tapi tidak ada data yang perlu diubah. |
| `failed`  | Row gagal diproses karena validasi/error.        |

FE disarankan menampilkan hasil import dalam table modal/page.

---

# 14. Error Response

## Missing File

Status:

```http
422 Unprocessable Entity
```

Example:

```json
{
  "message": "The file field is required.",
  "errors": {
    "file": [
      "The file field is required."
    ]
  }
}
```

## Invalid Header: Missing Username

Status:

```http
422 Unprocessable Entity
```

Example:

```json
{
  "message": "Invalid import file. Header username is required."
}
```

## Invalid Header: Unknown Header

Status:

```http
422 Unprocessable Entity
```

Example:

```json
{
  "message": "Invalid import file. Unknown header found.",
  "unknown_headers": ["division"],
  "supported_headers": [
    "username",
    "password",
    "name",
    "email",
    "phone",
    "job_position",
    "job_level_id",
    "employment_type_code",
    "internal_id",
    "department_ids",
    "primary_department_id",
    "company_ids",
    "primary_company_id",
    "apps",
    "is_active"
  ]
}
```

## Server Error

Status:

```http
500 Internal Server Error
```

Example:

```json
{
  "message": "Error while importing users",
  "error": "Error message here"
}
```

---

# 15. FE Page Recommendation

Tambahkan section/menu di User Management:

```txt
Import Users
```

UI component yang disarankan:

```txt
1. Button Download Template
2. File Upload input/dropzone
3. Button Import
4. Loading state saat upload
5. Result summary setelah import
6. Result table per row
```

Example result table columns:

```txt
row
username
status
message
```

Badge color recommendation:

```txt
created = green
updated = blue
skipped = gray
failed = red
```

---

# 16. FE Checklist

## Download Template

* Call `GET /api/users/import-template`
* Use `responseType: 'blob'`
* Save as `.xlsx`

## Upload Import

* Use `multipart/form-data`
* Form field name must be:

```txt
file
```

* Call:

```http
POST /api/users/import
```

## Validation on FE

FE minimal bisa validate:

```txt
file selected
file extension .xlsx / .xls / .csv
```

Backend tetap menjadi source of truth untuk row validation.

## Result Handling

Setelah import success:

* Show summary created/updated/skipped/failed.
* Show row-level result.
* Refresh user list jika ada created/updated.
* Kalau ada failed rows, tampilkan message supaya user bisa revise Excel.

---

# 17. Important Notes

* Import user hanya untuk IT.
* `username` adalah unique key import.
* Untuk update existing user, `password` tidak wajib.
* Untuk create new user, `password` wajib.
* Blank cell tidak menghapus data.
* `apps`, `department_ids`, dan `company_ids` kalau terisi akan replace mapping lama.
* `apps` harus menggunakan app slug dari `master_projects`.
* `department_ids` harus menggunakan ID dari `master_departments`.
* `company_ids` harus menggunakan ID dari `master_companies`.
* Template reference sheet hanya panduan, bukan data yang diproses backend.
* Backend hanya memproses sheet `Users`.
