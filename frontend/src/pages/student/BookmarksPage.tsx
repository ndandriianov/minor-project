import { useNavigate } from 'react-router-dom'
import { useListBookmarksQuery, useRemoveBookmarkMutation } from '@/store/api'
import Spinner from '@/components/ui/Spinner'
import EmptyState from '@/components/ui/EmptyState'
import Button from '@/components/ui/Button'
import InternshipCard from '@/components/internships/InternshipCard'

export default function BookmarksPage() {
  const { data: bookmarks = [], isLoading } = useListBookmarksQuery()
  const [removeBookmark] = useRemoveBookmarkMutation()
  const navigate = useNavigate()

  void removeBookmark

  if (isLoading) return <Spinner />

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Сохранённые стажировки</h1>

      {bookmarks.length === 0 ? (
        <EmptyState
          title="Нет сохранённых стажировок"
          description="Нажимайте 🏷️ на карточках, чтобы сохранять интересные стажировки"
          action={<Button onClick={() => navigate('/internships')}>Посмотреть стажировки</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarks.map((bookmark) => (
            <InternshipCard key={bookmark.id} internship={bookmark.internship} />
          ))}
        </div>
      )}
    </div>
  )
}
