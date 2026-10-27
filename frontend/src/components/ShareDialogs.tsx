import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Check, Copy, ExternalLink, Loader2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ResponsiveDialog } from '@/components/ui/responsive-dialog'
import { useCopy } from '@/hooks/use-copy'
import { api } from '@/lib/api'

function CopyableLink({ url }: { url: string }) {
  const { copied, copy } = useCopy('链接已复制')

  return (
    <div className="flex gap-2">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center rounded-lg border border-border bg-muted/50 px-3 py-2 text-left transition-colors hover:bg-muted/70"
        onClick={() => copy(url)}
        title="点击复制"
      >
        <span className="flex-1 truncate font-mono text-sm">{url}</span>
      </button>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0"
        onClick={() => copy(url)}
        aria-label="复制链接"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}

interface ShareLinkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  url: string
  title: ReactNode
  description: ReactNode
  viewLabel: string
  onView: () => void
}

/** 保存成功后展示分享链接 */
export function ShareLinkDialog({
  open,
  onOpenChange,
  url,
  title,
  description,
  viewLabel,
  onView,
}: ShareLinkDialogProps) {
  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <Check className="h-5 w-5" />
          {title}
        </>
      }
      description={description}
      className="space-y-4"
    >
      <CopyableLink url={url} />
      <div className="flex gap-2">
        <Button variant="outline" className="h-10 flex-1" onClick={() => onOpenChange(false)}>
          继续编辑
        </Button>
        <Button className="h-10 flex-1" onClick={onView}>
          {viewLabel}
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </ResponsiveDialog>
  )
}

interface RestrictedShareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 返回要分享的代码 ID；首页需要先保存代码再分享 */
  getSnippetId: () => Promise<string>
}

type ShareResult = Awaited<ReturnType<typeof api.createShare>>

/** 创建带密码 / 过期时间的限制性分享链接 */
export function RestrictedShareDialog({ open, onOpenChange, getSnippetId }: RestrictedShareDialogProps) {
  const [password, setPassword] = useState('')
  const [expiresDays, setExpiresDays] = useState('7')
  const [isCreating, setIsCreating] = useState(false)
  const [result, setResult] = useState<ShareResult | null>(null)

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setPassword('')
      setExpiresDays('7')
      setResult(null)
    }
    onOpenChange(next)
  }

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const snippetId = await getSnippetId()
      const share = await api.createShare({
        snippet_id: snippetId,
        password: password || undefined,
        expires_days: expiresDays !== 'never' ? parseInt(expiresDays) : undefined,
      })
      setResult(share)
      toast.success('分享链接已创建')
    } catch (error) {
      toast.error('创建分享链接失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={
        <>
          <Lock className="h-5 w-5" />
          创建限制性分享
        </>
      }
      description="创建独立链接，可设置密码保护和过期时间"
      className="space-y-4"
    >
      {result ? (
        <>
          <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-900/20">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              链接已生成！
              {result.has_password && ' 🔒 受密码保护'}
              {result.expires_at &&
                ` · 有效期至 ${new Date(result.expires_at).toLocaleString('zh-CN')}`}
              {!result.has_password && !result.expires_at && ' 无访问限制'}
            </p>
          </div>
          <CopyableLink url={`${window.location.origin}${result.share_url}`} />
          <Button className="h-10 w-full" onClick={() => handleOpenChange(false)}>
            完成
          </Button>
        </>
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="share-password">访问密码（可选）</Label>
            <Input
              id="share-password"
              type="password"
              autoComplete="new-password"
              placeholder="留空则无需密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">设置密码后，访问者需要输入密码才能查看代码</p>
          </div>

          <div className="space-y-2">
            <Label>过期时间</Label>
            <Select value={expiresDays} onValueChange={setExpiresDays}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1天后过期</SelectItem>
                <SelectItem value="7">7天后过期</SelectItem>
                <SelectItem value="30">30天后过期</SelectItem>
                <SelectItem value="never">永不过期</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="h-10 flex-1" onClick={() => handleOpenChange(false)}>
              取消
            </Button>
            <Button className="h-10 flex-1" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : '创建链接'}
            </Button>
          </div>
        </>
      )}
    </ResponsiveDialog>
  )
}
