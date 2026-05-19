import { useEffect, useState } from 'react'
import { XClose } from '@untitledui/icons'
import { getDepartments } from '@/services/master/getDepartements'
import { getProjects } from '@/services/master/getProjects'
import { getJobLevels } from '@/services/master/getJobLevels'
import { normalizePhoneNumber } from '@/utils/normalizePhoneNumber'
import api from '@/services/api'
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
  job_level_id: '',
  internal_id: '',
  is_active: 'true',
  company_ids: [],
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
    phone: normalizePhoneNumber(rawUser.phone),
    department_id: getTextValue(
      rawUser.department_id ?? 
      rawUser.departmentId ?? 
      (Array.isArray(rawUser.departments) && rawUser.departments.length > 0 ? rawUser.departments[0].id : '')
    ),
    job_position: getTextValue(rawUser.job_position ?? rawUser.jobPosition),
    job_level_id: getTextValue(rawUser.job_level_id ?? rawUser.jobLevelId),
    internal_id: getTextValue(rawUser.internal_id ?? rawUser.internalId),
    is_active: getBooleanSelectValue(rawUser.is_active ?? rawUser.isActive ?? user?.statusKey),
    company_ids: Array.isArray(rawUser.companies)
      ? rawUser.companies.map((c) => String(c.id))
      : [],
    apps: userApps,
  }
}

function EditUserPopup({ user, isSubmitting, errorMessage, onClose, onSubmit }) {
  const [formValues, setFormValues] = useState(() => getEditFormState(user))
  const [departments, setDepartments] = useState([])
  const [projects, setProjects] = useState([])
  const [jobLevels, setJobLevels] = useState([])
  const [companies, setCompanies] = useState([])
  const [appsDropdownOpen, setAppsDropdownOpen] = useState(false)
  const [companiesDropdownOpen, setCompaniesDropdownOpen] = useState(false)
  const appsListId = 'edit-user-popup-apps-list'
  const companiesListId = 'edit-user-popup-companies-list'

  useEffect(() => {
    if (!user) {
      setFormValues(initialFormState)
      setDepartments([])
      setProjects([])
      setCompanies([])
      setAppsDropdownOpen(false)
      setCompaniesDropdownOpen(false)
      return undefined
    }

    setFormValues(getEditFormState(user))
    setAppsDropdownOpen(false)
    setCompaniesDropdownOpen(false)
  }, [user])

  useEffect(() => {
    if (!user) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        setCompaniesDropdownOpen(false)
        setAppsDropdownOpen(false)
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
        const [depts, projs, jls, comps] = await Promise.all([
            getDepartments(),
            getProjects(),
            getJobLevels(),
            api.request('/master/companies').then((data) => (Array.isArray(data) ? data : data?.data || [])).catch(() => []),
        ])

        if (!isActive) {
          return
        }

        setDepartments(depts)
        setProjects(projs)
        setJobLevels(jls)
        setCompanies(comps)
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
    const nextValue = name === 'phone' ? normalizePhoneNumber(value) : value

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: nextValue,
    }))
  }

  const handleCompaniesChange = (event) => {
    const { value, checked } = event.target

    setFormValues((currentValues) => {
      if (checked) {
        if (currentValues.company_ids.includes(value)) {
          return currentValues
        }

        return {
          ...currentValues,
          company_ids: [...currentValues.company_ids, value],
        }
      }

      return {
        ...currentValues,
        company_ids: currentValues.company_ids.filter((id) => id !== value),
      }
    })
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
    setCompaniesDropdownOpen(false)
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
                <div 
                  className="register-user-popup__grid"
                  style={{
                    paddingBottom: (companiesDropdownOpen) ? '220px' : '0px',
                    transition: 'padding-bottom 0.2s ease'
                  }}
                >
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
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                  </label>

                  <div className="register-user-popup__field" aria-labelledby={companiesListId}>
                    <span className="register-user-popup__label" id={companiesListId}>Company</span>
                    
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="register-user-popup__input"
                        onClick={() => setCompaniesDropdownOpen((current) => !current)}
                        aria-expanded={companiesDropdownOpen}
                        aria-controls="edit-user-popup-companies-options"
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          width: '100%', 
                          textAlign: 'left',
                          cursor: 'pointer',
                          backgroundColor: 'var(--bg-primary, #ffffff)'
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {formValues.company_ids.length === 0
                            ? 'Pilih Company'
                            : `${formValues.company_ids.length} Company dipilih`}
                        </span>
                        <svg
                          className={`register-user-popup__dropdown-icon ${companiesDropdownOpen ? 'open' : ''}`}
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          style={{ flexShrink: 0, marginLeft: '8px', color: '#64748b' }}
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

                      {companiesDropdownOpen && (
                        <div
                          className="register-user-popup__apps-list"
                          id="edit-user-popup-companies-options"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            zIndex: 50,
                            marginTop: '4px',
                            background: 'var(--bg-primary, #ffffff)',
                            border: '1px solid var(--border-primary, #e2e8f0)',
                            borderRadius: '8px',
                            maxHeight: '200px',
                            overflowY: 'auto',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '4px'
                          }}
                        >
                          {companies.length === 0 ? (
                            <div className="register-user-popup__no-options" style={{ padding: '8px 12px' }}>
                              Tidak ada company tersedia
                            </div>
                          ) : (
                            companies.map((company) => {
                              const companyId = String(company.id || company.code)
                              const isSelected = formValues.company_ids.includes(companyId)

                              return (
                                <div
                                  key={companyId}
                                  onClick={() => handleCompaniesChange({ target: { value: companyId, checked: !isSelected } })}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    margin: 0,
                                    padding: '8px 12px',
                                    boxSizing: 'border-box',
                                    cursor: 'pointer',
                                    backgroundColor: isSelected ? '#f8fafc' : 'transparent',
                                    borderBottom: '1px solid #f1f5f9'
                                  }}
                                >
                                  <span style={{ fontSize: '14px', color: isSelected ? '#0f172a' : '#334155', fontWeight: isSelected ? '500' : '400' }}>
                                    {company.name}
                                  </span>
                                  {isSelected && (
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#10b981' }}>
                                      <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  )}
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>

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
                    <select
                        className="register-user-popup__select"
                        name="job_level_id"
                        value={formValues.job_level_id}
                        onChange={handleChange}
                    >
                        <option value="">Pilih Job Level</option>
                        {jobLevels.map((jl) => (
                            <option key={jl.id} value={jl.id}>
                                {jl.name}
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
