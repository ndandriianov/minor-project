import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRegisterStudentMutation, useSearchUniversitiesQuery, useSearchCitiesQuery } from '@/store/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import AutocompleteInput from '@/components/ui/AutocompleteInput'

const COURSE_OPTIONS = [
  { value: '1', label: '1 курс' },
  { value: '2', label: '2 курс' },
  { value: '3', label: '3 курс' },
  { value: '4', label: '4 курс' },
  { value: '5', label: '5 курс' },
  { value: '6', label: '6 курс (магистратура)' },
]

export default function RegisterStudentPage() {
  const [form, setForm] = useState({
    email: '', password: '', first_name: '', last_name: '',
    university: '', course: '1', city: '',
  })
  const [uniQuery, setUniQuery] = useState('')
  const [cityQuery, setCityQuery] = useState('')
  const [error, setError] = useState('')
  const [register, { isLoading }] = useRegisterStudentMutation()
  const navigate = useNavigate()

  const { data: universities = [], isFetching: uniFetching } = useSearchUniversitiesQuery(uniQuery, { skip: uniQuery.length < 2 })
  const { data: cities = [], isFetching: cityFetching } = useSearchCitiesQuery(cityQuery, { skip: cityQuery.length < 2 })

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await register({ ...form, course: Number(form.course) }).unwrap()
      navigate('/login')
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } }
      setError(e.data?.error ?? 'Ошибка регистрации')
    }
  }

  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Регистрация студента</h1>
        <p className="text-sm text-gray-500 mb-6">Создайте аккаунт, чтобы откликаться на вакансии</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Имя *" required value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            <Input label="Фамилия *" required value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
          </div>
          <Input label="Email *" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
          <Input label="Пароль *" type="password" required minLength={6} value={form.password} onChange={(e) => set('password', e.target.value)} />
          <AutocompleteInput
            label="Университет *"
            value={form.university}
            onChange={(v) => set('university', v)}
            onSearch={setUniQuery}
            options={universities}
            isLoading={uniFetching}
            placeholder="Начните вводить название вуза"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Курс *" value={form.course} onChange={(e) => set('course', e.target.value)} options={COURSE_OPTIONS} />
            <AutocompleteInput
              label="Город *"
              value={form.city}
              onChange={(v) => set('city', v)}
              onSearch={setCityQuery}
              options={cities}
              isLoading={cityFetching}
              placeholder="Москва"
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" loading={isLoading} className="w-full">
            Зарегистрироваться
          </Button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Войти</Link>
        </p>
        <p className="text-sm text-gray-500 mt-2 text-center">
          Вы работодатель?{' '}
          <Link to="/register/company" className="text-blue-600 hover:underline">Регистрация компании</Link>
        </p>
      </div>
    </div>
  )
}
