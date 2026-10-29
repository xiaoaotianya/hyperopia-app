/** iOS（含 iPadOS 桌面模式 UA）且不是从主屏幕打开时返回 true */
export function needsAddToHome(
  nav: { userAgent: string; platform?: string; maxTouchPoints?: number; standalone?: boolean } | undefined =
    typeof navigator !== 'undefined' ? navigator as never : undefined,
  match: ((q: string) => boolean) | undefined =
    typeof window !== 'undefined' && window.matchMedia ? (q => window.matchMedia(q).matches) : undefined,
): boolean {
  if (!nav) return false
  const ios = /iPad|iPhone|iPod/.test(nav.userAgent) || (nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1)
  if (!ios) return false
  const standalone = nav.standalone === true ||
    !!match?.('(display-mode: standalone)') || !!match?.('(display-mode: fullscreen)')
  return !standalone
}
