import api from '@/services/api'

const JOB_LEVELS_PATH = '/master/job-levels'
const relativeTimeFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null

function getJobLevelsCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.job_levels)) {
    return payload.job_levels
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

export function normalizeJobLevel(rawJobLevel = {}) {
  const jobLevelId =
    normalizeOptionalText(rawJobLevel.id) ??
    normalizeOptionalText(rawJobLevel.job_level_id ?? rawJobLevel.jobLevelId) ??
    normalizeOptionalText(rawJobLevel.name) ??
    'unknown-job-level'

  const levelValue = Number(rawJobLevel.level)

  return {
    jobLevelId,
    id: normalizeText(rawJobLevel.id ?? rawJobLevel.job_level_id ?? rawJobLevel.jobLevelId),
    name: normalizeText(rawJobLevel.name, 'Untitled Job Level'),
    level: Number.isFinite(levelValue) ? levelValue : 0,
    updatedAt: formatTimestamp(rawJobLevel.updated_at ?? rawJobLevel.updatedAt),
    createdAt: formatTimestamp(rawJobLevel.created_at ?? rawJobLevel.createdAt),
    raw: rawJobLevel,
  }
}

export function normalizeJobLevels(payload) {
  return getJobLevelsCollection(payload).map((jobLevel) => normalizeJobLevel(jobLevel))
}

export async function getJobLevels(params) {
  const payload = await api.request(JOB_LEVELS_PATH, { params })

  return normalizeJobLevels(payload)
}

export async function createJobLevel(payload) {
  return api.request(JOB_LEVELS_PATH, {
    method: 'POST',
    body: payload,
  })
}

export async function updateJobLevel(id, payload) {
  return api.request(`${JOB_LEVELS_PATH}/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function deleteJobLevel(id) {
  return api.request(`${JOB_LEVELS_PATH}/${id}`, {
    method: 'DELETE',
  })
}

const jobLevelsService = {
  getJobLevels,
  createJobLevel,
  updateJobLevel,
  deleteJobLevel,
  normalizeJobLevel,
  normalizeJobLevels,
}

export default jobLevelsService
