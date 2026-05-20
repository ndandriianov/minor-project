# Деплой в продакшн

Универсальная схема: **Docker Compose + Caddy (TLS) + Postgres**. Работает на любом VPS с Docker.

## Быстрый старт

### 1. Купи VPS

Минимальные требования: 1 vCPU, 1 GB RAM, 10 GB диск, Ubuntu 22.04+.

Подойдёт любой из:
- **Reg.ru VPS** — от 200₽/мес, оплата картой РФ
- **Timeweb Cloud** — от 400₽/мес, удобная панель
- **Hetzner Cloud cx22** — €4.5/мес (~400₽), топ по цене/качеству, но нужна не-РФ карта
- **DigitalOcean** — от $6/мес

### 2. Подключи домен

В админке регистратора домена (reg.ru / r01 / namecheap):
- Создай **A-запись** `@` → IP твоего VPS
- Создай **A-запись** `www` → IP твоего VPS

Подожди 5-30 минут, пока DNS обновится. Проверь: `dig myapp.ru` должен показать IP.

### 3. Подними сервер

SSH на сервер. Поставь Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo apt install -y docker-compose-plugin
```

Склонируй репу:
```bash
git clone <твой-репо> minor-project
cd minor-project
```

### 4. Настрой `.env`

```bash
cp backend/.env.example backend/.env
nano backend/.env
```

Заполни **обязательно**:
```
JWT_SECRET=<сгенерируй: openssl rand -hex 32>
CORS_ORIGINS=https://myapp.ru
ALLOW_MOCK_PAYMENTS=0
DONATIONALERTS_USERNAME=<твой_username>
DONATIONALERTS_TOKEN=<твой_OAuth_token>
```

Создай также корневой `.env` (для compose):
```bash
cat > .env <<EOF
DOMAIN=myapp.ru
ACME_EMAIL=you@example.com
POSTGRES_PASSWORD=$(openssl rand -hex 16)
EOF
```

### 5. Запуск

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Caddy сам получит Let's Encrypt сертификат при первом обращении к домену. Проверь:

```bash
curl https://myapp.ru/api/health
```

Должно вернуть `{"status":"ok","db":true,...}`.

### 6. Применить миграции (если используешь Flask-Migrate)

```bash
docker compose -f docker-compose.prod.yml exec backend flask db upgrade
```

Если миграций ещё нет, init_db.py создаст таблицы автоматически через `db.create_all()`.

---

## Альтернатива: Railway (без сервера)

Если не хочется возиться с VPS:

1. Зарегайся на https://railway.app
2. **New Project** → **Deploy from GitHub repo** → выбери свой
3. Создай два сервиса:
   - **Backend**: root `backend/`, Railway сам определит Dockerfile
   - **Frontend**: root `frontend/`
4. Добавь **Postgres** plugin
5. Прокинь переменные окружения через UI (JWT_SECRET, CORS_ORIGINS, DONATIONALERTS_*, и т.д.)
6. В настройках backend-сервиса включи **Public Networking** → получишь публичный URL
7. Для домена: **Settings** → **Domains** → **Custom Domain** → впиши свой

Railway сам делает TLS, CI/CD из git push. Цена: $5 минимум, дальше по usage.

---

## Чек-лист безопасности перед запуском

- [ ] `JWT_SECRET` сгенерирован случайно (32+ символа)
- [ ] `CORS_ORIGINS` указывает на твой домен, не `*`
- [ ] `ALLOW_MOCK_PAYMENTS=0`
- [ ] `FLASK_ENV=production`
- [ ] `.env` **не закоммичен** в git (`.gitignore` это покрывает)
- [ ] `POSTGRES_PASSWORD` случайный, нигде не залогирован
- [ ] DNS A-запись указывает на твой VPS
- [ ] Файрвол открыт только на 22 (SSH), 80, 443
- [ ] HTTPS работает (`curl -I https://myapp.ru`)
- [ ] Бэкап Postgres: `pg_dump` в cron раз в день, либо managed Postgres
- [ ] Логи: посмотри `docker compose logs --tail 100 -f` после запуска

---

## Бэкапы

Простой ежедневный backup БД:

```bash
# /etc/cron.daily/backup-db
#!/bin/sh
DATE=$(date +%Y%m%d)
docker compose -f /root/minor-project/docker-compose.prod.yml exec -T postgres \
  pg_dump -U app internships | gzip > /var/backups/db-$DATE.sql.gz
find /var/backups/ -name "db-*.sql.gz" -mtime +14 -delete
```

```bash
chmod +x /etc/cron.daily/backup-db
```

Для облака — настрой автоматические snapshot'ы виртуалки в панели хостинга.

---

## Что делать после деплоя

1. Зайди на `https://myapp.ru/apidocs/` — Swagger UI работает?
2. `https://myapp.ru/api/health` → `db: true`, `donationalerts_configured: true`
3. Зарегайся реальным юзером, проверь регистрацию-логин
4. Прогони полный сценарий оплаты подписки через DonationAlerts
5. Включи мониторинг — хотя бы UptimeRobot бесплатный (пинг каждые 5 мин)

---

## Что НЕ деплоится автоматически

- **Картинки/логотипы компаний** — лежат в `backend_uploads` volume. Если переезжаешь сервер — копируй volume вручную.
- **Загруженные резюме** — там же.
- В долгой перспективе вынеси это в S3-совместимое хранилище (Selectel S3, Yandex Object Storage, AWS S3).
