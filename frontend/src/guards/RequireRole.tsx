import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

interface RequireRoleProps {
  role: 'student' | 'company'
}

export default function RequireRole({ role }: RequireRoleProps) {
  const { user } = useAuth()
  if (user?.role !== role) return <Navigate to="/" replace />
  return <Outlet />
}
