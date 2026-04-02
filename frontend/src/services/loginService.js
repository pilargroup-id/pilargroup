import api, { ApiError } from '@/services/api'

function normalizeCredentials(credentials = {}) {
  return {
    username: String(credentials.username ?? '').trim(),
    password: String(credentials.password ?? ''),
  }
}

export async function submitLogin(credentials = {}) {
  const payload = normalizeCredentials(credentials)

  if (!payload.username) {
    throw new ApiError('Username wajib diisi.')
  }

  if (!payload.password) {
    throw new ApiError('Password wajib diisi.')
  }

  const session = await api.auth.login(payload)

  return {
    token: session?.token ?? null,
    user: session?.user ?? null,
  }
}

const loginService = {
  submitLogin,
}

export default loginService
