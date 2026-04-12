import { useEffect, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Save,
  Settings,
  Shield,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { adminApi, removeToken } from '@/lib/admin-api'
import { adminQueryKeys } from '@/lib/query-keys'

export default function AdminSettingsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current)
      }
    }
  }, [])

  const scheduleRelogin = (description: string) => {
    toast.success('修改成功', { description })

    redirectTimerRef.current = setTimeout(() => {
      removeToken()
      queryClient.removeQueries({ queryKey: adminQueryKeys.all() })
      navigate('/admin/login', { replace: true })
    }, 1500)
  }

  const updateUsernameMutation = useMutation({
    mutationFn: () =>
      adminApi.updateAdminUsername({
        new_username: newUsername.trim(),
      }),
    onSuccess: () => {
      scheduleRelogin('请使用新用户名重新登录')
    },
    onError: (error) => {
      toast.error('修改失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      })
    },
  })

  const updatePasswordMutation = useMutation({
    mutationFn: () =>
      adminApi.updateAdminPassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      }),
    onSuccess: () => {
      scheduleRelogin('请使用新密码重新登录')
    },
    onError: (error) => {
      toast.error('修改失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      })
    },
  })

  const handleUpdateUsername = (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUsername.trim()) {
      toast.error('请输入新用户名')
      return
    }

    if (newUsername.trim().length < 3) {
      toast.error('用户名至少需要 3 个字符')
      return
    }

    updateUsernameMutation.mutate()
  }

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault()

    if (!passwordForm.currentPassword) {
      toast.error('请输入当前密码')
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast.error('新密码至少需要 6 个字符')
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('两次输入的新密码不一致')
      return
    }

    updatePasswordMutation.mutate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Settings className="h-6 w-6" />
          账号设置
        </h1>
        <p className="mt-1 text-muted-foreground">修改管理员账号信息</p>
      </div>

      <Separator />

      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              修改用户名
            </CardTitle>
            <CardDescription>修改后需要重新登录。</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-username">新用户名</Label>
                <Input
                  id="new-username"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="输入新用户名（至少 3 个字符）"
                  minLength={3}
                  disabled={updateUsernameMutation.isPending || updatePasswordMutation.isPending}
                />
              </div>

              <Button
                type="submit"
                disabled={updateUsernameMutation.isPending || updatePasswordMutation.isPending}
                className="w-full sm:w-auto"
              >
                {updateUsernameMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    修改用户名
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              修改密码
            </CardTitle>
            <CardDescription>修改后需要重新登录。</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">当前密码</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="输入当前密码"
                    disabled={updateUsernameMutation.isPending || updatePasswordMutation.isPending}
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowCurrentPassword((current) => !current)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">新密码</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="输入新密码（至少 6 个字符）"
                    minLength={6}
                    disabled={updateUsernameMutation.isPending || updatePasswordMutation.isPending}
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowNewPassword((current) => !current)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">确认新密码</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="再次输入新密码"
                  disabled={updateUsernameMutation.isPending || updatePasswordMutation.isPending}
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                  }
                />
              </div>

              <Button
                type="submit"
                disabled={updateUsernameMutation.isPending || updatePasswordMutation.isPending}
                className="w-full sm:w-auto"
              >
                {updatePasswordMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    修改密码
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
