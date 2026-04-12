/**
 * 分享管理页面
 */

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Share2,
  Search,
  Trash2,
  Lock,
  Unlock,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  ExternalLink,
  Code2,
} from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import { adminQueryKeys } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
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

const PAGE_SIZE = 20

export default function SharesPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [passwordFilter, setPasswordFilter] = useState<'all' | 'protected' | 'unprotected'>('all')
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)

  const sharesQuery = useQuery({
    queryKey: adminQueryKeys.shareList({ page, pageSize: PAGE_SIZE }),
    queryFn: () =>
      adminApi.getShares({
        page,
        page_size: PAGE_SIZE,
      }),
  })

  const deleteShareMutation = useMutation({
    mutationFn: (shareId: number) => adminApi.deleteShare(shareId),
    onSuccess: () => {
      toast.success('分享链接已删除')
      setDeleteTargetId(null)
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.all() })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const data = sharesQuery.data
  const shares = data?.items ?? []
  const totalPages = data?.total_pages ?? 0

  const filteredShares = shares.filter((share) => {
    const matchSearch = search === '' ||
      share.snippet_id.includes(search) ||
      share.share_token.includes(search)
    const matchPassword = passwordFilter === 'all' ||
      (passwordFilter === 'protected' && share.has_password) ||
      (passwordFilter === 'unprotected' && !share.has_password)
    return matchSearch && matchPassword
  })

  const handleDelete = () => {
    if (!deleteTargetId || deleteShareMutation.isPending) {
      return
    }

    deleteShareMutation.mutate(deleteTargetId)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '永不过期'
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const isMaxViews = (current: number, max: number | null) => {
    if (!max) return false
    return current >= max
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">分享管理</h1>
          <p className="text-muted-foreground mt-1">
            管理系统中的私密分享链接，共 {data?.total ?? 0} 个
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索代码ID或分享Token..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={passwordFilter} onValueChange={(v) => setPasswordFilter(v as typeof passwordFilter)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="protected">密码保护</SelectItem>
            <SelectItem value="unprotected">无密码保护</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => sharesQuery.refetch()}>
          刷新
        </Button>
      </div>

      {sharesQuery.isPending ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : sharesQuery.isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
          <p>加载分享链接失败</p>
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Share2 className="h-12 w-12 mb-4 opacity-50" />
          <p>暂无分享链接</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">代码信息</th>
                <th className="px-4 py-3 text-left text-sm font-medium">访问控制</th>
                <th className="px-4 py-3 text-left text-sm font-medium">查看次数</th>
                <th className="px-4 py-3 text-left text-sm font-medium">过期时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium">创建时间</th>
                <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredShares.map((share) => {
                const expired = isExpired(share.expires_at)
                const maxed = isMaxViews(share.current_views, share.max_views)
                const disabled = expired || maxed

                return (
                  <tr key={share.id} className={`hover:bg-muted/50 ${disabled ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Code2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium font-mono text-sm">#{share.snippet_id.substring(0, 8)}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                            {share.snippet_preview}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {share.has_password ? (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            密码保护
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Unlock className="h-3 w-3" />
                            无密码保护
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {share.snippet_language}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span className={maxed ? 'text-red-600 font-medium' : ''}>
                          {share.current_views}
                        </span>
                        {share.max_views && (
                          <span className="text-muted-foreground">/ {share.max_views}</span>
                        )}
                        {maxed && (
                          <Badge variant="destructive" className="ml-1 text-xs">已达上限</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className={expired ? 'text-red-600' : 'text-muted-foreground'}>
                          {formatDate(share.expires_at)}
                        </span>
                        {expired && (
                          <Badge variant="destructive" className="ml-1 text-xs">已过期</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(share.created_at).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(`/s/${share.share_token}`, '_blank')}
                          title="打开分享链接"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTargetId(share.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="删除分享链接"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            第 {page} 页，共 {totalPages} 页
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={deleteTargetId !== null} onOpenChange={() => setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              确认删除分享链接
            </AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除这个分享链接吗？
              <br />
              此操作不可撤销，但代码本身不会被删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteShareMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
