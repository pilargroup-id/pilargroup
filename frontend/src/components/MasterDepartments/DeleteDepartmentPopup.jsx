import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XClose } from '@untitledui/icons'

function DeleteDepartmentPopup({
  department,
  isSubmitting,
  errorMessage,
  onClose,
  onConfirm,
}) {
  useEffect(() => {
    if (!department) {
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
  }, [department, isSubmitting, onClose])

  if (!department) {
    return null
  }

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
        aria-labelledby="department-delete-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Delete Department</p>
            <h2 className="dashboard-popup__title" id="department-delete-popup-title">
              Hapus {department.name}?
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup hapus department"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <div className="dashboard-popup__body">
          <p className="dashboard-popup__text">
            Aksi ini akan menghapus department <strong>{department.name}</strong> dengan ID{' '}
            <strong>{department.id}</strong>. Jika department masih dipakai user, API akan
            menolak penghapusan.
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
  , document.body)
}

export default DeleteDepartmentPopup
