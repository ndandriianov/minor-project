import { useNavigate } from 'react-router-dom'
import { useCreateInternshipMutation } from '@/store/api'
import type { InternshipFormData } from '@/types'
import InternshipForm from '@/components/company/InternshipForm'

export default function CreateInternshipPage() {
  const [createInternship, { isLoading }] = useCreateInternshipMutation()
  const navigate = useNavigate()

  const handleSubmit = async (data: InternshipFormData) => {
    await createInternship(data).unwrap()
    navigate('/company/internships')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline mb-4 block">
        ← Назад
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Создать вакансию</h1>
      <p className="text-sm text-gray-500 mb-6">
        После создания вакансия будет отправлена на модерацию и появится в списке после проверки.
      </p>
      <InternshipForm onSubmit={handleSubmit} loading={isLoading} />
    </div>
  )
}
