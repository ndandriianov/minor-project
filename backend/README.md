# Бэкенд — Платформа стажировок для студентов

REST API на Flask + SQLAlchemy + JWT для агрегатора стажировок.

## Быстрый старт

```bash
# Установка зависимостей
pip install -r requirements.txt

# Заполнение тестовыми данными
python3 seed.py

# (опционально) Порт сервера: сначала APP_PORT, затем PORT, по умолчанию 5051
export APP_PORT=5051

# Запуск сервера
python3 app.py
```

Сервер будет доступен на `http://localhost:<APP_PORT>` (по умолчанию `http://localhost:5051`).

## Запуск в Docker

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5051`
- Swagger UI: `http://localhost:5051/apidocs`

При первом запуске backend автоматически создаёт SQLite-базу и заполняет её тестовыми данными.

## Тестовые аккаунты

| Роль     | Email             | Пароль       |
|----------|-------------------|--------------|
| Студент  | ivan@student.ru   | password123  |
| Студент  | maria@student.ru  | password123  |
| Студент  | alex@student.ru   | password123  |
| Компания | hr@yandex.ru      | password123  |
| Компания | hr@sber.ru        | password123  |
| Компания | hr@vk.ru          | password123  |
| Компания | hr@tinkoff.ru     | password123  |
| Админ    | admin@platform.ru | password123  |

## Структура проекта

```
backend/
├── app.py            # Главное приложение + все маршруты API
├── models.py         # Модели SQLAlchemy (User, Student, Company, Internship, ...)
├── seed.py           # Заполнение БД тестовыми данными
├── requirements.txt  # Зависимости Python
└── uploads/          # Загруженные резюме (создаётся автоматически)
```

## API Endpoints

### Авторизация

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/auth/register/student` | Регистрация студента |
| POST | `/api/auth/register/company` | Регистрация компании |
| POST | `/api/auth/login` | Вход (email + password → JWT) |
| POST | `/api/auth/refresh` | Обновление access-токена |
| GET  | `/api/auth/me` | Текущий пользователь |

### Студент — профиль

| Метод | URL | Описание |
|-------|-----|----------|
| PUT  | `/api/students/profile` | Обновить профиль (+ навыки) |
| GET  | `/api/students/<id>` | Просмотр профиля студента |
| POST | `/api/students/resume` | Загрузка резюме (PDF, multipart) |

### Стажировки — публичные

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/internships` | Лента с фильтрами и пагинацией |
| GET | `/api/internships/<id>` | Детальная карточка |
| GET | `/api/internships/recommendations` | Рекомендации (для студента) |

**Фильтры** (query params для `/api/internships`):
- `city` — город
- `direction` — направление (IT, Маркетинг, Аналитика, ...)
- `work_format` — office / hybrid / remote
- `required_experience` — none / <1year / 1-3years
- `compatible_with_study` — true/false
- `min_salary` — минимальная зарплата
- `max_hours` — макс. часов в неделю
- `search` — поиск по названию и описанию
- `sort` — newest / salary_desc / deadline
- `page`, `per_page` — пагинация

### Отклики

| Метод | URL | Роль | Описание |
|-------|-----|------|----------|
| POST | `/api/applications` | Студент | Откликнуться |
| GET  | `/api/applications` | Студент | Мои отклики + статусы |
| POST | `/api/applications/<id>/withdraw` | Студент | Отозвать |
| GET  | `/api/company/applications` | Компания | Все отклики на мои вакансии |
| GET  | `/api/company/internships/<id>/applications` | Компания | Отклики на вакансию |
| PUT  | `/api/company/applications/<id>/status` | Компания | Изменить статус |

### Закладки (отложенные)

| Метод | URL | Описание |
|-------|-----|----------|
| POST   | `/api/bookmarks` | Отложить стажировку |
| GET    | `/api/bookmarks` | Список отложенных |
| DELETE | `/api/bookmarks/<internship_id>` | Убрать из отложенных |

### Компания — CRUD стажировок

| Метод | URL | Описание |
|-------|-----|----------|
| POST   | `/api/company/internships` | Создать стажировку |
| GET    | `/api/company/internships` | Мои вакансии + статусы модерации |
| PUT    | `/api/company/internships/<id>` | Редактировать |
| DELETE | `/api/company/internships/<id>` | Удалить |

### Модерация (админ)

| Метод | URL | Описание |
|-------|-----|----------|
| GET  | `/api/admin/internships/pending` | Вакансии на модерации |
| POST | `/api/admin/internships/<id>/moderate` | Одобрить / отклонить |
| GET  | `/api/admin/applications` | Read-only список всех откликов |

### Справочники (автокомплит)

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/skills?search=py` | Навыки |
| GET | `/api/universities?search=Мос` | Вузы |
| GET | `/api/faculties?university_id=1&search=ком` | Факультеты |
| GET | `/api/cities?search=Каз` | Города |

### Контент

| Метод | URL | Описание |
|-------|-----|----------|
| GET / POST / PUT / DELETE | `/api/articles[...]` | Статьи раздела «Инструменты» (POST/PUT/DELETE — admin) |
| GET / POST | `/api/news[...]` | Лента новостей (POST — admin) |

### Уведомления

| Метод | URL | Описание |
|-------|-----|----------|
| GET  | `/api/notifications` | Мои уведомления (+ `unread=true`) |
| POST | `/api/notifications/<id>/read` | Отметить прочитанным |
| POST | `/api/notifications/read-all` | Прочитать все |

Уведомления создаются автоматически: новый отклик, смена статуса отклика, результат модерации, автоархивация, активация подписки.

### Отзывы

| Метод | URL | Описание |
|-------|-----|----------|
| POST | `/api/reviews` | Оставить отзыв (rating 1..5) |
| GET  | `/api/companies/<id>/reviews` | Отзывы по компании |
| GET  | `/api/internships/<id>/reviews` | Отзывы по стажировке |

### Подписки и платежи (Freemium / B2B)

| Метод | URL | Описание |
|-------|-----|----------|
| GET  | `/api/subscriptions/plans` | Тарифы |
| GET  | `/api/subscriptions/me` | Моя подписка |
| POST | `/api/subscriptions/checkout` | Оформить (создать платёж) |
| POST | `/api/subscriptions/cancel` | Отменить |
| GET/POST | `/api/payments/webhook` | Подтверждение оплаты (mock) |

### Premium / B2B функционал

| Метод | URL | Доступ | Описание |
|-------|-----|--------|----------|
| GET  | `/api/internships/recommendations/advanced` | Premium-студент | Расширенный подбор |
| POST | `/api/students/resume/ai-adapt` | Premium-студент | ИИ-адаптация резюме под вакансию |
| GET  | `/api/company/students/search` | B2B-компания | Поиск студентов |
| GET  | `/api/company/analytics` | B2B-компания | Аналитика откликов |
| POST | `/api/company/internships/<id>/promote` | B2B-компания | Поднять в топ |
| POST | `/api/companies/logo` | Компания | Загрузка логотипа |
| POST | `/api/company/internships/<id>/confirm` | Компания | Подтвердить актуальность |
| GET  | `/api/students/<id>/resume` | Компания/админ/сам студент | Скачать резюме |
| POST | `/api/admin/run-stale-check` | Admin | Запустить проверку устаревших вакансий |

### Прочее

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/health` | Проверка работоспособности |

## Запуск с PostgreSQL

```bash
docker compose -f docker-compose.postgres.yml up --build
```

Бэкенд автоматически перейдёт на Postgres через `DATABASE_URL`.
Для миграций включён `flask-migrate` (команды `flask db init/migrate/upgrade`).

## Платежи через DonationAlerts

Бэкенд принимает оплату через DonationAlerts (DA). Логика:

1. На `/api/subscriptions/checkout` создаётся `Payment` с уникальным кодом (`PAY-XXXXXXXX`).
2. Фронт получает `donate_url` (страница доната стримера) и `payment_code`.
3. Пользователь донатит указанную сумму **и обязательно вписывает код в поле «Сообщение»**.
4. Фоновый поллер (по умолчанию раз в 60с) опрашивает `GET /api/v1/alerts/donations`,
   находит донат с кодом в `message` и активирует подписку.

### Настройка DonationAlerts

```bash
# 1. Войдите в свой DA-аккаунт стримера
# 2. Создайте приложение: https://www.donationalerts.com/application/clients
#    Scopes: oauth-donation-index (можно также oauth-donation-subscribe для real-time)
# 3. Получите Access Token

export DONATIONALERTS_USERNAME=your_streamer_name   # часть URL https://www.donationalerts.com/r/<USERNAME>
export DONATIONALERTS_TOKEN=eyJ0eXAi...             # Access Token
export DONATIONALERTS_POLL_SEC=60                   # период опроса в секундах
```

Если `DONATIONALERTS_USERNAME`/`DONATIONALERTS_TOKEN` не заданы — `/checkout`
возвращает `provider: "mock"` с тестовым `payment_url`, который сразу активирует
подписку (только для разработки фронта). В проде выключите это: `ALLOW_MOCK_PAYMENTS=0`.

### Эндпоинты платежей

| Метод | URL | Описание |
|-------|-----|----------|
| GET  | `/api/payments` | Моя история платежей |
| GET  | `/api/payments/<id>` | Статус конкретного платежа (для polling фронтом) |
| GET/POST | `/api/payments/mock-confirm` | Mock-подтверждение (dev) |
| POST | `/api/admin/payments/<id>/confirm` | Ручное подтверждение (admin) |
| POST | `/api/admin/payments/poll` | Принудительный опрос DA (admin) |

### Что нужно сделать **вам** для запуска оплаты в проде

1. Зарегистрироваться на donationalerts.com (если ещё нет).
2. Создать приложение в [личном кабинете](https://www.donationalerts.com/application/clients).
3. Получить Access Token со scope `oauth-donation-index`.
4. Прописать в `.env`:
   ```
   DONATIONALERTS_USERNAME=<ваш username>
   DONATIONALERTS_TOKEN=<token>
   ALLOW_MOCK_PAYMENTS=0
   ```
5. Перезапустить контейнер.

Альтернатива (быстрее, но менее надёжно): можно использовать **Centrifugo** —
DA шлёт real-time события в websocket-канал `$alerts:donation_<user_id>`.
Сейчас реализован polling, который проще и не требует постоянного соединения.

## ИИ-помощник по резюме (OpenAI)

Если задан `OPENAI_API_KEY`, эндпоинт `/api/students/resume/ai-adapt` использует
реальную модель (по умолчанию `gpt-4o-mini`). Без ключа — локальный шаблон.

```bash
export OPENAI_API_KEY=sk-...
export OPENAI_MODEL=gpt-4o-mini
```

Можно подменить базовый URL под совместимые провайдеры (Together/Groq/OpenRouter):
`OPENAI_BASE_URL=https://...`.

## Email-уведомления (опционально)

Подключите SMTP через env, и уведомления о смене статуса отклика / активации подписки
будут дублироваться письмами:

```
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=1
MAIL_USERNAME=...
MAIL_PASSWORD=app-password
MAIL_DEFAULT_SENDER=no-reply@platform.ru
```

## Rate limiting

`flask-limiter`: 1000 запросов/час по IP по умолчанию, 20 логинов/минуту,
20 чекаутов/час, 10 регистраций/час. Хранилище по умолчанию — память;
для нескольких воркеров укажите `RATELIMIT_STORAGE=redis://...`.

## Smoke-тесты

```bash
pip install pytest
cd backend && pytest -q
```

## Фоновые задачи

- `APScheduler` ежедневно проверяет вакансии, которые не подтверждались более 14 дней, и переводит их в статус `archived` (с уведомлением компании). Эндпоинт `/api/company/internships/<id>/confirm` сбрасывает таймер.
- Можно отключить установкой `DISABLE_SCHEDULER=1`.

## Авторизация

Все защищённые эндпоинты требуют заголовок:

```
Authorization: Bearer <access_token>
```

Токен получается через `/api/auth/login` или `/api/auth/register/*`.

## Примеры запросов (curl)

```bash
BASE_URL="http://localhost:${APP_PORT:-5051}"

# Логин
curl -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"ivan@student.ru","password":"password123"}'

# Лента стажировок с фильтрами
curl "$BASE_URL/api/internships?city=Москва&compatible_with_study=true&sort=salary_desc"

# Откликнуться (с токеном)
curl -X POST "$BASE_URL/api/applications" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"internship_id": 1, "cover_letter": "Хочу у вас стажироваться!"}'
```
