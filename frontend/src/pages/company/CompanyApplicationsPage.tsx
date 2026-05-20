import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useListCompanyApplicationsQuery, useUpdateAppStatusMutation } from '@/store/api'
import { buildAssetUrl } from '@/config/api'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import StatusBadge from '@/components/applications/StatusBadge'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'applied', label: 'Отправлен' },
  { value: 'interview', label: 'Интервью' },
  { value: 'offer', label: 'Оффер' },
  { value: 'rejected', label: 'Отказ' },
  { value: 'withdrawn', label: 'Отозван' },
]

const NEXT_STATUS_OPTIONS = [
  { value: 'applied', label: 'Отправлен' },
  { value: 'interview', label: 'Интервью' },
  { value: 'offer', label: 'Оффер' },
  { value: 'rejected', label: 'Отказ' },
]

export default function CompanyApplicationsPage() {
  const [status, setStatus] = useState('')
  const { data: applications = [], isLoading } = useListCompanyApplicationsQuery(
    status ? { status: status as 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn' } : undefined,
  )
  const [updateStatus] = useUpdateAppStatusMutation()

  const stats = useMemo(() => {
    return {
      total: applications.length,
      applied: applications.filter((a) => a.status === 'applied').length,
      interview: applications.filter((a) => a.status === 'interview').length,
      offer: applications.filter((a) => a.status === 'offer').length,
    }
  }, [applications])

  if (isLoading) return <Spinner />

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Все отклики</h1>
          <p className="text-sm text-gray-500 mt-1">
            Всего: {stats.total} · Новые: {stats.applied} · Интервью: {stats.interview} · Офферы: {stats.offer}
          </p>
        </div>
        <div className="w-full sm:w-56">
          <Select
            label="Фильтр по статусу"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(e) => setStatus(e.target.value)}
          />
        </div>
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="Откликов пока нет"
          description="Когда студенты начнут откликаться, список появится здесь"
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const student = app.student
            const internship = app.internship
            return (
              <Card key={app.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={app.status} />
                      <p className="text-sm text-gray-500">Отклик #{app.id}</p>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{student?.first_name} {student?.last_name}</p>
                    <Link to={`/company/internships/${app.internship_id}/applicants`} className="text-sm text-blue-600 hover:underline">
                      {internship?.title ?? `Стажировка #${app.internship_id}`}
                    </Link>
                    {internship?.company?.name && <p className="text-xs text-gray-500">{internship.company.name}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      Отправлен: {new Date(app.created_at).toLocaleDateString('ru-RU')}
                    </p>
                    {app.cover_letter && (
                      <p className="text-sm text-gray-700 mt-2 line-clamp-2">{app.cover_letter}</p>
                    )}
                    {student?.resume_filename && (
                      <a
                        href={buildAssetUrl(`/uploads/${student.resume_filename}`)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1"
                      >
                        📄 Скачать резюме
                      </a>
                    )}
                  </div>

                  <div className="w-40">
                    <Select
                      label="Статус"
                      value={app.status}
                      options={NEXT_STATUS_OPTIONS}
                      onChange={(e) => updateStatus({ id: app.id, status: e.target.value })}
                    />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

