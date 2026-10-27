import { lazy, Suspense, type ComponentProps } from 'react'
import { Loader2 } from 'lucide-react'

const CodeEditor = lazy(() =>
  import('./CodeEditor').then((mod) => ({ default: mod.CodeEditor }))
)

const DiffViewer = lazy(() =>
  import('./DiffViewer').then((mod) => ({ default: mod.DiffViewer }))
)

function EditorSkeleton() {
  return (
    <div className="flex h-full min-h-[200px] w-full items-center justify-center bg-muted/30">
      <div className="text-center">
        <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">加载编辑器中...</p>
      </div>
    </div>
  )
}

export function LazyCodeEditor(props: ComponentProps<typeof CodeEditor>) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <CodeEditor {...props} />
    </Suspense>
  )
}

export function LazyDiffViewer(props: ComponentProps<typeof DiffViewer>) {
  return (
    <Suspense fallback={<EditorSkeleton />}>
      <DiffViewer {...props} />
    </Suspense>
  )
}
