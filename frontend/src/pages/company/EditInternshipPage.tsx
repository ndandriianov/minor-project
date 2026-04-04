import { useNavigate, useParams } from 'react-router-dom'
import { useListCompanyInternshipsQuery, useUpdateInternshipMutation } from '@/store/api'
import type { InternshipFormData } from '@/types'
import InternshipForm from '@/components/company/InternshipForm'
import Spinner from '@/components/ui/Spinner'

export default function EditInternshipPage() {
  const { id } = useParams<{ id: string }>()
  const internshipId = Number(id)
  const { data: internships = [], isLoading } = useListCompanyInternshipsQuery()
  const [updateInternship, { isLoading: saving }] = useUpdateInternshipMutation()
  const navigate = useNavigate()

  const internship = internships.find((i) => i.id === internshipId)

  const handleSubmit = async (data: InternshipFormData) => {
    await updateInternship({ id: internshipId, ...data }).unwrap()
    navigate('/company/internships')
  }

  if (isLoading) return <Spinner />
  if (!internship) return <div className="text-center py-16 text-gray-500">Стажировка не найдена</div>

  return (
    <div className="max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline mb-4 block">
        ← Назад
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Редактировать стажировку</h1>
      <InternshipForm initial={internship} onSubmit={handleSubmit} loading={saving} />
    </div>
  )
}
