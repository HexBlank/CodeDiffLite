import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { adminApi, setToken } from '@/lib/admin-api'
import { useAdminSessionStatus } from '@/hooks/use-admin-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { LogIn, Shield } from 'lucide-react'

export default function LoginPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { isChecking, isAuthenticated, statusQuery } = useAdminSessionStatus()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const loginMutation = useMutation({
    mutationFn: () => adminApi.login(username, password),
    onSuccess: (result) => {
      queryClient.removeQueries({ queryKey: ['admin'] })
      setToken(result.access_token)
      toast.success('登录成功')
      navigate('/admin', { replace: true })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '登录失败')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate()
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  if (statusQuery.data && !statusQuery.data.initialized) {
    return <Navigate to="/admin/setup" replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-gray-100 p-3">
              <Shield className="h-8 w-8 text-gray-700" />
            </div>
          </div>
          <CardTitle className="text-xl">管理员登录</CardTitle>
          <CardDescription>登录以管理 CodeDiff 系统</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? (
                <>
                  <span className="mr-2 animate-spin">...</span>
                  登录中...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  登录
                </>
              )}
            </Button>

            <div className="text-center">
              <Link to="/" className="text-sm text-gray-500 hover:text-gray-700">
                返回首页
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
