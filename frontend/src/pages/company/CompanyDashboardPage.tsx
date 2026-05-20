import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useListCompanyInternshipsQuery, useUploadLogoMutation } from '@/store/api'
import { useAppDispatch } from '@/hooks/useAppDispatch'
import { setUser } from '@/store/authSlice'
import Card from '@/components/ui/Card'
import { buildAssetUrl } from '@/config/api'

export default function CompanyDashboardPage() {
  const { user } = useAuth()
  const dispatch = useAppDispatch()
  const { data: internships = [] } = useListCompanyInternshipsQuery()
  const [uploadLogo, { isLoading: uploading }] = useUploadLogoMutation()
  const fileRef = useRef<HTMLInputElement>(null)

  const published = internships.filter((i) => i.moderation_status === 'published').length
  const pending = internships.filter((i) => i.moderation_status === 'pending').length

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return
    const fd = new FormData()
    fd.append('file', file)
    try {
      const result = await uploadLogo(fd).unwrap()
      dispatch(setUser({
        ...user,
        company: { ...user.company!, logo_url: result.logo_url },
      }))
    } catch {
      // silently fail — user sees no change
    }
  }

  const logoUrl = user?.company?.logo_url ? buildAssetUrl(user.company.logo_url) : null

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative group">
          {logoUrl ? (
            <img src={logoUrl} alt="Логотип" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-gray-400 border border-gray-200">
              {user?.company?.name?.[0] ?? '?'}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium"
          >
            {uploading ? '...' : 'Изменить'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleLogoUpload}
          />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.company?.name ?? 'Компания'}
          </h1>
          <p className="text-gray-500">{user?.company?.city ?? ''}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Link to="/company/internships">
          <Card className="hover:border-blue-300 transition-colors">
            <div className="text-3xl font-bold text-blue-600 mb-1">{internships.length}</div>
            <div className="font-medium text-gray-800">Всего стажировок</div>
          </Card>
        </Link>
        <Card>
          <div className="text-3xl font-bold text-green-600 mb-1">{published}</div>
          <div className="font-medium text-gray-800">Опубликовано</div>
        </Card>
        <Card>
          <div className="text-3xl font-bold text-yellow-500 mb-1">{pending}</div>
          <div className="font-medium text-gray-800">На модерации</div>
        </Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {[
          { to: '/company/internships/new', emoji: '➕', label: 'Создать стажировку', desc: 'Разместить новую вакансию' },
          { to: '/company/internships', emoji: '📋', label: 'Мои стажировки', desc: 'Управление и просмотр откликов' },
          { to: '/company/applications', emoji: '📨', label: 'Все отклики', desc: 'Общий inbox по всем вакансиям' },
          ...(user?.is_b2b ? [{ to: '/company/students/search', emoji: '🔍', label: 'Поиск студентов', desc: 'B2B: поиск кандидатов по фильтрам' }] : []),
        ].map((item) => (
          <Link key={item.to} to={item.to}>
            <Card className="flex items-center gap-4 hover:border-blue-300 transition-colors">
              <span className="text-2xl">{item.emoji}</span>
              <div>
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500">{item.desc}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
