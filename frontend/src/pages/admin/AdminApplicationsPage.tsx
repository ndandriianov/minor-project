import { useState } from 'react'
import { useListAdminApplicationsQuery } from '@/store/api'
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

export default function AdminApplicationsPage() {
  const [status, setStatus] = useState('')
  const { data: applications = [], isLoading } = useListAdminApplicationsQuery(
    status ? { status: status as 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn' } : undefined,
  )

  if (isLoading) return <Spinner />

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Отклики по платформе</h1>
          <p className="text-sm text-gray-500 mt-1">Read-only просмотр откликов для модератора</p>
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
        <EmptyState title="Отклики не найдены" description="Попробуйте изменить фильтры" />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">
                    {app.student?.first_name} {app.student?.last_name}
                  </p>
                  <p className="text-sm text-gray-600 truncate">
                    {app.internship?.title ?? `Стажировка #${app.internship_id}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    Компания: {app.internship?.company?.name ?? '—'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Дата отклика: {new Date(app.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <StatusBadge status={app.status} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

