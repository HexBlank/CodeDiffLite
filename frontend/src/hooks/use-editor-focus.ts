import { useEffect, useState } from 'react'

function isEditorElement(element: Element | null) {
  return !!element?.closest('.cm-content')
}

/** 代码编辑器是否处于聚焦状态（移动端此时软键盘弹出） */
export function useEditorFocused() {
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    const update = () => setFocused(isEditorElement(document.activeElement))
    document.addEventListener('focusin', update)
    document.addEventListener('focusout', update)
    return () => {
      document.removeEventListener('focusin', update)
      document.removeEventListener('focusout', update)
    }
  }, [])

  return focused
}
