# Что появилось на бэкенде — для фронтенд-разработчика

Документ описывает изменения за Стадии 2 и 3 по роадмапу + интеграцию платежей через DonationAlerts + ИИ-помощник.
Полная справка по API: Swagger UI — `http://localhost:5051/apidocs/`.

---

## TL;DR — что добавлено

1. **Справочники с автокомплитом** — `/api/universities`, `/api/faculties`, `/api/cities`.
2. **Статьи и новости** — `/api/articles`, `/api/news`.
3. **Уведомления** — `/api/notifications` (создаются автоматически).
4. **Отзывы** — `/api/reviews` + список по компании/стажировке.
5. **Подписки** — Free / Premium (студент, 499₽/мес) / B2B (компания, 9900₽/мес).
6. **Платежи через DonationAlerts** — `/api/subscriptions/checkout` возвращает донат-URL и код для сообщения.
7. **ИИ-резюме** (Premium) — `/api/students/resume/ai-adapt`.
8. **B2B функционал** — поиск студентов, аналитика, продвижение вакансий.
9. **Логотип компании** — загрузка через `/api/companies/logo`.
10. **Скачивание резюме** — `/api/students/<id>/resume` (компания/админ).

---

## Что изменилось в существующих ответах

### `User.to_dict()` теперь содержит флаги подписки

```ts
type User = {
  id: number
  email: string
  role: 'student' | 'company' | 'admin'
  created_at: string
  is_premium: boolean   // ← новое: активная premium ИЛИ b2b
  is_b2b: boolean       // ← новое: только b2b
}
```

### `Student.to_dict()` — флаг буста

```ts
type Student = {
  // ...все прежние поля
  is_boosted: boolean  // ← новое: подписка premium даёт буст
}
```

### `Internship.to_dict()` — продвижение и просмотры

```ts
type Internship = {
  // ...все прежние поля
  is_promoted: boolean       // ← b2b-компания подняла вакансию в топ
  views_count: number        // ← счётчик просмотров (нужен для аналитики)
  last_confirmed_at: string  // ← когда работодатель в последний раз подтверждал актуальность
}
```

### `/api/auth/login` и `/api/auth/me` — добавлен блок `subscription`

```json
{
  "user": { ... },
  "student": { ... },
  "subscription": {
    "plan": "free" | "premium" | "b2b",
    "status": "active" | "expired" | "cancelled",
    "started_at": "...",
    "expires_at": "..." | null
  }
}
```

---

## Подписки и оплата через DonationAlerts

### Поток оплаты

```
[Фронт] → POST /api/subscriptions/checkout {plan: "premium"}
       ← {donate_url, payment_code, amount_rub, instructions, payment: {id}}

[Фронт] показывает страницу с:
  - кнопкой/ссылкой "Перейти к оплате" на donate_url
  - крупно: payment_code + кнопка "Скопировать"
  - сумма amount_rub
  - инструкция: на DA выбрать RUB, ввести сумму, вставить код в "Сообщение"

[Юзер] переходит на DA, донатит с кодом в сообщении

[Фронт] polling: GET /api/payments/{id} раз в 5-10 секунд
       пока не вернётся status: "paid"
       (или альтернативно через GET /api/auth/me — is_premium станет true)

[Готово] фронт обновляет UI: показывает премиум-фичи
```

### Эндпоинты подписок

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/subscriptions/plans` | Список тарифов с ценами и фичами |
| GET | `/api/subscriptions/me` | Текущая подписка пользователя |
| POST | `/api/subscriptions/checkout` | Создать платёж, body: `{plan: "premium" \| "b2b"}` |
| POST | `/api/subscriptions/cancel` | Отменить подписку (остаётся активной до expires_at) |
| GET | `/api/payments` | История моих платежей |
| GET | `/api/payments/{id}` | Статус конкретного платежа (для polling) |

### Тонкость: payment_code

DA не даёт уникальных URL платежей — это донат-платформа. Поэтому мы используем **код в поле «Сообщение»**. UX:

```jsx
<div>
  <h2>Оплата подписки Premium — {amount_rub} ₽</h2>
  <p>Перейдите на DonationAlerts и оплатите подписку.</p>

  <CodeBlock>
    <span>{payment_code}</span>
    <CopyButton text={payment_code}>Скопировать код</CopyButton>
  </CodeBlock>

  <p>⚠️ В поле «Сообщение донату» вставьте этот код, иначе подписка не активируется.</p>

  <a href={donate_url} target="_blank">Перейти к оплате</a>
</div>
```

Параллельно делать polling `/api/payments/{id}` и при `status: paid` редиректить юзера на «Спасибо за подписку».

---

## ИИ-помощник по резюме (Premium)

```
POST /api/students/resume/ai-adapt
Body: { internship_id: 1 }
Authorization: Bearer <student-token-with-active-premium>

Response 200:
{
  "provider": "mistral-small-latest",
  "matched_skills": ["Python", "SQL", "Git"],
  "missing_skills": ["Docker"],
  "adapted_resume": "Студент 3 курса НИУ ВШЭ...",
  "tips": [
    "Подчеркните проекты, где использовались: Python, SQL",
    "Освойте недостающие навыки: Docker"
  ]
}

Response 402: { error: "Требуется премиум-подписка" }
```

Эндпоинт — премиум-только. Без активной подписки бэк вернёт `402 Payment Required` с `upgrade_url`. На фронте: если 402 — показать модалку «Подключите Premium».

---

## Уведомления

Создаются автоматически при:
- новом отклике (HR получает уведомление)
- смене статуса отклика (студент получает уведомление)
- результате модерации вакансии (HR получает уведомление)
- авто-архивации вакансии (HR получает напоминание)
- активации подписки (юзер получает подтверждение)

### Эндпоинты

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/notifications` | Список (+ `?unread=true`) |
| POST | `/api/notifications/{id}/read` | Отметить прочитанным |
| POST | `/api/notifications/read-all` | Прочитать все |

Ответ содержит `unread_count` — удобно для колокольчика в шапке:

```json
{ "notifications": [...], "unread_count": 3 }
```

```ts
type Notification = {
  id: number
  type: string  // "new_application" | "application_interview" | ...
  text: string
  is_read: boolean
  application_id: number | null
  internship_id: number | null
  created_at: string
}
```

Рекомендация: polling раз в 30-60 сек когда юзер залогинен, или WebSocket в будущем.

---

## Справочники для автокомплита

Все три ходят одинаково:

```
GET /api/universities?search=Мос
GET /api/faculties?search=ком&university_id=1
GET /api/cities?search=Кра
GET /api/skills?search=Py
```

Ответ:
```json
{ "items": [{ "id": 1, "name": "НИУ ВШЭ", "city": "Москва" }, ...] }
```

(У `/api/skills` ответ — `{ "skills": [...] }` — небольшое легаси-расхождение, исторически.)

Использовать в полях регистрации/профиля. Бэк отдаёт максимум 50 результатов, отсортированных по алфавиту.

---

## B2B функционал (для компаний с подпиской)

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/company/students/search` | Поиск студентов: `?city=`, `?university=`, `?course=`, `?skills=Python&skills=SQL` |
| GET | `/api/company/analytics` | Аналитика откликов и конверсий по моим вакансиям |
| POST | `/api/company/internships/{id}/promote` | Поднять в топ выдачи на N дней. Body: `{days: 7}` |

Без активной B2B-подписки бэк вернёт 402.

---

## Загрузка файлов

### Резюме студента (PDF)

```
POST /api/students/resume
Content-Type: multipart/form-data
file: <PDF файл, до 10 МБ>
```

Бэк проверяет: расширение `.pdf` + MIME + сигнатуру `%PDF`. После загрузки сохраняет в `resume_filename` профиля студента.

Компания/админ может скачать:
```
GET /api/students/{student_id}/resume
```
(сам студент тоже может скачать своё)

### Логотип компании

```
POST /api/companies/logo
Content-Type: multipart/form-data
file: <PNG/JPG/JPEG/WEBP/SVG, до 10 МБ>
```

После загрузки `company.logo_url` обновляется (путь типа `/uploads/logo_1_abc12345.png`). Использовать с `http://localhost:5051` + путь.

---

## Что нужно поправить на фронте

Минимальный must-have:

1. **Страница оплаты подписки** — UI для checkout-потока (см. выше). Сейчас её, скорее всего, нет.
2. **Колокольчик уведомлений** в шапке — polling `/api/notifications?unread=true`.
3. **Иконка premium у юзера** — если `user.is_premium === true`, показать значок.
4. **Кнопка «Поднять в топ»** в карточке вакансии компании — если `company.is_b2b`.
5. **Поля автокомплита** — заменить text-input на autocomplete для вуз/факультет/город при регистрации и редактировании профиля.

Nice-to-have:

6. Страница «Инструменты» (статьи) — `/api/articles`.
7. Раздел «Новости» — `/api/news`.
8. Раздел «Отзывы» в карточке компании — `/api/companies/{id}/reviews`.
9. Премиум-блок с кнопкой «Адаптировать резюме под вакансию» — `/api/students/resume/ai-adapt`.
10. B2B-страница «Поиск студентов» с фильтрами.

---

## Админ-панель (новое)

Бэкенд готов к UI админ-панели. Все эндпоинты требуют роль `admin`.

### Настройки приложения (key-value в БД)

Цены тарифов, лимиты размещения и пр. больше **не зашиты в код** — лежат в таблице `AppSetting`, меняются через API без перезапуска.

| Метод | URL | Описание |
|---|---|---|
| GET  | `/api/admin/settings` | Все настройки + те, что ещё не в БД (с дефолтами) |
| PUT  | `/api/admin/settings/{key}` | Изменить одну: `{value, type?, description?}` |
| PUT  | `/api/admin/settings` | Массовое: `{key1: value1, key2: value2, ...}` |

Список ключей с дефолтами:

| Ключ | Тип | Дефолт | Что управляет |
|---|---|---|---|
| `price_premium` | int | 499 | Цена premium ₽/мес |
| `price_b2b` | int | 9900 | Цена B2B ₽/мес |
| `period_days_premium` | int | 30 | Длительность premium |
| `period_days_b2b` | int | 30 | Длительность B2B |
| `free_posting_limit` | int | 3 | Лимит вакансий для бесплатной компании |
| `b2b_posting_limit` | int | 100 | Лимит вакансий для B2B-компании |
| `stale_days` | int | 14 | Через сколько дней архивируется неподтверждённая вакансия |
| `min_payment_amount` | int | 15 | Мин. сумма доната для активации |
| `platform_name` | string | "Платформа стажировок" | Название |
| `support_email` | string | "" | Email поддержки |

Каждое значение в JSON хранится как строка с указанием `type` — фронт должен сам касто́вать к нужному типу при отображении в инпуте.

### Дашборд (статистика)

```
GET /api/admin/stats

{
  "users": {"students": 4, "companies": 4, "total": 9},
  "internships": {"published": 8, "pending": 1, "archived": 0},
  "applications": {"total": 3, "by_status": {"applied": 2, "interview": 1, ...}},
  "subscriptions": {"premium_active": 1, "b2b_active": 0},
  "payments": {"paid": 1, "pending": 0, "revenue_rub": 15},
  "reviews": 2
}
```

### Пользователи

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/admin/users?role=&search=&page=&per_page=` | Список + пагинация + поиск по email |
| DELETE | `/api/admin/users/{id}` | Удалить (каскадно) |
| PUT | `/api/admin/users/{id}/role` | Сменить роль: `{role: "admin"}` |
| POST | `/api/admin/users/{id}/subscription` | Выдать подписку: `{plan: "premium", days: 30}` |

### Компании

| Метод | URL | Описание |
|---|---|---|
| POST | `/api/admin/companies/{id}/verify` | Изменить `posting_limit`: `{posting_limit: 20}` |

### Отзывы

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/admin/reviews?company_id=&min_rating=&max_rating=` | Все отзывы для модерации |
| DELETE | `/api/admin/reviews/{id}` | Удалить (если оскорбительный/спам) |

### Платежи

| Метод | URL | Описание |
|---|---|---|
| GET | `/api/admin/payments?status=&plan=&user_id=` | История всех платежей |
| POST | `/api/admin/payments/{id}/confirm` | Подтвердить вручную (если поллер не справился) |
| POST | `/api/admin/payments/poll` | Форс-опрос DonationAlerts |

### Вакансии и отклики (уже было)

- `GET /api/admin/internships/pending`
- `POST /api/admin/internships/{id}/moderate` → `{action: "approve" \| "reject"}`
- `POST /api/admin/run-stale-check`
- `GET /api/admin/applications?internship_id=&company_id=&status=`

### Что нужно на фронте

Минимальная админ-страница:

1. **Сайдбар** с разделами: Дашборд / Юзеры / Компании / Вакансии / Платежи / Отзывы / Настройки
2. **Дашборд** — карточки с цифрами из `/api/admin/stats`
3. **Юзеры** — таблица + фильтр по роли + поиск + действия (изменить роль, выдать подписку, удалить)
4. **Настройки** — список ключ-значение с inline-редактированием. После клика «Сохранить» — `PUT /api/admin/settings`
5. **Платежи** — таблица с фильтрами, кнопка «Подтвердить вручную»
6. **Модерация вакансий** — список pending + кнопки Approve/Reject
7. **Отзывы** — список + кнопка удаления

Авторизация под админом: `admin@platform.ru` / `password123` (из seed.py).

---

## Авторизация — без изменений

JWT в заголовке `Authorization: Bearer <access_token>`. Refresh всё так же — POST `/api/auth/refresh` с refresh-токеном в Authorization. Срок жизни access — 2 часа, refresh — 30 дней.

⚠️ JWT_SECRET был сменён в процессе разработки — если у фронта в localStorage остались старые токены, нужно `localStorage.clear()` и перелогиниться.

---

## Что у бэка теперь под капотом

- **APScheduler** — фоновые задачи (опрос DonationAlerts раз в 60с, архивация устаревших вакансий раз в день).
- **Flask-Limiter** — rate-limit на login (20/мин), register (10/час), checkout (20/час).
- **Flask-Migrate** — миграции БД (см. `backend/MIGRATIONS.md`).
- **Поддержка PostgreSQL** — через `DATABASE_URL`. SQLite по умолчанию для dev.
- **Mistral / OpenAI** интеграция через OpenAI-совместимый API.

---

## Бэкенд жив?

```bash
curl http://localhost:5051/api/health
```

```json
{
  "status": "ok",
  "db": true,
  "donationalerts_configured": true,
  "openai_configured": true,
  "mail_configured": false,
  "version": "3.1.0"
}
```

Если `db: false` — бэкенд не достучался до базы. Если интеграция показывает `false` — соответствующая фича работает в fallback-режиме (платежи в mock, AI как шаблон, email молча игнорируется).

---

## Контакт / вопросы

Если что-то непонятно или нужен новый эндпоинт — пиши в Telegram / открывай issue.
