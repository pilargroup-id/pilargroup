import { useEffect, useState } from 'react'
import { PlayCircle, XClose } from '@untitledui/icons'
import AppLayout from '@/layouts/AppLayout'
import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'

const projects = [
  {
    label: 'Project 01',
    value: 'Web Pilar',
    detail: 'Project is available and ready to run.',
  },
  {
    label: 'Project 02',
    value: 'Ticketing',
    detail: 'Project is available and ready to run.',
  },
  {
    label: 'Project 03',
    value: 'Treeview',
    detail: 'Project is available and ready to run.',
  },
  {
    label: 'Project 04',
    value: 'Touch Point',
    detail: 'Project is available and ready to run.',
  },
  {
    label: 'Project 05',
    value: 'Snap IT',
    detail: 'Project is available and ready to run.',
  },
]

function DashboardPage() {
  usePageTitle()
  const [searchQuery, setSearchQuery] = useState('')
  const [isPopupOpen, setPopupOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)

  useEffect(() => {
    if (!isPopupOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        handleClosePopup()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPopupOpen])

  const handleOpenPopup = (project) => {
    setSelectedProject(project)
    setPopupOpen(true)
  }

  const handleClosePopup = () => {
    setPopupOpen(false)
    setSelectedProject(null)
  }

  const handleConfirmRun = () => {
    handleClosePopup()
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredProjects = projects.filter(({ label, value, detail }) => {
    if (!normalizedSearchQuery) {
      return true
    }

    return [label, value, detail].some((field) =>
      field.toLowerCase().includes(normalizedSearchQuery),
    )
  })

  return (
    <AppLayout
      headerProps={{
        title: 'Pilar Group',
        subtitle: 'Manage your recruitment process',
        breadcrumb: sharedBreadcrumbItems,
        searchProps: {
          value: searchQuery,
          placeholder: 'Search projects...',
          onChange: (event) => setSearchQuery(event.target.value),
          ariaLabel: 'Search projects',
        },
        notificationProps: {
          ariaLabel: 'Open notifications',
          modalTitle: 'Notifications',
        },
        onRefresh: () => setSearchQuery(''),
        primaryActionLabel: 'Create',
        activePath: '/dashboard',
      }}
    >
      <section className="dashboard-content">
        <div className="dashboard-overview">
          {filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <article className="dashboard-card" key={project.value}>
                <p className="dashboard-card__label">{project.label}</p>
                <strong className="dashboard-card__value">{project.value}</strong>
                <p className="dashboard-card__detail">{project.detail}</p>
                <button
                  type="button"
                  className="dashboard-card__action"
                  onClick={() => handleOpenPopup(project)}
                >
                  <PlayCircle size={16} />
                  <span>Run</span>
                </button>
              </article>
            ))
          ) : (
            <article className="dashboard-empty-state">
              <p className="dashboard-empty-state__title">No projects found</p>
              <p className="dashboard-empty-state__detail">
                Try another keyword or use refresh to reset the search.
              </p>
            </article>
          )}
        </div>
      </section>

      {isPopupOpen && selectedProject ? (
        <div
          className="dashboard-popup-overlay"
          role="presentation"
          onClick={handleClosePopup}
        >
          <div
            className="dashboard-popup"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-run-popup-title"
            aria-describedby="dashboard-run-popup-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-popup__header">
              <div>
                <p className="dashboard-popup__eyebrow">{selectedProject.label}</p>
                <h2 className="dashboard-popup__title" id="dashboard-run-popup-title">
                  Run {selectedProject.value}?
                </h2>
              </div>

              <button
                type="button"
                className="dashboard-popup__close"
                aria-label="Close validation popup"
                onClick={handleClosePopup}
              >
                <XClose size={18} />
              </button>
            </div>

            <div className="dashboard-popup__body">
              <p className="dashboard-popup__text" id="dashboard-run-popup-description">
                Apakah Anda yakin ingin menjalankan project{' '}
                <strong>{selectedProject.value}</strong>?
              </p>
            </div>

            <div className="dashboard-popup__actions">
              <button
                type="button"
                className="dashboard-popup__button dashboard-popup__button--secondary"
                onClick={handleClosePopup}
              >
                Batal
              </button>
              <button
                type="button"
                className="dashboard-popup__button dashboard-popup__button--primary"
                onClick={handleConfirmRun}
              >
                Run
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  )
}

export default DashboardPage
