import { useEffect, useState } from 'react'
import { XClose } from '@untitledui/icons'
import { getDepartments } from '@/services/master/getDepartements'
import { getProjects } from '@/services/master/getProjects'
import { getJobLevels } from '@/services/master/getJobLevels'
import { normalizeManagedUserApps, registerUser } from '@/services/manageUsers'
import { normalizePhoneNumber } from '@/utils/normalizePhoneNumber'
import api from '@/services/api'

const initialFormState = {
  username: '',
  password: '',
  name: '',
  email: '',
  phone: '',
  department_ids: [],
  job_position: '',
  job_level_id: '',
  internal_id: '',
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

function RegisterUserPopup({ isOpen, onClose, onSubmit }) {
  const [formValues, setFormValues] = useState(initialFormState)
  const [departments, setDepartments] = useState([])
  const [projects, setProjects] = useState([])
  const [jobLevels, setJobLevels] = useState([])
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [appsDropdownOpen, setAppsDropdownOpen] = useState(false)
  const [companiesDropdownOpen, setCompaniesDropdownOpen] = useState(false)
  const [departmentsDropdownOpen, setDepartmentsDropdownOpen] = useState(false)
  const [departmentsSearch, setDepartmentsSearch] = useState('')
  const appsListId = 'register-user-popup-apps-list'
  const companiesListId = 'register-user-popup-companies-list'
  const departmentsListId = 'register-user-popup-departments-list'
  const visibleProjects = getSelectableProjects(projects)

  const filteredDepartments = departments.filter((dept) => 
    dept.name.toLowerCase().includes(departmentsSearch.toLowerCase())
  )

  useEffect(() => {
    if (!isOpen) {
      setAppsDropdownOpen(false)
      setCompaniesDropdownOpen(false)
      setDepartmentsDropdownOpen(false)
      setDepartmentsSearch('')
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !loading) {
        setFormValues(initialFormState)
        setError('')
        setAppsDropdownOpen(false)
        setCompaniesDropdownOpen(false)
        setDepartmentsDropdownOpen(false)
        setDepartmentsSearch('')
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Fetch departments and projects
    const fetchData = async () => {
      try {
        const [depts, projs, jls, comps] = await Promise.all([
          getDepartments(),
          getProjects(),
          getJobLevels(),
          api.request('/master/companies').then((data) => (Array.isArray(data) ? data : data?.data || [])).catch(() => []),
        ])
        setDepartments(depts)
        setProjects(projs)
        setJobLevels(jls)
        setCompanies(comps)
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

  const handleDepartmentsChange = (event) => {
    const { value, checked } = event.target

    setFormValues((currentValues) => {
      if (checked) {
        if (currentValues.department_ids.includes(value)) {
          return currentValues
        }

        return {
          ...currentValues,
          department_ids: [...currentValues.department_ids, value],
        }
      }

      return {
        ...currentValues,
        department_ids: currentValues.department_ids.filter((id) => id !== value),
      }
    })
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
    if (loading) {
      return
    }

    setFormValues(initialFormState)
    setError('')
    setAppsDropdownOpen(false)
    setCompaniesDropdownOpen(false)
    setDepartmentsDropdownOpen(false)
    setDepartmentsSearch('')
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

    // Validasi department_ids
    if (!formValues.department_ids || formValues.department_ids.length === 0) {
      setError('Divisi wajib dipilih minimal satu.')
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
        departments: formValues.department_ids.map((id, index) => ({ id: parseInt(id), is_primary: index === 0 })),
        job_position: formValues.job_position.trim() || null,
        job_level_id: formValues.job_level_id ? parseInt(formValues.job_level_id) : null,
        companies: formValues.company_ids.map(id => ({ id })),
        internal_id: internalIdValue ? Number.parseInt(internalIdValue, 10) : null,
        apps: selectedApps,
      }

      const response = await registerUser(userData)

      if (typeof onSubmit === 'function') {
        await onSubmit(response)
      }

      setFormValues(initialFormState)
      setAppsDropdownOpen(false)
      setCompaniesDropdownOpen(false)
      setDepartmentsDropdownOpen(false)
      setDepartmentsSearch('')
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
                <div 
                  className="register-user-popup__grid"
                  style={{
                    paddingBottom: (departmentsDropdownOpen || companiesDropdownOpen) ? '220px' : '0px',
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

                  <div className="register-user-popup__field" aria-labelledby={companiesListId}>
                    <span className="register-user-popup__label" id={companiesListId}>Company</span>
                    
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="register-user-popup__input"
                        onClick={() => setCompaniesDropdownOpen((current) => !current)}
                        aria-expanded={companiesDropdownOpen}
                        aria-controls="register-user-popup-companies-options"
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
                          id="register-user-popup-companies-options"
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

                  <div className="register-user-popup__field" aria-labelledby={departmentsListId}>
                    <span className="register-user-popup__label" id={departmentsListId}>Divisi</span>
                    
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="text"
                          className="register-user-popup__input"
                          placeholder={formValues.department_ids.length === 0 ? "Cari divisi..." : `${formValues.department_ids.length} Divisi dipilih`}
                          value={departmentsSearch}
                          onChange={(e) => {
                            setDepartmentsSearch(e.target.value)
                            setDepartmentsDropdownOpen(true)
                          }}
                          onFocus={() => setDepartmentsDropdownOpen(true)}
                          aria-expanded={departmentsDropdownOpen}
                          aria-controls="register-user-popup-departments-options"
                          style={{ 
                            width: '100%', 
                            paddingRight: '32px',
                            backgroundColor: 'var(--bg-primary, #ffffff)'
                          }}
                        />
                        <svg
                          className={`register-user-popup__dropdown-icon ${departmentsDropdownOpen ? 'open' : ''}`}
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          onClick={() => setDepartmentsDropdownOpen((cur) => !cur)}
                          style={{ position: 'absolute', right: '12px', color: '#64748b', cursor: 'pointer', zIndex: 1 }}
                        >
                          <path
                            d="M4 6L8 10L12 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      {departmentsDropdownOpen && (
                        <div
                          className="register-user-popup__apps-list"
                          id="register-user-popup-departments-options"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            minWidth: '100%',
                            zIndex: 60,
                            marginTop: '4px',
                            background: 'var(--bg-primary, #ffffff)',
                            border: '1px solid var(--border-primary, #e2e8f0)',
                            borderRadius: '8px',
                            maxHeight: '250px',
                            overflowY: 'hidden',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            padding: '4px'
                          }}
                        >
                          {filteredDepartments.length === 0 ? (
                            <div className="register-user-popup__no-options" style={{ padding: '8px 12px' }}>
                              Divisi tidak ditemukan
                            </div>
                          ) : (
                            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                              {filteredDepartments.map((dept) => {
                                const deptId = String(dept.id)
                                const isSelected = formValues.department_ids.includes(deptId)

                                return (
                                  <div
                                    key={deptId}
                                    onClick={() => handleDepartmentsChange({ target: { value: deptId, checked: !isSelected } })}
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
                                    <span style={{ 
                                      fontSize: '14px', 
                                      color: isSelected ? '#0f172a' : '#334155', 
                                      fontWeight: isSelected ? '500' : '400',
                                      whiteSpace: 'normal',
                                      wordBreak: 'break-word',
                                      lineHeight: '1.4',
                                      paddingRight: '8px'
                                    }}>
                                      {dept.name}
                                    </span>
                                    {isSelected && (
                                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: '#10b981' }}>
                                        <path d="M13.3334 4L6.00008 11.3333L2.66675 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

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
