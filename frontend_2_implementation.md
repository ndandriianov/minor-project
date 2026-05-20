# Реализация CHANGES_FOR_FRONTEND.md — прогресс

## Блок 1: Фундамент — ВЫПОЛНЕНО ✅

### Что сделано

#### `frontend/src/types/index.ts`
- Добавлены поля в `Student`: `is_boosted: boolean`
- Добавлены поля в `Internship`: `is_promoted: boolean`, `views_count: number`, `last_confirmed_at: string | null`
- Добавлены поля в `AuthUser`: `is_premium: boolean`, `is_b2b: boolean`
- Добавлено поле в `AuthSession`: `subscription?: Subscription`
- Добавлены новые интерфейсы:
  - `Subscription` — план, статус, даты
  - `SubscriptionPlan` — описание тарифа
  - `Payment` — платёж (статус, код, сумма)
  - `CheckoutResult` — ответ `/api/subscriptions/checkout`
  - `Notification` — уведомление
  - `NotificationsResponse` — `{ notifications, unread_count }`

#### `frontend/src/store/authSlice.ts`
- Добавлено поле `subscription: Subscription | null` в `AuthState`
- `setCredentials` — принимает и сохраняет `subscription`
- `setUser` — принимает `AuthUser & { subscription?: Subscription }`, сохраняет оба поля
- `logout` — сбрасывает `subscription: null`

#### `frontend/src/AppInit.tsx`
- При вызове `setUser` передаётся `data.subscription` из ответа `/api/auth/me`

#### `frontend/src/store/api.ts`
- Добавлены теги: `'Subscription'`, `'Notification'`, `'Payment'`
- Добавлены новые эндпоинты и хуки:

| Хук | Метод | URL |
|-----|-------|-----|
| `useSearchUniversitiesQuery` | GET | `/api/universities?search=` |
| `useSearchFacultiesQuery` | GET | `/api/faculties?search=&university_id=` |
| `useSearchCitiesQuery` | GET | `/api/cities?search=` |
| `useGetSubscriptionPlansQuery` | GET | `/api/subscriptions/plans` |
| `useGetMySubscriptionQuery` | GET | `/api/subscriptions/me` |
| `useCheckoutMutation` | POST | `/api/subscriptions/checkout` |
| `useCancelSubscriptionMutation` | POST | `/api/subscriptions/cancel` |
| `useGetPaymentsQuery` | GET | `/api/payments` |
| `useGetPaymentQuery` | GET | `/api/payments/{id}` |
| `useGetNotificationsQuery` | GET | `/api/notifications` |
| `useMarkNotificationReadMutation` | POST | `/api/notifications/{id}/read` |
| `useMarkAllReadMutation` | POST | `/api/notifications/read-all` |
| `useAiAdaptResumeMutation` | POST | `/api/students/resume/ai-adapt` |
| `useUploadLogoMutation` | POST | `/api/companies/logo` (multipart) |
| `useSearchStudentsQuery` | GET | `/api/company/students/search` |
| `useGetAnalyticsQuery` | GET | `/api/company/analytics` |
| `usePromoteInternshipMutation` | POST | `/api/company/internships/{id}/promote` |

> Ранее уже были: `useUploadResumeMutation`, `useSearchSkillsQuery`

### Верификация
`npm run build` — пройдено без ошибок (84 модуля, 390 KB JS).

---

## Что осталось реализовать

### Блок 2: Колокольчик уведомлений — НЕ НАЧАТО

**Файлы:**
- `frontend/src/components/layout/Navbar.tsx` — добавить кнопку-колокольчик
- Создать `frontend/src/components/notifications/NotificationBell.tsx`

**Что сделать:**
1. Компонент `NotificationBell` — polling `useGetNotificationsQuery({ unread: true })` с `pollingInterval: 30000`
2. Показывать бейдж с числом (`unread_count`) на иконке колокольчика
3. При клике — дропдаун со списком уведомлений
4. Кнопка «Прочитать все» — вызывает `useMarkAllReadMutation`
5. Вставить в `Navbar.tsx` рядом с именем пользователя (только когда залогинен)

---

### Блок 3: Premium-иконка — НЕ НАЧАТО

**Файл:** `frontend/src/components/layout/Navbar.tsx`

**Что сделать:**
- Рядом с именем пользователя: если `user.is_premium === true` — показать иконку ⭐ или корону
- Можно взять из `store` через `useSelector(state => state.auth.user?.is_premium)`

---

### Блок 4: Страница оплаты подписки — НЕ НАЧАТО

**Файлы:**
- Создать `frontend/src/pages/subscription/SubscriptionPage.tsx` — список планов с ценами
- Создать `frontend/src/pages/subscription/CheckoutPage.tsx` — payment flow
- Добавить маршруты в `frontend/src/App.tsx`

**Что сделать:**

`SubscriptionPage.tsx`:
- `useGetSubscriptionPlansQuery()` — отображает тарифы Free / Premium / B2B с кнопкой «Подключить»
- При нажатии — вызывает `useCheckoutMutation({ plan })` и редиректит на `CheckoutPage`

`CheckoutPage.tsx` (state: `{ donate_url, payment_code, amount_rub, payment.id }`):
```
- Заголовок: "Оплата подписки Premium — {amount_rub} ₽"
- Крупно: payment_code + кнопка "Скопировать"
- Предупреждение: вставить код в поле «Сообщение» на DonationAlerts
- Кнопка/ссылка → donate_url (target="_blank")
- Polling: useGetPaymentQuery(payment.id) с pollingInterval: 5000
- При status === 'paid' — редирект на /subscription/success
```

---

### Блок 5: Автокомплит для вуз/город/факультет — НЕ НАЧАТО

**Файлы:**
- Создать `frontend/src/components/ui/AutocompleteInput.tsx` — переиспользуемый компонент
- `frontend/src/pages/auth/RegisterStudentPage.tsx` — заменить текст-поля для university и city
- `frontend/src/pages/student/ProfilePage.tsx` — то же самое

**Как работает AutocompleteInput:**
- Принимает `onSearch: (q: string) => Promise<{id: number, name: string}[]>` и `onChange: (value: string) => void`
- Debounce 300ms на ввод, показывает список результатов
- Для university: `useSearchUniversitiesQuery(q)` → при выборе сохраняет `name` в форму
- Для faculty: `useSearchFacultiesQuery({ search: q, university_id })` — зависит от выбранного вуза
- Для city: `useSearchCitiesQuery(q)`

---

### Блок 6: Загрузка файлов — НЕ НАЧАТО

Загрузка резюме уже частично реализована (хук `useUploadResumeMutation` существует), но UI может отсутствовать.

**Файлы:**
- `frontend/src/pages/student/ProfilePage.tsx` — добавить `<input type="file">` для PDF, кнопку загрузки
- `frontend/src/pages/company/CompanyDashboardPage.tsx` — добавить загрузку логотипа (`useUploadLogoMutation`)

**Скачивание резюме** (компания):
- В `InternshipApplicantsPage.tsx` — ссылка `GET /api/students/{id}/resume` для каждого заявителя

---

### Блок 7: ИИ-адаптация резюме (Premium) — НЕ НАЧАТО

**Файл:** `frontend/src/pages/public/InternshipDetailPage.tsx`

**Что сделать:**
- Кнопка «Адаптировать резюме» — только если `user?.is_premium && user.role === 'student'`
- При клике — вызов `useAiAdaptResumeMutation({ internship_id: id })`
- Показать результат в Modal: matched_skills, missing_skills, adapted_resume, tips
- Если бэк вернёт 402 — Modal «Требуется Premium»

---

### Блок 8: B2B функционал — НЕ НАЧАТО

**Файлы:**
- `frontend/src/pages/company/MyInternshipsPage.tsx` — кнопка «Поднять в топ» (`usePromoteInternshipMutation`)
- Создать `frontend/src/pages/company/StudentSearchPage.tsx`
- Маршрут: `company/students/search`

**Кнопка «Поднять в топ»:**
- Показывается только если `user.is_b2b === true`
- Modal с выбором числа дней (1/7/30), затем `promoteInternship({ id, days })`

**Поиск студентов:**
- Фильтры: city (AutocompleteInput), university, course, skills (существующий SkillsAutocomplete)
- `useSearchStudentsQuery(filters)` → таблица/карточки студентов

---

### Блок 9: Nice-to-have — НЕ НАЧАТО

- `GET /api/articles` → страница «Инструменты»
- `GET /api/news` → страница «Новости»
- `GET /api/companies/{id}/reviews` → отзывы в карточке компании

---

## Порядок реализации для следующего агента

1. **Блок 2** (колокольчик) — самое простое, чисто UI поверх готового хука
2. **Блок 3** (premium-иконка) — 3 строки в Navbar
3. **Блок 5** (автокомплит) — часто используется, улучшает UX регистрации
4. **Блок 4** (страница оплаты) — отдельная страница, не ломает существующее
5. **Блок 6** (файлы) — расширение существующих страниц
6. **Блок 7** (ИИ-резюме) — Premium-фича на InternshipDetailPage
7. **Блок 8** (B2B) — новые страницы компании
8. **Блок 9** (nice-to-have) — последним

## Полезные ссылки
- API документация: `http://localhost:5051/apidocs/`
- Health-check: `GET http://localhost:5051/api/health`
- CHANGES_FOR_FRONTEND.md: `/Users/nick/Desktop/minor-project/CHANGES_FOR_FRONTEND.md`
