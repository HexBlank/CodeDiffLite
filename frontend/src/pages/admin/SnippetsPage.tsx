/**
 * 代码管理列表页面
 */

import { useEffect, useState } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { adminApi, type SnippetAdminItem } from '@/lib/admin-api'
import { adminQueryKeys } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Search,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  ExternalLink,
  Filter,
  RefreshCw,
  ChevronsLeft,
  ChevronsRight,
  MessageSquare,
} from 'lucide-react'

const PAGE_SIZE = 15

const LANGUAGES = [
  'all',
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'c',
  'csharp',
  'go',
  'rust',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'html',
  'css',
  'sql',
  'json',
  'markdown',
  'plaintext',
]

export default function SnippetsPage() {
  const queryClient = useQueryClient()
  const [searchInput, setSearchInput] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [language, setLanguage] = useState('all')
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const [deleteTarget, setDeleteTarget] = useState<SnippetAdminItem | null>(null)
  const [deleteMode, setDeleteMode] = useState<'single' | 'tree'>('single')
  const [childrenDialogOpen, setChildrenDialogOpen] = useState(false)
  const [childrenParentId, setChildrenParentId] = useState<string | null>(null)

  const snippetsQuery = useQuery({
    queryKey: adminQueryKeys.snippetList({
      page,
      pageSize: PAGE_SIZE,
      search: submittedSearch || undefined,
      language: language !== 'all' ? language : undefined,
    }),
    queryFn: () =>
      adminApi.getSnippets({
        page,
        page_size: PAGE_SIZE,
        search: submittedSearch || undefined,
        language: language !== 'all' ? language : undefined,
      }),
    placeholderData: keepPreviousData,
  })

  const childrenQuery = useQuery({
    queryKey: childrenParentId
      ? adminQueryKeys.snippetChildren(childrenParentId)
      : [...adminQueryKeys.snippets(), 'children', 'idle'],
    queryFn: () => adminApi.getSnippetChildren(childrenParentId!),
    enabled: childrenDialogOpen && !!childrenParentId,
  })

  const deleteMutation = useMutation({
    mutationFn: async (target: { snippet: SnippetAdminItem; mode: 'single' | 'tree' }) => {
      if (target.mode === 'tree') {
        return adminApi.deleteSnippetTree(target.snippet.id)
      }

      return adminApi.deleteSnippet(target.snippet.id)
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.mode === 'tree'
          ? '已删除代码及其所有衍生版本'
          : '删除成功'
      )
      setDeleteTarget(null)
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.all() })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  useEffect(() => {
    if (snippetsQuery.data) {
      setPageInput(String(snippetsQuery.data.page))
    }
  }, [snippetsQuery.data])

  const data = snippetsQuery.data
  const childrenList = childrenQuery.data ?? []

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSubmittedSearch(searchInput.trim())
  }

  const handlePageJump = () => {
    const newPage = parseInt(pageInput, 10)
    if (isNaN(newPage) || newPage < 1) {
      setPageInput(String(page))
      return
    }

    if (data && newPage > data.total_pages) {
      setPageInput(String(data.total_pages))
      setPage(data.total_pages)
      return
    }

    setPage(newPage)
  }

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageJump()
    }
  }

  const openChildrenDialog = (parentId: string) => {
    setChildrenParentId(parentId)
    setChildrenDialogOpen(true)
  }

  const handleDelete = () => {
    if (!deleteTarget || deleteMutation.isPending) {
      return
    }

    deleteMutation.mutate({ snippet: deleteTarget, mode: deleteMode })
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">代码管理</h1>
          <p className="text-gray-500">查看和管理所有分享的代码</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => snippetsQuery.refetch()}
          disabled={snippetsQuery.isFetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${snippetsQuery.isFetching ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            搜索与筛选
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Input
                placeholder="搜索代码内容、ID 或说明..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
            <Select
              value={language}
              onValueChange={(value) => {
                setLanguage(value)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="选择语言" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部语言</SelectItem>
                {LANGUAGES.slice(1).map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">
              <Search className="h-4 w-4 mr-2" />
              搜索
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {snippetsQuery.isPending ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : snippetsQuery.isError ? (
            <div className="text-center text-gray-500 py-12">
              加载数据失败
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="text-center text-gray-500 py-12">
              暂无数据
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-24">ID</TableHead>
                      <TableHead>代码预览</TableHead>
                      <TableHead className="w-24">语言</TableHead>
                      <TableHead className="w-20">层级</TableHead>
                      <TableHead className="w-24">回复</TableHead>
                      <TableHead className="w-40">创建时间</TableHead>
                      <TableHead className="w-28 text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-sm">
                          <div className="flex items-center gap-1">
                            <Link
                              to={`/admin/snippets/${item.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {item.id}
                            </Link>
                            {item.parent_id && (
                              <Link
                                to={`/admin/snippets/${item.parent_id}`}
                                title={`查看上级: ${item.parent_id}`}
                              >
                                <GitBranch className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                              </Link>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded block truncate">
                              {item.code_preview || '(空)'}
                            </code>
                            {item.message && (
                              <p className="text-xs text-gray-500 mt-1 truncate">
                                💬 {item.message}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.language}</Badge>
                        </TableCell>
                        <TableCell>
                          {item.depth > 0 ? (
                            <Link to={`/admin/snippets/${item.parent_id}`}>
                              <Badge variant="outline" className="cursor-pointer hover:bg-gray-100">
                                L{item.depth}
                              </Badge>
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.children_count > 0 ? (
                            <button
                              onClick={() => openChildrenDialog(item.id)}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>{item.children_count}</span>
                            </button>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(item.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link to={`/${item.id}`} target="_blank">
                              <Button variant="ghost" size="sm" title="在前台查看">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/admin/snippets/${item.id}`}>
                              <Button variant="ghost" size="sm" title="查看详情">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="删除"
                              onClick={() => {
                                setDeleteTarget(item)
                                setDeleteMode('single')
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between px-4 py-3 border-t gap-3">
                <p className="text-sm text-gray-600">
                  共 {data.total} 条记录
                </p>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(1)}
                    title="首页"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1">上一页</span>
                  </Button>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">第</span>
                    <Input
                      type="number"
                      min={1}
                      max={data.total_pages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onBlur={handlePageJump}
                      onKeyDown={handlePageInputKeyDown}
                      className="w-16 h-8 text-center"
                    />
                    <span className="text-sm text-gray-600">/ {data.total_pages} 页</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePageJump}
                    >
                      跳转
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.total_pages}
                    onClick={() => setPage((currentPage) => currentPage + 1)}
                  >
                    <span className="hidden sm:inline mr-1">下一页</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= data.total_pages}
                    onClick={() => setPage(data.total_pages)}
                    title="末页"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={childrenDialogOpen} onOpenChange={setChildrenDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              回复列表
              {childrenParentId && (
                <Badge variant="outline" className="ml-2 font-mono">
                  {childrenParentId}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {childrenQuery.isPending ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : childrenQuery.isError ? (
              <p className="text-center text-gray-500 py-8">加载回复列表失败</p>
            ) : childrenList.length === 0 ? (
              <p className="text-center text-gray-500 py-8">暂无回复</p>
            ) : (
              <div className="space-y-3">
                {childrenList.map((child, index) => (
                  <div
                    key={child.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
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
                        {formatDate(child.created_at)}
                      </span>
                    </div>
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded block truncate">
                      {child.code_preview || '(空)'}
                    </code>
                    {child.message && (
                      <p className="text-xs text-gray-600 mt-2">
                        💬 {child.message}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <Link
                        to={`/admin/snippets/${child.id}`}
                        onClick={() => setChildrenDialogOpen(false)}
                      >
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          详情
                        </Button>
                      </Link>
                      <Link to={`/${child.id}`} target="_blank">
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-3 w-3 mr-1" />
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

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && (
                <>
                  确定要删除代码 <code className="font-mono">{deleteTarget.id}</code> 吗？
                  {deleteTarget.children_count > 0 && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-yellow-800 text-sm">
                        ⚠️ 该代码有 {deleteTarget.children_count} 个回复版本
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant={deleteMode === 'single' ? 'default' : 'outline'}
                          onClick={() => setDeleteMode('single')}
                        >
                          仅删除此代码
                        </Button>
                        <Button
                          size="sm"
                          variant={deleteMode === 'tree' ? 'destructive' : 'outline'}
                          onClick={() => setDeleteMode('tree')}
                        >
                          删除所有相关代码
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
