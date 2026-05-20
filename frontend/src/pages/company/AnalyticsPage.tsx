import { Link } from 'react-router-dom'
import { useGetAnalyticsQuery } from '@/store/api'
import { useAuth } from '@/hooks/useAuth'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'

function StatCell({ value, label, color = 'gray' }: { value: number; label: string; color?: string }) {
  const colors: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-500',
    red: 'text-red-500',
    gray: 'text-gray-700',
  }
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const { data, isLoading } = useGetAnalyticsQuery()

  if (!user?.is_b2b) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <div className="text-4xl mb-4">📊</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Аналитика — тариф B2B</h1>
        <p className="text-gray-500 mb-6">Детальная статистика по откликам и конверсиям доступна на B2B-подписке.</p>
        <Link to="/subscription">
          <Button size="lg">Подключить B2B</Button>
        </Link>
      </div>
    )
  }

  if (isLoading) return <Spinner />
  if (!data) return null

  const { totals, per_internship } = data

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Аналитика</h1>
          <p className="text-sm text-gray-500 mt-0.5">Статистика откликов и конверсий по всем вакансиям</p>
        </div>
        <Link to="/company/dashboard" className="text-sm text-gray-500 hover:text-gray-700">← Дашборд</Link>
      </div>

      {/* Общие показатели */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Итого по всем вакансиям</h2>
        <div className="grid grid-cols-5 gap-4 divide-x divide-gray-100">
          <StatCell value={totals.views} label="Просмотров" color="blue" />
          <StatCell value={totals.applied} label="Откликов" color="gray" />
          <StatCell value={totals.interview} label="Интервью" color="yellow" />
          <StatCell value={totals.offer} label="Офферов" color="green" />
          <StatCell value={totals.rejected} label="Отказов" color="red" />
        </div>
      </div>

      {/* Детализация по вакансиям */}
      {per_internship.length === 0 ? (
        <p className="text-center text-gray-400 py-12">Нет данных — создайте вакансии и дождитесь откликов</p>
      ) : (
        <div className="space-y-3">
          {per_internship.map((row) => {
            const conv = row.conversion_to_offer_pct
            const convColor = conv >= 20 ? 'text-green-600' : conv >= 5 ? 'text-yellow-500' : 'text-gray-400'
            return (
              <div key={row.internship_id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <Link
                    to={`/company/internships/${row.internship_id}/applicants`}
                    className="font-semibold text-gray-900 hover:text-blue-600 truncate"
                  >
                    {row.title}
                  </Link>
                  <span className={`text-sm font-medium whitespace-nowrap ${convColor}`}>
                    {conv}% конверсия
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-blue-600">{row.views}</div>
                    <div className="text-xs text-gray-400">Просмотров</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-700">{row.applications}</div>
                    <div className="text-xs text-gray-400">Откликов</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-600">{row.by_status.applied}</div>
                    <div className="text-xs text-gray-400">Новые</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-500">{row.by_status.interview}</div>
                    <div className="text-xs text-gray-400">Интервью</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{row.by_status.offer}</div>
                    <div className="text-xs text-gray-400">Офферы</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-500">{row.by_status.rejected}</div>
                    <div className="text-xs text-gray-400">Отказы</div>
                  </div>
                </div>

                {/* Прогресс-бар воронки */}
                {row.applications > 0 && (
                  <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden flex">
                    <div
                      className="bg-yellow-400 h-full"
                      style={{ width: `${(row.by_status.interview / row.applications) * 100}%` }}
                    />
                    <div
                      className="bg-green-500 h-full"
                      style={{ width: `${(row.by_status.offer / row.applications) * 100}%` }}
                    />
                    <div
                      className="bg-red-400 h-full"
                      style={{ width: `${(row.by_status.rejected / row.applications) * 100}%` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
