import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListCompanyInternshipsQuery, useDeleteInternshipMutation, usePromoteInternshipMutation } from '@/store/api'
import { useAuth } from '@/hooks/useAuth'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Card from '@/components/ui/Card'

const STATUS_CONFIG: Record<string, { label: string; color: 'gray' | 'green' | 'yellow' | 'red' }> = {
  pending:   { label: 'На модерации', color: 'yellow' },
  published: { label: 'Опубликовано', color: 'green' },
  rejected:  { label: 'Отклонено', color: 'red' },
  archived:  { label: 'Архив', color: 'gray' },
}

const PROMOTE_DAYS_OPTIONS = [
  { value: '7', label: '7 дней' },
  { value: '14', label: '14 дней' },
  { value: '30', label: '30 дней' },
]

export default function MyInternshipsPage() {
  const { user } = useAuth()
  const { data: internships = [], isLoading } = useListCompanyInternshipsQuery()
  const [deleteInternship, { isLoading: deleting }] = useDeleteInternshipMutation()
  const [promoteInternship, { isLoading: promoting }] = usePromoteInternshipMutation()
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [promoteId, setPromoteId] = useState<number | null>(null)
  const [promoteDays, setPromoteDays] = useState('7')
  const navigate = useNavigate()

  const handleDelete = async () => {
    if (deleteId !== null) {
      await deleteInternship(deleteId)
      setDeleteId(null)
    }
  }

  const handlePromote = async () => {
    if (promoteId !== null) {
      await promoteInternship({ id: promoteId, days: Number(promoteDays) })
      setPromoteId(null)
    }
  }

  if (isLoading) return <Spinner />

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Мои стажировки</h1>
        <Button onClick={() => navigate('/company/internships/new')}>+ Создать</Button>
      </div>

      {internships.length === 0 ? (
        <EmptyState
          title="Нет стажировок"
          description="Создайте первую стажировку, чтобы начать поиск кандидатов"
          action={<Button onClick={() => navigate('/company/internships/new')}>Создать стажировку</Button>}
        />
      ) : (
        <div className="space-y-3">
          {internships.map((internship) => {
            const cfg = STATUS_CONFIG[internship.moderation_status] ?? { label: internship.moderation_status, color: 'gray' as const }
            return (
              <Card key={internship.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{internship.title}</h3>
                      <Badge color={cfg.color}>{cfg.label}</Badge>
                      {internship.is_promoted && (
                        <Badge color="indigo">⬆ В топе</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">
                      {internship.city && `${internship.city} · `}
                      {internship.work_format === 'office' ? 'Офис' : internship.work_format === 'hybrid' ? 'Гибрид' : 'Удалённо'}
                      {internship.is_paid && ' · Оплачивается'}
                      {internship.views_count > 0 && ` · ${internship.views_count} просмотров`}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Создано: {new Date(internship.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                    {user?.is_b2b && !internship.is_promoted && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPromoteId(internship.id)}
                      >
                        ⬆ В топ
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/company/internships/${internship.id}/applicants`)}
                    >
                      Отклики
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate(`/company/internships/${internship.id}/edit`)}
                    >
                      Изменить
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setDeleteId(internship.id)}
                    >
                      Удалить
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Удалить стажировку"
        onConfirm={handleDelete}
        confirmText="Удалить"
        confirmVariant="danger"
        loading={deleting}
      >
        Это действие нельзя отменить. Все отклики на эту стажировку также будут удалены.
      </Modal>

      <Modal
        isOpen={promoteId !== null}
        onClose={() => setPromoteId(null)}
        title="Поднять вакансию в топ"
        onConfirm={handlePromote}
        confirmText="Продвинуть"
        loading={promoting}
      >
        <p className="mb-4">Вакансия будет показываться в топе поисковой выдачи выбранное количество дней.</p>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Период продвижения</label>
          <div className="flex gap-3">
            {PROMOTE_DAYS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPromoteDays(opt.value)}
                className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
                  promoteDays === opt.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
