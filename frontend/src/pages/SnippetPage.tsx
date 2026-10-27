import { useState, useCallback, useEffect, lazy, Suspense } from 'react'
import { flushSync } from 'react-dom'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Send,
  Loader2,
  Code2,
  GitCompare,
  Edit3,
  Copy,
  Check,
  Plus,
  MessageSquare,
  Clock,
  Users,
  ArrowLeft,
  GitFork,
  Image,
  Lock,
  MoreHorizontal,
  WrapText,
  Columns2,
  Rows2,
  Pencil,
} from 'lucide-react'
import { useHotkeys } from 'react-hotkeys-hook'
import { LazyCodeEditor, LazyDiffViewer } from '@/components/editor/LazyEditor'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { RestrictedShareDialog, ShareLinkDialog } from '@/components/ShareDialogs'
import { ThemeSubMenu, ThemeToggle } from '@/components/ThemeToggle'
import { ReplyList } from '@/components/ReplyList'
import { api, LANGUAGES, type LanguageValue } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { useCopy } from '@/hooks/use-copy'
import { useEditorFocused } from '@/hooks/use-editor-focus'
import { useIsTouch } from '@/hooks/use-mobile'
import { formatDistanceToNow } from '@/lib/date'
import { cn } from '@/lib/utils'

const VersionTreeVisualizer = lazy(() => import('@/components/VersionTreeVisualizer').then(m => ({ default: m.VersionTreeVisualizer })))
const CodeShareImage = lazy(() => import('@/components/CodeShareImage').then(m => ({ default: m.CodeShareImage })))
const EditorKeyboardBar = lazy(() => import('@/components/editor/EditorKeyboardBar').then(m => ({ default: m.EditorKeyboardBar })))
const VersionCompareDialog = lazy(() => import('@/components/VersionCompareDialog').then(m => ({ default: m.VersionCompareDialog })))

type ViewMode = 'diff' | 'edit' | 'tree'

export function SnippetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isLoggedIn } = useAuth()
  const editorFocused = useEditorFocused()
  const isTouch = useIsTouch()
  const { copied: codeCopied, copy: copyCode } = useCopy('代码已复制')

  // 状态
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<LanguageValue>('plaintext')
  const [message, setMessage] = useState('')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [submitDrawerOpen, setSubmitDrawerOpen] = useState(false)
  const [repliesDrawerOpen, setRepliesDrawerOpen] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [showShareImage, setShowShareImage] = useState(false)
  const [showPrivateShare, setShowPrivateShare] = useState(false)
  const [showVersionCompare, setShowVersionCompare] = useState(false)
  const [compareIds, setCompareIds] = useState<{base?: string, compare?: string}>({})
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on')
  const [isSideBySide, setIsSideBySide] = useState<boolean>(typeof window !== 'undefined' && window.innerWidth >= 768)
  // 触摸设备默认只读：滑动浏览、长按选择复制都不会弹出键盘，点"修改"后才可编辑
  const [editing, setEditing] = useState(false)
  const editorReadOnly = isTouch && !editing

  // 获取当前 snippet
  const snippetQuery = useQuery({
    queryKey: ['snippet', id],
    queryFn: () => api.getSnippet(id!),
    enabled: !!id,
  })

  // 获取版本树
  const treeQuery = useQuery({
    queryKey: ['tree', id],
    queryFn: () => api.getTree(id!),
    enabled: !!id,
  })

  const snippet = snippetQuery.data
  const hasDiff = !!snippet?.parent_code
  const replies = treeQuery.data?.descendants || []
  const isOriginal = snippet?.depth === 0
  const isOwner = treeQuery.data?.is_owner || false
  const showTreeTab = isOwner && replies.length > 0
  const showReplies = isOwner && isOriginal && replies.length > 0

  // 初始化代码
  useEffect(() => {
    if (snippet) {
      setCode(snippet.code)
      setLanguage(snippet.language as LanguageValue)
      setViewMode(hasDiff ? 'diff' : 'edit')
      setEditing(false)
    }
  }, [snippet, hasDiff])

  // 保存变更
  const shareMutation = useMutation({
    mutationFn: () =>
      api.share({
        code,
        language,
        parent_id: id,
        message: message || undefined,
      }),
    onSuccess: (data) => {
      setSavedId(data.id)
      setSubmitDrawerOpen(false)
      setShareDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ['tree', id] })
      toast.success('修改已保存', {
        description: '你的修改版本已创建',
      })
    },
    onError: (error) => {
      toast.error('保存失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      })
    },
  })

  const handleShare = useCallback(() => {
    if (!code.trim()) {
      toast.error('代码不能为空')
      return
    }
    shareMutation.mutate()
  }, [code, shareMutation])

  // 全局热键
  useHotkeys('ctrl+s, meta+s', (e) => {
    e.preventDefault()
    if (!shareDialogOpen && viewMode !== 'tree') {
      handleShare()
    }
  }, { enableOnFormTags: true, enableOnContentEditable: true })

  const shareUrl = savedId ? `${window.location.origin}/${savedId}` : ''

  const startEditing = () => {
    // 同步渲染，让编辑器在这次点击里就变为可编辑并聚焦，iOS 才会弹出键盘
    flushSync(() => setEditing(true))
  }

  const finishEditing = () => {
    ;(document.activeElement as HTMLElement | null)?.blur()
    setEditing(false)
  }

  const openVersionCompare = () => {
    setCompareIds({})
    setShowVersionCompare(true)
  }

  // 加载状态
  if (snippetQuery.isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">加载代码中...</p>
        </div>
      </div>
    )
  }

  // 错误状态
  if (snippetQuery.isError || !snippet) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="text-center animate-fade-up">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Code2 className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">代码不存在</h2>
          <p className="text-muted-foreground mb-6">该链接可能已失效或代码已被删除</p>
          <Button onClick={() => navigate('/')}>
            <Plus className="w-4 h-4 mr-2" />
            创建新代码
          </Button>
        </div>
      </div>
    )
  }

  const viewTabs = (
    <>
      {hasDiff && (
        <TabsTrigger value="diff" className="flex-1 md:flex-none text-xs gap-1.5 data-[state=active]:bg-background">
          <GitCompare className="w-3.5 h-3.5" />
          <span>对比<span className="hidden md:inline">视图</span></span>
        </TabsTrigger>
      )}
      <TabsTrigger value="edit" className="flex-1 md:flex-none text-xs gap-1.5 data-[state=active]:bg-background">
        <Edit3 className="w-3.5 h-3.5" />
        <span className="md:hidden">代码</span>
        <span className="hidden md:inline">编辑模式</span>
      </TabsTrigger>
      {showTreeTab && (
        <TabsTrigger value="tree" className="flex-1 md:flex-none text-xs gap-1.5 data-[state=active]:bg-background">
          <GitFork className="w-3.5 h-3.5" />
          版本树
        </TabsTrigger>
      )}
    </>
  )
  const hasMultipleViews = hasDiff || showTreeTab

  return (
    <div className="h-[var(--app-height,100dvh)] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/50 z-40 bg-background shrink-0">
        <div className="max-w-7xl mx-auto px-2 md:px-4 h-12 md:h-16 flex items-center gap-1 md:gap-4">
          {/* Left */}
          <div className="flex items-center gap-1 md:gap-3 min-w-0 flex-1 md:flex-none">
            <Link
              to="/"
              aria-label="返回首页"
              className="flex items-center gap-2 h-10 px-2 md:px-0 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <div className="hidden md:flex w-8 h-8 rounded-md bg-primary items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2">
                <span className="font-mono text-sm text-muted-foreground truncate">
                  #{id?.substring(0, 8)}
                </span>
                <Badge variant={isOriginal ? 'outline' : 'secondary'} className="text-[10px] md:text-xs px-1.5 md:px-2.5 shrink-0">
                  {isOriginal ? '原始版本' : '修改版本'}
                </Badge>
              </div>
              <p className="text-[11px] md:text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(snippet.created_at)}
              </p>
            </div>
          </div>

          {/* Center - View Toggle（桌面端） */}
          <div className="hidden md:flex flex-1 justify-center">
            {hasMultipleViews && (
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList className="bg-secondary/50">{viewTabs}</TabsList>
              </Tabs>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <Select value={language} onValueChange={(v) => setLanguage(v as LanguageValue)}>
              <SelectTrigger
                aria-label="代码语言"
                className="w-[104px] md:w-[130px] h-9 text-xs md:text-sm bg-secondary/50 border-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="hidden md:inline-flex h-9"
              onClick={() => setShowShareImage(true)}
            >
              <Image className="w-4 h-4 mr-1.5" />
              生成分享图
            </Button>

            <ThemeToggle className="hidden md:inline-flex" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 md:h-9 md:w-9 shrink-0" aria-label="更多操作">
                  <MoreHorizontal className="w-5 h-5 md:w-4 md:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                <DropdownMenuItem className="md:hidden py-2.5" onClick={() => setShowShareImage(true)}>
                  <Image className="w-4 h-4 mr-2" />
                  生成分享图
                </DropdownMenuItem>
                {treeQuery.data && (
                  <DropdownMenuItem className="py-2.5 md:py-1.5" onClick={openVersionCompare}>
                    <GitCompare className="w-4 h-4 mr-2" />
                    版本对比
                  </DropdownMenuItem>
                )}
                {isOwner && isLoggedIn && (
                  <DropdownMenuItem className="py-2.5 md:py-1.5" onClick={() => setShowPrivateShare(true)}>
                    <Lock className="w-4 h-4 mr-2" />
                    限制性分享
                  </DropdownMenuItem>
                )}
                <ThemeSubMenu className="md:hidden" />
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleShare}
              disabled={shareMutation.isPending}
              className="hidden md:inline-flex h-9 px-4 shadow-sm"
            >
              {shareMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              提交修改
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col p-2 md:p-4 min-h-0">
          {/* 修改说明（桌面端；移动端在提交时填写） */}
          {viewMode !== 'tree' && (
            <div className="hidden md:flex mb-3 items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/50 shrink-0">
              <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="描述你的修改（可选），如：修复了第3行的语法错误"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          )}

          {/* Toolbar */}
          <div className="flex items-center gap-1 md:gap-2 mb-2 p-1 md:p-1.5 shrink-0 bg-background/50 border rounded-lg">
            {/* 移动端视图切换 */}
            <div className="md:hidden flex-1 min-w-0">
              {hasMultipleViews && (
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                  <TabsList className="w-full h-9 bg-secondary/50">{viewTabs}</TabsList>
                </Tabs>
              )}
            </div>

            {viewMode !== 'tree' && (
              <>
                {isTouch && (
                  editing ? (
                    <Button size="sm" className="h-9 px-3 text-xs gap-1.5" onClick={finishEditing}>
                      <Check className="w-4 h-4" />
                      完成
                    </Button>
                  ) : (
                    <Button variant="secondary" size="sm" className="h-9 px-3 text-xs gap-1.5" onClick={startEditing}>
                      <Pencil className="w-4 h-4" />
                      修改
                    </Button>
                  )
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  aria-pressed={wordWrap === 'on'}
                  aria-label="自动换行"
                  className={cn('h-9 md:h-8 px-2.5 text-xs gap-2', wordWrap === 'on' && 'bg-secondary')}
                  onClick={() => setWordWrap(w => w === 'on' ? 'off' : 'on')}
                >
                  <WrapText className="w-4 h-4 md:w-3.5 md:h-3.5" />
                  <span className="hidden md:inline">自动换行</span>
                </Button>
                {hasDiff && viewMode === 'diff' && (
                  <div className="hidden md:flex items-center gap-2">
                    <div className="w-px h-4 bg-border/50 mx-1" />
                    <Button variant="ghost" size="sm" aria-pressed={isSideBySide} className={cn('h-8 px-2.5 text-xs gap-2', isSideBySide && 'bg-secondary')} onClick={() => setIsSideBySide(true)}>
                      <Columns2 className="w-3.5 h-3.5" />
                      并排对比
                    </Button>
                    <Button variant="ghost" size="sm" aria-pressed={!isSideBySide} className={cn('h-8 px-2.5 text-xs gap-2', !isSideBySide && 'bg-secondary')} onClick={() => setIsSideBySide(false)}>
                      <Rows2 className="w-3.5 h-3.5" />
                      内联对比
                    </Button>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyCode(code)}
                  className="md:ml-auto h-9 md:h-8 px-2.5 text-xs gap-2"
                  aria-label="复制全部代码"
                  title="复制全部代码"
                >
                  {codeCopied ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  <span className="hidden md:inline">复制</span>
                </Button>
              </>
            )}
          </div>

          {viewMode === 'tree' && isOwner && treeQuery.data ? (
            <div className="flex-1 min-h-0 overflow-auto">
              <Suspense fallback={<div className="flex items-center justify-center h-full text-muted-foreground">加载版本树...</div>}>
                <VersionTreeVisualizer
                  root={treeQuery.data.root}
                  descendants={treeQuery.data.descendants}
                  currentId={id}
                  onCompare={(baseId, compareId) => {
                    setCompareIds({ base: baseId, compare: compareId })
                    setShowVersionCompare(true)
                  }}
                />
              </Suspense>
            </div>
          ) : (
            <div className="flex-1 min-h-0 editor-wrapper">
              {hasDiff && viewMode === 'diff' ? (
                <LazyDiffViewer
                  original={snippet.parent_code!}
                  modified={code}
                  language={language}
                  onModifiedChange={setCode}
                  readOnly={editorReadOnly}
                  wordWrap={wordWrap}
                  renderSideBySide={isSideBySide}
                />
              ) : (
                <LazyCodeEditor
                  value={code}
                  onChange={setCode}
                  language={language}
                  readOnly={editorReadOnly}
                  wordWrap={wordWrap}
                />
              )}
            </div>
          )}
        </div>

        {/* Replies Panel - 只有原始作者才能看到；移动端改为底部抽屉 */}
        {showReplies && viewMode !== 'tree' && (
          <div className="hidden md:block lg:w-80 border-t lg:border-t-0 lg:border-l border-border/50 bg-muted/30 shrink-0 max-h-64 lg:max-h-none overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <h3 className="font-medium text-sm">收到的修改</h3>
                  <p className="text-xs text-muted-foreground">{replies.length} 个回复</p>
                </div>
              </div>
              <ReplyList replies={replies} onSelect={(replyId) => navigate(`/${replyId}`)} />
            </div>
          </div>
        )}
      </main>

      {/* 触摸设备编辑代码时：软键盘上方显示辅助按键栏 */}
      {isTouch && editorFocused && (
        <Suspense fallback={null}>
          <EditorKeyboardBar />
        </Suspense>
      )}

      {/* 移动端底部操作栏：编辑代码（软键盘弹出）时隐藏 */}
      {!editorFocused && (
        <div className="md:hidden shrink-0 border-t border-border/50 bg-background px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex gap-2">
          {showReplies && (
            <Button variant="outline" className="h-11 gap-2" onClick={() => setRepliesDrawerOpen(true)}>
              <Users className="w-4 h-4" />
              收到的修改
              <Badge variant="secondary" className="px-1.5">{replies.length}</Badge>
            </Button>
          )}
          <Button className="h-11 flex-1 gap-2" onClick={() => setSubmitDrawerOpen(true)}>
            <Send className="w-4 h-4" />
            提交修改
          </Button>
        </div>
      )}

      {/* 移动端：填写修改说明并提交 */}
      <ResponsiveDialog
        open={submitDrawerOpen}
        onOpenChange={setSubmitDrawerOpen}
        title={<><Send className="w-5 h-5" />提交修改</>}
        description="提交后会生成新的版本链接，发给提问者即可查看你的修改"
        className="space-y-4"
      >
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="描述你的修改（可选），如：修复了第3行的语法错误"
          className="w-full resize-none rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none focus-visible:ring-1 focus-visible:ring-ring placeholder:text-muted-foreground/60"
        />
        <Button className="h-11 w-full" onClick={handleShare} disabled={shareMutation.isPending}>
          {shareMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          提交
        </Button>
      </ResponsiveDialog>

      {/* 移动端：收到的修改 */}
      {showReplies && (
        <ResponsiveDialog
          open={repliesDrawerOpen}
          onOpenChange={setRepliesDrawerOpen}
          title={<><Users className="w-5 h-5" />收到的修改</>}
          description={`${replies.length} 个回复`}
        >
          <ReplyList
            replies={replies}
            onSelect={(replyId) => {
              setRepliesDrawerOpen(false)
              navigate(`/${replyId}`)
            }}
          />
        </ResponsiveDialog>
      )}

      {/* Share Dialog */}
      <ShareLinkDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={shareUrl}
        title="修改已保存"
        description="分享此链接给提问者，让对方查看你的修改建议"
        viewLabel="查看修改"
        onView={() => {
          setShareDialogOpen(false)
          setTimeout(() => navigate(`/${savedId}`), 100)
        }}
      />

      {/* Code Share Image Dialog */}
      <Suspense fallback={null}>
        <CodeShareImage
          code={code}
          language={language}
          message={snippet.message}
          currentUrl={window.location.href}
          isOpen={showShareImage}
          onClose={() => setShowShareImage(false)}
        />
      </Suspense>

      {/* Private Share Dialog */}
      <RestrictedShareDialog
        open={showPrivateShare}
        onOpenChange={setShowPrivateShare}
        getSnippetId={async () => id!}
      />

      {/* Version Compare Dialog */}
      {treeQuery.data && (
        <Suspense fallback={null}>
          <VersionCompareDialog
            rootId={treeQuery.data.root.id}
            root={treeQuery.data.root}
            descendants={treeQuery.data.descendants}
            isOpen={showVersionCompare}
            onClose={() => {
              setShowVersionCompare(false)
              setCompareIds({})
            }}
            initialBaseId={compareIds.base}
            initialCompareId={compareIds.compare}
          />
        </Suspense>
      )}
    </div>
  )
}
