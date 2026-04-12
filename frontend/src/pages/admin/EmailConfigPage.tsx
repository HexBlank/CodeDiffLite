/**
 * 邮件配置页面
 */

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Mail,
  Save,
  TestTube,
  Loader2,
  Server,
  User,
  Lock,
  Send,
  AlertCircle,
} from 'lucide-react'
import { adminApi } from '@/lib/admin-api'
import { adminQueryKeys } from '@/lib/query-keys'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

export default function EmailConfigPage() {
  const queryClient = useQueryClient()
  const [testEmail, setTestEmail] = useState('')
  const [showTestDialog, setShowTestDialog] = useState(false)
  const [formData, setFormData] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from: '',
  })

  const configQuery = useQuery({
    queryKey: adminQueryKeys.emailConfig(),
    queryFn: () => adminApi.getEmailConfig(),
  })

  const saveMutation = useMutation({
    mutationFn: () => adminApi.updateEmailConfig(formData),
    onSuccess: () => {
      toast.success('配置已保存')
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.emailConfig() })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '保存失败')
    },
  })

  const testMutation = useMutation({
    mutationFn: () => adminApi.testEmailConfig(testEmail),
    onSuccess: () => {
      toast.success('测试邮件已发送')
      setShowTestDialog(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '测试失败')
    },
  })

  useEffect(() => {
    if (!configQuery.data) {
      return
    }

    setFormData({
      smtp_host: configQuery.data.smtp_host,
      smtp_port: configQuery.data.smtp_port,
      smtp_user: configQuery.data.smtp_user,
      smtp_password: '',
      smtp_from: configQuery.data.smtp_from,
    })
  }, [configQuery.data])

  const config = configQuery.data

  const handleSave = () => {
    saveMutation.mutate()
  }

  const handleTest = () => {
    if (!testEmail) {
      toast.error('请输入测试邮箱')
      return
    }

    testMutation.mutate()
  }

  if (configQuery.isPending) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (configQuery.isError || !config) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        加载配置失败
      </div>
    )
  }

  const isConfigured = Boolean(
    config.smtp_host && 
    config.smtp_port && 
    config.smtp_user && 
    config.smtp_from && 
    config.smtp_password_set
  )

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">邮件配置</h1>
        <p className="text-muted-foreground mt-1">
          配置 SMTP 邮件服务器，用于发送验证码邮件
        </p>
      </div>

      {!isConfigured && (
        <Alert className="border-amber-500/50 text-amber-600 bg-amber-50/50 dark:bg-amber-950/20 dark:text-amber-400">
          <AlertCircle className="h-4 w-4 !text-amber-600 dark:!text-amber-400" />
          <AlertTitle>邮件服务未配置</AlertTitle>
          <AlertDescription>
            目前系统邮件服务尚未完整配置。在完成配置前，用户端的注册邮箱验证、找回密码及修改邮箱等功能将无法正常使用，并且对应功能会被自动隐藏。<br/>
            请填妥下方所有项并"保存配置"以开启邮件相关功能。
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4 border rounded-lg p-6">
        <div className="space-y-2">
          <Label htmlFor="smtp_host" className="flex items-center gap-2">
            <Server className="h-4 w-4" />
            SMTP 服务器地址
          </Label>
          <Input
            id="smtp_host"
            placeholder="smtp.example.com"
            value={formData.smtp_host}
            onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            例如：smtp.gmail.com, smtp.qq.com, smtp.163.com
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp_port">SMTP 端口</Label>
          <Input
            id="smtp_port"
            type="number"
            value={formData.smtp_port}
            onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value, 10) || 587 })}
          />
          <p className="text-xs text-muted-foreground">
            常用端口：25（非加密）、587（TLS）、465（SSL）
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp_user" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            发件人邮箱
          </Label>
          <Input
            id="smtp_user"
            placeholder="your@email.com"
            value={formData.smtp_user}
            onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp_password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            邮箱密码 / 授权码
          </Label>
          <Input
            id="smtp_password"
            type="password"
            placeholder={config.smtp_password_set ? '已设置，留空表示不修改' : '请输入密码'}
            value={formData.smtp_password}
            onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            建议使用邮箱提供的 SMTP 授权码而非登录密码
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="smtp_from" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            发件人显示名称
          </Label>
          <Input
            id="smtp_from"
            placeholder="CodeDiff <noreply@example.com>"
            value={formData.smtp_from}
            onChange={(e) => setFormData({ ...formData, smtp_from: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            显示在邮件中的发件人信息
          </p>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存配置
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowTestDialog(true)}
            className="gap-2"
          >
            <TestTube className="h-4 w-4" />
            发送测试邮件
          </Button>
        </div>
      </div>

      <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>发送测试邮件</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="test_email">接收邮箱</Label>
              <Input
                id="test_email"
                type="email"
                placeholder="your@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTestDialog(false)}>
              取消
            </Button>
            <Button onClick={handleTest} disabled={testMutation.isPending} className="gap-2">
              {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              发送测试
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
