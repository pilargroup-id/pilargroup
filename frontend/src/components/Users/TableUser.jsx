import { Fragment, useEffect, useMemo, useState, useRef } from 'react'
import { ChevronDown, Edit03, Trash03, DownloadCloud02, UploadCloud02 } from '@untitledui/icons'

const DEFAULT_USERS_PER_PAGE = 10
const EMPTY_FILTERS = {
  company: '',
  department: '',
  departmentClass: '',
  employmentType: '',
  apps: '',
  status: '',
}

function getInitials(name = '') {
  return String(name)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getDetailValue(value) {
  if (Array.isArray(value)) {
    return value
  }

  if (value === null) {
    return 'null'
  }

  if (value === undefined || value === '') {
    return '-'
  }

  return value
}

function Switch({
  checked,
  defaultChecked = false,
  disabled = false,
  inputProps = {},
  onChange,
  ...props
}) {
  const isControlled = checked !== undefined
  const switchChecked = isControlled ? checked : defaultChecked

  return (
    <label
      className={`users-table-switch${switchChecked ? ' users-table-switch--checked' : ''}${
        disabled ? ' users-table-switch--disabled' : ''
      }`}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
      {...props}
    >
      <input
        type="checkbox"
        className="users-table-switch__input"
        checked={isControlled ? checked : undefined}
        defaultChecked={isControlled ? undefined : defaultChecked}
        disabled={disabled}
        onChange={onChange}
        {...inputProps}
      />
      <span className="users-table-switch__track" aria-hidden="true">
        <span className="users-table-switch__thumb" />
      </span>
    </label>
  )
}

function formatAppsForTable(apps) {
  if (!Array.isArray(apps)) {
    return []
  }

  return apps
    .map((app) => String(app).trim())
    .filter(Boolean)
}

function renderAppsForTable(apps) {
  const appList = formatAppsForTable(apps)

  if (appList.length === 0) {
    return <span className="users-table__apps-empty">-</span>
  }

  return (
    <div className="users-table__apps">
      {appList.map((app, index) => (
        <span
          key={`${app}-${index}`}
          className="users-table__status users-table__status--inline users-table__status--app"
        >
          {app}
        </span>
      ))}
    </div>
  )
}

function formatDepartmentsForTable(division) {
  if (!division) {
    return []
  }

  return division
    .split(',')
    .map((dept) => String(dept).trim())
    .filter((dept) => dept && dept !== '-')
}

function renderDepartmentsForTable(division) {
  const deptList = formatDepartmentsForTable(division)

  if (deptList.length === 0) {
    return <span className="users-table__apps-empty">-</span>
  }

  return (
    <div className="users-table__apps">
      {deptList.map((dept, index) => (
        <span
          key={`${dept}-${index}`}
          className="users-table__status users-table__status--inline users-table__status--dept"
        >
          {dept}
        </span>
      ))}
    </div>
  )
}

function formatCompaniesForTable(company) {
  if (!company) {
    return []
  }

  return company
    .split(',')
    .map((c) => String(c).trim())
    .filter((c) => c && c !== '-')
}

function renderCompaniesForTable(company) {
  const companyList = formatCompaniesForTable(company)

  if (companyList.length === 0) {
    return <span className="users-table__apps-empty">-</span>
  }

  return (
    <div className="users-table__apps">
      {companyList.map((c, index) => (
        <span
          key={`${c}-${index}`}
          className="users-table__status users-table__status--inline users-table__status--company"
        >
          {c}
        </span>
      ))}
    </div>
  )
}

function getEmploymentTypeLabel(value) {
  const employmentTypeLabels = {
    UP: 'Under Pilar',
    OS: 'Outsourced',
    HL: 'Harian Lepas',
  }
  const normalizedValue = value === undefined || value === null ? '' : String(value).trim()

  if (!normalizedValue || normalizedValue === '-') {
    return '-'
  }

  return employmentTypeLabels[normalizedValue.toUpperCase()] ?? normalizedValue
}

function normalizeFilterValue(value) {
  return String(value ?? '').trim().toLowerCase()
}

function getPaginationItems(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const paginationItems = [1]
  const windowStart = Math.max(2, currentPage - 1)
  const windowEnd = Math.min(totalPages - 1, currentPage + 1)

  if (windowStart > 2) {
    paginationItems.push('start-ellipsis')
  }

  for (let page = windowStart; page <= windowEnd; page += 1) {
    paginationItems.push(page)
  }

  if (windowEnd < totalPages - 1) {
    paginationItems.push('end-ellipsis')
  }

  paginationItems.push(totalPages)

  return paginationItems
}

function getUniqueOptions(users, getValues) {
  const optionsByKey = new Map()

  users.forEach((user) => {
    getValues(user).forEach((value) => {
      const label = String(value ?? '').trim()

      if (!label || label === '-') {
        return
      }

      const key = normalizeFilterValue(label)

      if (!optionsByKey.has(key)) {
        optionsByKey.set(key, label)
      }
    })
  })

  return Array.from(optionsByKey.values()).sort((firstOption, secondOption) =>
    firstOption.localeCompare(secondOption),
  )
}

function userMatchesFilter(values, selectedValue) {
  if (!selectedValue) {
    return true
  }

  const normalizedSelectedValue = normalizeFilterValue(selectedValue)

  return values.some((value) => normalizeFilterValue(value) === normalizedSelectedValue)
}

function renderDetailValue(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="users-table__detail-value users-table__detail-value--mono">[]</span>
    }

    return (
      <div className="users-table__detail-chips">
        {value.map((item) => (
          <span className="users-table__detail-chip" key={item}>
            {item}
          </span>
        ))}
      </div>
    )
  }

  if (value === 'null') {
    return <span className="users-table__detail-value users-table__detail-value--muted">null</span>
  }

  if (value === '-') {
    return <span className="users-table__detail-value users-table__detail-value--muted">-</span>
  }

  return (
    <span
      className={`users-table__detail-value${
        typeof value === 'number' ? ' users-table__detail-value--mono' : ''
      }`}
    >
      {String(value)}
    </span>
  )
}

function getDetailSections(user) {
  const rawUser = user.raw ?? {}

  return [
    {
      title: 'Account',
      fields: [
        { label: 'internal_id', value: getDetailValue(rawUser.internal_id ?? rawUser.internalId) },
        { label: 'username', value: getDetailValue(rawUser.username ?? user.id) },
        { label: 'name', value: getDetailValue(rawUser.name ?? user.name) },
        { label: 'email', value: getDetailValue(rawUser.email) },
        { label: 'phone', value: getDetailValue(rawUser.phone) },
      ],
    },
    {
      title: 'Organization',
      fields: [
        {
          label: 'companies',
          value: getDetailValue(
            Array.isArray(rawUser.companies) && rawUser.companies.length > 0
              ? rawUser.companies.map((c) => c.name || c.code).filter(Boolean)
              : null
          ),
        },
        {
          label: 'department_id',
          value: getDetailValue(
            rawUser.department_id ?? 
            rawUser.departmentId ?? 
            (Array.isArray(rawUser.departments) && rawUser.departments.length > 0 ? rawUser.departments.map(d => d.id).join(', ') : null)
          ),
        },
        {
          label: 'department',
          value: getDetailValue(user.division),
        },
        {
          label: 'department_class',
          value: getDetailValue(user.departmentClass),
        },
        {
          label: 'departments',
          value: getDetailValue(
            Array.isArray(rawUser.departments) && rawUser.departments.length > 0
              ? rawUser.departments.map((d) => d.name)
              : null
          ),
        },
        {
          label: 'employment_type_code',
          value: getDetailValue(
            getEmploymentTypeLabel(
              rawUser.employment_type_code ??
                rawUser.employmentTypeCode ??
                rawUser.employment_type ??
                rawUser.employmentType ??
                user.employmentType,
            ),
          ),
        },
        {
          label: 'job_position',
          value: getDetailValue(rawUser.job_position ?? rawUser.jobPosition),
        },
        { label: 'job_level', value: getDetailValue(rawUser.job_level ?? rawUser.jobLevel) },
        { label: 'is_active', value: getDetailValue(rawUser.is_active ?? rawUser.isActive) },
      ],
    },
    {
      title: 'Activity',
      wide: true,
      fields: [
        { label: 'created_at', value: getDetailValue(rawUser.created_at ?? rawUser.createdAt) },
        { label: 'updated_at', value: getDetailValue(rawUser.updated_at ?? rawUser.updatedAt) },
        {
          label: 'last_active',
          value: getDetailValue(
            rawUser.last_active ??
              rawUser.lastActive ??
              rawUser.last_login_at ??
              rawUser.lastLoginAt ??
              user.lastActive,
          ),
        },
      ],
    },
  ]
}

function TableUser({
  users = [],
  tableMessage = '',
  pagination = null,
  usersPerPage = DEFAULT_USERS_PER_PAGE,
  onEditUser,
  onDeleteUser,
  onStatusChange,
  canEditUser = () => true,
  canDeleteUser = () => true,
  updatingStatusUserIds = [],
  onDownloadTemplate,
  onUploadUsers,
  isUploading = false,
  showImportExport = false,
}) {
  const fileInputRef = useRef(null)
  const [expandedUserId, setExpandedUserId] = useState(null)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [currentPage, setCurrentPage] = useState(1)
  const visibleUserIdsKey = users.map((user) => user.userId).join('|')
  const hasActiveFilters = Object.values(filters).some(Boolean)

  const filterOptions = useMemo(
    () => ({
      company: getUniqueOptions(users, (user) => formatCompaniesForTable(user.company)),
      department: getUniqueOptions(users, (user) => formatDepartmentsForTable(user.division)),
      departmentClass: getUniqueOptions(users, (user) => [user.departmentClass]),
      employmentType: getUniqueOptions(users, (user) => [
        getEmploymentTypeLabel(user.employmentType),
      ]),
      apps: getUniqueOptions(users, (user) => formatAppsForTable(user.apps)),
      status: getUniqueOptions(users, (user) => [user.status]),
    }),
    [users],
  )

  const filteredUsers = useMemo(
    () =>
      users.filter((user) =>
        userMatchesFilter(formatCompaniesForTable(user.company), filters.company) &&
        userMatchesFilter(formatDepartmentsForTable(user.division), filters.department) &&
        userMatchesFilter([user.departmentClass], filters.departmentClass) &&
        userMatchesFilter([getEmploymentTypeLabel(user.employmentType)], filters.employmentType) &&
        userMatchesFilter(formatAppsForTable(user.apps), filters.apps) &&
        userMatchesFilter([user.status], filters.status),
      ),
    [filters, users],
  )

  const internalPaginationEnabled = !pagination && usersPerPage > 0
  const totalUsers = filteredUsers.length
  const totalPages = Math.max(1, Math.ceil(totalUsers / usersPerPage))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStartIndex = internalPaginationEnabled ? (safeCurrentPage - 1) * usersPerPage : 0
  const pageEndIndex = internalPaginationEnabled ? pageStartIndex + usersPerPage : totalUsers
  const visibleUsers = internalPaginationEnabled
    ? filteredUsers.slice(pageStartIndex, pageEndIndex)
    : filteredUsers
  const visibleFrom = totalUsers === 0 ? 0 : pageStartIndex + 1
  const visibleTo = Math.min(pageEndIndex, totalUsers)
  const tablePagination =
    pagination ??
    (totalUsers > 0
      ? {
          summary: `Showing ${visibleFrom}-${visibleTo} of ${totalUsers} users`,
          currentPage: safeCurrentPage,
          totalPages,
          items: getPaginationItems(safeCurrentPage, totalPages),
          onPrevious: () => setCurrentPage((page) => Math.max(1, page - 1)),
          onNext: () => setCurrentPage((page) => Math.min(totalPages, page + 1)),
          onSelect: (page) => setCurrentPage(page),
        }
      : null)
  const emptyMessage =
    users.length > 0 && hasActiveFilters
      ? 'No users match the selected filters.'
      : tableMessage

  useEffect(() => {
    setExpandedUserId((currentExpandedUserId) => {
      if (!currentExpandedUserId) {
        return null
      }

      return users.some((user) => user.userId === currentExpandedUserId)
        ? currentExpandedUserId
        : null
    })
  }, [visibleUserIdsKey])

  useEffect(() => {
    setCurrentPage(1)
    setExpandedUserId(null)
  }, [filters, visibleUserIdsKey])

  const handleToggleUser = (userId) => {
    setExpandedUserId((currentExpandedUserId) =>
      currentExpandedUserId === userId ? null : userId,
    )
  }

  const handleRowKeyDown = (event, userId) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    handleToggleUser(userId)
  }

  const handleEditUser = (event, user) => {
    event.stopPropagation()
    onEditUser?.(user)
  }

  const handleDeleteUser = (event, user) => {
    event.stopPropagation()
    onDeleteUser?.(user)
  }

  const handleChangeUserStatus = (event, user) => {
    event.stopPropagation()
    onStatusChange?.(user, event.target.checked)
  }

  const handleFilterChange = (filterKey, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [filterKey]: value,
    }))
  }

  const handleClearFilters = () => {
    setFilters(EMPTY_FILTERS)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    onUploadUsers?.(file)
    
    // Reset input so the same file can be selected again if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const renderFilterSelect = (filterKey, label, options) => (
    <label className="users-table-filter__field">
      <span className="users-table-filter__label">{label}</span>
      <select
        className="users-table-filter__select"
        value={filters[filterKey]}
        onChange={(event) => handleFilterChange(filterKey, event.target.value)}
      >
        <option value="">All {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )

  return (
    <>
      <div className="users-table-filter" aria-label="User table filters">
        <div className="users-table-filter__grid">
          {renderFilterSelect('company', 'Company', filterOptions.company)}
          {renderFilterSelect('department', 'Departments', filterOptions.department)}
          {renderFilterSelect('departmentClass', 'Class', filterOptions.departmentClass)}
          {renderFilterSelect('employmentType', 'Employment Type', filterOptions.employmentType)}
          {renderFilterSelect('apps', 'Apps', filterOptions.apps)}
          {renderFilterSelect('status', 'Status', filterOptions.status)}
        </div>

        <div className="users-table-filter__actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <button
            type="button"
            className="users-table-filter__clear"
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            Clear filters
          </button>
          
          {showImportExport && (
            <>
              <button
                type="button"
                className="users-table-filter__clear"
                onClick={onDownloadTemplate}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}
              >
                <DownloadCloud02 size={16} />
                Download Template
              </button>

              <button
                type="button"
                className="users-table-filter__clear"
                onClick={handleUploadClick}
                disabled={isUploading}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <UploadCloud02 size={16} />
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
              />
            </>
          )}
        </div>
      </div>

      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Company</th>
              <th scope="col">Departments</th>
              <th scope="col">Class</th>
              <th scope="col">Employment Type</th>
              <th scope="col">Role</th>
              <th scope="col">Status</th>
              <th scope="col">Apps</th>
              <th scope="col" className="users-table__detail-header">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {visibleUsers.length > 0 ? (
              visibleUsers.map((user) => {
                const isExpanded = expandedUserId === user.userId
                const accordionId = `users-table-accordion-${user.userId}`
                const detailSections = getDetailSections(user)
                const userStatusKey = user.statusKey ?? 'inactive'
                const userStatusLabel = user.status ?? '-'
                const allowEditUser = canEditUser(user)
                const allowDeleteUser = canDeleteUser(user)
                const isActiveUser = userStatusKey === 'active'
                const isUpdatingStatus = updatingStatusUserIds.includes(user.userId)
                const label = {
                  inputProps: {
                    'aria-label': `Set ${user.name} status`,
                  },
                }

                return (
                  <Fragment key={user.userId}>
                    <tr
                      className={`users-table__row${isExpanded ? ' users-table__row--expanded' : ''}`}
                      onClick={() => handleToggleUser(user.userId)}
                      onKeyDown={(event) => handleRowKeyDown(event, user.userId)}
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      aria-controls={accordionId}
                    >
                      <td>
                        <div className="users-table__identity">
                          <span className="users-table__avatar">{getInitials(user.name)}</span>

                          <div className="users-table__identity-copy">
                            <div className="users-table__name-row">
                              <strong className="users-table__name">{user.name}</strong>
                            </div>
                            <p className="users-table__meta">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td>{renderCompaniesForTable(user.company)}</td>
                      <td>{renderDepartmentsForTable(user.division)}</td>
                      <td>{user.departmentClass || '-'}</td>
                      <td>{getEmploymentTypeLabel(user.employmentType)}</td>
                      <td>{user.role}</td>
                      <td>
                        <div className="users-table__status-toggle">
                          <Switch
                            {...label}
                            defaultChecked={isActiveUser}
                            checked={isActiveUser}
                            disabled={!allowEditUser || isUpdatingStatus}
                            onChange={(event) => handleChangeUserStatus(event, user)}
                          />
                          <span
                            className={`users-table__status users-table__status--inline users-table__status--${userStatusKey}`}
                          >
                            {userStatusLabel}
                          </span>
                        </div>
                      </td>
                      <td>{renderAppsForTable(user.apps)}</td>
                      <td className="users-table__detail-cell">
                        <div className="users-table__action-group">
                          {allowEditUser ? (
                            <button
                              type="button"
                              className="users-table__action-button"
                              onClick={(event) => handleEditUser(event, user)}
                              aria-label={`Edit ${user.name}`}
                              title="Edit"
                            >
                              <Edit03 size={16} aria-hidden="true" />
                            </button>
                          ) : null}

                          {allowDeleteUser ? (
                            <button
                              type="button"
                              className="users-table__action-button users-table__action-button--danger"
                              onClick={(event) => handleDeleteUser(event, user)}
                              aria-label={`Delete ${user.name}`}
                              title="Delete"
                            >
                              <Trash03 size={16} aria-hidden="true" />
                            </button>
                          ) : null}

                           <button
                            type="button"
                            className="users-table__detail-button"
                            onClick={(event) => {
                              event.stopPropagation()
                              handleToggleUser(user.userId)
                            }}
                            aria-label={isExpanded ? 'Tutup detail user' : 'Buka detail user'}
                            aria-expanded={isExpanded}
                            aria-controls={accordionId}
                            title={isExpanded ? 'Tutup detail user' : 'Buka detail user'}
                          >
                            <ChevronDown
                              size={16}
                              aria-hidden="true"
                              className={`users-table__detail-icon${
                                isExpanded ? ' users-table__detail-icon--open' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isExpanded ? (
                      <tr className="users-table__accordion-row">
                        <td colSpan="9">
                          <div className="users-table__accordion" id={accordionId}>
                            <div className="users-table__accordion-header">
                              <div className="users-table__accordion-copy">
                                <p className="users-table__accordion-eyebrow">User detail</p>
                                <h3 className="users-table__accordion-title">{user.name}</h3>
                              </div>
                            </div>

                            <div className="users-table__detail-shell">
                              {detailSections.map((section) => (
                                <section
                                  key={section.title}
                                  className={`users-table__detail-section${
                                    section.wide ? ' users-table__detail-section--wide' : ''
                                  }`}
                                >
                                  <div className="users-table__detail-section-header">
                                    <p className="users-table__detail-section-eyebrow">
                                      {section.title}
                                    </p>
                                  </div>

                                  <dl className="users-table__detail-list">
                                    {section.fields.map((field) => (
                                      <div
                                        key={field.label}
                                        className={`users-table__detail-row${
                                          field.kind === 'chips'
                                            ? ' users-table__detail-row--stacked'
                                            : ''
                                        }`}
                                      >
                                        <dt className="users-table__detail-label">{field.label}</dt>
                                        <dd className="users-table__detail-field">
                                          {renderDetailValue(field.value)}
                                        </dd>
                                      </div>
                                    ))}
                                  </dl>
                                </section>
                              ))}
                            </div>

                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })
            ) : (
              <tr>
                <td colSpan="9">
                  <div className="users-table__empty">{emptyMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {tablePagination ? (
        <div className="users-table-pagination">
          <p className="users-table-pagination__summary">{tablePagination.summary}</p>

          <div className="users-table-pagination__controls" aria-label="Users pagination">
            <button
              type="button"
              className="users-table-pagination__button"
              onClick={tablePagination.onPrevious}
              disabled={tablePagination.currentPage === 1}
            >
              Previous
            </button>

            {tablePagination.items.map((item) =>
              typeof item === 'number' ? (
                <button
                  key={item}
                  type="button"
                  className={`users-table-pagination__button${
                    item === tablePagination.currentPage
                      ? ' users-table-pagination__button--active'
                      : ''
                  }`}
                  onClick={() => tablePagination.onSelect(item)}
                  aria-current={item === tablePagination.currentPage ? 'page' : undefined}
                >
                  {item}
                </button>
              ) : (
                <span key={item} className="users-table-pagination__ellipsis" aria-hidden="true">
                  ...
                </span>
              ),
            )}

            <button
              type="button"
              className="users-table-pagination__button"
              onClick={tablePagination.onNext}
              disabled={tablePagination.currentPage === tablePagination.totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default TableUser
