import { Menu01, SearchMd } from '@untitledui/icons'
import logoPiagam from '@/assets/image/logo-piagam2.svg'

function Header({
  title = 'Pilargroup',
  directoryProps,
  hideBreadcrumb = false,
  onMenuToggle,
  searchProps,
  showMenuButton = false,
}) {
  const rootDirectoryLabel = directoryProps?.rootLabel ?? title
  const currentDirectoryLabel = directoryProps?.currentLabel

  return (
    <header className="header-main">
      <div className="header-content">
        {showMenuButton ? (
          <button
            type="button"
            className="header-menu-button"
            aria-label="Open sidebar"
            onClick={onMenuToggle}
          >
            <Menu01 size={24} aria-hidden="true" />
          </button>
        ) : null}

        <img
          src={logoPiagam}
          alt="PT Pilar Niaga Makmur"
          className="header-brand-logo"
          width={2048}
          height={621}
        />

        {!hideBreadcrumb ? (
          <nav className="header-breadcrumb" aria-label="Page directory">
            <span>{rootDirectoryLabel}</span>
            {currentDirectoryLabel ? (
              <>
                <span aria-hidden="true">/</span>
                <span className="header-breadcrumb__current" aria-current="page">
                  {currentDirectoryLabel}
                </span>
              </>
            ) : null}
          </nav>
        ) : null}

        {searchProps ? <HeaderSearch searchProps={searchProps} /> : null}
      </div>
    </header>
  )
}

function HeaderSearch({ searchProps, variant = 'header' }) {
  const isMobile = variant === 'mobile'

  return (
    <label className={isMobile ? 'header-search header-search--mobile' : 'header-search'}>
      <SearchMd size={16} className="header-search__icon" aria-hidden="true" />
      <input
        type="search"
        className="header-search__input"
        value={searchProps.value ?? ''}
        placeholder={searchProps.placeholder ?? 'Search...'}
        onChange={searchProps.onChange}
        aria-label={searchProps.ariaLabel ?? 'Search'}
        autoComplete="off"
      />
    </label>
  )
}

export function MobileSearchBar({ searchProps }) {
  if (!searchProps) {
    return null
  }

  return (
    <div className="mobile-search-bar">
      <HeaderSearch searchProps={searchProps} variant="mobile" />
    </div>
  )
}

export default Header
