import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <Link to="/" className="text-xl font-bold text-blue-600">
          Стажировки
        </Link>

        <div className="flex items-center gap-2">
          <Link
            to="/internships"
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
          >
            Все стажировки
          </Link>

          {!isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>
                Войти
              </Button>
              <Button size="sm" onClick={() => navigate('/register/student')}>
                Регистрация
              </Button>
            </>
          ) : user?.role === 'student' ? (
            <>
              <Link to="/student/recommendations" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
                Рекомендации
              </Link>
              <Link to="/student/applications" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
                Мои отклики
              </Link>
              <Link to="/student/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
                {user.student?.first_name ?? 'Профиль'}
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Выйти
              </Button>
            </>
          ) : user?.role === 'company' ? (
            <>
              <Link to="/company/internships" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">
                Мои стажировки
              </Link>
              <Link to="/company/dashboard" className="text-sm font-medium text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
                {user.company?.name ?? 'Компания'}
              </Link>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                Выйти
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
