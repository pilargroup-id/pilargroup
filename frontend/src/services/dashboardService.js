import { ApiError, getToken } from '@/services/api'
import { canAccessProject } from '@/services/accessControl'
import { getProjects } from '@/services/master/getProjects'

const setupChecklist = [
  {
    title: 'Tiket masuk',
    description: 'Tampilkan tiket baru atau antrian issue harian agar tim bisa langsung melihat permintaan yang perlu direspons.',
  },
  {
    title: 'Eskalasi prioritas',
    description: 'Pisahkan issue yang butuh tindak lanjut cepat, koordinasi vendor, atau bantuan lintas tim supaya tidak tertahan di antrian umum.',
  },
  {
    title: 'SLA dan follow-up',
    description: 'Simpan ringkasan owner, status penanganan, dan target waktu agar progres helpdesk mudah dipantau dari satu layar.',
  },
]

function formatCount(value) {
  return String(value).padStart(2, '0')
}

function buildProjectLabel(project, index) {
  if (project.slug && project.slug !== 'no-slug') {
    return project.slug.toUpperCase()
  }

  return `PROJECT ${String(index + 1).padStart(2, '0')}`
}

function buildProjectDetail(project, hasAccess = true) {
  if (!hasAccess) {
    return 'Project tampil, tetapi akses run belum diberikan untuk akun Anda.'
  }

  if (project.descriptionRaw) {
    return project.description
  }

  if (project.urlRaw && project.isActive) {
    return 'Project URL is configured and ready to run.'
  }

  if (project.urlRaw) {
    return 'Project URL is configured but currently inactive.'
  }

  if (project.isActive) {
    return 'Project is active but URL is not configured yet.'
  }

  return 'Project is inactive and currently unavailable.'
}

function buildProjectUrl(projectUrl) {
  const baseOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost'

  try {
    return new URL(projectUrl, baseOrigin)
  } catch {
    throw new ApiError('URL project tidak valid.')
  }
}

function getProjectDisabledReason(project, hasAccess = true) {
  if (!hasAccess) {
    return 'Anda tidak memiliki akses ke project ini.'
  }

  if (!project?.isActive) {
    return 'Project inactive'
  }

  if (!project?.urlRaw) {
    return 'URL project belum tersedia'
  }

  return ''
}

export function getProjectLaunchUrl(project) {
  if (!canAccessProject(project)) {
    throw new ApiError('Anda tidak memiliki akses ke project ini.')
  }

  if (!project?.isActive) {
    throw new ApiError('Project ini sedang inactive dan tidak bisa dijalankan.')
  }

  if (!project?.urlRaw) {
    throw new ApiError('URL project belum tersedia.')
  }

  const token = getToken()

  if (!token) {
    throw new ApiError('Token login tidak ditemukan. Silakan login ulang.')
  }

  const launchUrl = buildProjectUrl(project.urlRaw)

  launchUrl.searchParams.set('token', token)
  launchUrl.searchParams.set('source', 'dashboard-it')

  if (project.slug && project.slug !== 'no-slug') {
    launchUrl.searchParams.set('project', project.slug)
  }

  return launchUrl.toString()
}

export function launchProject(project) {
  const launchUrl = getProjectLaunchUrl(project)

  if (typeof window !== 'undefined') {
    window.location.assign(launchUrl)
  }

  return launchUrl
}

export async function getDashboardProjects() {
  const projects = await getProjects()

  return projects
    .map((project, index) => {
      const hasAccess = canAccessProject(project)
      const isRunnable = hasAccess && project.isActive && Boolean(project.urlRaw)

      return {
        ...project,
        label: buildProjectLabel(project, index),
        value: project.name,
        hasAccess,
        isRunnable,
        disabledReason: getProjectDisabledReason(project, hasAccess),
        detail: buildProjectDetail(project, hasAccess),
        sortIndex: index,
      }
    })
    .sort((projectA, projectB) => {
      if (projectA.isRunnable === projectB.isRunnable) {
        return projectA.sortIndex - projectB.sortIndex
      }

      return projectA.isRunnable ? -1 : 1
    })
    .map(({ sortIndex, ...project }) => project)
}

export async function getDashboardSummary() {
  const projects = await getProjects()
  const launchableProjectsCount = projects.filter(
    (project) =>
      canAccessProject(project) && project.isActive && Boolean(project.urlRaw),
  ).length
  const projectLinksCount = projects.filter((project) => project.urlRaw).length
  const inactiveProjectsCount = projects.filter((project) => !project.isActive).length

  return [
    {
      label: 'Projects',
      value: formatCount(projects.length),
      change: `${launchableProjectsCount} siap dibuka`,
      tone: 'positive',
    },
    {
      label: 'Links',
      value: formatCount(projectLinksCount),
      change: 'URL project tersedia',
      tone: 'warning',
    },
    {
      label: 'Alerts',
      value: formatCount(inactiveProjectsCount),
      change: 'project inactive',
      tone: 'negative',
    },
  ]
}

export function getSetupChecklist() {
  return setupChecklist
}

export function getLastUpdatedAt() {
  return new Date()
}
