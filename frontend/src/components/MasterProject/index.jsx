import { useEffect, useMemo, useState } from 'react'
import { Folder, PieChart03, Users01 } from '@untitledui/icons'

import AppLayout from '@/layouts/AppLayout'
import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'

import CreateProjectPopup from './CreateProjectPopup'
import { availableDivisions, availableUsers, initialProjects } from './projectData'

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getNextProjectId(projects) {
  const highestProjectNumber = projects.reduce((highest, project) => {
    const currentNumber = Number.parseInt(project.id.replace(/\D/g, ''), 10)

    if (Number.isNaN(currentNumber)) {
      return highest
    }

    return Math.max(highest, currentNumber)
  }, 0)

  return `PRJ-${String(highestProjectNumber + 1).padStart(3, '0')}`
}

function normalizeStatusKey(status) {
  return status.toLowerCase().replace(/\s+/g, '-')
}

function getProjectUrl(project) {
  return project.projectUrl?.trim() || project.category || '-'
}

function MasterProjectView() {
  usePageTitle()

  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState(initialProjects)
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0]?.id ?? null)
  const [isCreatePopupOpen, setCreatePopupOpen] = useState(false)

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const filteredProjects = useMemo(() => {
    return projects.filter(({ code, name, category, projectUrl, description, divisions, users }) => {
      if (!normalizedSearchQuery) {
        return true
      }

      const searchableFields = [
        code,
        name,
        projectUrl,
        category,
        description,
        ...divisions,
        ...users.flatMap((user) => [user.name, user.division, user.role]),
      ].filter(Boolean)

      return searchableFields.some((field) =>
        field.toLowerCase().includes(normalizedSearchQuery),
      )
    })
  }, [projects, normalizedSearchQuery])

  useEffect(() => {
    if (filteredProjects.length === 0) {
      return
    }

    const hasSelectedProject = filteredProjects.some((project) => project.id === selectedProjectId)

    if (!hasSelectedProject) {
      setSelectedProjectId(filteredProjects[0].id)
    }
  }, [filteredProjects, selectedProjectId])

  const activeProject =
    filteredProjects.find((project) => project.id === selectedProjectId) ?? filteredProjects[0] ?? null

  const projectSummary = useMemo(() => {
    const usedDivisions = new Set(projects.flatMap((project) => project.divisions))
    const usedUsers = new Set(
      projects.flatMap((project) => project.users.map((user) => user.id)),
    )

    return [
      {
        label: 'Total Project',
        value: projects.length,
        detail: 'Master project yang sudah terdokumentasi dari dashboard.',
        icon: Folder,
      },
      {
        label: 'Divisi Terhubung',
        value: usedDivisions.size,
        detail: 'Divisi yang saat ini memakai atau menjadi stakeholder project.',
        icon: PieChart03,
      },
      {
        label: 'User Terhubung',
        value: usedUsers.size,
        detail: 'User yang sudah direlasikan ke master project yang tersedia.',
        icon: Users01,
      },
    ]
  }, [projects])

  const handleCreateProject = (formValues) => {
    const nextProjectId = getNextProjectId(projects)
    const nextProject = {
      id: nextProjectId,
      lastUpdated: 'Baru saja',
      ...formValues,
    }

    setProjects((currentProjects) => [nextProject, ...currentProjects])
    setSearchQuery('')
    setSelectedProjectId(nextProjectId)
    setCreatePopupOpen(false)
  }

  return (
    <AppLayout
      headerProps={{
        title: 'Pilar Group',
        subtitle: 'Master project detail',
        breadcrumb: sharedBreadcrumbItems,
        searchProps: {
          value: searchQuery,
          placeholder: 'Search master project...',
          onChange: (event) => setSearchQuery(event.target.value),
          ariaLabel: 'Search master project',
        },
        notificationProps: {
          ariaLabel: 'Open notifications',
          modalTitle: 'Notifications',
        },
        onRefresh: () => setSearchQuery(''),
        activePath: '/master-project',
      }}
    >
      <section className="dashboard-content">
        <div className="dashboard-overview master-project-overview">
          {projectSummary.map((item) => {
            const Icon = item.icon

            return (
              <article className="dashboard-card master-project-summary" key={item.label}>
                <div className="master-project-summary__icon">
                  <Icon size={20} />
                </div>
                <p className="dashboard-card__label">{item.label}</p>
                <strong className="dashboard-card__value">{item.value}</strong>
                <p className="dashboard-card__detail">{item.detail}</p>
              </article>
            )
          })}
        </div>

        <div className="master-project-grid">
          <article className="dashboard-panel master-project-panel">
            <div className="dashboard-panel__header master-project-panel__header">
              <div>
                <p className="dashboard-panel__eyebrow">Project Directory</p>
                <h2 className="dashboard-panel__title">Master Project</h2>
                <p className="master-project-panel__description">
                  Detail project dari dashboard untuk melihat divisi dan user yang
                  menggunakan tiap project.
                </p>
              </div>

              <button
                type="button"
                className="users-table-card__action"
                onClick={() => setCreatePopupOpen(true)}
              >
                <Folder size={18} aria-hidden="true" />
                Create Project
              </button>
            </div>

            <div className="master-project-list">
              {filteredProjects.length > 0 ? (
                filteredProjects.map((project) => (
                  <button
                    type="button"
                    key={project.id}
                    className={`master-project-card${
                      activeProject?.id === project.id ? ' is-selected' : ''
                    }`}
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    <div className="master-project-card__header">
                      <div>
                        <p className="master-project-card__eyebrow master-project-card__eyebrow--url">
                          {getProjectUrl(project)}
                        </p>
                        <h3 className="master-project-card__title">{project.name}</h3>
                      </div>

                      <div className="master-project-card__badges">
                        <span className="master-project-card__code">{project.code}</span>
                        <span
                          className={`master-project-badge master-project-badge--${normalizeStatusKey(
                            project.status,
                          )}`}
                        >
                          {project.status}
                        </span>
                      </div>
                    </div>

                    <p className="master-project-card__description">{project.description}</p>

                    <div className="master-project-card__metrics">
                      <span className="master-project-card__metric">
                        {project.divisions.length} divisi
                      </span>
                      <span className="master-project-card__metric">
                        {project.users.length} user
                      </span>
                      <span className="master-project-card__metric">
                        Update {project.lastUpdated}
                      </span>
                    </div>

                    <div className="master-project-chip-list">
                      {project.divisions.map((division) => (
                        <span className="master-project-chip" key={`${project.id}-${division}`}>
                          {division}
                        </span>
                      ))}
                    </div>
                  </button>
                ))
              ) : (
                <article className="dashboard-empty-state">
                  <p className="dashboard-empty-state__title">No master project found</p>
                  <p className="dashboard-empty-state__detail">
                    Coba kata kunci lain atau gunakan refresh untuk menampilkan semua
                    project.
                  </p>
                </article>
              )}
            </div>
          </article>

          <article className="dashboard-panel master-project-detail">
            {activeProject ? (
              <>
                <div className="master-project-detail__hero">
                  <div>
                    <p className="dashboard-panel__eyebrow">Selected Project</p>
                    <h2 className="dashboard-panel__title">{activeProject.name}</h2>
                    <p className="master-project-detail__description">
                      {activeProject.description}
                    </p>
                  </div>

                  <div className="master-project-card__badges">
                    <span className="master-project-card__code">{activeProject.code}</span>
                    <span
                      className={`master-project-badge master-project-badge--${normalizeStatusKey(
                        activeProject.status,
                      )}`}
                    >
                      {activeProject.status}
                    </span>
                  </div>
                </div>

                <div className="master-project-detail__stats">
                  <div className="master-project-detail__stat">
                    <span className="master-project-detail__stat-label">Url Project</span>
                    <strong className="master-project-detail__stat-value--link">
                      {getProjectUrl(activeProject)}
                    </strong>
                  </div>
                  <div className="master-project-detail__stat">
                    <span className="master-project-detail__stat-label">Divisions</span>
                    <strong>{activeProject.divisions.length}</strong>
                  </div>
                  <div className="master-project-detail__stat">
                    <span className="master-project-detail__stat-label">Users</span>
                    <strong>{activeProject.users.length}</strong>
                  </div>
                  <div className="master-project-detail__stat">
                    <span className="master-project-detail__stat-label">Updated</span>
                    <strong>{activeProject.lastUpdated}</strong>
                  </div>
                </div>

                <section className="master-project-detail__section">
                  <div className="master-project-detail__section-heading">
                    <h3>Divisions Using This Project</h3>
                    <span>{activeProject.divisions.length} divisi</span>
                  </div>

                  <div className="master-project-chip-list">
                    {activeProject.divisions.map((division) => (
                      <span className="master-project-chip master-project-chip--strong" key={division}>
                        {division}
                      </span>
                    ))}
                  </div>
                </section>

                <section className="master-project-detail__section">
                  <div className="master-project-detail__section-heading">
                    <h3>Users Using This Project</h3>
                    <span>{activeProject.users.length} user</span>
                  </div>

                  <div className="master-project-users">
                    {activeProject.users.length > 0 ? (
                      activeProject.users.map((user) => (
                        <article className="master-project-user" key={user.id}>
                          <div className="master-project-user__identity">
                            <span className="users-table__avatar">{getInitials(user.name)}</span>

                            <div>
                              <strong className="master-project-user__name">{user.name}</strong>
                              <p className="master-project-user__meta">
                                {user.role} · {user.id}
                              </p>
                            </div>
                          </div>

                          <span className="master-project-user__division">{user.division}</span>
                        </article>
                      ))
                    ) : (
                      <div className="users-table__empty">
                        Belum ada user yang tercatat menggunakan project ini.
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <div className="dashboard-empty-state master-project-detail__empty">
                <p className="dashboard-empty-state__title">Pilih project terlebih dahulu</p>
                <p className="dashboard-empty-state__detail">
                  Detail project akan tampil di panel ini setelah Anda memilih salah satu
                  master project dari daftar.
                </p>
              </div>
            )}
          </article>
        </div>
      </section>

      <CreateProjectPopup
        isOpen={isCreatePopupOpen}
        onClose={() => setCreatePopupOpen(false)}
        onSubmit={handleCreateProject}
        availableDivisions={availableDivisions}
        availableUsers={availableUsers}
      />
    </AppLayout>
  )
}

export default MasterProjectView
