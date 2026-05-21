import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useRegisterCompanyMutation } from '@/store/api'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function RegisterCompanyPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [register, { isLoading }] = useRegisterCompanyMutation()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await register({ email, password, name }).unwrap()
      navigate('/login')
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } }
      setError(e.data?.error ?? 'Ошибка регистрации')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Регистрация компании</h1>
        <p className="text-sm text-gray-500 mb-6">Размещайте вакансии и находите лучших кандидатов</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Название компании *" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Email *" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Пароль *" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />

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
          Вы студент?{' '}
          <Link to="/register/student" className="text-blue-600 hover:underline">Регистрация студента</Link>
        </p>
      </div>
    </div>
  )
}
