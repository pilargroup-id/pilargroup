import { useEffect, useState } from 'react'
import { XClose } from '@untitledui/icons'
import api from '@/services/api'

function getCreateFormState() {
  return {
    name: '',
    code: '',
    companyId: '',
  }
}

function CreateDepartmentPopup({
  isOpen,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}) {
  const [formValues, setFormValues] = useState(() => getCreateFormState())
  const [companies, setCompanies] = useState([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormValues(getCreateFormState())

      const fetchCompanies = async () => {
        setIsLoadingCompanies(true)
        try {
          const res = await api.request('/master/companies')
          const data = Array.isArray(res) ? res : (res?.data || [])
          console.log('Fetched companies:', data)
          setCompanies(data)
        } catch (error) {
          console.error('Failed to load companies:', error)
        } finally {
          setIsLoadingCompanies(false)
        }
      }

      void fetchCompanies()
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
    console.log('handleChange:', name, value)

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

  return (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="department-create-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Master Department</p>
            <h2 className="dashboard-popup__title" id="department-create-popup-title">
              Create Department
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup create department"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              Tambahkan department baru ke master department directory.
            </p>

            {errorMessage ? (
              <div className="master-departments-feedback master-departments-feedback--error">
                {errorMessage}
              </div>
            ) : null}

            <div className="register-user-popup__grid">
              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Nama Department</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleChange}
                  placeholder="Masukkan nama department"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Kode Department</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="code"
                  value={formValues.code}
                  onChange={handleChange}
                  placeholder="Masukkan kode (maks 10 karakter)"
                  autoComplete="off"
                  maxLength={10}
                  required
                />
              </label>

              <label className="register-user-popup__field register-user-popup__field--full">
                <span className="register-user-popup__label">Company</span>
                <select
                  className="register-user-popup__input"
                  name="companyId"
                  value={formValues.companyId}
                  onChange={handleChange}
                  required
                  disabled={isLoadingCompanies}
                >
                  <option value="" disabled>
                    {isLoadingCompanies ? 'Loading companies...' : 'Pilih perusahaan'}
                  </option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
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
              {isSubmitting ? 'Membuat...' : 'Create Department'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateDepartmentPopup