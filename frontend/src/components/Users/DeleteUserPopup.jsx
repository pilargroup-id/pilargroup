import { useEffect } from 'react'
import { XClose } from '@untitledui/icons'

function DeleteUserPopup({ user, isSubmitting, errorMessage, onClose, onConfirm }) {
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

  const handleClose = () => {
    if (!isSubmitting) {
      onClose?.()
    }
  }

  return (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup master-departments-delete-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-delete-popup-title"
        aria-describedby="user-delete-popup-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Delete User</p>
            <h2 className="dashboard-popup__title" id="user-delete-popup-title">
              Hapus {displayName}?
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup hapus user"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <p className="dashboard-popup__text" id="user-delete-popup-description">
            Aksi ini akan menghapus user <strong>{displayName}</strong> dengan username{' '}
            <strong>{rawUser.username ?? '-'}</strong>. Relasi apps yang terhubung juga akan
            dilepas.
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
            className="dashboard-popup__button master-departments-delete-popup__button"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Menghapus...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default DeleteUserPopup
