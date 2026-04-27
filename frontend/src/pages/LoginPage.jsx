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
  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const params   = new URLSearchParams(window.location.search)
  const ssoToken = params.get('sso_token')

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Login | Pilar Group'
    return () => { document.title = previousTitle }
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setErrorMessage('')
    setIsSubmitting(true)

    try {
      const loginPayload = ssoToken
        ? { username, password, sso_token: ssoToken }
        : { username, password }

      const { token, redirect } = await submitLogin(loginPayload)

      const samlToken = new URLSearchParams(window.location.search).get('saml_token')

      // SAML flow — tidak diubah
      if (samlToken && token) {
        const res = await fetch('/api/saml/respond', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ saml_token: samlToken }),
        })

        if (!res.ok) throw new Error('SAML authentication failed.')

        const html   = await res.text()
        const parsed = new DOMParser().parseFromString(html, 'text/html')

        const form = document.createElement('form')
        form.method = 'POST'
        form.action = parsed.querySelector('form')?.action ?? ''

        const inputSaml = document.createElement('input')
        inputSaml.type  = 'hidden'
        inputSaml.name  = 'SAMLResponse'
        inputSaml.value = parsed.querySelector('input[name="SAMLResponse"]')?.value ?? ''

        const inputRelay = document.createElement('input')
        inputRelay.type  = 'hidden'
        inputRelay.name  = 'RelayState'
        inputRelay.value = parsed.querySelector('input[name="RelayState"]')?.value ?? ''

        form.appendChild(inputSaml)
        form.appendChild(inputRelay)
        document.body.appendChild(form)
        form.submit()
        return
      }

      // SSO flow
      if (redirect) {
        window.location.href = redirect
        return
      }

      // Login normal
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

        <p className="login-page__footer login-page__footer--desktop">
          {/* <span className="login-page__footer-icon" aria-hidden="true">&copy;</span> */}
          <span>Copyright 2026 PT. Pilar Niaga Makmur</span>
        </p>
      </div>

      <div className="login-page__panel">
        <div className="login-page__panel-content">
          <div className="login-page__card">
            <div className="login-page__card-header">
              <h2 className="login-page__card-title">Login</h2>
              <p className="login-page__card-subtitle">
                {ssoToken
                  ? 'Login untuk melanjutkan ke aplikasi yang diminta.'
                  : 'Welcome back! Please enter your details'}
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
          </div>

          <p className="login-page__footer login-page__footer--mobile">
            <span className="login-page__footer-icon" aria-hidden="true">&copy;</span>
            <span>2026 PT. Pilar Niaga Makmur</span>
          </p>
        </div>
      </div>
    </section>
  )
}

export default LoginPage
