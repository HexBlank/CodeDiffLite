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
import { toast } from 'sonner'

interface ForgotPasswordDialogProps {
  isOpen: boolean
  onClose: () => void
  onSwitchToLogin: () => void
}

export function ForgotPasswordDialog({ isOpen, onClose, onSwitchToLogin }: ForgotPasswordDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [codeSending, setCodeSending] = useState(false)
  const [codeCountdown, setCodeCountdown] = useState(0)

  const sendCode = async () => {
    if (!email) {
      toast.error('请输入邮箱')
      return
    }
    setCodeSending(true)
    try {
      await api.sendCode(email, 'reset_password')
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
    
    if (!email || !code || !newPassword) {
      toast.error('请填写完整信息')
      return
    }
    
    if (newPassword.length < 6) {
      toast.error('新密码至少6个字符')
      return
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('两次输入的密码不一致')
      return
    }
    
    setIsLoading(true)
    try {
      await api.resetPassword({
        email,
        code,
        new_password: newPassword
      })
      
      toast.success('密码重置成功，请使用新密码登录')
      onClose()
      // 切换到登录页
      setTimeout(() => {
        onSwitchToLogin()
      }, 100)
      // 重置表单
      setEmail('')
      setCode('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      toast.error(error.message || '重置失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">
            找回密码
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="reset-email">邮箱</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reset-code">验证码</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Key className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="reset-code"
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

          <div className="space-y-2">
            <Label htmlFor="reset-password">新密码</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reset-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="至少6位密码"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                minLength={6}
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

          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">确认新密码</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              placeholder="再次输入新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            重置密码
          </Button>

          <div className="text-center text-sm">
            <span className="text-muted-foreground">想起密码了？</span>
            <button
              type="button"
              onClick={() => {
                onClose()
                onSwitchToLogin()
              }}
              className="ml-1 text-primary hover:underline"
            >
              返回登录
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
