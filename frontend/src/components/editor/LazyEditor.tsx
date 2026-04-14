import { lazy, Suspense, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { ensureMonacoConfigured } from '@/lib/monaco'

const CodeEditor = lazy(() =>
  import('./CodeEditor').then((mod) => ({ default: mod.CodeEditor }))
)

const DiffViewer = lazy(() =>
  import('./DiffViewer').then((mod) => ({ default: mod.DiffViewer }))
)

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
  const isMonacoConfigured = useMonacoSetup(true)

  if (!isMonacoConfigured) {
    return <EditorSkeleton />
  }

  return (
    <Suspense fallback={<EditorSkeleton />}>
      <CodeEditor {...props} />
    </Suspense>
  )
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
