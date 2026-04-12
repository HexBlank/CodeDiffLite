import { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/contexts/AuthContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const HomePage = lazy(() =>
  import('@/pages/HomePage').then((mod) => ({ default: mod.HomePage }))
)
const SnippetPage = lazy(() =>
  import('@/pages/SnippetPage').then((mod) => ({ default: mod.SnippetPage }))
)
const MySnippetsPage = lazy(() =>
  import('@/pages/MySnippetsPage').then((mod) => ({ default: mod.MySnippetsPage }))
)
const SharePage = lazy(() =>
  import('@/pages/SharePage').then((mod) => ({ default: mod.SharePage }))
)
const UserSettingsPage = lazy(() => import('@/pages/UserSettingsPage'))

const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const SetupPage = lazy(() => import('@/pages/admin/SetupPage'))
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'))
const SnippetsPage = lazy(() => import('@/pages/admin/SnippetsPage'))
const SnippetDetailPage = lazy(() => import('@/pages/admin/SnippetDetailPage'))
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'))
const SharesPage = lazy(() => import('@/pages/admin/SharesPage'))
const EmailConfigPage = lazy(() => import('@/pages/admin/EmailConfigPage'))
const AdminSettingsPage = lazy(() => import('@/pages/admin/AdminSettingsPage'))
const AuthConfigPage = lazy(() => import('@/pages/admin/AuthConfigPage'))

function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-foreground"></div>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <div className="min-h-screen gradient-mesh">
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/my-snippets" element={<MySnippetsPage />} />
              <Route path="/settings" element={<UserSettingsPage />} />
              <Route path="/s/:shareToken" element={<SharePage />} />

              <Route path="/admin/setup" element={<SetupPage />} />
              <Route path="/admin/login" element={<LoginPage />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="snippets" element={<SnippetsPage />} />
                <Route path="snippets/:id" element={<SnippetDetailPage />} />
                <Route path="users" element={<UsersPage />} />
                <Route path="shares" element={<SharesPage />} />
                <Route path="email" element={<EmailConfigPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="auth" element={<AuthConfigPage />} />
              </Route>

              <Route path="/:id" element={<SnippetPage />} />
            </Routes>
          </Suspense>
          <Toaster richColors position="bottom-right" />
        </div>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
