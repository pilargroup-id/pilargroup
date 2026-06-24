import {
  defaultNavigationPath,
  implementedNavigationPaths,
  primaryNavigationItems,
  secondaryNavigationItems,
} from '@/constants/navigation'
import { getStoredUser } from '@/services/api'

const HCGA_DEPARTMENT_ID = 1
const IT_DEPARTMENT_ID = 8
const ADMIN_HUMAN_CAPITAL_POSITION = 'Admin Human Capital'
const IT_DEPARTMENT_ALIASES = [
  'it',
  'information technology',
  'department it',
  'departement it',
  'it department',
]
const HCGA_DEPARTMENT_ALIASES = [
  'hcga',
  'human capital',
  'human capital general affairs',
  'admin human capital',
]
const LOGOUT_PATH = '/logout'
const USER_MANAGEMENT_PATH = '/users'

function normalizeText(value) {
  return String(value ?? '').trim()
}

function normalizeSlug(value) {
  return normalizeText(value).toLowerCase()
}

function normalizeDepartmentList(user) {
  const sourceDepartments = []

  if (Array.isArray(user.departments)) {
    sourceDepartments.push(...user.departments)
  }

  if (Array.isArray(user.department)) {
    sourceDepartments.push(...user.department)
  }

  const singleDepartmentId = user.department_id ?? user.departmentId
  if (singleDepartmentId !== undefined && singleDepartmentId !== null) {
    sourceDepartments.push({ id: singleDepartmentId })
  }

  return sourceDepartments
    .map((department) => {
      if (department && typeof department === 'object') {
        return {
          id: department.id ?? department.department_id ?? department.departmentId,
          name:
            department.name ??
            department.department ??
            department.department_name ??
            department.departmentName,
        }
      }

      return {
        id: null,
        name: department,
      }
    })
    .filter((department) => department.id !== null || normalizeText(department.name))
}

function hasDepartmentId(departments, departmentId) {
  return departments.some((department) => Number(department.id) === departmentId)
}

function hasDepartmentAlias(department, departments, aliases) {
  const departmentNames = [
    department,
    ...departments.map((item) => item.name),
  ]

  return departmentNames.some((name) => aliases.includes(normalizeSlug(name)))
}

function getJobPosition(user) {
  return normalizeText(user?.job_position ?? user?.jobPosition ?? user?.position)
}

function hasAdminHumanCapitalPosition(user) {
  return getJobPosition(user) === ADMIN_HUMAN_CAPITAL_POSITION
}

export function normalizeAccessUser(user = getStoredUser()) {
  const sourceUser = user && typeof user === 'object' ? user : {}
  const departments = normalizeDepartmentList(sourceUser)
  const department = normalizeText(
    sourceUser.department ??
      sourceUser.division ??
      sourceUser.department_name ??
      sourceUser.departmentName,
  )
  const apps = Array.isArray(sourceUser.apps)
    ? Array.from(new Set(sourceUser.apps.map((app) => normalizeSlug(app)).filter(Boolean)))
    : []

  return {
    ...sourceUser,
    department,
    departments,
    apps,
    jobPosition: getJobPosition(sourceUser),
    isIT:
      hasDepartmentId(departments, IT_DEPARTMENT_ID) ||
      hasDepartmentAlias(department, departments, IT_DEPARTMENT_ALIASES),
    isHCGA:
      hasDepartmentId(departments, HCGA_DEPARTMENT_ID) ||
      hasDepartmentAlias(department, departments, HCGA_DEPARTMENT_ALIASES) ||
      hasAdminHumanCapitalPosition(sourceUser),
  }
}

export function isITUser(user = getStoredUser()) {
  return normalizeAccessUser(user).isIT
}

export function isHCGAUser(user = getStoredUser()) {
  return normalizeAccessUser(user).isHCGA
}

export function canAccessUserManagement(user = getStoredUser()) {
  const accessUser = normalizeAccessUser(user)

  return accessUser.isIT || accessUser.isHCGA
}

export function canHCGAManageUser(targetUser) {
  const sourceUser = targetUser?.raw ?? targetUser ?? {}
  const level = Number(sourceUser?.job_level_value ?? sourceUser?.jobLevelValue)
  const jobPosition = getJobPosition(sourceUser)

  return level >= 1 || (level === 1 && jobPosition === ADMIN_HUMAN_CAPITAL_POSITION)
}

export function canManageUserTarget(targetUser, user = getStoredUser()) {
  const accessUser = normalizeAccessUser(user)

  if (accessUser.isIT) {
    return true
  }

  return accessUser.isHCGA && canHCGAManageUser(targetUser)
}

export function getAllowedNavigationPaths(user = getStoredUser()) {
  if (isITUser(user)) {
    return implementedNavigationPaths
  }

  if (canAccessUserManagement(user)) {
    return [defaultNavigationPath, USER_MANAGEMENT_PATH]
  }

  return [defaultNavigationPath]
}

export function canAccessPath(path, user = getStoredUser()) {
  return getAllowedNavigationPaths(user).includes(path)
}

export function getPrimaryNavigationItemsForUser(user = getStoredUser()) {
  if (isITUser(user)) {
    return primaryNavigationItems
  }

  const allowedPaths = getAllowedNavigationPaths(user)

  return primaryNavigationItems.flatMap((item) => {
    if (item.href) {
      return allowedPaths.includes(item.href) ? [item] : []
    }

    const allowedChildren = (item.children ?? []).filter((child) =>
      child.href ? allowedPaths.includes(child.href) : false,
    )

    if (allowedChildren.length === 0) {
      return []
    }

    return [
      {
        ...item,
        children: allowedChildren,
      },
    ]
  })
}

export function getSecondaryNavigationItemsForUser(user = getStoredUser()) {
  if (isITUser(user)) {
    return secondaryNavigationItems
  }

  return secondaryNavigationItems.flatMap((item) => {
    if (item.href === LOGOUT_PATH) {
      return [item]
    }

    if (item.id !== 'settings') {
      return []
    }

    const allowedChildren = (item.children ?? []).filter(
      (child) => child.id === 'change-profile',
    )

    if (allowedChildren.length === 0) {
      return []
    }

    return [
      {
        ...item,
        children: allowedChildren,
      },
    ]
  })
}

export function canAccessProject(project, user = getStoredUser()) {
  const accessUser = normalizeAccessUser(user)

  if (accessUser.isIT) {
    return true
  }

  const projectSlug = normalizeSlug(project?.slug ?? project?.raw?.slug)

  if (!projectSlug || projectSlug === 'no-slug') {
    return false
  }

  return accessUser.apps.includes(projectSlug)
}

export function filterProjectsForUser(projects, user = getStoredUser()) {
  if (!Array.isArray(projects)) {
    return []
  }

  if (isITUser(user)) {
    return projects
  }

  return projects.filter((project) => canAccessProject(project, user))
}
