import { useState, useEffect, useCallback } from 'react'
import { X, GitCompare, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api, Snippet, SnippetListItem } from '@/lib/api'
import { formatDistanceToNow } from '@/lib/date'
import { LazyDiffViewer } from '@/components/editor/LazyEditor'
import { toast } from 'sonner'

interface VersionCompareDialogProps {
  rootId?: string
  descendants: SnippetListItem[]
  root: Snippet
  isOpen: boolean
  onClose: () => void
  initialBaseId?: string
  initialCompareId?: string
}

export function VersionCompareDialog({
  descendants,
  root,
  isOpen,
  onClose,
  initialBaseId,
  initialCompareId,
}: VersionCompareDialogProps) {
  const [baseId, setBaseId] = useState<string>('')
  const [compareId, setCompareId] = useState<string>('')
  const [compareResult, setCompareResult] = useState<{
    base: Snippet
    compare: Snippet
    original: string
    modified: string
    is_same_root: boolean
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'select' | 'result'>('select')

  // 构建版本列表（包含根节点）
  const allVersions = [
    { ...root, code_preview: root.code.substring(0, 100) },
    ...descendants,
  ]

  const handleCompare = useCallback(async (bId: string = baseId, cId: string = compareId) => {
    if (!bId || !cId) {
      toast.error('请选择两个版本进行对比')
      return
    }

    if (bId === cId) {
      toast.error('不能选择同一个版本进行对比')
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const result = await api.compare(bId, cId)
      setCompareResult(result)
      setActiveTab('result')
      if (!result.is_same_root) {
        toast.warning('警告：这两个版本来自不同的版本树')
      }
    } catch (err: any) {
      setError(err.message || '对比失败')
    } finally {
      setIsLoading(false)
    }
  }, [baseId, compareId])

  useEffect(() => {
    if (!isOpen) {
      setBaseId('')
      setCompareId('')
      setCompareResult(null)
      setError(null)
      setActiveTab('select')
    } else {
      setBaseId(initialBaseId || '')
      setCompareId(initialCompareId || '')
      if (initialBaseId && initialCompareId) {
        handleCompare(initialBaseId, initialCompareId)
      }
    }
  }, [isOpen, initialBaseId, initialCompareId, handleCompare])

  const handleSwap = () => {
    setBaseId(compareId)
    setCompareId(baseId)
    if (compareResult) {
      // 交换结果
      setCompareResult({
        ...compareResult,
        base: compareResult.compare,
        compare: compareResult.base,
        original: compareResult.modified,
        modified: compareResult.original,
      })
    }
  }

  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      python: 'bg-blue-100 text-blue-700',
      javascript: 'bg-yellow-100 text-yellow-700',
      typescript: 'bg-blue-100 text-blue-700',
      java: 'bg-orange-100 text-orange-700',
      cpp: 'bg-purple-100 text-purple-700',
      go: 'bg-cyan-100 text-cyan-700',
      rust: 'bg-orange-100 text-orange-700',
    }
    return colors[lang] || 'bg-gray-100 text-gray-700'
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <GitCompare className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">版本对比</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'select' | 'result')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 w-auto justify-start">
            <TabsTrigger value="select">选择版本</TabsTrigger>
            <TabsTrigger value="result" disabled={!compareResult}>
              对比结果
            </TabsTrigger>
          </TabsList>

          {/* 选择版本 */}
          <TabsContent value="select" className="flex-1 overflow-hidden m-0">
            <div className="flex h-full">
              {/* 左侧：选择基础版本 */}
              <div className="flex-1 border-r p-4 overflow-y-auto">
                <h3 className="mb-3 text-sm font-medium text-gray-500">基础版本</h3>
                <div className="space-y-2">
                  {allVersions.map((version) => (
                    <button
                      key={`base-${version.id}`}
                      onClick={() => setBaseId(version.id)}
                      disabled={version.id === compareId}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        baseId === version.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      } ${version.id === compareId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getLanguageColor(version.language)}>
                            {version.language}
                          </Badge>
                          {version.id === root.id && (
                            <span className="text-xs text-indigo-600 font-medium">根节点</span>
                          )}
                        </div>
                        {baseId === version.id && (
                          <Check className="h-4 w-4 text-indigo-500" />
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-1 mb-1">
                        {version.message || '无标题'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(version.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 中间：操作按钮 */}
              <div className="flex flex-col items-center justify-center gap-4 px-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSwap}
                  disabled={!baseId || !compareId}
                  className="rounded-full"
                >
                  <GitCompare className="h-4 w-4" />
                </Button>
              </div>

              {/* 右侧：选择对比版本 */}
              <div className="flex-1 p-4 overflow-y-auto">
                <h3 className="mb-3 text-sm font-medium text-gray-500">对比版本</h3>
                <div className="space-y-2">
                  {allVersions.map((version) => (
                    <button
                      key={`compare-${version.id}`}
                      onClick={() => setCompareId(version.id)}
                      disabled={version.id === baseId}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        compareId === version.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      } ${version.id === baseId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getLanguageColor(version.language)}>
                            {version.language}
                          </Badge>
                          {version.id === root.id && (
                            <span className="text-xs text-indigo-600 font-medium">根节点</span>
                          )}
                        </div>
                        {compareId === version.id && (
                          <Check className="h-4 w-4 text-indigo-500" />
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-1 mb-1">
                        {version.message || '无标题'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(version.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="border-t px-6 py-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  {baseId && compareId ? (
                    <span>
                      已选择：<span className="font-medium">{allVersions.find(v => v.id === baseId)?.message || '无标题'}</span>
                      {' → '}
                      <span className="font-medium">{allVersions.find(v => v.id === compareId)?.message || '无标题'}</span>
                    </span>
                  ) : (
                    '请选择两个版本进行对比'
                  )}
                </div>
                <Button
                  onClick={() => handleCompare()}
                  disabled={!baseId || !compareId || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <GitCompare className="mr-2 h-4 w-4" />
                  )}
                  开始对比
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* 对比结果 */}
          <TabsContent value="result" className="flex-1 overflow-hidden m-0 flex flex-col">
            {compareResult && (
              <>
                {/* 信息栏 */}
                <div className="border-b px-6 py-3 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">
                      基础：<span className="font-medium text-gray-900 dark:text-gray-100">{compareResult.base.message || '无标题'}</span>
                    </span>
                    <GitCompare className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-500">
                      对比：<span className="font-medium text-gray-900 dark:text-gray-100">{compareResult.compare.message || '无标题'}</span>
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSwap}>
                    交换方向
                  </Button>
                </div>

                {/* Diff 视图 */}
                <div className="flex-1 p-4 overflow-hidden">
                  <LazyDiffViewer
                    original={compareResult.original}
                    modified={compareResult.modified}
                    language={compareResult.base.language}
                  />
                </div>

                {/* 底部栏 */}
                <div className="border-t px-6 py-3 flex items-center justify-between">
                  {!compareResult.is_same_root && (
                    <Alert className="m-0 py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>这两个版本来自不同的版本树</AlertDescription>
                    </Alert>
                  )}
                  <div className="flex-1" />
                  <Button variant="outline" onClick={() => setActiveTab('select')}>
                    重新选择
                  </Button>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
