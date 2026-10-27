import type { MouseEvent, ReactNode } from 'react'
import { EditorView } from '@codemirror/view'
import {
  cursorCharLeft,
  cursorCharRight,
  cursorLineDown,
  cursorLineUp,
  indentMore,
  redo,
  selectAll,
  undo,
} from '@codemirror/commands'
import { insertBracket } from '@codemirror/autocomplete'
import { indentUnit } from '@codemirror/language'
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Redo2,
  Undo2,
} from 'lucide-react'
import { toast } from 'sonner'
import { copyText } from '@/hooks/use-copy'

const BRACKETS = new Set(['(', ')', '[', ']', '{', '}', '"', "'", '`'])
const SYMBOLS = ['{', '}', '(', ')', '[', ']', ';', ':', '=', '"', "'", '<', '>', '+', '-', '*', '/', '\\', '_', '#', '!', '&', '|', '%', ',', '.', '`', '?', '~', '^']

/** 当前聚焦的 CodeMirror 编辑器 */
function focusedView() {
  const dom = document.activeElement?.closest('.cm-editor')
  return dom instanceof HTMLElement ? EditorView.findFromDOM(dom) : null
}

function insertSymbol(view: EditorView, symbol: string) {
  const bracket = BRACKETS.has(symbol) ? insertBracket(view.state, symbol) : null
  view.dispatch(bracket ?? view.state.update(view.state.replaceSelection(symbol), {
    scrollIntoView: true,
    userEvent: 'input.type',
  }))
}

// 有选区时整体缩进；否则在光标处插入一个缩进单位（Python 为 4 个空格）
function insertIndent(view: EditorView) {
  if (view.state.selection.ranges.some((range) => !range.empty)) {
    indentMore(view)
    return
  }
  view.dispatch(view.state.replaceSelection(view.state.facet(indentUnit)), {
    scrollIntoView: true,
    userEvent: 'input.type',
  })
}

async function pasteFromClipboard(view: EditorView) {
  try {
    const text = await navigator.clipboard.readText()
    if (!text) return
    view.dispatch(view.state.replaceSelection(text), { scrollIntoView: true, userEvent: 'input.paste' })
  } catch {
    toast.error('无法读取剪贴板', { description: '请长按编辑器，使用系统菜单粘贴' })
  }
}

async function copySelection(view: EditorView) {
  const { state } = view
  const selected = state.selection.ranges
    .filter((range) => !range.empty)
    .map((range) => state.sliceDoc(range.from, range.to))
    .join('\n')
  try {
    await copyText(selected || state.doc.toString())
    toast.success(selected ? '已复制选中内容' : '已复制全部代码')
  } catch {
    toast.error('复制失败')
  }
}

function Key({
  onPress,
  label,
  children,
  wide = false,
}: {
  onPress: (view: EditorView) => void
  label: string
  children: ReactNode
  wide?: boolean
}) {
  // 阻止 mousedown 的默认行为，按键时编辑器不会失焦，键盘也不会收起
  const keepFocus = (e: MouseEvent) => e.preventDefault()

  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={keepFocus}
      onClick={() => {
        const view = focusedView()
        if (view) onPress(view)
      }}
      className={`flex h-9 shrink-0 items-center justify-center rounded-md bg-background font-mono text-base shadow-sm active:bg-secondary ${wide ? 'px-3 text-sm font-sans' : 'min-w-9 px-2'}`}
    >
      {children}
    </button>
  )
}

/** 移动端软键盘上方的辅助按键栏：Tab、方向键、撤销重做、全选复制粘贴和常用符号 */
export function EditorKeyboardBar() {
  return (
    <div className="flex h-12 shrink-0 items-center border-t border-border bg-muted/90 backdrop-blur">
      <div className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto px-1.5">
        <Key label="缩进" onPress={insertIndent} wide>
          Tab
        </Key>
        <Key label="左移光标" onPress={(view) => cursorCharLeft(view)}>
          <ArrowLeft className="h-4 w-4" />
        </Key>
        <Key label="右移光标" onPress={(view) => cursorCharRight(view)}>
          <ArrowRight className="h-4 w-4" />
        </Key>
        <Key label="上移光标" onPress={(view) => cursorLineUp(view)}>
          <ArrowUp className="h-4 w-4" />
        </Key>
        <Key label="下移光标" onPress={(view) => cursorLineDown(view)}>
          <ArrowDown className="h-4 w-4" />
        </Key>
        <Key label="撤销" onPress={(view) => undo(view)}>
          <Undo2 className="h-4 w-4" />
        </Key>
        <Key label="重做" onPress={(view) => redo(view)}>
          <Redo2 className="h-4 w-4" />
        </Key>
        <Key label="全选" onPress={(view) => selectAll(view)} wide>
          全选
        </Key>
        <Key label="复制" onPress={copySelection} wide>
          复制
        </Key>
        <Key label="粘贴" onPress={pasteFromClipboard} wide>
          粘贴
        </Key>
        <div className="mx-0.5 h-6 w-px shrink-0 bg-border" />
        {SYMBOLS.map((symbol) => (
          <Key key={symbol} label={`输入 ${symbol}`} onPress={(view) => insertSymbol(view, symbol)}>
            {symbol}
          </Key>
        ))}
      </div>
      <button
        type="button"
        aria-label="收起键盘"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (document.activeElement as HTMLElement | null)?.blur()}
        className="flex h-12 w-11 shrink-0 items-center justify-center border-l border-border text-muted-foreground"
      >
        <ChevronDown className="h-5 w-5" />
      </button>
    </div>
  )
}
