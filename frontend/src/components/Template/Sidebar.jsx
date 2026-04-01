import { ChevronLeft, ChevronRight, XClose } from '@untitledui/icons'
import { useEffect, useState } from 'react'

import {
  primaryNavigationItems,
  secondaryNavigationItems,
} from '@/constants/navigation'

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function SidebarNavItem({ item, active, collapsed, onSelect }) {
  const Icon = item.icon
  const className = [
    'nav-item',
    active ? 'active' : '',
    item.variant === 'danger' ? 'logout-item' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <a
      href={item.href ?? '#'}
      className={className}
      data-tooltip={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault()
        onSelect?.(item)
      }}
    >
      <Icon className="nav-icon" size={22} />
      <span className="nav-text">{item.label}</span>
    </a>
  )
}

function Sidebar({
  collapsed = false,
  mobileOpen = false,
  activePath = '/dashboard',
  userName = 'Al fatih',
  userRole = 'Frontend Developer',
  primaryItems = primaryNavigationItems,
  secondaryItems = secondaryNavigationItems,
  onToggleCollapse,
  onCloseMobile,
}) {
  const [selectedPath, setSelectedPath] = useState(activePath)
  const initials = getInitials(userName)

  useEffect(() => {
    setSelectedPath(activePath)
  }, [activePath])

  const handleSelect = (item) => {
    if (item.href) {
      setSelectedPath(item.href)
    }

    if (mobileOpen) {
      onCloseMobile?.()
    }
  }

  const sidebarClassName = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    mobileOpen ? 'mobile-open' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside id="sidebar" className={sidebarClassName}>
      <button
        type="button"
        className="sidebar-toggle"
        aria-label="Toggle Sidebar"
        onClick={onToggleCollapse}
      >
        {collapsed ? (
          <ChevronRight className="toggle-icon" size={16} />
        ) : (
          <ChevronLeft className="toggle-icon" size={16} />
        )}
      </button>

      <button
        type="button"
        className="sidebar-mobile-dismiss"
        aria-label="Close Sidebar"
        onClick={onCloseMobile}
      >
        <XClose size={18} />
      </button>

      <div className="sidebar-logo">
        <div className="profile-content">
          <div className="profile-avatar">
            <span className="profile-avatar__badge">{initials}</span>
            <div className="online-status" />
          </div>

          <div className="profile-info">
            <h3 className="profile-name">{userName}</h3>
            <p className="profile-role">{userRole}</p>
          </div>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {primaryItems.map((item) => (
          <SidebarNavItem
            key={item.href ?? item.label}
            item={item}
            active={item.href === selectedPath}
            collapsed={collapsed}
            onSelect={handleSelect}
          />
        ))}
      </nav>

      <div className="sidebar-bottom">
        {secondaryItems.map((item) => (
          <SidebarNavItem
            key={item.href ?? item.label}
            item={item}
            active={item.href === selectedPath}
            collapsed={collapsed}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </aside>
  )
}

export default Sidebar
