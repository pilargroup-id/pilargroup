import { ApiError, getToken } from '@/services/api'
import { canAccessProject } from '@/services/accessControl'
import { getProjects } from '@/services/master/getProjects'
import {
  hideProjectLaunchScreen,
  showProjectLaunchScreen,
} from '@/services/projectLaunchOverlay'

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

let isProjectLaunchInProgress = false

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
    return 'Silakan hubungi IT untuk membuka akses ke menu ini'
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

export async function getProjectLaunchUrl(project) {
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

  // Project yang pakai SSO flow (punya sso_client)
  const SSO_PROJECTS = ['ticket'] // tambah slug lain di sini kalau nanti ada

if (SSO_PROJECTS.includes(project.slug)) {
    const projectOrigin = new URL(project.urlRaw).origin

    // Hit ticket API untuk generate state
    const ssoUrlRes = await fetch(`${projectOrigin}/api/auth/sso-url`)
    if (!ssoUrlRes.ok) throw new ApiError('Gagal generate SSO URL.')

    const { url } = await ssoUrlRes.json()

    // url sudah berisi full /sso/authorize URL dari ticket
    // Tapi kita perlu hit pilargroup /api/sso/authorize dengan token
    // Jadi kita parse state dari url yang dikembalikan ticket
    const ticketUrl    = new URL(url)
    const state        = ticketUrl.searchParams.get('state')
    const redirectUri  = ticketUrl.searchParams.get('redirect_uri')

    const params = new URLSearchParams({
        client_id:    project.slug,
        redirect_uri: redirectUri,
        state,
    })

    const res = await fetch(`/api/sso/authorize?${params}`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept':        'application/json',
        },
    })

    if (!res.ok) {
        const data = await res.json()
        throw new ApiError(data.message || 'SSO gagal.')
    }

    const data = await res.json()
    window.location.assign(data.redirect_url)
    return
}

  // Flow lama — project yang terima JWT langsung (treeview, touchpoint, dll)
  const launchUrl = buildProjectUrl(project.urlRaw)
  launchUrl.searchParams.set('token',   token)
  launchUrl.searchParams.set('source',  'dashboard-it')

  if (project.slug && project.slug !== 'no-slug') {
    launchUrl.searchParams.set('project', project.slug)
  }

  return launchUrl.toString()
}

export async function launchProject(project) {
  if (isProjectLaunchInProgress) {
    return
  }

  const SSO_PROJECTS = ['ticket']

  const token = getToken()
  if (!token) throw new ApiError('Token login tidak ditemukan. Silakan login ulang.')

  if (!canAccessProject(project)) throw new ApiError('Anda tidak memiliki akses ke project ini.')
  if (!project?.isActive) throw new ApiError('Project ini sedang inactive dan tidak bisa dijalankan.')
  if (!project?.urlRaw) throw new ApiError('URL project belum tersedia.')

  isProjectLaunchInProgress = true

  try {
    await showProjectLaunchScreen(project?.name ?? project?.value)

    if (SSO_PROJECTS.includes(project.slug)) {
      const projectOrigin = new URL(project.urlRaw).origin

      // Hit ticket untuk generate & simpan state
      const ssoUrlRes = await fetch(`${projectOrigin}/api/auth/sso-url`)
      if (!ssoUrlRes.ok) throw new ApiError('Gagal generate SSO URL.')

      const { state, redirect_uri } = await ssoUrlRes.json()

      const params = new URLSearchParams({
        client_id: project.slug,
        redirect_uri,
        state,
      })

      const res = await fetch(`/api/sso/authorize?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new ApiError(data.message || 'SSO gagal.')
      }

      const data = await res.json()
      window.location.assign(data.redirect_url)
      return
    }

    const launchUrl = buildProjectUrl(project.urlRaw)
    launchUrl.searchParams.set('token', token)
    launchUrl.searchParams.set('source', 'dashboard-it')

    if (project.slug && project.slug !== 'no-slug') {
      launchUrl.searchParams.set('project', project.slug)
    }

    window.location.assign(launchUrl.toString())
  } catch (error) {
    isProjectLaunchInProgress = false
    hideProjectLaunchScreen()
    throw error
  }
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
