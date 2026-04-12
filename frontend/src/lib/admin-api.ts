/**
 * 管理后台 API 服务
 */

// 类型定义
export interface AdminStats {
  total_snippets: number;
  original_snippets: number;
  reply_snippets: number;
  today_snippets: number;
  week_snippets: number;
  month_snippets: number;
  language_stats: Record<string, number>;
}

export interface ExtendedStats {
  total_users: number;
  today_users: number;
  week_users: number;
  total_shares: number;
  active_shares: number;
  expired_shares: number;
  private_snippets: number;
  public_snippets: number;
}

export interface SnippetAdminItem {
  id: string;
  code_preview: string;
  language: string;
  parent_id: string | null;
  root_id: string | null;
  depth: number;
  message: string | null;
  children_count: number;
  created_at: string;
}

export interface SnippetListResponse {
  items: SnippetAdminItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface SnippetChildItem {
  id: string;
  code_preview: string;
  message: string | null;
  created_at: string;
}

export interface SnippetDetail {
  id: string;
  code: string;
  language: string;
  parent_id: string | null;
  root_id: string | null;
  depth: number;
  message: string | null;
  author_token: string | null;
  created_at: string;
  parent_code: string | null;
  parent_message: string | null;
  children_count: number;
  descendants_count: number;
}

export interface UserListItem {
  id: number;
  email: string;
  nickname: string | null;
  created_at: string;
  last_login_at: string | null;
  snippet_count: number;
}

export interface UserListResponse {
  items: UserListItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UserDetail {
  id: number;
  email: string;
  nickname: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  snippet_count: number;
  public_snippets: number;
  private_snippets: number;
}

export interface ShareItem {
  id: number;
  snippet_id: string;
  share_token: string;
  has_password: boolean;
  expires_at: string | null;
  max_views: number | null;
  current_views: number;
  created_at: string;
  snippet_preview: string;
  snippet_language: string;
}

export interface ShareListResponse {
  items: ShareItem[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EmailConfig {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password_set: boolean;
  smtp_from: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  nickname?: string;
}

export interface AuthSettings {
  login_enabled: boolean;
  login_with_code_enabled: boolean;
  register_enabled: boolean;
  register_email_verify: boolean;
}

// Token 管理
const TOKEN_KEY = 'codediff_admin_token';

export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

// API 请求封装
const apiRequest = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`/api/admin${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '请求失败' }));
    throw new Error(error.detail || '请求失败');
  }

  return response.json();
};

// API 函数
export const adminApi = {
  // 检查系统是否已初始化
  checkStatus: async (): Promise<{ initialized: boolean }> => {
    return apiRequest('/status');
  },

  // 初始化管理员
  initialize: async (username: string, password: string): Promise<{ message: string }> => {
    return apiRequest('/init', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // 登录
  login: async (username: string, password: string): Promise<{ access_token: string }> => {
    return apiRequest('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },

  // 获取统计数据
  getStats: async (): Promise<AdminStats> => {
    return apiRequest('/stats');
  },

  // 获取代码片段列表
  getSnippets: async (params: {
    page?: number;
    page_size?: number;
    search?: string;
    language?: string;
    only_original?: boolean;
  }): Promise<SnippetListResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.page_size) query.set('page_size', String(params.page_size));
    if (params.search) query.set('search', params.search);
    if (params.language) query.set('language', params.language);
    if (params.only_original) query.set('only_original', 'true');
    return apiRequest(`/snippets?${query.toString()}`);
  },

  // 获取代码片段详情
  getSnippetDetail: async (id: string): Promise<SnippetDetail> => {
    return apiRequest(`/snippets/${id}`);
  },

  // 删除单个代码片段
  deleteSnippet: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/snippets/${id}`, { method: 'DELETE' });
  },

  // 删除代码片段及其所有衍生版本
  deleteSnippetTree: async (id: string): Promise<{ message: string }> => {
    return apiRequest(`/snippets/${id}/tree`, { method: 'DELETE' });
  },

  // 获取代码片段的直接回复列表
  getSnippetChildren: async (id: string): Promise<SnippetChildItem[]> => {
    return apiRequest(`/snippets/${id}/children`);
  },

  // 获取扩展统计数据
  getExtendedStats: async (): Promise<ExtendedStats> => {
    return apiRequest('/stats/extended');
  },

  // ===== 用户管理 API =====
  
  // 获取用户列表
  getUsers: async (params: {
    page?: number;
    page_size?: number;
    search?: string;
  }): Promise<UserListResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.page_size) query.set('page_size', String(params.page_size));
    if (params.search) query.set('search', params.search);
    return apiRequest(`/users?${query.toString()}`);
  },

  // 获取用户详情
  getUserDetail: async (userId: number): Promise<UserDetail> => {
    return apiRequest(`/users/${userId}`);
  },

  // 删除用户
  deleteUser: async (userId: number): Promise<{ message: string }> => {
    return apiRequest(`/users/${userId}`, { method: 'DELETE' });
  },

  // ===== 分享管理 API =====
  
  // 获取分享列表
  getShares: async (params: {
    page?: number;
    page_size?: number;
    snippet_id?: string;
  }): Promise<ShareListResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.page_size) query.set('page_size', String(params.page_size));
    if (params.snippet_id) query.set('snippet_id', params.snippet_id);
    return apiRequest(`/shares?${query.toString()}`);
  },

  // 删除分享链接
  deleteShare: async (shareId: number): Promise<{ message: string }> => {
    return apiRequest(`/shares/${shareId}`, { method: 'DELETE' });
  },

  // ===== 系统配置 API =====
  
  // 获取邮件配置
  getEmailConfig: async (): Promise<EmailConfig> => {
    return apiRequest('/config/email');
  },

  // 更新邮件配置
  updateEmailConfig: async (config: {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_password?: string;
    smtp_from: string;
  }): Promise<{ message: string }> => {
    return apiRequest('/config/email', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  // 测试邮件配置
  testEmailConfig: async (email: string): Promise<{ message: string }> => {
    return apiRequest('/config/email/test', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // ===== 管理员账号设置 API =====

  // 修改管理员用户名（无需当前密码验证）
  updateAdminUsername: async (data: {
    new_username: string;
  }): Promise<{ message: string }> => {
    return apiRequest('/settings/username', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // 修改管理员密码（需验证当前密码）
  updateAdminPassword: async (data: {
    current_password: string;
    new_password: string;
  }): Promise<{ message: string }> => {
    return apiRequest('/settings/password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ===== 用户管理 API（续）=====

  // 创建新用户
  createUser: async (data: CreateUserRequest): Promise<{ message: string; user_id: number }> => {
    return apiRequest('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // ===== 认证配置 API =====

  // 获取认证开关配置
  getAuthConfig: async (): Promise<AuthSettings> => {
    return apiRequest('/config/auth');
  },

  // 更新认证开关配置
  updateAuthConfig: async (data: AuthSettings): Promise<{ message: string }> => {
    return apiRequest('/config/auth', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
