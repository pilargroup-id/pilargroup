# API Documentation — pilargroup.id (Central Auth)

Base URL: `https://pilargroup.id/api` | Local: `http://localhost:8000/api`

---

## Auth

### Login
`POST /auth/login`
```json
{ "username": "azi.fauzi", "password": "password123" }
```
Response `200`:
```json
{
  "token": "eyJ...",
  "user": { "id", "internal_id", "username", "name", "email", "phone", "department", "job_position", "job_level", "apps": ["touchpoint", "treeview"] }
}
```

### Logout
`POST /auth/logout` 🔒

### Cek User Login
`GET /auth/me` 🔒

### Ganti Username / Password
`PUT /auth/change-profile` 🔒
```json
{ "current_password": "lama", "new_username": "baru", "new_password": "baru123" }
```

---

## User Management *(IT only)* 🔒

### List Semua User
`GET /users`

### Detail User
`GET /users/{id}`

### Register User Baru
`POST /users`
```json
{
  "username": "benny", "password": "pass123", "name": "Benny",
  "email": "benny@mail.com", "phone": "08123456789",
  "department": "Gosave GT", "job_position": "Sales GT", "job_level": "Staff",
  "internal_id": 3355, "apps": ["touchpoint", "treeview"]
}
```

### Update User
`PUT /users/{id}` — semua field opsional kecuali `id`
```json
{ "is_active": false, "apps": ["touchpoint"] }
```

---

## Catatan FE

**Authorization Header** (semua endpoint 🔒):
```
Authorization: Bearer {token}
```

**Simpan token** di `localStorage` setelah login:
```js
localStorage.setItem('token', response.data.token)
```

**Redirect ke subsistem** — passing token via URL:
```
https://touchpoint.pilargroup.id?token={token}
https://treeview.pilargroup.id?token={token}
```
FE subsistem ambil token dari URL lalu simpan ke `localStorage`.

**Tampilkan menu berdasarkan `apps`** di JWT payload:
```js
const apps = user.apps // ["touchpoint", "treeview"]
// Tampilkan menu sesuai isi array
```

**Menu Change Profile** di subsistem → redirect ke:
```
https://pilargroup.id/change-profile
```

**Menu User Management** → hanya tampil jika `department === 'IT'`
