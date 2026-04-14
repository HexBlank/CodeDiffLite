import { useState } from 'react'
import { Mail, Lock, Key, Loader2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { api } from '@/lib/api'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'

interface LoginDialogProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToRegister?: () => void
  onSwitchToForgotPassword: () => void
  allowCodeLogin?: boolean
}

export function LoginDialog({ isOpen, onClose, onSwitchToRegister, onSwitchToForgotPassword, allowCodeLogin = false }: LoginDialogProps) {
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [loginMethod, setLoginMethod] = useState<'password' | 'code'>('password')
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [codeSending, setCodeSending] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)

  const sendCode = async () => {
    if (!email) {
      toast.error('请输入邮箱')
      return
    }
    setCodeSending(true)
    try {
      await api.sendCode(email, 'login')
      toast.success('验证码已发送')
      setCodeCountdown(60)
      const timer = setInterval(() => {
        setCodeCountdown((prev) => {
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
      setCodeSending(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      let result
      if (loginMethod === 'password') {
        if (!email || !password) {
          toast.error('请填写完整信息')
          return
        }
        result = await api.login(email, password)
      } else {
        if (!email || !code) {
          toast.error('请填写完整信息')
          return
        }
        result = await api.loginWithCode(email, code)
      }
      login(result.access_token, result.user)
      toast.success('登录成功')
      onClose()
      // 重置表单
      setEmail('')
      setPassword('')
      setCode('')
    } catch (error: any) {
      toast.error(error.message || '登录失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent 
        className="sm:max-w-md"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            登录
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {allowCodeLogin && (
            <div className="flex gap-2 rounded-lg bg-muted p-1">
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  loginMethod === 'password'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                密码登录
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('code')}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  loginMethod === 'code'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                验证码登录
              </button>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="login-email">邮箱</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="login-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          {loginMethod === 'password' || !allowCodeLogin ? (
            <div className="space-y-2">
              <Label htmlFor="login-password">密码</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="login-code">验证码</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-code"
                    type="text"
                    placeholder="6位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="pl-10"
                    maxLength={6}
                    required
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={sendCode}
                  disabled={codeSending || codeCountdown > 0}
                >
                  {codeSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : codeCountdown > 0 ? (
                    `${codeCountdown}s`
                  ) : (
                    '获取验证码'
                  )}
                </Button>
              </div>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            登录
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                onClose()
                onSwitchToForgotPassword()
              }}
              className="text-muted-foreground hover:text-primary"
            >
              忘记密码？
            </button>
            {onSwitchToRegister && (
              <span>
                <span className="text-muted-foreground">还没有账号？</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onSwitchToRegister()
                  }}
                  className="ml-1 text-primary hover:underline"
                >
                  立即注册
                </button>
              </span>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
