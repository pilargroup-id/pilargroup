import { useEffect } from 'react'
import { clearAuthSession, getToken, setStoredUser } from '@/services/api'

const POLL_INTERVAL = 5_000
const STATUS_URL = '/api/auth/status'
const LOGIN_PATH = '/login'

function getStoredCv() {
  try {
    const raw = localStorage.getItem('auth_user')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.cv ?? null
  } catch {
    return null
  }
}

function handleExpired() {
  clearAuthSession()

  // Sudah di halaman login → jangan reload, supaya input user tidak hilang
  if (window.location.pathname === LOGIN_PATH) return

  window.location.href = LOGIN_PATH
}

export function useSessionGuard() {
  useEffect(() => {
    let cvRefreshedFor = null

    const check = async () => {
      // Selalu baca token terbaru (bisa berubah karena login/logout tanpa reload)
      const token = getToken()
      if (!token) return

      // Kalau cv belum ada di localStorage, refresh dari /api/auth/me dulu (sekali per token)
      if (getStoredCv() === null && cvRefreshedFor !== token) {
        cvRefreshedFor = token
        try {
          const r = await fetch('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          const user = r.ok ? await r.json() : null
          if (user && getToken() === token) setStoredUser(user)
        } catch {
          // skip
        }
      }

      try {
        const res = await fetch(STATUS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        })

        // Token sudah berganti/dihapus selama request berjalan → abaikan hasil lama
        if (getToken() !== token) return

        if (res.status === 401) {
          handleExpired()
          return
        }

        if (!res.ok) return

        const data = await res.json()
        if (getToken() !== token) return

        if (!data.valid) {
          handleExpired()
          return
        }

        const storedCv = getStoredCv()
        if (data.token_version !== undefined) {
          if (storedCv === null || Number(storedCv) !== Number(data.token_version)) {
            handleExpired()
          }
        }
      } catch {
        // network error sementara, skip
      }
    }

    check()
    const intervalId = setInterval(check, POLL_INTERVAL)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        check()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
