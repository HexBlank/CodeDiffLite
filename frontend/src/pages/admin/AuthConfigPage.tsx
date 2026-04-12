/**
 * 认证设置页面
 */

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Save,
  Loader2,
  Shield,
  KeyRound,
  UserPlus,
  MailWarning,
} from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import { adminQueryKeys } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Separator } from '@/components/ui/separator'

export default function AuthConfigPage() {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    login_enabled: true,
    login_with_code_enabled: false,
    register_enabled: true,
    register_email_verify: false,
  })

  const configQuery = useQuery({
    queryKey: adminQueryKeys.authConfig(),
    queryFn: () => adminApi.getAuthConfig(),
  })

  // 同时获取邮件配置状态，以给用户提示
  const emailConfigQuery = useQuery({
    queryKey: adminQueryKeys.emailConfig(),
    queryFn: () => adminApi.getEmailConfig(),
  })

  const saveMutation = useMutation({
    mutationFn: () => adminApi.updateAuthConfig(formData),
    onSuccess: () => {
      toast.success('配置已保存')
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.authConfig() })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '保存失败')
      // 保存失败时，回滚前端状态（比如因为没配邮件而开启验证码失败）
      if (configQuery.data) {
        setFormData(configQuery.data)
      }
    },
  })

  useEffect(() => {
    if (configQuery.data) {
      setFormData(configQuery.data)
    }
  }, [configQuery.data])

  const handleSave = () => {
    saveMutation.mutate()
  }

  const isEmailConfigured = emailConfigQuery.data && 
    emailConfigQuery.data.smtp_host && 
    emailConfigQuery.data.smtp_user && 
    emailConfigQuery.data.smtp_from &&
    emailConfigQuery.data.smtp_password_set

  if (configQuery.isPending || emailConfigQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (configQuery.isError) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        加载配置失败
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">认证设置</h1>
        <p className="text-muted-foreground mt-1">
          管理用户登录、注册功能及安全验证
        </p>
      </div>

      <div className="space-y-6 border rounded-lg p-6 bg-card text-card-foreground shadow-sm">
        
        {/* 登录设置 */}
        <div className="flex flex-row items-center justify-between rounded-lg border p-4 gap-8">
          <div className="flex-1 space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              开启用户登录
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              允许已有账号的用户登录系统。关闭后，新用户无法登录，但不影响已在线用户。
            </p>
          </div>
          <Switch
            checked={formData.login_enabled}
            onCheckedChange={(checked: boolean) => setFormData({ ...formData, login_enabled: checked })}
          />
        </div>

        {/* 验证码登录设置 */}
        <div className="flex flex-row items-center justify-between rounded-lg border p-4 gap-8">
          <div className="flex-1 space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              <KeyRound className="h-4 w-4" />
              开启验证码登录
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              允许用户通过接收邮箱验证码来登录。（依赖开启用户登录功能）
            </p>
            {formData.login_with_code_enabled && !isEmailConfigured && (
              <div className="text-sm text-destructive flex items-start gap-2 mt-2 p-3 bg-destructive/10 rounded-md border border-destructive/20 leading-relaxed">
                <MailWarning className="h-4 w-4 shrink-0 mt-0.5" />
                <p>注意：尚未完整配置邮件服务器。此时开启验证码登录将导致该方式完全不可用！</p>
              </div>
            )}
          </div>
          <Switch
            checked={formData.login_with_code_enabled}
            onCheckedChange={(checked: boolean) => setFormData({ ...formData, login_with_code_enabled: checked })}
          />
        </div>

        {/* 注册设置 */}
        <div className="flex flex-row items-center justify-between rounded-lg border p-4 gap-8">
          <div className="flex-1 space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              开启用户注册
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              允许访客自行注册账号。关闭后，前台将隐藏注册入口，但您仍可通过后台添加用户。
            </p>
          </div>
          <Switch
            checked={formData.register_enabled}
            onCheckedChange={(checked: boolean) => setFormData({ ...formData, register_enabled: checked })}
          />
        </div>

        <Separator />

        {/* 注册验证码设置 */}
        <div className="flex flex-row items-center justify-between rounded-lg border p-4 gap-8">
          <div className="flex-1 space-y-0.5">
            <Label className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              注册需要邮箱验证码
            </Label>
            <p className="text-sm text-muted-foreground mt-1">
              开启后，用户注册必须验证邮箱可用性。
            </p>
            {formData.register_email_verify && !isEmailConfigured && (
               <div className="text-sm text-destructive flex items-start gap-2 mt-2 p-3 bg-destructive/10 rounded-md border border-destructive/20 leading-relaxed">
                 <MailWarning className="h-4 w-4 shrink-0 mt-0.5" />
                 <p>注意：尚未完整配置邮件服务器。此时开启此项将导致所有用户注册失败！</p>
               </div>
            )}
          </div>
          <Switch
            checked={formData.register_email_verify}
            onCheckedChange={(checked: boolean) => setFormData({ ...formData, register_email_verify: checked })}
          />
        </div>

        <div className="flex items-center pt-4">
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存配置
          </Button>
        </div>
      </div>
    </div>
  )
}
