import { useEffect, useState } from 'react'
import { useLocation, Navigate, useNavigate } from 'react-router-dom'
import { useGetPaymentQuery } from '@/store/api'
import type { CheckoutResult } from '@/types'
import Button from '@/components/ui/Button'

export default function CheckoutPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const state = location.state as CheckoutResult | null
  const [paid, setPaid] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mockConfirming, setMockConfirming] = useState(false)

  const paymentId = state?.payment?.id ?? 0
  const isMock = state?.provider === 'mock'

  const { data: payment } = useGetPaymentQuery(paymentId, {
    pollingInterval: paid ? 0 : 5000,
    skip: !paymentId || paid,
  })

  useEffect(() => {
    if (payment?.status === 'paid') setPaid(true)
  }, [payment?.status])

  if (!state) return <Navigate to="/subscription" replace />

  const handleCopy = async () => {
    if (!state.payment_code) return
    await navigator.clipboard.writeText(state.payment_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // В dev/mock-режиме подтверждаем оплату напрямую через mock-эндпоинт
  const handleMockConfirm = async () => {
    if (!state.payment_url) return
    setMockConfirming(true)
    try {
      await fetch(state.payment_url)
      setPaid(true)
    } catch {
      // ignore
    } finally {
      setMockConfirming(false)
    }
  }

  if (paid) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Подписка активирована!</h1>
        <p className="text-gray-500 mb-6">Теперь вам доступны все возможности выбранного тарифа.</p>
        <Button size="lg" onClick={() => navigate(-2)}>Перейти в кабинет</Button>
      </div>
    )
  }

  // ── Mock-режим (DonationAlerts не настроен) ──────────────────────────────
  if (isMock) {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6">
            <p className="text-sm font-semibold text-amber-800 mb-1">Режим разработки</p>
            <p className="text-sm text-amber-700">{state.note ?? 'DonationAlerts не настроен. Нажмите кнопку ниже для тестовой активации.'}</p>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Тестовая оплата подписки</h1>
          <p className="text-sm text-gray-500 mb-6">
            В production-режиме здесь будет форма оплаты через DonationAlerts.
            Для теста нажмите «Активировать (тест)».
          </p>
          <Button size="lg" className="w-full" loading={mockConfirming} onClick={handleMockConfirm}>
            Активировать подписку (тест)
          </Button>
          <p className="text-xs text-gray-400 mt-4 text-center">
            Страница обновится автоматически после активации
          </p>
        </div>
      </div>
    )
  }

  // ── DonationAlerts-режим ─────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto mt-8">
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Оплата подписки</h1>
        <p className="text-3xl font-bold text-blue-600 mb-6">
          {state.amount_rub != null ? `${state.amount_rub.toLocaleString()} ₽/мес` : ''}
        </p>

        {state.payment_code && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-sm font-semibold text-amber-800 mb-3">Ваш код оплаты</p>
            <div className="flex items-center gap-3">
              <code className="flex-1 text-xl font-bold text-gray-900 tracking-widest bg-white rounded-lg px-4 py-3 border border-amber-300">
                {state.payment_code}
              </code>
              <button
                onClick={handleCopy}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition"
              >
                {copied ? '✓' : 'Копировать'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-6">
          <p className="text-sm text-red-700">
            ⚠️ В поле <strong>«Сообщение»</strong> на DonationAlerts вставьте этот код.
            Без кода подписка не активируется.
          </p>
        </div>

        <ol className="space-y-2 mb-6 text-sm text-gray-600">
          <li><span className="font-medium text-gray-900">1.</span> Скопируйте код выше</li>
          <li><span className="font-medium text-gray-900">2.</span> Нажмите «Перейти к оплате»</li>
          <li><span className="font-medium text-gray-900">3.</span> Выберите RUB, введите сумму <strong>{state.amount_rub} ₽</strong></li>
          <li><span className="font-medium text-gray-900">4.</span> Вставьте код в поле «Сообщение»</li>
          <li><span className="font-medium text-gray-900">5.</span> Завершите оплату — подписка активируется автоматически</li>
        </ol>

        {state.donate_url && (
          <a href={state.donate_url} target="_blank" rel="noreferrer" className="block">
            <Button size="lg" className="w-full">Перейти к оплате →</Button>
          </a>
        )}

        <p className="text-xs text-gray-400 mt-4 text-center">
          Страница обновится автоматически после подтверждения платежа
        </p>
      </div>
    </div>
  )
}
