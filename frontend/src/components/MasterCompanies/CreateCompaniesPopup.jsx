import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XClose } from '@untitledui/icons'

const CODE_MAX_LENGTH = 10

function getCreateFormState() {
  return {
    name: '',
    code: '',
    isActive: 'active',
  }
}

function generateCodeFromName(name, maxLength = CODE_MAX_LENGTH) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, maxLength)
}

function CreateCompaniesPopup({
  isOpen,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}) {
  const [formValues, setFormValues] = useState(() => getCreateFormState())
  const [isCodeCustomized, setIsCodeCustomized] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormValues(getCreateFormState())
      setIsCodeCustomized(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
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
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) {
    return null
  }

  const handleChange = (event) => {
    const { name, value } = event.target

    if (name === 'code') {
      setIsCodeCustomized(true)
    }

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
      ...(name === 'name' && !isCodeCustomized
        ? { code: generateCodeFromName(value) }
        : null),
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
        aria-labelledby="company-create-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Master Company</p>
            <h2 className="dashboard-popup__title" id="company-create-popup-title">
              Create Company
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup create company"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              Tambahkan company baru ke master company directory.
            </p>

            {errorMessage ? (
              <div className="master-departments-feedback master-departments-feedback--error">
                {errorMessage}
              </div>
            ) : null}

            <div className="register-user-popup__grid">
              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Nama Company</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleChange}
                  placeholder="Masukkan nama company"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Kode Company (otomatis)</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="code"
                  value={formValues.code}
                  onChange={handleChange}
                  placeholder="Terisi otomatis dari nama"
                  autoComplete="off"
                  maxLength={CODE_MAX_LENGTH}
                  required
                />
              </label>

              <label className="register-user-popup__field register-user-popup__field--full">
                <span className="register-user-popup__label">Status</span>
                <select
                  className="register-user-popup__input"
                  name="isActive"
                  value={formValues.isActive}
                  onChange={handleChange}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
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
              {isSubmitting ? 'Membuat...' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body)
}

export default CreateCompaniesPopup
