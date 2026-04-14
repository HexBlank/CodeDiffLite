import { DiffEditor, DiffOnMount } from '@monaco-editor/react'
import { useCallback, useRef } from 'react'
import type { editor } from 'monaco-editor'

interface DiffViewerProps {
  original: string
  modified: string
  language: string
  onModifiedChange?: (value: string) => void
  className?: string
  wordWrap?: 'on' | 'off'
  renderSideBySide?: boolean
}

export function DiffViewer({
  original,
  modified,
  language,
  onModifiedChange,
  className = '',
  wordWrap = 'on',
  renderSideBySide,
}: DiffViewerProps) {
  const editorRef = useRef<editor.IStandaloneDiffEditor | null>(null)

  const handleMount: DiffOnMount = useCallback(
    (editor) => {
      editorRef.current = editor
      
      // 监听修改后的编辑器变化
      if (onModifiedChange) {
        const modifiedEditor = editor.getModifiedEditor()
        modifiedEditor.onDidChangeModelContent(() => {
          const value = modifiedEditor.getValue()
          onModifiedChange(value)
        })
      }
    },
    [onModifiedChange]
  )

  // 移动端使用内联视图
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div className={`h-full w-full ${className}`}>
      <DiffEditor
        height="100%"
        language={language}
        original={original}
        modified={modified}
        onMount={handleMount}
        theme="light"
        options={{
          readOnly: !onModifiedChange,
          originalEditable: false,
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          wordWrap,
          renderSideBySide: renderSideBySide !== undefined ? renderSideBySide : !isMobile,
          automaticLayout: true,
          padding: { top: 8 },
          accessibilitySupport: 'off',
          fixedOverflowWidgets: false,
          contextmenu: false,
          unicodeHighlight: {
            ambiguousCharacters: false,
            invisibleCharacters: false,
          },
          domReadOnly: !onModifiedChange,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
        loading={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            加载对比视图中...
          </div>
        }
      />
    </div>
  )
}
