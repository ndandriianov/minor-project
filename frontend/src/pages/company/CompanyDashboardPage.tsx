import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useListCompanyInternshipsQuery } from '@/store/api'
import Card from '@/components/ui/Card'

export default function CompanyDashboardPage() {
  const { user } = useAuth()
  const { data: internships = [] } = useListCompanyInternshipsQuery()

  const published = internships.filter((i) => i.moderation_status === 'published').length
  const pending = internships.filter((i) => i.moderation_status === 'pending').length

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {user?.company?.name ?? 'Компания'}
      </h1>
      <p className="text-gray-500 mb-8">{user?.company?.city ?? ''}</p>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Link to="/company/internships">
          <Card className="hover:border-blue-300 transition-colors">
            <div className="text-3xl font-bold text-blue-600 mb-1">{internships.length}</div>
            <div className="font-medium text-gray-800">Всего стажировок</div>
          </Card>
        </Link>
        <Card>
          <div className="text-3xl font-bold text-green-600 mb-1">{published}</div>
          <div className="font-medium text-gray-800">Опубликовано</div>
        </Card>
        <Card>
          <div className="text-3xl font-bold text-yellow-500 mb-1">{pending}</div>
          <div className="font-medium text-gray-800">На модерации</div>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { to: '/company/internships/new', emoji: '➕', label: 'Создать стажировку', desc: 'Разместить новую вакансию' },
          { to: '/company/internships', emoji: '📋', label: 'Мои стажировки', desc: 'Управление и просмотр откликов' },
          { to: '/company/applications', emoji: '📨', label: 'Все отклики', desc: 'Общий inbox по всем вакансиям' },
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
