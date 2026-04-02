import { useEffect, useState } from 'react'

import {
  defaultNavigationPath,
  implementedNavigationPaths,
} from '@/constants/navigation'
import DashboardPage from '@/pages/DashboardPage'
import LoginPage from '@/pages/LoginPage'
import MasterProjectPage from '@/pages/MasterProject'
import UserPage from '@/pages/UserPage'
import { isAuthenticated } from '@/services/api'
import '@/assets/styles/app.css'

const routes = {
  '/dashboard': DashboardPage,
  '/login': LoginPage,
  '/master-project': MasterProjectPage,
  '/users': UserPage,
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
    return pathname
  }

  if (implementedNavigationPaths.includes(pathname)) {
    return pathname
  }

  return defaultNavigationPath
}

function App() {
  const [currentPath, setCurrentPath] = useState(() => resolvePath(window.location.pathname))

  useEffect(() => {
    const syncRoute = () => {
      const nextPath = resolvePath(window.location.pathname)

      if (window.location.pathname !== nextPath) {
        window.history.replaceState({}, '', nextPath)
      }

      setCurrentPath(nextPath)
    }

    syncRoute()
    window.addEventListener('popstate', syncRoute)

    return () => {
      window.removeEventListener('popstate', syncRoute)
    }
  }, [])

  const ActivePage = routes[currentPath] ?? DashboardPage

  return <ActivePage />
}

export default App
