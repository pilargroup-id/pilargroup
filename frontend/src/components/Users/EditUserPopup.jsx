import { useEffect, useState } from 'react'
import { XClose } from '@untitledui/icons'
import { getDepartments } from '@/services/master/getDepartements'
import { getProjects } from '@/services/master/getProjects'
import {
  normalizeManagedUserApps,
  resolveManagedUserApps,
} from '@/services/manageUsers'

const initialFormState = {
  username: '',
  password: '',
  name: '',
  email: '',
  phone: '',
  department_id: '',
  job_position: '',
  job_level: '',
  internal_id: '',
  is_active: 'true',
  apps: [],
}

function getSelectableProjects(projects) {
  if (!Array.isArray(projects)) {
    return []
  }

  const seenSlugs = new Set()

  return projects.filter((project) => {
    const projectSlug = typeof project?.slug === 'string' ? project.slug.trim() : ''

    if (!projectSlug || projectSlug === 'no-slug' || seenSlugs.has(projectSlug)) {
      return false
    }

    seenSlugs.add(projectSlug)
    return true
  })
}

function haveSameApps(currentApps, nextApps) {
  if (currentApps.length !== nextApps.length) {
    return false
  }

  return currentApps.every((app, index) => app === nextApps[index])
}

function getTextValue(value) {
  if (value === undefined || value === null) {
    return ''
  }

  return String(value)
}

function getBooleanSelectValue(value) {
  if (value === true || value === 1) {
    return 'true'
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase()

    if (['true', '1', 'active', 'yes'].includes(normalizedValue)) {
      return 'true'
    }
  }

  return 'false'
}

function getEditFormState(user) {
  const rawUser = user?.raw ?? {}
  const userApps = normalizeManagedUserApps(rawUser.apps ?? user?.apps)

  return {
    username: getTextValue(rawUser.username),
    password: '',
    name: getTextValue(rawUser.name),
    email: getTextValue(rawUser.email),
    phone: getTextValue(rawUser.phone),
    department_id: getTextValue(rawUser.department_id ?? rawUser.departmentId),
    job_position: getTextValue(rawUser.job_position ?? rawUser.jobPosition),
    job_level: getTextValue(rawUser.job_level ?? rawUser.jobLevel),
    internal_id: getTextValue(rawUser.internal_id ?? rawUser.internalId),
    is_active: getBooleanSelectValue(rawUser.is_active ?? rawUser.isActive ?? user?.statusKey),
    apps: userApps,
  }
}

function EditUserPopup({ user, isSubmitting, errorMessage, onClose, onSubmit }) {
  const [formValues, setFormValues] = useState(() => getEditFormState(user))
  const [departments, setDepartments] = useState([])
  const [projects, setProjects] = useState([])
  const [appsDropdownOpen, setAppsDropdownOpen] = useState(false)
  const appsListId = 'edit-user-popup-apps-list'

  useEffect(() => {
    if (!user) {
      setFormValues(initialFormState)
      setDepartments([])
      setProjects([])
      setAppsDropdownOpen(false)
      return undefined
    }

    setFormValues(getEditFormState(user))
    setAppsDropdownOpen(false)
  }, [user])

  useEffect(() => {
    if (!user) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSubmitting, onClose, user])

  useEffect(() => {
    if (!user) {
      return undefined
    }

    let isActive = true

    const fetchData = async () => {
      try {
        const [depts, projs] = await Promise.all([getDepartments(), getProjects()])

        if (!isActive) {
          return
        }

        setDepartments(depts)
        setProjects(projs)
        setFormValues((currentValues) => {
          const resolvedApps = resolveManagedUserApps(currentValues.apps, projs)

          if (haveSameApps(currentValues.apps, resolvedApps)) {
            return currentValues
          }

          return {
            ...currentValues,
            apps: resolvedApps,
          }
        })
      } catch (error) {
        console.error('Failed to fetch user edit master data:', error)
      }
    }

    void fetchData()

    return () => {
      isActive = false
    }
  }, [user])

  if (!user) {
    return null
  }

  const rawUser = user.raw ?? {}
  const displayName =
    rawUser.name || (user.name && user.name !== '-' ? user.name : '') || rawUser.username || 'User'
  const visibleProjects = getSelectableProjects(projects)

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleAppsChange = (event) => {
    const { value, checked } = event.target

    setFormValues((currentValues) => {
      if (checked) {
        if (currentValues.apps.includes(value)) {
          return currentValues
        }

        return {
          ...currentValues,
          apps: normalizeManagedUserApps([...currentValues.apps, value]),
        }
      }

      return {
        ...currentValues,
        apps: currentValues.apps.filter((app) => app !== value),
      }
    })
  }

  const handleClose = () => {
    if (isSubmitting) {
      return
    }

    setAppsDropdownOpen(false)
    onClose?.()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const selectedApps = normalizeManagedUserApps(formValues.apps)

    onSubmit?.({
      ...formValues,
      apps: selectedApps,
    })
  }

  return (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup register-user-popup--users"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-user-popup-title"
        aria-describedby="edit-user-popup-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">User Management</p>
            <h2 className="dashboard-popup__title" id="edit-user-popup-title">
              Edit {displayName}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup edit user"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text" id="edit-user-popup-description">
              Perbarui data user yang dipilih. Password bisa dikosongkan jika tidak ingin diganti.
            </p>

            {errorMessage ? (
              <div className="master-departments-feedback master-departments-feedback--error">
                {errorMessage}
              </div>
            ) : null}

            <div className="register-user-popup__layout">
              <div className="register-user-popup__main">
                <div className="register-user-popup__grid">
                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Username</span>
                    <input
                      className="register-user-popup__input"
                      type="text"
                      name="username"
                      value={formValues.username}
                      onChange={handleChange}
                      placeholder="Masukkan username"
                      autoComplete="username"
                      minLength={3}
                      required
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Password</span>
                    <input
                      className="register-user-popup__input"
                      type="password"
                      name="password"
                      value={formValues.password}
                      onChange={handleChange}
                      placeholder="Kosongkan jika tidak diubah"
                      autoComplete="new-password"
                      minLength={6}
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Nama Lengkap</span>
                    <input
                      className="register-user-popup__input"
                      type="text"
                      name="name"
                      value={formValues.name}
                      onChange={handleChange}
                      placeholder="Masukkan nama user"
                      autoComplete="name"
                      required
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Email</span>
                    <input
                      className="register-user-popup__input"
                      type="email"
                      name="email"
                      value={formValues.email}
                      onChange={handleChange}
                      placeholder="nama@perusahaan.com"
                      autoComplete="email"
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Phone</span>
                    <input
                      className="register-user-popup__input"
                      type="tel"
                      name="phone"
                      value={formValues.phone}
                      onChange={handleChange}
                      placeholder="081234567890"
                      autoComplete="tel"
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Divisi</span>
                    <select
                      className="register-user-popup__select"
                      name="department_id"
                      value={formValues.department_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Pilih Divisi</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.id}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Job Position</span>
                    <input
                      className="register-user-popup__input"
                      type="text"
                      name="job_position"
                      value={formValues.job_position}
                      onChange={handleChange}
                      placeholder="Masukkan jabatan"
                      autoComplete="organization-title"
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Job Level</span>
                    <input
                      className="register-user-popup__input"
                      type="text"
                      name="job_level"
                      value={formValues.job_level}
                      onChange={handleChange}
                      placeholder="Masukkan level jabatan"
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Internal ID</span>
                    <input
                      className="register-user-popup__input"
                      type="number"
                      name="internal_id"
                      value={formValues.internal_id}
                      onChange={handleChange}
                      placeholder="Masukkan ID internal user"
                      step="1"
                      min="1"
                    />
                  </label>

                  <label className="register-user-popup__field">
                    <span className="register-user-popup__label">Status</span>
                    <select
                      className="register-user-popup__select"
                      name="is_active"
                      value={formValues.is_active}
                      onChange={handleChange}
                      required
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </label>
                </div>
              </div>

              <section className="register-user-popup__section" aria-labelledby={appsListId}>
                <div className="register-user-popup__section-header">
                  <span className="register-user-popup__label" id={appsListId}>
                    Apps
                  </span>
                </div>

                <button
                  type="button"
                  className="register-user-popup__dropdown-button"
                  onClick={() => setAppsDropdownOpen((current) => !current)}
                  aria-expanded={appsDropdownOpen}
                  aria-controls="edit-user-popup-apps-options"
                >
                  <span>
                    {formValues.apps.length === 0
                      ? 'Pilih Apps'
                      : `${formValues.apps.length} App${formValues.apps.length > 1 ? 's' : ''} dipilih`}
                  </span>
                  <svg
                    className={`register-user-popup__dropdown-icon ${appsDropdownOpen ? 'open' : ''}`}
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M4 6L8 10L12 6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <p className="register-user-popup__selection-summary">
                  {formValues.apps.length === 0
                    ? 'Belum ada apps dipilih.'
                    : `${formValues.apps.length} App${formValues.apps.length > 1 ? 's' : ''} dipilih.`}
                </p>

                {appsDropdownOpen ? (
                  <div
                    className="register-user-popup__apps-list"
                    id="edit-user-popup-apps-options"
                  >
                    {visibleProjects.length === 0 ? (
                      <div className="register-user-popup__no-options">
                        Tidak ada apps tersedia
                      </div>
                    ) : (
                      visibleProjects.map((project) => {
                        const isSelected = formValues.apps.includes(project.slug)

                        return (
                          <label
                            key={project.projectId}
                            className={`register-user-popup__apps-item ${isSelected ? 'is-selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              className="register-user-popup__apps-checkbox"
                              name="apps"
                              value={project.slug}
                              checked={isSelected}
                              onChange={handleAppsChange}
                            />
                            <span className="register-user-popup__apps-copy">
                              <span>{project.name}</span>
                              <small>
                                {project.slug}
                                {!project.isActive ? ' - inactive' : ''}
                              </small>
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                ) : null}
              </section>
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EditUserPopup
