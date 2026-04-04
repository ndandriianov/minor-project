import { useNavigate } from 'react-router-dom'
import Button from '@/components/ui/Button'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-7xl font-bold text-gray-200 mb-4">404</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Страница не найдена</h1>
      <p className="text-gray-500 mb-6">Такой страницы не существует</p>
      <Button onClick={() => navigate('/')}>На главную</Button>
    </div>
  )
}
