import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Navigate, useNavigate } from 'react-router-dom'
import { adminApi } from '@/lib/admin-api'
import { useAdminSessionStatus } from '@/hooks/use-admin-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Settings, Shield } from 'lucide-react'

export default function SetupPage() {
  const navigate = useNavigate()
  const { isChecking, isAuthenticated, statusQuery } = useAdminSessionStatus()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const initializeMutation = useMutation({
    mutationFn: () => adminApi.initialize(username, password),
    onSuccess: () => {
      toast.success('管理员账户创建成功')
      navigate('/admin/login', { replace: true })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '初始化失败')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (username.length < 3) {
      toast.error('用户名至少需要 3 个字符')
      return
    }

    if (password.length < 6) {
      toast.error('密码至少需要 6 个字符')
      return
    }

    if (password !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }

    initializeMutation.mutate()
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

  if (statusQuery.data?.initialized) {
    return <Navigate to="/admin/login" replace />
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
          <CardTitle className="text-xl">系统初始化</CardTitle>
          <CardDescription>创建管理员账户以开始管理 CodeDiff</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                type="text"
                placeholder="输入管理员用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="输入密码（至少 6 个字符）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={initializeMutation.isPending}>
              {initializeMutation.isPending ? (
                <>
                  <span className="mr-2 animate-spin">...</span>
                  创建中...
                </>
              ) : (
                <>
                  <Settings className="mr-2 h-4 w-4" />
                  创建管理员账户
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
