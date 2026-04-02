import { useEffect, useState } from 'react'

import BackgroundMain from '@/components/Template/BackgroundMain'
import Header from '@/components/Template/Header'
import Sidebar from '@/components/Template/Sidebar'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { getStoredUser } from '@/services/api'

const defaultUser = {
  name: 'Al fatih',
  role: 'Frontend Developer',
}

function normalizeUser(user) {
  const normalizedName =
    user?.name ||
    user?.full_name ||
    user?.fullName ||
    user?.username ||
    defaultUser.name

  const normalizedRole =
    user?.role ||
    user?.job_position ||
    user?.jobPosition ||
    user?.position ||
    user?.department ||
    defaultUser.role

  return {
    ...defaultUser,
    ...user,
    name: normalizedName,
    role: normalizedRole,
  }
}

function AppLayout({
  children,
  className = '',
  headerProps = {},
  user,
}) {
  const isDesktop = useBreakpoint('lg')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const resolvedUser = normalizeUser({
    ...(getStoredUser() || {}),
    ...(user || {}),
  })

  useEffect(() => {
    if (isDesktop) {
      setIsMobileSidebarOpen(false)
      return
    }

    setIsSidebarCollapsed(false)
  }, [isDesktop])

  const sidebarCollapsed = isDesktop && isSidebarCollapsed
  const appShellClassName = [
    'dashboard-shell',
    sidebarCollapsed ? 'dashboard-shell--sidebar-collapsed' : '',
    isMobileSidebarOpen ? 'dashboard-shell--sidebar-open' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={appShellClassName}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={!isDesktop && isMobileSidebarOpen}
        activePath={headerProps.activePath ?? '/dashboard'}
        userName={resolvedUser.name}
        userRole={resolvedUser.role}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="dashboard-stage">
        <Header
          {...headerProps}
          showMenuButton={!isDesktop}
          onMenuToggle={() => setIsMobileSidebarOpen(true)}
          userName={resolvedUser.name}
          userRole={resolvedUser.role}
        />

        <main
          className="dashboard-main"
          style={{ position: 'relative', overflow: 'hidden', isolation: 'isolate' }}
        >
          <BackgroundMain />
          <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
        </main>
      </div>

      <button
        type="button"
        className={`sidebar-overlay${!isDesktop && isMobileSidebarOpen ? ' active' : ''}`}
        aria-label="Close sidebar overlay"
        tabIndex={!isDesktop && isMobileSidebarOpen ? 0 : -1}
        onClick={() => setIsMobileSidebarOpen(false)}
      />
    </div>
  )
}

export default AppLayout
