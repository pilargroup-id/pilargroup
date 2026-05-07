const PROJECT_LAUNCH_OVERLAY_EVENT = 'dashboard-it:project-launch-overlay'

function dispatchProjectLaunchOverlay(detail) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent(PROJECT_LAUNCH_OVERLAY_EVENT, {
      detail,
    }),
  )
}

function waitForNextPaint() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve()
      return
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(resolve)
    })
  })
}

export async function showProjectLaunchScreen(projectName) {
  dispatchProjectLaunchOverlay({
    isOpen: true,
    projectName: String(projectName ?? '').trim() || 'project',
  })

  await waitForNextPaint()
}

export function hideProjectLaunchScreen() {
  dispatchProjectLaunchOverlay({
    isOpen: false,
    projectName: '',
  })
}

export function subscribeProjectLaunchScreen(listener) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleProjectLaunchOverlay = (event) => {
    listener?.(event?.detail ?? { isOpen: false, projectName: '' })
  }

  window.addEventListener(PROJECT_LAUNCH_OVERLAY_EVENT, handleProjectLaunchOverlay)

  return () => {
    window.removeEventListener(PROJECT_LAUNCH_OVERLAY_EVENT, handleProjectLaunchOverlay)
  }
}
