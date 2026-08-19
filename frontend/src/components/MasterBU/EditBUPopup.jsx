import { useEffect, useState } from 'react'
import { XClose } from '@untitledui/icons'
import { createPortal } from 'react-dom'
import api from '@/services/api'
import { getDepartments } from '@/services/master/getDepartements'
import BusinessUnitDepartmentsField from './BusinessUnitDepartmentsField'

function getEditFormState(businessUnit) {
  return {
    name: businessUnit?.name ?? '',
    code: businessUnit?.code ?? '',
    companyId: businessUnit?.companyId ?? '',
    isActive: businessUnit?.isActive ? 'active' : 'inactive',
  }
}

function getInitialSelectedIds(businessUnit) {
  return (businessUnit?.departments ?? []).map((department) => department.id)
}

function getInitialPrimaryId(businessUnit) {
  const primaryDepartment = (businessUnit?.departments ?? []).find(
    (department) => department.isPrimary,
  )

  return primaryDepartment?.id ?? businessUnit?.departments?.[0]?.id ?? ''
}

function EditBUPopup({
  businessUnit,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}) {
  const [formValues, setFormValues] = useState(() => getEditFormState(businessUnit))
  const [companies, setCompanies] = useState([])
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
  const [departments, setDepartments] = useState([])
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(false)
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState(() =>
    getInitialSelectedIds(businessUnit),
  )
  const [primaryDepartmentId, setPrimaryDepartmentId] = useState(() =>
    getInitialPrimaryId(businessUnit),
  )

  useEffect(() => {
    setFormValues(getEditFormState(businessUnit))
    setSelectedDepartmentIds(getInitialSelectedIds(businessUnit))
    setPrimaryDepartmentId(getInitialPrimaryId(businessUnit))

    if (businessUnit) {
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
  }, [businessUnit])

  useEffect(() => {
    if (!businessUnit) {
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
  }, [businessUnit, isSubmitting, onClose])

  if (!businessUnit) {
    return null
  }

  const companyDepartments = departments.filter(
    (department) => department.companyId === formValues.companyId,
  )

  const handleChange = (event) => {
    const { name, value } = event.target

    setFormValues((currentValues) => ({
      ...currentValues,
      [name]: value,
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
        aria-labelledby="bu-edit-popup-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Master Business Unit</p>
            <h2 className="dashboard-popup__title" id="bu-edit-popup-title">
              Edit {businessUnit.name}
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup edit business unit"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text">
              Perbarui data business unit. ID business unit tetap{' '}
              <strong>{businessUnit.id}</strong>.
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
                <span className="register-user-popup__label">Kode Business Unit</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  name="code"
                  value={formValues.code}
                  onChange={handleChange}
                  placeholder="Masukkan kode business unit"
                  autoComplete="off"
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body)
}

export default EditBUPopup
