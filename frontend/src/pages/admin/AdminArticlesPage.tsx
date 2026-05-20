import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useListArticlesQuery,
  useCreateArticleMutation,
  useUpdateArticleMutation,
  useDeleteArticleMutation,
} from '@/store/api'
import type { Article } from '@/types'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Textarea from '@/components/ui/Textarea'
import Select from '@/components/ui/Select'
import Spinner from '@/components/ui/Spinner'
import Badge from '@/components/ui/Badge'

const CATEGORY_OPTIONS = [
  { value: 'general', label: 'Общее' },
  { value: 'resume', label: 'Резюме' },
  { value: 'interview', label: 'Интервью' },
]

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Общее',
  resume: 'Резюме',
  interview: 'Интервью',
}

function emptyForm() {
  return { title: '', body: '', image_url: '', category: 'general' }
}

export default function AdminArticlesPage() {
  const { data, isLoading } = useListArticlesQuery({ per_page: 100 })
  const [createArticle, { isLoading: creating }] = useCreateArticleMutation()
  const [updateArticle, { isLoading: updating }] = useUpdateArticleMutation()
  const [deleteArticle] = useDeleteArticleMutation()

  const [editing, setEditing] = useState<Article | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm())
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const articles = data?.items ?? []

  const set = (field: string, value: string) => setForm((f) => ({ ...f, [field]: value }))

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    setError('')
    setShowForm(true)
  }

  const openEdit = (article: Article) => {
    setEditing(article)
    setForm({
      title: article.title,
      body: article.body,
      image_url: article.image_url ?? '',
      category: article.category,
    })
    setError('')
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (editing) {
        await updateArticle({ id: editing.id, ...form }).unwrap()
        setSuccess('Статья обновлена')
      } else {
        await createArticle(form).unwrap()
        setSuccess('Статья создана')
      }
      setShowForm(false)
      setEditing(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Не удалось сохранить статью')
    }
  }

  const handleDelete = async (article: Article) => {
    if (!window.confirm(`Удалить статью «${article.title}»?`)) return
    await deleteArticle(article.id)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Статьи</h1>
          <p className="text-sm text-gray-500 mt-0.5">Управление обучающими материалами</p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin/moderation" className="text-sm text-gray-500 hover:text-gray-700">← Модерация</Link>
          <Button onClick={openCreate}>+ Новая статья</Button>
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
            {editing ? 'Редактировать статью' : 'Новая статья'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Заголовок *"
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
            />
            <Select
              label="Категория"
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              options={CATEGORY_OPTIONS}
            />
            <Input
              label="URL изображения"
              type="url"
              value={form.image_url}
              onChange={(e) => set('image_url', e.target.value)}
              placeholder="https://..."
            />
            <Textarea
              label="Текст статьи *"
              required
              rows={12}
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              placeholder="Содержимое статьи..."
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex gap-3">
              <Button type="submit" loading={creating || updating}>
                {editing ? 'Сохранить' : 'Создать'}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                Отмена
              </Button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <Spinner />
      ) : articles.length === 0 ? (
        <p className="text-center text-gray-400 py-16">Статей пока нет</p>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div key={article.id} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 truncate">{article.title}</h3>
                  <Badge color="gray">{CATEGORY_LABELS[article.category] ?? article.category}</Badge>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{article.body.slice(0, 150)}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(article.created_at).toLocaleDateString('ru-RU')}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" variant="secondary" onClick={() => openEdit(article)}>
                  Изменить
                </Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(article)}>
                  Удалить
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
