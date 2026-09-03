import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XClose } from '@untitledui/icons'
import api from '@/services/api'
import { getDepartments } from '@/services/master/getDepartements'
import BusinessUnitDepartmentsField from './BusinessUnitDepartmentsField'

const CODE_MAX_LENGTH = 30

function getCreateFormState() {
  return {
    name: '',
    code: '',
    companyId: '',
    isActive: 'active',
  }
}

function generateCodeFromName(name, maxLength = CODE_MAX_LENGTH) {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, maxLength)
}

function CreateBUPopup({
  isOpen,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}) {
  const [formValues, setFormValues] = useState(() => getCreateFormState())
  const [companies, setCompanies] = useState([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
  const [departments, setDepartments] = useState([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([])
  const [primaryDepartmentId, setPrimaryDepartmentId] = useState('')
  const [isCodeCustomized, setIsCodeCustomized] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setFormValues(getCreateFormState())
      setSelectedDepartmentIds([])
      setPrimaryDepartmentId('')
      setIsCodeCustomized(false)

      const fetchCompanies = async () => {
        setIsLoadingCompanies(true)
        try {
          const res = await api.request('/master/companies')
          const data = Array.isArray(res) ? res : (res?.data || [])
          setCompanies(data)
        } catch (error) {
          console.error('Failed to load companies:', error)
        } finally {
          setIsLoadingCompanies(false)
        }
      }

      const fetchDepartments = async () => {
        setIsLoadingDepartments(true)
        try {
          const data = await getDepartments()
          setDepartments(data)
        } catch (error) {
          console.error('Failed to load departments:', error)
        } finally {
          setIsLoadingDepartments(false)
        }
      }

      void fetchCompanies()
      void fetchDepartments()
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

  const companyDepartments = departments.filter(
    (department) => department.companyId === formValues.companyId,
  )

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

    if (name === 'companyId') {
      setSelectedDepartmentIds([])
      setPrimaryDepartmentId('')
    }
  }

  const handleToggleDepartment = (departmentId) => {
    const isSelected = selectedDepartmentIds.includes(departmentId)
    const nextIds = isSelected
      ? selectedDepartmentIds.filter((id) => id !== departmentId)
      : [...selectedDepartmentIds, departmentId]

    setSelectedDepartmentIds(nextIds)

    if (isSelected && primaryDepartmentId === departmentId) {
      setPrimaryDepartmentId(nextIds[0] ?? '')
    } else if (!isSelected && !primaryDepartmentId) {
      setPrimaryDepartmentId(departmentId)
    }
  }

  const handleSetPrimaryDepartment = (departmentId) => {
    setPrimaryDepartmentId(departmentId)
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.({
      ...formValues,
      departments: selectedDepartmentIds.map((id) => ({
        id,
        isPrimary: id === primaryDepartmentId,
      })),
    })
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
        aria-labelledby="bu-create-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Master Business Unit</p>
            <h2 className="dashboard-popup__title" id="bu-create-popup-title">
              Create Business Unit
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup create business unit"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              Tambahkan business unit baru beserta department yang tercakup di dalamnya.
            </p>

            {errorMessage ? (
              <div className="master-departments-feedback master-departments-feedback--error">
                {errorMessage}
              </div>
            ) : null}

            <div className="register-user-popup__grid">
              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Nama Business Unit</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleChange}
                  placeholder="Masukkan nama business unit"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Kode Business Unit (otomatis)</span>
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

              <label className="register-user-popup__field register-user-popup__field--full">
                <span className="register-user-popup__label">Departments</span>
                <BusinessUnitDepartmentsField
                  departments={companyDepartments}
                  isLoading={isLoadingDepartments}
                  companyId={formValues.companyId}
                  selectedIds={selectedDepartmentIds}
                  primaryId={primaryDepartmentId}
                  onToggle={handleToggleDepartment}
                  onSetPrimary={handleSetPrimaryDepartment}
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
              disabled={isSubmitting || selectedDepartmentIds.length === 0}
            >
              {isSubmitting ? 'Membuat...' : 'Create Business Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body)
}

export default CreateBUPopup
