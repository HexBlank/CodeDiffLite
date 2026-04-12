import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Code2, Lock, Unlock, GitFork, EyeOff, Trash2,
  ExternalLink, MoreVertical, ChevronLeft, ChevronRight, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Header } from '@/components/layout/Header'
import { useAuth } from '@/contexts/AuthContext'
import { api, type MySnippetItem, type MySnippetsResponse } from '@/lib/api'
import { myQueryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'
import { formatDistanceToNow } from '@/lib/date'

const PAGE_SIZE = 50

export function MySnippetsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { isLoggedIn, isLoading: authLoading } = useAuth()
  const [activeTab, setActiveTab] = useState('active')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<MySnippetItem | null>(null)

  const status = activeTab === 'archived' ? 0 : 1

  const snippetsQuery = useQuery<MySnippetsResponse>({
    queryKey: myQueryKeys.snippetList({ page, pageSize: PAGE_SIZE, status }),
    queryFn: () => api.getMySnippets(page, PAGE_SIZE, status),
    enabled: isLoggedIn,
  })

  // 重置页码
  useEffect(() => {
    setPage(1)
  }, [activeTab])

  const updateSnippetMutation = useMutation({
    mutationFn: (payload: {
      snippetId: string
      data: { is_public?: boolean; allow_fork?: boolean; status?: number }
      successMessage: string
    }) => api.updateSnippet(payload.snippetId, payload.data),
    onSuccess: (_data, variables) => {
      toast.success(variables.successMessage)
      queryClient.invalidateQueries({ queryKey: myQueryKeys.snippets() })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '操作失败')
    },
  })

  const deleteSnippetMutation = useMutation({
    mutationFn: (snippetId: string) => api.deleteSnippet(snippetId),
    onSuccess: () => {
      toast.success('已删除')
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: myQueryKeys.snippets() })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      toast.error('请先登录')
      navigate('/')
    }
  }, [authLoading, isLoggedIn, navigate])

  const snippets = snippetsQuery.data?.items ?? []

  const handleArchive = (snippet: MySnippetItem) => {
    const newStatus = snippet.status === 1 ? 0 : 1
    updateSnippetMutation.mutate({
      snippetId: snippet.id,
      data: { status: newStatus },
      successMessage: newStatus === 0 ? '已归档' : '已恢复',
    })
  }

  const handleTogglePublic = (snippet: MySnippetItem) => {
    updateSnippetMutation.mutate({
      snippetId: snippet.id,
      data: { is_public: !snippet.is_public },
      successMessage: snippet.is_public ? '已设为私密' : '已设为公开',
    })
  }

  const handleToggleFork = (snippet: MySnippetItem) => {
    updateSnippetMutation.mutate({
      snippetId: snippet.id,
      data: { allow_fork: !snippet.allow_fork },
      successMessage: snippet.allow_fork ? '已禁止 Fork' : '已允许 Fork',
    })
  }

  const handleDelete = () => {
    if (!deleteTarget || deleteSnippetMutation.isPending) {
      return
    }

    deleteSnippetMutation.mutate(deleteTarget.id)
  }

  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      python: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      javascript: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
      typescript: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
      java: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
      cpp: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      go: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
      rust: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    }
    return colors[lang] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
  }

  const renderPagination = () => {
    const totalPages = snippetsQuery.data?.total_pages || 1
    if (totalPages <= 1) return null

    return (
      <div className="mt-8 flex justify-center items-center gap-4">
        <Button 
          variant="outline" 
          size="sm" 
          disabled={page <= 1} 
          onClick={() => setPage(p => Math.max(1, p - 1))}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          上一页
        </Button>
        <span className="text-sm text-muted-foreground">
          第 {page} / {totalPages} 页
        </span>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={page >= totalPages} 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
        >
          下一页
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    )
  }

  if (authLoading || (!isLoggedIn && !authLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 container mx-auto max-w-6xl p-4">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">我的代码库</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="active">进行中</TabsTrigger>
            <TabsTrigger value="archived">已归档</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {snippetsQuery.isPending ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : snippetsQuery.isError ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Code2 className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">加载代码片段失败</p>
                </CardContent>
              </Card>
            ) : snippets.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <Code2 className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">暂无代码片段</p>
                  <Button className="mt-4" onClick={() => navigate('/')}>创建新代码</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {snippets.map((snippet) => (
                  <Card key={snippet.id} className="group hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={getLanguageColor(snippet.language)}>
                            {snippet.language}
                          </Badge>
                          {!snippet.is_public && (
                            <Lock className="h-3.5 w-3.5 text-amber-500" />
                          )}
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTogglePublic(snippet)}>
                              {snippet.is_public ? (
                                <>
                                  <Lock className="mr-2 h-4 w-4" />
                                  设为私密
                                </>
                              ) : (
                                <>
                                  <Unlock className="mr-2 h-4 w-4" />
                                  设为公开
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleFork(snippet)}>
                              <GitFork className="mr-2 h-4 w-4" />
                              {snippet.allow_fork ? '禁止 Fork' : '允许 Fork'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchive(snippet)}>
                              <EyeOff className="mr-2 h-4 w-4" />
                              归档
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(snippet)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-sm font-medium mt-2 line-clamp-1">
                        {snippet.message || '无标题'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg line-clamp-3 overflow-hidden">
                        {snippet.code_preview}
                      </pre>
                      <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                        <span>{formatDistanceToNow(snippet.created_at)}</span>
                        <div className="flex items-center gap-3">
                          {snippet.descendants_count > 0 && (
                            <span className="flex items-center gap-1">
                              <GitFork className="h-3 w-3" />
                              {snippet.descendants_count}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => navigate(`/${snippet.id}`)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}            {renderPagination()}          </TabsContent>

          <TabsContent value="archived" className="space-y-4">
            {snippetsQuery.isPending ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : snippetsQuery.isError ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <EyeOff className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">加载归档代码失败</p>
                </CardContent>
              </Card>
            ) : snippets.length === 0 ? (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <EyeOff className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-500">暂无归档代码</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {snippets.map((snippet) => (
                  <Card key={snippet.id} className="opacity-60 hover:opacity-100 transition-opacity">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={getLanguageColor(snippet.language)}>
                            {snippet.language}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleArchive(snippet)}>
                              <Unlock className="mr-2 h-4 w-4" />
                              恢复
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(snippet)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-sm font-medium mt-2 line-clamp-1">
                        {snippet.message || '无标题'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-900 p-2 rounded-lg line-clamp-3 overflow-hidden">
                        {snippet.code_preview}
                      </pre>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {renderPagination()}
          </TabsContent>
        </Tabs>
      </main>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作将永久删除该代码片段及其所有衍生版本，无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteSnippetMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
