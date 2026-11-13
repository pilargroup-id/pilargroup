import { useEffect, useRef, useState } from 'react'
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

const NO_FIELD_ERRORS = { username: '', password: '' }

function resolveLoginError(error) {
  const apiErrors = error?.data?.errors

  if (error?.status === 422 && apiErrors) {
    const fieldErrors = {
      username: apiErrors.username?.[0] ?? '',
      password: apiErrors.password?.[0] ?? '',
    }

    if (fieldErrors.username || fieldErrors.password) {
      return { fieldErrors, formError: '' }
    }
  }

  let formError = error?.message || 'Login gagal. Silakan coba lagi.'

  if (error instanceof TypeError) {
    // fetch() melempar TypeError saat server tidak bisa dihubungi
    formError = 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.'
  } else if (error?.status >= 500) {
    formError = 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.'
  }

  return { fieldErrors: NO_FIELD_ERRORS, formError }
}

function LoginPage() {
  const [username, setUsername]         = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors]   = useState(NO_FIELD_ERRORS)
  const [formError, setFormError]       = useState('')

  const usernameRef = useRef(null)
  const passwordRef = useRef(null)

  const params   = new URLSearchParams(window.location.search)
  const ssoToken = params.get('sso_token')

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Login | Pilargroup'
    return () => { document.title = previousTitle }
  }, [])

const handleSubmit = async (event) => {
  event.preventDefault()
  if (isSubmitting) return

  setFieldErrors(NO_FIELD_ERRORS)
  setFormError('')
  setIsSubmitting(true)

  try {
    const loginPayload = ssoToken
      ? { username, password, sso_token: ssoToken }
      : { username, password }

    const { token, redirect } = await submitLogin(loginPayload)

    // Ganti nama 'params' jadi 'urlParams' supaya tidak clash
    const urlParams  = new URLSearchParams(window.location.search)
    const samlToken  = urlParams.get('saml_token')

    // 1. SAML flow
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

    // 2. SSO redirect
    if (redirect) {
      window.location.href = redirect
      return
    }

    // 3. SSO Authorize
    const ssoAuthorize = urlParams.get('sso_authorize')
    const clientId     = urlParams.get('client_id')
    const redirectUri  = urlParams.get('redirect_uri')
    const ssoState     = urlParams.get('state')

    if (ssoAuthorize && clientId && redirectUri && ssoState && token) {
      try {
        const ssoParams = new URLSearchParams({
          client_id:    clientId,
          redirect_uri: redirectUri,
          state:        ssoState,
        })

        const res = await fetch(`/api/sso/authorize?${ssoParams}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          }
        })

        if (res.ok) {
          const data = await res.json()
          window.location.href = data.redirect_url
          return
        }
      } catch {
        // fallback ke dashboard
      }
    }

    // 4. return_url
    const returnUrl = urlParams.get('return_url')

    if (returnUrl && token) {
      try {
        const target = new URL(returnUrl)
        if (target.hostname.endsWith('pilargroup.id')) {
          target.searchParams.set('token', token)
          window.location.href = target.toString()
          return
        }
      } catch {
        // fallback ke dashboard
      }
    }

    // 5. Login normal
    window.history.replaceState({}, '', defaultNavigationPath)
    window.dispatchEvent(new PopStateEvent('popstate'))

  } catch (error) {
    const { fieldErrors: nextFieldErrors, formError: nextFormError } = resolveLoginError(error)

    setFieldErrors(nextFieldErrors)
    setFormError(nextFormError)

    if (nextFieldErrors.username) {
      usernameRef.current?.focus()
      usernameRef.current?.select()
    } else if (nextFieldErrors.password) {
      // Password salah → kosongkan supaya user langsung ketik ulang
      if (password) setPassword('')
      passwordRef.current?.focus()
    }
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

            <form className="login-page__form" onSubmit={handleSubmit} noValidate>
              <div className="login-page__field">
                <label className="login-page__label" htmlFor="login-username">Username *</label>
                <span
                  className={`login-page__input-shell${fieldErrors.username ? ' login-page__input-shell--invalid' : ''}`}
                >
                  <UserCircle className="login-page__input-icon" size={20} />
                  <input
                    id="login-username"
                    ref={usernameRef}
                    className="login-page__input"
                    type="text"
                    value={username}
                    onChange={(event) => {
                      setUsername(event.target.value)
                      setFieldErrors((current) => ({ ...current, username: '' }))
                      setFormError('')
                    }}
                    placeholder="Enter your username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    maxLength={255}
                    readOnly={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.username)}
                    aria-describedby={fieldErrors.username ? 'login-username-error' : undefined}
                  />
                </span>
                {fieldErrors.username ? (
                  <p id="login-username-error" className="login-page__field-error" role="alert">
                    {fieldErrors.username}
                  </p>
                ) : null}
              </div>

              <div className="login-page__field">
                <label className="login-page__label" htmlFor="login-password">Password *</label>
                <span
                  className={`login-page__input-shell${fieldErrors.password ? ' login-page__input-shell--invalid' : ''}`}
                >
                  <LockKeyholeCircle className="login-page__input-icon" size={20} />
                  <input
                    id="login-password"
                    ref={passwordRef}
                    className="login-page__input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value)
                      setFieldErrors((current) => ({ ...current, password: '' }))
                      setFormError('')
                    }}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    readOnly={isSubmitting}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
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
                {fieldErrors.password ? (
                  <p id="login-password-error" className="login-page__field-error" role="alert">
                    {fieldErrors.password}
                  </p>
                ) : null}
              </div>

              {formError ? <p className="login-page__alert" role="alert">{formError}</p> : null}

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
