import api from '@/services/api'

const DEPARTMENTS_PATH = '/master/departments'
const relativeTimeFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null

function getDepartmentsCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.departments)) {
    return payload.departments
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

function parseDate(value) {
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

function formatTimestamp(value) {
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

export function normalizeDepartment(rawDepartment = {}) {
  const departmentId =
    normalizeOptionalText(rawDepartment.id) ??
    normalizeOptionalText(rawDepartment.department_id ?? rawDepartment.departmentId) ??
    normalizeOptionalText(rawDepartment.name) ??
    'unknown-department'

  return {
    departmentId,
    id: normalizeText(rawDepartment.id ?? rawDepartment.department_id ?? rawDepartment.departmentId),
    name: normalizeText(
      rawDepartment.name ?? rawDepartment.department ?? rawDepartment.department_name,
      'Untitled Department',
    ),
    code: normalizeText(rawDepartment.code, ''),
    companyName: normalizeText(rawDepartment.company_name, '-'),
    companyId: normalizeText(rawDepartment.company_id, ''),
    updatedAt: formatTimestamp(rawDepartment.updated_at ?? rawDepartment.updatedAt),
    createdAt: formatTimestamp(rawDepartment.created_at ?? rawDepartment.createdAt),
    raw: rawDepartment,
  }
}

export function normalizeDepartments(payload) {
  return getDepartmentsCollection(payload).map((department) =>
    normalizeDepartment(department),
  )
}

export async function getDepartments(params) {
  const payload = await api.request(DEPARTMENTS_PATH, { params })

  return normalizeDepartments(payload)
}

export async function createDepartment(payload) {
  return api.request(DEPARTMENTS_PATH, {
    method: 'POST',
    body: payload,
  })
}

export async function updateDepartment(id, payload) {
  return api.request(`${DEPARTMENTS_PATH}/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function deleteDepartment(id) {
  return api.request(`${DEPARTMENTS_PATH}/${id}`, {
    method: 'DELETE',
  })
}

export const normalizeDepartement = normalizeDepartment
export const normalizeDepartements = normalizeDepartments
export const getDepartements = getDepartments
export const createDepartement = createDepartment
export const updateDepartement = updateDepartment
export const deleteDepartement = deleteDepartment

const departmentsService = {
  getDepartments,
  getDepartements,
  createDepartment,
  createDepartement,
  updateDepartment,
  updateDepartement,
  deleteDepartment,
  deleteDepartement,
  normalizeDepartment,
  normalizeDepartement,
  normalizeDepartments,
  normalizeDepartements,
}

export default departmentsService
