/**
 * 用户管理页面
 */

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Users,
  Search,
  Trash2,
  Mail,
  UserCircle,
  Code2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Plus,
  UserPlus,
} from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import { adminQueryKeys } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

const PAGE_SIZE = 20

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState('')
  const [submittedSearch, setSubmittedSearch] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null)
  const [detailTargetId, setDetailTargetId] = useState<number | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    nickname: '',
  })

  const usersQuery = useQuery({
    queryKey: adminQueryKeys.userList({
      page,
      pageSize: PAGE_SIZE,
      search: submittedSearch || undefined,
    }),
    queryFn: () =>
      adminApi.getUsers({
        page,
        page_size: PAGE_SIZE,
        search: submittedSearch || undefined,
      }),
  })

  const userDetailQuery = useQuery({
    queryKey: detailTargetId
      ? adminQueryKeys.userDetail(detailTargetId)
      : [...adminQueryKeys.users(), 'detail', 'idle'],
    queryFn: () => adminApi.getUserDetail(detailTargetId!),
    enabled: !!detailTargetId,
  })

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) => adminApi.deleteUser(userId),
    onSuccess: () => {
      toast.success('用户已删除')
      setDeleteTargetId(null)
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.all() })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '删除失败')
    },
  })

  const createUserMutation = useMutation({
    mutationFn: () =>
      adminApi.createUser({
        email: createForm.email,
        password: createForm.password,
        nickname: createForm.nickname || undefined,
      }),
    onSuccess: () => {
      toast.success('用户创建成功')
      setCreateDialogOpen(false)
      setCreateForm({ email: '', password: '', nickname: '' })
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.all() })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '创建失败')
    },
  })

  const data = usersQuery.data
  const users = data?.items ?? []
  const totalPages = data?.total_pages ?? 0

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    setSubmittedSearch(searchInput.trim())
  }

  const handleDelete = () => {
    if (!deleteTargetId || deleteUserMutation.isPending) {
      return
    }

    deleteUserMutation.mutate(deleteTargetId)
  }

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.email || !createForm.password) {
      toast.error('请填写邮箱和密码')
      return
    }

    createUserMutation.mutate()
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '从未'
    return new Date(dateStr).toLocaleString('zh-CN')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">用户管理</h1>
          <p className="text-muted-foreground mt-1">
            管理系统注册用户，共 {data?.total ?? 0} 个用户
          </p>
        </div>
      </div>

      <form onSubmit={handleSearchSubmit} className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="搜索邮箱或昵称..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit">搜索</Button>
        <Button variant="outline" onClick={() => usersQuery.refetch()} type="button">
          刷新
        </Button>
        <Button onClick={() => setCreateDialogOpen(true)} type="button">
          <Plus className="w-4 h-4 mr-2" />
          新增用户
        </Button>
      </form>

      {usersQuery.isPending ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : usersQuery.isError ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
          <p>加载用户失败</p>
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mb-4 opacity-50" />
          <p>暂无用户</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">用户信息</th>
                <th className="px-4 py-3 text-left text-sm font-medium">代码数量</th>
                <th className="px-4 py-3 text-left text-sm font-medium">注册时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium">最后登录</th>
                <th className="px-4 py-3 text-right text-sm font-medium">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDetailTargetId(user.id)}
                      className="flex items-center gap-3 text-left hover:opacity-80"
                    >
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.nickname || '未设置昵称'}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      </div>
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="gap-1">
                      <Code2 className="h-3 w-3" />
                      {user.snippet_count}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {formatDate(user.last_login_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteTargetId(user.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
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
              确认删除用户
            </AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除该用户吗？
              <br />
              该用户的代码将转为匿名代码，不会被删除。
              <br />
              此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteUserMutation.isPending ? '删除中...' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={detailTargetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailTargetId(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
          </DialogHeader>
          {userDetailQuery.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : userDetailQuery.isError || !userDetailQuery.data ? (
            <div className="py-6 text-center text-muted-foreground">
              加载详情失败
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{userDetailQuery.data.nickname || '未设置昵称'}</p>
                  <p className="text-sm text-muted-foreground">{userDetailQuery.data.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">邮箱验证</p>
                  <Badge variant={userDetailQuery.data.email_verified ? 'default' : 'secondary'}>
                    {userDetailQuery.data.email_verified ? '已验证' : '未验证'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">注册时间</p>
                  <p className="font-medium">{formatDate(userDetailQuery.data.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">最后登录</p>
                  <p className="font-medium">{formatDate(userDetailQuery.data.last_login_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">代码总数</p>
                  <p className="font-medium">{userDetailQuery.data.snippet_count}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">公开代码</p>
                  <p className="font-medium text-green-600">{userDetailQuery.data.public_snippets}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">私密代码</p>
                  <p className="font-medium text-orange-600">{userDetailQuery.data.private_snippets}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              新增用户
            </DialogTitle>
            <DialogDescription>
              创建一个新用户账号，用户可以使用邮箱和密码登录
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-email">邮箱</Label>
              <Input
                id="new-user-email"
                type="email"
                placeholder="user@example.com"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-nickname">昵称（可选）</Label>
              <Input
                id="new-user-nickname"
                placeholder="用户昵称"
                value={createForm.nickname}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, nickname: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">密码</Label>
              <Input
                id="new-user-password"
                type="password"
                placeholder="至少6个字符"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                密码至少6个字符
              </p>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
                disabled={createUserMutation.isPending}
              >
                取消
              </Button>
              <Button type="submit" disabled={createUserMutation.isPending}>
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  '创建用户'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
