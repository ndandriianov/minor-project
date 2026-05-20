import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  useUpdateProfileMutation,
  useUploadResumeMutation,
  useDeleteResumeMutation,
  useSearchUniversitiesQuery,
  useSearchFacultiesQuery,
  useSearchCitiesQuery,
} from '@/store/api'
import { useAppDispatch } from '@/hooks/useAppDispatch'
import { setUser } from '@/store/authSlice'
import type { Skill, Student } from '@/types'
import { Link } from 'react-router-dom'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import SkillsAutocomplete from '@/components/skills/SkillsAutocomplete'
import AutocompleteInput from '@/components/ui/AutocompleteInput'
import Spinner from '@/components/ui/Spinner'
import { buildAssetUrl } from '@/config/api'

const WORK_FORMAT_OPTIONS = [
  { value: 'any', label: 'Любой' },
  { value: 'office', label: 'Офис' },
  { value: 'hybrid', label: 'Гибрид' },
  { value: 'remote', label: 'Удалённо' },
]

const HOURS_OPTIONS = [
  { value: 'any', label: 'Любые часы' },
  { value: '40', label: '40 ч/нед (полная)' },
  { value: '20-40', label: '20–40 ч/нед' },
  { value: '<20', label: 'До 20 ч/нед' },
]

function createInitialForm(student?: Student) {
  return {
    first_name: student?.first_name ?? '',
    last_name: student?.last_name ?? '',
    patronymic: student?.patronymic ?? '',
    university: student?.university ?? '',
    course: String(student?.course ?? ''),
    speciality: student?.speciality ?? '',
    city: student?.city ?? '',
    faculty: student?.faculty ?? '',
    work_format: student?.work_format ?? 'any',
    desired_hours: student?.desired_hours ?? 'any',
    bio: student?.bio ?? '',
    portfolio_url: student?.portfolio_url ?? '',
    github_url: student?.github_url ?? '',
    experience: student?.experience ?? '',
    certificates: student?.certificates ?? '',
  }
}

export default function ProfilePage() {
  const { user, isLoading } = useAuth()
  const dispatch = useAppDispatch()
  const student = user?.student
  const [updateProfile, { isLoading: saving }] = useUpdateProfileMutation()
  const [uploadResume, { isLoading: uploading }] = useUploadResumeMutation()
  const [deleteResume, { isLoading: deleting }] = useDeleteResumeMutation()
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [resumeFilename, setResumeFilename] = useState(student?.resume_filename ?? '')
  const [form, setForm] = useState(() => createInitialForm(student))
  const [skills, setSkills] = useState<Skill[]>(() => student?.skills ?? [])

  const [uniQuery, setUniQuery] = useState('')
  const [facultyQuery, setFacultyQuery] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [selectedUniversityId, setSelectedUniversityId] = useState<number | undefined>()

  const { data: universities = [], isFetching: uniFetching } = useSearchUniversitiesQuery(uniQuery, { skip: uniQuery.length < 2 })
  const { data: faculties = [], isFetching: facultyFetching } = useSearchFacultiesQuery(
    { search: facultyQuery, university_id: selectedUniversityId },
    { skip: facultyQuery.length < 2 },
  )
  const { data: cities = [], isFetching: cityFetching } = useSearchCitiesQuery(cityQuery, { skip: cityQuery.length < 2 })

  useEffect(() => {
    if (!student) return
    setForm(createInitialForm(student))
    setSkills(student.skills ?? [])
    setResumeFilename(student.resume_filename ?? '')
  }, [student])

  if (isLoading) return <Spinner />
  if (!student) return <Spinner />

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccess(false)
    setError('')
    try {
      const updated = await updateProfile({
        first_name: form.first_name,
        last_name: form.last_name,
        patronymic: form.patronymic,
        university: form.university,
        course: form.course ? Number(form.course) : undefined,
        speciality: form.speciality,
        city: form.city,
        faculty: form.faculty,
        work_format: form.work_format as 'office' | 'hybrid' | 'remote' | 'any',
        desired_hours: form.desired_hours as '40' | '20-40' | '<20' | 'any',
        bio: form.bio,
        portfolio_url: form.portfolio_url,
        github_url: form.github_url,
        experience: form.experience,
        certificates: form.certificates,
        skills: skills.map((s) => s.name),
      }).unwrap()
      if (user) {
        dispatch(setUser({ ...user, student: updated }))
      }
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Не удалось сохранить профиль')
    }
  }

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    setError('')
    try {
      const result = await uploadResume(fd).unwrap()
      setResumeFilename(result.filename)
      if (user?.student) {
        dispatch(setUser({
          ...user,
          student: { ...user.student, resume_filename: result.filename },
        }))
      }
    } catch {
      setError('Не удалось загрузить резюме. Проверьте, что это PDF-файл.')
    }
  }

  const handleResumeDelete = async () => {
    if (!window.confirm('Удалить резюме?')) return
    try {
      await deleteResume().unwrap()
      setResumeFilename('')
      if (user?.student) {
        dispatch(setUser({ ...user, student: { ...user.student, resume_filename: '' } }))
      }
    } catch {
      setError('Не удалось удалить резюме')
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мой профиль</h1>
          <p className="text-sm text-gray-500 mt-1">
            Заполните данные, чтобы получать более точные рекомендации и откликаться быстрее.
          </p>
        </div>
        <Link to="/student/dashboard" className="text-sm text-blue-600 hover:underline whitespace-nowrap">
          ← К дашборду
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Personal */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Личные данные</h2>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Имя *" required value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            <Input label="Фамилия *" required value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </div>
          <Input label="Отчество" value={form.patronymic} onChange={(e) => set('patronymic', e.target.value)} />
          <AutocompleteInput
            label="Университет"
            value={form.university}
            onChange={(v) => set('university', v)}
            onSearch={setUniQuery}
            onSelectItem={(item) => setSelectedUniversityId(item.id)}
            options={universities}
            isLoading={uniFetching}
            placeholder="Начните вводить название вуза"
          />
          <div className="grid grid-cols-2 gap-3">
            <AutocompleteInput
              label="Факультет"
              value={form.faculty}
              onChange={(v) => set('faculty', v)}
              onSearch={setFacultyQuery}
              options={faculties}
              isLoading={facultyFetching}
              placeholder="Введите название факультета"
            />
            <Input label="Специальность" value={form.speciality} onChange={(e) => set('speciality', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Курс" type="number" min={1} max={6} value={form.course} onChange={(e) => set('course', e.target.value)} />
            <AutocompleteInput
              label="Город"
              value={form.city}
              onChange={(v) => set('city', v)}
              onSearch={setCityQuery}
              options={cities}
              isLoading={cityFetching}
              placeholder="Москва"
            />
          </div>
        </section>

        {/* Preferences */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Предпочтения</h2>
          <Select label="Формат работы" value={form.work_format} onChange={(e) => set('work_format', e.target.value)} options={WORK_FORMAT_OPTIONS} />
          <Select label="Желаемые часы" value={form.desired_hours} onChange={(e) => set('desired_hours', e.target.value)} options={HOURS_OPTIONS} />
        </section>

        {/* Skills */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Навыки</h2>
          <SkillsAutocomplete
            value={skills}
            onChange={setSkills}
            label="Добавьте навыки"
            placeholder="Например: Python, SQL, Figma"
          />
        </section>

        {/* About */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">О себе</h2>
          <Textarea label="О себе" rows={4} value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Расскажите о себе, своих целях и интересах..." />
          <Textarea label="Опыт" rows={3} value={form.experience} onChange={(e) => set('experience', e.target.value)} placeholder="Предыдущий опыт работы или проекты..." />
          <Textarea label="Сертификаты" rows={2} value={form.certificates} onChange={(e) => set('certificates', e.target.value)} placeholder="Список сертификатов..." />
        </section>

        {/* Links */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Ссылки</h2>
          <Input label="Portfolio URL" type="url" value={form.portfolio_url} onChange={(e) => set('portfolio_url', e.target.value)} placeholder="https://..." />
          <Input label="GitHub URL" type="url" value={form.github_url} onChange={(e) => set('github_url', e.target.value)} placeholder="https://github.com/..." />
        </section>

        {/* Resume */}
        <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-gray-800">Резюме (PDF)</h2>
          {resumeFilename ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <svg className="w-8 h-8 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {resumeFilename.replace(/^resume_\d+_[a-f0-9]+_/, '')}
                </p>
                <p className="text-xs text-gray-400">PDF-файл</p>
              </div>
              <a
                href={buildAssetUrl(`/uploads/${resumeFilename}`)}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-600 hover:underline whitespace-nowrap"
              >
                Скачать
              </a>
              <button
                type="button"
                onClick={handleResumeDelete}
                disabled={deleting}
                className="text-sm text-red-500 hover:text-red-700 transition whitespace-nowrap"
              >
                {deleting ? '...' : 'Удалить'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-400">Резюме не загружено</p>
          )}
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <span className="inline-flex items-center px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition">
              {uploading ? 'Загрузка...' : resumeFilename ? 'Заменить файл' : 'Загрузить PDF'}
            </span>
            <span className="text-xs text-gray-400">Только PDF, до 10 МБ</span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={handleResumeUpload}
              disabled={uploading}
            />
          </label>
        </section>

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving} size="lg">
            Сохранить профиль
          </Button>
          {success && <span className="text-sm text-green-600 font-medium">Сохранено!</span>}
        </div>
      </form>
    </div>
  )
}
