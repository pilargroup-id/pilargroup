import { Menu01 } from '@untitledui/icons'
import logoPiagam from '@/assets/image/logo-piagam.png'

function Header({
  title = 'Pilar Group',
  breadcrumb = [
    { label: 'All', href: '#' },
    { label: 'Finance', href: '#', active: true },
    { label: 'Legal', href: '#' }, 
    { label: 'Product', href: '#' },  
  ],
  onMenuToggle,
  showMenuButton = false,
}) {
  return (
    <header className="header-main">
      <div className="header-content">
        <div className="header-left">
          {showMenuButton ? (
            <button
              type="button"
              className="header-menu-button"
              aria-label="Open sidebar"
              onClick={onMenuToggle}
            >
              <Menu01 size={20} />
            </button>
          ) : null}

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
        </div>
      </div>

      <div className="header-breadcrumb">
        <nav className="breadcrumb-nav" aria-label="Breadcrumb">
          {breadcrumb.map((item, index) => (
            <div className="breadcrumb-item" key={`${item.label}-${index}`}>
              <a
                href={item.href ?? '#'}
                className={`breadcrumb-link${item.active ? ' active' : ''}`}
                onClick={(event) => {
                  if (!item.href || item.href === '#') {
                    event.preventDefault()
                  }
                }}
              >
                {item.label}
              </a>

              {index < breadcrumb.length - 1 ? (
                <span className="breadcrumb-separator">/</span>
              ) : null}
            </div>
          ))}
        </nav>
      </div>
    </header>
  )
}

export default Header
