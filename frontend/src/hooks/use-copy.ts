import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {
      // 部分浏览器（如某些 WebView）拒绝剪贴板 API，退回到旧方案
    }
  }

  // 非 HTTPS 环境或剪贴板 API 不可用时的兜底方案
  const previousFocus = document.activeElement as HTMLElement | null
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  document.body.appendChild(textArea)
  textArea.select()
  const ok = document.execCommand('copy')
  document.body.removeChild(textArea)
  // 还原焦点，避免编辑时复制后软键盘被收起
  previousFocus?.focus({ preventScroll: true })
  if (!ok) throw new Error('copy failed')
}

/** 复制文本并在 2 秒内保持 copied 状态，用于切换按钮图标 */
export function useCopy(successMessage = '已复制') {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const copy = useCallback(
    async (text: string) => {
      try {
        await copyText(text)
        setCopied(true)
        toast.success(successMessage)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setCopied(false), 2000)
      } catch {
        toast.error('复制失败')
      }
    },
    [successMessage]
  )

  return { copied, copy }
}
