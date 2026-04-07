import { useEffect, useMemo, useState } from 'react'
import { Edit03, Folder, Trash03 } from '@untitledui/icons'

import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'
import AppLayout from '@/layouts/AppLayout'
import {
  matchesDepartmentFilter,
  notifyDepartmentCatalogUpdated,
  useSelectedDepartmentFilterId,
} from '@/services/departmentFilter'
import {
  createDepartment,
  deleteDepartment,
  getDepartments,
  updateDepartment,
} from '@/services/master/getDepartements'
import DeleteDepartmentPopup from './DeleteDepartmentPopup'
import EditDepartmentPopup from './EditDepartmentPopup'
import CreateDepartmentPopup from './CreateDepartmentPopup'

function getEditPayload(formValues) {
  return {
    name: formValues.name.trim(),
  }
}

// function getDepartmentDescription(department) {
//   return `Department ${department.name} tersedia untuk pemetaan user melalui field department_id.`
// }

function DepartmentsCardView({ activePath = '/master-departments' }) {
  usePageTitle()

  const [searchQuery, setSearchQuery] = useState('')
  const [departments, setDepartments] = useState([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true)
  const [departmentsError, setDepartmentsError] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [editingDepartment, setEditingDepartment] = useState(null)
  const [deletingDepartment, setDeletingDepartment] = useState(null)
  const [creatingDepartment, setCreatingDepartment] = useState(false)
  const [actionError, setActionError] = useState('')
  const [isSavingDepartment, setIsSavingDepartment] = useState(false)
  const [isDeletingDepartment, setIsDeletingDepartment] = useState(false)
  const [isCreatingDepartment, setIsCreatingDepartment] = useState(false)
  const selectedDepartmentId = useSelectedDepartmentFilterId()

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const loadDepartments = async () => {
    setDepartmentsError('')
    setIsLoadingDepartments(true)

    try {
      const nextDepartments = await getDepartments()
      setDepartments(nextDepartments)
    } catch (error) {
      setDepartments([])
      setDepartmentsError(
        error?.message || 'Failed to load master departments from database.',
      )
    } finally {
      setIsLoadingDepartments(false)
    }
  }

  useEffect(() => {
    void loadDepartments()
  }, [])

  const filteredDepartments = useMemo(() => {
    return departments.filter(({ id, name }) => {
      if (!matchesDepartmentFilter(id, selectedDepartmentId)) {
        return false
      }

      if (!normalizedSearchQuery) {
        return true
      }

      return [id, name].some((field) =>
        field.toLowerCase().includes(normalizedSearchQuery),
      )
    })
  }, [departments, normalizedSearchQuery, selectedDepartmentId])

  const handleRefresh = () => {
    setSearchQuery('')
    setFeedbackMessage(null)
    void loadDepartments()
  }

  const handleOpenEdit = (department) => {
    setActionError('')
    setEditingDepartment(department)
  }

  const handleCloseEdit = () => {
    if (isSavingDepartment) {
      return
    }

    setActionError('')
    setEditingDepartment(null)
  }

  const handleOpenDelete = (department) => {
    setActionError('')
    setDeletingDepartment(department)
  }

  const handleCloseDelete = () => {
    if (isDeletingDepartment) {
      return
    }

    setActionError('')
    setDeletingDepartment(null)
  }

  const handleOpenCreate = () => {
    setActionError('')
    setCreatingDepartment(true)
  }

  const handleCloseCreate = () => {
    setActionError('')
    setCreatingDepartment(false)
  }

  const handleSubmitEdit = async (formValues) => {
    if (!editingDepartment) {
      return
    }

    if (!formValues.name.trim()) {
      setActionError('Nama department wajib diisi.')
      return
    }

    setActionError('')
    setIsSavingDepartment(true)

    try {
      await updateDepartment(
        editingDepartment.departmentId,
        getEditPayload(formValues),
      )
      notifyDepartmentCatalogUpdated()
      setFeedbackMessage({
        type: 'success',
        text: `Department ${formValues.name.trim()} berhasil diperbarui.`,
      })
      setEditingDepartment(null)
      await loadDepartments()
    } catch (error) {
      setActionError(error?.message || 'Gagal memperbarui department.')
    } finally {
      setIsSavingDepartment(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingDepartment) {
      return
    }

    setActionError('')
    setIsDeletingDepartment(true)

    try {
      await deleteDepartment(deletingDepartment.departmentId)
      notifyDepartmentCatalogUpdated()
      setFeedbackMessage({
        type: 'success',
        text: `Department ${deletingDepartment.name} berhasil dihapus.`,
      })
      setDeletingDepartment(null)
      await loadDepartments()
    } catch (error) {
      setActionError(error?.message || 'Gagal menghapus department.')
    } finally {
      setIsDeletingDepartment(false)
    }
  }

  const handleSubmitCreate = async (formValues) => {
    if (!formValues.name.trim()) {
      setActionError('Nama department wajib diisi.')
      return
    }

    setActionError('')
    setIsCreatingDepartment(true)

    try {
      await createDepartment(getEditPayload(formValues))
      notifyDepartmentCatalogUpdated()
      setFeedbackMessage({
        type: 'success',
        text: `Department ${formValues.name.trim()} berhasil dibuat.`,
      })
      setCreatingDepartment(false)
      await loadDepartments()
    } catch (error) {
      setActionError(error?.message || 'Gagal membuat department.')
    } finally {
      setIsCreatingDepartment(false)
    }
  }

  let content = null

  if (isLoadingDepartments) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Loading master departments...</p>
        <p className="dashboard-empty-state__detail">
          Sedang mengambil data department dari database.
        </p>
      </article>
    )
  } else if (departmentsError) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Department gagal dimuat</p>
        <p className="dashboard-empty-state__detail">{departmentsError}</p>
      </article>
    )
  } else if (filteredDepartments.length === 0) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">No master department found</p>
        <p className="dashboard-empty-state__detail">
          Coba kata kunci lain atau gunakan refresh untuk menampilkan semua department.
        </p>
      </article>
    )
  } else {
    content = (
      <div className="master-departments-list">
        {filteredDepartments.map((department) => (
          <article
            className="master-project-card master-departments-card"
            key={department.departmentId}
          >
            <div className="master-project-card__header">
              <div>
                <p className="master-project-card__eyebrow">Master Department</p>
                <h3 className="master-project-card__title">{department.name}</h3>
              </div>

              <div className="master-project-card__badges">
                <span className="master-project-card__code">ID {department.id}</span>
              </div>
            </div>

            <div className="master-project-card__metrics">
              <span className="master-project-card__metric">
                Department ID {department.id}
              </span>
              <span className="master-project-card__metric">
                {department.updatedAt !== '-'
                  ? `Updated ${department.updatedAt}`
                  : 'Timestamp update tidak tersedia'}
              </span>
              <span className="master-project-card__metric">
                Digunakan untuk master user
              </span>
            </div>

            <div className="master-departments-card__actions">
              <button
                type="button"
                className="master-departments-card__action"
                onClick={() => handleOpenEdit(department)}
              >
                <Edit03 size={16} aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                className="master-departments-card__action master-departments-card__action--danger"
                onClick={() => handleOpenDelete(department)}
              >
                <Trash03 size={16} aria-hidden="true" />
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <AppLayout
      headerProps={{
        title: 'Pilar Group',
        subtitle: 'Master department management',
        breadcrumb: sharedBreadcrumbItems,
        searchProps: {
          value: searchQuery,
          placeholder: 'Search master department...',
          onChange: (event) => setSearchQuery(event.target.value),
          ariaLabel: 'Search master department',
        },
        notificationProps: {
          ariaLabel: 'Open notifications',
          modalTitle: 'Notifications',
        },
        onRefresh: handleRefresh,
        activePath,
      }}
    >
      <section className="dashboard-content">
        <article className="dashboard-panel master-departments-panel">
          <div className="dashboard-panel__header master-departments-panel__header">
            <div>
              <p className="dashboard-panel__eyebrow">Department Directory</p>
              <h2 className="dashboard-panel__title">
                Master Departments Card View ({departments.length})
              </h2>
            </div>
            <button
              type="button"
              className="users-table-card__action"
              onClick={handleOpenCreate}
            >
              <Folder size={18} aria-hidden="true" />
              Create Department
            </button>
          </div>

          {feedbackMessage ? (
            <div
              className={`master-departments-feedback master-departments-feedback--${feedbackMessage.type}`}
            >
              {feedbackMessage.text}
            </div>
          ) : null}

          {content}
        </article>
      </section>

      <EditDepartmentPopup
        department={editingDepartment}
        isSubmitting={isSavingDepartment}
        errorMessage={editingDepartment ? actionError : ''}
        onClose={handleCloseEdit}
        onSubmit={handleSubmitEdit}
      />

      <DeleteDepartmentPopup
        department={deletingDepartment}
        isSubmitting={isDeletingDepartment}
        errorMessage={deletingDepartment ? actionError : ''}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
      />

      <CreateDepartmentPopup
        isOpen={creatingDepartment}
        isSubmitting={isCreatingDepartment}
        errorMessage={creatingDepartment ? actionError : ''}
        onClose={handleCloseCreate}
        onSubmit={handleSubmitCreate}
      />
    </AppLayout>
  )
}

export default DepartmentsCardView
