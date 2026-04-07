import {
  BarChartSquare02,
  Database01,
  Folder,
  LogOut01,
  Settings01,
  Tool02,
  UserEdit,
  Users01,
} from '@untitledui/icons'

export const defaultNavigationPath = '/dashboard'
export const implementedNavigationPaths = [
  '/dashboard',
  '/master-departments',
  '/users',
  '/master-project',
]

export const primaryNavigationItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: BarChartSquare02,
  },
  {
    label: 'Manage User',
    href: '/users',
    icon: Users01,
  },
  {
    id: 'master',
    label: 'Master',
    icon: Database01,
    children: [
      {
        id: 'master-project',
        label: 'Project',
        href: '/master-project',
        icon: Folder,
      },
      {
        id: 'master-departments',
        label: 'Departments',
        href: '/master-departments',
        icon: Users01,
      },
    ],
  },
]

export const secondaryNavigationItems = [
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings01,
    children: [
      {
        id: 'change-profile',
        label: 'Change Profile',
        icon: UserEdit,
        action: 'change-profile',
      },
      {
        id: 'maintenance-info',
        label: 'Maintenance Info',
        icon: Tool02,
      },
    ],
  },
  {
    label: 'Logout',
    href: '/logout',
    icon: LogOut01,
    variant: 'danger',
  },
]
