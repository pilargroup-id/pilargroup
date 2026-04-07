import { useEffect, useState } from 'react'
import { CircleCut, XClose } from '@untitledui/icons'

import { ApiError, changeProfile, getCurrentUser } from '@/services/api'

function getInitialFormValues(user = {}) {
  return {
    current_password: '',
    new_username: '',
    new_password: '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  }
}

function ChangeProfilePopup({ isOpen = false, user, onClose, onUpdated }) {
  const [formValues, setFormValues] = useState(() => getInitialFormValues(user))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setFormValues(getInitialFormValues(user))
    setErrorMessage('')
    setSuccessMessage('')
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

  const handleChange = (field) => (event) => {
    const nextValue = event.target.value

    setFormValues((currentValues) => ({
      ...currentValues,
      [field]: nextValue,
    }))
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleClose = () => {
    if (isSubmitting) {
      return
    }

    onClose?.()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    const currentPassword = formValues.current_password
    const nextUsername = formValues.new_username.trim()
    const nextPassword = formValues.new_password
    const nextEmail = formValues.email.trim()
    const nextPhone = formValues.phone.trim()

    if (!currentPassword.trim()) {
      setErrorMessage('Password saat ini wajib diisi.')
      return
    }

    const payload = {
      current_password: currentPassword,
    }

    if (nextUsername && nextUsername !== String(user?.username ?? '').trim()) {
      payload.new_username = nextUsername
    }

    if (nextPassword) {
      payload.new_password = nextPassword
    }

    if (nextEmail && nextEmail !== String(user?.email ?? '').trim()) {
      payload.email = nextEmail
    }

    if (nextPhone && nextPhone !== String(user?.phone ?? '').trim()) {
      payload.phone = nextPhone
    }

    if (Object.keys(payload).length === 1) {
      setErrorMessage('Isi minimal satu perubahan profile sebelum menyimpan.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await changeProfile(payload)
      const refreshedUser = await getCurrentUser()

      setFormValues(getInitialFormValues(refreshedUser))
      setSuccessMessage('Profile berhasil diperbarui.')
      onUpdated?.(refreshedUser)
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error?.message || 'Gagal memperbarui profile.'

      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="dashboard-popup-overlay" role="presentation" onClick={handleClose}>
      <div
        className="dashboard-popup register-user-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-profile-popup-title"
        aria-describedby="change-profile-popup-description"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dashboard-popup__header">
          <div>
            <p className="dashboard-popup__eyebrow">Profile</p>
            <h2 className="dashboard-popup__title" id="change-profile-popup-title">
              Change Profile
            </h2>
          </div>

          <button
            type="button"
            className="dashboard-popup__close"
            aria-label="Tutup popup change profile"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <XClose size={18} />
          </button>
        </div>

        <form className="register-user-popup__form" onSubmit={handleSubmit}>
          <div className="dashboard-popup__body">
            <p className="dashboard-popup__text" id="change-profile-popup-description">
              Ubah username, password, email, atau nomor telepon Anda. Password saat ini
              wajib diisi untuk menyimpan perubahan.
            </p>

            {successMessage ? (
              <div className="master-departments-feedback master-departments-feedback--success">
                {successMessage}
              </div>
            ) : null}

            {errorMessage ? (
              <div className="master-departments-feedback master-departments-feedback--error">
                {errorMessage}
              </div>
            ) : null}

            <div className="register-user-popup__grid">
              <label className="register-user-popup__field register-user-popup__field--full">
                <span className="register-user-popup__label">Password Saat Ini *</span>
                <input
                  className="register-user-popup__input"
                  type="password"
                  value={formValues.current_password}
                  onChange={handleChange('current_password')}
                  placeholder="Masukkan password saat ini"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Username Baru</span>
                <input
                  className="register-user-popup__input"
                  type="text"
                  value={formValues.new_username}
                  onChange={handleChange('new_username')}
                  placeholder={user?.username ? `Saat ini: ${user.username}` : 'Masukkan username baru'}
                  autoComplete="username"
                  disabled={isSubmitting}
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Password Baru</span>
                <input
                  className="register-user-popup__input"
                  type="password"
                  value={formValues.new_password}
                  onChange={handleChange('new_password')}
                  placeholder="Kosongkan jika tidak diubah"
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Email</span>
                <input
                  className="register-user-popup__input"
                  type="email"
                  value={formValues.email}
                  onChange={handleChange('email')}
                  placeholder="Masukkan email"
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </label>

              <label className="register-user-popup__field">
                <span className="register-user-popup__label">Phone</span>
                <input
                  className="register-user-popup__input"
                  type="tel"
                  value={formValues.phone}
                  onChange={handleChange('phone')}
                  placeholder="Masukkan nomor telepon"
                  autoComplete="tel"
                  disabled={isSubmitting}
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
              Cancel
            </button>
            <button
              type="submit"
              className="dashboard-popup__button dashboard-popup__button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <CircleCut size={18} className="dashboard-popup__spinner" />
              ) : null}
              <span>{isSubmitting ? 'Menyimpan...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ChangeProfilePopup
