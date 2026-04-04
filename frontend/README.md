# Фронтенд — Платформа стажировок для студентов

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

## Основные маршруты

### Публичные

- `/` — главная
- `/internships` — список стажировок
- `/internships/:id` — карточка стажировки
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

