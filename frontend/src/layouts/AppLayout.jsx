import { useEffect, useState } from 'react'

import BackgroundMain from '@/components/Template/BackgroundMain'
import ChangeProfilePopup from '@/components/Template/ChangeProfilePopup'
import Header from '@/components/Template/Header'
import Sidebar from '@/components/Template/Sidebar'
import { useBreakpoint } from '@/hooks/use-breakpoint'
import { getStoredUser } from '@/services/api'
import {
  isAllDepartmentsFilter,
  resetSelectedDepartmentFilterId,
  setSelectedDepartmentFilterId,
  subscribeToDepartmentCatalogUpdates,
  useSelectedDepartmentFilterId,
} from '@/services/departmentFilter'
import {
  getPrimaryNavigationItemsForUser,
  getSecondaryNavigationItemsForUser,
} from '@/services/accessControl'
import { getDepartments } from '@/services/master/getDepartements'

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
  const [, setProfileVersion] = useState(0)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isChangeProfileOpen, setIsChangeProfileOpen] = useState(false)
  const [departments, setDepartments] = useState([])
  const [departmentsError, setDepartmentsError] = useState('')
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true)
  const selectedDepartmentId = useSelectedDepartmentFilterId()
  const resolvedUser = normalizeUser({
    ...(getStoredUser() || {}),
    ...(user || {}),
  })
  const primaryNavigationItems = getPrimaryNavigationItemsForUser(resolvedUser)
  const secondaryNavigationItems = getSecondaryNavigationItemsForUser(resolvedUser)

  const loadDepartments = async () => {
    setDepartmentsError('')
    setIsLoadingDepartments(true)

    try {
      const nextDepartments = await getDepartments()
      setDepartments(nextDepartments)
    } catch (error) {
      setDepartments([])
      setDepartmentsError(error?.message || 'Gagal memuat daftar divisi.')
    } finally {
      setIsLoadingDepartments(false)
    }
  }

  useEffect(() => {
    if (isDesktop) {
      setIsMobileSidebarOpen(false)
      return
    }

    setIsSidebarCollapsed(false)
  }, [isDesktop])

  useEffect(() => {
    void loadDepartments()

    const unsubscribe = subscribeToDepartmentCatalogUpdates(() => {
      void loadDepartments()
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (
      isLoadingDepartments ||
      departmentsError ||
      isAllDepartmentsFilter(selectedDepartmentId)
    ) {
      return
    }

    const hasMatchingDepartment = departments.some(
      (department) => String(department.departmentId ?? department.id) === selectedDepartmentId,
    )

    if (!hasMatchingDepartment) {
      resetSelectedDepartmentFilterId()
    }
  }, [departments, departmentsError, isLoadingDepartments, selectedDepartmentId])

  const sidebarCollapsed = isDesktop && isSidebarCollapsed
  const appShellClassName = [
    'dashboard-shell',
    sidebarCollapsed ? 'dashboard-shell--sidebar-collapsed' : '',
    isMobileSidebarOpen ? 'dashboard-shell--sidebar-open' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const handleSidebarAction = (action) => {
    if (action === 'change-profile') {
      setIsChangeProfileOpen(true)
    }
  }

  const handleRefresh = () => {
    headerProps.onRefresh?.()
    void loadDepartments()
  }

  return (
    <div className={appShellClassName}>
      <Sidebar
        collapsed={sidebarCollapsed}
        mobileOpen={!isDesktop && isMobileSidebarOpen}
        activePath={headerProps.activePath ?? '/dashboard'}
        userName={resolvedUser.name}
        userRole={resolvedUser.role}
        primaryItems={primaryNavigationItems}
        secondaryItems={secondaryNavigationItems}
        onAction={handleSidebarAction}
        onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="dashboard-stage">
        <Header
          {...headerProps}
          departmentFilterProps={{
            departments,
            error: departmentsError,
            isLoading: isLoadingDepartments,
            onSelect: setSelectedDepartmentFilterId,
            selectedDepartmentId,
          }}
          onRefresh={handleRefresh}
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

      <ChangeProfilePopup
        isOpen={isChangeProfileOpen}
        user={resolvedUser}
        onClose={() => setIsChangeProfileOpen(false)}
        onUpdated={() => setProfileVersion((currentVersion) => currentVersion + 1)}
      />
    </div>
  )
}

export default AppLayout
