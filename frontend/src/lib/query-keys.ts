export interface AdminSnippetsQueryParams {
  page: number
  pageSize: number
  search?: string
  language?: string
  onlyOriginal?: boolean
}

export interface AdminUsersQueryParams {
  page: number
  pageSize: number
  search?: string
}

export interface AdminSharesQueryParams {
  page: number
  pageSize: number
  snippetId?: string
}

export interface MySnippetsQueryParams {
  page: number
  pageSize: number
  status: number
}

const adminBaseKey = ['admin'] as const
const adminSnippetsBaseKey = [...adminBaseKey, 'snippets'] as const
const adminUsersBaseKey = [...adminBaseKey, 'users'] as const
const adminSharesBaseKey = [...adminBaseKey, 'shares'] as const
const adminEmailConfigBaseKey = [...adminBaseKey, 'config', 'email'] as const
const adminAuthConfigBaseKey = [...adminBaseKey, 'config', 'auth'] as const
const mySnippetsBaseKey = ['my-snippets'] as const
const authSettingsBaseKey = ['auth-settings'] as const

export const adminQueryKeys = {
  all: () => adminBaseKey,
  session: (token: string) => [...adminBaseKey, 'session', token] as const,
  status: () => [...adminBaseKey, 'status'] as const,
  stats: () => [...adminBaseKey, 'stats'] as const,
  extendedStats: () => [...adminBaseKey, 'stats', 'extended'] as const,
  snippets: () => adminSnippetsBaseKey,
  snippetList: (params: AdminSnippetsQueryParams) => [...adminSnippetsBaseKey, params] as const,
  snippetDetail: (id: string) => [...adminSnippetsBaseKey, id] as const,
  snippetChildren: (id: string) => [...adminSnippetsBaseKey, id, 'children'] as const,
  users: () => adminUsersBaseKey,
  userList: (params: AdminUsersQueryParams) => [...adminUsersBaseKey, params] as const,
  userDetail: (userId: number) => [...adminUsersBaseKey, userId] as const,
  shares: () => adminSharesBaseKey,
  shareList: (params: AdminSharesQueryParams) => [...adminSharesBaseKey, params] as const,
  emailConfig: () => adminEmailConfigBaseKey,
  authConfig: () => adminAuthConfigBaseKey,
}

export const myQueryKeys = {
  snippets: () => mySnippetsBaseKey,
  snippetList: (params: MySnippetsQueryParams) => [...mySnippetsBaseKey, params] as const,
}

export const authQueryKeys = {
  settings: () => authSettingsBaseKey,
}

