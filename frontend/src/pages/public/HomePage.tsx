import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'

export default function HomePage() {
  const [search, setSearch] = useState('')
  const navigate = useNavigate()
  const { user } = useAuth()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    navigate(`/internships${search ? `?search=${encodeURIComponent(search)}` : ''}`)
  }

  return (
    <div className="flex flex-col items-center text-center py-16 px-4">
      <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
        Найди стажировку своей мечты
      </h1>
      <p className="text-lg text-gray-500 mb-10 max-w-xl">
        Сотни актуальных стажировок от ведущих компаний. Фильтруй по городу, формату, зарплате и навыкам.
      </p>

      <form onSubmit={handleSearch} className="flex gap-2 w-full max-w-lg mb-16">
        <input
          type="text"
          placeholder="Поиск по названию или навыкам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" size="lg">
          Найти
        </Button>
      </form>

      <div className="grid sm:grid-cols-3 gap-6 w-full max-w-3xl text-left">
        {[
          { emoji: '🎯', title: 'Точные рекомендации', desc: 'Система подбирает стажировки под ваш профиль и навыки' },
          { emoji: '🏢', title: 'Проверенные компании', desc: 'Все работодатели проходят проверку модераторами' },
          { emoji: '📋', title: 'Удобный отклик', desc: 'Откликайтесь в один клик, отслеживайте статус заявок' },
        ].map((item) => (
          <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="text-3xl mb-3">{item.emoji}</div>
            <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
            <p className="text-sm text-gray-500">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-12 flex gap-4">
        <Button size="lg" onClick={() => navigate('/register/student')}>
          Я студент
        </Button>
        <Button variant="secondary" size="lg" onClick={() => navigate('/register/company')}>
          Я работодатель
        </Button>
        {user?.role === 'student' && (
          <Button variant="ghost" size="lg" onClick={() => navigate('/student/profile')}>
            Мой профиль
          </Button>
        )}
      </div>
    </div>
  )
}
