import { useEffect, useMemo, useState } from 'react'
import api from '@/services/api'
import {
  CheckCircle,
  Edit03,
  Folder,
  Link01,
  Trash03,
  XClose,
} from '@untitledui/icons'

import AppLayout from '@/layouts/AppLayout'
import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  createProject,
  deleteProject,
  getProjects,
  updateProject,
} from '@/services/master/getProjects'
import DeleteProjectPopup from './DeleteProjectPopup'
import EditProjectPopup from './EditProjectPopup'

function getShortProjectId(projectId) {
  if (!projectId || projectId === '-') {
    return '-'
  }

  return projectId.length > 10 ? `${projectId.slice(0, 8)}...` : projectId
}

function getCreateFormState() {
  return {
    name: '',
    slug: '',
    url: '',
    description: '',
    isActive: 'active',
    company_id: '',
  }
}

function normalizeSlugInput(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function buildProjectUpdatePayload(project, formValues) {
  const payload = {
    name: formValues.name.trim(),
    is_active: formValues.isActive === 'active' ? 1 : 0,
  }

  const currentUrl = project?.urlRaw ?? ''
  const nextUrl = formValues.url.trim()

  if (nextUrl && nextUrl !== currentUrl) {
    payload.url = nextUrl
  }

  const currentDescription = project?.descriptionRaw ?? ''
  const nextDescription = formValues.description.trim()

  if (nextDescription && nextDescription !== currentDescription) {
    payload.description = nextDescription
  }

  return payload
}

function buildCreateProjectPayload(formValues) {
  return {
    name: formValues.name.trim(),
    slug: normalizeSlugInput(formValues.slug),
    url: formValues.url.trim() || null,
    description: formValues.description.trim(),
    is_active: formValues.isActive === 'active' ? 1 : 0,
    company_id: formValues.company_id || null,
  }
}

function ProjectCreatePopup({ isOpen, isSubmitting, errorMessage, onClose, onSubmit }) {
  const [formValues, setFormValues] = useState(getCreateFormState)
  const [companies, setCompanies] = useState([])

  useEffect(() => {
    if (!isOpen) {
      setFormValues(getCreateFormState())
      return undefined
    }

    api
      .request('/master/companies')
      .then((data) => {
        const companyList = Array.isArray(data) ? data : data?.data || []
        setCompanies(companyList)
      })
      .catch((error) => console.error('Failed to load companies:', error))

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) {
    return null
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => {
      if (name === 'name') {
        return {
          ...currentValues,
          name: value,
          slug: currentValues.slug ? currentValues.slug : normalizeSlugInput(value),
        }
      }

      if (name === 'slug') {
        return {
          ...currentValues,
          slug: normalizeSlugInput(value),
        }
      }

      return {
        ...currentValues,
        [name]: value,
      }
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.(formValues)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose?.()
    }
  }

  return (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-create-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Master Project</p>
            <h2 className="dashboard-popup__title" id="project-create-popup-title">
              Create Project
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup create project"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              Tambahkan project baru ke master project directory.
            </p>

            {errorMessage ? (
              <div className="master-departments-feedback master-departments-feedback--error">
                {errorMessage}
              </div>
            ) : null}

            <div className="register-user-popup__grid">
              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Nama Project</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleChange}
                  placeholder="Masukkan nama project"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Slug</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="slug"
                  value={formValues.slug}
                  onChange={handleChange}
                  placeholder="misalnya touchpoint"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="register-user-popup__field register-user-popup__field--full">
                <span className="register-user-popup__label">Url Project</span>
                <input
                  className="register-user-popup__input"
                  type="url"
                  name="url"
                  value={formValues.url}
                  onChange={handleChange}
                  placeholder="https://project.example.com"
                  autoComplete="url"
                />
              </label>

              <label className="register-user-popup__field register-user-popup__field--full">
                <span className="register-user-popup__label">Description</span>
                <textarea
                  className="register-user-popup__input master-departments-popup__textarea"
                  name="description"
                  value={formValues.description}
                  onChange={handleChange}
                  placeholder="Deskripsi singkat project"
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Status</span>
                <select
                  className="register-user-popup__select"
                  name="isActive"
                  value={formValues.isActive}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Company</span>
                <select
                  className="register-user-popup__select"
                  name="company_id"
                  value={formValues.company_id}
                  onChange={handleChange}
                >
                  <option value="">Pilih Company</option>
                  {companies.map((company) => (
                    <option key={company.id || company.code} value={company.id || company.code}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="dashboard-popup__actions">
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ProjectsCardView({ activePath = '/master-project' }) {
  usePageTitle()

  const [searchQuery, setSearchQuery] = useState('')
  const [projects, setProjects] = useState([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(true)
  const [projectsError, setProjectsError] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [isCreatePopupOpen, setCreatePopupOpen] = useState(false)
  const [createError, setCreateError] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deletingProject, setDeletingProject] = useState(null)
  const [actionError, setActionError] = useState('')
  const [isSavingProject, setIsSavingProject] = useState(false)
  const [isDeletingProject, setIsDeletingProject] = useState(false)

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const loadProjects = async () => {
    setProjectsError('')
    setIsLoadingProjects(true)

    try {
      const nextProjects = await getProjects()
      setProjects(nextProjects)
    } catch (error) {
      setProjects([])
      setProjectsError(error?.message || 'Failed to load master projects from database.')
    } finally {
      setIsLoadingProjects(false)
    }
  }

  useEffect(() => {
    void loadProjects()
  }, [])

  const filteredProjects = useMemo(() => {
    return projects.filter(({ id, name, slug, url, description, status }) => {
      if (!normalizedSearchQuery) {
        return true
      }

      return [id, name, slug, url, description, status].some((field) =>
        field.toLowerCase().includes(normalizedSearchQuery),
      )
    })
  }, [normalizedSearchQuery, projects])

  const projectSummary = useMemo(() => {
    const activeProjectsCount = projects.filter((project) => project.isActive).length
    const projectWithUrlCount = projects.filter((project) => project.urlRaw).length

    return [
      {
        label: 'Total Project',
        value: projects.length,
        icon: Folder,
      },
      {
        label: 'Project Active',
        value: activeProjectsCount,
        icon: CheckCircle,
      },
      {
        label: 'URL Available',
        value: projectWithUrlCount,
        icon: Link01,
      },
    ]
  }, [projects])

  const handleRefresh = () => {
    setSearchQuery('')
    setFeedbackMessage(null)
    void loadProjects()
  }

  const handleOpenCreate = () => {
    setCreateError('')
    setCreatePopupOpen(true)
  }

  const handleCloseCreate = () => {
    if (isCreatingProject) {
      return
    }

    setCreateError('')
    setCreatePopupOpen(false)
  }

  const handleOpenEdit = (project) => {
    setActionError('')
    setEditingProject(project)
  }

  const handleCloseEdit = () => {
    if (isSavingProject) {
      return
    }

    setActionError('')
    setEditingProject(null)
  }

  const handleOpenDelete = (project) => {
    setActionError('')
    setDeletingProject(project)
  }

  const handleCloseDelete = () => {
    if (isDeletingProject) {
      return
    }

    setActionError('')
    setDeletingProject(null)
  }

  const handleSubmitCreate = async (formValues) => {
    const normalizedName = formValues.name.trim()
    const normalizedSlug = normalizeSlugInput(formValues.slug)

    if (!normalizedName) {
      setCreateError('Nama project wajib diisi.')
      return
    }

    if (!normalizedSlug) {
      setCreateError('Slug wajib diisi.')
      return
    }

    setCreateError('')
    setIsCreatingProject(true)

    try {
      const payload = buildCreateProjectPayload(formValues)
      await createProject(payload)
      setFeedbackMessage({
        type: 'success',
        text: `Project ${normalizedName} berhasil dibuat.`,
      })
      setCreatePopupOpen(false)
      setSearchQuery('')
      await loadProjects()
    } catch (error) {
      setCreateError(error?.message || 'Gagal membuat project.')
    } finally {
      setIsCreatingProject(false)
    }
  }

  const handleSubmitEdit = async (formValues) => {
    if (!editingProject) {
      return
    }

    if (!formValues.name.trim()) {
      setActionError('Nama project wajib diisi.')
      return
    }

    setActionError('')
    setIsSavingProject(true)

    try {
      const payload = buildProjectUpdatePayload(editingProject, formValues)
      await updateProject(editingProject.projectId, payload)
      setFeedbackMessage({
        type: 'success',
        text: `Project ${formValues.name.trim()} berhasil diperbarui.`,
      })
      setEditingProject(null)
      await loadProjects()
    } catch (error) {
      setActionError(error?.message || 'Gagal memperbarui project.')
    } finally {
      setIsSavingProject(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingProject) {
      return
    }

    setActionError('')
    setIsDeletingProject(true)

    try {
      await deleteProject(deletingProject.projectId)
      setFeedbackMessage({
        type: 'success',
        text: `Project ${deletingProject.name} berhasil dihapus.`,
      })
      setDeletingProject(null)
      await loadProjects()
    } catch (error) {
      setActionError(error?.message || 'Gagal menghapus project.')
    } finally {
      setIsDeletingProject(false)
    }
  }

  let content = null

  if (isLoadingProjects) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Loading master projects...</p>
        <p className="dashboard-empty-state__detail">
          Sedang mengambil data project 
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
  } else if (filteredProjects.length === 0) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">No master project found</p>
        <p className="dashboard-empty-state__detail">
          Coba kata kunci lain atau gunakan refresh untuk menampilkan semua project.
        </p>
      </article>
    )
  } else {
    content = (
      <div className="master-departments-list">
        {filteredProjects.map((project) => (
          <article className="master-project-card master-departments-card" key={project.projectId}>
            <div className="master-project-card__header">
              <div>
                <p className="master-project-card__eyebrow master-project-card__eyebrow--url">
                  {project.url}
                </p>
                <h3 className="master-project-card__title">{project.name}</h3>
              </div>

              <div className="master-project-card__badges">
                <span className="master-project-card__code">{project.slug}</span>
                <span
                  className={`master-project-badge master-project-badge--${project.statusKey}`}
                >
                  {project.status}
                </span>
              </div>
            </div>

            <p className="master-project-card__description">{project.description}</p>

            <div className="master-project-card__metrics">
              <span className="master-project-card__metric">
                ID {getShortProjectId(project.id)}
              </span>
              <span className="master-project-card__metric">Updated {project.updatedAt}</span>
              <span className="master-project-card__metric">
                {project.urlRaw ? 'URL configured' : 'URL not set'}
              </span>
            </div>

            <div className="master-departments-card__actions">
              <button
                type="button"
                className="master-departments-card__action"
                onClick={() => handleOpenEdit(project)}
              >
                <Edit03 size={16} aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                className="master-departments-card__action master-departments-card__action--danger"
                onClick={() => handleOpenDelete(project)}
              >
                <Trash03 size={16} aria-hidden="true" />
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <AppLayout
      headerProps={{
        title: 'Pilargroup',
        subtitle: 'Master project management',
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
        onRefresh: handleRefresh,
        activePath,
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

        <article className="dashboard-panel master-departments-panel">
          <div className="dashboard-panel__header master-departments-panel__header">
            <div>
              <p className="dashboard-panel__eyebrow">Project Directory</p>
              <h2 className="dashboard-panel__title">Master Projects Card View</h2>
            </div>

            <button
              type="button"
              className="users-table-card__action"
              onClick={handleOpenCreate}
            >
              <Folder size={18} aria-hidden="true" />
              Create Project
            </button>
          </div>

          {feedbackMessage ? (
            <div
              className={`master-departments-feedback master-departments-feedback--${feedbackMessage.type}`}
            >
              {feedbackMessage.text}
            </div>
          ) : null}

          {content}
        </article>
      </section>

      <ProjectCreatePopup
        isOpen={isCreatePopupOpen}
        isSubmitting={isCreatingProject}
        errorMessage={createError}
        onClose={handleCloseCreate}
        onSubmit={handleSubmitCreate}
      />

      <EditProjectPopup
        project={editingProject}
        isSubmitting={isSavingProject}
        errorMessage={editingProject ? actionError : ''}
        onClose={handleCloseEdit}
        onSubmit={handleSubmitEdit}
      />

      <DeleteProjectPopup
        project={deletingProject}
        isSubmitting={isDeletingProject}
        errorMessage={deletingProject ? actionError : ''}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
      />
    </AppLayout>
  )
}

export default ProjectsCardView
