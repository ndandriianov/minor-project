import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSearchStudentsQuery, useSearchCitiesQuery, useSearchUniversitiesQuery } from '@/store/api'
import { useAuth } from '@/hooks/useAuth'
import { type Skill } from '@/types'
import AutocompleteInput from '@/components/ui/AutocompleteInput'
import SkillsAutocomplete from '@/components/skills/SkillsAutocomplete'
import Spinner from '@/components/ui/Spinner'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'

const COURSE_OPTIONS = [
  { value: '', label: 'Любой курс' },
  { value: '1', label: '1 курс' },
  { value: '2', label: '2 курс' },
  { value: '3', label: '3 курс' },
  { value: '4', label: '4 курс' },
  { value: '5', label: '5 курс' },
  { value: '6', label: '6 курс' },
]

export default function StudentSearchPage() {
  const { user } = useAuth()

  const [cityQuery, setCityQuery] = useState('')
  const [uniQuery, setUniQuery] = useState('')
  const [filters, setFilters] = useState({ city: '', university: '', course: '', skills: [] as Skill[] })
  const [applied, setApplied] = useState<typeof filters | null>(null)

  const { data: cities = [], isFetching: citiesFetching } = useSearchCitiesQuery(cityQuery, { skip: cityQuery.length < 2 })
  const { data: universities = [], isFetching: uniFetching } = useSearchUniversitiesQuery(uniQuery, { skip: uniQuery.length < 2 })

  const { data: students = [], isLoading, isFetching } = useSearchStudentsQuery(
    {
      city: applied?.city || undefined,
      university: applied?.university || undefined,
      course: applied?.course ? Number(applied.course) : undefined,
      skills: applied?.skills.map((s) => s.name),
    },
    { skip: !user?.is_b2b || !applied },
  )

  if (!user?.is_b2b) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <div className="text-4xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Доступно на тарифе B2B</h1>
        <p className="text-gray-500 mb-6">
          Поиск студентов по фильтрам доступен компаниям с активной B2B-подпиской.
        </p>
        <Link to="/subscription">
          <Button size="lg">Подключить B2B</Button>
        </Link>
      </div>
    )
  }

  const handleSearch = () => setApplied({ ...filters })
  const handleReset = () => {
    setFilters({ city: '', university: '', course: '', skills: [] })
    setApplied(null)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Поиск студентов</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          <AutocompleteInput
            label="Город"
            value={filters.city}
            onChange={(v) => setFilters((f) => ({ ...f, city: v }))}
            onSearch={setCityQuery}
            options={cities}
            isLoading={citiesFetching}
            placeholder="Москва"
          />
          <AutocompleteInput
            label="Университет"
            value={filters.university}
            onChange={(v) => setFilters((f) => ({ ...f, university: v }))}
            onSearch={setUniQuery}
            options={universities}
            isLoading={uniFetching}
            placeholder="НИУ ВШЭ"
          />
          <Select
            label="Курс"
            value={filters.course}
            onChange={(e) => setFilters((f) => ({ ...f, course: e.target.value }))}
            options={COURSE_OPTIONS}
          />
        </div>
        <SkillsAutocomplete
          label="Навыки"
          value={filters.skills}
          onChange={(skills) => setFilters((f) => ({ ...f, skills }))}
          placeholder="Python, SQL, Figma..."
        />
        <div className="flex gap-3">
          <Button onClick={handleSearch}>Найти</Button>
          <Button variant="secondary" onClick={handleReset}>Сбросить</Button>
        </div>
      </div>

      {isLoading || isFetching ? (
        <Spinner />
      ) : applied && students.length === 0 ? (
        <p className="text-center text-gray-500 py-12">Студенты по заданным фильтрам не найдены</p>
      ) : students.length > 0 ? (
        <div className="space-y-3">
          {students.map((student) => (
            <div key={student.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {student.first_name} {student.last_name}
                    </h3>
                    {student.is_boosted && (
                      <span className="text-xs bg-yellow-100 text-yellow-700 border border-yellow-200 rounded-full px-2 py-0.5 font-medium">
                        ⭐ Premium
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {[student.university, student.course ? `${student.course} курс` : null, student.city]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {student.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {student.skills.slice(0, 8).map((s) => (
                        <span key={s.id} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                          {s.name}
                        </span>
                      ))}
                      {student.skills.length > 8 && (
                        <span className="text-xs text-gray-400">+{student.skills.length - 8}</span>
                      )}
                    </div>
                  )}
                </div>
                <Link
                  to={`/company/students/${student.id}`}
                  className="flex-shrink-0 text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                >
                  Открыть →
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
