import { useParams, Link } from 'react-router-dom'
import { useGetStudentQuery } from '@/store/api'
import { buildAssetUrl } from '@/config/api'
import Spinner from '@/components/ui/Spinner'

const WORK_FORMAT_LABELS: Record<string, string> = {
  any: 'Любой',
  office: 'Офис',
  hybrid: 'Гибрид',
  remote: 'Удалённо',
}

const HOURS_LABELS: Record<string, string> = {
  any: 'Любые',
  '40': '40 ч/нед',
  '20-40': '20–40 ч/нед',
  '<20': 'До 20 ч/нед',
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { data: student, isLoading } = useGetStudentQuery(Number(id))

  if (isLoading) return <Spinner />
  if (!student) return <p className="text-center text-gray-400 py-16">Студент не найден</p>

  const fullName = [student.first_name, student.last_name, student.patronymic].filter(Boolean).join(' ')
  const meta = [
    student.university,
    student.faculty,
    student.course ? `${student.course} курс` : null,
    student.speciality,
    student.city,
  ].filter(Boolean)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link to="/company/students/search" className="text-sm text-gray-500 hover:text-gray-700">
          ← Поиск студентов
        </Link>
        {student.resume_filename && (
          <a
            href={buildAssetUrl(`/uploads/${student.resume_filename}`)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
          >
            📄 Скачать резюме
          </a>
        )}
      </div>

      {/* Шапка */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
            {meta.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">{meta.join(' · ')}</p>
            )}
            <div className="flex gap-4 mt-3 text-sm text-gray-600">
              {student.work_format && student.work_format !== 'any' && (
                <span>Формат: {WORK_FORMAT_LABELS[student.work_format] ?? student.work_format}</span>
              )}
              {student.desired_hours && student.desired_hours !== 'any' && (
                <span>Часы: {HOURS_LABELS[student.desired_hours] ?? student.desired_hours}</span>
              )}
            </div>
          </div>
          {student.is_boosted && (
            <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-3 py-1 font-medium flex-shrink-0">
              ⭐ Premium
            </span>
          )}
        </div>
      </div>

      {/* Навыки */}
      {student.skills && student.skills.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {student.skills.map((s) => (
              <span key={s.id} className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* О себе */}
      {student.bio && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-gray-800 mb-2">О себе</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.bio}</p>
        </div>
      )}

      {/* Опыт */}
      {student.experience && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-gray-800 mb-2">Опыт</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.experience}</p>
        </div>
      )}

      {/* Сертификаты */}
      {student.certificates && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-gray-800 mb-2">Сертификаты</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.certificates}</p>
        </div>
      )}

      {/* Ссылки */}
      {(student.portfolio_url || student.github_url) && (
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
          <h2 className="font-semibold text-gray-800 mb-3">Ссылки</h2>
          <div className="space-y-2">
            {student.portfolio_url && (
              <a href={student.portfolio_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                🔗 Portfolio
              </a>
            )}
            {student.github_url && (
              <a href={student.github_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                🐙 GitHub
              </a>
            )}
          </div>
        </div>
      )}

      {!student.resume_filename && (
        <p className="text-sm text-gray-400 text-center py-2">Резюме не загружено</p>
      )}
    </div>
  )
}
