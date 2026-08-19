import { useEffect, useMemo, useState } from 'react'
import { Edit03, Folder, Trash03 } from '@untitledui/icons'

import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'
import AppLayout from '@/layouts/AppLayout'
import {
  createBusinessUnit,
  deleteBusinessUnit,
  getBusinessUnits,
  toggleBusinessUnitStatus,
  updateBusinessUnit,
} from '@/services/master/getBusinessUnits'
import DeleteBUPopup from './DeleteBUPopup'
import EditBUPopup from './EditBUPopup'
import CreateBUPopup from './CreateBUPopup'

function getBusinessUnitPayload(formValues) {
  return {
    name: formValues.name?.trim() || '',
    code: formValues.code?.trim() || '',
    company_id: formValues.companyId?.trim() || '',
    is_active: formValues.isActive === 'active' ? 1 : 0,
    departments: (formValues.departments ?? []).map((department) => ({
      id: department.id,
      is_primary: department.isPrimary,
    })),
  }
}

function BUCardView({ activePath = '/business-unit' }) {
  usePageTitle()

  const [searchQuery, setSearchQuery] = useState('')
  const [businessUnits, setBusinessUnits] = useState([])
  const [isLoadingBusinessUnits, setIsLoadingBusinessUnits] = useState(true)
  const [businessUnitsError, setBusinessUnitsError] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [editingBusinessUnit, setEditingBusinessUnit] = useState(null)
  const [deletingBusinessUnit, setDeletingBusinessUnit] = useState(null)
  const [creatingBusinessUnit, setCreatingBusinessUnit] = useState(false)
  const [actionError, setActionError] = useState('')
  const [isSavingBusinessUnit, setIsSavingBusinessUnit] = useState(false)
  const [isDeletingBusinessUnit, setIsDeletingBusinessUnit] = useState(false)
  const [isCreatingBusinessUnit, setIsCreatingBusinessUnit] = useState(false)
  const [togglingBusinessUnitId, setTogglingBusinessUnitId] = useState('')

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const loadBusinessUnits = async () => {
    setBusinessUnitsError('')
    setIsLoadingBusinessUnits(true)

    try {
      const nextBusinessUnits = await getBusinessUnits()
      setBusinessUnits(nextBusinessUnits)
    } catch (error) {
      setBusinessUnits([])
      setBusinessUnitsError(
        error?.message || 'Failed to load master business units from database.',
      )
    } finally {
      setIsLoadingBusinessUnits(false)
    }
  }

  useEffect(() => {
    void loadBusinessUnits()
  }, [])

  const filteredBusinessUnits = useMemo(() => {
    return businessUnits.filter(({ id, name, code, companyName }) => {
      if (!normalizedSearchQuery) {
        return true
      }

      return [id, name, code, companyName].some((field) =>
        field.toLowerCase().includes(normalizedSearchQuery),
      )
    })
  }, [businessUnits, normalizedSearchQuery])

  const handleRefresh = () => {
    setSearchQuery('')
    setFeedbackMessage(null)
    void loadBusinessUnits()
  }

  const handleOpenEdit = (businessUnit) => {
    setActionError('')
    setEditingBusinessUnit(businessUnit)
  }

  const handleCloseEdit = () => {
    if (isSavingBusinessUnit) {
      return
    }

    setActionError('')
    setEditingBusinessUnit(null)
  }

  const handleOpenDelete = (businessUnit) => {
    setActionError('')
    setDeletingBusinessUnit(businessUnit)
  }

  const handleCloseDelete = () => {
    if (isDeletingBusinessUnit) {
      return
    }

    setActionError('')
    setDeletingBusinessUnit(null)
  }

  const handleOpenCreate = () => {
    setActionError('')
    setCreatingBusinessUnit(true)
  }

  const handleCloseCreate = () => {
    setActionError('')
    setCreatingBusinessUnit(false)
  }

  const handleSubmitEdit = async (formValues) => {
    if (!editingBusinessUnit) {
      return
    }

    if (!formValues.name.trim()) {
      setActionError('Nama business unit wajib diisi.')
      return
    }

    if (!formValues.departments?.length) {
      setActionError('Pilih minimal 1 department.')
      return
    }

    setActionError('')
    setIsSavingBusinessUnit(true)

    try {
      const payload = getBusinessUnitPayload(formValues)
      await updateBusinessUnit(editingBusinessUnit.businessUnitId, payload)
      setFeedbackMessage({
        type: 'success',
        text: `Business unit ${formValues.name.trim()} berhasil diperbarui.`,
      })
      setEditingBusinessUnit(null)
      await loadBusinessUnits()
    } catch (error) {
      setActionError(error?.message || 'Gagal memperbarui business unit.')
    } finally {
      setIsSavingBusinessUnit(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingBusinessUnit) {
      return
    }

    setActionError('')
    setIsDeletingBusinessUnit(true)

    try {
      await deleteBusinessUnit(deletingBusinessUnit.businessUnitId)
      setFeedbackMessage({
        type: 'success',
        text: `Business unit ${deletingBusinessUnit.name} berhasil dihapus.`,
      })
      setDeletingBusinessUnit(null)
      await loadBusinessUnits()
    } catch (error) {
      setActionError(error?.message || 'Gagal menghapus business unit.')
    } finally {
      setIsDeletingBusinessUnit(false)
    }
  }

  const handleSubmitCreate = async (formValues) => {
    if (!formValues.name.trim()) {
      setActionError('Nama business unit wajib diisi.')
      return
    }

    if (!formValues.departments?.length) {
      setActionError('Pilih minimal 1 department.')
      return
    }

    setActionError('')
    setIsCreatingBusinessUnit(true)

    try {
      const payload = getBusinessUnitPayload(formValues)
      await createBusinessUnit(payload)
      setFeedbackMessage({
        type: 'success',
        text: `Business unit ${formValues.name.trim()} berhasil dibuat.`,
      })
      setCreatingBusinessUnit(false)
      await loadBusinessUnits()
    } catch (error) {
      setActionError(error?.message || 'Gagal membuat business unit.')
    } finally {
      setIsCreatingBusinessUnit(false)
    }
  }

  const handleToggleStatus = async (businessUnit) => {
    setActionError('')
    setTogglingBusinessUnitId(businessUnit.businessUnitId)

    try {
      await toggleBusinessUnitStatus(businessUnit.businessUnitId, !businessUnit.isActive)
      setFeedbackMessage({
        type: 'success',
        text: `Business unit ${businessUnit.name} berhasil ${
          businessUnit.isActive ? 'dinonaktifkan' : 'diaktifkan'
        }.`,
      })
      await loadBusinessUnits()
    } catch (error) {
      setFeedbackMessage({
        type: 'error',
        text: error?.message || 'Gagal mengubah status business unit.',
      })
    } finally {
      setTogglingBusinessUnitId('')
    }
  }

  let content = null

  if (isLoadingBusinessUnits) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Loading master business units...</p>
        <p className="dashboard-empty-state__detail">
          Sedang mengambil data business unit dari database.
        </p>
      </article>
    )
  } else if (businessUnitsError) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Business unit gagal dimuat</p>
        <p className="dashboard-empty-state__detail">{businessUnitsError}</p>
      </article>
    )
  } else if (filteredBusinessUnits.length === 0) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">No master business unit found</p>
        <p className="dashboard-empty-state__detail">
          Coba kata kunci lain atau gunakan refresh untuk menampilkan semua business unit.
        </p>
      </article>
    )
  } else {
    content = (
      <div className="master-departments-list">
        {filteredBusinessUnits.map((businessUnit) => (
          <article
            className="master-project-card master-departments-card"
            key={businessUnit.businessUnitId}
          >
            <div className="master-project-card__header">
              <div>
                <p className="master-project-card__eyebrow">Master Business Unit</p>
                <h3 className="master-project-card__title">{businessUnit.name}</h3>
              </div>

              <div className="master-project-card__badges">
                <span className="master-project-card__code">{businessUnit.code}</span>
                <span
                  className={`users-table__status users-table__status--inline users-table__status--${
                    businessUnit.isActive ? 'active' : 'inactive'
                  }`}
                >
                  {businessUnit.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="master-project-card__metrics">
              <span className="master-project-card__metric">
                {businessUnit.companyName}
              </span>
              <span className="master-project-card__metric">
                {businessUnit.updatedAt !== '-'
                  ? `Updated ${businessUnit.updatedAt}`
                  : 'Timestamp update tidak tersedia'}
              </span>
            </div>

            {businessUnit.departments.length > 0 ? (
              <div className="master-project-chip-list">
                {businessUnit.departments.map((department) => (
                  <span
                    className={`master-project-chip${
                      department.isPrimary ? ' master-project-chip--strong' : ''
                    }`}
                    key={department.pivotId ?? department.id}
                  >
                    {department.name}
                    {department.isPrimary ? ' (Primary)' : ''}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="master-departments-card__actions">
              <button
                type="button"
                className="master-departments-card__action"
                onClick={() => handleOpenEdit(businessUnit)}
              >
                <Edit03 size={16} aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                className="master-departments-card__action"
                onClick={() => handleToggleStatus(businessUnit)}
                disabled={togglingBusinessUnitId === businessUnit.businessUnitId}
              >
                {togglingBusinessUnitId === businessUnit.businessUnitId
                  ? 'Memproses...'
                  : businessUnit.isActive
                    ? 'Deactivate'
                    : 'Activate'}
              </button>
              <button
                type="button"
                className="master-departments-card__action master-departments-card__action--danger"
                onClick={() => handleOpenDelete(businessUnit)}
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
        title: 'Pilargroup',
        subtitle: 'Master business unit management',
        breadcrumb: sharedBreadcrumbItems,
        searchProps: {
          value: searchQuery,
          placeholder: 'Search master business unit...',
          onChange: (event) => setSearchQuery(event.target.value),
          ariaLabel: 'Search master business unit',
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
              <p className="dashboard-panel__eyebrow">Business Unit Directory</p>
              <h2 className="dashboard-panel__title">
                Master Business Units Card View ({businessUnits.length})
              </h2>
            </div>
            <button
              type="button"
              className="users-table-card__action"
              onClick={handleOpenCreate}
            >
              <Folder size={18} aria-hidden="true" />
              Create Business Unit
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

      <EditBUPopup
        businessUnit={editingBusinessUnit}
        isSubmitting={isSavingBusinessUnit}
        errorMessage={editingBusinessUnit ? actionError : ''}
        onClose={handleCloseEdit}
        onSubmit={handleSubmitEdit}
      />

      <DeleteBUPopup
        businessUnit={deletingBusinessUnit}
        isSubmitting={isDeletingBusinessUnit}
        errorMessage={deletingBusinessUnit ? actionError : ''}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
      />

      <CreateBUPopup
        isOpen={creatingBusinessUnit}
        isSubmitting={isCreatingBusinessUnit}
        errorMessage={creatingBusinessUnit ? actionError : ''}
        onClose={handleCloseCreate}
        onSubmit={handleSubmitCreate}
      />
    </AppLayout>
  )
}

export default BUCardView
