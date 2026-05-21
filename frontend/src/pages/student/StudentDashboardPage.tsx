import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useListApplicationsQuery, useListBookmarksQuery } from '@/store/api'
import Card from '@/components/ui/Card'

export default function StudentDashboardPage() {
  const { user } = useAuth()
  const student = user?.student
  const { data: applications = [] } = useListApplicationsQuery()
  const { data: bookmarks = [] } = useListBookmarksQuery()

  const activeApps = applications.filter((a) => !['rejected', 'withdrawn'].includes(a.status))

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        Привет, {student?.first_name ?? 'студент'}!
      </h1>
      <p className="text-gray-500 mb-8">{student?.university ?? ''} · {student?.city ?? ''}</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <Link to="/student/applications">
          <Card className="hover:border-blue-300 transition-colors">
            <div className="text-3xl font-bold text-blue-600 mb-1">{activeApps.length}</div>
            <div className="font-medium text-gray-800">Активных откликов</div>
            <div className="text-xs text-gray-500 mt-1">из {applications.length} всего</div>
          </Card>
        </Link>
        <Link to="/student/bookmarks">
          <Card className="hover:border-blue-300 transition-colors">
            <div className="text-3xl font-bold text-blue-600 mb-1">{bookmarks.length}</div>
            <div className="font-medium text-gray-800">Сохранённых стажировок</div>
          </Card>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { to: '/student/recommendations', emoji: '🎯', label: 'Рекомендации', desc: 'Подборка под ваш профиль' },
          { to: '/internships', emoji: '🔍', label: 'Все вакансии', desc: 'Поиск с фильтрами' },
          { to: '/student/profile', emoji: '👤', label: 'Мой профиль', desc: 'Навыки, резюме, предпочтения' },
          { to: '/student/applications', emoji: '📋', label: 'Мои отклики', desc: 'Статусы и история' },
        ].map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="flex items-center gap-4 hover:border-blue-300 transition-colors">
              <span className="text-2xl">{item.emoji}</span>
              <div>
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
