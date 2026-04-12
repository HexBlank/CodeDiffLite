import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Lock, Loader2, Eye, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api, Snippet } from '@/lib/api'
import { toast } from 'sonner'
import { LazyCodeEditor, LazyDiffViewer } from '@/components/editor/LazyEditor'
import { LANGUAGES } from '@/lib/api'

export function SharePage() {
  const { shareToken } = useParams<{ shareToken: string }>()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [shareInfo, setShareInfo] = useState<{
    has_password: boolean
    expires_at: string | null
    current_views: number
    max_views: number | null
  } | null>(null)
  const [password, setPassword] = useState('')
  const [snippet, setSnippet] = useState<Snippet | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (shareToken) {
      loadShareInfo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadShareInfo is stable and only depends on shareToken
  }, [shareToken])

  const loadShareInfo = async () => {
    setIsLoading(true)
    try {
      const info = await api.getShareInfo(shareToken!)
      setShareInfo(info)
      
      // 如果没有密码，直接获取代码
      if (!info.has_password) {
        await verifyAndLoad()
      }
    } catch (error: any) {
      if (error.message?.includes('过期')) {
        setError('该分享链接已过期')
      } else if (error.message?.includes('次数')) {
        setError('该分享链接已达到最大查看次数')
      } else {
        setError('分享链接不存在')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const verifyAndLoad = async (pwd?: string) => {
    setIsVerifying(true)
    try {
      const result = await api.verifyShare(shareToken!, pwd || password)
      setSnippet(result.snippet)
      setError(null)
    } catch (error: any) {
      if (error.message?.includes('密码')) {
        toast.error('密码错误')
      } else {
        setError(error.message || '无法访问该分享')
      }
    } finally {
      setIsVerifying(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password) {
      toast.error('请输入密码')
      return
    }
    verifyAndLoad()
  }

  // 获取语言显示名称
  const getLanguageLabel = (value: string) => {
    return LANGUAGES.find(l => l.value === value)?.label || value
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-center">无法访问</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button className="mt-4 w-full" onClick={() => navigate('/')}>
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 需要密码验证
  if (shareInfo?.has_password && !snippet) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100">
              <Lock className="h-6 w-6 text-indigo-600" />
            </div>
            <CardTitle className="text-center">需要密码验证</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="password"
                  placeholder="请输入访问密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {shareInfo.expires_at && (
                <p className="text-xs text-gray-500 text-center">
                  该链接将于 {new Date(shareInfo.expires_at).toLocaleString()} 过期
                </p>
              )}
              <Button type="submit" className="w-full" disabled={isVerifying}>
                {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                访问代码
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!snippet) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 头部 */}
      <header className="border-b bg-white px-4 py-3 dark:bg-gray-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              CodeDiff
            </Button>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">{shareInfo?.has_password ? '私密分享' : '分享链接'}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Eye className="h-3.5 w-3.5" />
            <span>已查看 {shareInfo?.current_views || 1} 次</span>
          </div>
        </div>
      </header>

      {/* 内容 */}
      <main className="mx-auto max-w-6xl p-4">
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-gray-50 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{getLanguageLabel(snippet.language)}</p>
                {snippet.message && (
                  <p className="mt-1 text-lg font-medium">{snippet.message}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {snippet.parent_code ? (
              <LazyDiffViewer
                original={snippet.parent_code}
                modified={snippet.code}
                language={snippet.language}
              />
            ) : (
              <div className="h-[70vh]">
                <LazyCodeEditor
                  value={snippet.code}
                  language={snippet.language}
                  readOnly
                />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
