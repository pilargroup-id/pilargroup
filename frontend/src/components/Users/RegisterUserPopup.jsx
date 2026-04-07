import { useEffect, useState } from 'react'
import { XClose } from '@untitledui/icons'
import { getDepartments } from '@/services/master/getDepartements'
import { getProjects } from '@/services/master/getProjects'
import { jobLevelOptions } from '@/constants/jobLevels'
import { normalizeManagedUserApps, registerUser } from '@/services/manageUsers'
import { normalizePhoneNumber } from '@/utils/normalizePhoneNumber'

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

function RegisterUserPopup({ isOpen, onClose, onSubmit }) {
  const [formValues, setFormValues] = useState(initialFormState)
  const [departments, setDepartments] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appsDropdownOpen, setAppsDropdownOpen] = useState(false)
  const appsListId = 'register-user-popup-apps-list'
  const visibleProjects = getSelectableProjects(projects)

  useEffect(() => {
    if (!isOpen) {
      setAppsDropdownOpen(false)
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        setFormValues(initialFormState)
        setError('')
        setAppsDropdownOpen(false)
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Fetch departments and projects
    const fetchData = async () => {
      try {
        const [depts, projs] = await Promise.all([
          getDepartments(),
          getProjects(),
        ])
        setDepartments(depts)
        setProjects(projs)
      } catch (err) {
        console.error('Failed to fetch master data:', err)
      }
    }

    fetchData()

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose, loading])

  const handleChange = (event) => {
    const { name, value } = event.target
    const nextValue = name === 'phone' ? normalizePhoneNumber(value) : value

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: nextValue,
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
    if (loading) {
      return
    }

    setFormValues(initialFormState)
    setError('')
    setAppsDropdownOpen(false)
    onClose?.()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    let submittedSuccessfully = false
    const selectedApps = normalizeManagedUserApps(formValues.apps)
    const internalIdValue = formValues.internal_id.trim()
    const phoneValue = normalizePhoneNumber(formValues.phone)

    // Validasi department_id
    if (!formValues.department_id) {
      setError('Divisi wajib dipilih.')
      setLoading(false)
      return
    }

    try {
      const userData = {
        username: formValues.username.trim(),
        password: formValues.password,
        name: formValues.name.trim(),
        email: formValues.email.trim() || null,
        phone: phoneValue || null,
        department_id: parseInt(formValues.department_id),
        job_position: formValues.job_position.trim() || null,
        job_level: formValues.job_level.trim() || null,
        internal_id: internalIdValue ? Number.parseInt(internalIdValue, 10) : null,
        apps: selectedApps,
      }

      const response = await registerUser(userData)

      if (typeof onSubmit === 'function') {
        await onSubmit(response)
      }

      setFormValues(initialFormState)
      setAppsDropdownOpen(false)
      submittedSuccessfully = true
    } catch (err) {
      setError(err.message || 'Failed to register user')
    } finally {
      setLoading(false)
    }

    if (submittedSuccessfully) {
      onClose?.()
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup register-user-popup--users"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-user-popup-title"
        aria-describedby="register-user-popup-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">User Management</p>
            <h2 className="dashboard-popup__title" id="register-user-popup-title">
              Registrasi User
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup registrasi user"
            onClick={handleClose}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text" id="register-user-popup-description">
              Lengkapi data berikut untuk menambahkan user baru ke direktori.
            </p>

            {error && (
              <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
                {error}
              </div>
            )}

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
                      placeholder="Masukkan password"
                      autoComplete="new-password"
                      required
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
                      inputMode="numeric"
                      pattern="[0-9]*"
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
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
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
                    <select
                      className="register-user-popup__select"
                      name="job_level"
                      value={formValues.job_level}
                      onChange={handleChange}
                    >
                      <option value="">Pilih Job Level</option>
                      {jobLevelOptions.map((jobLevel) => (
                        <option key={jobLevel} value={jobLevel}>
                          {jobLevel}
                        </option>
                      ))}
                    </select>
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
                    />
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
                  aria-controls="register-user-popup-apps-options"
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

                {appsDropdownOpen && (
                  <div
                    className="register-user-popup__apps-list"
                    id="register-user-popup-apps-options"
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
                              <small>{project.slug}</small>
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>

          <div className="dashboard-popup__actions">
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--secondary"
              onClick={handleClose}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--primary"
              disabled={loading}
            >
              {loading ? 'Menyimpan...' : 'Simpan User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterUserPopup
