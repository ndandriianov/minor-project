import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useGetInternshipQuery, useApplyMutation, useListApplicationsQuery, useAddBookmarkMutation, useRemoveBookmarkMutation, useListBookmarksQuery, useAiAdaptResumeMutation, useListCompanyReviewsQuery, useCreateReviewMutation } from '@/store/api'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import SkillTag from '@/components/skills/SkillTag'
import Modal from '@/components/ui/Modal'
import Textarea from '@/components/ui/Textarea'
import { useAuth } from '@/hooks/useAuth'

const FORMAT_LABEL: Record<string, string> = { office: 'Офис', hybrid: 'Гибрид', remote: 'Удалённо' }
const EXP_LABEL: Record<string, string> = { none: 'Без опыта', '<1year': 'До 1 года', '1-3years': '1–3 года' }

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="text-yellow-400 text-sm">
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  )
}

function CompanyReviews({ companyId, companyName, internshipId, isStudent }: {
  companyId: number
  companyName: string
  internshipId: number
  isStudent: boolean
}) {
  const { data } = useListCompanyReviewsQuery(companyId)
  const [createReview, { isLoading: submitting }] = useCreateReviewMutation()
  const [formOpen, setFormOpen] = useState(false)
  const [rating, setRating] = useState(5)
  const [text, setText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async () => {
    await createReview({ company_id: companyId, internship_id: internshipId, rating, text })
    setSubmitted(true)
    setFormOpen(false)
    setText('')
    setRating(5)
  }

  if (!data) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mt-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Отзывы о {companyName}</h2>
          {data.average_rating != null && (
            <span className="flex items-center gap-1 text-sm text-gray-600">
              <StarRating rating={Math.round(data.average_rating)} />
              <span className="font-medium">{data.average_rating.toFixed(1)}</span>
              <span className="text-gray-400">({data.count})</span>
            </span>
          )}
        </div>
        {isStudent && !submitted && !formOpen && (
          <button
            onClick={() => setFormOpen(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            + Оставить отзыв
          </button>
        )}
      </div>

      {formOpen && (
        <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Оценка</p>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setRating(n)}
                  className={`text-2xl transition ${n <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Комментарий (необязательно)</p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder="Расскажите о своём опыте..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" loading={submitting} onClick={handleSubmit}>Отправить</Button>
            <Button size="sm" variant="secondary" onClick={() => setFormOpen(false)}>Отмена</Button>
          </div>
        </div>
      )}

      {submitted && (
        <p className="text-sm text-green-600 mb-4">Спасибо! Ваш отзыв отправлен.</p>
      )}

      {data.reviews.length === 0 ? (
        <p className="text-sm text-gray-400">Пока нет отзывов</p>
      ) : (
        <div className="space-y-4">
          {data.reviews.map((r) => (
            <div key={r.id} className="border-t border-gray-100 pt-4 first:border-t-0 first:pt-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{r.student_name ?? 'Студент'}</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('ru-RU')}</span>
              </div>
              <StarRating rating={r.rating} />
              {r.text && <p className="text-sm text-gray-600 mt-1">{r.text}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
  const [aiOpen, setAiOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [aiAdaptResume, { isLoading: adapting }] = useAiAdaptResumeMutation()
  const [copied, setCopied] = useState(false)
  const [aiResult, setAiResult] = useState<{
    matched_skills: string[]
    missing_skills: string[]
    adapted_resume: string
    tips: string[]
  } | null>(null)

  const alreadyApplied = applications.some((a) => a.internship_id === internshipId)
  const isBookmarked = bookmarks.some((b) => b.internship_id === internshipId)
  const isPremiumStudent = isStudent && user?.is_premium

  const handleAdaptResume = async () => {
    try {
      const result = await aiAdaptResume({ internship_id: internshipId }).unwrap()
      setAiResult(result)
      setAiOpen(true)
    } catch (err: unknown) {
      const e = err as { status?: number }
      if (e.status === 402) {
        setUpgradeOpen(true)
      }
    }
  }

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
              {isBookmarked ? '❤️' : '🤍'}
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
          <div className="mb-4 flex flex-wrap gap-3">
            {alreadyApplied ? (
              <Button variant="secondary" disabled>Вы уже откликнулись</Button>
            ) : (
              <Button onClick={() => setApplyOpen(true)}>Откликнуться</Button>
            )}
            {isPremiumStudent && (
              <Button variant="secondary" onClick={handleAdaptResume} loading={adapting}>
                ✨ Адаптировать резюме
              </Button>
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

      <CompanyReviews
        companyId={internship.company.id}
        companyName={internship.company.name}
        internshipId={internshipId}
        isStudent={isStudent}
      />

      <Modal
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        title="Отклик на вакансию"
        onConfirm={handleApply}
        confirmText="Отправить отклик"
        loading={applying}
      >
        <p className="mb-3">Вы откликаетесь на: <strong>{internship.title}</strong></p>
        <Textarea
          label="Сопроводительное письмо (необязательно)"
          placeholder="Расскажите, почему вы подходите для этой вакансии..."
          rows={5}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
        />
      </Modal>

      <Modal
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
        title="✨ Адаптация резюме"
      >
        {aiResult && (
          <div className="space-y-4 text-sm">
            {aiResult.matched_skills.length > 0 && (
              <div>
                <p className="font-medium text-gray-900 mb-1">Навыки, которые у вас есть</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.matched_skills.map((s) => (
                    <span key={s} className="bg-green-100 text-green-700 rounded-full px-2 py-0.5 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {aiResult.missing_skills.length > 0 && (
              <div>
                <p className="font-medium text-gray-900 mb-1">Стоит освоить</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.missing_skills.map((s) => (
                    <span key={s} className="bg-red-100 text-red-600 rounded-full px-2 py-0.5 text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {aiResult.adapted_resume && (
              <div>
                <p className="font-medium text-gray-900 mb-1">Адаптированное описание</p>
                <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{aiResult.adapted_resume}</p>
                <div className="mt-2">
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(aiResult.adapted_resume)
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                  >
                    {copied ? '✓ Скопировано' : 'Копировать'}
                  </button>
                </div>
              </div>
            )}
            {aiResult.tips.length > 0 && (
              <div>
                <p className="font-medium text-gray-900 mb-1">Советы</p>
                <ul className="space-y-1">
                  {aiResult.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-blue-500 flex-shrink-0">•</span>
                      <span className="text-gray-700">{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="Требуется Premium-подписка"
      >
        <p className="mb-4">ИИ-адаптация резюме доступна только пользователям с активной Premium-подпиской.</p>
        <Link to="/subscription" onClick={() => setUpgradeOpen(false)} className="text-blue-600 hover:underline font-medium">
          Подключить Premium →
        </Link>
      </Modal>
    </div>
  )
}
