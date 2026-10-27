import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export async function copyText(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text)
    return
  }

  // 非 HTTPS 环境下的兜底方案
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  document.body.appendChild(textArea)
  textArea.select()
  document.execCommand('copy')
  document.body.removeChild(textArea)
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
