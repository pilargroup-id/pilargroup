import { useEffect, useState } from 'react'
import { UserPlus01 } from '@untitledui/icons'

import AppLayout from '@/layouts/AppLayout'
import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'
import TableUser from '@/components/Users/TableUser'
import { normalizePhoneNumber } from '@/utils/normalizePhoneNumber'
import {
  matchesDepartmentFilter,
  useSelectedDepartmentFilterId,
} from '@/services/departmentFilter'
import {
  deleteManagedUser,
  getManagedUsers,
  updateManagedUser,
} from '@/services/manageUsers'
import RegisterUserPopup from '@/components/Users/RegisterUserPopup'
import EditUserPopup from '@/components/Users/EditUserPopup'
import DeleteUserPopup from '@/components/Users/DeleteUserPopup'

const USERS_PER_PAGE = 10

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

function getManagedUserId(user) {
  return user?.raw?.id ?? user?.userId ?? null
}

function buildUpdateUserPayload(formValues) {
  const payload = {
    is_active: formValues.is_active === 'true',
    apps: Array.from(new Set(Array.isArray(formValues.apps) ? formValues.apps : [])),
  }

  const username = formValues.username.trim()
  if (username) {
    payload.username = username
  }

  const password = formValues.password.trim()
  if (password) {
    payload.password = password
  }

  const name = formValues.name.trim()
  if (name) {
    payload.name = name
  }

  const email = formValues.email.trim()
  if (email) {
    payload.email = email
  }

  const phone = normalizePhoneNumber(formValues.phone)
  if (phone) {
    payload.phone = phone
  }

  const departmentId = Number(formValues.department_id)
  if (Number.isInteger(departmentId) && departmentId > 0) {
    payload.department_id = departmentId
  }

  const jobPosition = formValues.job_position.trim()
  if (jobPosition) {
    payload.job_position = jobPosition
  }

  const jobLevel = formValues.job_level.trim()
  if (jobLevel) {
    payload.job_level = jobLevel
  }

  const internalIdValue = formValues.internal_id.trim()
  if (!internalIdValue) {
    payload.internal_id = null
  } else {
    const internalId = Number(internalIdValue)

    if (Number.isInteger(internalId) && internalId > 0) {
      payload.internal_id = internalId
    }
  }

  return payload
}

function UserPage() {
  usePageTitle()

  const [searchQuery, setSearchQuery] = useState('')
  const [userList, setUserList] = useState([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [isRegisterPopupOpen, setIsRegisterPopupOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [editUserError, setEditUserError] = useState('')
  const [deleteUserError, setDeleteUserError] = useState('')
  const [isUpdatingUser, setIsUpdatingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const selectedDepartmentId = useSelectedDepartmentFilterId()

  const loadUsers = async () => {
    setUsersError('')
    setIsLoadingUsers(true)

    try {
      const users = await getManagedUsers()
      setUserList(users)
    } catch (error) {
      setUserList([])
      setUsersError(error?.message || 'Failed to load users from database.')
    } finally {
      setIsLoadingUsers(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [normalizedSearchQuery, selectedDepartmentId])

  const handleRefresh = () => {
    setSearchQuery('')
    setCurrentPage(1)
    void loadUsers()
  }

  const handleRegisterUser = async () => {
    // Reload users after successful registration
    await loadUsers()
  }

  const handleOpenEditUser = (user) => {
    setDeleteUserError('')
    setDeletingUser(null)
    setEditUserError('')
    setEditingUser(user)
  }

  const handleCloseEditUser = () => {
    if (isUpdatingUser) {
      return
    }

    setEditUserError('')
    setEditingUser(null)
  }

  const handleSubmitEditUser = async (formValues) => {
    if (!editingUser) {
      return
    }

    const userId = getManagedUserId(editingUser)

    if (!userId) {
      setEditUserError('User ID tidak ditemukan.')
      return
    }

    if (!formValues.username.trim()) {
      setEditUserError('Username wajib diisi.')
      return
    }

    if (!formValues.name.trim()) {
      setEditUserError('Nama user wajib diisi.')
      return
    }

    if (!formValues.department_id.trim()) {
      setEditUserError('Divisi wajib dipilih.')
      return
    }

    if (formValues.password.trim() && formValues.password.trim().length < 6) {
      setEditUserError('Password minimal 6 karakter.')
      return
    }

    setEditUserError('')
    setIsUpdatingUser(true)

    try {
      const payload = buildUpdateUserPayload(formValues)
      await updateManagedUser(userId, payload)
      setEditingUser(null)
      await loadUsers()
    } catch (error) {
      setEditUserError(error?.message || 'Gagal memperbarui user.')
    } finally {
      setIsUpdatingUser(false)
    }
  }

  const handleOpenDeleteUser = (user) => {
    setEditUserError('')
    setEditingUser(null)
    setDeleteUserError('')
    setDeletingUser(user)
  }

  const handleCloseDeleteUser = () => {
    if (isDeletingUser) {
      return
    }

    setDeleteUserError('')
    setDeletingUser(null)
  }

  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) {
      return
    }

    const userId = getManagedUserId(deletingUser)

    if (!userId) {
      setDeleteUserError('User ID tidak ditemukan.')
      return
    }

    setDeleteUserError('')
    setIsDeletingUser(true)

    try {
      await deleteManagedUser(userId)
      setDeletingUser(null)
      await loadUsers()
    } catch (error) {
      setDeleteUserError(error?.message || 'Gagal menghapus user.')
    } finally {
      setIsDeletingUser(false)
    }
  }

  const filteredUsers = userList.filter((user) => {
    const { id, name, email, division, role, status } = user

    if (!matchesDepartmentFilter(user.raw?.department_id, selectedDepartmentId)) {
      return false
    }

    if (!normalizedSearchQuery) {
      return true
    }

    return [id, name, email, division, role, status].some((field) =>
      field.toLowerCase().includes(normalizedSearchQuery),
    )
  })

  const totalUsers = filteredUsers.length
  const totalPages = Math.max(1, Math.ceil(totalUsers / USERS_PER_PAGE))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStartIndex = (safeCurrentPage - 1) * USERS_PER_PAGE
  const pageEndIndex = pageStartIndex + USERS_PER_PAGE
  const paginatedUsers = filteredUsers.slice(pageStartIndex, pageEndIndex)
  const paginationItems = getPaginationItems(safeCurrentPage, totalPages)
  const visibleFrom = totalUsers === 0 ? 0 : pageStartIndex + 1
  const visibleTo = Math.min(pageEndIndex, totalUsers)

  const tableMessage = isLoadingUsers
    ? 'Loading users from database...'
    : usersError
      ? usersError
      : normalizedSearchQuery
        ? 'No users found. Try another keyword or use refresh to reset the search.'
        : 'No users available.'

  const pagination =
    !isLoadingUsers && !usersError && totalUsers > 0
      ? {
          summary: `Showing ${visibleFrom}-${visibleTo} of ${totalUsers} users`,
          currentPage: safeCurrentPage,
          totalPages,
          items: paginationItems,
          onPrevious: () => setCurrentPage((page) => Math.max(1, page - 1)),
          onNext: () => setCurrentPage((page) => Math.min(totalPages, page + 1)),
          onSelect: (page) => setCurrentPage(page),
        }
      : null

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
        onRefresh: handleRefresh,
        activePath: '/users',
      }}
    >
      <section className="dashboard-content">
        <article className="dashboard-panel users-table-card">
          <div className="dashboard-panel__header users-table-card__header">
            <div>
              <p className="dashboard-panel__eyebrow">User Directory</p>
              <h2 className="dashboard-panel__title">Users Table</h2>
            </div>

            <button
              type="button"
              className="users-table-card__action"
              onClick={() => setIsRegisterPopupOpen(true)}
            >
              <UserPlus01 size={18} aria-hidden="true" />
              Registrasi User
            </button>
          </div>

          <TableUser
            users={paginatedUsers}
            tableMessage={tableMessage}
            pagination={pagination}
            onEditUser={handleOpenEditUser}
            onDeleteUser={handleOpenDeleteUser}
          />
        </article>
      </section>

      <RegisterUserPopup
        isOpen={isRegisterPopupOpen}
        onClose={() => setIsRegisterPopupOpen(false)}
        onSubmit={handleRegisterUser}
      />

      <EditUserPopup
        user={editingUser}
        isSubmitting={isUpdatingUser}
        errorMessage={editingUser ? editUserError : ''}
        onClose={handleCloseEditUser}
        onSubmit={handleSubmitEditUser}
      />

      <DeleteUserPopup
        user={deletingUser}
        isSubmitting={isDeletingUser}
        errorMessage={deletingUser ? deleteUserError : ''}
        onClose={handleCloseDeleteUser}
        onConfirm={handleConfirmDeleteUser}
      />
    </AppLayout>
  )
}

export default UserPage
