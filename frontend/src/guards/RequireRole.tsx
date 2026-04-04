import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { AuthUser } from '@/types'

interface RequireRoleProps {
  role: AuthUser['role'] | AuthUser['role'][]
}

export default function RequireRole({ role }: RequireRoleProps) {
  const { user } = useAuth()
  const allowedRoles = Array.isArray(role) ? role : [role]
  if (!user || !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}
