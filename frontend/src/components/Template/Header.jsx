import { useEffect, useState } from 'react'
import { Bell04, Menu01, RefreshCw05, SearchMd, XClose } from '@untitledui/icons'
import logoPiagam from '@/assets/image/logo-piagam2.svg'
import logoPiagamTransparent from '@/assets/image/logo-piagam1.svg'

function Header({
  title = 'Pilargroup',
  directoryProps,
  hideBreadcrumb = false,
  onMenuToggle,
  notificationProps,
  onRefresh,
  searchProps,
  showMenuButton = false,
}) {
  const hasSearch = Boolean(searchProps)
  const hasNotification = Boolean(notificationProps)
  const hasToolbar = showMenuButton || hasSearch || hasNotification || onRefresh
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false)
  const rootDirectoryLabel = directoryProps?.rootLabel ?? title
  const currentDirectoryLabel = directoryProps?.currentLabel ?? ''

  const toolbar = hasToolbar ? (
    <div className={`header-toolbar${showMenuButton ? ' header-toolbar--with-menu' : ''}`}>
      {showMenuButton ? (
        <button
          type="button"
          className="header-menu-button header-menu-button--toolbar"
          aria-label="Open sidebar"
          onClick={onMenuToggle}
        >
          <Menu01 size={20} />
        </button>
      ) : null}

      {hasSearch ? (
        <label
          className="header-search header-search--compact"
          aria-label={searchProps.ariaLabel ?? 'Search'}
        >
          <SearchMd size={16} className="header-search__icon header-search__icon--compact" />
          <input
            type="search"
            className="header-search__input header-search__input--compact"
            value={searchProps.value ?? ''}
            placeholder={searchProps.placeholder ?? 'Search...'}
            onChange={searchProps.onChange}
            aria-label={searchProps.ariaLabel ?? 'Search'}
            autoComplete="off"
          />
        </label>
      ) : null}

      {hasNotification ? (
        <button
          type="button"
          className="header-icon-button header-icon-button--compact"
          aria-label={notificationProps.ariaLabel ?? 'Open notifications'}
          title={notificationProps.ariaLabel ?? 'Open notifications'}
          onClick={() => setIsNotificationModalOpen(true)}
        >
          <Bell04 size={16} />
        </button>
      ) : null}

      {onRefresh ? (
        <button
          type="button"
          className="header-icon-button header-icon-button--compact"
          aria-label="Refresh dashboard"
          title="Refresh dashboard"
          onClick={onRefresh}
        >
          <RefreshCw05 size={16} />
        </button>
      ) : null}
    </div>
  ) : null

  useEffect(() => {
    if (!isNotificationModalOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsNotificationModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isNotificationModalOpen])

  return (
    <header className="header-main">
      <img
        src={logoPiagamTransparent}
        alt=""
        aria-hidden="true"
        className="header-accent-logo"
      />

      <div className="header-content">
        <div className="header-left">
          {hideBreadcrumb && showMenuButton ? toolbar : null}

          <div className="header-brand">
            <img
              src={logoPiagam}
              alt="Logo Piagam"
              className="header-brand-logo"
            />
          </div>
        </div>

        <div className="header-right">
          <span className="header-brand-title">{title}</span>
          {hideBreadcrumb && !showMenuButton ? toolbar : null}
        </div>
      </div>

      {!hideBreadcrumb ? (
      <div className="header-breadcrumb">
        <div className="header-breadcrumb-content">
          <nav className="breadcrumb-nav" aria-label="Page directory">
            <div className="breadcrumb-item">
              <span className="breadcrumb-link breadcrumb-link--static">
                {rootDirectoryLabel}
              </span>

              {currentDirectoryLabel ? (
                <>
                  <span className="breadcrumb-separator">/</span>
                  <span className="breadcrumb-link breadcrumb-link--static active">
                    {currentDirectoryLabel}
                  </span>
                </>
              ) : null}
            </div>
          </nav>

          {toolbar}
        </div>
      </div>
      ) : null}

      {hasNotification && isNotificationModalOpen ? (
        <div
          className="header-modal-overlay"
          role="presentation"
          onClick={() => setIsNotificationModalOpen(false)}
        >
          <div
            className="header-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="header-notification-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="header-modal__header">
              <h2 className="header-modal__title" id="header-notification-title">
                {notificationProps.modalTitle ?? 'Notifications'}
              </h2>

              <button
                type="button"
                className="header-modal__close"
                aria-label="Close notification modal"
                onClick={() => setIsNotificationModalOpen(false)}
              >
                <XClose size={18} />
              </button>
            </div>

            <div className="header-modal__body">
              <div className="header-modal__empty" />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

export default Header
