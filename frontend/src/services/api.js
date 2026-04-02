const DEFAULT_API_BASE_URL = '/api'

export const TOKEN_STORAGE_KEY = 'token'
export const USER_STORAGE_KEY = 'auth_user'

export const API_BASE_URL = normalizeBaseUrl(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
)

export class ApiError extends Error {
  constructor(message, { status, data, url } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.url = url
  }
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || DEFAULT_API_BASE_URL).trim().replace(/\/+$/, '')
}

function normalizePath(path) {
  if (!path) {
    return ''
  }

  return path.startsWith('/') ? path : `/${path}`
}

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStorage(key) {
  if (!canUseStorage()) {
    return null
  }

  return window.localStorage.getItem(key)
}

function writeStorage(key, value) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.setItem(key, value)
}

function removeStorage(key) {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(key)
}

function parseStoredJson(value) {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function buildQueryString(params) {
  if (!params || typeof params !== 'object') {
    return ''
  }

  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null && entry !== '') {
          searchParams.append(key, entry)
        }
      })
      return
    }

    searchParams.append(key, value)
  })

  const queryString = searchParams.toString()

  return queryString ? `?${queryString}` : ''
}

function buildApiUrl(path, params) {
  const normalizedPath = normalizePath(path)
  return `${API_BASE_URL}${normalizedPath}${buildQueryString(params)}`
}

function getErrorMessage(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (typeof payload.message === 'string' && payload.message.trim()) {
    return payload.message
  }

  if (payload.errors && typeof payload.errors === 'object') {
    const firstError = Object.values(payload.errors).flat().find(Boolean)

    if (typeof firstError === 'string' && firstError.trim()) {
      return firstError
    }
  }

  return fallbackMessage
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export function getToken() {
  return readStorage(TOKEN_STORAGE_KEY)
}

export function setToken(token) {
  if (!token) {
    removeStorage(TOKEN_STORAGE_KEY)
    return
  }

  writeStorage(TOKEN_STORAGE_KEY, token)
}

export function getStoredUser() {
  return parseStoredJson(readStorage(USER_STORAGE_KEY))
}

export function setStoredUser(user) {
  if (!user) {
    removeStorage(USER_STORAGE_KEY)
    return
  }

  writeStorage(USER_STORAGE_KEY, JSON.stringify(user))
}

export function setAuthSession({ token, user } = {}) {
  setToken(token)
  setStoredUser(user)
}

export function clearAuthSession() {
  removeStorage(TOKEN_STORAGE_KEY)
  removeStorage(USER_STORAGE_KEY)
}

export function isAuthenticated() {
  return Boolean(getToken())
}

export async function apiRequest(
  path,
  {
    method = 'GET',
    body,
    headers = {},
    params,
    authenticated = true,
    ...options
  } = {},
) {
  const requestHeaders = new Headers(headers)

  if (!requestHeaders.has('Accept')) {
    requestHeaders.set('Accept', 'application/json')
  }

  if (authenticated) {
    const token = getToken()

    if (token && !requestHeaders.has('Authorization')) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  let requestBody = body

  if (body !== undefined && body !== null && !isFormData(body)) {
    if (!requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json')
    }

    if (
      requestHeaders.get('Content-Type')?.includes('application/json') &&
      typeof body !== 'string'
    ) {
      requestBody = JSON.stringify(body)
    }
  }

  const url = buildApiUrl(path, params)
  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: requestBody,
    ...options,
  })
  const data = await parseResponseBody(response)

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthSession()
    }

    throw new ApiError(
      getErrorMessage(data, `Request failed with status ${response.status}`),
      {
        status: response.status,
        data,
        url,
      },
    )
  }

  return data
}

export async function login(credentials) {
  const data = await apiRequest('/auth/login', {
    method: 'POST',
    body: credentials,
    authenticated: false,
  })

  setAuthSession(data)

  return data
}

export async function logout() {
  try {
    if (!getToken()) {
      return null
    }

    return await apiRequest('/auth/logout', {
      method: 'POST',
    })
  } finally {
    clearAuthSession()
  }
}

export async function getCurrentUser() {
  const user = await apiRequest('/auth/me')
  setStoredUser(user)
  return user
}

export async function changeProfile(payload) {
  return apiRequest('/auth/change-profile', {
    method: 'PUT',
    body: payload,
  })
}

export async function getUsers(params) {
  return apiRequest('/users', { params })
}

export async function getUserById(id) {
  return apiRequest(`/users/${id}`)
}

export async function createUser(payload) {
  return apiRequest('/users', {
    method: 'POST',
    body: payload,
  })
}

export async function updateUser(id, payload) {
  return apiRequest(`/users/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export const authApi = {
  login,
  logout,
  getCurrentUser,
  changeProfile,
  getToken,
  setToken,
  getStoredUser,
  setStoredUser,
  setAuthSession,
  clearAuthSession,
  isAuthenticated,
}

export const usersApi = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
}

const api = {
  request: apiRequest,
  auth: authApi,
  users: usersApi,
}

export default api
