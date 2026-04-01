import { useEffect, useState } from 'react'

function flattenItems(items) {
  return items.flatMap((item) => {
    if (!item || item.divider) {
      return []
    }

    return item.items?.length ? [item, ...item.items] : [item]
  })
}

function isExternalHref(href) {
  return typeof href === 'string' && /^https?:\/\//.test(href)
}

function normalizePath(pathname) {
  if (!pathname) {
    return ''
  }

  const normalizedPath = pathname.replace(/\/+$/, '')

  return normalizedPath || '/'
}

function getFirstNavigableHref(items) {
  return flattenItems(items).find((item) => item.href)?.href ?? ''
}

function getHashTarget(items) {
  if (typeof window === 'undefined' || !window.location.hash) {
    return ''
  }

  return flattenItems(items).find((item) => item.href === window.location.hash)?.href ?? ''
}

function getPathTarget(items) {
  if (typeof window === 'undefined') {
    return ''
  }

  const currentPath = normalizePath(window.location.pathname)
  const match = flattenItems(items).find((item) => {
    if (!item.href || item.href.startsWith('#') || isExternalHref(item.href)) {
      return false
    }

    try {
      return normalizePath(new URL(item.href, window.location.origin).pathname) === currentPath
    } catch {
      return normalizePath(item.href) === currentPath
    }
  })

  return match?.href ?? ''
}

function getVisibleTarget(items) {
  if (typeof window === 'undefined') {
    return ''
  }

  const sectionItems = flattenItems(items).filter((item) => item.id && item.href?.startsWith('#'))

  if (sectionItems.length === 0) {
    return ''
  }

  const offset = window.innerHeight * 0.35
  let nextHref = sectionItems[0].href

  sectionItems.forEach((item) => {
    const section = document.getElementById(item.id)

    if (section && section.getBoundingClientRect().top <= offset) {
      nextHref = item.href
    }
  })

  return nextHref
}

function getCurrentTarget(items) {
  return getHashTarget(items) || getPathTarget(items) || getVisibleTarget(items) || getFirstNavigableHref(items)
}

export function useSectionNavigation(items) {
  const [activeHref, setActiveHref] = useState(() => getCurrentTarget(items))

  useEffect(() => {
    const hasSectionTargets = flattenItems(items).some((item) => item.id && item.href?.startsWith('#'))

    const syncNavigation = () => {
      const nextHref = getCurrentTarget(items)

      setActiveHref((currentHref) => (currentHref === nextHref ? currentHref : nextHref))
    }

    syncNavigation()

    window.addEventListener('popstate', syncNavigation)
    window.addEventListener('hashchange', syncNavigation)

    if (hasSectionTargets) {
      window.addEventListener('scroll', syncNavigation, { passive: true })
      window.addEventListener('resize', syncNavigation)
    }

    return () => {
      window.removeEventListener('popstate', syncNavigation)
      window.removeEventListener('hashchange', syncNavigation)

      if (hasSectionTargets) {
        window.removeEventListener('scroll', syncNavigation)
        window.removeEventListener('resize', syncNavigation)
      }
    }
  }, [items])

  return activeHref
}
