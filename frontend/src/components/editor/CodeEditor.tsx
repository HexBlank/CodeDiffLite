import { useEffect, useLayoutEffect, useRef } from 'react'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  baseExtensions,
  darkModeExtension,
  focusAtVisibleTop,
  languageIndent,
  loadLanguage,
  readOnlyExtensions,
  wordWrapExtension,
} from '@/lib/codemirror'
import { useTheme } from '@/contexts/ThemeContext'

interface CodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language: string
  readOnly?: boolean
  className?: string
  wordWrap?: 'on' | 'off'
}

export function CodeEditor({
  value,
  onChange,
  language,
  readOnly = false,
  className = '',
  wordWrap = 'on',
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const dark = useTheme().resolvedTheme === 'dark'

  const compartments = useRef({
    language: new Compartment(),
    readOnly: new Compartment(),
    wordWrap: new Compartment(),
    theme: new Compartment(),
  }).current

  // 创建编辑器（只在挂载时执行一次，其余属性通过 compartment 动态切换）
  useEffect(() => {
    const view = new EditorView({
      parent: containerRef.current!,
      state: EditorState.create({
        doc: value,
        extensions: [
          baseExtensions(),
          compartments.language.of(languageIndent(language)),
          compartments.readOnly.of(readOnlyExtensions(readOnly)),
          compartments.wordWrap.of(wordWrapExtension(wordWrap)),
          compartments.theme.of(darkModeExtension(dark)),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current?.(update.state.doc.toString())
            }
          }),
        ],
      }),
    })
    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 外部传入的 value 变化时同步到编辑器（例如加载完成、切换版本）
  useEffect(() => {
    const view = viewRef.current
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== value) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: value } })
    }
  }, [value])

  useEffect(() => {
    let cancelled = false
    loadLanguage(language).then((support) => {
      if (!cancelled) {
        viewRef.current?.dispatch({
          effects: compartments.language.reconfigure([support, languageIndent(language)]),
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [language, compartments])

  // 用 layout effect 同步切换：从只读变为可编辑时立即聚焦，
  // 这样点击"修改"能在同一次手势里弹出键盘（iOS 要求）
  const wasReadOnly = useRef(readOnly)
  useLayoutEffect(() => {
    const view = viewRef.current
    if (!view) return
    view.dispatch({
      effects: compartments.readOnly.reconfigure(readOnlyExtensions(readOnly)),
    })
    if (wasReadOnly.current && !readOnly) {
      focusAtVisibleTop(view)
    }
    wasReadOnly.current = readOnly
  }, [readOnly, compartments])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.wordWrap.reconfigure(wordWrapExtension(wordWrap)),
    })
  }, [wordWrap, compartments])

  useEffect(() => {
    viewRef.current?.dispatch({
      effects: compartments.theme.reconfigure(darkModeExtension(dark)),
    })
  }, [dark, compartments])

  return <div ref={containerRef} className={`code-editor h-full w-full ${className}`} />
}
