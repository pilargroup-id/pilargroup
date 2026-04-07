import api from '@/services/api'

const USERS_PATH = '/users'
const relativeTimeFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null

function getUsersCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.users)) {
    return payload.users
  }

  return []
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null
  }

  const normalizedValue = String(value).trim()

  return normalizedValue || null
}

function normalizeText(value, fallback = '-') {
  return normalizeOptionalText(value) ?? fallback
}

function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'number') {
    return value === 1
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase()

    if (['1', 'true', 'active', 'yes'].includes(normalizedValue)) {
      return true
    }

    if (['0', 'false', 'inactive', 'no'].includes(normalizedValue)) {
      return false
    }
  }

  return null
}

function normalizeStatus(rawUser = {}) {
  const rawStatus = normalizeOptionalText(rawUser.status ?? rawUser.state)

  if (rawStatus) {
    const normalizedStatus = rawStatus.toLowerCase().replace(/\s+/g, '-')

    return {
      label:
        normalizedStatus === 'active'
          ? 'Active'
          : normalizedStatus === 'inactive'
            ? 'Inactive'
            : normalizedStatus === 'pending'
              ? 'Pending'
              : rawStatus,
      key: normalizedStatus,
    }
  }

  const isActive = parseBoolean(rawUser.is_active ?? rawUser.isActive)

  if (isActive === null) {
    return {
      label: 'Inactive',
      key: 'inactive',
    }
  }

  return isActive
    ? {
        label: 'Active',
        key: 'active',
      }
    : {
        label: 'Inactive',
        key: 'inactive',
      }
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  const normalizedValue = normalizeOptionalText(value)

  if (!normalizedValue) {
    return null
  }

  const isoLikeValue = normalizedValue.includes('T')
    ? normalizedValue
    : normalizedValue.replace(' ', 'T')
  const date = new Date(isoLikeValue)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function formatLastActive(value) {
  const date = parseDate(value)

  if (!date) {
    return '-'
  }

  const diffInSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const absoluteDiffInSeconds = Math.abs(diffInSeconds)

  if (absoluteDiffInSeconds < 60) {
    return 'Just now'
  }

  if (relativeTimeFormatter) {
    if (absoluteDiffInSeconds < 60 * 60) {
      return relativeTimeFormatter.format(Math.round(diffInSeconds / 60), 'minute')
    }

    if (absoluteDiffInSeconds < 60 * 60 * 24) {
      return relativeTimeFormatter.format(Math.round(diffInSeconds / (60 * 60)), 'hour')
    }

    if (absoluteDiffInSeconds < 60 * 60 * 24 * 7) {
      return relativeTimeFormatter.format(
        Math.round(diffInSeconds / (60 * 60 * 24)),
        'day',
      )
    }
  }

  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function normalizeRole(rawUser = {}) {
  const jobPosition = normalizeOptionalText(rawUser.job_position ?? rawUser.jobPosition)
  const jobLevel = normalizeOptionalText(rawUser.job_level ?? rawUser.jobLevel)
  const fallbackRole = normalizeOptionalText(rawUser.role ?? rawUser.position)

  if (jobPosition && jobLevel) {
    return `${jobPosition} (${jobLevel})`
  }

  return jobPosition ?? jobLevel ?? fallbackRole ?? '-'
}

function normalizeReference(rawUser = {}) {
  const internalId = normalizeOptionalText(rawUser.internal_id ?? rawUser.internalId)

  if (internalId) {
    return `ID ${internalId}`
  }

  return (
    normalizeOptionalText(rawUser.username) ??
    normalizeOptionalText(rawUser.id) ??
    normalizeOptionalText(rawUser.email) ??
    '-'
  )
}

function normalizeManagedUserApp(app) {
  if (typeof app === 'string' || typeof app === 'number') {
    return normalizeOptionalText(app)
  }

  if (!app || typeof app !== 'object') {
    return null
  }

  return (
    normalizeOptionalText(app.slug ?? app.project_slug ?? app.projectSlug) ??
    normalizeOptionalText(app.name ?? app.project_name ?? app.projectName) ??
    normalizeOptionalText(app.id ?? app.project_id ?? app.projectId)
  )
}

function normalizeLookupValue(value) {
  const normalizedValue = normalizeOptionalText(value)

  return normalizedValue ? normalizedValue.toLowerCase() : null
}

export function normalizeManagedUserApps(apps) {
  if (!Array.isArray(apps)) {
    return []
  }

  return Array.from(
    new Set(apps.map((app) => normalizeManagedUserApp(app)).filter(Boolean)),
  )
}

export function resolveManagedUserApps(apps, projects = []) {
  const normalizedApps = normalizeManagedUserApps(apps)

  if (normalizedApps.length === 0 || !Array.isArray(projects) || projects.length === 0) {
    return normalizedApps
  }

  return Array.from(
    new Set(
      normalizedApps
        .map((app) => {
          const normalizedApp = normalizeLookupValue(app)

          if (!normalizedApp) {
            return null
          }

          const matchedProject = projects.find((project) => {
            const projectLookupValues = [
              project?.slug,
              project?.name,
              project?.id,
              project?.projectId,
              project?.raw?.slug,
              project?.raw?.name,
              project?.raw?.id,
            ]
              .map((value) => normalizeLookupValue(value))
              .filter(Boolean)

            return projectLookupValues.includes(normalizedApp)
          })

          return normalizeOptionalText(matchedProject?.slug ?? matchedProject?.raw?.slug) ?? app
        })
        .filter(Boolean),
    ),
  )
}

export function normalizeManagedUser(rawUser = {}) {
  const normalizedStatus = normalizeStatus(rawUser)

  return {
    userId:
      normalizeOptionalText(rawUser.id) ??
      normalizeOptionalText(rawUser.username) ??
      normalizeOptionalText(rawUser.internal_id ?? rawUser.internalId) ??
      normalizeOptionalText(rawUser.email) ??
      normalizeOptionalText(rawUser.name) ??
      'unknown-user',
    id: normalizeReference(rawUser),
    name: normalizeText(
      rawUser.name ?? rawUser.full_name ?? rawUser.fullName ?? rawUser.username,
    ),
    email: normalizeText(rawUser.email),
    division: normalizeText(
      rawUser.department ??
        rawUser.department_name ??
        rawUser.departmentName ??
        rawUser.division,
    ),
    role: normalizeRole(rawUser),
    status: normalizedStatus.label,
    statusKey: normalizedStatus.key,
    apps: normalizeManagedUserApps(rawUser.apps),
    lastActive: formatLastActive(
      rawUser.last_active ??
        rawUser.lastActive ??
        rawUser.last_login_at ??
        rawUser.lastLoginAt ??
        rawUser.updated_at ??
        rawUser.updatedAt ??
        rawUser.created_at ??
        rawUser.createdAt,
    ),
    raw: rawUser,
  }
}

export function normalizeManagedUsers(payload) {
  return getUsersCollection(payload).map((user) => normalizeManagedUser(user))
}

export async function getManagedUsers(params) {
  // `api.js` prepends `/api`, so this resolves to `/api/users`.
  const payload = await api.request(USERS_PATH, { params })

  return normalizeManagedUsers(payload)
}

export async function getManagedUserById(id) {
  const payload = await api.request(`${USERS_PATH}/${id}`)

  return normalizeManagedUser(payload)
}

export async function registerUser(userData) {
  const payload = await api.request(USERS_PATH, {
    method: 'POST',
    body: userData,
  })

  return payload
}

export async function updateManagedUser(id, userData) {
  const payload = await api.request(`${USERS_PATH}/${id}`, {
    method: 'PUT',
    body: userData,
  })

  return payload
}

export async function deleteManagedUser(id) {
  const payload = await api.request(`${USERS_PATH}/${id}`, {
    method: 'DELETE',
  })

  return payload
}

const manageUsersService = {
  getUsers: getManagedUsers,
  getUserById: getManagedUserById,
  registerUser,
  updateUser: updateManagedUser,
  deleteUser: deleteManagedUser,
  normalizeUser: normalizeManagedUser,
  normalizeUsers: normalizeManagedUsers,
  normalizeUserApps: normalizeManagedUserApps,
  resolveUserApps: resolveManagedUserApps,
}

export default manageUsersService
