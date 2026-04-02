import { useState } from 'react'
import { UserPlus01 } from '@untitledui/icons'

import RegisterUserPopup from '@/components/users/RegisterUserPopup'
import AppLayout from '@/layouts/AppLayout'
import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'

const initialUsers = [
  {
    id: 'USR-001',
    name: 'Al Fatih',
    email: 'alfatih@pilar.group',
    division: 'Finance',
    role: 'Frontend Developer',
    status: 'Active',
    lastActive: '2 minutes ago',
  },
  {
    id: 'USR-002',
    name: 'Rina Aprilia',
    email: 'rina.aprilia@pilar.group',
    division: 'Legal',
    role: 'UI Designer',
    status: 'Pending',
    lastActive: '15 minutes ago',
  },
  {
    id: 'USR-003',
    name: 'Dimas Pratama',
    email: 'dimas.pratama@pilar.group',
    division: 'Product',
    role: 'Backend Engineer',
    status: 'Active',
    lastActive: '32 minutes ago',
  },
  {
    id: 'USR-004',
    name: 'Nadia Putri',
    email: 'nadia.putri@pilar.group',
    division: 'Finance',
    role: 'Business Analyst',
    status: 'Inactive',
    lastActive: 'Yesterday',
  },
  {
    id: 'USR-005',
    name: 'Bagas Wicaksono',
    email: 'bagas.wicaksono@pilar.group',
    division: 'Product',
    role: 'QA Engineer',
    status: 'Active',
    lastActive: '1 hour ago',
  },
  {
    id: 'USR-006',
    name: 'Salsa Maharani',
    email: 'salsa.maharani@pilar.group',
    division: 'Legal',
    role: 'Project Manager',
    status: 'Pending',
    lastActive: '3 hours ago',
  },
]

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function getNextUserId(users) {
  const highestUserNumber = users.reduce((highest, user) => {
    const currentNumber = Number.parseInt(user.id.replace(/\D/g, ''), 10)

    if (Number.isNaN(currentNumber)) {
      return highest
    }

    return Math.max(highest, currentNumber)
  }, 0)

  return `USR-${String(highestUserNumber + 1).padStart(3, '0')}`
}

function UserPage() {
  usePageTitle()

  const [searchQuery, setSearchQuery] = useState('')
  const [userList, setUserList] = useState(initialUsers)
  const [isRegisterPopupOpen, setRegisterPopupOpen] = useState(false)

  const handleRegisterUser = (formValues) => {
    setUserList((currentUsers) => [
      {
        id: getNextUserId(currentUsers),
        name: formValues.name,
        email: formValues.email,
        division: formValues.division,
        role: formValues.role,
        status: 'Pending',
        lastActive: 'Just now',
      },
      ...currentUsers,
    ])
    setRegisterPopupOpen(false)
  }

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const filteredUsers = userList.filter(({ id, name, email, division, role, status }) => {
    if (!normalizedSearchQuery) {
      return true
    }

    return [id, name, email, division, role, status].some((field) =>
      field.toLowerCase().includes(normalizedSearchQuery),
    )
  })

  return (
    <AppLayout
      headerProps={{
        title: 'Pilar Group',
        subtitle: 'Manage your recruitment process',
        breadcrumb: sharedBreadcrumbItems,
        searchProps: {
          value: searchQuery,
          placeholder: 'Search users...',
          onChange: (event) => setSearchQuery(event.target.value),
          ariaLabel: 'Search users',
        },
        notificationProps: {
          ariaLabel: 'Open notifications',
          modalTitle: 'Notifications',
        },
        onRefresh: () => setSearchQuery(''),
        activePath: '/users',
      }}
    >
      <section className="dashboard-content">
        <article className="dashboard-panel users-table-card">
          <div className="dashboard-panel__header users-table-card__header">
            <div>
              <p className="dashboard-panel__eyebrow">User Directory</p>
              <h2 className="dashboard-panel__title">Users Table</h2>
              <p className="users-table-card__description">
                Kelola daftar user dan tambahkan user baru lewat popup registrasi.
              </p>
            </div>

            <button
              type="button"
              className="users-table-card__action"
              onClick={() => setRegisterPopupOpen(true)}
            >
              <UserPlus01 size={18} aria-hidden="true" />
              Registrasi User
            </button>
          </div>

          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th scope="col">User</th>
                  <th scope="col">Email</th>
                  <th scope="col">Division</th>
                  <th scope="col">Role</th>
                  <th scope="col">Status</th>
                  <th scope="col">Last Active</th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div className="users-table__identity">
                          <span className="users-table__avatar">{getInitials(user.name)}</span>

                          <div>
                            <strong className="users-table__name">{user.name}</strong>
                            <p className="users-table__meta">{user.id}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <a
                          href={`mailto:${user.email}`}
                          className="users-table__link"
                          onClick={(event) => event.preventDefault()}
                        >
                          {user.email}
                        </a>
                      </td>
                      <td>{user.division}</td>
                      <td>{user.role}</td>
                      <td>
                        <span
                          className={`users-table__status users-table__status--${user.status.toLowerCase()}`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td>{user.lastActive}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6">
                      <div className="users-table__empty">
                        No users found. Try another keyword or use refresh to reset the
                        search.
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <RegisterUserPopup
        isOpen={isRegisterPopupOpen}
        onClose={() => setRegisterPopupOpen(false)}
        onSubmit={handleRegisterUser}
      />
    </AppLayout>
  )
}

export default UserPage
