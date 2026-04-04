import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useLoginMutation } from '@/store/api'
import { useAppDispatch } from '@/hooks/useAppDispatch'
import { setCredentials, setLoading } from '@/store/authSlice'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import type { AuthSession } from '@/types'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [login, { isLoading }] = useLoginMutation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const result = await login({ email, password }).unwrap()
      const session = result as AuthSession
      const user = {
        ...session.user,
        student: session.student ?? session.user.student,
        company: session.company ?? session.user.company,
      }
      dispatch(setCredentials({ user, access_token: session.access_token, refresh_token: session.refresh_token }))

      navigate(from ?? (user.role === 'company' ? '/company/dashboard' : '/student/dashboard'))
    } catch {
      dispatch(setLoading(false))
      setError('Неверный email или пароль')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-12">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Вход</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Пароль" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" loading={isLoading} className="w-full">
            Войти
          </Button>
        </form>

        <p className="text-sm text-gray-500 mt-4 text-center">
          Нет аккаунта?{' '}
          <Link to="/register/student" className="text-blue-600 hover:underline">Регистрация студента</Link>
          {' · '}
          <Link to="/register/company" className="text-blue-600 hover:underline">Регистрация компании</Link>
        </p>
      </div>
    </div>
  )
}
