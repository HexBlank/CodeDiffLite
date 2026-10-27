/**
 * 软键盘弹出时，把可见区域高度写入 CSS 变量 --app-height。
 *
 * Android Chrome 依靠 viewport 的 interactive-widget=resizes-content 已经会缩小布局，
 * 但 iOS Safari 不会：键盘直接盖在页面上，底部的按键栏和编辑器下半部分会被挡住。
 * 页面根容器使用 h-[var(--app-height,100dvh)]，键盘弹出时高度就跟随可见区域。
 */
export function installViewportHeight() {
  const viewport = window.visualViewport
  if (!viewport) return

  const root = document.documentElement

  const update = () => {
    // 用户双指缩放时可见区域也会变小，这时不调整布局
    if (viewport.scale > 1.01) return

    const keyboardOpen = window.innerHeight - viewport.height > 120
    if (keyboardOpen) {
      root.style.setProperty('--app-height', `${viewport.height}px`)
      // iOS 会把页面整体上推来露出光标，布局已经缩小，这里把它拉回顶部
      if (viewport.offsetTop > 0) window.scrollTo(0, 0)
    } else {
      root.style.removeProperty('--app-height')
    }
  }

  viewport.addEventListener('resize', update)
  viewport.addEventListener('scroll', update)
  update()
}
