import { useEffect, useState } from 'react'

import { defaultNavigationPath } from '@/constants/navigation'
import DashboardPage from '@/pages/DashboardPage'
import LoginPage from '@/pages/LoginPage'
import MasterDepartementsPage from '@/pages/MasterDepartements'
import MasterProjectPage from '@/pages/MasterProject'
import UserPage from '@/pages/UserPage'
import { isAuthenticated, getToken } from '@/services/api'
import { canAccessPath } from '@/services/accessControl'
import '@/assets/styles/app.css'
import { useSessionGuard } from '@/hooks/useSessionGuard'

const routes = {
  '/dashboard': DashboardPage,
  '/login': LoginPage,
  '/master-departments': MasterDepartementsPage,
  '/master-project': MasterProjectPage,
  '/users': UserPage,
}

// Handle return_url saat user sudah login (misal: direct akses dari sub-project)
function handleReturnUrlIfNeeded() {
  if (!isAuthenticated()) return false

  const params = new URLSearchParams(window.location.search)
  const returnUrl = params.get('return_url')

  if (!returnUrl) return false

  try {
    const target = new URL(returnUrl)
    if (target.hostname.endsWith('pilargroup.id')) {
      const token = getToken()
      target.searchParams.set('token', token)
      window.location.href = target.toString()
      return true
    }
  } catch {
    // URL tidak valid, lanjut normal
  }

  return false
}

async function handleSsoAuthorizeIfNeeded() {
  if (!isAuthenticated()) return false

  const params = new URLSearchParams(window.location.search)
  const ssoAuthorize = params.get('sso_authorize')
  const clientId     = params.get('client_id')
  const redirectUri  = params.get('redirect_uri')
  const ssoState     = params.get('state')

  if (!ssoAuthorize || !clientId || !redirectUri || !ssoState) return false

  try {
    const token = getToken()
    const ssoParams = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state: ssoState })

    const res = await fetch(`/api/sso/authorize?${ssoParams}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      }
    })

    if (res.ok) {
      const data = await res.json()
      window.location.href = data.redirect_url
      return true
    }
  } catch {
    // fallback
  }

  return false
}

// Handle SAML respond jika user sudah login dan ada saml_token di URL
async function handleSamlIfNeeded() {
  const params = new URLSearchParams(window.location.search)
  const samlToken = params.get('saml_token')

  if (!samlToken || !isAuthenticated()) return false

  try {
    const token = getToken()
    const res = await fetch('/api/saml/respond', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ saml_token: samlToken }),
    })

    if (res.status === 400) {
      window.location.href = 'https://pilargroup.id/dashboard'
      return true
    }

    if (!res.ok) {
      window.location.href = 'https://pilargroup.id/dashboard'
      return true
    }

    const html = await res.text()

    if (!html.includes('SAMLResponse')) {
      window.location.href = 'https://pilargroup.id/dashboard'
      return true
    }

    const parsed = new DOMParser().parseFromString(html, 'text/html')

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = parsed.querySelector('form')?.action ?? ''

    const inputSaml = document.createElement('input')
    inputSaml.type = 'hidden'
    inputSaml.name = 'SAMLResponse'
    inputSaml.value = parsed.querySelector('input[name="SAMLResponse"]')?.value ?? ''

    const inputRelay = document.createElement('input')
    inputRelay.type = 'hidden'
    inputRelay.name = 'RelayState'
    inputRelay.value = parsed.querySelector('input[name="RelayState"]')?.value ?? ''

    form.appendChild(inputSaml)
    form.appendChild(inputRelay)
    document.body.appendChild(form)
    form.submit()
    return true

  } catch {
    return false
  }
}

function resolvePath(pathname) {
  if (!isAuthenticated()) {
    return '/login'
  }

  if (pathname === '/') {
    return defaultNavigationPath
  }

  if (pathname === '/login') {
    return defaultNavigationPath
  }

  if (Object.hasOwn(routes, pathname)) {
    return canAccessPath(pathname) ? pathname : defaultNavigationPath
  }

  return defaultNavigationPath
}

function App() {
    console.log('App init URL:', window.location.href)
  const [currentPath, setCurrentPath] = useState(() => resolvePath(window.location.pathname))
  console.log('resolvePath called, pathname:', window.location.pathname, 'search:', window.location.search)
  useSessionGuard()

  useEffect(() => {
    // 1. Cek return_url dulu (dari sub-project redirect)
    const returnHandled = handleReturnUrlIfNeeded()
    if (returnHandled) return

    // 2. Cek SAML
    handleSamlIfNeeded().then((handled) => {
      if (handled) return

      const syncRoute = () => {
        const nextPath = resolvePath(window.location.pathname)

        if (window.location.pathname !== nextPath) {
            const search = nextPath === '/login' ? window.location.search : ''
            window.history.replaceState({}, '', nextPath + search)
        }

        setCurrentPath(nextPath)
      }

      syncRoute()
      window.addEventListener('popstate', syncRoute)
    })

    return () => {
      window.removeEventListener('popstate', () => {})
    }
  }, [])

  const ActivePage = routes[currentPath] ?? DashboardPage

  return <ActivePage />
}

export default App