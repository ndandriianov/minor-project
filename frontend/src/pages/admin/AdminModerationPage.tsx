import { useState } from 'react'
import { useListPendingQuery, useModerateMutation } from '@/store/api'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import SkillTag from '@/components/skills/SkillTag'
import Textarea from '@/components/ui/Textarea'

export default function AdminModerationPage() {
  const { data: pending = [], isLoading } = useListPendingQuery()
  const [moderate, { isLoading: moderating }] = useModerateMutation()
  const [comments, setComments] = useState<Record<number, string>>({})
  const [expanded, setExpanded] = useState<number | null>(null)

  const handle = async (id: number, action: 'approve' | 'reject') => {
    await moderate({ id, action, comment: comments[id] })
  }

  if (isLoading) return <Spinner />

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Модерация</h1>
      <p className="text-sm text-gray-500 mb-6">Стажировок на проверке: {pending.length}</p>

      {pending.length === 0 ? (
        <EmptyState title="Нет заявок на модерацию" description="Все вакансии проверены" />
      ) : (
        <div className="space-y-4">
          {pending.map((internship) => (
            <Card key={internship.id}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{internship.title}</h3>
                  <p className="text-sm text-gray-500">
                    {internship.company.name}
                    {internship.city ? ` · ${internship.city}` : ''}
                    {' · '}
                    {internship.work_format === 'office' ? 'Офис' : internship.work_format === 'hybrid' ? 'Гибрид' : 'Удалённо'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Подано: {new Date(internship.created_at).toLocaleDateString('ru-RU')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setExpanded(expanded === internship.id ? null : internship.id)}
                className="text-xs text-blue-600 hover:underline mb-3"
              >
                {expanded === internship.id ? 'Свернуть' : 'Подробнее'}
              </button>

              {expanded === internship.id && (
                <div className="space-y-3 mb-4">
                  <div>
                    <p className="text-xs font-medium text-gray-400 mb-1">Описание</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{internship.description}</p>
                  </div>
                  {internship.requirements && (
                    <div>
                      <p className="text-xs font-medium text-gray-400 mb-1">Требования</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{internship.requirements}</p>
                    </div>
                  )}
                  {internship.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {internship.required_skills.map((s) => <SkillTag key={s.id} name={s.name} />)}
                    </div>
                  )}
                </div>
              )}

              <Textarea
                placeholder="Комментарий (необязательно)"
                rows={2}
                value={comments[internship.id] ?? ''}
                onChange={(e) => setComments((c) => ({ ...c, [internship.id]: e.target.value }))}
                className="mb-3"
              />

              <div className="flex gap-3">
                <Button
                  onClick={() => handle(internship.id, 'approve')}
                  loading={moderating}
                >
                  Одобрить
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handle(internship.id, 'reject')}
                  loading={moderating}
                >
                  Отклонить
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
