# Фронтенд — Платформа вакансий в стартапах для студентов

Клиентская часть приложения на React + TypeScript + Vite.

Интерфейс поддерживает роли:
- студент;
- компания;
- администратор (модератор).

## Технологии

- React 19
- TypeScript
- Vite
- Redux Toolkit + RTK Query
- React Router
- Tailwind CSS 4
- ESLint

## Быстрый старт

### 1) Установка зависимостей

```bash
cd frontend
npm install
```

### 2) Запуск dev-сервера

```bash
npm run dev
```

По умолчанию Vite поднимает фронтенд на `http://localhost:5173`.

### 3) Сборка production

```bash
npm run build
```

### 4) Проверка линтером

```bash
npm run lint
```

### 5) Локальный предпросмотр production-сборки

```bash
npm run preview
```

## Важная настройка API

Сейчас base URL API захардкожен в `frontend/src/store/baseQuery.ts`:

```ts
baseUrl: 'http://localhost:5051'
```

Это значит, что для работы фронтенда backend должен быть запущен на `http://localhost:5051`.

## Авторизация

- Access/refresh токены хранятся в `localStorage`.
- При старте приложения выполняется восстановление сессии через `/api/auth/me` (см. `frontend/src/AppInit.tsx`).
- При `401` RTK Query делает попытку refresh токена (см. `frontend/src/store/baseQuery.ts`).

## Тестовые аккаунты

| Роль | Аккаунт | Email | Пароль | Тариф |
|------|---------|-------|--------|-------|
| Студент | Лев Романов | `lev.romanov@student.ru` | `password123` | premium |
| Студент | Мария Смирнова | `maria.smirnova@student.ru` | `password123` | free |
| Студент | Алексей Козлов | `alexey.kozlov@student.ru` | `password123` | free |
| Студент | Дарья Волкова | `daria.volkova@student.ru` | `password123` | free |
| Студент | Тимур Галеев | `timur.galeev@student.ru` | `password123` | free |
| Студент | Полина Орлова | `polina.orlova@student.ru` | `password123` | free |
| Студент | Никита Соколов | `nikita.sokolov@student.ru` | `password123` | free |
| Студент | Анна Белова | `anna.belova@student.ru` | `password123` | free |
| Студент | Сергей Морозов | `sergey.morozov@student.ru` | `password123` | free |
| Студент | Елена Ким | `elena.kim@student.ru` | `password123` | free |
| Студент | Кирилл Егоров | `kirill.egorov@student.ru` | `password123` | free |
| Студент | София Громова | `sofia.gromova@student.ru` | `password123` | free |
| Компания | ДомУчет | `hr@domuchet.ru` | `password123` | free |
| Компания | СкладМаркет | `careers@skladmarket.ru` | `password123` | b2b |
| Админ | Модератор | `admin@platform.ru` | `password123` | free |

В текущем seed-наборе есть 2 компании, 3 вакансии и реалистичные отклики студентов без офферов; предзагруженных закладок и отзывов нет.

## Основные маршруты

### Публичные

- `/` — главная
- `/internships` — список вакансий в стартапах
- `/internships/:id` — карточка вакансии
- `/login` — вход
- `/register/student` — регистрация студента
- `/register/company` — регистрация компании

### Студент

- `/student/dashboard`
- `/student/recommendations`
- `/student/applications`
- `/student/bookmarks`
- `/student/profile`

### Компания

- `/company/dashboard`
- `/company/internships`
- `/company/internships/new`
- `/company/internships/:id/edit`
- `/company/internships/:id/applicants`
- `/company/applications`

### Админ

- `/admin/moderation`
- `/admin/applications`

## Структура `src`

```text
src/
├── components/   # UI и бизнес-компоненты
├── guards/       # RequireAuth / RequireRole
├── hooks/        # хелперы для Redux/Auth
├── pages/        # страницы по ролям
├── store/        # Redux store, RTK Query API, auth slice
├── types/        # общие TypeScript-типы
├── App.tsx       # роутинг
├── AppInit.tsx   # восстановление сессии
└── main.tsx      # точка входа
```

## Полезно для разработки

- Алиас `@` настроен на `src` в `frontend/vite.config.ts`.
- Если backend недоступен, авторизованные запросы и страницы с данными будут отдавать ошибки загрузки.
