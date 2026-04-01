import { useEffect, useState } from 'react'

import Header from '@/components/Template/Header'
import Sidebar from '@/components/Template/Sidebar'
import { useBreakpoint } from '@/hooks/use-breakpoint'

const defaultUser = {
  name: 'Al fatih',
  role: 'Frontend Developer',
}

function AppLayout({
  children,
  className = '',
  headerProps = {},
  user = defaultUser,
}) {
  const isDesktop = useBreakpoint('lg')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)

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
        userName={user.name}
        userRole={user.role}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="dashboard-stage">
        <Header
          {...headerProps}
          showMenuButton={!isDesktop}
          onMenuToggle={() => setIsMobileSidebarOpen(true)}
          userName={user.name}
          userRole={user.role}
        />

        <main className="dashboard-main">{children}</main>
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
