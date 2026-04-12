import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi, getToken, removeToken } from '@/lib/admin-api'
import { adminQueryKeys } from '@/lib/query-keys'

const guestSessionKey = [...adminQueryKeys.all(), 'session', 'guest'] as const

export function useAdminSessionStatus() {
  const queryClient = useQueryClient()
  const [token, setTokenState] = useState(() => getToken())

  const sessionQuery = useQuery({
    queryKey: token ? adminQueryKeys.session(token) : guestSessionKey,
    queryFn: () => adminApi.getStats(),
    enabled: !!token,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const statusQuery = useQuery({
    queryKey: adminQueryKeys.status(),
    queryFn: () => adminApi.checkStatus(),
    enabled: !token,
    retry: false,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  useEffect(() => {
    if (!sessionQuery.data) {
      return
    }

    queryClient.setQueryData(adminQueryKeys.stats(), sessionQuery.data)
  }, [queryClient, sessionQuery.data])

  useEffect(() => {
    if (!token || !sessionQuery.isError) {
      return
    }

    removeToken()
    setTokenState(null)
    queryClient.removeQueries({ queryKey: adminQueryKeys.all() })
  }, [queryClient, sessionQuery.isError, token])

  return {
    token,
    sessionQuery,
    statusQuery,
    isChecking: token ? sessionQuery.isPending : statusQuery.isPending,
    isAuthenticated: !!token && sessionQuery.isSuccess,
  }
}
