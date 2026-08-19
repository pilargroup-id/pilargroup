import api from '@/services/api'

const BUSINESS_UNITS_PATH = '/master/business-units'
const relativeTimeFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null

function getBusinessUnitsCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.business_units)) {
    return payload.business_units
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

export function normalizeBusinessUnitDepartment(rawDepartment = {}) {
  return {
    pivotId: normalizeOptionalText(rawDepartment.pivot_id),
    id: normalizeOptionalText(rawDepartment.id),
    name: normalizeText(rawDepartment.name, 'Untitled Department'),
    code: normalizeText(rawDepartment.code, ''),
    companyId: normalizeOptionalText(rawDepartment.company_id),
    isPrimary: parseBoolean(rawDepartment.is_primary),
    isActive: parseBoolean(rawDepartment.is_active ?? true),
    raw: rawDepartment,
  }
}

export function normalizeBusinessUnit(rawBusinessUnit = {}) {
  const businessUnitId =
    normalizeOptionalText(rawBusinessUnit.id) ?? 'unknown-business-unit'
  const departments = Array.isArray(rawBusinessUnit.departments)
    ? rawBusinessUnit.departments.map(normalizeBusinessUnitDepartment)
    : []

  return {
    businessUnitId,
    id: normalizeText(rawBusinessUnit.id),
    name: normalizeText(rawBusinessUnit.name, 'Untitled Business Unit'),
    code: normalizeText(rawBusinessUnit.code, ''),
    companyId: normalizeOptionalText(rawBusinessUnit.company_id) ?? '',
    companyCode: normalizeText(rawBusinessUnit.company_code, ''),
    companyName: normalizeText(rawBusinessUnit.company_name, '-'),
    isActive: parseBoolean(rawBusinessUnit.is_active ?? true),
    departments,
    updatedAt: formatTimestamp(rawBusinessUnit.updated_at ?? rawBusinessUnit.updatedAt),
    createdAt: formatTimestamp(rawBusinessUnit.created_at ?? rawBusinessUnit.createdAt),
    raw: rawBusinessUnit,
  }
}

export function normalizeBusinessUnits(payload) {
  return getBusinessUnitsCollection(payload).map((businessUnit) =>
    normalizeBusinessUnit(businessUnit),
  )
}

export async function getBusinessUnits(params) {
  const payload = await api.request(BUSINESS_UNITS_PATH, { params })

  return normalizeBusinessUnits(payload)
}

export async function getBusinessUnitById(id) {
  const payload = await api.request(`${BUSINESS_UNITS_PATH}/${id}`)
  const data = payload?.data ?? payload

  return normalizeBusinessUnit(data)
}

export async function createBusinessUnit(payload) {
  return api.request(BUSINESS_UNITS_PATH, {
    method: 'POST',
    body: payload,
  })
}

export async function updateBusinessUnit(id, payload) {
  return api.request(`${BUSINESS_UNITS_PATH}/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function toggleBusinessUnitStatus(id, isActive) {
  return api.request(`${BUSINESS_UNITS_PATH}/${id}/status`, {
    method: 'PATCH',
    body: { is_active: isActive },
  })
}

export async function deleteBusinessUnit(id) {
  return api.request(`${BUSINESS_UNITS_PATH}/${id}`, {
    method: 'DELETE',
  })
}

const businessUnitsService = {
  getBusinessUnits,
  getBusinessUnitById,
  createBusinessUnit,
  updateBusinessUnit,
  toggleBusinessUnitStatus,
  deleteBusinessUnit,
  normalizeBusinessUnit,
  normalizeBusinessUnits,
  normalizeBusinessUnitDepartment,
}

export default businessUnitsService
