import { useEffect, useState } from 'react'
import { UserPlus01, DownloadCloud02 } from '@untitledui/icons'

import AppLayout from '@/layouts/AppLayout'
import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'
import TableUser from '@/components/Users/TableUser'
import { normalizePhoneNumber } from '@/utils/normalizePhoneNumber'
import {
  deleteManagedUser,
  getManagedUsers,
  updateManagedUser,
  updateManagedUserStatus,
  downloadUserImportTemplate,
  importUsers,
  downloadUsersExport,
} from '@/services/manageUsers'
import { getStoredUser } from '@/services/api'
import { canManageUserTarget, isITUser } from '@/services/accessControl'
import RegisterUserPopup from '@/components/Users/RegisterUserPopup'
import EditUserPopup from '@/components/Users/EditUserPopup'
import DeleteUserPopup from '@/components/Users/DeleteUserPopup'

const USERS_PER_PAGE = 10

function getManagedUserId(user) {
  return user?.raw?.id ?? user?.userId ?? null
}

function buildUpdateUserPayload(formValues, { includeApps = true } = {}) {
  const payload = {
    is_active: formValues.is_active === 'true',
  }

  if (includeApps) {
    payload.apps = Array.from(new Set(Array.isArray(formValues.apps) ? formValues.apps : []))
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

  payload.email        = formValues.email.trim() || null
  payload.phone        = normalizePhoneNumber(formValues.phone) || null
  payload.job_position = formValues.job_position.trim() || null
  payload.job_level_id = formValues.job_level_id ? parseInt(formValues.job_level_id) : null

  const departmentIds = Array.isArray(formValues.department_ids)
    ? formValues.department_ids
    : formValues.department_id
      ? [formValues.department_id]
      : []

  const normalizedDepartmentIds = departmentIds
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0)

  if (normalizedDepartmentIds.length > 0) {
    payload.departments = normalizedDepartmentIds.map((id, index) => ({
      id,
      is_primary: index === 0,
    }))
  }

  if (Array.isArray(formValues.company_ids)) {
    payload.companies = formValues.company_ids.map(id => ({ id }))
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
  const [isRegisterPopupOpen, setIsRegisterPopupOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [deletingUser, setDeletingUser] = useState(null)
  const [editUserError, setEditUserError] = useState('')
  const [deleteUserError, setDeleteUserError] = useState('')
  const [isUpdatingUser, setIsUpdatingUser] = useState(false)
  const [isDeletingUser, setIsDeletingUser] = useState(false)
  const [updatingStatusUserIds, setUpdatingStatusUserIds] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const normalizedSearchQuery = searchQuery.trim().toLowerCase()
  const accessUser = getStoredUser()
  const canManageApps = isITUser(accessUser)
  const canDeleteUsers = canManageApps

  const canEditManagedUser = (user) => canManageUserTarget(user, accessUser)

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

  const handleRefresh = () => {
    setSearchQuery('')
    void loadUsers()
  }

  const handleDownloadTemplate = async () => {
    try {
      await downloadUserImportTemplate()
    } catch (error) {
      const msg = error?.message || 'Failed to download template.'
      setUsersError(msg)
      window.alert(msg)
    }
  }

  const handleExportUsers = async () => {
    try {
      await downloadUsersExport()
    } catch (error) {
      const msg = error?.message || 'Failed to export users.'
      setUsersError(msg)
      window.alert(msg)
    }
  }

  const handleUploadUsers = async (file) => {
    try {
      setIsUploading(true)
      const result = await importUsers(file)
      window.alert(result?.message || 'Users imported successfully.')
      await loadUsers()
    } catch (error) {
      const msg = error?.message || 'Failed to import users.'
      setUsersError(msg)
      window.alert(msg)
    } finally {
      setIsUploading(false)
    }
  }

  const handleRegisterUser = async () => {
    // Reload users after successful registration
    await loadUsers()
  }

  const handleOpenEditUser = (user) => {
    if (!canEditManagedUser(user)) {
      return
    }

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

    if (!canEditManagedUser(editingUser)) {
      setEditUserError('HCGA hanya bisa mengelola user dengan job level minimal 1.')
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

    if (!Array.isArray(formValues.department_ids) || formValues.department_ids.length === 0) {
      setEditUserError('Class wajib dipilih minimal satu.')
      return
    }

    if (formValues.password.trim() && formValues.password.trim().length < 6) {
      setEditUserError('Password minimal 6 karakter.')
      return
    }

    setEditUserError('')
    setIsUpdatingUser(true)

    try {
      const payload = buildUpdateUserPayload(formValues, { includeApps: canManageApps })
      await updateManagedUser(userId, payload)
      setEditingUser(null)
      await loadUsers()
    } catch (error) {
      setEditUserError(error?.message || 'Gagal memperbarui user.')
    } finally {
      setIsUpdatingUser(false)
    }
  }

  const handleChangeUserStatus = async (user, isActive) => {
    if (!canEditManagedUser(user)) {
      return
    }

    const userId = getManagedUserId(user)

    if (!userId) {
      setUsersError('User ID tidak ditemukan.')
      return
    }

    setUsersError('')
    setUpdatingStatusUserIds((currentUserIds) =>
      currentUserIds.includes(user.userId) ? currentUserIds : [...currentUserIds, user.userId],
    )

    try {
      await updateManagedUserStatus(userId, isActive)
      await loadUsers()
    } catch (error) {
      setUsersError(error?.message || 'Gagal memperbarui status user.')
    } finally {
      setUpdatingStatusUserIds((currentUserIds) =>
        currentUserIds.filter((currentUserId) => currentUserId !== user.userId),
      )
    }
  }

  const handleOpenDeleteUser = (user) => {
    if (!canDeleteUsers) {
      return
    }

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

    if (!canDeleteUsers) {
      setDeleteUserError('HCGA tidak memiliki akses untuk menghapus user.')
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
    const { id, name, email, division, role, company, status } = user

    if (!normalizedSearchQuery) {
      return true
    }

    return [id, name, email, division, role, company, status].some((field) =>
      field.toLowerCase().includes(normalizedSearchQuery),
    )
  })

  const tableMessage = isLoadingUsers
    ? 'Loading users from database...'
    : usersError
      ? usersError
      : normalizedSearchQuery
        ? 'No users found. Try another keyword or use refresh to reset the search.'
        : 'No users available.'

  return (
    <AppLayout
      className="users-page-layout"
      headerProps={{
        title: 'Pilargroup',
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
      <section className="dashboard-content users-page">
        <article className="dashboard-panel users-table-card">
          <div className="dashboard-panel__header users-table-card__header">
            <div>
              <p className="dashboard-panel__eyebrow">User Directory</p>
              <h2 className="dashboard-panel__title">Users Table</h2>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="users-table-card__action"
                style={{ background: '#fff', color: '#1a2a57', border: '1px solid rgba(26, 42, 87, 0.12)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                onClick={handleExportUsers}
              >
                <DownloadCloud02 size={18} aria-hidden="true" />
                Export xlsx
              </button>
              <button
                type="button"
                className="users-table-card__action"
                onClick={() => setIsRegisterPopupOpen(true)}
              >
                <UserPlus01 size={18} aria-hidden="true" />
                Registrasi User
              </button>
            </div>
          </div>

          <TableUser
            users={filteredUsers}
            tableMessage={tableMessage}
            usersPerPage={USERS_PER_PAGE}
            onEditUser={handleOpenEditUser}
            onDeleteUser={handleOpenDeleteUser}
            onStatusChange={handleChangeUserStatus}
            canEditUser={canEditManagedUser}
            canDeleteUser={() => canDeleteUsers}
            updatingStatusUserIds={updatingStatusUserIds}
            onDownloadTemplate={handleDownloadTemplate}
            onUploadUsers={handleUploadUsers}
            isUploading={isUploading}
            showImportExport={canManageApps}
          />
        </article>
      </section>

      <RegisterUserPopup
        isOpen={isRegisterPopupOpen}
        onClose={() => setIsRegisterPopupOpen(false)}
        onSubmit={handleRegisterUser}
        showAppsAccess={canManageApps}
      />

      <EditUserPopup
        user={editingUser}
        isSubmitting={isUpdatingUser}
        errorMessage={editingUser ? editUserError : ''}
        onClose={handleCloseEditUser}
        onSubmit={handleSubmitEditUser}
        showAppsAccess={canManageApps}
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
