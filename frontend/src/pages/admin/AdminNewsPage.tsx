import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useListNewsQuery, useCreateNewsMutation, useUpdateNewsMutation, useDeleteNewsMutation } from '@/store/api'
import type { NewsPost } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Spinner from '@/components/ui/Spinner'

function emptyForm() {
  return { title: '', body: '', image_url: '', category: 'news' }
}

export default function AdminNewsPage() {
  const { data, isLoading } = useListNewsQuery({ per_page: 100 })
  const [createNews, { isLoading: creating }] = useCreateNewsMutation()
  const [updateNews, { isLoading: updating }] = useUpdateNewsMutation()
  const [deleteNews] = useDeleteNewsMutation()

  const [editing, setEditing] = useState<NewsPost | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const posts = data?.items ?? []
  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setError('')
    setShowForm(true)
  }

  const openEdit = (post: NewsPost) => {
    setEditing(post)
    setForm({ title: post.title, body: post.body, image_url: post.image_url ?? '', category: post.category })
    setError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await updateNews({ id: editing.id, ...form }).unwrap()
        setSuccess('Новость обновлена')
      } else {
        await createNews(form).unwrap()
        setSuccess('Новость опубликована')
      }
      setShowForm(false)
      setEditing(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Не удалось сохранить новость')
    }
  }

  const handleDelete = async (post: NewsPost) => {
    if (!window.confirm(`Удалить новость «${post.title}»?`)) return
    await deleteNews(post.id)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Новости</h1>
          <p className="text-sm text-gray-500 mt-0.5">Публикация новостей платформы</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/moderation" className="text-sm text-gray-500 hover:text-gray-700">← Модерация</Link>
          <Button onClick={openCreate}>+ Новая новость</Button>
        </div>
      </div>

      {success && (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <div className="mb-6 bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="font-semibold text-gray-800 mb-4">
            {editing ? 'Редактировать новость' : 'Новая новость'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Заголовок *"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
            <Input
              label="URL изображения"
              type="url"
              value={form.image_url}
              onChange={(e) => set('image_url', e.target.value)}
              placeholder="https://..."
            />
            <Textarea
              label="Текст новости *"
              required
              rows={8}
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder="Содержимое новости..."
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3">
              <Button type="submit" loading={creating || updating}>
                {editing ? 'Сохранить' : 'Опубликовать'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Отмена</Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : posts.length === 0 ? (
        <p className="text-center text-gray-400 py-16">Новостей пока нет</p>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1 truncate">{post.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2">{post.body.slice(0, 150)}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(post.created_at).toLocaleDateString('ru-RU')}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="secondary" onClick={() => openEdit(post)}>Изменить</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(post)}>Удалить</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
