import * as React from "react"

// 与 Tailwind 的 md 断点一致：小于 768px 视为移动端
const MOBILE_BREAKPOINT = 768

function useMediaQuery(query: string) {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    [query]
  )

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}

export function useIsMobile() {
  return useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
}

/** 主要输入方式是触摸（手机、平板），这类设备点到编辑器就会弹出软键盘 */
export function useIsTouch() {
  return useMediaQuery("(pointer: coarse)")
}
