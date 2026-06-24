# User Export API Documentation

Dokumentasi ini menjelaskan cara FE menggunakan fitur download/export data user.

---

## 1. Overview

Fitur export digunakan untuk download semua data user dalam format Excel.

File export ini bisa dipakai untuk:

```txt
- review data user
- backup data user
- bahan update massal via Excel import
```

Export **tidak mengubah data** di database.

---

## 2. Access

Endpoint export bisa diakses oleh:

```txt
IT
HCGA
```

Backend middleware:

```txt
auth.central
user.management.access
```

Catatan:

```txt
HCGA boleh export/download data user.
HCGA tetap tidak boleh import user.
Import user tetap IT only.
```

---

## 3. Endpoint

```http
GET /api/users/export
```

Response:

```txt
File Excel .xlsx
```

Contoh nama file dari backend:

```txt
users_export_YYYYMMDD_HHMMSS.xlsx
```

---

## 4. FE Usage

Gunakan request dengan `responseType: 'blob'`.

```js
async function downloadUsersExport() {
  const response = await api.get('/users/export', {
    responseType: 'blob',
  });

  const blob = new Blob([response.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'users_export.xlsx';

  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}
```

---

## 5. Recommended Button

Tambahkan button di halaman User Management:

```txt
Export Users
```

Atau:

```txt
Download Users
```

Button ini boleh ditampilkan untuk:

```txt
IT
HCGA
```

---

## 6. Export Columns

File export menggunakan kolom yang sama dengan format import:

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

Catatan penting:

```txt
Kolom password selalu dikosongkan.
Password hash dari database tidak pernah diexport.
```

---

## 7. Many-to-Many Columns

Beberapa kolom berisi data list dengan format comma-separated.

### Departments

```txt
department_ids
primary_department_id
```

Contoh:

```txt
department_ids = 1,8
primary_department_id = 8
```

### Companies

```txt
company_ids
primary_company_id
```

Contoh:

```txt
company_ids = comp-pnm-0001
primary_company_id = comp-pnm-0001
```

### Apps

```txt
apps
```

Contoh:

```txt
apps = ticket,lawdesk,papertrail
```

Value `apps` menggunakan `slug` dari `master_projects`.

---

## 8. Reference Sheets

File export juga berisi reference sheet:

```txt
Job Levels Reference
Departments Reference
Companies Reference
Apps Reference
Employment Type Reference
```

Reference sheet hanya untuk panduan user saat membaca atau mengedit file Excel.

---

## 9. Notes for Re-import

File export bisa diedit lalu dipakai untuk import ulang oleh IT.

Karena rule import adalah patch by `username`:

```txt
kolom kosong tidak mengubah data
```

Maka kolom `password` yang kosong tidak akan mengubah password user saat file di-import ulang.

Contoh use case:

```txt
1. HCGA export data user.
2. HCGA edit kolom employment_type_code.
3. HCGA kirim file ke IT.
4. IT review dan import file.
5. Hanya kolom yang terisi di Excel yang akan diupdate.
```

---

## 10. Error Handling

Jika user tidak punya akses:

```http
403 Forbidden
```

Jika token invalid/expired:

```http
401 Unauthorized
```

FE behavior:

```txt
401 = clear token dan redirect login
403 = tampilkan forbidden/permission message
```

---

## 11. FE Checklist

```txt
- Tambahkan button Export Users di User Management.
- Button boleh tampil untuk IT dan HCGA.
- Call GET /api/users/export dengan responseType blob.
- Download response sebagai file .xlsx.
- Jangan tampilkan tombol import untuk HCGA.
- Import tetap hanya untuk IT.
```
