import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AdminSidebar } from '@/components/admin-sidebar'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { useAdminSessionStatus } from '@/hooks/use-admin-session'

const breadcrumbConfig: Record<string, { label: string; parent?: string }> = {
  '/admin': { label: '仪表盘' },
  '/admin/snippets': { label: '代码管理', parent: '/admin' },
  '/admin/users': { label: '用户管理', parent: '/admin' },
  '/admin/shares': { label: '分享管理', parent: '/admin' },
  '/admin/email': { label: '邮件配置', parent: '/admin' },
  '/admin/settings': { label: '账号设置', parent: '/admin' },
}

export default function AdminLayout() {
  const location = useLocation()
  const { isChecking, isAuthenticated, statusQuery } = useAdminSessionStatus()

  const getBreadcrumbs = () => {
    const path = location.pathname
    const breadcrumbs: { label: string; path: string; isLast: boolean }[] = []

    const snippetDetailMatch = path.match(/^\/admin\/snippets\/([^/]+)$/)
    if (snippetDetailMatch) {
      breadcrumbs.push({ label: '仪表盘', path: '/admin', isLast: false })
      breadcrumbs.push({ label: '代码管理', path: '/admin/snippets', isLast: false })
      breadcrumbs.push({ label: snippetDetailMatch[1], path, isLast: true })
      return breadcrumbs
    }

    const config = breadcrumbConfig[path]
    if (config?.parent) {
      const parentConfig = breadcrumbConfig[config.parent]
      if (parentConfig) {
        breadcrumbs.push({ label: parentConfig.label, path: config.parent, isLast: false })
      }
    }

    if (config) {
      breadcrumbs.push({ label: config.label, path, isLast: true })
    }

    return breadcrumbs
  }

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (statusQuery.data && !statusQuery.data.initialized) {
      return <Navigate to="/admin/setup" replace />
    }

    return <Navigate to="/admin/login" replace />
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset className="bg-background/95">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border/50 px-6 glass sticky top-0 z-10 transition-all duration-300">
          <SidebarTrigger className="-ml-2 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors" />
          <Separator orientation="vertical" className="mr-4 h-5 opacity-50" />
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((item, index) => (
                <BreadcrumbItem key={item.path}>
                  {index > 0 && <BreadcrumbSeparator className="text-muted-foreground/50" />}
                  {item.isLast ? (
                    <BreadcrumbPage className="font-medium text-foreground">{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link to={item.path} className="text-muted-foreground hover:text-foreground transition-colors">{item.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
