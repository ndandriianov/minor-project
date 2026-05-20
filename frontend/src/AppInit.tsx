import { useEffect } from 'react'
import { useMeQuery } from '@/store/api'
import { useAppDispatch } from '@/hooks/useAppDispatch'
import { setUser, setLoading } from '@/store/authSlice'

/**
 * Runs on mount: if access_token exists, fetches /api/auth/me to restore auth state.
 */
export default function AppInit({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const hasToken = Boolean(localStorage.getItem('access_token'))
  const { data, isLoading, isError } = useMeQuery(undefined, { skip: !hasToken })

  useEffect(() => {
    if (!hasToken) {
      dispatch(setLoading(false))
      return
    }
    if (data) {
      dispatch(setUser({ ...data.user, student: data.student, company: data.company, subscription: data.subscription }))
      return
    }
    if (isError) {
      dispatch(setLoading(false))
    }
  }, [data, isError, hasToken, dispatch])

  // While loading initial auth, still show children (guards handle spinner)
  void isLoading
  return <>{children}</>
}
