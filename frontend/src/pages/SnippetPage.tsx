import { useState, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Share2,
  Loader2,
  Code2,
  GitCompare,
  Edit3,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Plus,
  MessageSquare,
  Clock,
  Users,
  ArrowLeft,
  GitFork,
  Image,
  Lock,
  MoreVertical,
  AlignLeft,
  Columns,
  Split,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api, LANGUAGES, type LanguageValue, type SnippetListItem } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { formatDistanceToNow } from '@/lib/date'
import { lazy, Suspense } from 'react'

const VersionTreeVisualizer = lazy(() => import('@/components/VersionTreeVisualizer').then(m => ({ default: m.VersionTreeVisualizer })))
const CodeShareImage = lazy(() => import('@/components/CodeShareImage').then(m => ({ default: m.CodeShareImage })))
const VersionCompareDialog = lazy(() => import('@/components/VersionCompareDialog').then(m => ({ default: m.VersionCompareDialog })))

type ViewMode = 'diff' | 'edit' | 'tree'

export function SnippetPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isLoggedIn } = useAuth()

  // 状态
  const [viewMode, setViewMode] = useState<ViewMode>('edit')
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<LanguageValue>('plaintext')
  const [message, setMessage] = useState('')
  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [showShareImage, setShowShareImage] = useState(false)
  const [showPrivateShare, setShowPrivateShare] = useState(false)
  const [showVersionCompare, setShowVersionCompare] = useState(false)
  const [compareIds, setCompareIds] = useState<{base?: string, compare?: string}>({})
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on')
  const [isSideBySide, setIsSideBySide] = useState<boolean>(typeof window !== 'undefined' && window.innerWidth >= 768)

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

  // 初始化代码
  useEffect(() => {
    if (snippet) {
      setCode(snippet.code)
      setLanguage(snippet.language as LanguageValue)
      setViewMode(hasDiff ? 'diff' : 'edit')
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

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareUrl)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = shareUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      toast.success('链接已复制')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  const handleCopyCode = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = code
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCodeCopied(true)
      toast.success('代码已复制')
      setTimeout(() => setCodeCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  // 加载状态
  if (snippetQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
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
      <div className="min-h-screen flex items-center justify-center">
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

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 z-50 bg-background shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left */}
          <div className="flex items-center gap-3">
            <Link 
              to="/"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <Code2 className="w-4 h-4 text-primary-foreground" />
              </div>
            </Link>
            
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  #{id?.substring(0, 8)}
                </span>
                {isOriginal ? (
                  <Badge variant="outline" className="text-xs">
                    原始版本
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    修改版本
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />
                {formatDistanceToNow(snippet.created_at)}
              </p>
            </div>
          </div>

          {/* Center - View Toggle */}
          <div className="hidden sm:flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList className="bg-secondary/50">
                {hasDiff && (
                  <TabsTrigger value="diff" className="text-xs gap-1.5 data-[state=active]:bg-background">
                    <GitCompare className="w-3.5 h-3.5" />
                    对比视图
                  </TabsTrigger>
                )}
                <TabsTrigger value="edit" className="text-xs gap-1.5 data-[state=active]:bg-background">
                  <Edit3 className="w-3.5 h-3.5" />
                  编辑模式
                </TabsTrigger>
                {isOwner && replies.length > 0 && (
                  <TabsTrigger value="tree" className="text-xs gap-1.5 data-[state=active]:bg-background">
                    <GitFork className="w-3.5 h-3.5" />
                    版本树
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
            
            {/* 版本对比按钮 */}
            {treeQuery.data && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCompareIds({})
                  setShowVersionCompare(true)
                }}
                className="gap-1.5"
              >
                <GitCompare className="w-3.5 h-3.5" />
                版本对比
              </Button>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* 语言选择器 */}
            <Select value={language} onValueChange={(v) => setLanguage(v as LanguageValue)}>
              <SelectTrigger className="w-[100px] sm:w-[130px] h-9 text-xs sm:text-sm bg-secondary/50 border-0">
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

            {/* 生成分享图 */}
            <Button 
              variant="outline" 
              size="sm"
              className="h-9 px-3 hover:bg-transparent hover:shadow-md hover:-translate-y-px transition-all duration-300"
              onClick={() => setShowShareImage(true)}
            >
              <Image className="w-4 h-4 sm:mr-1.5" />
              <span className="hidden sm:inline">生成分享图</span>
            </Button>

            {/* 更多操作 */}
            {isOwner && isLoggedIn && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 hover:bg-transparent hover:shadow-md hover:-translate-y-px transition-all duration-300">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowPrivateShare(true)}>
                    <Lock className="w-4 h-4 mr-2" />
                    限制性分享
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* 提交修改按钮 */}
            <Button
              onClick={handleShare}
              disabled={shareMutation.isPending}
              className="h-9 px-4 hover:bg-primary shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-300"
            >
              {shareMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Share2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">提交修改</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl mx-auto w-full overflow-hidden">
        {/* Editor Area */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 min-h-0">
          {/* Mobile View Toggle */}
          <div className="sm:hidden mb-2 shrink-0">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-full">
              <TabsList className="w-full bg-secondary/50">
                {hasDiff && (
                  <TabsTrigger value="diff" className="flex-1 text-xs gap-1.5">
                    <GitCompare className="w-3.5 h-3.5" />
                    对比
                  </TabsTrigger>
                )}
                <TabsTrigger value="edit" className="flex-1 text-xs gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  编辑
                </TabsTrigger>
                {isOwner && replies.length > 0 && (
                  <TabsTrigger value="tree" className="flex-1 text-xs gap-1.5">
                    <GitFork className="w-3.5 h-3.5" />
                    树
                  </TabsTrigger>
                )}
              </TabsList>
            </Tabs>
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
              </Suspense></div>
          ) : (
            <>
              {/* 修改说明输入 */}
              <div className="mb-2 sm:mb-3 flex gap-2 shrink-0">
                <div className="flex-1 flex items-center gap-2 p-3 rounded-lg bg-secondary/30 border border-border/50">
                  <MessageSquare className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="描述你的修改（可选），如：修复了第3行的语法错误"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>
                

              



              
              {/* Editor Toolbar */}
              <div className="flex items-center gap-2 mb-2 p-1.5 shrink-0 bg-background/50 border rounded-lg overflow-x-auto">
                <Button variant="ghost" size="sm" className={`h-8 px-2.5 text-xs gap-2 ${wordWrap === 'on' ? 'bg-secondary' : ''}`} onClick={() => setWordWrap(w => w === 'on' ? 'off' : 'on')}>
                  <AlignLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">自动换行</span>
                </Button>
                {hasDiff && viewMode === 'diff' && (
                  <>
                    <div className="w-px h-4 bg-border/50 mx-1" />
                    <Button variant="ghost" size="sm" className={`h-8 px-2.5 text-xs gap-2 ${isSideBySide ? 'bg-secondary' : ''}`} onClick={() => setIsSideBySide(true)}>
                      <Columns className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">并排对比</span>
                    </Button>
                    <Button variant="ghost" size="sm" className={`h-8 px-2.5 text-xs gap-2 ${!isSideBySide ? 'bg-secondary' : ''}`} onClick={() => setIsSideBySide(false)}>
                      <Split className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">内联对比</span>
                    </Button>
                  </>
                )}
                
                {/* Copy Button Moved to Toolbar (Right Aligned) */}
                <div className="ml-auto flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-8 w-8 px-0"
                    title="复制当前代码"
                  >
                    {codeCopied ? (
                      <Check className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
                {/* Editor */}
              <div className="flex-1 min-h-0 editor-wrapper">
                {hasDiff && viewMode === 'diff' ? (
                  <LazyDiffViewer
                    original={snippet.parent_code!}
                    modified={code}
                    language={language}
                    onModifiedChange={setCode}
                    wordWrap={wordWrap}
                    renderSideBySide={isSideBySide}
                  />
                ) : (
                  <LazyCodeEditor
                    value={code}
                    onChange={setCode}
                    language={language}
                    wordWrap={wordWrap}
                  />
                )}
              </div>
            </>
          )}
        </div>

        {/* Replies Panel - 只有原始作者才能看到 */}
        {isOwner && isOriginal && replies.length > 0 && viewMode !== 'tree' && (
          <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-border/50 bg-muted/30 shrink-0 max-h-64 lg:max-h-none overflow-y-auto">
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium text-sm">收到的修改</h3>
                    <p className="text-xs text-muted-foreground">{replies.length} 个回复</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                {replies.map((reply) => (
                  <ReplyCard
                    key={reply.id}
                    reply={reply}
                    onClick={() => navigate(`/${reply.id}`)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5" />
              修改已保存
            </DialogTitle>
            <DialogDescription>
              分享此链接给提问者，让他查看你的修改建议
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex gap-2">
              <div 
                className="flex-1 flex items-center bg-muted/50 rounded-lg px-3 py-2 border border-border cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={handleCopy}
                title="点击复制"
              >
                <span className="flex-1 text-sm font-mono truncate select-none">
                  {shareUrl}
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShareDialogOpen(false)}>
                继续编辑
              </Button>
              <Button className="flex-1" onClick={() => {
                setShareDialogOpen(false)
                setTimeout(() => navigate(`/${savedId}`), 100)
              }}>
                查看修改
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
      <PrivateShareDialog
        snippetId={id!}
        isOpen={showPrivateShare}
        onClose={() => setShowPrivateShare(false)}
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

// 回复卡片组件
function ReplyCard({ reply, onClick }: { reply: SnippetListItem; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-secondary/50 hover:border-primary/30 transition-all group card-interactive"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-xs text-muted-foreground">
          #{reply.id.substring(0, 6)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(reply.created_at)}
        </span>
      </div>
      
      {reply.message ? (
        <p className="text-sm line-clamp-2 group-hover:text-primary transition-colors">
          {reply.message}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground font-mono line-clamp-2">
          {reply.code_preview}
        </p>
      )}

      <div className="flex items-center gap-1 mt-2 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
        查看修改
        <ChevronRight className="w-3 h-3" />
      </div>
    </button>
  )
}

// 私密分享对话框
function PrivateShareDialog({ 
  snippetId, 
  isOpen, 
  onClose 
}: { 
  snippetId: string
  isOpen: boolean
  onClose: () => void 
}) {
  const [password, setPassword] = useState('')
  const [expiresDays, setExpiresDays] = useState('7')
  const [isCreating, setIsCreating] = useState(false)
  const [shareResult, setShareResult] = useState<{ share_token: string; share_url: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const result = await api.createShare({
        snippet_id: snippetId,
        password: password || undefined,
        expires_days: expiresDays !== 'never' ? parseInt(expiresDays) : undefined,
      })
      setShareResult(result)
      toast.success('私密分享链接已创建')
    } catch (error: any) {
      toast.error(error.message || '创建失败')
    } finally {
      setIsCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!shareResult) return
    try {
      const fullUrl = `${window.location.origin}${shareResult.share_url}`
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(fullUrl)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = fullUrl
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      toast.success('链接已复制')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('复制失败')
    }
  }

  const handleClose = () => {
    setPassword('')
    setExpiresDays('7')
    setShareResult(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            创建限制性分享
          </DialogTitle>
          <DialogDescription>
            创建独立链接，可设置密码保护和过期时间
          </DialogDescription>
        </DialogHeader>

        {shareResult ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                链接已创建！{password ? ' 🔒 受密码保护' : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <div 
                className="flex-1 flex items-center bg-muted/50 rounded-lg px-3 py-2 border border-border cursor-pointer hover:bg-muted/70 transition-colors"
                onClick={handleCopy}
                title="点击复制"
              >
                <span className="flex-1 text-sm font-mono truncate select-none">
                  {`${window.location.origin}${shareResult.share_url}`}
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <Button className="w-full" onClick={handleClose}>
              完成
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>访问密码（可选）</Label>
              <Input
                type="password"
                placeholder="留空则无需密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                设置密码后，访问者需要输入密码才能查看代码
              </p>
            </div>

            <div className="space-y-2">
              <Label>过期时间</Label>
              <Select value={expiresDays} onValueChange={setExpiresDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1天后过期</SelectItem>
                  <SelectItem value="7">7天后过期</SelectItem>
                  <SelectItem value="30">30天后过期</SelectItem>
                  <SelectItem value="never">永不过期</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>
                取消
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={isCreating}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : '创建链接'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
