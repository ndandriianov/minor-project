import { useNavigate } from 'react-router-dom'
import { useGetRecommendationsQuery } from '@/store/api'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SkillTag from '@/components/skills/SkillTag'
import RecommendationBadge from '@/components/internships/RecommendationBadge'

const FORMAT_LABEL: Record<string, string> = { office: 'Офис', hybrid: 'Гибрид', remote: 'Удалённо' }

export default function RecommendationsPage() {
  const { data: recommendations = [], isLoading } = useGetRecommendationsQuery()
  const navigate = useNavigate()

  if (isLoading) return <Spinner />

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Рекомендации</h1>
        <p className="text-sm text-gray-500">
          Стажировки, подобранные под ваш профиль. Заполните{' '}
          <button onClick={() => navigate('/student/profile')} className="text-blue-600 hover:underline">профиль</button>
          {' '}для лучших результатов.
        </p>
      </div>

      {recommendations.length === 0 ? (
        <EmptyState
          title="Нет рекомендаций"
          description="Заполните профиль: укажите навыки, город и предпочтения по формату работы"
          action={<Button onClick={() => navigate('/student/profile')}>Заполнить профиль</Button>}
        />
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <Card
              key={rec.id}
              onClick={() => navigate(`/internships/${rec.id}`)}
              className="cursor-pointer"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                  <p className="text-sm text-gray-500">{rec.company.name}</p>
                </div>
                <RecommendationBadge score={rec.match_score} reasons={rec.match_reasons} />
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <Badge color={rec.work_format === 'remote' ? 'purple' : rec.work_format === 'hybrid' ? 'green' : 'blue'}>
                  {FORMAT_LABEL[rec.work_format]}
                </Badge>
                {rec.city && <Badge color="gray">{rec.city}</Badge>}
                {rec.compatible_with_study && <Badge color="green">Совм. с учёбой</Badge>}
              </div>

              {rec.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {rec.required_skills.slice(0, 6).map((s) => <SkillTag key={s.id} name={s.name} />)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
