import {
  BarChartSquare02,
  Folder,
  LogOut01,
  PieChart03,
  Settings01,
  Tool02,
  UserEdit,
  Users01,
} from '@untitledui/icons'

export const defaultNavigationPath = '/dashboard'
export const implementedNavigationPaths = ['/dashboard', '/users', '/master-project']

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
    label: 'Master Project',
    href: '/master-project',
    icon: Folder,
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: PieChart03,
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
