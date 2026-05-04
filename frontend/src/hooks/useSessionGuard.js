import { useEffect, useRef } from 'react'
import { clearAuthSession, getToken, setStoredUser } from '@/services/api'

const POLL_INTERVAL = 5_000
const STATUS_URL = '/api/auth/status'

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
  window.location.href = '/login'
}

export function useSessionGuard() {
  const intervalRef = useRef(null)

  useEffect(() => {
    const token = getToken()
    if (!token) return

    // Kalau cv belum ada di localStorage, refresh dari /api/auth/me dulu
    if (getStoredCv() === null) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(user => {
          if (user) setStoredUser(user)
        })
        .catch(() => {})
    }

    const check = async () => {
      try {
        const res = await fetch(STATUS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.status === 401) {
          handleExpired()
          return
        }

        if (!res.ok) return

        const data = await res.json()

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
    intervalRef.current = setInterval(check, POLL_INTERVAL)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        check()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}