import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ensureMonacoConfigured } from '@/lib/monaco'

const CodeEditor = lazy(() =>
  import('./CodeEditor').then((mod) => ({ default: mod.CodeEditor }))
)

const DiffViewer = lazy(() =>
  import('./DiffViewer').then((mod) => ({ default: mod.DiffViewer }))
)

interface LightEditorProps {
  value: string
  onChange?: (value: string) => void
  language: string
}

function LightEditor({ value, onChange, language }: LightEditorProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground">{language}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>加载编辑器中...</span>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="flex-1 w-full resize-none bg-transparent p-4 font-mono text-sm outline-none"
        placeholder="// 在此输入代码..."
        spellCheck={false}
        style={{
          fontFamily:
            "'JetBrains Mono', 'Fira Code', 'SF Mono', Monaco, Consolas, 'Courier New', monospace",
          lineHeight: 1.6,
          tabSize: 2,
        }}
      />
    </div>
  )
}

function EditorSkeleton() {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-lg border border-border bg-muted/30">
      <div className="text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">加载编辑器中...</p>
      </div>
    </div>
  )
}

function useMonacoSetup(enabled: boolean) {
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false

    ensureMonacoConfigured().then(() => {
      if (!cancelled) {
        setIsConfigured(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [enabled])

  return isConfigured
}

interface LazyCodeEditorProps {
  value: string
  onChange?: (value: string) => void
  language: string
  readOnly?: boolean
  className?: string
  wordWrap?: 'on' | 'off'
}

export function LazyCodeEditor(props: LazyCodeEditorProps) {
  const [isMonacoReady, setIsMonacoReady] = useState(false)
  const [shouldLoadMonaco, setShouldLoadMonaco] = useState(false)
  const isMonacoConfigured = useMonacoSetup(shouldLoadMonaco)

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = (
        window as Window & {
          requestIdleCallback: (cb: () => void, options?: { timeout: number }) => number
        }
      ).requestIdleCallback(() => setShouldLoadMonaco(true), { timeout: 1000 })

      return () =>
        (window as Window & { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id)
    }

    const timer = setTimeout(() => setShouldLoadMonaco(true), 300)
    return () => clearTimeout(timer)
  }, [])

  const handleMonacoReady = useCallback(() => {
    setIsMonacoReady(true)
  }, [])

  if (!shouldLoadMonaco || !isMonacoConfigured) {
    return <LightEditor value={props.value} onChange={props.onChange} language={props.language} />
  }

  return (
    <div className="relative h-full w-full">
      {!isMonacoReady && (
        <div className="absolute inset-0 z-10">
          <LightEditor value={props.value} onChange={props.onChange} language={props.language} />
        </div>
      )}

      <div
        className={`h-full w-full transition-opacity duration-300 ${
          isMonacoReady ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Suspense fallback={null}>
          <CodeEditorWrapper {...props} onReady={handleMonacoReady} />
        </Suspense>
      </div>
    </div>
  )
}

interface CodeEditorWrapperProps extends LazyCodeEditorProps {
  onReady: () => void
}

function CodeEditorWrapper({ onReady, ...props }: CodeEditorWrapperProps) {
  useEffect(() => {
    const timer = setTimeout(onReady, 100)
    return () => clearTimeout(timer)
  }, [onReady])

  return <CodeEditor {...props} />
}

interface LazyDiffViewerProps {
  original: string
  modified: string
  language: string
  onModifiedChange?: (value: string) => void
  className?: string
  wordWrap?: 'on' | 'off'
  renderSideBySide?: boolean
}

export function LazyDiffViewer(props: LazyDiffViewerProps) {
  const isMonacoConfigured = useMonacoSetup(true)

  if (!isMonacoConfigured) {
    return <EditorSkeleton />
  }

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <DiffViewer {...props} />
    </Suspense>
  )
}
