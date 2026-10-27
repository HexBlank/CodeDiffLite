import { useState, useEffect, useCallback, useRef } from 'react'
import { X, GitCompare, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api, getLanguageBadgeClass, Snippet, SnippetListItem } from '@/lib/api'
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

  // handleCompare 随选择变化而变化，不能放进下面 effect 的依赖，否则每次选择都会被重置
  const handleCompareRef = useRef(handleCompare)
  handleCompareRef.current = handleCompare

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
        handleCompareRef.current(initialBaseId, initialCompareId)
      }
    }
  }, [isOpen, initialBaseId, initialCompareId])

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm md:p-4">
      {/* 移动端全屏；对比结果需要固定高度，编辑器才能在内部滚动 */}
      <div className={`relative flex h-dvh w-full max-w-6xl flex-col bg-card shadow-2xl overflow-hidden md:rounded-2xl ${activeTab === 'result' ? 'md:h-[90dvh]' : 'md:h-auto md:max-h-[90dvh]'}`}>
        {/* 头部 */}
        <div className="flex items-center justify-between border-b px-4 py-2 md:px-6 md:py-4">
          <div className="flex items-center gap-3">
            <GitCompare className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold">版本对比</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'select' | 'result')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-4 mt-3 w-auto justify-start md:mx-6 md:mt-4">
            <TabsTrigger value="select">选择版本</TabsTrigger>
            <TabsTrigger value="result" disabled={!compareResult}>
              对比结果
            </TabsTrigger>
          </TabsList>

          {/* 选择版本 */}
          <TabsContent value="select" className="flex-1 min-h-0 overflow-hidden m-0 flex flex-col data-[state=inactive]:hidden">
            <div className="flex flex-1 min-h-0 flex-col md:flex-row">
              {/* 左侧：选择基础版本 */}
              <div className="flex-1 min-h-0 border-b p-4 overflow-y-auto md:border-b-0 md:border-r">
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">基础版本</h3>
                <div className="space-y-2">
                  {allVersions.map((version) => (
                    <button
                      key={`base-${version.id}`}
                      onClick={() => setBaseId(version.id)}
                      disabled={version.id === compareId}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        baseId === version.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-border hover:border-foreground/20'
                      } ${version.id === compareId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getLanguageBadgeClass(version.language)}>
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
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(version.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* 中间：操作按钮 */}
              <div className="hidden md:flex flex-col items-center justify-center gap-4 px-4">
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
              <div className="flex-1 min-h-0 p-4 overflow-y-auto">
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">对比版本</h3>
                <div className="space-y-2">
                  {allVersions.map((version) => (
                    <button
                      key={`compare-${version.id}`}
                      onClick={() => setCompareId(version.id)}
                      disabled={version.id === baseId}
                      className={`w-full rounded-lg border p-3 text-left transition-all ${
                        compareId === version.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                          : 'border-border hover:border-foreground/20'
                      } ${version.id === baseId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getLanguageBadgeClass(version.language)}>
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
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(version.created_at)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 底部操作栏 */}
            <div className="border-t px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6 md:py-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 truncate text-sm text-muted-foreground">
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
                  className="shrink-0"
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
          <TabsContent value="result" className="flex-1 min-h-0 overflow-hidden m-0 flex flex-col data-[state=inactive]:hidden">
            {compareResult && (
              <>
                {/* 信息栏 */}
                <div className="border-b px-4 py-2 md:px-6 md:py-3 flex items-center justify-between gap-3 bg-muted/50">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="text-muted-foreground">
                      基础：<span className="font-medium text-foreground">{compareResult.base.message || '无标题'}</span>
                    </span>
                    <GitCompare className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      对比：<span className="font-medium text-foreground">{compareResult.compare.message || '无标题'}</span>
                    </span>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0" onClick={handleSwap}>
                    交换方向
                  </Button>
                </div>

                {/* Diff 视图 */}
                <div className="flex-1 min-h-0 p-2 md:p-4 overflow-hidden">
                  <LazyDiffViewer
                    original={compareResult.original}
                    modified={compareResult.modified}
                    language={compareResult.base.language}
                  />
                </div>

                {/* 底部栏 */}
                <div className="border-t px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:px-6 md:py-3 flex items-center justify-between gap-3">
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
