import { useEffect, useState } from 'react'
import { XClose } from '@untitledui/icons'

const initialFormState = {
  name: '',
  email: '',
  division: 'Finance',
  role: '',
}

const divisionOptions = ['Finance', 'Legal', 'Product', 'HR', 'IT Support']

function RegisterUserPopup({ isOpen, onClose, onSubmit }) {
  const [formValues, setFormValues] = useState(initialFormState)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setFormValues(initialFormState)
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }))
  }

  const handleClose = () => {
    setFormValues(initialFormState)
    onClose?.()
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    onSubmit?.({
      name: formValues.name.trim(),
      email: formValues.email.trim(),
      division: formValues.division,
      role: formValues.role.trim(),
    })
    setFormValues(initialFormState)
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="register-user-popup-title"
        aria-describedby="register-user-popup-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">User Management</p>
            <h2 className="dashboard-popup__title" id="register-user-popup-title">
              Registrasi User
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup registrasi user"
            onClick={handleClose}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text" id="register-user-popup-description">
              Lengkapi data berikut untuk menambahkan user baru ke direktori.
            </p>

            <div className="register-user-popup__grid">
              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Nama Lengkap</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleChange}
                  placeholder="Masukkan nama user"
                  autoComplete="name"
                  required
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Email</span>
                <input
                  className="register-user-popup__input"
                  type="email"
                  name="email"
                  value={formValues.email}
                  onChange={handleChange}
                  placeholder="nama@perusahaan.com"
                  autoComplete="email"
                  required
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Divisi</span>
                <select
                  className="register-user-popup__select"
                  name="division"
                  value={formValues.division}
                  onChange={handleChange}
                >
                  {divisionOptions.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Role</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="role"
                  value={formValues.role}
                  onChange={handleChange}
                  placeholder="Masukkan role user"
                  autoComplete="organization-title"
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
            >
              Batal
            </button>
            <button
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--primary"
            >
              Simpan User
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RegisterUserPopup
