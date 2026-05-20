import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetMySubscriptionQuery, useCheckoutMutation } from '@/store/api'
import { useAuth } from '@/hooks/useAuth'
import Button from '@/components/ui/Button'
import type { CheckoutResult } from '@/types'

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price_rub: 0,
    features: ['Поиск стажировок', 'Отклики на вакансии', 'Закладки', 'Рекомендации'],
  },
  {
    id: 'premium',
    name: 'Premium',
    price_rub: 499,
    features: ['Всё из Free', '⭐ Буст профиля в поиске', '✨ ИИ-адаптация резюме под вакансию', 'Приоритетные рекомендации'],
  },
  {
    id: 'b2b',
    name: 'B2B',
    price_rub: 9900,
    features: ['Поиск студентов по фильтрам', 'Аналитика откликов и конверсий', 'Продвижение вакансий в топ', 'Приоритетная поддержка'],
  },
]

export default function SubscriptionPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: currentSub } = useGetMySubscriptionQuery()
  const [checkout] = useCheckoutMutation()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState('')

  const handleSubscribe = async (planId: string) => {
    if (planId === 'free') return
    setError('')
    setLoadingPlan(planId)
    try {
      const result = await checkout({ plan: planId as 'premium' | 'b2b' }).unwrap()
      navigate('/subscription/checkout', { state: result as CheckoutResult })
    } catch {
      setError('Не удалось создать платёж. Попробуйте позже.')
    } finally {
      setLoadingPlan(null)
    }
  }

  const isCurrentPlan = (planId: string) =>
    currentSub?.plan === planId && currentSub?.status === 'active'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Подписка</h1>
        <p className="text-gray-500">Выберите тариф и разблокируйте дополнительные возможности</p>
        {currentSub && currentSub.plan !== 'free' && (
          <div className="mt-4 inline-block bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 text-sm text-blue-700">
            Текущий тариф: <strong>{currentSub.plan}</strong>
            {currentSub.expires_at && (
              <> · до {new Date(currentSub.expires_at).toLocaleDateString('ru-RU')}</>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-center">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isCurrent={isCurrentPlan(plan.id)}
            isLoading={loadingPlan === plan.id}
            userRole={user?.role}
            onSubscribe={handleSubscribe}
          />
        ))}
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  isCurrent,
  isLoading,
  userRole,
  onSubscribe,
}: {
  plan: { id: string; name: string; price_rub: number; features: string[] }
  isCurrent: boolean
  isLoading: boolean
  userRole?: string
  onSubscribe: (id: string) => void
}) {
  const isPremium = plan.id === 'premium'
  const isFree = plan.id === 'free'
  const isB2B = plan.id === 'b2b'

  const unavailable = (isPremium && userRole === 'company') || (isB2B && userRole === 'student')

  return (
    <div className={`relative bg-white border rounded-xl p-6 flex flex-col gap-4 ${
      isPremium ? 'border-blue-400 shadow-md' : 'border-gray-200'
    } ${isCurrent ? 'ring-2 ring-blue-500' : ''}`}>
      {isPremium && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
          Популярный
        </span>
      )}
      <div>
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
        <p className="text-2xl font-bold text-blue-600 mt-1">
          {plan.price_rub === 0 ? 'Бесплатно' : `${plan.price_rub.toLocaleString()} ₽/мес`}
        </p>
      </div>
      <ul className="flex-1 space-y-2">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="text-green-500 flex-shrink-0 mt-0.5">✓</span>
            {f}
          </li>
        ))}
      </ul>
      {isCurrent ? (
        <span className="text-center text-sm font-medium text-blue-600">Текущий тариф</span>
      ) : isFree || unavailable ? (
        <Button variant="secondary" disabled className="w-full">
          {unavailable ? 'Недоступно' : 'Базовый'}
        </Button>
      ) : (
        <Button
          className="w-full"
          loading={isLoading}
          onClick={() => onSubscribe(plan.id)}
        >
          Подключить
        </Button>
      )}
    </div>
  )
}
