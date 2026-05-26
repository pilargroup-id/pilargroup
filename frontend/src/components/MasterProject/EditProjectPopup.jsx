import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XClose } from '@untitledui/icons'

function getEditFormState(project) {
  return {
    name: project?.name ?? '',
    url: project?.urlRaw ?? '',
    description: project?.descriptionRaw ?? '',
    isActive: project?.isActive ? 'active' : 'inactive',
  }
}

function EditProjectPopup({ project, isSubmitting, errorMessage, onClose, onSubmit }) {
  const [formValues, setFormValues] = useState(() => getEditFormState(project))

  useEffect(() => {
    setFormValues(getEditFormState(project))
  }, [project])

  useEffect(() => {
    if (!project) {
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
  }, [isSubmitting, onClose, project])

  if (!project) {
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
        aria-labelledby="project-edit-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Master Project</p>
            <h2 className="dashboard-popup__title" id="project-edit-popup-title">
              Edit {project.name}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup edit project"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              Perbarui informasi project. Slug saat ini: <strong>{project.slug}</strong>
            </p>

            {errorMessage ? (
              <div className="master-departments-feedback master-departments-feedback--error">
                {errorMessage}
              </div>
            ) : null}

            <div className="register-user-popup__grid">
              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Project Name</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleChange}
                  placeholder="Masukkan nama project"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Project URL</span>
                <input
                  className="register-user-popup__input"
                  type="url"
                  name="url"
                  value={formValues.url}
                  onChange={handleChange}
                  placeholder="https://project.example.com"
                  autoComplete="url"
                />
              </label>

              <label className="register-user-popup__field register-user-popup__field--full">
                <span className="register-user-popup__label">Description</span>
                <textarea
                  className="register-user-popup__input master-departments-popup__textarea"
                  name="description"
                  value={formValues.description}
                  onChange={handleChange}
                  placeholder="Deskripsi singkat project"
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Status</span>
                <select
                  className="register-user-popup__select"
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body)
}

export default EditProjectPopup
