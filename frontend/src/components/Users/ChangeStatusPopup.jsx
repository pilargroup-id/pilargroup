import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XClose } from '@untitledui/icons'

function ChangeStatusPopup({ user, nextActive, isSubmitting, errorMessage, onClose, onConfirm }) {
  useEffect(() => {
    if (!user) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isSubmitting, onClose, user])

  if (!user) {
    return null
  }

  const rawUser = user.raw ?? {}
  const displayName =
    rawUser.name || (user.name && user.name !== '-' ? user.name : '') || rawUser.username || 'User'
  const actionLabel = nextActive ? 'mengaktifkan' : 'menonaktifkan'
  const statusLabel = nextActive ? 'Aktif' : 'Nonaktif'

  const handleClose = () => {
    if (!isSubmitting) {
      onClose?.()
    }
  }

  return createPortal(
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup master-departments-delete-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-status-popup-title"
        aria-describedby="user-status-popup-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Change User Status</p>
            <h2 className="dashboard-popup__title" id="user-status-popup-title">
              Ubah status {displayName}?
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup ubah status user"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <p className="dashboard-popup__text" id="user-status-popup-description">
            Aksi ini akan {actionLabel} user <strong>{displayName}</strong> menjadi status{' '}
            <strong>{statusLabel}</strong>.
          </p>

          {errorMessage ? (
            <div className="master-departments-feedback master-departments-feedback--error">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="dashboard-popup__actions">
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--secondary"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Batal
          </button>
          <button
            type="button"
            className="dashboard-popup__button dashboard-popup__button--primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menyimpan...' : 'Ya, Ubah'}
          </button>
        </div>
      </div>
    </div>
  , document.body)
}

export default ChangeStatusPopup
