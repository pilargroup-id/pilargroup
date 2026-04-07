import { Fragment, useEffect, useState } from 'react'
import { ChevronDown, Edit03, Trash03 } from '@untitledui/icons'

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
}`  `

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
  const userApps = Array.isArray(user.apps)
    ? user.apps
    : Array.isArray(rawUser.apps)
      ? rawUser.apps
      : []

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
          label: 'department_id',
          value: getDetailValue(rawUser.department_id ?? rawUser.departmentId),
        },
        {
          label: 'department',
          value: getDetailValue(
            rawUser.department ??
              rawUser.department_name ??
              rawUser.departmentName ??
              user.division,
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
      title: 'Activity & Apps',
      wide: true,
      fields: [
        { label: 'created_at', value: getDetailValue(rawUser.created_at ?? rawUser.createdAt) },
        { label: 'updated_at', value: getDetailValue(rawUser.updated_at ?? rawUser.updatedAt) },
        {
          label: 'apps',
          value: getDetailValue(userApps),
          kind: 'chips',
          wide: true,
        },
      ],
    },
  ]
}

function TableUser({
  users = [],
  tableMessage = '',
  pagination = null,
  onEditUser,
  onDeleteUser,
}) {
  const [expandedUserId, setExpandedUserId] = useState(null)
  const visibleUserIdsKey = users.map((user) => user.userId).join('|')

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

  return (
    <>
      <div className="users-table-wrapper">
        <table className="users-table">
          <thead>
            <tr>
              <th scope="col">User</th>
              <th scope="col">Email</th>
              <th scope="col">Division</th>
              <th scope="col">Role</th>
              <th scope="col">Last Active</th>
              <th scope="col" className="users-table__detail-header">
                Detail
              </th>
            </tr>
          </thead>

          <tbody>
            {users.length > 0 ? (
              users.map((user) => {
                const isExpanded = expandedUserId === user.userId
                const accordionId = `users-table-accordion-${user.userId}`
                const detailSections = getDetailSections(user)

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
                            <strong className="users-table__name">{user.name}</strong>
                            <p className="users-table__meta">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        {user.email !== '-' ? (
                          <a
                            href={`mailto:${user.email}`}
                            className="users-table__link"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                            }}
                          >
                            {user.email}
                          </a>
                        ) : (
                          user.email
                        )}
                      </td>
                      <td>{user.division}</td>
                      <td>{user.role}</td>
                      <td>{user.lastActive}</td>
                      <td className="users-table__detail-cell">
                        <button
                          type="button"
                          className="users-table__detail-button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleToggleUser(user.userId)
                          }}
                          aria-expanded={isExpanded}
                          aria-controls={accordionId}
                          title={isExpanded ? 'Tutup detail user' : 'Buka detail user'}
                        >
                          <span>Detail</span>
                          <ChevronDown
                            size={16}
                            aria-hidden="true"
                            className={`users-table__detail-icon${
                              isExpanded ? ' users-table__detail-icon--open' : ''
                            }`}
                          />
                        </button>
                      </td>
                    </tr>

                    {isExpanded ? (
                      <tr className="users-table__accordion-row">
                        <td colSpan="6">
                          <div className="users-table__accordion" id={accordionId}>
                            <div className="users-table__accordion-header">
                              <div className="users-table__accordion-copy">
                                <p className="users-table__accordion-eyebrow">User detail</p>
                                <h3 className="users-table__accordion-title">{user.name}</h3>
                              </div>

                              <span
                                className={`users-table__status users-table__status--${user.statusKey}`}
                              >
                                {user.status}
                              </span>
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

                            <div className="users-table__accordion-actions">
                              <button
                                type="button"
                                className="users-table__accordion-button"
                                onClick={(event) => handleEditUser(event, user)}
                              >
                                <Edit03 size={16} aria-hidden="true" />
                                Edit
                              </button>

                              <button
                                type="button"
                                className="users-table__accordion-button users-table__accordion-button--danger"
                                onClick={(event) => handleDeleteUser(event, user)}
                              >
                                <Trash03 size={16} aria-hidden="true" />
                                Delete
                              </button>
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
                <td colSpan="6">
                  <div className="users-table__empty">{tableMessage}</div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <div className="users-table-pagination">
          <p className="users-table-pagination__summary">{pagination.summary}</p>

          <div className="users-table-pagination__controls" aria-label="Users pagination">
            <button
              type="button"
              className="users-table-pagination__button"
              onClick={pagination.onPrevious}
              disabled={pagination.currentPage === 1}
            >
              Previous
            </button>

            {pagination.items.map((item) =>
              typeof item === 'number' ? (
                <button
                  key={item}
                  type="button"
                  className={`users-table-pagination__button${
                    item === pagination.currentPage ? ' users-table-pagination__button--active' : ''
                  }`}
                  onClick={() => pagination.onSelect(item)}
                  aria-current={item === pagination.currentPage ? 'page' : undefined}
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
              onClick={pagination.onNext}
              disabled={pagination.currentPage === pagination.totalPages}
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
