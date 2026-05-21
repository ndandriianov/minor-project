import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListApplicationsQuery, useWithdrawMutation } from '@/store/api'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
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

export default function ApplicationsPage() {
  const [status, setStatus] = useState('')
  const { data: applications = [], isLoading } = useListApplicationsQuery(
    status ? { status: status as 'applied' | 'interview' | 'offer' | 'rejected' | 'withdrawn' } : undefined,
  )
  const [withdraw, { isLoading: withdrawing }] = useWithdrawMutation()
  const [withdrawId, setWithdrawId] = useState<number | null>(null)
  const navigate = useNavigate()

  const handleWithdraw = async () => {
    if (withdrawId !== null) {
      await withdraw(withdrawId)
      setWithdrawId(null)
    }
  }

  if (isLoading) return <Spinner />

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мои отклики</h1>
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
          description="Найдите подходящую вакансию и откликнитесь"
          action={<Button onClick={() => navigate('/internships')}>Найти вакансию</Button>}
        />
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <Card key={app.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/internships/${app.internship_id}`)}
                    className="font-semibold text-gray-900 hover:text-blue-600 text-left truncate block"
                  >
                    {app.internship?.title ?? `Стажировка #${app.internship_id}`}
                  </button>
                  <p className="text-sm text-gray-500">
                    {app.internship?.company?.name}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Отправлен: {new Date(app.created_at).toLocaleDateString('ru-RU')}
                    {app.updated_at !== app.created_at && (
                      <> · Обновлён: {new Date(app.updated_at).toLocaleDateString('ru-RU')}</>
                    )}
                  </p>
                  {app.cover_letter && (
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{app.cover_letter}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusBadge status={app.status} />
                  {app.status === 'applied' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setWithdrawId(app.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      Отозвать
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={withdrawId !== null}
        onClose={() => setWithdrawId(null)}
        title="Отозвать отклик"
        onConfirm={handleWithdraw}
        confirmText="Отозвать"
        confirmVariant="danger"
        loading={withdrawing}
      >
        Вы уверены, что хотите отозвать этот отклик?
      </Modal>
    </div>
  )
}
