import { useAppSelector, useAppDispatch } from './useAppDispatch'
import { logout } from '@/store/authSlice'

export function useAuth() {
  const user = useAppSelector((s) => s.auth.user)
  const isLoading = useAppSelector((s) => s.auth.isLoading)
  const dispatch = useAppDispatch()

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    role: user?.role ?? null,
    logout: () => dispatch(logout()),
  }
}
