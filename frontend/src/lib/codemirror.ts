import { EditorState, type Extension } from '@codemirror/state'
import {
  EditorView,
  crosshairCursor,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
  HighlightStyle,
  StreamLanguage,
  bracketMatching,
  foldGutter,
  foldKeymap,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from '@codemirror/language'
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import { tags as t } from '@lezer/highlight'

// 语言包按需加载，每种语言单独打包
const languageLoaders: Record<string, () => Promise<Extension>> = {
  python: () => import('@codemirror/lang-python').then((m) => m.python()),
  javascript: () => import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true })),
  typescript: () =>
    import('@codemirror/lang-javascript').then((m) => m.javascript({ jsx: true, typescript: true })),
  java: () => import('@codemirror/lang-java').then((m) => m.java()),
  cpp: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  c: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
  go: () => import('@codemirror/lang-go').then((m) => m.go()),
  rust: () => import('@codemirror/lang-rust').then((m) => m.rust()),
  html: () => import('@codemirror/lang-html').then((m) => m.html()),
  css: () => import('@codemirror/lang-css').then((m) => m.css()),
  json: () => import('@codemirror/lang-json').then((m) => m.json()),
  sql: () => import('@codemirror/lang-sql').then((m) => m.sql()),
  shell: () =>
    import('@codemirror/legacy-modes/mode/shell').then((m) => StreamLanguage.define(m.shell)),
}

const languageCache = new Map<string, Promise<Extension>>()

export function loadLanguage(language: string): Promise<Extension> {
  const loader = languageLoaders[language]
  if (!loader) {
    return Promise.resolve([])
  }

  let cached = languageCache.get(language)
  if (!cached) {
    cached = loader().catch(() => [])
    languageCache.set(language, cached)
  }
  return cached
}

// 这些语言习惯用 4 空格缩进，其余用 2 空格
const FOUR_SPACE_LANGUAGES = new Set(['python', 'java', 'c', 'cpp', 'rust'])

export function languageIndent(language: string): Extension {
  if (language === 'go') {
    return indentUnit.of('\t')
  }
  return indentUnit.of(FOUR_SPACE_LANGUAGES.has(language) ? '    ' : '  ')
}

// 颜色全部走 CSS 变量（见 index.css），方便后续接入暗色模式
const highlightStyle = HighlightStyle.define([
  { tag: [t.keyword, t.modifier, t.operatorKeyword, t.controlKeyword], color: 'var(--code-keyword)' },
  { tag: [t.string, t.special(t.string), t.regexp], color: 'var(--code-string)' },
  { tag: [t.number, t.bool, t.null, t.atom], color: 'var(--code-number)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'var(--code-comment)', fontStyle: 'italic' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'var(--code-function)' },
  { tag: [t.typeName, t.className, t.namespace], color: 'var(--code-type)' },
  { tag: [t.definition(t.variableName), t.propertyName], color: 'var(--code-property)' },
  { tag: [t.tagName, t.angleBracket], color: 'var(--code-keyword)' },
  { tag: t.attributeName, color: 'var(--code-property)' },
  { tag: [t.meta, t.processingInstruction], color: 'var(--code-meta)' },
  { tag: t.invalid, color: 'var(--code-invalid)' },
  { tag: t.strong, fontWeight: 'bold' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.link, textDecoration: 'underline' },
])

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'oklch(var(--foreground))',
    backgroundColor: 'transparent',
  },
  '&.cm-focused': { outline: 'none' },
  '.cm-scroller': {
    fontFamily: 'var(--font-code)',
    lineHeight: '1.6',
  },
  '.cm-content': { padding: '12px 0' },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'oklch(var(--muted-foreground) / 0.7)',
    border: 'none',
  },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 8px 0 12px', minWidth: '2.5em' },
  '.cm-activeLine': { backgroundColor: 'oklch(var(--foreground) / 0.035)' },
  '.cm-activeLineGutter': {
    backgroundColor: 'transparent',
    color: 'oklch(var(--foreground))',
  },
  '.cm-selectionMatch': { backgroundColor: 'oklch(var(--chart-1) / 0.15)' },
  '&.cm-focused .cm-matchingBracket': {
    backgroundColor: 'oklch(var(--chart-1) / 0.18)',
    outline: 'none',
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'oklch(var(--muted))',
    border: 'none',
    color: 'oklch(var(--muted-foreground))',
    padding: '0 6px',
  },
  '.cm-panels': {
    backgroundColor: 'oklch(var(--card))',
    color: 'oklch(var(--foreground))',
  },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid oklch(var(--border))' },
  '.cm-panels.cm-panels-bottom': { borderTop: '1px solid oklch(var(--border))' },
  '.cm-tooltip': {
    backgroundColor: 'oklch(var(--popover))',
    border: '1px solid oklch(var(--border))',
  },
})

const zhPhrases = EditorState.phrases.of({
  '$ unchanged lines': '$ 行未改动',
  'Folded lines': '已折叠',
  'Unfolded lines': '已展开',
  'Fold line': '折叠',
  'Unfold line': '展开',
  Find: '查找',
  Replace: '替换',
  next: '下一个',
  previous: '上一个',
  all: '全部',
  'match case': '区分大小写',
  'by word': '全词匹配',
  regexp: '正则',
  replace: '替换',
  'replace all': '全部替换',
  close: '关闭',
  'current match': '当前匹配',
  'on line': '位于第',
  'Go to line': '跳转到行',
  go: '跳转',
})

// 不使用 drawSelection：保留浏览器原生的光标与选区，移动端才能出现选择手柄和长按菜单
export function baseExtensions(): Extension[] {
  return [
    zhPhrases,
    lineNumbers(),
    highlightActiveLineGutter(),
    highlightSpecialChars(),
    history(),
    foldGutter(),
    EditorState.allowMultipleSelections.of(true),
    indentOnInput(),
    syntaxHighlighting(highlightStyle),
    bracketMatching(),
    closeBrackets(),
    rectangularSelection(),
    crosshairCursor(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search({ top: true }),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...searchKeymap,
      ...historyKeymap,
      ...foldKeymap,
      indentWithTab,
    ]),
    editorTheme,
  ]
}

export function readOnlyExtensions(readOnly: boolean): Extension {
  return readOnly ? [EditorState.readOnly.of(true), EditorView.editable.of(false)] : []
}

export function wordWrapExtension(wordWrap: 'on' | 'off'): Extension {
  return wordWrap === 'on' ? EditorView.lineWrapping : []
}
