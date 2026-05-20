"""
Бэкенд платформы стажировок (Стадия 3).
Flask + SQLAlchemy + JWT + Swagger + Flask-Migrate + APScheduler.
"""

import os
import re
import uuid
import mimetypes
from datetime import timedelta, datetime, timezone, date
from functools import wraps

try:
    from dotenv import load_dotenv
    # Only loads from .env if env vars are not already set (Docker sets them via env_file)
    load_dotenv(override=False)
except ImportError:
    pass

from flask import Flask, request, jsonify, redirect, send_from_directory, abort
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
)
from flasgger import Swagger
from werkzeug.utils import secure_filename

from models import (
    db, User, Student, Company, Internship,
    Application, Bookmark, Skill,
    University, Faculty, City,
    Article, NewsPost, Notification, Review,
    Subscription, Payment,
)

try:
    from flask_migrate import Migrate
    HAS_MIGRATE = True
except ImportError:
    HAS_MIGRATE = False

try:
    from apscheduler.schedulers.background import BackgroundScheduler
    HAS_SCHEDULER = True
except ImportError:
    HAS_SCHEDULER = False

try:
    from flask_limiter import Limiter
    from flask_limiter.util import get_remote_address
    HAS_LIMITER = True
except ImportError:
    HAS_LIMITER = False

try:
    from flask_mail import Mail, Message
    HAS_MAIL = True
except ImportError:
    HAS_MAIL = False

import payments_donationalerts as da_pay


def get_app_port() -> int:
    raw_port = os.environ.get("APP_PORT") or os.environ.get("PORT") or "5051"
    try:
        port = int(raw_port)
        if not 1 <= port <= 65535:
            raise ValueError
        return port
    except (TypeError, ValueError):
        return 5051


# ═══════════════════════════════════════════════════════
#  Конфигурация
# ═══════════════════════════════════════════════════════

app = Flask(__name__)
app.config.update(
    SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL", "sqlite:///internships.db"),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    JWT_SECRET_KEY=os.environ.get("JWT_SECRET", "dev-secret-change-in-production-32"),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=2),
    JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=30),
    MAX_CONTENT_LENGTH=10 * 1024 * 1024,
    UPLOAD_FOLDER=os.path.join(os.path.dirname(__file__), "uploads"),
    APP_PORT=get_app_port(),
)

_cors_origins_env = os.environ.get("CORS_ORIGINS", "*")
if _cors_origins_env.strip() == "*":
    _cors_origins = "*"
else:
    _cors_origins = [o.strip() for o in _cors_origins_env.split(",") if o.strip()]
CORS(app, resources={r"/api/*": {"origins": _cors_origins}})

db.init_app(app)
jwt = JWTManager(app)

if HAS_MIGRATE:
    migrate = Migrate(app, db)

# ─── Rate limiter ───
if HAS_LIMITER:
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=["1000 per hour"],
        storage_uri=os.environ.get("RATELIMIT_STORAGE", "memory://"),
    )
else:
    class _NoopLimiter:
        def limit(self, *a, **kw):
            def deco(fn):
                return fn
            return deco
    limiter = _NoopLimiter()

# ─── Flask-Mail (optional, при наличии SMTP env) ───
mail = None
if HAS_MAIL and os.environ.get("MAIL_SERVER"):
    app.config.update(
        MAIL_SERVER=os.environ.get("MAIL_SERVER"),
        MAIL_PORT=int(os.environ.get("MAIL_PORT", "587")),
        MAIL_USE_TLS=os.environ.get("MAIL_USE_TLS", "1") == "1",
        MAIL_USERNAME=os.environ.get("MAIL_USERNAME", ""),
        MAIL_PASSWORD=os.environ.get("MAIL_PASSWORD", ""),
        MAIL_DEFAULT_SENDER=os.environ.get("MAIL_DEFAULT_SENDER", "no-reply@platform.ru"),
    )
    mail = Mail(app)

# ─── Production checks ───
if (os.environ.get("FLASK_ENV") == "production"
        and app.config["JWT_SECRET_KEY"] == "dev-secret-change-in-production-32"):
    raise RuntimeError("В production обязательно задайте JWT_SECRET")

swagger_config = {
    "headers": [],
    "specs": [{
        "endpoint": "apispec",
        "route": "/apispec.json",
        "rule_filter": lambda rule: True,
        "model_filter": lambda tag: True,
    }],
    "static_url_path": "/flasgger_static",
    "swagger_ui": False,           # отключаем встроенный UI Flasgger (он глючит)
    "specs_route": "/_apidocs_internal/",
}

swagger_template = {
    "info": {
        "title": "Платформа стажировок — API",
        "description": (
            "REST API агрегатора стажировок.\n\n"
            "**Тестовые аккаунты:**\n"
            "- Студент: `ivan@student.ru` / `password123`\n"
            "- Компания: `hr@yandex.ru` / `password123`\n"
            "- Админ: `admin@platform.ru` / `password123`"
        ),
        "version": "3.0.0",
    },
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey", "name": "Authorization", "in": "header",
            "description": "JWT токен. Формат: **Bearer &lt;access_token&gt;**",
        }
    },
    "security": [{"Bearer": []}],
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


# ─── Авто-фикс apispec.json: добавляем `responses: {200: ok}` всем операциям,
#     у которых его нет, иначе Swagger UI 5 не рендерит блок Server response. ───

@app.after_request
def _inject_default_responses(response):
    if request.path != "/apispec.json":
        return response
    if not (response.content_type and "json" in response.content_type):
        return response
    try:
        import json as _json
        spec = _json.loads(response.get_data(as_text=True))
        changed = False
        for _path, _ops in (spec.get("paths") or {}).items():
            for _method, _op in (_ops or {}).items():
                if isinstance(_op, dict) and not _op.get("responses"):
                    _op["responses"] = {"200": {"description": "OK"}}
                    changed = True
        if changed:
            body = _json.dumps(spec, ensure_ascii=False)
            response.set_data(body)
            response.headers["Content-Length"] = str(len(body.encode("utf-8")))
    except Exception:
        pass
    return response


# ─── Подменяем /apidocs/ на современный Swagger UI с CDN ───
# Flasgger 0.9.7 + новый Chrome неадекватно рендерит ответы. Используем апстрим Swagger UI.

_SWAGGER_UI_HTML = """<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>API — Платформа стажировок</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css">
  <style>body { margin: 0; }</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: "/apispec.json",
      dom_id: "#swagger-ui",
      deepLinking: true,
      persistAuthorization: true,
      tryItOutEnabled: true,
      defaultModelsExpandDepth: -1,
    });
  </script>
</body>
</html>
"""


@app.route("/apidocs/", endpoint="custom_apidocs")
def custom_apidocs():
    return _SWAGGER_UI_HTML


@app.route("/apidocs", endpoint="custom_apidocs_no_slash")
def custom_apidocs_no_slash():
    return redirect("/apidocs/")


# ═══════════════════════════════════════════════════════
#  Тарифы
# ═══════════════════════════════════════════════════════

PLAN_PRICES = {
    "premium": {"amount": 499, "period_days": 30},
    "b2b": {"amount": 9900, "period_days": 30},
}
B2B_POSTING_LIMIT = 100
FREE_POSTING_LIMIT = 3


# ═══════════════════════════════════════════════════════
#  Декораторы и хелперы
# ═══════════════════════════════════════════════════════

def role_required(role):
    allowed_roles = {role} if isinstance(role, str) else set(role)

    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = db.session.get(User, int(get_jwt_identity()))
            if not user or user.role not in allowed_roles:
                return jsonify({"error": "Доступ запрещён"}), 403
            return fn(user, *args, **kwargs)
        return wrapper
    return decorator


def premium_required(fn):
    """Требует активной premium или b2b подписки."""
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = db.session.get(User, int(get_jwt_identity()))
        if not user:
            return jsonify({"error": "Не авторизован"}), 401
        if not user.has_active_premium():
            return jsonify({
                "error": "Требуется премиум-подписка",
                "upgrade_url": "/api/subscriptions/checkout",
            }), 402
        return fn(user, *args, **kwargs)
    return wrapper


def b2b_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        user = db.session.get(User, int(get_jwt_identity()))
        if not user or user.role != "company":
            return jsonify({"error": "Только для компаний"}), 403
        if not user.has_active_b2b():
            return jsonify({
                "error": "Требуется B2B-подписка",
                "upgrade_url": "/api/subscriptions/checkout",
            }), 402
        return fn(user, *args, **kwargs)
    return wrapper


# ─── Валидаторы ───

EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
WORK_FORMATS = {"office", "hybrid", "remote", "any"}
DESIRED_HOURS = {"40", "20-40", "<20", "any"}
EXPERIENCE = {"none", "<1year", "1-3years"}
MODERATION_STATUS = {"pending", "published", "rejected", "archived"}
APPLICATION_STATUS = {"applied", "interview", "offer", "rejected", "withdrawn"}


def validation_error(msg):
    return jsonify({"error": msg}), 400


def require_fields(data, fields):
    missing = [f for f in fields if data.get(f) in (None, "", [])]
    if missing:
        return f"Отсутствуют поля: {', '.join(missing)}"
    return None


def validate_enum(value, allowed, field):
    if value is not None and value not in allowed:
        return f"Недопустимое значение {field}: {value}. Допустимо: {', '.join(sorted(allowed))}"
    return None


def validate_email(email):
    if not email or not EMAIL_RE.match(email):
        return "Некорректный email"
    return None


def validate_length(value, field, max_len):
    if value is not None and isinstance(value, str) and len(value) > max_len:
        return f"Поле {field} слишком длинное (макс. {max_len})"
    return None


def get_or_create_skills(skill_names):
    skills = []
    for name in skill_names:
        name = name.strip()
        if not name:
            continue
        skill = Skill.query.filter(Skill.name.ilike(name)).first()
        if not skill:
            skill = Skill(name=name)
            db.session.add(skill)
        skills.append(skill)
    db.session.flush()
    return skills


def paginate_query(query, serializer=None):
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    items = pagination.items
    if serializer:
        serialized = [serializer(i) for i in items]
    else:
        serialized = [i.to_dict() for i in items]
    return {
        "items": serialized,
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
    }


def serialize_application(app_item, include_student=False, include_internship=False):
    data = app_item.to_dict()
    if include_student and app_item.student:
        data["student"] = app_item.student.to_dict(extended=True)
    if include_internship and app_item.internship:
        data["internship"] = app_item.internship.to_dict()
    return data


def notify(user_id, text, type_="info", application_id=None, internship_id=None):
    n = Notification(
        user_id=user_id, text=text, type=type_,
        application_id=application_id, internship_id=internship_id,
    )
    db.session.add(n)
    return n


# ═══════════════════════════════════════════════════════
#  Корень
# ═══════════════════════════════════════════════════════

@app.route("/")
def index():
    return redirect("/apidocs/")


# ═══════════════════════════════════════════════════════
#  AUTH
# ═══════════════════════════════════════════════════════

@app.route("/api/auth/register/student", methods=["POST"])
@limiter.limit("10 per hour")
def register_student():
    """Регистрация студента.
    ---
    tags: [1. Авторизация]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [email, password, first_name, last_name, university, course, city]
          properties:
            email: {type: string, example: newstudent@mail.ru}
            password: {type: string, example: password123}
            first_name: {type: string, example: Анна}
            last_name: {type: string, example: Иванова}
            patronymic: {type: string, example: Сергеевна}
            university: {type: string, example: НИУ ВШЭ}
            faculty: {type: string, example: Факультет компьютерных наук}
            course: {type: integer, example: 2}
            speciality: {type: string, example: Программная инженерия}
            city: {type: string, example: Москва}
            work_format:
              type: string
              enum: [office, hybrid, remote, any]
              example: hybrid
            desired_hours:
              type: string
              enum: ["40", "20-40", "<20", "any"]
              example: "20-40"
    responses:
      201: {description: Зарегистрирован}
      400: {description: Невалидные данные}
      409: {description: Email уже занят}
    """
    data = request.get_json() or {}
    err = require_fields(data, ["email", "password", "first_name", "last_name", "university", "course", "city"])
    if err:
        return validation_error(err)
    if (e := validate_email(data["email"])):
        return validation_error(e)
    if len(data["password"]) < 6:
        return validation_error("Пароль должен быть от 6 символов")
    if (e := validate_enum(data.get("work_format", "any"), WORK_FORMATS, "work_format")):
        return validation_error(e)
    if (e := validate_enum(data.get("desired_hours", "any"), DESIRED_HOURS, "desired_hours")):
        return validation_error(e)
    try:
        course = int(data["course"])
        if not 1 <= course <= 6:
            raise ValueError
    except (TypeError, ValueError):
        return validation_error("course должен быть числом 1..6")

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Пользователь с таким email уже существует"}), 409

    user = User(email=data["email"], role="student")
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    student = Student(
        user_id=user.id,
        first_name=data["first_name"], last_name=data["last_name"],
        patronymic=data.get("patronymic", ""),
        university=data["university"], faculty=data.get("faculty", ""),
        course=course, speciality=data.get("speciality", ""),
        city=data["city"],
        work_format=data.get("work_format", "any"),
        desired_hours=data.get("desired_hours", "any"),
    )
    db.session.add(student)
    db.session.add(Subscription(user_id=user.id, plan="free", status="active"))
    db.session.commit()

    token = create_access_token(identity=str(user.id), additional_claims={"role": "student"})
    refresh = create_refresh_token(identity=str(user.id), additional_claims={"role": "student"})
    return jsonify({
        "user": user.to_dict(), "student": student.to_dict(),
        "access_token": token, "refresh_token": refresh,
    }), 201


@app.route("/api/auth/register/company", methods=["POST"])
@limiter.limit("10 per hour")
def register_company():
    """Регистрация компании.
    ---
    tags: [1. Авторизация]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [email, password, name]
          properties:
            email: {type: string, example: hr@newcompany.ru}
            password: {type: string, example: password123}
            name: {type: string, example: Новая Компания}
            description: {type: string, example: Описание}
            website: {type: string, example: https://newcompany.ru}
            city: {type: string, example: Москва}
    responses:
      201: {description: Зарегистрирована}
      400: {description: Невалидные данные}
      409: {description: Email уже занят}
    """
    data = request.get_json() or {}
    err = require_fields(data, ["email", "password", "name"])
    if err:
        return validation_error(err)
    if (e := validate_email(data["email"])):
        return validation_error(e)
    if len(data["password"]) < 6:
        return validation_error("Пароль должен быть от 6 символов")

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Пользователь с таким email уже существует"}), 409

    user = User(email=data["email"], role="company")
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    company = Company(
        user_id=user.id, name=data["name"],
        description=data.get("description", ""), website=data.get("website", ""),
        city=data.get("city", ""), posting_limit=FREE_POSTING_LIMIT,
    )
    db.session.add(company)
    db.session.add(Subscription(user_id=user.id, plan="free", status="active"))
    db.session.commit()

    token = create_access_token(identity=str(user.id), additional_claims={"role": "company"})
    refresh = create_refresh_token(identity=str(user.id), additional_claims={"role": "company"})
    return jsonify({
        "user": user.to_dict(), "company": company.to_dict(),
        "access_token": token, "refresh_token": refresh,
    }), 201


@app.route("/api/auth/login", methods=["POST"])
@limiter.limit("20 per minute")
def login():
    """Вход (получение JWT).
    ---
    tags: [1. Авторизация]
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [email, password]
          properties:
            email:
              type: string
              example: ivan@student.ru
            password:
              type: string
              example: password123
    responses:
      200:
        description: access_token + refresh_token + профиль
      401:
        description: Неверный email или пароль
    """
    data = request.get_json() or {}
    user = User.query.filter_by(email=data.get("email")).first()
    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"error": "Неверный email или пароль"}), 401

    token = create_access_token(identity=str(user.id), additional_claims={"role": user.role})
    refresh = create_refresh_token(identity=str(user.id), additional_claims={"role": user.role})
    result = {"user": user.to_dict(), "access_token": token, "refresh_token": refresh}
    if user.role == "student" and user.student:
        result["student"] = user.student.to_dict(extended=True)
    elif user.role == "company" and user.company:
        result["company"] = user.company.to_dict()
    if user.subscription:
        result["subscription"] = user.subscription.to_dict()
    return jsonify(result), 200


@app.route("/api/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    """Обновление access-токена. В Authorize передайте Bearer <refresh_token>.
    ---
    tags: [1. Авторизация]
    security:
      - Bearer: []
    responses:
      200: {description: Новый access_token}
      422: {description: refresh_token не передан или невалиден}
    """
    uid = str(get_jwt_identity())
    claims = get_jwt()
    token = create_access_token(identity=uid, additional_claims={"role": claims.get("role")})
    return jsonify({"access_token": token}), 200


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def get_me():
    """Текущий пользователь.
    ---
    tags: [1. Авторизация]
    security:
      - Bearer: []
    responses:
      200:
        description: Профиль пользователя (+ student/company/subscription)
      401:
        description: Не авторизован
    """
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404
    result = {"user": user.to_dict()}
    if user.role == "student" and user.student:
        result["student"] = user.student.to_dict(extended=True)
    elif user.role == "company" and user.company:
        result["company"] = user.company.to_dict()
    if user.subscription:
        result["subscription"] = user.subscription.to_dict()
    return jsonify(result), 200


# ═══════════════════════════════════════════════════════
#  STUDENT
# ═══════════════════════════════════════════════════════

@app.route("/api/students/profile", methods=["PUT"])
@role_required("student")
def update_student_profile(user):
    """Обновление профиля студента.
    ---
    tags: [2. Студент]
    """
    data = request.get_json() or {}
    student = user.student

    if (e := validate_enum(data.get("work_format"), WORK_FORMATS, "work_format")):
        return validation_error(e)
    if (e := validate_enum(data.get("desired_hours"), DESIRED_HOURS, "desired_hours")):
        return validation_error(e)
    if "course" in data:
        try:
            c = int(data["course"])
            if not 1 <= c <= 6:
                raise ValueError
            data["course"] = c
        except (TypeError, ValueError):
            return validation_error("course должен быть числом 1..6")

    simple_fields = [
        "first_name", "last_name", "patronymic", "university", "faculty",
        "course", "speciality", "city", "work_format", "desired_hours",
        "bio", "portfolio_url", "github_url", "experience", "certificates",
    ]
    for field in simple_fields:
        if field in data:
            setattr(student, field, data[field])

    if "skills" in data:
        if not isinstance(data["skills"], list):
            return validation_error("skills должен быть массивом строк")
        student.skills = get_or_create_skills(data["skills"])

    db.session.commit()
    return jsonify({"student": student.to_dict(extended=True)}), 200


@app.route("/api/students/<int:student_id>", methods=["GET"])
@jwt_required()
def get_student_profile(student_id):
    """Просмотр профиля студента.
    ---
    tags: [2. Студент]
    """
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Студент не найден"}), 404
    user = db.session.get(User, int(get_jwt_identity()))
    show_extended = (user.role in ("company", "admin")) or (user.student and user.student.id == student_id)
    return jsonify({"student": student.to_dict(extended=show_extended)}), 200


# ─── Загрузка резюме ───

PDF_MIME_TYPES = {"application/pdf", "application/x-pdf"}


@app.route("/api/students/resume", methods=["POST"])
@role_required("student")
def upload_resume(user):
    """Загрузка резюме (PDF).
    ---
    tags: [2. Студент]
    consumes: [multipart/form-data]
    parameters:
      - name: file
        in: formData
        type: file
        required: true
    """
    if "file" not in request.files:
        return validation_error("Файл не прикреплён")
    file = request.files["file"]
    if not file.filename:
        return validation_error("Пустое имя файла")

    if not file.filename.lower().endswith(".pdf"):
        return validation_error("Допускается только PDF")

    mime = (file.mimetype or "").lower()
    if mime and mime not in PDF_MIME_TYPES:
        # дополнительная проверка по сигнатуре
        head = file.stream.read(4)
        file.stream.seek(0)
        if head != b"%PDF":
            return validation_error("Файл не является PDF (MIME-проверка не прошла)")

    safe = secure_filename(file.filename)
    unique = f"resume_{user.id}_{uuid.uuid4().hex[:8]}_{safe}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique)
    file.save(filepath)

    user.student.resume_filename = unique
    db.session.commit()
    return jsonify({"message": "Резюме загружено", "filename": unique}), 200


@app.route("/api/students/<int:student_id>/resume", methods=["GET"])
@jwt_required()
def download_resume(student_id):
    """Скачать резюме (компания или сам студент).
    ---
    tags: [2. Студент]
    """
    student = db.session.get(Student, student_id)
    if not student or not student.resume_filename:
        return jsonify({"error": "Резюме не найдено"}), 404
    user = db.session.get(User, int(get_jwt_identity()))
    if not (user.role in ("company", "admin") or (user.student and user.student.id == student_id)):
        return jsonify({"error": "Доступ запрещён"}), 403
    return send_from_directory(app.config["UPLOAD_FOLDER"], student.resume_filename, as_attachment=True)


@app.route("/api/students/resume", methods=["DELETE"])
@role_required("student")
def delete_resume(user):
    """Удалить своё резюме.
    ---
    tags: [2. Студент]
    security:
      - Bearer: []
    responses:
      200: {description: Резюме удалено}
      404: {description: Резюме не найдено}
    """
    student = user.student
    if not student or not student.resume_filename:
        return jsonify({"error": "Резюме не найдено"}), 404
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], student.resume_filename)
    if os.path.exists(filepath):
        os.remove(filepath)
    student.resume_filename = ""
    db.session.commit()
    return jsonify({"message": "Резюме удалено"}), 200


# ─── Логотип компании ───

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".svg"}
IMAGE_MIME_PREFIXES = ("image/",)


@app.route("/api/companies/logo", methods=["POST"])
@role_required("company")
def upload_logo(user):
    """Загрузка логотипа компании.
    ---
    tags: [4. Компания]
    consumes: [multipart/form-data]
    """
    if "file" not in request.files:
        return validation_error("Файл не прикреплён")
    file = request.files["file"]
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in IMAGE_EXTS:
        return validation_error(f"Допустимые форматы: {', '.join(IMAGE_EXTS)}")
    mime = (file.mimetype or "").lower()
    if mime and not mime.startswith(IMAGE_MIME_PREFIXES):
        return validation_error("Файл не является изображением")

    safe = secure_filename(file.filename)
    unique = f"logo_{user.company.id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], unique)
    file.save(filepath)

    user.company.logo_url = f"/uploads/{unique}"
    db.session.commit()
    return jsonify({"company": user.company.to_dict()}), 200


# ═══════════════════════════════════════════════════════
#  INTERNSHIPS
# ═══════════════════════════════════════════════════════

@app.route("/api/internships", methods=["GET"])
def list_internships():
    """Лента стажировок с фильтрацией.
    ---
    tags: [3. Стажировки]
    """
    query = Internship.query.filter_by(moderation_status="published")

    if city := request.args.get("city"):
        query = query.filter(Internship.city.ilike(f"%{city}%"))
    if direction := request.args.get("direction"):
        query = query.filter(Internship.direction.ilike(f"%{direction}%"))
    if wf := request.args.get("work_format"):
        if (e := validate_enum(wf, WORK_FORMATS, "work_format")):
            return validation_error(e)
        query = query.filter(Internship.work_format == wf)
    if exp := request.args.get("required_experience"):
        if (e := validate_enum(exp, EXPERIENCE, "required_experience")):
            return validation_error(e)
        query = query.filter(Internship.required_experience == exp)
    if request.args.get("compatible_with_study", "").lower() == "true":
        query = query.filter(Internship.compatible_with_study == True)
    if min_sal := request.args.get("min_salary", type=int):
        query = query.filter(Internship.salary_max >= min_sal)
    if max_h := request.args.get("max_hours", type=int):
        query = query.filter(Internship.min_hours <= max_h)
    if search := request.args.get("search"):
        pattern = f"%{search}%"
        query = query.filter(
            db.or_(Internship.title.ilike(pattern), Internship.description.ilike(pattern))
        )

    sort = request.args.get("sort", "newest")
    # Промо-вакансии всегда сверху
    if sort == "salary_desc":
        query = query.order_by(Internship.is_promoted.desc(), Internship.salary_max.desc())
    elif sort == "deadline":
        query = query.order_by(Internship.is_promoted.desc(), Internship.deadline.asc().nullslast())
    else:
        query = query.order_by(Internship.is_promoted.desc(), Internship.created_at.desc())

    return jsonify(paginate_query(query)), 200


@app.route("/api/internships/<int:internship_id>", methods=["GET"])
def get_internship(internship_id):
    """Карточка стажировки (увеличивает счётчик просмотров).
    ---
    tags: [3. Стажировки]
    """
    internship = db.session.get(Internship, internship_id)
    if not internship:
        return jsonify({"error": "Стажировка не найдена"}), 404
    internship.views_count = (internship.views_count or 0) + 1
    db.session.commit()
    return jsonify({"internship": internship.to_dict()}), 200


@app.route("/api/internships/recommendations", methods=["GET"])
@role_required("student")
def get_recommendations(user):
    """Базовые рекомендации (доступны всем студентам).
    ---
    tags: [3. Стажировки]
    """
    return jsonify({"recommendations": _compute_recommendations(user.student, basic=True)}), 200


@app.route("/api/internships/recommendations/advanced", methods=["GET"])
@premium_required
def get_recommendations_advanced(user):
    """Продвинутый подбор по навыкам (PREMIUM).
    ---
    tags: [9. Premium / B2B]
    """
    if user.role != "student" or not user.student:
        return jsonify({"error": "Только для студентов"}), 403
    return jsonify({"recommendations": _compute_recommendations(user.student, basic=False)}), 200


def _compute_recommendations(student, basic=True):
    student_skill_ids = {s.id for s in student.skills}
    internships = Internship.query.filter_by(moderation_status="published").all()
    scored = []
    for internship in internships:
        score = 0
        reasons = []
        if student.city and internship.city:
            if student.city.lower() == internship.city.lower():
                score += 20
                reasons.append("город")
            elif internship.work_format == "remote":
                score += 15
                reasons.append("удалёнка")
        if student.work_format != "any" and internship.work_format == student.work_format:
            score += 15
            reasons.append("формат работы")
        if internship.compatible_with_study:
            score += 15
            reasons.append("совместимо с учёбой")
        internship_skill_ids = {s.id for s in internship.required_skills}
        if student_skill_ids and internship_skill_ids:
            overlap = student_skill_ids & internship_skill_ids
            if overlap:
                weight = 30 if basic else 50
                skill_score = int(weight * len(overlap) / len(internship_skill_ids))
                score += skill_score
                reasons.append(f"навыки ({len(overlap)}/{len(internship_skill_ids)})")
        if student.desired_hours != "any":
            if student.desired_hours == "<20" and internship.min_hours < 20:
                score += 10
                reasons.append("занятость")
            elif student.desired_hours == "20-40" and internship.min_hours <= 40:
                score += 10
                reasons.append("занятость")
        if student.speciality and internship.direction:
            if student.speciality.lower() in internship.direction.lower() or \
               internship.direction.lower() in student.speciality.lower():
                score += 20
                reasons.append("специальность")
        if score > 0:
            scored.append({
                "internship": internship.to_dict(),
                "match_score": min(score, 100),
                "match_reasons": reasons,
            })
    scored.sort(key=lambda x: x["match_score"], reverse=True)
    limit = 10 if basic else 25
    return scored[:limit]


# ═══════════════════════════════════════════════════════
#  COMPANY — CRUD
# ═══════════════════════════════════════════════════════

@app.route("/api/company/internships", methods=["POST"])
@role_required("company")
def create_internship(user):
    """Создать стажировку (учитывает лимит размещения).
    ---
    tags: [4. Компания]
    """
    data = request.get_json() or {}
    err = require_fields(data, ["title", "direction", "description", "work_format"])
    if err:
        return validation_error(err)
    if (e := validate_enum(data["work_format"], WORK_FORMATS - {"any"}, "work_format")):
        return validation_error(e)
    if (e := validate_enum(data.get("required_experience", "none"), EXPERIENCE, "required_experience")):
        return validation_error(e)
    if (e := validate_length(data["title"], "title", 255)):
        return validation_error(e)

    # Проверка лимита размещений
    company = user.company
    active = Internship.query.filter(
        Internship.company_id == company.id,
        Internship.moderation_status.in_(["pending", "published"]),
    ).count()
    limit = B2B_POSTING_LIMIT if user.has_active_b2b() else (company.posting_limit or FREE_POSTING_LIMIT)
    if active >= limit:
        return jsonify({
            "error": f"Достигнут лимит активных вакансий ({limit}). Подключите B2B-подписку для расширения.",
            "upgrade_url": "/api/subscriptions/checkout",
        }), 402

    deadline = None
    if data.get("deadline"):
        try:
            deadline = date.fromisoformat(data["deadline"])
        except ValueError:
            return validation_error("deadline должен быть в формате YYYY-MM-DD")

    internship = Internship(
        company_id=company.id,
        title=data["title"], direction=data["direction"],
        description=data["description"], requirements=data.get("requirements", ""),
        selection_stages=data.get("selection_stages", ""),
        work_format=data["work_format"], schedule=data.get("schedule", ""),
        min_hours=int(data.get("min_hours", 0)), max_hours=int(data.get("max_hours", 40)),
        compatible_with_study=bool(data.get("compatible_with_study", False)),
        salary_min=int(data.get("salary_min", 0)), salary_max=int(data.get("salary_max", 0)),
        is_paid=bool(data.get("is_paid", True)),
        city=data.get("city", company.city),
        counts_as_practice=bool(data.get("counts_as_practice", False)),
        required_experience=data.get("required_experience", "none"),
        deadline=deadline,
        moderation_status="pending",
        last_confirmed_at=datetime.now(timezone.utc),
    )
    if data.get("skills"):
        internship.required_skills = get_or_create_skills(data["skills"])

    db.session.add(internship)
    db.session.commit()
    return jsonify({"internship": internship.to_dict()}), 201


@app.route("/api/company/internships", methods=["GET"])
@role_required("company")
def list_company_internships(user):
    """Мои вакансии.
    ---
    tags: [4. Компания]
    """
    query = Internship.query.filter_by(company_id=user.company.id)\
        .order_by(Internship.created_at.desc())
    return jsonify(paginate_query(query)), 200


@app.route("/api/company/internships/<int:internship_id>", methods=["PUT"])
@role_required("company")
def update_internship(user, internship_id):
    """Редактировать стажировку.
    ---
    tags: [4. Компания]
    """
    internship = db.session.get(Internship, internship_id)
    if not internship or internship.company_id != user.company.id:
        return jsonify({"error": "Стажировка не найдена"}), 404
    data = request.get_json() or {}
    if (e := validate_enum(data.get("work_format"), WORK_FORMATS - {"any"}, "work_format")):
        return validation_error(e)
    if (e := validate_enum(data.get("required_experience"), EXPERIENCE, "required_experience")):
        return validation_error(e)

    updatable = [
        "title", "direction", "description", "requirements", "selection_stages",
        "work_format", "schedule", "min_hours", "max_hours", "compatible_with_study",
        "salary_min", "salary_max", "is_paid", "city", "counts_as_practice",
        "required_experience",
    ]
    for field in updatable:
        if field in data:
            setattr(internship, field, data[field])
    if "deadline" in data:
        try:
            internship.deadline = date.fromisoformat(data["deadline"]) if data["deadline"] else None
        except ValueError:
            return validation_error("deadline должен быть в формате YYYY-MM-DD")
    if "skills" in data:
        internship.required_skills = get_or_create_skills(data["skills"])

    db.session.commit()
    return jsonify({"internship": internship.to_dict()}), 200


@app.route("/api/company/internships/<int:internship_id>", methods=["DELETE"])
@role_required("company")
def delete_internship(user, internship_id):
    """Удалить стажировку.
    ---
    tags: [4. Компания]
    """
    internship = db.session.get(Internship, internship_id)
    if not internship or internship.company_id != user.company.id:
        return jsonify({"error": "Стажировка не найдена"}), 404
    db.session.delete(internship)
    db.session.commit()
    return jsonify({"message": "Стажировка удалена"}), 200


@app.route("/api/company/internships/<int:internship_id>/confirm", methods=["POST"])
@role_required("company")
def confirm_internship(user, internship_id):
    """Подтвердить актуальность вакансии (сбрасывает таймер 2 недели).
    ---
    tags: [4. Компания]
    """
    internship = db.session.get(Internship, internship_id)
    if not internship or internship.company_id != user.company.id:
        return jsonify({"error": "Стажировка не найдена"}), 404
    internship.last_confirmed_at = datetime.now(timezone.utc)
    if internship.moderation_status == "archived":
        internship.moderation_status = "published"
    db.session.commit()
    return jsonify({"internship": internship.to_dict()}), 200


@app.route("/api/company/internships/<int:internship_id>/promote", methods=["POST"])
@b2b_required
def promote_internship(user, internship_id):
    """Поднять вакансию в топ выдачи (B2B).
    ---
    tags: [9. Premium / B2B]
    security:
      - Bearer: []
    parameters:
      - name: internship_id
        in: path
        type: integer
        required: true
        example: 1
      - in: body
        name: body
        required: false
        schema:
          type: object
          properties:
            days: {type: integer, example: 7, default: 7}
    """
    internship = db.session.get(Internship, internship_id)
    if not internship or internship.company_id != user.company.id:
        return jsonify({"error": "Стажировка не найдена"}), 404
    days = int(request.get_json().get("days", 7)) if request.is_json else 7
    internship.is_promoted = True
    internship.promoted_until = datetime.now(timezone.utc) + timedelta(days=days)
    db.session.commit()
    return jsonify({"internship": internship.to_dict()}), 200


# ═══════════════════════════════════════════════════════
#  APPLICATIONS
# ═══════════════════════════════════════════════════════

@app.route("/api/applications", methods=["POST"])
@role_required("student")
def apply_to_internship(user):
    """Откликнуться на стажировку.
    ---
    tags: [5. Отклики]
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [internship_id]
          properties:
            internship_id: {type: integer, example: 1}
            cover_letter: {type: string, example: "Хочу у вас стажироваться, есть опыт с Python!"}
    responses:
      201: {description: Отклик создан}
      404: {description: Стажировка не найдена}
      409: {description: Уже откликались}
    """
    data = request.get_json() or {}
    internship_id = data.get("internship_id")
    internship = db.session.get(Internship, internship_id) if internship_id else None
    if not internship or internship.moderation_status != "published":
        return jsonify({"error": "Стажировка не найдена или не опубликована"}), 404
    if Application.query.filter_by(student_id=user.student.id, internship_id=internship_id).first():
        return jsonify({"error": "Вы уже откликнулись на эту стажировку"}), 409

    application = Application(
        student_id=user.student.id, internship_id=internship_id,
        cover_letter=data.get("cover_letter", ""),
    )
    db.session.add(application)
    db.session.flush()

    notify(
        internship.company.user_id,
        f"Новый отклик на «{internship.title}» от {user.student.first_name} {user.student.last_name}",
        type_="new_application",
        application_id=application.id, internship_id=internship.id,
    )
    db.session.commit()
    return jsonify({"application": application.to_dict()}), 201


@app.route("/api/applications", methods=["GET"])
@role_required("student")
def list_my_applications(user):
    """Мои отклики.
    ---
    tags: [5. Отклики]
    """
    query = Application.query.filter_by(student_id=user.student.id)
    if status := request.args.get("status"):
        if (e := validate_enum(status, APPLICATION_STATUS, "status")):
            return validation_error(e)
        query = query.filter_by(status=status)
    apps = query.order_by(Application.created_at.desc()).all()
    return jsonify({"applications": [serialize_application(a, include_internship=True) for a in apps]}), 200


@app.route("/api/applications/<int:application_id>/withdraw", methods=["POST"])
@role_required("student")
def withdraw_application(user, application_id):
    """Отозвать отклик.
    ---
    tags: [5. Отклики]
    """
    application = db.session.get(Application, application_id)
    if not application or application.student_id != user.student.id:
        return jsonify({"error": "Отклик не найден"}), 404
    application.status = "withdrawn"
    db.session.commit()
    return jsonify({"application": application.to_dict()}), 200


@app.route("/api/company/internships/<int:internship_id>/applications", methods=["GET"])
@role_required("company")
def list_internship_applications(user, internship_id):
    """Отклики на вакансию.
    ---
    tags: [5. Отклики]
    """
    internship = db.session.get(Internship, internship_id)
    if not internship or internship.company_id != user.company.id:
        return jsonify({"error": "Стажировка не найдена"}), 404
    query = Application.query.filter_by(internship_id=internship_id)
    if status := request.args.get("status"):
        query = query.filter_by(status=status)
    apps = query.order_by(Application.created_at.desc()).all()
    return jsonify({"applications": [serialize_application(a, include_student=True) for a in apps]}), 200


@app.route("/api/company/applications", methods=["GET"])
@role_required("company")
def list_company_applications(user):
    """Все отклики на вакансии компании."""
    query = Application.query.join(Internship).filter(Internship.company_id == user.company.id)
    if internship_id := request.args.get("internship_id", type=int):
        query = query.filter(Application.internship_id == internship_id)
    if status := request.args.get("status"):
        query = query.filter(Application.status == status)
    apps = query.order_by(Application.created_at.desc()).all()
    return jsonify({"applications": [serialize_application(a, include_student=True, include_internship=True) for a in apps]}), 200


@app.route("/api/company/applications/<int:application_id>/status", methods=["PUT"])
@role_required("company")
def update_application_status(user, application_id):
    """Изменить статус отклика. Создаёт уведомление студенту.
    ---
    tags: [5. Отклики]
    security:
      - Bearer: []
    parameters:
      - name: application_id
        in: path
        type: integer
        required: true
        example: 1
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [status]
          properties:
            status:
              type: string
              enum: [applied, interview, offer, rejected]
              example: interview
    """
    application = db.session.get(Application, application_id)
    if not application:
        return jsonify({"error": "Отклик не найден"}), 404
    if application.internship.company_id != user.company.id:
        return jsonify({"error": "Доступ запрещён"}), 403
    new_status = (request.get_json() or {}).get("status")
    if (e := validate_enum(new_status, APPLICATION_STATUS - {"withdrawn"}, "status")):
        return validation_error(e)

    old = application.status
    application.status = new_status
    db.session.flush()

    status_text = {
        "interview": "приглашение на собеседование",
        "offer": "получен оффер",
        "rejected": "отклик отклонён",
        "applied": "статус изменён на «подал заявку»",
    }
    notify(
        application.student.user_id,
        f"«{application.internship.title}»: {status_text.get(new_status, new_status)}",
        type_=f"application_{new_status}",
        application_id=application.id, internship_id=application.internship_id,
    )
    send_email_safe(
        application.student.user.email,
        f"Обновление по отклику: {application.internship.title}",
        f"Статус вашего отклика изменился: {status_text.get(new_status, new_status)}.",
    )
    db.session.commit()
    return jsonify({"application": application.to_dict()}), 200


# ═══════════════════════════════════════════════════════
#  BOOKMARKS
# ═══════════════════════════════════════════════════════

@app.route("/api/bookmarks", methods=["POST"])
@role_required("student")
def add_bookmark(user):
    """Отложить стажировку.
    ---
    tags: [6. Закладки]
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [internship_id]
          properties:
            internship_id: {type: integer, example: 2}
    """
    internship_id = (request.get_json() or {}).get("internship_id")
    if Bookmark.query.filter_by(student_id=user.student.id, internship_id=internship_id).first():
        return jsonify({"error": "Уже в отложенных"}), 409
    bookmark = Bookmark(student_id=user.student.id, internship_id=internship_id)
    db.session.add(bookmark)
    db.session.commit()
    return jsonify({"bookmark": bookmark.to_dict()}), 201


@app.route("/api/bookmarks", methods=["GET"])
@role_required("student")
def list_bookmarks(user):
    """Список отложенных.
    ---
    tags: [6. Закладки]
    """
    bookmarks = Bookmark.query.filter_by(student_id=user.student.id)\
        .order_by(Bookmark.created_at.desc()).all()
    result = []
    for bm in bookmarks:
        d = bm.to_dict()
        if bm.internship:
            d["internship"] = bm.internship.to_dict()
        result.append(d)
    return jsonify({"bookmarks": result}), 200


@app.route("/api/bookmarks/<int:internship_id>", methods=["DELETE"])
@role_required("student")
def remove_bookmark(user, internship_id):
    """Убрать из отложенных.
    ---
    tags: [6. Закладки]
    """
    bookmark = Bookmark.query.filter_by(student_id=user.student.id, internship_id=internship_id).first()
    if not bookmark:
        return jsonify({"error": "Закладка не найдена"}), 404
    db.session.delete(bookmark)
    db.session.commit()
    return jsonify({"message": "Удалено из отложенных"}), 200


# ═══════════════════════════════════════════════════════
#  ADMIN / MODERATION
# ═══════════════════════════════════════════════════════

@app.route("/api/admin/internships/pending", methods=["GET"])
@role_required("admin")
def list_pending_internships(user):
    """Очередь модерации.
    ---
    tags: [7. Модерация]
    """
    query = Internship.query.filter_by(moderation_status="pending")\
        .order_by(Internship.created_at.asc())
    return jsonify(paginate_query(query)), 200


@app.route("/api/admin/internships/<int:internship_id>/moderate", methods=["POST"])
@role_required("admin")
def moderate_internship(user, internship_id):
    """Одобрить/отклонить вакансию.
    ---
    tags: [7. Модерация]
    security:
      - Bearer: []
    parameters:
      - name: internship_id
        in: path
        type: integer
        required: true
        example: 1
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [action]
          properties:
            action:
              type: string
              enum: [approve, reject]
              example: approve
    """
    internship = db.session.get(Internship, internship_id)
    if not internship:
        return jsonify({"error": "Стажировка не найдена"}), 404
    action = (request.get_json() or {}).get("action")
    if action == "approve":
        internship.moderation_status = "published"
        internship.is_verified = True
        internship.last_confirmed_at = datetime.now(timezone.utc)
        notify(internship.company.user_id,
               f"Вакансия «{internship.title}» одобрена и опубликована",
               type_="moderation_approved", internship_id=internship.id)
    elif action == "reject":
        internship.moderation_status = "rejected"
        notify(internship.company.user_id,
               f"Вакансия «{internship.title}» отклонена модератором",
               type_="moderation_rejected", internship_id=internship.id)
    else:
        return validation_error("Допустимые действия: approve, reject")
    db.session.commit()
    return jsonify({"internship": internship.to_dict()}), 200


@app.route("/api/admin/applications", methods=["GET"])
@role_required("admin")
def list_admin_applications(user):
    """Список откликов для админа."""
    query = Application.query.join(Internship)
    if internship_id := request.args.get("internship_id", type=int):
        query = query.filter(Application.internship_id == internship_id)
    if company_id := request.args.get("company_id", type=int):
        query = query.filter(Internship.company_id == company_id)
    if status := request.args.get("status"):
        query = query.filter(Application.status == status)
    apps = query.order_by(Application.created_at.desc()).all()
    return jsonify({"applications": [serialize_application(a, include_student=True, include_internship=True) for a in apps]}), 200


@app.route("/api/admin/run-stale-check", methods=["POST"])
@role_required("admin")
def admin_run_stale_check(user):
    """Запустить проверку устаревших вакансий вручную.
    ---
    tags: [7. Модерация]
    """
    n = check_stale_internships()
    return jsonify({"archived": n}), 200


@app.route("/uploads/<path:filename>", methods=["GET"])
def get_uploaded_file(filename):
    """Отдача файлов из uploads (резюме / логотипы)."""
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


# ═══════════════════════════════════════════════════════
#  СПРАВОЧНИКИ
# ═══════════════════════════════════════════════════════

def _autocomplete(Model, attr="name"):
    search = request.args.get("search", "")
    query = Model.query
    if search:
        query = query.filter(getattr(Model, attr).ilike(f"%{search}%"))
    items = query.order_by(getattr(Model, attr)).limit(50).all()
    return jsonify({"items": [i.to_dict() for i in items]}), 200


@app.route("/api/skills", methods=["GET"])
def list_skills():
    """Справочник навыков.
    ---
    tags: [8. Справочники]
    """
    search = request.args.get("search", "")
    query = Skill.query
    if search:
        query = query.filter(Skill.name.ilike(f"%{search}%"))
    skills = query.order_by(Skill.name).limit(50).all()
    return jsonify({"skills": [s.to_dict() for s in skills]}), 200


@app.route("/api/universities", methods=["GET"])
def list_universities():
    """Справочник вузов (?search=Мос).
    ---
    tags: [8. Справочники]
    """
    return _autocomplete(University)


@app.route("/api/faculties", methods=["GET"])
def list_faculties():
    """Справочник факультетов. Можно фильтровать ?university_id=.
    ---
    tags: [8. Справочники]
    """
    search = request.args.get("search", "")
    university_id = request.args.get("university_id", type=int)
    query = Faculty.query
    if university_id:
        query = query.filter(Faculty.university_id == university_id)
    if search:
        query = query.filter(Faculty.name.ilike(f"%{search}%"))
    items = query.order_by(Faculty.name).limit(50).all()
    return jsonify({"items": [i.to_dict() for i in items]}), 200


@app.route("/api/cities", methods=["GET"])
def list_cities():
    """Справочник городов.
    ---
    tags: [8. Справочники]
    """
    return _autocomplete(City)


# ═══════════════════════════════════════════════════════
#  КОНТЕНТ: статьи, новости
# ═══════════════════════════════════════════════════════

@app.route("/api/articles", methods=["GET"])
def list_articles():
    """Список статей раздела Инструменты.
    ---
    tags: [10. Контент]
    """
    query = Article.query
    if cat := request.args.get("category"):
        query = query.filter_by(category=cat)
    query = query.order_by(Article.created_at.desc())
    return jsonify(paginate_query(query)), 200


@app.route("/api/articles/<int:article_id>", methods=["GET"])
def get_article(article_id):
    """Карточка статьи.
    ---
    tags: [10. Контент]
    """
    article = db.session.get(Article, article_id)
    if not article:
        return jsonify({"error": "Статья не найдена"}), 404
    return jsonify({"article": article.to_dict()}), 200


@app.route("/api/articles", methods=["POST"])
@role_required("admin")
def create_article(user):
    """Создать статью (admin).
    ---
    tags: [10. Контент]
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [title, body]
          properties:
            title: {type: string, example: "Как написать резюме"}
            body: {type: string, example: "Текст статьи..."}
            image_url: {type: string}
            category: {type: string, example: resume}
    """
    data = request.get_json() or {}
    err = require_fields(data, ["title", "body"])
    if err:
        return validation_error(err)
    article = Article(
        title=data["title"], body=data["body"],
        image_url=data.get("image_url", ""), category=data.get("category", "general"),
    )
    db.session.add(article)
    db.session.commit()
    return jsonify({"article": article.to_dict()}), 201


@app.route("/api/articles/<int:article_id>", methods=["PUT"])
@role_required("admin")
def update_article(user, article_id):
    """Обновить статью."""
    article = db.session.get(Article, article_id)
    if not article:
        return jsonify({"error": "Статья не найдена"}), 404
    data = request.get_json() or {}
    for f in ["title", "body", "image_url", "category"]:
        if f in data:
            setattr(article, f, data[f])
    db.session.commit()
    return jsonify({"article": article.to_dict()}), 200


@app.route("/api/articles/<int:article_id>", methods=["DELETE"])
@role_required("admin")
def delete_article(user, article_id):
    """Удалить статью."""
    article = db.session.get(Article, article_id)
    if not article:
        return jsonify({"error": "Статья не найдена"}), 404
    db.session.delete(article)
    db.session.commit()
    return jsonify({"message": "Удалено"}), 200


@app.route("/api/news", methods=["GET"])
def list_news():
    """Новостная лента.
    ---
    tags: [10. Контент]
    """
    query = NewsPost.query.order_by(NewsPost.created_at.desc())
    return jsonify(paginate_query(query)), 200


@app.route("/api/news/<int:news_id>", methods=["GET"])
def get_news(news_id):
    """Новость.
    ---
    tags: [10. Контент]
    """
    n = db.session.get(NewsPost, news_id)
    if not n:
        return jsonify({"error": "Новость не найдена"}), 404
    return jsonify({"news": n.to_dict()}), 200


@app.route("/api/news", methods=["POST"])
@role_required("admin")
def create_news(user):
    """Создать новость (admin).
    ---
    tags: [10. Контент]
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [title, body]
          properties:
            title: {type: string}
            body: {type: string}
            image_url: {type: string}
            category: {type: string}
    """
    data = request.get_json() or {}
    err = require_fields(data, ["title", "body"])
    if err:
        return validation_error(err)
    n = NewsPost(
        title=data["title"], body=data["body"],
        image_url=data.get("image_url", ""), category=data.get("category", "news"),
    )
    db.session.add(n)
    db.session.commit()
    return jsonify({"news": n.to_dict()}), 201


# ═══════════════════════════════════════════════════════
#  УВЕДОМЛЕНИЯ
# ═══════════════════════════════════════════════════════

@app.route("/api/notifications", methods=["GET"])
@jwt_required()
def list_notifications():
    """Мои уведомления.
    ---
    tags: [11. Уведомления]
    """
    user_id = int(get_jwt_identity())
    query = Notification.query.filter_by(user_id=user_id)
    if request.args.get("unread", "").lower() == "true":
        query = query.filter_by(is_read=False)
    items = query.order_by(Notification.created_at.desc()).limit(100).all()
    return jsonify({
        "notifications": [n.to_dict() for n in items],
        "unread_count": Notification.query.filter_by(user_id=user_id, is_read=False).count(),
    }), 200


@app.route("/api/notifications/<int:nid>/read", methods=["POST"])
@jwt_required()
def mark_notification_read(nid):
    """Отметить уведомление прочитанным.
    ---
    tags: [11. Уведомления]
    """
    user_id = int(get_jwt_identity())
    n = db.session.get(Notification, nid)
    if not n or n.user_id != user_id:
        return jsonify({"error": "Не найдено"}), 404
    n.is_read = True
    db.session.commit()
    return jsonify({"notification": n.to_dict()}), 200


@app.route("/api/notifications/read-all", methods=["POST"])
@jwt_required()
def mark_all_read():
    """Прочитать все уведомления.
    ---
    tags: [11. Уведомления]
    """
    user_id = int(get_jwt_identity())
    Notification.query.filter_by(user_id=user_id, is_read=False).update({"is_read": True})
    db.session.commit()
    return jsonify({"message": "ok"}), 200


# ═══════════════════════════════════════════════════════
#  ОТЗЫВЫ
# ═══════════════════════════════════════════════════════

@app.route("/api/reviews", methods=["POST"])
@role_required("student")
def create_review(user):
    """Оставить отзыв о компании/стажировке.
    ---
    tags: [12. Отзывы]
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [company_id, rating]
          properties:
            company_id: {type: integer, example: 1}
            internship_id: {type: integer, example: 1}
            rating: {type: integer, minimum: 1, maximum: 5, example: 5}
            text: {type: string, example: "Отличная команда и хорошее наставничество"}
    """
    data = request.get_json() or {}
    err = require_fields(data, ["company_id", "rating"])
    if err:
        return validation_error(err)
    try:
        rating = int(data["rating"])
        if not 1 <= rating <= 5:
            raise ValueError
    except (TypeError, ValueError):
        return validation_error("rating должен быть 1..5")
    company = db.session.get(Company, data["company_id"])
    if not company:
        return jsonify({"error": "Компания не найдена"}), 404
    internship_id = data.get("internship_id")
    if internship_id:
        intern = db.session.get(Internship, internship_id)
        if not intern or intern.company_id != company.id:
            return validation_error("internship_id не относится к этой компании")
    review = Review(
        student_id=user.student.id, company_id=company.id,
        internship_id=internship_id, rating=rating, text=data.get("text", ""),
    )
    db.session.add(review)
    db.session.commit()
    return jsonify({"review": review.to_dict()}), 201


@app.route("/api/companies/<int:company_id>/reviews", methods=["GET"])
def list_company_reviews(company_id):
    """Отзывы по компании.
    ---
    tags: [12. Отзывы]
    """
    reviews = Review.query.filter_by(company_id=company_id)\
        .order_by(Review.created_at.desc()).all()
    avg = (sum(r.rating for r in reviews) / len(reviews)) if reviews else None
    return jsonify({
        "reviews": [r.to_dict(include_student=True) for r in reviews],
        "average_rating": round(avg, 2) if avg is not None else None,
        "count": len(reviews),
    }), 200


@app.route("/api/internships/<int:internship_id>/reviews", methods=["GET"])
def list_internship_reviews(internship_id):
    """Отзывы по стажировке.
    ---
    tags: [12. Отзывы]
    """
    reviews = Review.query.filter_by(internship_id=internship_id)\
        .order_by(Review.created_at.desc()).all()
    return jsonify({"reviews": [r.to_dict(include_student=True) for r in reviews]}), 200


# ═══════════════════════════════════════════════════════
#  ПОДПИСКИ И ПЛАТЕЖИ
# ═══════════════════════════════════════════════════════

@app.route("/api/subscriptions/plans", methods=["GET"])
def list_plans():
    """Тарифы.
    ---
    tags: [13. Подписки]
    """
    return jsonify({
        "plans": [
            {"key": "free", "name": "Бесплатный", "amount": 0, "features": [
                "поиск стажировок с фильтрами", "уведомления", "базовый профиль",
            ]},
            {"key": "premium", "name": "Premium (студент)", "amount": PLAN_PRICES["premium"]["amount"],
             "period_days": PLAN_PRICES["premium"]["period_days"], "features": [
                "продвинутый подбор по навыкам", "подъём резюме в топ для работодателей",
                "ИИ-помощник по резюме",
            ]},
            {"key": "b2b", "name": "B2B (компания)", "amount": PLAN_PRICES["b2b"]["amount"],
             "period_days": PLAN_PRICES["b2b"]["period_days"], "features": [
                "доступ к базе профилей студентов", "приоритетный показ вакансии",
                "аналитика откликов", f"лимит {B2B_POSTING_LIMIT} активных вакансий",
            ]},
        ]
    }), 200


@app.route("/api/subscriptions/me", methods=["GET"])
@jwt_required()
def get_my_subscription():
    """Моя подписка.
    ---
    tags: [13. Подписки]
    """
    user = db.session.get(User, int(get_jwt_identity()))
    sub = user.subscription
    if not sub:
        sub = Subscription(user_id=user.id, plan="free", status="active")
        db.session.add(sub)
        db.session.commit()
    return jsonify({"subscription": sub.to_dict()}), 200


def _generate_payment_code():
    """Короткий читаемый код для поля «Сообщение» в DonationAlerts."""
    return "PAY-" + uuid.uuid4().hex[:8].upper()


def _activate_subscription_for_payment(payment):
    """Активирует/продлевает подписку, выставляет boost/limit и отправляет уведомление.
    Не делает commit — это ответственность вызывающего."""
    user = db.session.get(User, payment.user_id)
    sub = user.subscription
    now = datetime.now(timezone.utc)
    sub_exp = sub.expires_at if sub else None
    if sub_exp is not None and sub_exp.tzinfo is None:
        sub_exp = sub_exp.replace(tzinfo=timezone.utc)
    start = sub_exp if (sub_exp and sub_exp > now) else now
    expires = start + timedelta(days=payment.period_days)
    if sub:
        sub.plan = payment.plan
        sub.status = "active"
        sub.started_at = sub.started_at or now
        sub.expires_at = expires
    else:
        sub = Subscription(user_id=user.id, plan=payment.plan, status="active",
                           started_at=now, expires_at=expires)
        db.session.add(sub)

    if payment.plan == "premium" and user.student:
        user.student.is_boosted = True
        user.student.boosted_until = expires
    if payment.plan == "b2b" and user.company:
        user.company.posting_limit = B2B_POSTING_LIMIT

    notify(user.id,
           f"Подписка {payment.plan} активирована до {expires.date().isoformat()}",
           type_="subscription_activated")
    send_email_safe(
        user.email,
        f"Подписка {payment.plan} активирована",
        f"Ваша подписка {payment.plan} активна до {expires.date().isoformat()}.",
    )
    return sub


@app.route("/api/subscriptions/checkout", methods=["POST"])
@jwt_required()
@limiter.limit("20 per hour")
def checkout():
    """Создаёт платёж. Возвращает донат-URL DonationAlerts и код для поля «Сообщение».
    Если DA не настроен — fallback на mock-режим (для разработки).
    ---
    tags: [13. Подписки]
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [plan]
          properties:
            plan:
              type: string
              enum: [premium, b2b]
              example: premium
              description: "premium — для студента (499₽/мес), b2b — для компании (9900₽/мес)"
    responses:
      201:
        description: Платёж создан. Возвращает donate_url и payment_code для оплаты в DonationAlerts.
      400:
        description: Невалидный план
    """
    user = db.session.get(User, int(get_jwt_identity()))
    data = request.get_json() or {}
    plan = data.get("plan")
    if plan not in PLAN_PRICES:
        return validation_error(f"plan: {', '.join(PLAN_PRICES.keys())}")
    if plan == "b2b" and user.role != "company":
        return validation_error("План b2b доступен только компаниям")
    if plan == "premium" and user.role != "student":
        return validation_error("План premium доступен только студентам")

    price = PLAN_PRICES[plan]
    code = _generate_payment_code()
    force_mock = os.environ.get("ALLOW_MOCK_PAYMENTS") == "1"
    provider = "mock" if (force_mock or not da_pay.is_configured()) else "donationalerts"

    payment = Payment(
        user_id=user.id, plan=plan,
        amount=price["amount"], period_days=price["period_days"],
        external_id=code, provider=provider, status="pending",
    )
    db.session.add(payment)
    db.session.commit()

    response = {
        "payment": payment.to_dict(),
        "provider": provider,
    }
    if provider == "donationalerts":
        import urllib.parse as _urlparse
        base = da_pay.donate_url()
        # DA поддерживает префилл amount / amount_currency / message через query-params.
        prefilled = base + "?" + _urlparse.urlencode({
            "amount": price["amount"],
            "amount_currency": "RUB",
            "message": code,
        })
        response.update({
            "donate_url": prefilled,
            "donate_url_raw": base,
            "payment_code": code,
            "amount_rub": price["amount"],
            "instructions": (
                "Перейдите по donate_url — сумма и код будут уже подставлены, "
                "вам останется выбрать способ оплаты. "
                "Подписка активируется автоматически за 1–2 минуты после оплаты. "
                "Если поля окажутся пустыми (DA иногда сбрасывает префилл), "
                f"вручную укажите {price['amount']} ₽ и сообщение: {code}"
            ),
        })
    else:
        # Dev-режим: мок confirm для тестов фронтенда без DA-аккаунта
        response.update({
            "payment_url": f"/api/payments/mock-confirm?external_id={code}&status=paid",
            "note": "DonationAlerts не настроен — используется mock. "
                    "Задайте DONATIONALERTS_USERNAME и DONATIONALERTS_TOKEN в env.",
        })
    return jsonify(response), 201


@app.route("/api/payments/mock-confirm", methods=["POST", "GET"])
def payment_mock_confirm():
    """Мок-подтверждение оплаты — только для dev. В проде DA отключает этот путь.
    ---
    tags: [13. Подписки]
    """
    if da_pay.is_configured() and os.environ.get("ALLOW_MOCK_PAYMENTS") != "1":
        return jsonify({"error": "Mock-режим выключен. Используйте DonationAlerts."}), 403

    external_id = request.args.get("external_id") or (request.get_json() or {}).get("external_id")
    status = request.args.get("status") or (request.get_json() or {}).get("status", "paid")
    payment = Payment.query.filter_by(external_id=external_id).first()
    if not payment:
        return jsonify({"error": "Платёж не найден"}), 404
    if payment.status == "paid":
        return jsonify({"message": "Уже оплачен", "payment": payment.to_dict()}), 200

    if status != "paid":
        payment.status = "failed"
        db.session.commit()
        return jsonify({"payment": payment.to_dict()}), 200

    payment.status = "paid"
    payment.paid_at = datetime.now(timezone.utc)
    sub = _activate_subscription_for_payment(payment)
    db.session.commit()
    return jsonify({"payment": payment.to_dict(), "subscription": sub.to_dict()}), 200


@app.route("/api/payments/<int:payment_id>", methods=["GET"])
@jwt_required()
def get_payment_status(payment_id):
    """Статус платежа (для polling фронтом).
    ---
    tags: [13. Подписки]
    """
    user_id = int(get_jwt_identity())
    payment = db.session.get(Payment, payment_id)
    if not payment or payment.user_id != user_id:
        return jsonify({"error": "Платёж не найден"}), 404
    return jsonify({"payment": payment.to_dict()}), 200


@app.route("/api/payments", methods=["GET"])
@jwt_required()
def list_my_payments():
    """История моих платежей."""
    user_id = int(get_jwt_identity())
    items = Payment.query.filter_by(user_id=user_id)\
        .order_by(Payment.created_at.desc()).all()
    return jsonify({"payments": [p.to_dict() for p in items]}), 200


@app.route("/api/admin/payments/<int:payment_id>/confirm", methods=["POST"])
@role_required("admin")
def admin_confirm_payment(user, payment_id):
    """Ручное подтверждение оплаты администратором (если поллер не сработал).
    ---
    tags: [13. Подписки]
    """
    payment = db.session.get(Payment, payment_id)
    if not payment:
        return jsonify({"error": "Платёж не найден"}), 404
    if payment.status == "paid":
        return jsonify({"message": "Уже оплачен"}), 200
    payment.status = "paid"
    payment.paid_at = datetime.now(timezone.utc)
    sub = _activate_subscription_for_payment(payment)
    db.session.commit()
    return jsonify({"payment": payment.to_dict(), "subscription": sub.to_dict()}), 200


@app.route("/api/admin/payments/poll", methods=["POST"])
@role_required("admin")
def admin_poll_donations(user):
    """Принудительно опросить DonationAlerts (для отладки).
    ---
    tags: [13. Подписки]
    """
    n = poll_donationalerts()
    return jsonify({"activated": n, "configured": da_pay.is_configured()}), 200


def poll_donationalerts():
    """Опрос DA и активация совпавших платежей."""
    with app.app_context():
        try:
            return da_pay.match_and_apply(
                db, Payment, User, Subscription, Notification,
                B2B_POSTING_LIMIT,
                _activate_subscription_for_payment,
            )
        except Exception as e:
            app.logger.warning("DA poll error: %s", e)
            return 0


@app.route("/api/subscriptions/cancel", methods=["POST"])
@jwt_required()
def cancel_subscription():
    """Отменить подписку (остаётся активной до expires_at).
    ---
    tags: [13. Подписки]
    """
    user = db.session.get(User, int(get_jwt_identity()))
    sub = user.subscription
    if not sub:
        return jsonify({"error": "Подписки нет"}), 404
    sub.status = "cancelled"
    db.session.commit()
    return jsonify({"subscription": sub.to_dict()}), 200


# ═══════════════════════════════════════════════════════
#  B2B: поиск студентов и аналитика
# ═══════════════════════════════════════════════════════

@app.route("/api/company/students/search", methods=["GET"])
@b2b_required
def search_students(user):
    """Поиск студентов по фильтрам (B2B).
    ---
    tags: [9. Premium / B2B]
    """
    query = Student.query
    if city := request.args.get("city"):
        query = query.filter(Student.city.ilike(f"%{city}%"))
    if uni := request.args.get("university"):
        query = query.filter(Student.university.ilike(f"%{uni}%"))
    if course := request.args.get("course", type=int):
        query = query.filter(Student.course == course)
    if skills := request.args.getlist("skills"):
        for sk in skills:
            query = query.filter(Student.skills.any(Skill.name.ilike(sk)))
    # boosted студенты выше
    query = query.order_by(Student.is_boosted.desc(), Student.id.desc())
    return jsonify(paginate_query(query, serializer=lambda s: s.to_dict(extended=True))), 200


@app.route("/api/company/analytics", methods=["GET"])
@b2b_required
def company_analytics(user):
    """Аналитика откликов и конверсий по вакансиям компании.
    ---
    tags: [9. Premium / B2B]
    """
    internships = Internship.query.filter_by(company_id=user.company.id).all()
    result = []
    totals = {"views": 0, "applied": 0, "interview": 0, "offer": 0, "rejected": 0}
    for it in internships:
        statuses = {"applied": 0, "interview": 0, "offer": 0, "rejected": 0, "withdrawn": 0}
        for a in it.applications:
            statuses[a.status] = statuses.get(a.status, 0) + 1
        total_apps = sum(statuses.values())
        conv = round(100 * statuses["offer"] / total_apps, 1) if total_apps else 0
        item = {
            "internship_id": it.id, "title": it.title,
            "views": it.views_count or 0,
            "applications": total_apps,
            "by_status": statuses,
            "conversion_to_offer_pct": conv,
        }
        result.append(item)
        totals["views"] += item["views"]
        for k in ("applied", "interview", "offer", "rejected"):
            totals[k] += statuses[k]
    return jsonify({"per_internship": result, "totals": totals}), 200


# ═══════════════════════════════════════════════════════
#  AI-помощник по резюме (Premium)
# ═══════════════════════════════════════════════════════

@app.route("/api/students/resume/ai-adapt", methods=["POST"])
@premium_required
def ai_resume_adapt(user):
    """Адаптация резюме под вакансию (Premium).
    ---
    tags: [9. Premium / B2B]
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [internship_id]
          properties:
            internship_id: {type: integer, example: 1}
    """
    if user.role != "student" or not user.student:
        return jsonify({"error": "Только для студентов"}), 403
    data = request.get_json() or {}
    internship_id = data.get("internship_id")
    intern = db.session.get(Internship, internship_id) if internship_id else None
    if not intern:
        return validation_error("internship_id обязателен и должен указывать на существующую стажировку")

    student = user.student
    skill_names = [s.name for s in student.skills]
    needed = [s.name for s in intern.required_skills]
    matched = [s for s in skill_names if s in needed]
    missing = [s for s in needed if s not in skill_names]

    api_key = os.environ.get("OPENAI_API_KEY")
    adapted = None
    provider = "local-template"
    if api_key:
        try:
            adapted = _openai_adapt_resume(api_key, student, intern, matched, missing)
            provider = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        except Exception as e:
            import traceback
            app.logger.warning("OpenAI call failed: %s\n%s", e, traceback.format_exc())
            adapted = None
    if not adapted:
        adapted = _mock_adapt_resume(student, intern, matched, missing)

    return jsonify({
        "provider": provider,
        "matched_skills": matched,
        "missing_skills": missing,
        "adapted_resume": adapted,
        "tips": [
            "Подчеркните проекты, где использовались: " + ", ".join(matched) if matched else "Добавьте релевантные проекты в портфолио",
            "Освойте недостающие навыки: " + ", ".join(missing) if missing else "Все ключевые навыки совпадают",
        ],
    }), 200


def _openai_adapt_resume(api_key, student, intern, matched, missing):
    """Реальный вызов OpenAI Chat Completions API (через urllib, без зависимости openai)."""
    import urllib.request
    import json as _json

    model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
    base_url = os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1")
    skills = ", ".join(s.name for s in student.skills) or "—"
    prompt = (
        "Ты — помощник по составлению студенческого резюме на русском языке. "
        "Адаптируй краткое резюме под конкретную вакансию. Выведи готовый текст в 6-10 строк, "
        "без вводных фраз.\n\n"
        f"Студент: {student.last_name} {student.first_name}, {student.course} курс, "
        f"{student.university}, {student.speciality or 'специальность не указана'}.\n"
        f"Город: {student.city}. Навыки: {skills}.\n"
        f"Опыт: {student.experience or 'без коммерческого опыта'}.\n"
        f"Портфолио: {student.portfolio_url or student.github_url or '—'}.\n\n"
        f"Вакансия: {intern.title} ({intern.direction}).\n"
        f"Описание: {intern.description}\n"
        f"Требования: {intern.requirements or '—'}\n"
        f"Совпадающие навыки: {', '.join(matched) or '—'}\n"
        f"Недостающие навыки: {', '.join(missing) or '—'}"
    )
    body = _json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.4,
    }).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=30) as r:
        payload = _json.loads(r.read().decode("utf-8"))
    return payload["choices"][0]["message"]["content"].strip()


def _mock_adapt_resume(student, intern, matched, missing):
    return (
        f"{student.last_name} {student.first_name}, {student.course} курс, {student.university}.\n"
        f"Цель: позиция «{intern.title}» в направлении {intern.direction}.\n"
        f"Совпадающие навыки: {', '.join(matched) or '—'}.\n"
        f"Опыт: {student.experience or 'без коммерческого опыта'}.\n"
        f"Портфолио: {student.portfolio_url or student.github_url or '—'}.\n"
        f"Готов(а) к формату работы: {intern.work_format}; "
        f"график: {intern.schedule or 'обсуждается'}.\n"
        f"План развития: {', '.join(missing) or '—'}."
    )


# ═══════════════════════════════════════════════════════
#  Фоновая задача: автомодерация актуальности
# ═══════════════════════════════════════════════════════

def check_stale_internships():
    """Помечает вакансии без подтверждения старше 2 недель как archived."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    with app.app_context():
        # Сравниваем через naive UTC, т.к. SQLite не хранит tzinfo
        cutoff_naive = cutoff.replace(tzinfo=None)
        stale = Internship.query.filter(
            Internship.moderation_status == "published",
            db.or_(Internship.last_confirmed_at == None,
                   Internship.last_confirmed_at < cutoff_naive),
        ).all()
        for it in stale:
            it.moderation_status = "archived"
            notify(it.company.user_id,
                   f"Вакансия «{it.title}» снята из ленты: требуется подтверждение актуальности",
                   type_="auto_archived", internship_id=it.id)
        db.session.commit()
        return len(stale)


def start_scheduler():
    if not HAS_SCHEDULER:
        return
    if os.environ.get("DISABLE_SCHEDULER") == "1":
        return
    scheduler = BackgroundScheduler(daemon=True, timezone="UTC")
    scheduler.add_job(check_stale_internships, "interval", hours=24, id="stale_check")
    if da_pay.is_configured():
        scheduler.add_job(poll_donationalerts, "interval",
                          seconds=da_pay.DA_POLL_SEC, id="da_poll")
        app.logger.info("DonationAlerts poller started (every %ss)", da_pay.DA_POLL_SEC)
    scheduler.start()


# ═══════════════════════════════════════════════════════
#  HEALTH
# ═══════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health():
    """Healthcheck: проверяет соединение с БД и состояние интеграций.
    ---
    tags: [8. Справочники]
    """
    try:
        db.session.execute(db.text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return jsonify({
        "status": "ok" if db_ok else "degraded",
        "db": db_ok,
        "donationalerts_configured": da_pay.is_configured(),
        "mail_configured": mail is not None,
        "openai_configured": bool(os.environ.get("OPENAI_API_KEY")),
        "version": "3.1.0",
    }), 200 if db_ok else 503


def send_email_safe(to_email, subject, body):
    """Отправка письма, если SMTP настроен. Безопасна к ошибкам."""
    if not mail or not to_email:
        return False
    try:
        msg = Message(subject=subject, recipients=[to_email], body=body)
        mail.send(msg)
        return True
    except Exception as e:
        app.logger.warning("mail send failed: %s", e)
        return False


# ═══════════════════════════════════════════════════════
#  Обработчики ошибок
# ═══════════════════════════════════════════════════════

@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "Файл слишком большой (макс. 10 МБ)"}), 413


@app.errorhandler(404)
def not_found(e):
    if request.path.startswith("/api/"):
        return jsonify({"error": "Не найдено"}), 404
    return e


# ═══════════════════════════════════════════════════════
#  Запуск
# ═══════════════════════════════════════════════════════

if __name__ == "__main__":
    app_port = app.config["APP_PORT"]
    with app.app_context():
        db.create_all()
        print("База данных создана.")
    start_scheduler()
    print(f"Сервер запущен:  http://localhost:{app_port}")
    print(f"Swagger UI:      http://localhost:{app_port}/apidocs")
    app.run(debug=True, host="0.0.0.0", port=app_port)
else:
    # При запуске через gunicorn — также стартуем планировщик
    try:
        start_scheduler()
    except Exception:
        pass
