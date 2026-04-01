import {
  BarChartSquare02,
  LogOut01,
  PieChart03,
  Settings01,
  Users01,
} from '@untitledui/icons'

export const defaultNavigationPath = '/dashboard'
export const implementedNavigationPaths = ['/dashboard', '/users']

export const primaryNavigationItems = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: BarChartSquare02,
  },
  {
    label: 'Users',
    href: '/users',
    icon: Users01,
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: PieChart03,
  },
]

export const secondaryNavigationItems = [
  {
    label: 'Settings',
    href: '/settings',
    icon: Settings01,
  },
  {
    label: 'Logout',
    href: '/logout',
    icon: LogOut01,
    variant: 'danger',
  },
]
