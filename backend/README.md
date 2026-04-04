# Бэкенд — Платформа стажировок для студентов

REST API на Flask + SQLAlchemy + JWT для агрегатора стажировок.

## Быстрый старт

```bash
# Установка зависимостей
pip install -r requirements.txt

# Заполнение тестовыми данными
python3 seed.py

# Запуск сервера
python3 app.py
```

Сервер будет доступен на `http://localhost:5000`.

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

### Прочее

| Метод | URL | Описание |
|-------|-----|----------|
| GET | `/api/skills` | Справочник навыков (?search=py) |
| GET | `/api/health` | Проверка работоспособности |

## Авторизация

Все защищённые эндпоинты требуют заголовок:

```
Authorization: Bearer <access_token>
```

Токен получается через `/api/auth/login` или `/api/auth/register/*`.

## Примеры запросов (curl)

```bash
# Логин
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ivan@student.ru","password":"password123"}'

# Лента стажировок с фильтрами
curl "http://localhost:5000/api/internships?city=Москва&compatible_with_study=true&sort=salary_desc"

# Откликнуться (с токеном)
curl -X POST http://localhost:5000/api/applications \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"internship_id": 1, "cover_letter": "Хочу у вас стажироваться!"}'
```
