import { useEffect, useState } from 'react'
import {
  ArrowCircleRight,
  CircleCut,
  Eye,
  EyeOff,
  LockKeyholeCircle,
  UserCircle,
} from '@untitledui/icons'

import logoPiagam from '@/assets/image/logo-piagam2.png'
import '@/assets/styles/login.css'
import { defaultNavigationPath } from '@/constants/navigation'
import { submitLogin } from '@/services/loginService'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const previousTitle = document.title

    document.title = 'Login | Pilar Group'

    return () => {
      document.title = previousTitle
    }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (isSubmitting) {
      return
    }

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      await submitLogin({ username, password })

      window.history.replaceState({}, '', defaultNavigationPath)
      window.dispatchEvent(new PopStateEvent('popstate'))
    } catch (error) {
      setErrorMessage(
        error?.message || 'Login gagal. Periksa kembali username dan password Anda.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="login-page">
      <div className="login-page__hero">
        <div className="login-page__brand">
          <img
            className="login-page__brand-logo"
            src={logoPiagam}
            alt="PT. Pilar Niaga Makmur"
          />

          <div className="login-page__brand-text">
            <p className="login-page__brand-name">PT. Pilar Niaga Makmur</p>
            <p className="login-page__brand-caption">Internal Project PT Pilar Niaga Makmur</p>
          </div>
        </div>

        <p className="login-page__footer">Copyright 2025 PT. Pilar Niaga Makmur</p>
      </div>

      <div className="login-page__panel">
        <div className="login-page__card">
          <div className="login-page__card-header">
            <h2 className="login-page__card-title">Login</h2>
            <p className="login-page__card-subtitle">
              Welcome back! Please enter your details
            </p>
          </div>

          <form className="login-page__form" onSubmit={handleSubmit}>
            <label className="login-page__field">
              <span className="login-page__label">Username *</span>
              <span className="login-page__input-shell">
                <UserCircle className="login-page__input-icon" size={20} />
                <input
                  className="login-page__input"
                  type="text"
                  value={username}
                  onChange={(event) => {
                    setUsername(event.target.value)
                    setErrorMessage('')
                  }}
                  placeholder="Enter your username"
                  autoComplete="username"
                  disabled={isSubmitting}
                />
              </span>
            </label>

            <label className="login-page__field">
              <span className="login-page__label">Password *</span>
              <span className="login-page__input-shell">
                <LockKeyholeCircle className="login-page__input-icon" size={20} />
                <input
                  className="login-page__input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setErrorMessage('')
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="login-page__password-toggle"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isSubmitting}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </span>
            </label>

            {errorMessage ? <p className="login-page__alert">{errorMessage}</p> : null}

            <button className="login-page__submit" type="submit" disabled={isSubmitting}>
              <span>{isSubmitting ? 'Memproses...' : 'Login'}</span>
              {isSubmitting ? (
                <CircleCut className="login-page__submit-icon login-page__submit-icon--spinning" size={18} />
              ) : (
                <ArrowCircleRight className="login-page__submit-icon" size={18} />
              )}
            </button>
          </form>

          <p className="login-page__meta">
            Don&apos;t have an account?{' '}
            <a
              className="login-page__meta-link"
              href="/login"
              onClick={(event) => event.preventDefault()}
            >
              Sign up for free
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
