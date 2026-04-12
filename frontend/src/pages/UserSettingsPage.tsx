/**
 * 用户账号设置页面
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { 
  Settings, 
  User, 
  Lock, 
  Mail,
  Save, 
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  Key,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { api, type AuthSettings } from '@/lib/api'

export default function UserSettingsPage() {
  const navigate = useNavigate()
  const { user, refreshUser } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null)
  
  // 修改昵称表单
  const [nickname, setNickname] = useState(user?.nickname || '')
  
  // 修改邮箱表单
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    code: ''
  })
  const [emailCodeSending, setEmailCodeSending] = useState(false)
  const [emailCodeCountdown, setEmailCodeCountdown] = useState(0)
  
  // 修改密码表单 - 原密码方式
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  
  // 修改密码表单 - 验证码方式
  const [codePasswordForm, setCodePasswordForm] = useState({
    code: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [passwordCodeSending, setPasswordCodeSending] = useState(false)
  const [passwordCodeCountdown, setPasswordCodeCountdown] = useState(0)

  useEffect(() => {
    if (user?.nickname) {
      setNickname(user.nickname)
    }
  }, [user])

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await api.getAuthSettings()
        setAuthSettings(settings)
      } catch (error) {
        console.error('Failed to fetch auth settings:', error)
      }
    }
    fetchSettings()
  }, [])

  // 提交修改昵称
  const handleUpdateNickname = async (e: React.FormEvent) => {
    e.preventDefault()
    
    setIsLoading(true)
    try {
      await api.updateProfile({ nickname })
      await refreshUser()
      toast.success('昵称修改成功')
    } catch (error: any) {
      toast.error(error.message || '修改失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 发送邮箱修改验证码
  const sendEmailChangeCode = async () => {
    if (!emailForm.newEmail) {
      toast.error('请输入新邮箱')
      return
    }
    if (emailForm.newEmail === user?.email) {
      toast.error('新邮箱不能与当前邮箱相同')
      return
    }
    setEmailCodeSending(true)
    try {
      await api.sendCode(emailForm.newEmail, 'change_email')
      toast.success('验证码已发送')
      setEmailCodeCountdown(60)
      const timer = setInterval(() => {
        setEmailCodeCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error: any) {
      toast.error(error.message || '发送失败')
    } finally {
      setEmailCodeSending(false)
    }
  }

  // 提交修改邮箱
  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!emailForm.newEmail || !emailForm.code) {
      toast.error('请填写完整信息')
      return
    }
    
    setIsLoading(true)
    try {
      await api.changeEmail({
        new_email: emailForm.newEmail,
        code: emailForm.code
      })
      await refreshUser()
      toast.success('邮箱修改成功')
      setEmailForm({ newEmail: '', code: '' })
    } catch (error: any) {
      toast.error(error.message || '修改失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 发送密码修改验证码
  const sendPasswordChangeCode = async () => {
    if (!user?.email) {
      toast.error('请先登录')
      return
    }
    setPasswordCodeSending(true)
    try {
      await api.sendCode(user.email, 'change_password')
      toast.success('验证码已发送')
      setPasswordCodeCountdown(60)
      const timer = setInterval(() => {
        setPasswordCodeCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error: any) {
      toast.error(error.message || '发送失败')
    } finally {
      setPasswordCodeSending(false)
    }
  }

  // 提交修改密码 - 原密码方式
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword.length < 6) {
      toast.error('新密码至少6个字符')
      return
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('两次输入的新密码不一致')
      return
    }
    
    setIsLoading(true)
    try {
      await api.changePassword({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword
      })
      
      toast.success('密码修改成功')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      toast.error(error.message || '修改失败')
    } finally {
      setIsLoading(false)
    }
  }

  // 提交修改密码 - 验证码方式
  const handleUpdatePasswordByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!codePasswordForm.code || !codePasswordForm.newPassword) {
      toast.error('请填写完整信息')
      return
    }
    
    if (codePasswordForm.newPassword.length < 6) {
      toast.error('新密码至少6个字符')
      return
    }
    
    if (codePasswordForm.newPassword !== codePasswordForm.confirmPassword) {
      toast.error('两次输入的新密码不一致')
      return
    }
    
    setIsLoading(true)
    try {
      await api.changePasswordByCode({
        code: codePasswordForm.code,
        new_password: codePasswordForm.newPassword
      })
      
      toast.success('密码修改成功')
      setCodePasswordForm({
        code: '',
        newPassword: '',
        confirmPassword: ''
      })
    } catch (error: any) {
      toast.error(error.message || '修改失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
          <h1 className="ml-4 font-semibold">账号设置</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* 页面标题 */}
          <div>
            <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Settings className="w-6 h-6" />
              账号设置
            </h2>
            <p className="text-muted-foreground mt-1">
              管理您的账号信息和安全设置
            </p>
          </div>

          <Separator />

          {/* 当前邮箱信息 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                当前邮箱
              </CardTitle>
              <CardDescription>
                {user?.email}
              </CardDescription>
            </CardHeader>
          </Card>

          {/* 如果配置了 SMTP 邮件服务才显示修改邮箱功能 */}
          {authSettings?.smtp_configured && (
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                修改邮箱
              </CardTitle>
              <CardDescription>
                更换您的登录邮箱，需要新邮箱验证码验证
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateEmail} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-email">新邮箱</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm(prev => ({ ...prev, newEmail: e.target.value }))}
                    placeholder="输入新邮箱"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email-code">验证码</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email-code"
                      value={emailForm.code}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="6位验证码"
                      maxLength={6}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={sendEmailChangeCode}
                      disabled={emailCodeSending || emailCodeCountdown > 0}
                    >
                      {emailCodeSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : emailCodeCountdown > 0 ? (
                        `${emailCodeCountdown}s`
                      ) : (
                        '获取验证码'
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      修改邮箱
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          )}

          {/* 修改昵称卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                昵称
              </CardTitle>
              <CardDescription>
                修改您的显示昵称
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateNickname} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nickname">昵称</Label>
                  <Input
                    id="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="输入昵称"
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={isLoading || nickname === user?.nickname}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      保存昵称
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* 修改密码卡片 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                修改密码
              </CardTitle>
              <CardDescription>
                更改您的登录密码
              </CardDescription>
            </CardHeader>
            <CardContent>
              {authSettings?.smtp_configured ? (
                <Tabs defaultValue="password" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="password">
                      <Shield className="w-4 h-4 mr-2" />
                      原密码验证
                    </TabsTrigger>
                    <TabsTrigger value="code">
                      <Key className="w-4 h-4 mr-2" />
                      验证码验证
                    </TabsTrigger>
                  </TabsList>

                  {/* 原密码方式 */}
                  <TabsContent value="password">
                  <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">当前密码</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="输入当前密码"
                          disabled={isLoading}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="new-password">新密码</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="输入新密码（至少6个字符）"
                        minLength={6}
                        disabled={isLoading}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">确认新密码</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="再次输入新密码"
                        disabled={isLoading}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          修改密码
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                {/* 验证码方式 */}
                <TabsContent value="code">
                  <form onSubmit={handleUpdatePasswordByCode} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>验证码</Label>
                      <div className="flex gap-2">
                        <Input
                          value={codePasswordForm.code}
                          onChange={(e) => setCodePasswordForm(prev => ({ ...prev, code: e.target.value }))}
                          placeholder="6位验证码"
                          maxLength={6}
                          disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={sendPasswordChangeCode}
                          disabled={passwordCodeSending || passwordCodeCountdown > 0}
                        >
                          {passwordCodeSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : passwordCodeCountdown > 0 ? (
                            `${passwordCodeCountdown}s`
                          ) : (
                            '获取验证码'
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        验证码将发送到您当前邮箱 {user?.email}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="code-new-password">新密码</Label>
                      <div className="relative">
                        <Input
                          id="code-new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          placeholder="输入新密码（至少6个字符）"
                          minLength={6}
                          disabled={isLoading}
                          value={codePasswordForm.newPassword}
                          onChange={(e) => setCodePasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? (
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="code-confirm-password">确认新密码</Label>
                      <Input
                        id="code-confirm-password"
                        type="password"
                        placeholder="再次输入新密码"
                        disabled={isLoading}
                        value={codePasswordForm.confirmPassword}
                        onChange={(e) => setCodePasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full sm:w-auto"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          保存中...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          修改密码
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
              ) : (
                /* 未配置 SMTP 时，直接显示原密码验证表单，隐藏 Tabs 切换 */
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">当前密码</Label>
                    <div className="relative">
                      <Input
                        id="current-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="输入当前密码"
                        disabled={isLoading}
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password">新密码</Label>
                    <Input
                      id="new-password"
                      type="password"
                      placeholder="输入新密码（至少6个字符）"
                      minLength={6}
                      disabled={isLoading}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">确认新密码</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="再次输入新密码"
                      disabled={isLoading}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full sm:w-auto"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        保存中...
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 mr-2" />
                        修改密码
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
