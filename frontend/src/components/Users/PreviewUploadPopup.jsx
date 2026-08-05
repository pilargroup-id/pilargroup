import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { XClose } from '@untitledui/icons'
import {
  previewUserImport,
  commitUserImport,
  cancelUserImport,
  downloadInvalidUserImport,
} from '@/services/manageUsers'

const FILTERS = ['ALL', 'CREATE', 'UPDATE', 'SKIP', 'INVALID']

const FILTER_LABELS = {
  ALL: 'Semua',
  CREATE: 'Create',
  UPDATE: 'Update',
  SKIP: 'Skip',
  INVALID: 'Invalid',
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '-'
  }

  if (typeof value === 'boolean') {
    return value ? 'Ya' : 'Tidak'
  }

  return String(value)
}

function formatDateTime(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function countRowsForFilter(rows, filterKey) {
  if (filterKey === 'ALL') {
    return rows.length
  }

  if (filterKey === 'INVALID') {
    return rows.filter((row) => row.status === 'INVALID').length
  }

  return rows.filter((row) => row.status === 'VALID' && row.action === filterKey).length
}

function PreviewUploadPopup({ isOpen, file, onClose, onCommitted }) {
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [batchId, setBatchId] = useState(null)
  const [expiresAt, setExpiresAt] = useState(null)
  const [summary, setSummary] = useState(null)
  const [rows, setRows] = useState([])
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [isCommitting, setIsCommitting] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)
  const [actionError, setActionError] = useState('')
  const [commitResult, setCommitResult] = useState(null)

  const isBusy = isCommitting || isCanceling

  const resetState = () => {
    setIsPreviewing(false)
    setPreviewError('')
    setBatchId(null)
    setExpiresAt(null)
    setSummary(null)
    setRows([])
    setActiveFilter('ALL')
    setIsCommitting(false)
    setIsCanceling(false)
    setActionError('')
    setCommitResult(null)
  }

  useEffect(() => {
    if (!isOpen || !file) {
      resetState()
      return undefined
    }

    let isActive = true
    setIsPreviewing(true)
    setPreviewError('')

    previewUserImport(file)
      .then((response) => {
        if (!isActive) {
          return
        }

        setBatchId(response?.batch_id ?? null)
        setExpiresAt(response?.expires_at ?? null)
        setSummary(response?.summary ?? null)
        setRows(Array.isArray(response?.rows) ? response.rows : [])
      })
      .catch((error) => {
        if (!isActive) {
          return
        }

        setPreviewError(error?.message || 'Gagal membuat preview import.')
      })
      .finally(() => {
        if (isActive) {
          setIsPreviewing(false)
        }
      })

    return () => {
      isActive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, file])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isBusy) {
        handleClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isBusy])

  const filteredRows = useMemo(() => {
    if (activeFilter === 'ALL') {
      return rows
    }

    if (activeFilter === 'INVALID') {
      return rows.filter((row) => row.status === 'INVALID')
    }

    return rows.filter((row) => row.status === 'VALID' && row.action === activeFilter)
  }, [rows, activeFilter])

  const handleClose = () => {
    if (isBusy) {
      return
    }

    resetState()
    onClose?.()
  }

  const handleCancelBatch = async () => {
    if (isBusy) {
      return
    }

    if (!batchId) {
      handleClose()
      return
    }

    setIsCanceling(true)
    setActionError('')

    try {
      await cancelUserImport(batchId)
      resetState()
      onClose?.()
    } catch (error) {
      setActionError(error?.message || 'Gagal membatalkan import.')
    } finally {
      setIsCanceling(false)
    }
  }

  const handleCommit = async () => {
    if (isBusy || !batchId) {
      return
    }

    setIsCommitting(true)
    setActionError('')

    try {
      const response = await commitUserImport(batchId)
      setCommitResult(response)

      if (response?.invalid_file_url) {
        try {
          await downloadInvalidUserImport(batchId)
        } catch {
          // Commit itself already succeeded even if the invalid-file download fails.
        }
      }

      await onCommitted?.(response)
    } catch (error) {
      setActionError(error?.message || 'Gagal menyimpan hasil import.')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleDone = () => {
    resetState()
    onClose?.()
  }

  if (!isOpen) {
    return null
  }

  return createPortal(
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup register-user-popup--users preview-upload-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-upload-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">User Management</p>
            <h2 className="dashboard-popup__title" id="preview-upload-popup-title">
              Preview Import User
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup preview import"
            onClick={handleClose}
            disabled={isBusy}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body preview-upload-popup__body">
          {isPreviewing && (
            <div className="preview-upload-popup__state">
              Memproses file import, mohon tunggu...
            </div>
          )}

          {!isPreviewing && previewError && (
            <div className="preview-upload-popup__error">{previewError}</div>
          )}

          {!isPreviewing && !previewError && commitResult && (
            <div className="preview-upload-popup__commit-result">
              <p className="preview-upload-popup__hint">
                {commitResult.message || 'Import user berhasil disimpan.'}
              </p>

              <div className="preview-upload-popup__summary-grid">
                <div className="preview-upload-popup__stat preview-upload-popup__stat--positive">
                  <span className="preview-upload-popup__stat-value">
                    {commitResult.summary?.created ?? 0}
                  </span>
                  <span className="preview-upload-popup__stat-label">Dibuat</span>
                </div>
                <div className="preview-upload-popup__stat preview-upload-popup__stat--positive">
                  <span className="preview-upload-popup__stat-value">
                    {commitResult.summary?.updated ?? 0}
                  </span>
                  <span className="preview-upload-popup__stat-label">Diperbarui</span>
                </div>
                <div className="preview-upload-popup__stat">
                  <span className="preview-upload-popup__stat-value">
                    {commitResult.summary?.skipped ?? 0}
                  </span>
                  <span className="preview-upload-popup__stat-label">Dilewati</span>
                </div>
                <div className="preview-upload-popup__stat preview-upload-popup__stat--negative">
                  <span className="preview-upload-popup__stat-value">
                    {commitResult.summary?.invalid ?? 0}
                  </span>
                  <span className="preview-upload-popup__stat-label">Invalid</span>
                </div>
                <div className="preview-upload-popup__stat preview-upload-popup__stat--negative">
                  <span className="preview-upload-popup__stat-value">
                    {commitResult.summary?.failed_during_commit ?? 0}
                  </span>
                  <span className="preview-upload-popup__stat-label">Gagal saat commit</span>
                </div>
              </div>

              {commitResult.invalid_file_url && (
                <p className="preview-upload-popup__hint">
                  File berisi baris invalid otomatis diunduh. Perbaiki data lalu import ulang jika perlu.
                </p>
              )}
            </div>
          )}

          {!isPreviewing && !previewError && !commitResult && summary && (
            <>
              <div className="preview-upload-popup__summary-grid">
                <div className="preview-upload-popup__stat">
                  <span className="preview-upload-popup__stat-value">{summary.total ?? 0}</span>
                  <span className="preview-upload-popup__stat-label">Total</span>
                </div>
                <div className="preview-upload-popup__stat preview-upload-popup__stat--positive">
                  <span className="preview-upload-popup__stat-value">{summary.valid ?? 0}</span>
                  <span className="preview-upload-popup__stat-label">Valid</span>
                </div>
                <div className="preview-upload-popup__stat preview-upload-popup__stat--negative">
                  <span className="preview-upload-popup__stat-value">{summary.invalid ?? 0}</span>
                  <span className="preview-upload-popup__stat-label">Invalid</span>
                </div>
                <div className="preview-upload-popup__stat">
                  <span className="preview-upload-popup__stat-value">{summary.create ?? 0}</span>
                  <span className="preview-upload-popup__stat-label">Create</span>
                </div>
                <div className="preview-upload-popup__stat">
                  <span className="preview-upload-popup__stat-value">{summary.update ?? 0}</span>
                  <span className="preview-upload-popup__stat-label">Update</span>
                </div>
                <div className="preview-upload-popup__stat">
                  <span className="preview-upload-popup__stat-value">{summary.skip ?? 0}</span>
                  <span className="preview-upload-popup__stat-label">Skip</span>
                </div>
              </div>

              {expiresAt && (
                <p className="preview-upload-popup__hint">
                  Preview bersifat sementara dan berlaku hingga{' '}
                  <strong>{formatDateTime(expiresAt)}</strong>. Lakukan Commit sebelum waktu tersebut.
                </p>
              )}

              <div className="preview-upload-popup__filters" role="tablist" aria-label="Filter baris import">
                {FILTERS.map((filterKey) => (
                  <button
                    key={filterKey}
                    type="button"
                    role="tab"
                    aria-selected={activeFilter === filterKey}
                    className={`preview-upload-popup__filter ${activeFilter === filterKey ? 'is-active' : ''}`}
                    onClick={() => setActiveFilter(filterKey)}
                  >
                    {FILTER_LABELS[filterKey]}
                    <span className="preview-upload-popup__filter-count">
                      {countRowsForFilter(rows, filterKey)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="preview-upload-popup__table-wrapper">
                <table className="preview-upload-popup__table">
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Username</th>
                      <th>Status</th>
                      <th>Action</th>
                      <th>Perubahan</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="preview-upload-popup__empty">
                          Tidak ada baris untuk filter ini.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        const changeEntries =
                          row.changes && !Array.isArray(row.changes)
                            ? Object.entries(row.changes)
                            : []

                        return (
                          <tr key={row.row}>
                            <td>{row.row}</td>
                            <td>{row.username || '-'}</td>
                            <td>
                              <span
                                className={`preview-upload-popup__badge preview-upload-popup__badge--status-${(row.status || '').toLowerCase()}`}
                              >
                                {row.status}
                              </span>
                            </td>
                            <td>
                              {row.action ? (
                                <span
                                  className={`preview-upload-popup__badge preview-upload-popup__badge--action-${row.action.toLowerCase()}`}
                                >
                                  {row.action}
                                </span>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>
                              {changeEntries.length > 0 ? (
                                <ul className="preview-upload-popup__changes">
                                  {changeEntries.map(([field, change]) => (
                                    <li key={field}>
                                      <strong>{field}</strong>: {formatFieldValue(change?.old)}{' '}
                                      &rarr; {formatFieldValue(change?.new)}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td>
                              {Array.isArray(row.errors) && row.errors.length > 0 ? (
                                <ul className="preview-upload-popup__errors">
                                  {row.errors.map((message, index) => (
                                    <li key={index}>{message}</li>
                                  ))}
                                </ul>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {actionError && <div className="preview-upload-popup__error">{actionError}</div>}
        </div>

        <div className="dashboard-popup__actions">
          {commitResult ? (
            <button
              type="button"
              className="dashboard-popup__button dashboard-popup__button--primary"
              onClick={handleDone}
            >
              Selesai
            </button>
          ) : (
            <>
              <button
                type="button"
                className="dashboard-popup__button dashboard-popup__button--secondary"
                onClick={handleCancelBatch}
                disabled={isBusy || isPreviewing}
              >
                {isCanceling ? 'Membatalkan...' : 'Cancel'}
              </button>

              {!previewError && (
                <button
                  type="button"
                  className="dashboard-popup__button dashboard-popup__button--primary"
                  onClick={handleCommit}
                  disabled={isBusy || isPreviewing || !batchId || rows.length === 0}
                >
                  {isCommitting ? 'Menyimpan...' : 'Commit'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default PreviewUploadPopup
