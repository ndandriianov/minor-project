import { useNavigate } from 'react-router-dom'
import type { Internship } from '@/types'
import Badge from '@/components/ui/Badge'
import SkillTag from '@/components/skills/SkillTag'
import { useAuth } from '@/hooks/useAuth'
import { useAddBookmarkMutation, useRemoveBookmarkMutation, useListBookmarksQuery } from '@/store/api'

const FORMAT_LABEL: Record<string, string> = {
  office: 'Офис',
  hybrid: 'Гибрид',
  remote: 'Удалённо',
}

const FORMAT_COLOR: Record<string, 'blue' | 'green' | 'purple'> = {
  office: 'blue',
  hybrid: 'green',
  remote: 'purple',
}

interface InternshipCardProps {
  internship: Internship
}

export default function InternshipCard({ internship }: InternshipCardProps) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isStudent = user?.role === 'student'

  const { data: bookmarks = [] } = useListBookmarksQuery(undefined, { skip: !isStudent })
  const [addBookmark, { isLoading: adding }] = useAddBookmarkMutation()
  const [removeBookmark, { isLoading: removing }] = useRemoveBookmarkMutation()

  const isBookmarked = bookmarks.some((b) => b.internship_id === internship.id)

  const toggleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isBookmarked) {
      await removeBookmark(internship.id)
    } else {
      await addBookmark(internship.id)
    }
  }

  const salary =
    internship.salary_min && internship.salary_max
      ? `${internship.salary_min.toLocaleString()}–${internship.salary_max.toLocaleString()} ₽`
      : internship.salary_min
      ? `от ${internship.salary_min.toLocaleString()} ₽`
      : internship.is_paid
      ? 'Оплачивается'
      : 'Не оплачивается'

  return (
    <div
      onClick={() => navigate(`/internships/${internship.id}`)}
      className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer relative"
    >
      {isStudent && (
        <button
          type="button"
          onClick={toggleBookmark}
          disabled={adding || removing}
          className="absolute top-4 right-4 text-xl text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-50"
        >
          {isBookmarked ? '🔖' : '🏷️'}
        </button>
      )}

      <div className="flex items-start gap-3 mb-3">
        {internship.company.logo_url ? (
          <img
            src={internship.company.logo_url}
            alt={internship.company.name}
            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-500 flex-shrink-0">
            {internship.company.name[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-base leading-tight truncate pr-8">
            {internship.title}
          </h3>
          <p className="text-sm text-gray-500 truncate">{internship.company.name}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Badge color={FORMAT_COLOR[internship.work_format] ?? 'gray'}>
          {FORMAT_LABEL[internship.work_format] ?? internship.work_format}
        </Badge>
        {internship.city && <Badge color="gray">{internship.city}</Badge>}
        {internship.direction && <Badge color="indigo">{internship.direction}</Badge>}
        {internship.compatible_with_study && <Badge color="green">Совм. с учёбой</Badge>}
        {internship.is_verified && <Badge color="blue">✓ Проверено</Badge>}
      </div>

      <div className="text-sm font-medium text-gray-800 mb-2">{salary}</div>

      {internship.required_skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {internship.required_skills.slice(0, 5).map((s) => (
            <SkillTag key={s.id} name={s.name} />
          ))}
          {internship.required_skills.length > 5 && (
            <span className="text-xs text-gray-400">+{internship.required_skills.length - 5}</span>
          )}
        </div>
      )}

      {internship.deadline && (
        <p className="text-xs text-gray-400 mt-3">
          Дедлайн: {new Date(internship.deadline).toLocaleDateString('ru-RU')}
        </p>
      )}
    </div>
  )
}
