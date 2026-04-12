import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, Code, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/contexts/AuthContext'
import { api, type AuthSettings } from '@/lib/api'
import { LoginDialog } from './LoginDialog'
import { RegisterDialog } from './RegisterDialog'
import { ForgotPasswordDialog } from './ForgotPasswordDialog'
import { toast } from 'sonner'

export function UserMenu() {
  const { user, isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [showForgotPasswordDialog, setShowForgotPasswordDialog] = useState(false)
  const [authSettings, setAuthSettings] = useState<AuthSettings | null>(null)

  useEffect(() => {
    api.getAuthSettings().then(setAuthSettings).catch(() => {})
  }, [])

  const handleLogout = () => {
    logout()
    toast.success('已退出登录')
  }

  const openLogin = () => {
    setShowLoginDialog(true)
  }

  const openRegister = () => {
    setShowRegisterDialog(true)
  }

  // 获取用户头像文字
  const getAvatarText = () => {
    if (user?.nickname) {
      return user.nickname.charAt(0).toUpperCase()
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return 'U'
  }

  const showLogin = authSettings?.login_enabled !== false
  const showRegister = authSettings?.register_enabled !== false && showLogin

  if (!isLoggedIn) {
    // 如果登录和注册都关闭了，不显示任何按钮
    if (!showLogin && !showRegister) return null

    return (
      <>
        <div className="flex items-center gap-1.5">
          {showLogin && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openLogin}
              className="h-8 px-3 text-xs font-medium"
            >
              登录
            </Button>
          )}
          {showRegister && (
            <Button 
              size="sm" 
              onClick={openRegister}
              className="h-8 px-3 text-xs font-medium"
            >
              注册
            </Button>
          )}
        </div>
        {showLogin && (
          <LoginDialog
            isOpen={showLoginDialog}
            onClose={() => setShowLoginDialog(false)}
            onSwitchToRegister={showRegister ? () => setShowRegisterDialog(true) : undefined}
            onSwitchToForgotPassword={() => setShowForgotPasswordDialog(true)}
            allowCodeLogin={authSettings?.login_with_code_enabled ?? false}
          />
        )}
        {showRegister && (
          <RegisterDialog
            isOpen={showRegisterDialog}
            onClose={() => setShowRegisterDialog(false)}
            onSwitchToLogin={() => setShowLoginDialog(true)}
            requireEmailVerify={authSettings?.register_email_verify ?? false}
          />
        )}
        <ForgotPasswordDialog
          isOpen={showForgotPasswordDialog}
          onClose={() => setShowForgotPasswordDialog(false)}
          onSwitchToLogin={() => setShowLoginDialog(true)}
        />
      </>
    )
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 px-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {getAvatarText()}
              </AvatarFallback>
            </Avatar>
            <span className="hidden max-w-[100px] truncate text-sm font-medium sm:inline">
              {user?.nickname || user?.email?.split('@')[0]}
            </span>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <div className="px-3 py-2">
            <p className="text-sm font-medium">{user?.nickname || '未设置昵称'}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate('/my-snippets')}>
            <Code className="mr-2 h-4 w-4" />
            我的代码
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            账号设置
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}
