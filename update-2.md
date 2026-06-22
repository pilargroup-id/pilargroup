# Pilargroup API Update Documentation

Dokumentasi ini menjelaskan perubahan endpoint User Management dan penambahan endpoint Master Business Unit.

---

# 1. User Management Changes

## 1.1 Access Permission

User Management sekarang bisa diakses oleh 2 department:

| Department |  ID | Access         |
| ---------- | --: | -------------- |
| IT         | `8` | Full access    |
| HCGA       | `1` | Limited access |

## 1.2 Access Rule

### IT

User department IT punya akses penuh:

* List user
* Detail user
* Add user
* Update user
* Toggle active/inactive
* Delete user
* Manage apps/project access

### HCGA

User department HCGA bisa:

* List user
* Detail user
* Add user
* Update user
* Toggle active/inactive

HCGA tidak bisa:

* Delete user
* Add/update apps/project access

HCGA hanya boleh manage user dengan kondisi:

```txt
master_job_levels.level > 1
```

atau:

```txt
master_job_levels.level = 1
AND central_users.job_position = "Admin Human Capital"
```

Kalau target user tidak memenuhi rule tersebut, API akan return `403`.

---

# 2. New User Field

## Field Name

```txt
employment_type_code
```

## Possible Values

| Value | Label        |
| ----- | ------------ |
| `UP`  | Under Pilar  |
| `OS`  | Outsourced   |
| `HL`  | Harian Lepas |

## FE Mapping Example

```js
const EMPLOYMENT_TYPE_LABELS = {
  UP: 'Under Pilar',
  OS: 'Outsourced',
  HL: 'Harian Lepas',
};
```

## Dropdown Options Example

```js
const employmentTypeOptions = [
  { value: 'UP', label: 'Under Pilar' },
  { value: 'OS', label: 'Outsourced' },
  { value: 'HL', label: 'Harian Lepas' },
];
```

---

# 3. User Management Endpoints

## 3.1 Get User List

```http
GET /api/users
```

Access:

```txt
IT, HCGA
```

Response item sekarang include:

```json
{
  "employment_type_code": "UP"
}
```

Example response item:

```json
{
  "id": "uuid-user",
  "internal_id": 123,
  "username": "johndoe",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "08123456789",
  "job_position": "Manager",
  "job_level_id": 5,
  "employment_type_code": "UP",
  "job_level": "Manager",
  "job_level_value": 4,
  "is_active": 1,
  "departments": [],
  "companies": [],
  "apps": ["ticket", "lawdesk"]
}
```

---

## 3.2 Get User Detail

```http
GET /api/users/{id}
```

Access:

```txt
IT, HCGA
```

Response detail juga include:

```json
{
  "employment_type_code": "UP"
}
```

---

## 3.3 Create User

```http
POST /api/users
```

Access:

```txt
IT, HCGA
```

### Payload untuk IT

IT wajib kirim `apps`.

```json
{
  "username": "johndoe",
  "password": "password123",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "08123456789",
  "job_position": "Manager",
  "job_level_id": 5,
  "employment_type_code": "UP",
  "internal_id": 123,
  "departments": [
    {
      "id": 8,
      "is_primary": true
    }
  ],
  "companies": [
    {
      "id": "comp-pnm-0001",
      "is_primary": true
    }
  ],
  "apps": ["ticket", "lawdesk"]
}
```

### Payload untuk HCGA

HCGA jangan kirim field `apps`.

```json
{
  "username": "johndoe",
  "password": "password123",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "08123456789",
  "job_position": "Manager",
  "job_level_id": 5,
  "employment_type_code": "UP",
  "internal_id": 123,
  "departments": [
    {
      "id": 1,
      "is_primary": true
    }
  ],
  "companies": [
    {
      "id": "comp-pnm-0001",
      "is_primary": true
    }
  ]
}
```

### Required Fields

```txt
username
password
name
departments
```

### Optional Fields

```txt
email
phone
job_position
job_level_id
employment_type_code
internal_id
companies
apps
```

Notes:

* Untuk HCGA, hide section apps/project access.
* Untuk HCGA, jangan kirim `apps`.
* Kalau HCGA mengirim `apps`, API return `403`.

---

## 3.4 Update User

```http
PUT /api/users/{id}
```

Access:

```txt
IT, HCGA
```

### Payload untuk IT

IT boleh update semua field termasuk `apps`.

```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com",
  "phone": "08123456789",
  "job_position": "Senior Manager",
  "job_level_id": 4,
  "employment_type_code": "UP",
  "internal_id": 123,
  "departments": [
    {
      "id": 8,
      "is_primary": true
    }
  ],
  "companies": [
    {
      "id": "comp-pnm-0001",
      "is_primary": true
    }
  ],
  "apps": ["ticket", "lawdesk", "papertrail"]
}
```

### Payload untuk HCGA

HCGA jangan kirim field `apps`.

```json
{
  "name": "John Doe Updated",
  "email": "john.updated@example.com",
  "phone": "08123456789",
  "job_position": "Senior Manager",
  "job_level_id": 4,
  "employment_type_code": "UP",
  "internal_id": 123,
  "departments": [
    {
      "id": 1,
      "is_primary": true
    }
  ],
  "companies": [
    {
      "id": "comp-pnm-0001",
      "is_primary": true
    }
  ]
}
```

Notes:

* Untuk HCGA, hide section apps/project access.
* Untuk HCGA, jangan kirim `apps`.
* HCGA tidak bisa update user yang current data-nya tidak memenuhi rule access.
* Setelah update, final data user juga harus tetap memenuhi rule access.

---

## 3.5 Toggle User Active/Inactive

Endpoint baru:

```http
PATCH /api/users/{id}/status
```

Access:

```txt
IT, HCGA
```

Request aktifkan user:

```json
{
  "is_active": true
}
```

Request nonaktifkan user:

```json
{
  "is_active": false
}
```

Success response:

```json
{
  "message": "User berhasil diaktifkan",
  "data": {
    "id": "uuid-user",
    "is_active": 1
  }
}
```

atau:

```json
{
  "message": "User berhasil dinonaktifkan",
  "data": {
    "id": "uuid-user",
    "is_active": 0
  }
}
```

Notes:

* Untuk toggle dari table/list user, gunakan endpoint ini.
* Jangan pakai `PUT /api/users/{id}` hanya untuk toggle status.
* HCGA tetap terkena rule target user.

---

## 3.6 Delete User

```http
DELETE /api/users/{id}
```

Access:

```txt
IT only
```

Notes:

* Untuk HCGA, hide tombol delete.
* Kalau HCGA mencoba delete, API return `403`.

---

# 4. Master Job Levels

```http
GET /api/master/job-levels
```

Access:

```txt
IT, HCGA
```

Notes:

* Endpoint ini perlu bisa diakses HCGA karena form create/update user butuh dropdown job level.

---

# 5. New Master Business Unit CRUD

## 5.1 Concept

Business Unit menggunakan 2 tabel:

```txt
master_business_units
master_business_unit_departments
```

Namun dari sisi API/FE, tidak dibuat CRUD pivot terpisah.

Konsep yang dipakai:

```txt
CRUD Business Unit dengan nested departments
```

Artinya FE cukup create/update Business Unit dan mengirim array `departments`. BE otomatis handle insert/update ke tabel pivot `master_business_unit_departments`.

Untuk saat ini implementasi backend tidak menggunakan Model/Eloquent dulu. Controller menggunakan Query Builder:

```php
DB::connection('pilargroup')->table(...)
```

Alasannya:

* Konsisten dengan pola existing project.
* Lebih cepat dan eksplisit.
* Tidak menambah file model baru.
* Relasi nested masih sederhana.
* Koneksi `pilargroup` tetap jelas di setiap query.

---

## 5.2 Business Unit Endpoints

Base path:

```http
/api/master/business-units
```

Access:

```txt
IT only
```

Endpoint list:

```http
GET /api/master/business-units
```

Endpoint create:

```http
POST /api/master/business-units
```

Endpoint detail:

```http
GET /api/master/business-units/{id}
```

Endpoint update:

```http
PUT /api/master/business-units/{id}
```

Endpoint toggle active/inactive:

```http
PATCH /api/master/business-units/{id}/status
```

Endpoint delete:

```http
DELETE /api/master/business-units/{id}
```

---

## 5.3 Get Business Unit List

```http
GET /api/master/business-units
```

Query params available:

```txt
search
company_id
is_active
```

Example:

```http
GET /api/master/business-units?search=gosave
```

```http
GET /api/master/business-units?company_id=comp-pnm-0001
```

```http
GET /api/master/business-units?is_active=1
```

Success response:

```json
{
  "message": "Business units fetched successfully",
  "data": [
    {
      "id": "bu-gosave-0001",
      "company_id": "comp-pnm-0001",
      "company_code": "PNM",
      "company_name": "PT Pilar Niaga Makmur",
      "code": "GOSAVE",
      "name": "GOSAVE",
      "is_active": 1,
      "created_at": "2026-06-22 10:00:00",
      "updated_at": "2026-06-22 10:00:00",
      "departments": [
        {
          "pivot_id": "uuid-pivot",
          "id": 4,
          "name": "Gosave GT",
          "class": "Gosave GT",
          "code": "GSG",
          "company_id": "comp-pnm-0001",
          "parent_id": null,
          "is_primary": 1,
          "is_active": 1,
          "created_at": "2026-06-22 10:00:00",
          "updated_at": "2026-06-22 10:00:00"
        }
      ]
    }
  ]
}
```

---

## 5.4 Get Business Unit Detail

```http
GET /api/master/business-units/{id}
```

Success response:

```json
{
  "message": "Business unit fetched successfully",
  "data": {
    "id": "bu-gosave-0001",
    "company_id": "comp-pnm-0001",
    "company_code": "PNM",
    "company_name": "PT Pilar Niaga Makmur",
    "code": "GOSAVE",
    "name": "GOSAVE",
    "is_active": 1,
    "created_at": "2026-06-22 10:00:00",
    "updated_at": "2026-06-22 10:00:00",
    "departments": [
      {
        "pivot_id": "uuid-pivot",
        "id": 4,
        "name": "Gosave GT",
        "class": "Gosave GT",
        "code": "GSG",
        "company_id": "comp-pnm-0001",
        "parent_id": null,
        "is_primary": 1,
        "is_active": 1,
        "created_at": "2026-06-22 10:00:00",
        "updated_at": "2026-06-22 10:00:00"
      }
    ]
  }
}
```

---

## 5.5 Create Business Unit

```http
POST /api/master/business-units
```

Request body:

```json
{
  "company_id": "comp-pnm-0001",
  "code": "GOSAVE",
  "name": "GOSAVE",
  "is_active": true,
  "departments": [
    {
      "id": 4,
      "is_primary": true
    },
    {
      "id": 6,
      "is_primary": false
    },
    {
      "id": 16,
      "is_primary": false
    },
    {
      "id": 18,
      "is_primary": false
    }
  ]
}
```

Required fields:

```txt
company_id
code
name
departments
departments.*.id
```

Optional fields:

```txt
is_active
departments.*.is_primary
departments.*.is_active
```

Notes:

* `id` business unit dibuat otomatis oleh BE.
* `code` akan disimpan uppercase.
* `departments` minimal 1.
* Kalau tidak ada department yang `is_primary = true`, BE otomatis menjadikan department pertama sebagai primary.
* Kalau ada lebih dari 1 department yang `is_primary = true`, BE hanya akan mengambil primary pertama.
* Semua selected departments harus belong ke company yang sama dengan `company_id`.

Success response:

```json
{
  "message": "Business unit created successfully",
  "data": {
    "id": "uuid-business-unit"
  }
}
```

---

## 5.6 Update Business Unit

```http
PUT /api/master/business-units/{id}
```

Request body full update:

```json
{
  "company_id": "comp-pnm-0001",
  "code": "GOTO",
  "name": "GOTO",
  "is_active": true,
  "departments": [
    {
      "id": 3,
      "is_primary": true
    },
    {
      "id": 5,
      "is_primary": false
    },
    {
      "id": 15,
      "is_primary": false
    },
    {
      "id": 19,
      "is_primary": false
    }
  ]
}
```

Request body partial update:

```json
{
  "name": "GOTO Updated"
}
```

Notes:

* Field bersifat optional.
* Kalau `departments` dikirim, BE akan replace seluruh mapping department lama dengan mapping baru.
* Kalau `departments` tidak dikirim, mapping department lama tidak berubah.
* Kalau `company_id` berubah, selected/existing departments harus tetap belong ke company baru.
* `code` akan disimpan uppercase.
* `code` harus unique.
* `name` harus unique.

Success response:

```json
{
  "message": "Business unit updated successfully"
}
```

---

## 5.7 Toggle Business Unit Active/Inactive

```http
PATCH /api/master/business-units/{id}/status
```

Request body aktifkan:

```json
{
  "is_active": true
}
```

Request body nonaktifkan:

```json
{
  "is_active": false
}
```

Success response:

```json
{
  "message": "Business unit deactivated successfully",
  "data": {
    "id": "uuid-business-unit",
    "is_active": 0
  }
}
```

Notes:

* Endpoint ini hanya update `master_business_units.is_active`.
* Tidak otomatis mengubah `master_business_unit_departments.is_active`.

---

## 5.8 Delete Business Unit

```http
DELETE /api/master/business-units/{id}
```

Access:

```txt
IT only
```

Success response:

```json
{
  "message": "Business unit deleted successfully"
}
```

Notes:

* Delete business unit juga menghapus mapping department di `master_business_unit_departments`.
* Dari schema DB, relation sudah `ON DELETE CASCADE`, tapi BE tetap explicit delete pivot dulu agar flow jelas.

---

# 6. Business Unit FE Form Recommendation

Form Business Unit sebaiknya berisi:

```txt
Company
Code
Name
Status Active/Inactive
Departments
```

Bagian departments sebaiknya berupa:

```txt
Multi-select / checkbox department
Primary department selector
```

Contoh UI table:

```txt
Department Name        Primary
Gosave GT              Yes
Warehouse Gosave       No
Gosave B2B             No
Gosave E-Commerce      No
```

Payload yang dikirim FE:

```json
{
  "company_id": "comp-pnm-0001",
  "code": "GOSAVE",
  "name": "GOSAVE",
  "is_active": true,
  "departments": [
    {
      "id": 4,
      "is_primary": true
    },
    {
      "id": 6,
      "is_primary": false
    }
  ]
}
```

---

# 7. Business Unit Error Handling

## Business unit not found

Status:

```http
404 Not Found
```

Response:

```json
{
  "message": "Business unit not found"
}
```

## Department company mismatch

Status:

```http
422 Unprocessable Entity
```

Response:

```json
{
  "message": "All selected departments must belong to the selected company."
}
```

## Company changed but existing departments invalid

Status:

```http
422 Unprocessable Entity
```

Response:

```json
{
  "message": "Existing departments do not belong to the selected company. Please send departments payload when changing company."
}
```

## Duplicate code

Status:

```http
422 Unprocessable Entity
```

Laravel validation response example:

```json
{
  "message": "The code has already been taken.",
  "errors": {
    "code": [
      "The code has already been taken."
    ]
  }
}
```

## Duplicate name

Status:

```http
422 Unprocessable Entity
```

Laravel validation response example:

```json
{
  "message": "The name has already been taken.",
  "errors": {
    "name": [
      "The name has already been taken."
    ]
  }
}
```

---

# 8. FE Adjustment Checklist

## User Management

* Tambahkan field `employment_type_code`.
* Tambahkan dropdown:

  * `UP` = Under Pilar
  * `OS` = Outsourced
  * `HL` = Harian Lepas
* Toggle active/inactive pakai:

  * `PATCH /api/users/{id}/status`
* Untuk IT:

  * Show apps/project access section.
  * Show delete button.
* Untuk HCGA:

  * Hide apps/project access section.
  * Hide delete button.
  * Jangan kirim `apps`.
  * Tetap validasi target user berdasarkan `job_level_value` dan `job_position`.

## Business Unit

* Tambahkan menu/page Master Business Unit.
* Consume endpoint:

  * `GET /api/master/business-units`
  * `POST /api/master/business-units`
  * `GET /api/master/business-units/{id}`
  * `PUT /api/master/business-units/{id}`
  * `PATCH /api/master/business-units/{id}/status`
  * `DELETE /api/master/business-units/{id}`
* Form harus support nested departments.
* Jangan buat UI CRUD pivot terpisah.
* Saat update departments, kirim full departments array karena BE akan replace mapping lama.
* Saat hanya update name/code/status, tidak perlu kirim departments.
* Filter list bisa pakai:

  * `search`
  * `company_id`
  * `is_active`

## Recommended FE Helpers

```js
const HCGA_DEPARTMENT_ID = 1;
const IT_DEPARTMENT_ID = 8;

function isIT(user) {
  return user?.departments?.some((dept) => Number(dept.id) === IT_DEPARTMENT_ID);
}

function isHCGA(user) {
  return user?.departments?.some((dept) => Number(dept.id) === HCGA_DEPARTMENT_ID);
}

function canHCGAManageUser(targetUser) {
  const level = Number(targetUser?.job_level_value);
  const jobPosition = targetUser?.job_position;

  return level > 1 || (level === 1 && jobPosition === 'Admin Human Capital');
}
```
