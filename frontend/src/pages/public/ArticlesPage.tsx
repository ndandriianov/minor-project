import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListArticlesQuery } from '@/store/api'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'
import Select from '@/components/ui/Select'

const CATEGORY_OPTIONS = [
  { value: '', label: 'Все категории' },
  { value: 'resume', label: 'Резюме' },
  { value: 'interview', label: 'Собеседование' },
  { value: 'general', label: 'Общее' },
]

const CATEGORY_COLOR: Record<string, 'blue' | 'green' | 'gray'> = {
  resume: 'blue',
  interview: 'green',
  general: 'gray',
}

export default function ArticlesPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useListArticlesQuery({ category: category || undefined, page, per_page: 9 })
  const articles = data?.items ?? []

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Статьи</h1>
          <p className="text-gray-500 text-sm mt-1">Советы по поиску вакансии и карьерному росту</p>
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1) }}
            options={CATEGORY_OPTIONS}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : articles.length === 0 ? (
        <EmptyState title="Статей пока нет" description="Загляните позже" />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {articles.map((a) => (
              <div
                key={a.id}
                onClick={() => navigate(`/articles/${a.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition flex flex-col gap-3"
              >
                {a.image_url && (
                  <img src={a.image_url} alt={a.title} className="w-full h-36 object-cover rounded-lg" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <Badge color={CATEGORY_COLOR[a.category] ?? 'gray'}>{a.category}</Badge>
                  <span className="text-xs text-gray-400">{new Date(a.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                <h2 className="font-semibold text-gray-900 leading-snug">{a.title}</h2>
                <p className="text-sm text-gray-500 line-clamp-3">{a.body.slice(0, 150)}{a.body.length > 150 ? '…' : ''}</p>
              </div>
            ))}
          </div>
          {data && data.pages > 1 && (
            <div className="mt-8">
              <Pagination page={data.page} pages={data.pages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
