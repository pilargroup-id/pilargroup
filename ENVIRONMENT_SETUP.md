# Environment Setup Guide

## Overview
Project ini punya **2 .env files**:
- **Backend** (`backend/.env`) - Konfigurasi Laravel API server
- **Frontend** (`frontend/.env`) - Konfigurasi API proxy untuk Vite dev server

---

## Backend Setup

### Development
```bash
cd backend
cp .env.example .env
```
Update `.env`:
```env
APP_ENV=local
APP_KEY=base64:... # Generate dengan: php artisan key:generate
APP_URL=http://localhost:8000
DB_CONNECTION=sqlite
```

### Production (VM)
```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com
DB_CONNECTION=mysql # atau sesuai config
```

---

## Frontend Setup

### Development
```bash
cd frontend
cp .env.example .env.development
```
File `.env.development`:
```env
VITE_API_BASE_URL=/api
VITE_API_PROXY_TARGET=http://localhost:8000
```

**Cara Kerja:**
- Vite dev server (`http://localhost:5173`) intercept `/api` requests
- Proxy forward ke `http://localhost:8000` (backend)
- No CORS issues di dev

### Production (VM)
Buat `.env.production`:
```env
VITE_API_BASE_URL=/api
# Jangan set VITE_API_PROXY_TARGET (hanya di dev)
```

**Cara Kerja:**
- App akses `/api` (relative URL)
- Nginx/reverse proxy di VM forward ke backend
- No hardcoded localhost

---

## Vite Environment Handling

Vite otomatis load file `.env` sesuai `NODE_ENV`:

```bash
# Development
npm run dev
# → Load `.env.development`

# Build untuk production
npm run build
# → Load `.env.production`

# Preview build (local)
npm run preview
# → Load `.env.production`
```

---

## Quick Checklist

✅ Backend `.env` → Laravel config (APP_KEY, DB, etc)  
✅ Frontend `.env.development` → Dev proxy ke localhost:8000  
✅ Frontend `.env.production` → Relative URL `/api`  
✅ `.env` files di `.gitignore` (jangan commit ke repo)  

Selesai! Project siap development & deployment tanpa ubah code.
