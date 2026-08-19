import {
  BarChartSquare02,
  Briefcase01,
  Building01,
  Building06,
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
  '/business-unit',
  '/master-departments',
  '/master-companies',
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
        id: 'business-unit',
        label: 'Business Unit',
        href: '/business-unit',
        icon: Briefcase01,
      },
      {
        id: 'master-companies',
        label: 'Companies',
        href: '/master-companies',
        icon: Building01,
      },
      {
        id: 'master-departments',
        label: 'Departments',
        href: '/master-departments',
        icon: Building06,
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
