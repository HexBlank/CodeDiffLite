// API 类型定义

export interface Snippet {
  id: string
  code: string
  parent_id: string | null
  root_id: string | null
  depth: number
  language: string
  message: string | null
  author_token: string | null
  parent_code: string | null
  created_at: string
  children_count: number
}

export interface SnippetListItem {
  id: string
  parent_id: string | null
  depth: number
  language: string
  message: string | null
  created_at: string
  code_preview: string
}

export interface VersionTreeResponse {
  root: Snippet
  descendants: SnippetListItem[]
  is_owner: boolean  // 是否是原始作者
}

export interface ShareRequest {
  code: string
  parent_id?: string | null
  language: string
  message?: string | null
}

// ===== 用户相关类型 =====
export interface User {
  id: number
  email: string
  nickname: string | null
  avatar_url: string | null
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: User
}

export interface AuthSettings {
  login_enabled: boolean
  login_with_code_enabled: boolean
  register_enabled: boolean
  register_email_verify: boolean
  smtp_configured: boolean
}

export interface MySnippetItem {
  id: string
  code_preview: string
  language: string
  message: string | null
  is_public: boolean
  allow_fork: boolean
  status: number
  children_count: number
  descendants_count: number
  created_at: string
  updated_at: string | null
}

export interface MySnippetsResponse {
  items: MySnippetItem[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface CreateShareRequest {
  snippet_id: string
  password?: string
  expires_days?: number
  max_views?: number
}

export interface ShareInfo {
  share_token: string
  has_password: boolean
  expires_at: string | null
  current_views: number
  max_views: number | null
}

// 获取存储的 token
function getAuthToken(): string | null {
  return localStorage.getItem('codediff_token')
}

// 设置 token
function setAuthToken(token: string | null) {
  if (token) {
    localStorage.setItem('codediff_token', token)
  } else {
    localStorage.removeItem('codediff_token')
  }
}

// API 客户端
const API_BASE = '/api'

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }
  return response.json()
}

// 带认证的请求
async function authFetch<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const response = await fetch(url, { ...options, headers })
  return handleResponse<T>(response)
}

export const api = {
  // ===== 代码片段 API =====
  
  // 获取代码片段
  async getSnippet(id: string): Promise<Snippet> {
    return authFetch<Snippet>(`${API_BASE}/snippet/${id}`)
  },

  // 获取子版本列表
  async getChildren(id: string): Promise<SnippetListItem[]> {
    const response = await fetch(`${API_BASE}/snippet/${id}/children`)
    return handleResponse<SnippetListItem[]>(response)
  },

  // 获取所有衍生版本
  async getDescendants(id: string): Promise<SnippetListItem[]> {
    const response = await fetch(`${API_BASE}/snippet/${id}/descendants`)
    return handleResponse<SnippetListItem[]>(response)
  },

  // 获取版本树
  async getTree(id: string): Promise<VersionTreeResponse> {
    const response = await fetch(`${API_BASE}/snippet/${id}/tree`)
    return handleResponse<VersionTreeResponse>(response)
  },

  // 分享/保存代码片段
  async share(data: ShareRequest): Promise<Snippet> {
    return authFetch<Snippet>(`${API_BASE}/share`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // ===== 用户认证 API =====
  
  // 发送验证码
  async sendCode(email: string, purpose: string = 'register'): Promise<{ message: string; email: string }> {
    const response = await fetch(`${API_BASE}/auth/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose }),
    })
    return handleResponse(response)
  },

  // 获取认证开关配置
  async getAuthSettings(): Promise<AuthSettings> {
    const response = await fetch(`${API_BASE}/auth/settings`)
    return handleResponse<AuthSettings>(response)
  },

  // 注册
  async register(email: string, code: string | undefined, password: string, nickname?: string): Promise<AuthResponse> {
    const body: Record<string, string> = { email, password }
    if (code) body.code = code
    if (nickname) body.nickname = nickname
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await handleResponse<AuthResponse>(response)
    setAuthToken(result.access_token)
    return result
  },

  // 登录（密码）
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const result = await handleResponse<AuthResponse>(response)
    setAuthToken(result.access_token)
    return result
  },

  // 登录（验证码）
  async loginWithCode(email: string, code: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE}/auth/login-with-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    })
    const result = await handleResponse<AuthResponse>(response)
    setAuthToken(result.access_token)
    return result
  },

  // 获取当前用户
  async getMe(): Promise<User> {
    return authFetch<User>(`${API_BASE}/auth/me`)
  },

  // 退出登录
  logout() {
    setAuthToken(null)
  },

  // 检查是否已登录
  isLoggedIn(): boolean {
    return !!getAuthToken()
  },

  // 获取 token
  getToken(): string | null {
    return getAuthToken()
  },

  // ===== 我的代码库 API =====
  
  // 获取我的代码列表
  async getMySnippets(page: number = 1, pageSize: number = 20, status?: number): Promise<MySnippetsResponse> {
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
    if (status !== undefined) params.append('status', String(status))
    return authFetch<MySnippetsResponse>(`${API_BASE}/my/snippets?${params}`)
  },

  // 更新代码设置
  async updateSnippet(snippetId: string, data: { is_public?: boolean; allow_fork?: boolean; status?: number }): Promise<{ message: string }> {
    return authFetch<{ message: string }>(`${API_BASE}/my/snippets/${snippetId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  // 删除代码
  async deleteSnippet(snippetId: string): Promise<{ message: string }> {
    return authFetch<{ message: string }>(`${API_BASE}/my/snippets/${snippetId}`, {
      method: 'DELETE',
    })
  },

  // ===== 私密分享 API =====
  
  // 创建私密分享
  async createShare(data: CreateShareRequest): Promise<{ share_token: string; share_url: string; has_password: boolean; expires_at: string | null }> {
    return authFetch(`${API_BASE}/shares`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 获取分享信息
  async getShareInfo(shareToken: string): Promise<ShareInfo> {
    const response = await fetch(`${API_BASE}/shares/${shareToken}/info`)
    return handleResponse<ShareInfo>(response)
  },

  // 验证分享密码
  async verifyShare(shareToken: string, password: string): Promise<{ snippet: Snippet }> {
    const response = await fetch(`${API_BASE}/shares/${shareToken}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    return handleResponse<{ snippet: Snippet }>(response)
  },

  // ===== 版本对比 API =====
  
  // 对比两个版本
  async compare(baseId: string, compareId: string): Promise<{
    base: Snippet
    compare: Snippet
    original: string
    modified: string
    is_same_root: boolean
  }> {
    return authFetch(`${API_BASE}/compare`, {
      method: 'POST',
      body: JSON.stringify({ base_id: baseId, compare_id: compareId }),
    })
  },

  // ===== 用户设置 API =====

  // 更新用户资料
  async updateProfile(data: { nickname?: string }): Promise<{ message: string; user: User }> {
    return authFetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // 修改密码（原密码验证）
  async changePassword(data: { current_password: string; new_password: string }): Promise<{ message: string }> {
    return authFetch(`${API_BASE}/auth/change-password`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 修改密码（验证码验证）
  async changePasswordByCode(data: { code: string; new_password: string }): Promise<{ message: string }> {
    return authFetch(`${API_BASE}/auth/change-password-by-code`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 修改邮箱
  async changeEmail(data: { new_email: string; code: string }): Promise<{ message: string; user: User }> {
    return authFetch(`${API_BASE}/auth/change-email`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // 重置密码（忘记密码）
  async resetPassword(data: { email: string; code: string; new_password: string }): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return handleResponse(response)
  },
}

// 支持的语言列表
export const LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
  { value: 'sql', label: 'SQL' },
  { value: 'shell', label: 'Shell/Bash' },
] as const

export type LanguageValue = typeof LANGUAGES[number]['value']
