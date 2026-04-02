import api from '@/services/api'

export const LOGIN_PATH = '/login'

function redirectToLogin() {
  if (typeof window === 'undefined') {
    return
  }

  if (window.location.pathname !== LOGIN_PATH) {
    window.history.replaceState({}, '', LOGIN_PATH)
  }

  window.dispatchEvent(new PopStateEvent('popstate'))
}

export async function submitLogout() {
  try {
    await api.auth.logout()
  } finally {
    redirectToLogin()
  }
}

const logoutService = {
  submitLogout,
}

export default logoutService
