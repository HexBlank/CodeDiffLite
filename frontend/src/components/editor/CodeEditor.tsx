import { useRef, useCallback } from 'react'
import Editor, { OnMount, OnChange } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

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
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleMount: OnMount = useCallback((editor) => {
    editorRef.current = editor
  }, [])

  const handleChange: OnChange = useCallback(
    (value) => {
      if (onChange && value !== undefined) {
        onChange(value)
      }
    },
    [onChange]
  )

  return (
    <div className={`h-full w-full ${className}`}>
      <Editor
        height="100%"
        language={language}
        value={value}
        onChange={handleChange}
        onMount={handleMount}
        theme="light"
        options={{
          readOnly,
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Consolas, 'Courier New', monospace",
          fontLigatures: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap,
          lineNumbers: 'on',
          folding: true,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          padding: { top: 16, bottom: 16 },
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          renderLineHighlight: 'line',
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          guides: {
            bracketPairs: true,
            indentation: true,
          },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          fixedOverflowWidgets: false,
          overviewRulerBorder: false,
          hideCursorInOverviewRuler: true,
          accessibilitySupport: 'off',
          contextmenu: false,
          unicodeHighlight: {
            ambiguousCharacters: false,
            invisibleCharacters: false,
          },
          quickSuggestions: false,
          domReadOnly: readOnly,
          // 彻底关闭编辑器用于无障碍和移动端的文本区域交互帮助器
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
            alwaysConsumeMouseWheel: false,
          },
          links: false,
          lineNumbersMinChars: 3,
        }}
        loading={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span className="text-sm">加载编辑器...</span>
            </div>
          </div>
        }
      />
    </div>
  )
}
