import { useEffect, useMemo, useState } from 'react'
import { Edit03, Folder, Trash03 } from '@untitledui/icons'

import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'
import AppLayout from '@/layouts/AppLayout'
import {
  createCompany,
  deleteCompany,
  getCompanies,
  updateCompany,
} from '@/services/master/getCompanies'
import DeleteCompaniesPopup from './DeleteCompaniesPopup'
import EditCompaniesPopup from './EditCompaniesPopup'
import CreateCompaniesPopup from './CreateCompaniesPopup'

function getCompanyPayload(formValues) {
  return {
    name: formValues.name?.trim() || '',
    code: formValues.code?.trim() || '',
    is_active: formValues.isActive === 'active' ? 1 : 0,
  }
}

function CompaniesCardView({ activePath = '/master-companies' }) {
  usePageTitle()

  const [searchQuery, setSearchQuery] = useState('')
  const [companies, setCompanies] = useState([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true)
  const [companiesError, setCompaniesError] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [editingCompany, setEditingCompany] = useState(null)
  const [deletingCompany, setDeletingCompany] = useState(null)
  const [creatingCompany, setCreatingCompany] = useState(false)
  const [actionError, setActionError] = useState('')
  const [isSavingCompany, setIsSavingCompany] = useState(false)
  const [isDeletingCompany, setIsDeletingCompany] = useState(false)
  const [isCreatingCompany, setIsCreatingCompany] = useState(false)
  const [togglingCompanyId, setTogglingCompanyId] = useState('')

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const loadCompanies = async () => {
    setCompaniesError('')
    setIsLoadingCompanies(true)

    try {
      const nextCompanies = await getCompanies()
      setCompanies(nextCompanies)
    } catch (error) {
      setCompanies([])
      setCompaniesError(
        error?.message || 'Failed to load master companies from database.',
      )
    } finally {
      setIsLoadingCompanies(false)
    }
  }

  useEffect(() => {
    void loadCompanies()
  }, [])

  const filteredCompanies = useMemo(() => {
    return companies.filter(({ id, name, code }) => {
      if (!normalizedSearchQuery) {
        return true
      }

      return [id, name, code].some((field) =>
        field.toLowerCase().includes(normalizedSearchQuery),
      )
    })
  }, [companies, normalizedSearchQuery])

  const handleRefresh = () => {
    setSearchQuery('')
    setFeedbackMessage(null)
    void loadCompanies()
  }

  const handleOpenEdit = (company) => {
    setActionError('')
    setEditingCompany(company)
  }

  const handleCloseEdit = () => {
    if (isSavingCompany) {
      return
    }

    setActionError('')
    setEditingCompany(null)
  }

  const handleOpenDelete = (company) => {
    setActionError('')
    setDeletingCompany(company)
  }

  const handleCloseDelete = () => {
    if (isDeletingCompany) {
      return
    }

    setActionError('')
    setDeletingCompany(null)
  }

  const handleOpenCreate = () => {
    setActionError('')
    setCreatingCompany(true)
  }

  const handleCloseCreate = () => {
    setActionError('')
    setCreatingCompany(false)
  }

  const handleSubmitEdit = async (formValues) => {
    if (!editingCompany) {
      return
    }

    if (!formValues.name.trim()) {
      setActionError('Nama company wajib diisi.')
      return
    }

    if (!formValues.code.trim()) {
      setActionError('Kode company wajib diisi.')
      return
    }

    setActionError('')
    setIsSavingCompany(true)

    try {
      const payload = getCompanyPayload(formValues)
      await updateCompany(editingCompany.companyId, payload)
      setFeedbackMessage({
        type: 'success',
        text: `Company ${formValues.name.trim()} berhasil diperbarui.`,
      })
      setEditingCompany(null)
      await loadCompanies()
    } catch (error) {
      setActionError(error?.message || 'Gagal memperbarui company.')
    } finally {
      setIsSavingCompany(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingCompany) {
      return
    }

    setActionError('')
    setIsDeletingCompany(true)

    try {
      await deleteCompany(deletingCompany.companyId)
      setFeedbackMessage({
        type: 'success',
        text: `Company ${deletingCompany.name} berhasil dihapus.`,
      })
      setDeletingCompany(null)
      await loadCompanies()
    } catch (error) {
      setActionError(error?.message || 'Gagal menghapus company.')
    } finally {
      setIsDeletingCompany(false)
    }
  }

  const handleSubmitCreate = async (formValues) => {
    if (!formValues.name.trim()) {
      setActionError('Nama company wajib diisi.')
      return
    }

    if (!formValues.code.trim()) {
      setActionError('Kode company wajib diisi.')
      return
    }

    setActionError('')
    setIsCreatingCompany(true)

    try {
      const payload = getCompanyPayload(formValues)
      await createCompany(payload)
      setFeedbackMessage({
        type: 'success',
        text: `Company ${formValues.name.trim()} berhasil dibuat.`,
      })
      setCreatingCompany(false)
      await loadCompanies()
    } catch (error) {
      setActionError(error?.message || 'Gagal membuat company.')
    } finally {
      setIsCreatingCompany(false)
    }
  }

  const handleToggleStatus = async (company) => {
    setActionError('')
    setTogglingCompanyId(company.companyId)

    try {
      await updateCompany(company.companyId, { is_active: company.isActive ? 0 : 1 })
      setFeedbackMessage({
        type: 'success',
        text: `Company ${company.name} berhasil ${
          company.isActive ? 'dinonaktifkan' : 'diaktifkan'
        }.`,
      })
      await loadCompanies()
    } catch (error) {
      setFeedbackMessage({
        type: 'error',
        text: error?.message || 'Gagal mengubah status company.',
      })
    } finally {
      setTogglingCompanyId('')
    }
  }

  let content = null

  if (isLoadingCompanies) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Loading master companies...</p>
        <p className="dashboard-empty-state__detail">
          Sedang mengambil data company dari database.
        </p>
      </article>
    )
  } else if (companiesError) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Company gagal dimuat</p>
        <p className="dashboard-empty-state__detail">{companiesError}</p>
      </article>
    )
  } else if (filteredCompanies.length === 0) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">No master company found</p>
        <p className="dashboard-empty-state__detail">
          Coba kata kunci lain atau gunakan refresh untuk menampilkan semua company.
        </p>
      </article>
    )
  } else {
    content = (
      <div className="master-departments-list">
        {filteredCompanies.map((company) => (
          <article
            className="master-project-card master-departments-card"
            key={company.companyId}
          >
            <div className="master-project-card__header">
              <div>
                <p className="master-project-card__eyebrow">Master Company</p>
                <h3 className="master-project-card__title">{company.name}</h3>
              </div>

              <div className="master-project-card__badges">
                <span className="master-project-card__code">{company.code}</span>
                <span
                  className={`users-table__status users-table__status--inline users-table__status--${
                    company.isActive ? 'active' : 'inactive'
                  }`}
                >
                  {company.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="master-project-card__metrics">
              <span className="master-project-card__metric">
                {company.updatedAt !== '-'
                  ? `Updated ${company.updatedAt}`
                  : 'Timestamp update tidak tersedia'}
              </span>
              <span className="master-project-card__metric">
                Digunakan untuk master department &amp; business unit
              </span>
            </div>

            <div className="master-departments-card__actions">
              <button
                type="button"
                className="master-departments-card__action"
                onClick={() => handleOpenEdit(company)}
              >
                <Edit03 size={16} aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                className="master-departments-card__action"
                onClick={() => handleToggleStatus(company)}
                disabled={togglingCompanyId === company.companyId}
              >
                {togglingCompanyId === company.companyId
                  ? 'Memproses...'
                  : company.isActive
                    ? 'Deactivate'
                    : 'Activate'}
              </button>
              <button
                type="button"
                className="master-departments-card__action master-departments-card__action--danger"
                onClick={() => handleOpenDelete(company)}
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
        subtitle: 'Master company management',
        breadcrumb: sharedBreadcrumbItems,
        searchProps: {
          value: searchQuery,
          placeholder: 'Search master company...',
          onChange: (event) => setSearchQuery(event.target.value),
          ariaLabel: 'Search master company',
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
              <p className="dashboard-panel__eyebrow">Company Directory</p>
              <h2 className="dashboard-panel__title">
                Master Companies Card View ({companies.length})
              </h2>
            </div>
            <button
              type="button"
              className="users-table-card__action"
              onClick={handleOpenCreate}
            >
              <Folder size={18} aria-hidden="true" />
              Create Company
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

      <EditCompaniesPopup
        company={editingCompany}
        isSubmitting={isSavingCompany}
        errorMessage={editingCompany ? actionError : ''}
        onClose={handleCloseEdit}
        onSubmit={handleSubmitEdit}
      />

      <DeleteCompaniesPopup
        company={deletingCompany}
        isSubmitting={isDeletingCompany}
        errorMessage={deletingCompany ? actionError : ''}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
      />

      <CreateCompaniesPopup
        isOpen={creatingCompany}
        isSubmitting={isCreatingCompany}
        errorMessage={creatingCompany ? actionError : ''}
        onClose={handleCloseCreate}
        onSubmit={handleSubmitCreate}
      />
    </AppLayout>
  )
}

export default CompaniesCardView
