import { useParams, useNavigate } from 'react-router-dom'
import { useGetNewsPostQuery } from '@/store/api'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'

const CATEGORY_COLOR: Record<string, 'blue' | 'green' | 'yellow' | 'gray'> = {
  internship: 'blue',
  university: 'green',
  event: 'yellow',
  news: 'gray',
}

export default function NewsDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: post, isLoading } = useGetNewsPostQuery(Number(id))

  if (isLoading) return <div className="flex justify-center py-16"><Spinner /></div>
  if (!post) return <div className="text-center py-16 text-gray-500">Новость не найдена</div>

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="secondary" size="sm" onClick={() => navigate('/news')} className="mb-6">
        ← Назад
      </Button>
      <div className="bg-white border border-gray-200 rounded-xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <Badge color={CATEGORY_COLOR[post.category] ?? 'gray'}>{post.category}</Badge>
          <span className="text-sm text-gray-400">{new Date(post.created_at).toLocaleDateString('ru-RU')}</span>
        </div>
        {post.image_url && (
          <img src={post.image_url} alt={post.title} className="w-full h-52 object-cover rounded-lg mb-6" />
        )}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{post.title}</h1>
        <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{post.body}</p>
      </div>
    </div>
  )
}
