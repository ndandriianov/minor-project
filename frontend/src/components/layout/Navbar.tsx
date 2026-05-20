import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import NotificationBell from '@/components/notifications/NotificationBell'

const link = ({ isActive }: { isActive: boolean }) =>
  `text-sm px-3 py-1.5 rounded-lg transition ${
    isActive
      ? 'font-medium text-blue-600 bg-blue-50'
      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
  }`

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
        <NavLink to="/" className="text-xl font-bold text-blue-600">
          Стажировки
        </NavLink>

        <div className="flex items-center gap-1">
          <NavLink to="/internships" className={link}>Все стажировки</NavLink>

          {/* Публичные разделы — только для не-админов */}
          {user?.role !== 'admin' && (
            <>
              <NavLink to="/articles" className={link}>Статьи</NavLink>
              <NavLink to="/news" className={link}>Новости</NavLink>
            </>
          )}

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
              <NavLink to="/student/recommendations" className={link}>Рекомендации</NavLink>
              <NavLink to="/student/applications" className={link}>Мои отклики</NavLink>
              <NavLink to="/student/profile" className={link}>Профиль</NavLink>
              <NavLink to="/subscription" className={link}>Подписка</NavLink>
              <NavLink
                to="/student/dashboard"
                className={({ isActive }) =>
                  `text-sm px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1 ${
                    isActive ? 'text-blue-600 bg-blue-50' : 'text-blue-600 hover:bg-blue-50'
                  }`
                }
              >
                {user.is_premium && <span title="Premium">⭐</span>}
                {user.student?.first_name ?? 'Профиль'}
              </NavLink>
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={handleLogout}>Выйти</Button>
            </>
          ) : user?.role === 'company' ? (
            <>
              <NavLink to="/company/internships" className={link}>Мои стажировки</NavLink>
              <NavLink to="/company/applications" className={link}>Отклики</NavLink>
              {user.is_b2b && (
                <NavLink to="/company/students/search" className={link}>Поиск студентов</NavLink>
              )}
              <NavLink to="/subscription" className={link}>Подписка</NavLink>
              <NavLink
                to="/company/dashboard"
                className={({ isActive }) =>
                  `text-sm px-3 py-1.5 rounded-lg transition font-medium flex items-center gap-1 ${
                    isActive ? 'text-blue-600 bg-blue-50' : 'text-blue-600 hover:bg-blue-50'
                  }`
                }
              >
                {user.is_b2b && (
                  <span className="text-xs bg-blue-100 text-blue-700 rounded px-1 font-medium">B2B</span>
                )}
                {user.company?.name ?? 'Компания'}
              </NavLink>
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={handleLogout}>Выйти</Button>
            </>
          ) : user?.role === 'admin' ? (
            <>
              <NavLink to="/admin/moderation" className={link}>Модерация</NavLink>
              <NavLink to="/admin/applications" className={link}>Отклики</NavLink>
              <NavLink to="/admin/articles" className={link}>Статьи</NavLink>
              <NavLink to="/admin/news" className={link}>Новости</NavLink>
              <NotificationBell />
              <Button variant="ghost" size="sm" onClick={handleLogout}>Выйти</Button>
            </>
          ) : null}
        </div>
      </div>
    </nav>
  )
}
