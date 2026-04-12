import { loader } from '@monaco-editor/react'
// @ts-expect-error Monaco ESM path is resolved by Vite at build time.
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
// @ts-expect-error Vite worker query module is resolved at build time.
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
// @ts-expect-error Monaco ESM path is resolved by Vite at build time.
import { createTokenizationSupport } from 'monaco-editor/esm/vs/language/json/tokenization'

import 'monaco-editor/esm/vs/basic-languages/cpp/cpp.contribution'
import 'monaco-editor/esm/vs/basic-languages/css/css.contribution'
import 'monaco-editor/esm/vs/basic-languages/go/go.contribution'
import 'monaco-editor/esm/vs/basic-languages/html/html.contribution'
import 'monaco-editor/esm/vs/basic-languages/java/java.contribution'
import 'monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution'
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution'
import 'monaco-editor/esm/vs/basic-languages/rust/rust.contribution'
import 'monaco-editor/esm/vs/basic-languages/shell/shell.contribution'
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution'
import 'monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution'

type MonacoEnvironmentLike = {
  MonacoEnvironment?: {
    getWorker: (_moduleId: string, _label: string) => Worker
  }
}

const monacoGlobal = self as typeof self & MonacoEnvironmentLike

if (!monacoGlobal.MonacoEnvironment) {
  monacoGlobal.MonacoEnvironment = {
    getWorker() {
      return new EditorWorker()
    },
  }
}

const jsonLanguageConfiguration = {
  wordPattern: /(-?\d*\.\d\w*)|([^\[\]\{\}\:\"\,\s]+)/g,
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'] as [string, string],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
  ] as [string, string][],
  autoClosingPairs: [
    { open: '{', close: '}', notIn: ['string'] },
    { open: '[', close: ']', notIn: ['string'] },
    { open: '"', close: '"', notIn: ['string'] },
  ],
}

let jsonRegistered = false

function registerJsonLanguage() {
  if (jsonRegistered) {
    return
  }

  jsonRegistered = true

  monaco.languages.register({
    id: 'json',
    extensions: ['.json', '.bowerrc', '.jshintrc', '.jscsrc', '.eslintrc', '.babelrc', '.har'],
    aliases: ['JSON', 'json'],
    mimetypes: ['application/json'],
  })

  monaco.languages.onLanguage('json', () => {
    monaco.languages.setTokensProvider('json', createTokenizationSupport(true))
    monaco.languages.setLanguageConfiguration('json', jsonLanguageConfiguration)
  })
}

registerJsonLanguage()

let monacoConfigPromise: Promise<void> | null = null

export function ensureMonacoConfigured(): Promise<void> {
  if (!monacoConfigPromise) {
    monacoConfigPromise = Promise.resolve().then(() => {
      loader.config({ monaco })
    })
  }

  return monacoConfigPromise
}
