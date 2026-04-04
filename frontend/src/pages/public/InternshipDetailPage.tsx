import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGetInternshipQuery, useApplyMutation, useListApplicationsQuery, useAddBookmarkMutation, useRemoveBookmarkMutation, useListBookmarksQuery } from '@/store/api'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SkillTag from '@/components/skills/SkillTag'
import Modal from '@/components/ui/Modal'
import Textarea from '@/components/ui/Textarea'
import { useAuth } from '@/hooks/useAuth'

const FORMAT_LABEL: Record<string, string> = { office: 'Офис', hybrid: 'Гибрид', remote: 'Удалённо' }
const EXP_LABEL: Record<string, string> = { none: 'Без опыта', '<1year': 'До 1 года', '1-3years': '1–3 года' }

export default function InternshipDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const internshipId = Number(id)

  const { data: internship, isLoading } = useGetInternshipQuery(internshipId)
  const isStudent = user?.role === 'student'

  const { data: applications = [] } = useListApplicationsQuery(undefined, { skip: !isStudent })
  const { data: bookmarks = [] } = useListBookmarksQuery(undefined, { skip: !isStudent })
  const [apply, { isLoading: applying }] = useApplyMutation()
  const [addBookmark] = useAddBookmarkMutation()
  const [removeBookmark] = useRemoveBookmarkMutation()

  const [applyOpen, setApplyOpen] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')

  const alreadyApplied = applications.some((a) => a.internship_id === internshipId)
  const isBookmarked = bookmarks.some((b) => b.internship_id === internshipId)

  const handleApply = async () => {
    await apply({ internship_id: internshipId, cover_letter: coverLetter || undefined })
    setApplyOpen(false)
    navigate('/student/applications')
  }

  if (isLoading) return <Spinner />
  if (!internship) return <div className="text-center py-16 text-gray-500">Стажировка не найдена</div>

  const salary =
    internship.salary_min && internship.salary_max
      ? `${internship.salary_min.toLocaleString()}–${internship.salary_max.toLocaleString()} ₽/мес`
      : internship.salary_min
      ? `от ${internship.salary_min.toLocaleString()} ₽/мес`
      : internship.is_paid ? 'Оплачивается' : 'Не оплачивается'

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline mb-4 block">
        ← Назад
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-4">
            {internship.company.logo_url ? (
              <img src={internship.company.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-500">
                {internship.company.name[0]}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{internship.title}</h1>
              <p className="text-gray-500">{internship.company.name}</p>
              {internship.company.website && (
                <a href={internship.company.website} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                  {internship.company.website}
                </a>
              )}
            </div>
          </div>

          {isStudent && (
            <button
              onClick={() => isBookmarked ? removeBookmark(internship.id) : addBookmark(internship.id)}
              className="text-2xl text-gray-400 hover:text-blue-600 transition-colors"
            >
              {isBookmarked ? '🔖' : '🏷️'}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Badge color={internship.work_format === 'remote' ? 'purple' : internship.work_format === 'hybrid' ? 'green' : 'blue'}>
            {FORMAT_LABEL[internship.work_format]}
          </Badge>
          {internship.city && <Badge color="gray">{internship.city}</Badge>}
          {internship.direction && <Badge color="indigo">{internship.direction}</Badge>}
          {internship.compatible_with_study && <Badge color="green">Совм. с учёбой</Badge>}
          {internship.counts_as_practice && <Badge color="purple">Зачёт практики</Badge>}
          {internship.is_verified && <Badge color="blue">✓ Проверено</Badge>}
          <Badge color="gray">{EXP_LABEL[internship.required_experience]}</Badge>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">Зарплата</p>
            <p className="font-semibold text-gray-900">{salary}</p>
          </div>
          {(internship.min_hours || internship.max_hours) && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Часы в неделю</p>
              <p className="font-semibold text-gray-900">
                {internship.min_hours && internship.max_hours
                  ? `${internship.min_hours}–${internship.max_hours} ч`
                  : internship.max_hours ? `до ${internship.max_hours} ч` : `от ${internship.min_hours} ч`}
              </p>
            </div>
          )}
          {internship.schedule && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">График</p>
              <p className="font-semibold text-gray-900">{internship.schedule}</p>
            </div>
          )}
          {internship.deadline && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Дедлайн</p>
              <p className="font-semibold text-gray-900">
                {new Date(internship.deadline).toLocaleDateString('ru-RU')}
              </p>
            </div>
          )}
        </div>

        {isStudent && (
          <div className="mb-4">
            {alreadyApplied ? (
              <Button variant="secondary" disabled>Вы уже откликнулись</Button>
            ) : (
              <Button onClick={() => setApplyOpen(true)}>Откликнуться</Button>
            )}
          </div>
        )}

        {!user && (
          <p className="text-sm text-gray-500 mb-4">
            <button onClick={() => navigate('/login')} className="text-blue-600 hover:underline">Войдите</button>{' '}
            как студент, чтобы откликнуться
          </p>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Описание</h2>
        <p className="text-gray-700 whitespace-pre-wrap">{internship.description}</p>
      </div>

      {internship.requirements && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Требования</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{internship.requirements}</p>
        </div>
      )}

      {internship.selection_stages && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Этапы отбора</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{internship.selection_stages}</p>
        </div>
      )}

      {internship.required_skills.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Требуемые навыки</h2>
          <div className="flex flex-wrap gap-2">
            {internship.required_skills.map((s) => (
              <SkillTag key={s.id} name={s.name} />
            ))}
          </div>
        </div>
      )}

      <Modal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Отклик на стажировку"
        onConfirm={handleApply}
        confirmText="Отправить отклик"
        loading={applying}
      >
        <p className="mb-3">Вы откликаетесь на: <strong>{internship.title}</strong></p>
        <Textarea
          label="Сопроводительное письмо (необязательно)"
          placeholder="Расскажите, почему вы подходите для этой стажировки..."
          rows={5}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
        />
      </Modal>
    </div>
  )
}
