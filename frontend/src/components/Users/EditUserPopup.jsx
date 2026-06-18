import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
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
  department_ids: [],
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

function haveSameStrings(currentValues, nextValues) {
  if (currentValues.length !== nextValues.length) {
    return false
  }

  return currentValues.every((value, index) => value === nextValues[index])
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

function getDepartmentGroupName(department) {
  return department?.raw?.parent_name || department?.raw?.name || department?.name || 'Umum'
}

function getDepartmentClassName(department) {
  return department?.raw?.class || department?.class || 'Umum'
}

function getSelectedGroupsFromDepartments(departments, departmentIds) {
  if (!Array.isArray(departments) || departments.length === 0) {
    return []
  }

  const selectedDepartmentIds = new Set(
    (Array.isArray(departmentIds) ? departmentIds : []).map((id) => String(id)),
  )

  return Array.from(
    new Set(
      departments
        .filter((department) => selectedDepartmentIds.has(String(department.id)))
        .map((department) => getDepartmentGroupName(department))
        .filter(Boolean),
    ),
  )
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
    department_ids: Array.isArray(rawUser.departments)
      ? rawUser.departments.map((department) => String(department.id)).filter(Boolean)
      : rawUser.department_id || rawUser.departmentId
        ? [String(rawUser.department_id ?? rawUser.departmentId)]
        : [],
    job_position: getTextValue(rawUser.job_position ?? rawUser.jobPosition),
    job_level_id: getTextValue(rawUser.job_level_id ?? rawUser.jobLevelId),
    internal_id: getTextValue(rawUser.internal_id ?? rawUser.internalId),
    is_active: getBooleanSelectValue(rawUser.is_active ?? rawUser.isActive ?? user?.statusKey),
    company_ids: Array.isArray(rawUser.companies)
      ? rawUser.companies.map((c) => String(c.id)).filter(Boolean)
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
  const [departmentsDropdownOpen, setDepartmentsDropdownOpen] = useState(false)
  const [classDropdownOpen, setClassDropdownOpen] = useState(false)
  const [departmentsSearch, setDepartmentsSearch] = useState('')
  const [classSearch, setClassSearch] = useState('')
  const [selectedGroups, setSelectedGroups] = useState([])
  const [showPassword, setShowPassword] = useState(false)
  const [tabValue, setTabValue] = useState(0)
  const appsListId = 'edit-user-popup-apps-list'
  const companiesListId = 'edit-user-popup-companies-list'
  const departmentsListId = 'edit-user-popup-departments-list'
  const classListId = 'edit-user-popup-class-list'

  const departmentGroups = useMemo(
    () =>
      departments.reduce((acc, department) => {
        const groupName = getDepartmentGroupName(department)

        if (!acc[groupName]) {
          acc[groupName] = []
        }

        acc[groupName].push(department)
        return acc
      }, {}),
    [departments],
  )

  const groupNames = useMemo(() => Object.keys(departmentGroups).sort(), [departmentGroups])

  const filteredGroups = useMemo(
    () =>
      groupNames.filter((name) =>
        name.toLowerCase().includes(departmentsSearch.toLowerCase()),
      ),
    [departmentsSearch, groupNames],
  )

  const availableClasses = useMemo(
    () =>
      selectedGroups.reduce((acc, groupName) => {
        if (departmentGroups[groupName]) {
          acc.push(...departmentGroups[groupName])
        }

        return acc
      }, []),
    [departmentGroups, selectedGroups],
  )

  const filteredClasses = useMemo(
    () =>
      availableClasses.filter((department) => {
        const className = getDepartmentClassName(department)
        return className.toLowerCase().includes(classSearch.toLowerCase())
      }),
    [availableClasses, classSearch],
  )

  useEffect(() => {
    if (!user) {
      setFormValues(initialFormState)
      setDepartments([])
      setProjects([])
      setCompanies([])
      setSelectedGroups([])
      setShowPassword(false)
      setAppsDropdownOpen(false)
      setCompaniesDropdownOpen(false)
      setDepartmentsDropdownOpen(false)
      setClassDropdownOpen(false)
      setDepartmentsSearch('')
      setClassSearch('')
      setTabValue(0)
      return undefined
    }

    setFormValues(getEditFormState(user))
    setShowPassword(false)
    setAppsDropdownOpen(false)
    setCompaniesDropdownOpen(false)
    setDepartmentsDropdownOpen(false)
    setClassDropdownOpen(false)
    setDepartmentsSearch('')
    setClassSearch('')
    setTabValue(0)
  }, [user])

  useEffect(() => {
    if (!user) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        setCompaniesDropdownOpen(false)
        setAppsDropdownOpen(false)
        setDepartmentsDropdownOpen(false)
        setClassDropdownOpen(false)
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
          api
            .request('/master/companies')
            .then((data) => (Array.isArray(data) ? data : data?.data || []))
            .catch(() => []),
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

  useEffect(() => {
    const nextSelectedGroups = getSelectedGroupsFromDepartments(departments, formValues.department_ids)

    setSelectedGroups((currentGroups) =>
      haveSameStrings(currentGroups, nextSelectedGroups) ? currentGroups : nextSelectedGroups,
    )
  }, [departments, formValues.department_ids])

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

  const handleGroupToggle = (groupName, isSelected) => {
    if (!isSelected) {
      setSelectedGroups((currentGroups) =>
        currentGroups.includes(groupName) ? currentGroups : [...currentGroups, groupName],
      )
      return
    }

    setSelectedGroups((currentGroups) => currentGroups.filter((group) => group !== groupName))

    const classesToRemove = departmentGroups[groupName]?.map((department) => String(department.id)) || []

    setFormValues((currentValues) => ({
      ...currentValues,
      department_ids: currentValues.department_ids.filter((id) => !classesToRemove.includes(id)),
    }))
  }

  const handleClose = () => {
    if (isSubmitting) {
      return
    }

    setAppsDropdownOpen(false)
    setCompaniesDropdownOpen(false)
    setDepartmentsDropdownOpen(false)
    setClassDropdownOpen(false)
    setDepartmentsSearch('')
    setClassSearch('')
    setSelectedGroups([])
    setShowPassword(false)
    setTabValue(0)
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

  return createPortal(
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

            <div className="register-user-popup__layout" style={{ display: 'block' }}>
              <div className="register-user-popup__main">
                <div
                  style={{
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    marginBottom: '1.5rem',
                  }}
                >
                  <button
                    type="button"
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      background: 'none',
                      borderBottom:
                        tabValue === 0
                          ? '2px solid var(--theme-blue-primary, #1f4e8c)'
                          : '2px solid transparent',
                      color: tabValue === 0 ? 'var(--theme-blue-primary, #1f4e8c)' : '#64748b',
                      fontWeight: tabValue === 0 ? '600' : '500',
                      cursor: 'pointer',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => setTabValue(0)}
                  >
                    Informasi Akun
                  </button>
                  <button
                    type="button"
                    style={{
                      padding: '12px 24px',
                      border: 'none',
                      background: 'none',
                      borderBottom:
                        tabValue === 1
                          ? '2px solid var(--theme-blue-primary, #1f4e8c)'
                          : '2px solid transparent',
                      color: tabValue === 1 ? 'var(--theme-blue-primary, #1f4e8c)' : '#64748b',
                      fontWeight: tabValue === 1 ? '600' : '500',
                      cursor: 'pointer',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.2s ease',
                    }}
                    onClick={() => setTabValue(1)}
                  >
                    Organisasi & Jabatan
                  </button>
                </div>

                <div
                  style={{
                    display: 'block',
                    paddingBottom:
                      departmentsDropdownOpen || classDropdownOpen || companiesDropdownOpen
                        ? '220px'
                        : '0px',
                    transition: 'padding-bottom 0.2s ease',
                  }}
                >
                  <div hidden={tabValue !== 0}>
                    <div
                      className="register-user-popup__grid"
                      style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}
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
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <input
                            className="register-user-popup__input"
                            type={showPassword ? 'text' : 'password'}
                            name="password"
                            value={formValues.password}
                            onChange={handleChange}
                            placeholder="Kosongkan jika tidak diubah"
                            autoComplete="new-password"
                            minLength={6}
                            style={{ width: '100%', paddingRight: '40px' }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((current) => !current)}
                            style={{
                              position: 'absolute',
                              right: '12px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: 0,
                              color: '#64748b',
                            }}
                            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                          >
                            {showPassword ? (
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                              </svg>
                            ) : (
                              <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                              </svg>
                            )}
                          </button>
                        </div>
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

                  <div hidden={tabValue !== 1}>
                    <div
                      className="register-user-popup__grid"
                      style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}
                    >
                      <div className="register-user-popup__field" aria-labelledby={companiesListId}>
                        <span className="register-user-popup__label" id={companiesListId}>
                          Company
                        </span>

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
                              backgroundColor: 'var(--bg-primary, #ffffff)',
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
                                boxShadow:
                                  '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '4px',
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
                                      onClick={() =>
                                        handleCompaniesChange({
                                          target: { value: companyId, checked: !isSelected },
                                        })
                                      }
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
                                        borderBottom: '1px solid #f1f5f9',
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: '14px',
                                          color: isSelected ? '#0f172a' : '#334155',
                                          fontWeight: isSelected ? '500' : '400',
                                        }}
                                      >
                                        {company.name}
                                      </span>
                                      {isSelected && (
                                        <svg
                                          width="16"
                                          height="16"
                                          viewBox="0 0 16 16"
                                          fill="none"
                                          style={{ flexShrink: 0, color: '#10b981' }}
                                        >
                                          <path
                                            d="M13.3334 4L6.00008 11.3333L2.66675 8"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
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
                        <span className="register-user-popup__label" id={departmentsListId}>
                          Divisi
                        </span>

                        <div style={{ position: 'relative' }}>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="register-user-popup__input"
                              placeholder={
                                formValues.company_ids.length === 0
                                  ? 'Pilih company terlebih dahulu'
                                  : selectedGroups.length === 0
                                    ? 'Cari divisi...'
                                    : `${selectedGroups.length} Divisi dipilih`
                              }
                              value={departmentsSearch}
                              onChange={(event) => {
                                setDepartmentsSearch(event.target.value)
                                if (!departmentsDropdownOpen) setDepartmentsDropdownOpen(true)
                              }}
                              onFocus={() => {
                                if (formValues.company_ids.length > 0) setDepartmentsDropdownOpen(true)
                              }}
                              disabled={formValues.company_ids.length === 0}
                              aria-expanded={departmentsDropdownOpen}
                              aria-controls="edit-user-popup-departments-options"
                              style={{
                                width: '100%',
                                paddingRight: '32px',
                                backgroundColor:
                                  formValues.company_ids.length === 0
                                    ? '#f1f5f9'
                                    : 'var(--bg-primary, #ffffff)',
                                cursor:
                                  formValues.company_ids.length === 0 ? 'not-allowed' : 'text',
                              }}
                            />
                            <svg
                              className={`register-user-popup__dropdown-icon ${departmentsDropdownOpen ? 'open' : ''}`}
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              onClick={() => {
                                if (formValues.company_ids.length > 0) {
                                  setDepartmentsDropdownOpen((current) => !current)
                                }
                              }}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                color: '#64748b',
                                cursor: formValues.company_ids.length > 0 ? 'pointer' : 'not-allowed',
                                zIndex: 1,
                              }}
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

                          {departmentsDropdownOpen && formValues.company_ids.length > 0 && (
                            <div
                              className="register-user-popup__apps-list"
                              id="edit-user-popup-departments-options"
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
                                boxShadow:
                                  '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '4px',
                              }}
                            >
                              {filteredGroups.length === 0 ? (
                                <div className="register-user-popup__no-options" style={{ padding: '8px 12px' }}>
                                  Divisi tidak ditemukan
                                </div>
                              ) : (
                                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                                  {filteredGroups.map((groupName) => {
                                    const isSelected = selectedGroups.includes(groupName)

                                    return (
                                      <div
                                        key={groupName}
                                        onClick={() => handleGroupToggle(groupName, isSelected)}
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
                                          borderBottom: '1px solid #f1f5f9',
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: '14px',
                                            color: isSelected ? '#0f172a' : '#334155',
                                            fontWeight: isSelected ? '500' : '400',
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word',
                                            lineHeight: '1.4',
                                            paddingRight: '8px',
                                          }}
                                        >
                                          {groupName}
                                        </span>
                                        {isSelected && (
                                          <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 16 16"
                                            fill="none"
                                            style={{ flexShrink: 0, color: '#10b981' }}
                                          >
                                            <path
                                              d="M13.3334 4L6.00008 11.3333L2.66675 8"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
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

                        {selectedGroups.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '8px' }}>
                            {selectedGroups.map((groupName) => (
                              <span
                                key={groupName}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  background: '#f1f5f9',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  fontSize: '12px',
                                  color: '#334155',
                                  marginRight: '6px',
                                  marginBottom: '6px',
                                }}
                              >
                                {groupName}
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    handleGroupToggle(groupName, true)
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    marginLeft: '4px',
                                    padding: 0,
                                    color: '#64748b',
                                    display: 'flex',
                                    alignItems: 'center',
                                  }}
                                >
                                  <svg
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                  </svg>
                                </button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="register-user-popup__field" aria-labelledby={classListId}>
                        <span className="register-user-popup__label" id={classListId}>
                          Class
                        </span>

                        <div style={{ position: 'relative' }}>
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input
                              type="text"
                              className="register-user-popup__input"
                              placeholder={
                                selectedGroups.length === 0
                                  ? 'Pilih divisi terlebih dahulu'
                                  : formValues.department_ids.length === 0
                                    ? 'Cari class...'
                                    : `${formValues.department_ids.length} Class dipilih`
                              }
                              value={classSearch}
                              onChange={(event) => {
                                setClassSearch(event.target.value)
                                if (!classDropdownOpen) setClassDropdownOpen(true)
                              }}
                              onFocus={() => {
                                if (selectedGroups.length > 0) setClassDropdownOpen(true)
                              }}
                              disabled={selectedGroups.length === 0}
                              aria-expanded={classDropdownOpen}
                              aria-controls="edit-user-popup-class-options"
                              style={{
                                width: '100%',
                                paddingRight: '32px',
                                backgroundColor:
                                  selectedGroups.length === 0 ? '#f1f5f9' : 'var(--bg-primary, #ffffff)',
                                cursor: selectedGroups.length === 0 ? 'not-allowed' : 'text',
                              }}
                            />
                            <svg
                              className={`register-user-popup__dropdown-icon ${classDropdownOpen ? 'open' : ''}`}
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              onClick={() => {
                                if (selectedGroups.length > 0) setClassDropdownOpen((current) => !current)
                              }}
                              style={{
                                position: 'absolute',
                                right: '12px',
                                color: '#64748b',
                                cursor: selectedGroups.length > 0 ? 'pointer' : 'not-allowed',
                                zIndex: 1,
                              }}
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

                          {classDropdownOpen && selectedGroups.length > 0 && (
                            <div
                              className="register-user-popup__apps-list"
                              id="edit-user-popup-class-options"
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
                                boxShadow:
                                  '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '4px',
                              }}
                            >
                              {filteredClasses.length === 0 ? (
                                <div className="register-user-popup__no-options" style={{ padding: '8px 12px' }}>
                                  Class tidak ditemukan
                                </div>
                              ) : (
                                <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                                  {filteredClasses.map((department) => {
                                    const departmentId = String(department.id)
                                    const isSelected = formValues.department_ids.includes(departmentId)
                                    const classNameDisplay = getDepartmentClassName(department)

                                    return (
                                      <div
                                        key={departmentId}
                                        onClick={() =>
                                          handleDepartmentsChange({
                                            target: { value: departmentId, checked: !isSelected },
                                          })
                                        }
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
                                          borderBottom: '1px solid #f1f5f9',
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontSize: '14px',
                                            color: isSelected ? '#0f172a' : '#334155',
                                            fontWeight: isSelected ? '500' : '400',
                                            whiteSpace: 'normal',
                                            wordBreak: 'break-word',
                                            lineHeight: '1.4',
                                            paddingRight: '8px',
                                          }}
                                        >
                                          {classNameDisplay}
                                        </span>
                                        {isSelected && (
                                          <svg
                                            width="16"
                                            height="16"
                                            viewBox="0 0 16 16"
                                            fill="none"
                                            style={{ flexShrink: 0, color: '#10b981' }}
                                          >
                                            <path
                                              d="M13.3334 4L6.00008 11.3333L2.66675 8"
                                              stroke="currentColor"
                                              strokeWidth="2"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
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

                        {formValues.department_ids.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', marginTop: '8px' }}>
                            {formValues.department_ids.map((id) => {
                              const department = departments.find((item) => String(item.id) === String(id))
                              const classNameDisplay = getDepartmentClassName(department)

                              return (
                                <span
                                  key={id}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: '#f1f5f9',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    color: '#334155',
                                    marginRight: '6px',
                                    marginBottom: '6px',
                                  }}
                                >
                                  {classNameDisplay}
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation()
                                      handleDepartmentsChange({
                                        target: { value: id, checked: false },
                                      })
                                    }}
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      marginLeft: '4px',
                                      padding: 0,
                                      color: '#64748b',
                                      display: 'flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <svg
                                      width="12"
                                      height="12"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <line x1="18" y1="6" x2="6" y2="18"></line>
                                      <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                  </button>
                                </span>
                              )
                            })}
                          </div>
                        )}
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
                    </div>
                  </div>
                </div>
              </div>

              <section className="register-user-popup__section" aria-labelledby={appsListId} style={{ marginTop: '2rem', width: '100%' }}>
                <div className="register-user-popup__section-header" style={{ marginBottom: '1rem' }}>
                  <span
                    className="register-user-popup__label"
                    id={appsListId}
                    style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}
                  >
                    Apps{' '}
                    <span style={{ fontWeight: 'normal', color: '#64748b' }}>
                      ({formValues.apps.length === 0 ? 'Belum ada apps dipilih' : `${formValues.apps.length} dipilih`})
                    </span>
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
                  <div className="register-user-popup__apps-list" id="edit-user-popup-apps-options">
                    {visibleProjects.length === 0 ? (
                      <div className="register-user-popup__no-options">Tidak ada apps tersedia</div>
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
    </div>,
    document.body,
  )
}

export default EditUserPopup
