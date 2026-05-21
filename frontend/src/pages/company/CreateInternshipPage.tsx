import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateInternshipMutation } from '@/store/api'
import type { InternshipFormData } from '@/types'
import InternshipForm from '@/components/company/InternshipForm'

export default function CreateInternshipPage() {
  const [createInternship, { isLoading }] = useCreateInternshipMutation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (data: InternshipFormData) => {
    try {
      setError(null)
      await createInternship(data).unwrap()
      navigate('/company/internships')
    } catch (err: unknown) {
      const e = err as { data?: { error?: string } }
      setError(e?.data?.error ?? 'Не удалось создать вакансию. Попробуйте ещё раз.')
    }
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
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <InternshipForm onSubmit={handleSubmit} loading={isLoading} />
    </div>
  )
}
