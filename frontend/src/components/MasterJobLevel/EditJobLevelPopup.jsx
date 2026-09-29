import { useEffect, useState } from 'react'
import { XClose } from '@untitledui/icons'
import { createPortal } from 'react-dom'

function getEditFormState(jobLevel) {
  return {
    name: jobLevel?.name ?? '',
    level: jobLevel?.level !== undefined && jobLevel?.level !== null ? String(jobLevel.level) : '',
  }
}

function EditJobLevelPopup({
  jobLevel,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}) {
  const [formValues, setFormValues] = useState(() => getEditFormState(jobLevel))

  useEffect(() => {
    setFormValues(getEditFormState(jobLevel))
  }, [jobLevel])

  useEffect(() => {
    if (!jobLevel) {
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
  }, [jobLevel, isSubmitting, onClose])

  if (!jobLevel) {
    return null
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.(formValues)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose?.()
    }
  }

  return createPortal(
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-level-edit-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Master Job Level</p>
            <h2 className="dashboard-popup__title" id="job-level-edit-popup-title">
              Edit {jobLevel.name}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup edit job level"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              Perbarui nama dan level. ID job level tetap <strong>{jobLevel.id}</strong>.
            </p>

            {errorMessage ? (
              <div className="master-departments-feedback master-departments-feedback--error">
                {errorMessage}
              </div>
            ) : null}

            <div className="register-user-popup__grid">
              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Nama Job Level</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleChange}
                  placeholder="Masukkan nama job level"
                  autoComplete="off"
                  maxLength={100}
                  required
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Level</span>
                <input
                  className="register-user-popup__input"
                  type="number"
                  name="level"
                  value={formValues.level}
                  onChange={handleChange}
                  placeholder="Masukkan level (kelipatan 0,5)"
                  autoComplete="off"
                  min={0.5}
                  step={0.5}
                  required
                />
              </label>
            </div>
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
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body)
}

export default EditJobLevelPopup
