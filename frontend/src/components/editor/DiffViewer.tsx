import { useEffect, useRef, useState } from 'react'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import {
  MergeView,
  getChunks,
  goToNextChunk,
  goToPreviousChunk,
  unifiedMergeView,
} from '@codemirror/merge'
import { ChevronDown, ChevronUp } from 'lucide-react'
import {
  baseExtensions,
  languageIndent,
  loadLanguage,
  readOnlyExtensions,
  wordWrapExtension,
} from '@/lib/codemirror'

interface DiffViewerProps {
  original: string
  modified: string
  language: string
  onModifiedChange?: (value: string) => void
  className?: string
  wordWrap?: 'on' | 'off'
  renderSideBySide?: boolean
}

// 未改动的长段落折叠起来，只保留改动前后各 3 行
const COLLAPSE_UNCHANGED = { margin: 3, minSize: 6 }

export function DiffViewer({
  original,
  modified,
  language,
  onModifiedChange,
  className = '',
  wordWrap = 'on',
  renderSideBySide,
}: DiffViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // views[views.length - 1] 始终是“修改后”的编辑器
  const viewsRef = useRef<EditorView[]>([])
  const onChangeRef = useRef(onModifiedChange)
  onChangeRef.current = onModifiedChange
  const [chunkCount, setChunkCount] = useState(0)

  const compartments = useRef({
    language: new Compartment(),
    wordWrap: new Compartment(),
  }).current

  const editable = !!onModifiedChange
  // 移动端默认使用内联视图
  const sideBySide =
    renderSideBySide ?? (typeof window !== 'undefined' && window.innerWidth >= 768)

  // 原始代码、视图模式或可编辑性变化时重建编辑器
  useEffect(() => {
    const parent = containerRef.current!

    const shared = (): Extension[] => [
      baseExtensions(),
      compartments.language.of(languageIndent(language)),
      compartments.wordWrap.of(wordWrapExtension(wordWrap)),
    ]

    const modifiedExtensions: Extension[] = [
      shared(),
      readOnlyExtensions(!editable),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current?.(update.state.doc.toString())
        }
        setChunkCount(getChunks(update.state)?.chunks.length ?? 0)
      }),
    ]

    let destroy: () => void
    if (sideBySide) {
      const merge = new MergeView({
        parent,
        a: { doc: original, extensions: [shared(), readOnlyExtensions(true)] },
        b: { doc: modified, extensions: modifiedExtensions },
        collapseUnchanged: COLLAPSE_UNCHANGED,
        gutter: true,
      })
      viewsRef.current = [merge.a, merge.b]
      destroy = () => merge.destroy()
    } else {
      const view = new EditorView({
        parent,
        state: EditorState.create({
          doc: modified,
          extensions: [
            modifiedExtensions,
            unifiedMergeView({
              original,
              mergeControls: false,
              collapseUnchanged: COLLAPSE_UNCHANGED,
            }),
          ],
        }),
      })
      viewsRef.current = [view]
      destroy = () => view.destroy()
    }

    const modifiedView = viewsRef.current[viewsRef.current.length - 1]
    setChunkCount(getChunks(modifiedView.state)?.chunks.length ?? 0)

    return () => {
      destroy()
      viewsRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [original, sideBySide, editable])

  // 外部传入的 modified 变化时同步
  useEffect(() => {
    const view = viewsRef.current[viewsRef.current.length - 1]
    if (!view) return
    const current = view.state.doc.toString()
    if (current !== modified) {
      view.dispatch({ changes: { from: 0, to: current.length, insert: modified } })
    }
  }, [modified])

  useEffect(() => {
    let cancelled = false
    loadLanguage(language).then((support) => {
      if (cancelled) return
      for (const view of viewsRef.current) {
        view.dispatch({
          effects: compartments.language.reconfigure([support, languageIndent(language)]),
        })
      }
    })
    return () => {
      cancelled = true
    }
  }, [language, original, sideBySide, editable, compartments])

  useEffect(() => {
    for (const view of viewsRef.current) {
      view.dispatch({ effects: compartments.wordWrap.reconfigure(wordWrapExtension(wordWrap)) })
    }
  }, [wordWrap, compartments])

  const jump = (direction: 'prev' | 'next') => {
    const view = viewsRef.current[viewsRef.current.length - 1]
    if (!view) return
    const command = direction === 'next' ? goToNextChunk : goToPreviousChunk
    command(view)
  }

  return (
    <div className={`diff-viewer relative h-full w-full ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
      {chunkCount > 0 && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-0.5 rounded-full border border-border bg-background/90 py-0.5 pl-3 pr-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          <span className="mr-1 tabular-nums">{chunkCount} 处改动</span>
          <button
            type="button"
            onClick={() => jump('prev')}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary hover:text-foreground"
            aria-label="上一处改动"
            title="上一处改动"
          >
            <ChevronUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => jump('next')}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary hover:text-foreground"
            aria-label="下一处改动"
            title="下一处改动"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
