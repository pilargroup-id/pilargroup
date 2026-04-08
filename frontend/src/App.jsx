import { useEffect, useState } from 'react'

import { defaultNavigationPath } from '@/constants/navigation'
import DashboardPage from '@/pages/DashboardPage'
import LoginPage from '@/pages/LoginPage'
import MasterDepartementsPage from '@/pages/MasterDepartements'
import MasterProjectPage from '@/pages/MasterProject'
import UserPage from '@/pages/UserPage'
import { isAuthenticated, getToken } from '@/services/api'  // tambah getToken
import { canAccessPath } from '@/services/accessControl'
import '@/assets/styles/app.css'

const routes = {
  '/dashboard': DashboardPage,
  '/login': LoginPage,
  '/master-departments': MasterDepartementsPage,
  '/master-project': MasterProjectPage,
  '/users': UserPage,
}

// Handle SAML respond jika user sudah login dan ada saml_token di URL
async function handleSamlIfNeeded() {
  const params = new URLSearchParams(window.location.search)
  const samlToken = params.get('saml_token')

  if (!samlToken || !isAuthenticated()) return false

  try {
    const token = getToken()  // ambil JWT dari localStorage
    const res = await fetch('/api/saml/respond', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ saml_token: samlToken }),
    })

    if (!res.ok) return false

    const html = await res.text()
    document.open()
    document.write(html)
    document.close()
    return true  // stop normal flow

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
  const [currentPath, setCurrentPath] = useState(() => resolvePath(window.location.pathname))

  useEffect(() => {
    // Cek SAML dulu sebelum routing normal
    handleSamlIfNeeded().then((handled) => {
      if (handled) return  // dokumen sudah di-replace, stop

      const syncRoute = () => {
        const nextPath = resolvePath(window.location.pathname)

        if (window.location.pathname !== nextPath) {
          window.history.replaceState({}, '', nextPath)
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