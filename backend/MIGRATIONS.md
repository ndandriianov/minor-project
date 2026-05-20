# Миграции базы данных (Flask-Migrate / Alembic)

## Первичная инициализация (один раз)

```bash
cd backend
export FLASK_APP=app.py
export DATABASE_URL=postgresql+psycopg2://app:app@localhost:5432/internships

flask db init             # создаёт папку migrations/
flask db migrate -m "init"
flask db upgrade
```

## После любого изменения моделей

```bash
flask db migrate -m "описание изменения"
flask db upgrade
```

## Применить миграции в Docker

В Dockerfile/entrypoint можно заменить `python init_db.py` на:

```bash
flask db upgrade || python init_db.py
```

Тогда при первом запуске накатятся миграции, а при их отсутствии — соберётся схема через `db.create_all()`.

## Текущий режим

По умолчанию используется `db.create_all()` из `init_db.py` (быстро, без миграций) —
этого достаточно для прототипа/MVP. Миграции нужны, как только проект едет в продакшн
и схема перестаёт обновляться путём пересоздания базы.
