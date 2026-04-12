import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { adminApi } from '@/lib/admin-api'
import { adminQueryKeys } from '@/lib/query-keys'
import { LazyCodeEditor, LazyDiffViewer } from '@/components/editor/LazyEditor'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Calendar,
  Code2,
  ExternalLink,
  Eye,
  GitBranch,
  MessageSquare,
  Trash2,
  User,
} from 'lucide-react'

const idleSnippetDetailKey = [...adminQueryKeys.snippets(), 'detail', 'idle'] as const
const idleSnippetChildrenKey = [...adminQueryKeys.snippets(), 'children', 'idle'] as const

export default function SnippetDetailPage() {
  const queryClient = useQueryClient()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteMode, setDeleteMode] = useState<'single' | 'tree'>('single')
  const [childrenDialogOpen, setChildrenDialogOpen] = useState(false)

  const detailQuery = useQuery({
    queryKey: id ? adminQueryKeys.snippetDetail(id) : idleSnippetDetailKey,
    queryFn: () => adminApi.getSnippetDetail(id!),
    enabled: !!id,
  })

  const childrenQuery = useQuery({
    queryKey: id ? adminQueryKeys.snippetChildren(id) : idleSnippetChildrenKey,
    queryFn: () => adminApi.getSnippetChildren(id!),
    enabled: childrenDialogOpen && !!id,
  })

  const deleteMutation = useMutation({
    mutationFn: (mode: 'single' | 'tree') => {
      if (mode === 'tree') {
        return adminApi.deleteSnippetTree(id!)
      }

      return adminApi.deleteSnippet(id!)
    },
    onSuccess: (_data, mode) => {
      toast.success(mode === 'tree' ? '已删除代码及其所有衍生版本' : '删除成功')
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.all() })
      navigate('/admin/snippets')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const detail = detailQuery.data
  const childrenList = childrenQuery.data ?? []

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  }

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handleDelete = () => {
    if (!id || deleteMutation.isPending) {
      return
    }

    deleteMutation.mutate(deleteMode)
  }

  if (detailQuery.isPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (detailQuery.isError || !detail) {
    return (
      <div className="py-12 text-center">
        <p className="mb-4 text-gray-500">代码不存在、无权限访问，或已被删除</p>
        <Button variant="outline" onClick={() => navigate('/admin/snippets')}>
          返回列表
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/snippets')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-mono text-xl font-bold">{detail.id}</h1>
            <p className="text-sm text-gray-500">代码详情</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/${detail.id}`} target="_blank">
            <Button variant="outline" size="sm">
              <ExternalLink className="mr-2 h-4 w-4" />
              查看前台
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">基本信息</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">语言</p>
                <Badge variant="secondary">{detail.language}</Badge>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">层级</p>
                <span className="font-medium">
                  {detail.depth === 0 ? '原始代码' : `回复层级 ${detail.depth}`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">创建时间</p>
                <span className="text-sm">{formatDate(detail.created_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">作者标识</p>
                <code className="rounded bg-gray-100 px-1 text-xs">
                  {detail.author_token ? `${detail.author_token.slice(0, 8)}...` : '未知'}
                </code>
              </div>
            </div>
          </div>

          {(detail.parent_id || detail.children_count > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4">
              {detail.parent_id && (
                <div>
                  <p className="mb-1 text-xs text-gray-500">上级代码</p>
                  <Link to={`/admin/snippets/${detail.parent_id}`}>
                    <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
                      <GitBranch className="mr-1 h-3 w-3" />
                      {detail.parent_id}
                    </Badge>
                  </Link>
                </div>
              )}

              <div>
                <p className="mb-1 text-xs text-gray-500">衍生版本</p>
                {detail.children_count > 0 ? (
                  <Button
                    variant="link"
                    className="h-auto p-0 text-sm font-medium text-blue-600 hover:text-blue-800"
                    onClick={() => setChildrenDialogOpen(true)}
                  >
                    {detail.children_count} 个直接回复，共 {detail.descendants_count} 个衍生版本
                  </Button>
                ) : (
                  <span className="text-sm text-gray-500">无衍生版本</span>
                )}
              </div>
            </div>
          )}

          {detail.message && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-start gap-2">
                <MessageSquare className="mt-0.5 h-4 w-4 text-gray-400" />
                <div>
                  <p className="mb-1 text-xs text-gray-500">修改说明</p>
                  <p className="rounded bg-gray-50 p-2 text-sm">{detail.message}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">代码内容</CardTitle>
          <CardDescription>
            共 {detail.code.split('\n').length} 行，{detail.code.length} 个字符
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs key={detail.id} defaultValue={detail.parent_code ? 'diff' : 'code'}>
            <TabsList>
              <TabsTrigger value="code">源代码</TabsTrigger>
              {detail.parent_code && <TabsTrigger value="diff">对比视图</TabsTrigger>}
              {detail.parent_code && <TabsTrigger value="parent">上级代码</TabsTrigger>}
            </TabsList>

            <TabsContent value="code" className="mt-4">
              <div className="h-[400px]">
                <LazyCodeEditor value={detail.code} language={detail.language} readOnly />
              </div>
            </TabsContent>

            {detail.parent_code && (
              <>
                <TabsContent value="diff" className="mt-4">
                  <div className="h-[400px]">
                    <LazyDiffViewer
                      original={detail.parent_code}
                      modified={detail.code}
                      language={detail.language}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="parent" className="mt-4">
                  <div className="h-[400px]">
                    <LazyCodeEditor
                      value={detail.parent_code}
                      language={detail.language}
                      readOnly
                    />
                  </div>
                  {detail.parent_message && (
                    <p className="mt-2 text-sm text-gray-500">上级说明: {detail.parent_message}</p>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除代码 <code className="font-mono">{detail.id}</code> 吗？
              {detail.children_count > 0 && (
                <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-sm text-yellow-800">
                    该代码有 {detail.children_count} 个直接回复，共 {detail.descendants_count} 个衍生版本
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm"
                      variant={deleteMode === 'single' ? 'default' : 'outline'}
                      onClick={() => setDeleteMode('single')}
                    >
                      仅删除当前代码
                    </Button>
                    <Button
                      size="sm"
                      variant={deleteMode === 'tree' ? 'destructive' : 'outline'}
                      onClick={() => setDeleteMode('tree')}
                    >
                      删除整棵版本树
                    </Button>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={childrenDialogOpen} onOpenChange={setChildrenDialogOpen}>
        <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              衍生版本列表
              <Badge variant="outline" className="ml-2 font-mono">
                {id}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {childrenQuery.isPending ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-900"></div>
              </div>
            ) : childrenQuery.isError ? (
              <p className="py-8 text-center text-gray-500">加载衍生版本列表失败</p>
            ) : childrenList.length === 0 ? (
              <p className="py-8 text-center text-gray-500">暂无衍生版本</p>
            ) : (
              <div className="space-y-3">
                {childrenList.map((child, index) => (
                  <div
                    key={child.id}
                    className="rounded-lg border p-3 transition-colors hover:bg-gray-50"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">#{index + 1}</Badge>
                        <Link
                          to={`/admin/snippets/${child.id}`}
                          className="font-mono text-sm text-blue-600 hover:underline"
                          onClick={() => setChildrenDialogOpen(false)}
                        >
                          {child.id}
                        </Link>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatShortDate(child.created_at)}
                      </span>
                    </div>
                    <code className="block truncate rounded bg-gray-100 px-2 py-1 text-xs">
                      {child.code_preview || '(空)'}
                    </code>
                    {child.message && (
                      <p className="mt-2 text-xs text-gray-600">说明: {child.message}</p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Link
                        to={`/admin/snippets/${child.id}`}
                        onClick={() => setChildrenDialogOpen(false)}
                      >
                        <Button size="sm" variant="outline">
                          <Eye className="mr-1 h-3 w-3" />
                          详情
                        </Button>
                      </Link>
                      <Link to={`/${child.id}`} target="_blank">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          前台
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
