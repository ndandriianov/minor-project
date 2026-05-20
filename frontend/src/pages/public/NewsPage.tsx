import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useListNewsQuery } from '@/store/api'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Pagination from '@/components/ui/Pagination'
import Badge from '@/components/ui/Badge'

const CATEGORY_COLOR: Record<string, 'blue' | 'green' | 'yellow' | 'gray'> = {
  internship: 'blue',
  university: 'green',
  event: 'yellow',
  news: 'gray',
}

export default function NewsPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useListNewsQuery({ page, per_page: 9 })
  const posts = data?.items ?? []

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Новости</h1>
        <p className="text-gray-500 text-sm mt-1">Актуальные события в мире стажировок и карьеры</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : posts.length === 0 ? (
        <EmptyState title="Новостей пока нет" description="Загляните позже" />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {posts.map((p) => (
              <div
                key={p.id}
                onClick={() => navigate(`/news/${p.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-5 cursor-pointer hover:shadow-md hover:border-blue-200 transition flex flex-col gap-3"
              >
                {p.image_url && (
                  <img src={p.image_url} alt={p.title} className="w-full h-36 object-cover rounded-lg" />
                )}
                <div className="flex items-center justify-between gap-2">
                  <Badge color={CATEGORY_COLOR[p.category] ?? 'gray'}>{p.category}</Badge>
                  <span className="text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString('ru-RU')}</span>
                </div>
                <h2 className="font-semibold text-gray-900 leading-snug">{p.title}</h2>
                <p className="text-sm text-gray-500 line-clamp-3">{p.body.slice(0, 150)}{p.body.length > 150 ? '…' : ''}</p>
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
