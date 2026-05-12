import { useEffect, useState } from 'react'
import { Browser } from '@untitledui/icons'
import AppLayout from '@/layouts/AppLayout'
import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'
import { getDashboardProjects, launchProject } from '@/services/dashboardService'

function DashboardPage({ activePath = '/dashboard' }) {
  usePageTitle()
  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [projectsError, setProjectsError] = useState('')
  const [launchError, setLaunchError] = useState('')

  const loadProjects = async () => {
    setProjectsError('')
    setIsLoadingProjects(true)

    try {
      const nextProjects = await getDashboardProjects()
      setProjects(nextProjects)
    } catch (error) {
      setProjects([])
      setProjectsError(error?.message || 'Failed to load projects from database.')
    } finally {
      setIsLoadingProjects(false)
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [])

  const handleRunProject = async (project) => {
    if (!project?.isRunnable) {
      return
    }

    setLaunchError('')

    try {
      await launchProject(project)
    } catch (error) {
      setLaunchError(error?.message || 'Project gagal dijalankan.')
    }
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

  const handleRefresh = () => {
    setSearchQuery('')
    setLaunchError('')
    void loadProjects()
  }

  let content = null

  if (isLoadingProjects) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Loading projects...</p>
        <p className="dashboard-empty-state__detail">
          Sedang mengambil data project dari master project.
        </p>
      </article>
    )
  } else if (projectsError) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Project gagal dimuat</p>
        <p className="dashboard-empty-state__detail">{projectsError}</p>
      </article>
    )
  } else if (projects.length === 0) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Belum ada project tersedia</p>
        <p className="dashboard-empty-state__detail">
          Master project masih kosong atau belum dikonfigurasi.
        </p>
      </article>
    )
  } else if (filteredProjects.length === 0) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">No projects found</p>
        <p className="dashboard-empty-state__detail">
          Try another keyword or use refresh to reset the search.
        </p>
      </article>
    )
  } else {
    content = filteredProjects.map((project) => (
      <article
        className={`dashboard-card${!project.isRunnable ? ' dashboard-card--disabled' : ''}`}
        key={project.projectId}
      >
        <div className="dashboard-card__meta">
          <p className="dashboard-card__label">{project.label}</p>
          {!project.isRunnable ? (
            <span className="dashboard-card__state dashboard-card__state--disabled">
              Disabled
            </span>
          ) : null}
        </div>
        <strong className="dashboard-card__value">{project.value}</strong>
        <p className="dashboard-card__detail">{project.detail}</p>
        <button
          type="button"
          className={`dashboard-card__action${!project.isRunnable ? ' dashboard-card__action--disabled' : ''}`}
          onClick={() => handleRunProject(project)}
          disabled={!project.isRunnable}
          title={project.isRunnable ? `Buka ${project.value}` : project.disabledReason}
        >
          <Browser size={16} />
          <span>Visit</span>
        </button>
      </article>
    ))
  }

  return (
    <AppLayout
      headerProps={{
        title: 'Pilargroup',
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
        onRefresh: handleRefresh,
        primaryActionLabel: 'Create',
        activePath,
      }}
    >
      <section className="dashboard-content">
        {launchError ? (
          <div className="master-departments-feedback master-departments-feedback--error">
            {launchError}
          </div>
        ) : null}

        <div className="dashboard-overview">{content}</div>
      </section>
    </AppLayout>
  )
}

export function MasterProjectPage() {
  return <DashboardPage activePath="/master-project" />
}

export default DashboardPage
