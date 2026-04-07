import api from '@/services/api'

const PROJECTS_PATH = '/master/projects'
const relativeTimeFormatter =
  typeof Intl !== 'undefined'
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null

function getProjectsCollection(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (Array.isArray(payload?.data)) {
    return payload.data
  }

  if (Array.isArray(payload?.projects)) {
    return payload.projects
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

export function normalizeProject(rawProject = {}) {
  const isActive = parseBoolean(rawProject.is_active ?? rawProject.isActive)

  return {
    projectId:
      normalizeOptionalText(rawProject.id) ??
      normalizeOptionalText(rawProject.slug) ??
      normalizeOptionalText(rawProject.name) ??
      'unknown-project',
    id: normalizeText(rawProject.id),
    name: normalizeText(rawProject.name, 'Untitled Project'),
    slug: normalizeText(rawProject.slug, 'no-slug'),
    url: normalizeText(rawProject.url, 'URL belum tersedia'),
    urlRaw: normalizeOptionalText(rawProject.url),
    description: normalizeText(rawProject.description, 'Belum ada deskripsi untuk project ini.'),
    descriptionRaw: normalizeOptionalText(rawProject.description),
    isActive: isActive !== false,
    status: isActive !== false ? 'Active' : 'Inactive',
    statusKey: isActive !== false ? 'active' : 'draft',
    updatedAt: formatTimestamp(rawProject.updated_at ?? rawProject.updatedAt),
    createdAt: formatTimestamp(rawProject.created_at ?? rawProject.createdAt),
    raw: rawProject,
  }
}

export function normalizeProjects(payload) {
  return getProjectsCollection(payload).map((project) => normalizeProject(project))
}

export async function getProjects(params) {
  const requestParams = {
    limit: -1, // Request all projects
    ...params
  }
  const payload = await api.request(PROJECTS_PATH, { params: requestParams })

  return normalizeProjects(payload)
}

export async function createProject(payload) {
  return api.request(PROJECTS_PATH, {
    method: 'POST',
    body: payload,
  })
}

export async function updateProject(id, payload) {
  return api.request(`${PROJECTS_PATH}/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export async function deleteProject(id) {
  return api.request(`${PROJECTS_PATH}/${id}`, {
    method: 'DELETE',
  })
}

const projectsService = {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  normalizeProject,
  normalizeProjects,
}

export default projectsService
