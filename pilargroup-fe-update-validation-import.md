# PilarGroup User Import — IT, Admin Human Capital, dan Default Apps

## Ringkasan perubahan

Paket backend ini mencakup perubahan berikut:

- fitur import user dapat digunakan oleh IT dan Admin Human Capital tertentu;
- kolom `apps` tidak lagi ditampilkan pada template import;
- backend tetap mendukung header `apps` jika ditambahkan manual;
- hanya IT yang boleh mengatur `apps` melalui import;
- setiap user baru hasil import otomatis mendapatkan aplikasi default `ticket` dan `overtime`;
- aplikasi manual yang diisi IT digabung dengan aplikasi default;
- validasi hak akses `apps` dilakukan saat preview dan commit.

## Akses fitur import

Fitur import sebelumnya hanya dapat digunakan oleh user IT. Setelah perubahan ini, akses diberikan kepada:

1. User yang memiliki department dengan code `SIT` (IT), atau
2. User dengan kombinasi persis:
   - `job_level_id = 1`
   - `job_position = Admin Human Capital`

Akses tersebut berlaku untuk seluruh alur import user:

```text
Download template → Upload preview → Commit/Cancel → Download invalid file
```

## Endpoint

Semua endpoint berikut menggunakan middleware `user.import.access`:

```http
GET    /api/users/import-template
POST   /api/users/import/preview
POST   /api/users/import/{batchId}/commit
GET    /api/users/import/{batchId}/invalid-file
DELETE /api/users/import/{batchId}
```

URL dan format alur endpoint tidak berubah.

## Aturan kolom `apps`

Kolom `apps` dihilangkan dari sheet utama template import untuk mengurangi risiko pemberian akses aplikasi oleh requester non-IT.

Backend tetap mengenali header `apps` jika kolom tersebut ditambahkan secara manual.

Aturannya:

- IT boleh mengisi dan memproses kolom `apps`.
- Admin Human Capital boleh melakukan import user, tetapi tidak boleh mengisi atau mengubah `apps` secara manual.
- Jika requester non-IT mengisi `apps`, row menjadi `INVALID` dengan alasan:

```text
Application access can only be managed by IT users.
```

Validasi dilakukan dua kali:

1. Saat preview.
2. Saat commit, untuk mencegah bypass atau perubahan hak akses setelah preview.

## Aturan default apps untuk user baru

Setiap user baru yang dibuat melalui import otomatis mendapatkan:

```text
ticket
overtime
```

Aturan ini berlaku baik import dilakukan oleh IT maupun Admin Human Capital.

### User baru tanpa kolom `apps`

User otomatis mendapatkan:

```text
ticket,overtime
```

### User baru dengan `apps` yang diisi IT

Aplikasi dari file digabung dengan default `ticket` dan `overtime`. Duplikasi slug otomatis dihapus.

Contoh input:

```text
apps = itembase,lawdesk
```

Hasil akhir:

```text
ticket,overtime,itembase,lawdesk
```

### User baru dengan `apps` yang diisi Admin Human Capital

Row menjadi `INVALID`. Default apps tidak digunakan untuk membypass larangan pengelolaan akses aplikasi secara manual.

## Perilaku update user existing

- Jika kolom `apps` tidak ada atau kosong, akses aplikasi lama tetap dipertahankan.
- Jika kolom `apps` diisi oleh IT, akses aplikasi diproses sesuai nilai file.
- Jika kolom `apps` diisi oleh Admin Human Capital, row menjadi `INVALID`.
- Default `ticket` dan `overtime` hanya otomatis diterapkan saat create user baru, bukan saat update.

## Preview perubahan apps

Untuk row `CREATE`, response preview pada `changes.apps.new` menampilkan aplikasi final yang akan disimpan.

Contoh tanpa tambahan apps:

```json
{
  "apps": {
    "old": null,
    "new": ["ticket", "overtime"]
  }
}
```

Contoh import IT dengan tambahan app:

```json
{
  "apps": {
    "old": null,
    "new": ["ticket", "overtime", "itembase"]
  }
}
```

## Validasi master project

Slug `ticket` dan `overtime` wajib tersedia di tabel `master_projects`.

Jika salah satu default app tidak ditemukan, row create menjadi `INVALID` dengan error:

```text
One or more apps do not exist.
```

Backend tidak akan membuat user baru tanpa default apps secara diam-diam.

## Catatan untuk Frontend

Frontend tidak perlu mengirim flag role atau permission tambahan. Backend menentukan akses berdasarkan JWT dan data terbaru di database Pilargroup.

Hal yang perlu diperhatikan FE:

- template terbaru tidak menampilkan kolom `apps`;
- preview tetap menampilkan error per row dari backend;
- saat menerima HTTP `403`, tampilkan message dari backend;
- alur preview, commit, cancel, dan download invalid file tetap sama.

## File backend dalam paket

```text
app/Http/Middleware/UserImportAccess.php
app/Http/Controllers/UserImportController.php
bootstrap/app.php
routes/api.php
README.md
```
