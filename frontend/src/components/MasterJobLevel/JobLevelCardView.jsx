import { useEffect, useMemo, useState } from 'react'
import { Edit03, Folder, Trash03 } from '@untitledui/icons'

import { sharedBreadcrumbItems } from '@/constants/breadcrumbs'
import { usePageTitle } from '@/hooks/usePageTitle'
import AppLayout from '@/layouts/AppLayout'
import {
  createJobLevel,
  deleteJobLevel,
  getJobLevels,
  updateJobLevel,
} from '@/services/master/getJobLevels'
import DeleteJobLevelPopup from './DeleteJobLevelPopUp'
import EditJobLevelPopup from './EditJobLevelPopup'
import CreateJobLevelPopup from './CreateJobLevelPopUp'

function getJobLevelPayload(formValues) {
  return {
    name: formValues.name?.trim() || '',
    level: formValues.level !== '' && formValues.level !== undefined
      ? Number(formValues.level)
      : null,
  }
}

function JobLevelCardView({ activePath = '/master-job-level' }) {
  usePageTitle()

  const [searchQuery, setSearchQuery] = useState('')
  const [jobLevels, setJobLevels] = useState([])
  const [isLoadingJobLevels, setIsLoadingJobLevels] = useState(true)
  const [jobLevelsError, setJobLevelsError] = useState('')
  const [feedbackMessage, setFeedbackMessage] = useState(null)
  const [editingJobLevel, setEditingJobLevel] = useState(null)
  const [deletingJobLevel, setDeletingJobLevel] = useState(null)
  const [creatingJobLevel, setCreatingJobLevel] = useState(false)
  const [actionError, setActionError] = useState('')
  const [isSavingJobLevel, setIsSavingJobLevel] = useState(false)
  const [isDeletingJobLevel, setIsDeletingJobLevel] = useState(false)
  const [isCreatingJobLevel, setIsCreatingJobLevel] = useState(false)

  const normalizedSearchQuery = searchQuery.trim().toLowerCase()

  const loadJobLevels = async () => {
    setJobLevelsError('')
    setIsLoadingJobLevels(true)

    try {
      const nextJobLevels = await getJobLevels()
      setJobLevels(nextJobLevels)
    } catch (error) {
      setJobLevels([])
      setJobLevelsError(
        error?.message || 'Failed to load master job levels from database.',
      )
    } finally {
      setIsLoadingJobLevels(false)
    }
  }

  useEffect(() => {
    void loadJobLevels()
  }, [])

  const filteredJobLevels = useMemo(() => {
    return jobLevels.filter(({ id, name, level }) => {
      if (!normalizedSearchQuery) {
        return true
      }

      return [id, name, String(level)].some((field) =>
        field.toLowerCase().includes(normalizedSearchQuery),
      )
    })
  }, [jobLevels, normalizedSearchQuery])

  const handleRefresh = () => {
    setSearchQuery('')
    setFeedbackMessage(null)
    void loadJobLevels()
  }

  const handleOpenEdit = (jobLevel) => {
    setActionError('')
    setEditingJobLevel(jobLevel)
  }

  const handleCloseEdit = () => {
    if (isSavingJobLevel) {
      return
    }

    setActionError('')
    setEditingJobLevel(null)
  }

  const handleOpenDelete = (jobLevel) => {
    setActionError('')
    setDeletingJobLevel(jobLevel)
  }

  const handleCloseDelete = () => {
    if (isDeletingJobLevel) {
      return
    }

    setActionError('')
    setDeletingJobLevel(null)
  }

  const handleOpenCreate = () => {
    setActionError('')
    setCreatingJobLevel(true)
  }

  const handleCloseCreate = () => {
    setActionError('')
    setCreatingJobLevel(false)
  }

  const handleSubmitEdit = async (formValues) => {
    if (!editingJobLevel) {
      return
    }

    if (!formValues.name.trim()) {
      setActionError('Nama job level wajib diisi.')
      return
    }

    if (formValues.level === '' || Number(formValues.level) < 1) {
      setActionError('Level wajib diisi dan minimal 1.')
      return
    }

    setActionError('')
    setIsSavingJobLevel(true)

    try {
      const payload = getJobLevelPayload(formValues)
      await updateJobLevel(editingJobLevel.id, payload)
      setFeedbackMessage({
        type: 'success',
        text: `Job level ${formValues.name.trim()} berhasil diperbarui.`,
      })
      setEditingJobLevel(null)
      await loadJobLevels()
    } catch (error) {
      setActionError(error?.message || 'Gagal memperbarui job level.')
    } finally {
      setIsSavingJobLevel(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deletingJobLevel) {
      return
    }

    setActionError('')
    setIsDeletingJobLevel(true)

    try {
      await deleteJobLevel(deletingJobLevel.id)
      setFeedbackMessage({
        type: 'success',
        text: `Job level ${deletingJobLevel.name} berhasil dihapus.`,
      })
      setDeletingJobLevel(null)
      await loadJobLevels()
    } catch (error) {
      setActionError(error?.message || 'Gagal menghapus job level.')
    } finally {
      setIsDeletingJobLevel(false)
    }
  }

  const handleSubmitCreate = async (formValues) => {
    if (!formValues.name.trim()) {
      setActionError('Nama job level wajib diisi.')
      return
    }

    if (formValues.level === '' || Number(formValues.level) < 1) {
      setActionError('Level wajib diisi dan minimal 1.')
      return
    }

    setActionError('')
    setIsCreatingJobLevel(true)

    try {
      const payload = getJobLevelPayload(formValues)
      await createJobLevel(payload)
      setFeedbackMessage({
        type: 'success',
        text: `Job level ${formValues.name.trim()} berhasil dibuat.`,
      })
      setCreatingJobLevel(false)
      await loadJobLevels()
    } catch (error) {
      setActionError(error?.message || 'Gagal membuat job level.')
    } finally {
      setIsCreatingJobLevel(false)
    }
  }

  let content = null

  if (isLoadingJobLevels) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Loading master job levels...</p>
        <p className="dashboard-empty-state__detail">
          Sedang mengambil data job level dari database.
        </p>
      </article>
    )
  } else if (jobLevelsError) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">Job level gagal dimuat</p>
        <p className="dashboard-empty-state__detail">{jobLevelsError}</p>
      </article>
    )
  } else if (filteredJobLevels.length === 0) {
    content = (
      <article className="dashboard-empty-state">
        <p className="dashboard-empty-state__title">No master job level found</p>
        <p className="dashboard-empty-state__detail">
          Coba kata kunci lain atau gunakan refresh untuk menampilkan semua job level.
        </p>
      </article>
    )
  } else {
    content = (
      <div className="master-departments-list">
        {filteredJobLevels.map((jobLevel) => (
          <article
            className="master-project-card master-departments-card"
            key={jobLevel.jobLevelId}
          >
            <div className="master-project-card__header">
              <div>
                <p className="master-project-card__eyebrow">Master Job Level</p>
                <h3 className="master-project-card__title">{jobLevel.name}</h3>
              </div>

              <div className="master-project-card__badges">
                <span className="master-project-card__code">Level {jobLevel.level}</span>
              </div>
            </div>

            <div className="master-project-card__metrics">
              <span className="master-project-card__metric">ID {jobLevel.id}</span>
              <span className="master-project-card__metric">
                {jobLevel.updatedAt !== '-'
                  ? `Updated ${jobLevel.updatedAt}`
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
                onClick={() => handleOpenEdit(jobLevel)}
              >
                <Edit03 size={16} aria-hidden="true" />
                Edit
              </button>
              <button
                type="button"
                className="master-departments-card__action master-departments-card__action--danger"
                onClick={() => handleOpenDelete(jobLevel)}
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
        subtitle: 'Master job level management',
        breadcrumb: sharedBreadcrumbItems,
        searchProps: {
          value: searchQuery,
          placeholder: 'Search master job level...',
          onChange: (event) => setSearchQuery(event.target.value),
          ariaLabel: 'Search master job level',
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
              <p className="dashboard-panel__eyebrow">Job Level Directory</p>
              <h2 className="dashboard-panel__title">
                Master Job Levels Card View ({jobLevels.length})
              </h2>
            </div>
            <button
              type="button"
              className="users-table-card__action"
              onClick={handleOpenCreate}
            >
              <Folder size={18} aria-hidden="true" />
              Create Job Level
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

      <EditJobLevelPopup
        jobLevel={editingJobLevel}
        isSubmitting={isSavingJobLevel}
        errorMessage={editingJobLevel ? actionError : ''}
        onClose={handleCloseEdit}
        onSubmit={handleSubmitEdit}
      />

      <DeleteJobLevelPopup
        jobLevel={deletingJobLevel}
        isSubmitting={isDeletingJobLevel}
        errorMessage={deletingJobLevel ? actionError : ''}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
      />

      <CreateJobLevelPopup
        isOpen={creatingJobLevel}
        isSubmitting={isCreatingJobLevel}
        errorMessage={creatingJobLevel ? actionError : ''}
        onClose={handleCloseCreate}
        onSubmit={handleSubmitCreate}
      />
    </AppLayout>
  )
}

export default JobLevelCardView
