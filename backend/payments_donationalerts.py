"""
Интеграция с DonationAlerts как платёжным шлюзом.

Идея:
1. На /checkout создаём Payment с уникальным коротким external_id (payment code).
2. Возвращаем фронту URL донат-страницы (https://www.donationalerts.com/r/<USERNAME>)
   и просим пользователя указать этот код в поле «Сообщение» при донате.
3. Фоновый поллер раз в минуту тянет последние донаты через DA API
   (GET /api/v1/alerts/donations, auth: Bearer <ACCESS_TOKEN>).
4. Для каждого нового доната ищем pending-payment, у которого external_id содержится
   в поле `message`. Если сумма доната >= суммы платежа — активируем подписку.

Конфигурация (env):
  DONATIONALERTS_USERNAME   — имя стримера (https://www.donationalerts.com/r/<USERNAME>)
  DONATIONALERTS_TOKEN      — Access Token (OAuth scope: oauth-donation-index)
  DONATIONALERTS_MIN_RUB    — минимальная сумма (для защиты от 1р доната, default = сумма платежа)
  DONATIONALERTS_POLL_SEC   — период опроса (default 60)
"""

import os
import logging
from datetime import datetime, timezone

import urllib.request
import urllib.parse
import json

log = logging.getLogger("donationalerts")

DA_API_URL = "https://www.donationalerts.com/api/v1/alerts/donations"
DA_USERNAME = os.environ.get("DONATIONALERTS_USERNAME", "")
DA_TOKEN = os.environ.get("DONATIONALERTS_TOKEN", "")
DA_POLL_SEC = int(os.environ.get("DONATIONALERTS_POLL_SEC", "60"))


def is_configured():
    return bool(DA_TOKEN and DA_USERNAME)


def donate_url():
    """Публичный URL донат-страницы стримера."""
    if not DA_USERNAME:
        return ""
    return f"https://www.donationalerts.com/r/{DA_USERNAME}"


def fetch_recent_donations(limit_pages=2):
    """Возвращает список последних донатов из DA API.
    Каждый элемент: dict с полями id, name, username, amount, currency, message, created_at."""
    if not DA_TOKEN:
        return []
    all_items = []
    try:
        url = DA_API_URL
        for _ in range(limit_pages):
            req = urllib.request.Request(
                url,
                headers={
                    "Authorization": f"Bearer {DA_TOKEN}",
                    "Accept": "application/json",
                },
            )
            with urllib.request.urlopen(req, timeout=10) as r:
                payload = json.loads(r.read().decode("utf-8"))
            data = payload.get("data", []) or []
            all_items.extend(data)
            links = payload.get("links", {}) or {}
            next_url = links.get("next")
            if not next_url:
                break
            url = next_url
    except Exception as e:
        log.warning("DonationAlerts fetch failed: %s", e)
    return all_items


def match_and_apply(db, Payment, User, Subscription, Notification, B2B_POSTING_LIMIT,
                    activate_subscription_fn):
    """Сверяет последние донаты с pending-платежами. Возвращает число активированных."""
    if not is_configured():
        return 0

    donations = fetch_recent_donations()
    if not donations:
        return 0

    activated = 0

    # Берём только pending-платежи DonationAlerts
    pending = Payment.query.filter_by(status="pending", provider="donationalerts").all()
    if not pending:
        return 0

    # Карта external_id (короткий код) → Payment
    code_map = {p.external_id: p for p in pending if p.external_id}

    # Защита от повторов: уже использованные donation_id
    used_ids = {p.da_donation_id for p in Payment.query
                .filter(Payment.da_donation_id.isnot(None)).all()}

    for d in donations:
        d_id = d.get("id")
        if not d_id or d_id in used_ids:
            continue
        message = (d.get("message") or "").strip()
        if not message:
            continue
        amount = float(d.get("amount") or 0)
        currency = (d.get("currency") or "").upper()

        # ищем код платежа в сообщении (без учёта регистра)
        matched_payment = None
        msg_norm = message.lower()
        for code, p in code_map.items():
            if code.lower() in msg_norm:
                matched_payment = p
                break
        if not matched_payment:
            continue

        # Принимаем только RUB и сумму не меньше требуемой
        if currency and currency != "RUB":
            log.info("DA donation %s currency %s ignored", d_id, currency)
            continue
        if amount < matched_payment.amount:
            log.info("DA donation %s underpaid: %s < %s",
                     d_id, amount, matched_payment.amount)
            continue

        matched_payment.status = "paid"
        matched_payment.paid_at = datetime.now(timezone.utc)
        matched_payment.da_donation_id = d_id
        matched_payment.da_amount = int(amount)
        matched_payment.da_currency = currency or "RUB"

        activate_subscription_fn(matched_payment)
        activated += 1

    if activated:
        db.session.commit()
    return activated
