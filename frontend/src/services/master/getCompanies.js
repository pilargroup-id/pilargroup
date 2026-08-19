import api from '@/services/api'

const COMPANIES_PATH = '/master/companies'
const relativeTimeFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null

function getCompaniesCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.companies)) {
    return payload.companies
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

  return false
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

export function normalizeCompany(rawCompany = {}) {
  const companyId =
    normalizeOptionalText(rawCompany.id) ??
    normalizeOptionalText(rawCompany.name) ??
    'unknown-company'

  return {
    companyId,
    id: normalizeText(rawCompany.id),
    name: normalizeText(rawCompany.name, 'Untitled Company'),
    code: normalizeText(rawCompany.code, ''),
    isActive: parseBoolean(rawCompany.is_active ?? true),
    updatedAt: formatTimestamp(rawCompany.updated_at ?? rawCompany.updatedAt),
    createdAt: formatTimestamp(rawCompany.created_at ?? rawCompany.createdAt),
    raw: rawCompany,
  }
}

export function normalizeCompanies(payload) {
  return getCompaniesCollection(payload).map((company) => normalizeCompany(company))
}

export async function getCompanies(params) {
  const payload = await api.request(COMPANIES_PATH, { params })

  return normalizeCompanies(payload)
}

export async function createCompany(payload) {
  return api.request(COMPANIES_PATH, {
    method: 'POST',
    body: payload,
  })
}

export async function updateCompany(id, payload) {
  return api.request(`${COMPANIES_PATH}/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function deleteCompany(id) {
  return api.request(`${COMPANIES_PATH}/${id}`, {
    method: 'DELETE',
  })
}

const companiesService = {
  getCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
  normalizeCompany,
  normalizeCompanies,
}

export default companiesService
