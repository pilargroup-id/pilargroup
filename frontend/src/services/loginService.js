import api, { ApiError } from '@/services/api'

function normalizeCredentials(credentials = {}) {
  const payload = {
    username: String(credentials.username ?? '').trim(),
    password: String(credentials.password ?? ''),
  }

  if (credentials.sso_token) {
    payload.sso_token = String(credentials.sso_token)
  }

  return payload
}

export function validateCredentials({ username, password }) {
  const errors = {}

  if (!username) {
    errors.username = 'Username wajib diisi.'
  } else if (username.length > 255) {
    errors.username = 'Username maksimal 255 karakter.'
  }

  if (!password) {
    errors.password = 'Password wajib diisi.'
  }

  return errors
}

export async function submitLogin(credentials = {}) {
  const payload = normalizeCredentials(credentials)
  const errors  = validateCredentials(payload)

  if (Object.keys(errors).length > 0) {
    throw new ApiError(Object.values(errors)[0], {
      status: 422,
      data: {
        errors: Object.fromEntries(
          Object.entries(errors).map(([field, message]) => [field, [message]]),
        ),
      },
    })
  }

  const session = await api.auth.login(payload)

  return {
    token:    session?.token    ?? null,
    user:     session?.user     ?? null,
    redirect: session?.redirect ?? null,
  }
}

const loginService = { submitLogin }

export default loginService