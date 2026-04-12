/**
 * 管理后台仪表盘
 */

import { useQuery } from '@tanstack/react-query'
import { adminApi } from '@/lib/admin-api'
import { adminQueryKeys } from '@/lib/query-keys'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  FileCode,
  GitBranch,
  Calendar,
  TrendingUp,
  Code2,
  Users,
  Share2,
  Eye,
  EyeOff,
} from 'lucide-react'

export default function DashboardPage() {
  const statsQuery = useQuery({
    queryKey: adminQueryKeys.stats(),
    queryFn: () => adminApi.getStats(),
  })

  const extendedStatsQuery = useQuery({
    queryKey: adminQueryKeys.extendedStats(),
    queryFn: () => adminApi.getExtendedStats(),
  })

  const stats = statsQuery.data
  const extendedStats = extendedStatsQuery.data

  if (statsQuery.isPending) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    )
  }

  if (statsQuery.isError || !stats) {
    return (
      <div className="text-center text-muted-foreground py-12">
        无法加载统计数据
      </div>
    )
  }

  const topLanguages = Object.entries(stats.language_stats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">仪表盘</h1>
        <p className="text-muted-foreground mt-1">系统概览与核心统计数据</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-interactive glow border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">代码总数</CardTitle>
            <FileCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-semibold tracking-tight text-foreground mt-2">{stats.total_snippets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              共 {stats.total_snippets} 个代码片段
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive glow border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">原始分享</CardTitle>
            <Code2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-semibold tracking-tight text-foreground mt-2">{stats.original_snippets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              非回复的原始代码
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive glow border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">回复 / 修改</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-semibold tracking-tight text-foreground mt-2">{stats.reply_snippets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              代码的回复与修改版本
            </p>
          </CardContent>
        </Card>

        <Card className="card-interactive glow border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">今日新增</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-mono font-semibold tracking-tight text-foreground mt-2">{stats.today_snippets}</div>
            <p className="text-xs text-muted-foreground mt-1">
              今天创建的代码
            </p>
          </CardContent>
        </Card>
      </div>

      {extendedStatsQuery.isError && (
        <div className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground animate-fade-in bg-muted/30">
          扩展统计加载失败，基础统计仍可用。
        </div>
      )}

      {extendedStats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <Card className="card-interactive glow border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">注册用户</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-semibold tracking-tight text-foreground mt-1">{extendedStats.total_users}</div>
              <p className="text-xs text-muted-foreground mt-1">
                今日新增 {extendedStats.today_users} 人
              </p>
            </CardContent>
          </Card>

          <Card className="card-interactive glow border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">私密分享</CardTitle>
              <Share2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-semibold tracking-tight text-foreground mt-1">{extendedStats.total_shares}</div>
              <p className="text-xs text-muted-foreground mt-1">
                有效 {extendedStats.active_shares} / 过期 {extendedStats.expired_shares}
              </p>
            </CardContent>
          </Card>

          <Card className="card-interactive glow border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">公开代码</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-semibold tracking-tight text-foreground mt-1">{extendedStats.public_snippets}</div>
              <p className="text-xs text-muted-foreground mt-1">
                所有人可见的代码
              </p>
            </CardContent>
          </Card>

          <Card className="card-interactive glow border-border/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">私密代码</CardTitle>
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-mono font-semibold tracking-tight text-foreground mt-1">{extendedStats.private_snippets}</div>
              <p className="text-xs text-muted-foreground mt-1">
                仅作者可见的代码
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 animate-fade-up" style={{ animationDelay: '200ms' }}>
        <Card className="card-interactive glow border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
              活跃趋势
            </CardTitle>
            <CardDescription>近期代码分享统计</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">最近 7 天</span>
                  <span className="font-mono font-semibold text-foreground">{stats.week_snippets}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{
                      width: stats.total_snippets > 0
                        ? `${Math.min(100, (stats.week_snippets / stats.total_snippets) * 100)}%`
                        : '0%',
                    }}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full"></div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground font-medium">最近 30 天</span>
                  <span className="font-mono font-semibold text-foreground">{stats.month_snippets}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-primary/70 h-full rounded-full transition-all duration-1000 ease-out relative"
                    style={{
                      width: stats.total_snippets > 0
                        ? `${Math.min(100, (stats.month_snippets / stats.total_snippets) * 100)}%`
                        : '0%',
                    }}
                  >
                     <div className="absolute inset-0 bg-white/10 w-full h-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-interactive glow border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-muted-foreground" />
              语言分布
            </CardTitle>
            <CardDescription>最常用的编程语言</CardDescription>
          </CardHeader>
          <CardContent>
            {topLanguages.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">暂无数据</p>
            ) : (
              <div className="space-y-4">
                {topLanguages.map(([lang, count], index) => (
                  <div key={lang} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Badge variant={index === 0 ? 'default' : 'secondary'} className="px-2 shadow-sm">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{lang}</span>
                    </div>
                    <span className="text-sm font-mono font-semibold text-muted-foreground">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
