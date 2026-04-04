import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGetApplicantsQuery, useUpdateAppStatusMutation } from '@/store/api'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import StatusBadge from '@/components/applications/StatusBadge'
import Card from '@/components/ui/Card'
import SkillTag from '@/components/skills/SkillTag'
import Select from '@/components/ui/Select'

const STATUS_OPTIONS = [
  { value: '', label: 'Все статусы' },
  { value: 'applied', label: 'Отправлен' },
  { value: 'interview', label: 'Интервью' },
  { value: 'offer', label: 'Оффер' },
  { value: 'rejected', label: 'Отказ' },
]

const UPDATE_STATUS_OPTIONS = STATUS_OPTIONS.filter((o) => o.value)

export default function InternshipApplicantsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const internshipId = Number(id)
  const [status, setStatus] = useState('')

  const { data: applications = [], isLoading } = useGetApplicantsQuery({
    internshipId,
    params: status ? { status: status as 'applied' | 'interview' | 'offer' | 'rejected' } : undefined,
  })
  const [updateStatus] = useUpdateAppStatusMutation()

  if (isLoading) return <Spinner />

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline mb-4 block">
        ← Назад к стажировкам
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Отклики ({applications.length})
      </h1>

      <div className="w-full sm:w-56 mb-4">
        <Select
          label="Фильтр по статусу"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(e) => setStatus(e.target.value)}
        />
      </div>

      {applications.length === 0 ? (
        <EmptyState
          title="Откликов пока нет"
          description="Когда студенты откликнутся, они появятся здесь"
        />
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const student = app.student
            return (
              <Card key={app.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">
                        {student?.first_name} {student?.last_name}
                      </h3>
                      <StatusBadge status={app.status} />
                    </div>
                    {student?.university && (
                      <p className="text-sm text-gray-500">
                        {student.university}
                        {student.faculty ? `, ${student.faculty}` : ''}
                        {student.course ? `, ${student.course} курс` : ''}
                      </p>
                    )}
                    {student?.city && (
                      <p className="text-xs text-gray-400">{student.city}</p>
                    )}
                    {student?.skills && student.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {student.skills.slice(0, 6).map((s) => <SkillTag key={s.id} name={s.name} />)}
                      </div>
                    )}
                    {app.cover_letter && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                        <p className="font-medium text-xs text-gray-400 mb-1">Сопроводительное письмо:</p>
                        {app.cover_letter}
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Отклик: {new Date(app.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {student?.resume_filename && (
                      <a
                        href={`http://localhost:5051/uploads/${student.resume_filename}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        📄 Резюме
                      </a>
                    )}
                    <select
                      value={app.status}
                      onChange={(e) => updateStatus({ id: app.id, status: e.target.value })}
                      className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {UPDATE_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
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
