"""
Бэкенд платформы стажировок для студентов.
Flask + SQLAlchemy + JWT авторизация + Swagger UI (Flasgger).

Запуск:
  python app.py

API доступен на http://localhost:5051
Swagger UI:   http://localhost:5051/apidocs
"""

import os
from datetime import timedelta, datetime, timezone, date
from functools import wraps

from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager, create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt,
)
from flasgger import Swagger

from models import (
    db, User, Student, Company, Internship,
    Application, Bookmark, Skill,
    student_skills, internship_skills,
)

# ═══════════════════════════════════════════════════════
#  Конфигурация
# ═══════════════════════════════════════════════════════

app = Flask(__name__)
app.config.update(
    SQLALCHEMY_DATABASE_URI=os.environ.get("DATABASE_URL", "sqlite:///internships.db"),
    SQLALCHEMY_TRACK_MODIFICATIONS=False,
    JWT_SECRET_KEY=os.environ.get("JWT_SECRET", "dev-secret-change-in-production-32-bytes"),
    JWT_ACCESS_TOKEN_EXPIRES=timedelta(hours=2),
    JWT_REFRESH_TOKEN_EXPIRES=timedelta(days=30),
    MAX_CONTENT_LENGTH=10 * 1024 * 1024,
    UPLOAD_FOLDER=os.path.join(os.path.dirname(__file__), "uploads"),
)

CORS(app, resources={r"/api/*": {"origins": "*"}})
db.init_app(app)
jwt = JWTManager(app)

# ── Swagger / Flasgger ──
swagger_config = {
    "headers": [],
    "specs": [{
        "endpoint": "apispec",
        "route": "/apispec.json",
        "rule_filter": lambda rule: True,
        "model_filter": lambda tag: True,
    }],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/apidocs/",
}

swagger_template = {
    "info": {
        "title": "Платформа стажировок — API",
        "description": (
            "REST API агрегатора стажировок для студентов.\n\n"
            "**Как тестировать:**\n"
            "1. Вызовите `POST /api/auth/login` с тестовыми данными (см. ниже)\n"
            "2. Скопируйте `access_token` из ответа\n"
            "3. Нажмите кнопку **Authorize** (замок) вверху страницы\n"
            "4. Введите: `Bearer <ваш_токен>`\n\n"
            "**Тестовые аккаунты:**\n"
            "- Студент: `ivan@student.ru` / `password123`\n"
            "- Студент: `maria@student.ru` / `password123`\n"
            "- Компания: `hr@yandex.ru` / `password123`\n"
            "- Компания: `hr@tinkoff.ru` / `password123`"
        ),
        "version": "1.0.0",
    },
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT токен. Формат: **Bearer &lt;access_token&gt;**",
        }
    },
    "security": [{"Bearer": []}],
}

swagger = Swagger(app, config=swagger_config, template=swagger_template)

os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)


# ═══════════════════════════════════════════════════════
#  Корневой маршрут → редирект на Swagger
# ═══════════════════════════════════════════════════════

@app.route("/")
def index():
    return redirect("/apidocs/")


# ═══════════════════════════════════════════════════════
#  Вспомогательные функции
# ═══════════════════════════════════════════════════════

def role_required(role):
    """Декоратор: доступ только для указанной роли."""
    def decorator(fn):
        @wraps(fn)
        @jwt_required()
        def wrapper(*args, **kwargs):
            user = db.session.get(User, get_jwt_identity())
            if not user or user.role != role:
                return jsonify({"error": "Доступ запрещён"}), 403
            return fn(user, *args, **kwargs)
        return wrapper
    return decorator


def get_or_create_skills(skill_names: list) -> list:
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


def paginate_query(query):
    page = request.args.get("page", 1, type=int)
    per_page = min(request.args.get("per_page", 20, type=int), 100)
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return {
        "items": [item.to_dict() for item in pagination.items],
        "total": pagination.total,
        "page": pagination.page,
        "per_page": pagination.per_page,
        "pages": pagination.pages,
    }


# ═══════════════════════════════════════════════════════
#  AUTH — Регистрация и авторизация
# ═══════════════════════════════════════════════════════

@app.route("/api/auth/register/student", methods=["POST"])
def register_student():
    """
    Регистрация студента
    ---
    tags:
      - 1. Авторизация
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [email, password, first_name, last_name, university, course, city]
          properties:
            email:
              type: string
              example: newstudent@mail.ru
            password:
              type: string
              example: mypassword123
            first_name:
              type: string
              example: Анна
            last_name:
              type: string
              example: Иванова
            patronymic:
              type: string
              example: Сергеевна
            university:
              type: string
              example: НИУ ВШЭ
            faculty:
              type: string
              example: Факультет компьютерных наук
            course:
              type: integer
              example: 2
            speciality:
              type: string
              example: Программная инженерия
            city:
              type: string
              example: Москва
            work_format:
              type: string
              enum: [office, hybrid, remote, any]
              example: hybrid
            desired_hours:
              type: string
              enum: ["40", "20-40", "<20", "any"]
              example: "20-40"
    responses:
      201:
        description: Студент зарегистрирован
      400:
        description: Отсутствуют обязательные поля
      409:
        description: Email уже занят
    """
    data = request.get_json()

    required = ["email", "password", "first_name", "last_name", "university", "course", "city"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Отсутствуют поля: {', '.join(missing)}"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Пользователь с таким email уже существует"}), 409

    user = User(email=data["email"], role="student")
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    student = Student(
        user_id=user.id,
        first_name=data["first_name"],
        last_name=data["last_name"],
        patronymic=data.get("patronymic", ""),
        university=data["university"],
        faculty=data.get("faculty", ""),
        course=int(data["course"]),
        speciality=data.get("speciality", ""),
        city=data["city"],
        work_format=data.get("work_format", "any"),
        desired_hours=data.get("desired_hours", "any"),
    )
    db.session.add(student)
    db.session.commit()

    token = create_access_token(identity=user.id, additional_claims={"role": "student"})
    refresh = create_refresh_token(identity=user.id, additional_claims={"role": "student"})
    return jsonify({
        "user": user.to_dict(),
        "student": student.to_dict(),
        "access_token": token,
        "refresh_token": refresh,
    }), 201


@app.route("/api/auth/register/company", methods=["POST"])
def register_company():
    """
    Регистрация компании
    ---
    tags:
      - 1. Авторизация
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [email, password, name]
          properties:
            email:
              type: string
              example: hr@newcompany.ru
            password:
              type: string
              example: companypass123
            name:
              type: string
              example: Новая Компания
            description:
              type: string
              example: Описание компании
            website:
              type: string
              example: https://newcompany.ru
            city:
              type: string
              example: Москва
    responses:
      201:
        description: Компания зарегистрирована
      400:
        description: Отсутствуют обязательные поля
      409:
        description: Email уже занят
    """
    data = request.get_json()

    required = ["email", "password", "name"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Отсутствуют поля: {', '.join(missing)}"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Пользователь с таким email уже существует"}), 409

    user = User(email=data["email"], role="company")
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()

    company = Company(
        user_id=user.id,
        name=data["name"],
        description=data.get("description", ""),
        website=data.get("website", ""),
        city=data.get("city", ""),
    )
    db.session.add(company)
    db.session.commit()

    token = create_access_token(identity=user.id, additional_claims={"role": "company"})
    refresh = create_refresh_token(identity=user.id, additional_claims={"role": "company"})
    return jsonify({
        "user": user.to_dict(),
        "company": company.to_dict(),
        "access_token": token,
        "refresh_token": refresh,
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    """
    Вход (получение JWT-токена)
    ---
    tags:
      - 1. Авторизация
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
        description: Успешный вход — возвращает access_token и refresh_token
      401:
        description: Неверный email или пароль
    """
    data = request.get_json()
    user = User.query.filter_by(email=data.get("email")).first()

    if not user or not user.check_password(data.get("password", "")):
        return jsonify({"error": "Неверный email или пароль"}), 401

    token = create_access_token(identity=user.id, additional_claims={"role": user.role})
    refresh = create_refresh_token(identity=user.id, additional_claims={"role": user.role})

    result = {"user": user.to_dict(), "access_token": token, "refresh_token": refresh}

    if user.role == "student" and user.student:
        result["student"] = user.student.to_dict(extended=True)
    elif user.role == "company" and user.company:
        result["company"] = user.company.to_dict()

    return jsonify(result), 200


@app.route("/api/auth/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh_token():
    """
    Обновление access-токена
    ---
    tags:
      - 1. Авторизация
    security:
      - Bearer: []
    description: Передайте refresh_token в заголовке Authorization
    responses:
      200:
        description: Новый access_token
    """
    uid = get_jwt_identity()
    claims = get_jwt()
    token = create_access_token(identity=uid, additional_claims={"role": claims.get("role")})
    return jsonify({"access_token": token}), 200


@app.route("/api/auth/me", methods=["GET"])
@jwt_required()
def get_me():
    """
    Текущий пользователь
    ---
    tags:
      - 1. Авторизация
    security:
      - Bearer: []
    responses:
      200:
        description: Данные текущего пользователя (+ профиль студента/компании)
      404:
        description: Пользователь не найден
    """
    user = db.session.get(User, get_jwt_identity())
    if not user:
        return jsonify({"error": "Пользователь не найден"}), 404

    result = {"user": user.to_dict()}
    if user.role == "student" and user.student:
        result["student"] = user.student.to_dict(extended=True)
    elif user.role == "company" and user.company:
        result["company"] = user.company.to_dict()
    return jsonify(result), 200


# ═══════════════════════════════════════════════════════
#  STUDENT — Профиль студента
# ═══════════════════════════════════════════════════════

@app.route("/api/students/profile", methods=["PUT"])
@role_required("student")
def update_student_profile(user):
    """
    Обновление профиля студента
    ---
    tags:
      - 2. Студент
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            first_name:
              type: string
              example: Иван
            last_name:
              type: string
              example: Петров
            university:
              type: string
              example: НИУ ВШЭ
            course:
              type: integer
              example: 3
            city:
              type: string
              example: Москва
            work_format:
              type: string
              enum: [office, hybrid, remote, any]
            desired_hours:
              type: string
              enum: ["40", "20-40", "<20", "any"]
            bio:
              type: string
              example: Студент 3 курса, увлекаюсь backend-разработкой
            portfolio_url:
              type: string
              example: https://portfolio.me
            github_url:
              type: string
              example: https://github.com/ivan
            experience:
              type: string
              example: Фриланс-проекты на Python
            skills:
              type: array
              items:
                type: string
              example: ["Python", "SQL", "Docker"]
    responses:
      200:
        description: Профиль обновлён
    """
    data = request.get_json()
    student = user.student

    simple_fields = [
        "first_name", "last_name", "patronymic", "university", "faculty",
        "course", "speciality", "city", "work_format", "desired_hours",
        "bio", "portfolio_url", "github_url", "experience", "certificates",
    ]
    for field in simple_fields:
        if field in data:
            value = data[field]
            if field == "course":
                value = int(value)
            setattr(student, field, value)

    if "skills" in data:
        student.skills = get_or_create_skills(data["skills"])

    db.session.commit()
    return jsonify({"student": student.to_dict(extended=True)}), 200


@app.route("/api/students/<int:student_id>", methods=["GET"])
@jwt_required()
def get_student_profile(student_id):
    """
    Просмотр профиля студента
    ---
    tags:
      - 2. Студент
    security:
      - Bearer: []
    parameters:
      - name: student_id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Профиль студента (компании видят расширенный профиль)
      404:
        description: Студент не найден
    """
    student = db.session.get(Student, student_id)
    if not student:
        return jsonify({"error": "Студент не найден"}), 404

    user = db.session.get(User, get_jwt_identity())
    show_extended = (user.role == "company") or (user.student and user.student.id == student_id)
    return jsonify({"student": student.to_dict(extended=show_extended)}), 200


@app.route("/api/students/resume", methods=["POST"])
@role_required("student")
def upload_resume(user):
    """
    Загрузка резюме (PDF)
    ---
    tags:
      - 2. Студент
    security:
      - Bearer: []
    consumes:
      - multipart/form-data
    parameters:
      - name: file
        in: formData
        type: file
        required: true
        description: PDF-файл резюме
    responses:
      200:
        description: Резюме загружено
      400:
        description: Файл не прикреплён или неверный формат
    """
    if "file" not in request.files:
        return jsonify({"error": "Файл не прикреплён"}), 400

    file = request.files["file"]
    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Допускается только PDF"}), 400

    filename = f"resume_{user.id}_{file.filename}"
    filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    file.save(filepath)

    user.student.resume_filename = filename
    db.session.commit()

    return jsonify({"message": "Резюме загружено", "filename": filename}), 200


# ═══════════════════════════════════════════════════════
#  INTERNSHIPS — Стажировки (публичные)
# ═══════════════════════════════════════════════════════

@app.route("/api/internships", methods=["GET"])
def list_internships():
    """
    Лента стажировок с фильтрацией
    ---
    tags:
      - 3. Стажировки
    parameters:
      - name: city
        in: query
        type: string
        description: Город
        example: Москва
      - name: direction
        in: query
        type: string
        description: Направление (IT, Маркетинг, Аналитика, Дизайн)
        example: IT
      - name: work_format
        in: query
        type: string
        enum: [office, hybrid, remote]
        description: Формат работы
      - name: required_experience
        in: query
        type: string
        enum: [none, "<1year", "1-3years"]
        description: Требуемый опыт
      - name: compatible_with_study
        in: query
        type: boolean
        description: Совместимо с очным обучением
        example: true
      - name: min_salary
        in: query
        type: integer
        description: Минимальная зарплата
        example: 30000
      - name: max_hours
        in: query
        type: integer
        description: Максимум часов в неделю
        example: 20
      - name: search
        in: query
        type: string
        description: Поиск по названию и описанию
        example: Python
      - name: sort
        in: query
        type: string
        enum: [newest, salary_desc, deadline]
        description: Сортировка
        default: newest
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
    responses:
      200:
        description: Список стажировок с пагинацией
    """
    query = Internship.query.filter_by(moderation_status="published")

    if city := request.args.get("city"):
        query = query.filter(Internship.city.ilike(f"%{city}%"))
    if direction := request.args.get("direction"):
        query = query.filter(Internship.direction.ilike(f"%{direction}%"))
    if wf := request.args.get("work_format"):
        query = query.filter(Internship.work_format == wf)
    if exp := request.args.get("required_experience"):
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
    if sort == "salary_desc":
        query = query.order_by(Internship.salary_max.desc())
    elif sort == "deadline":
        query = query.order_by(Internship.deadline.asc().nullslast())
    else:
        query = query.order_by(Internship.created_at.desc())

    return jsonify(paginate_query(query)), 200


@app.route("/api/internships/<int:internship_id>", methods=["GET"])
def get_internship(internship_id):
    """
    Детальная карточка стажировки
    ---
    tags:
      - 3. Стажировки
    parameters:
      - name: internship_id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Полная информация о стажировке
      404:
        description: Стажировка не найдена
    """
    internship = db.session.get(Internship, internship_id)
    if not internship:
        return jsonify({"error": "Стажировка не найдена"}), 404
    return jsonify({"internship": internship.to_dict()}), 200


@app.route("/api/internships/recommendations", methods=["GET"])
@role_required("student")
def get_recommendations(user):
    """
    Рекомендации «вам может подойти»
    ---
    tags:
      - 3. Стажировки
    security:
      - Bearer: []
    description: >
      Matching-алгоритм подбирает стажировки по профилю студента:
      город, формат работы, навыки, специальность, занятость.
      Возвращает топ-10 с процентом совпадения и причинами.
      Требуется авторизация студента.
    responses:
      200:
        description: Список рекомендаций с match_score и match_reasons
    """
    student = user.student
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

        if student.work_format != "any":
            if internship.work_format == student.work_format:
                score += 15
                reasons.append("формат работы")

        if internship.compatible_with_study:
            score += 15
            reasons.append("совместимо с учёбой")

        internship_skill_ids = {s.id for s in internship.required_skills}
        if student_skill_ids and internship_skill_ids:
            overlap = student_skill_ids & internship_skill_ids
            if overlap:
                skill_score = int(30 * len(overlap) / len(internship_skill_ids))
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
    return jsonify({"recommendations": scored[:10]}), 200


# ═══════════════════════════════════════════════════════
#  COMPANY — CRUD стажировок
# ═══════════════════════════════════════════════════════

@app.route("/api/company/internships", methods=["POST"])
@role_required("company")
def create_internship(user):
    """
    Создать стажировку
    ---
    tags:
      - 4. Компания
    security:
      - Bearer: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required: [title, direction, description, work_format]
          properties:
            title:
              type: string
              example: Стажёр-разработчик
            direction:
              type: string
              example: IT
            description:
              type: string
              example: Разработка микросервисов на Python
            requirements:
              type: string
              example: Python, SQL, Git
            selection_stages:
              type: string
              example: Тестовое → Интервью → Оффер
            work_format:
              type: string
              enum: [office, hybrid, remote]
              example: hybrid
            schedule:
              type: string
              example: Свободный
            min_hours:
              type: integer
              example: 20
            max_hours:
              type: integer
              example: 40
            compatible_with_study:
              type: boolean
              example: true
            salary_min:
              type: integer
              example: 40000
            salary_max:
              type: integer
              example: 60000
            is_paid:
              type: boolean
              example: true
            city:
              type: string
              example: Москва
            counts_as_practice:
              type: boolean
              example: false
            required_experience:
              type: string
              enum: [none, "<1year", "1-3years"]
              example: none
            deadline:
              type: string
              format: date
              example: "2026-06-01"
            skills:
              type: array
              items:
                type: string
              example: ["Python", "SQL", "Docker"]
    responses:
      201:
        description: Стажировка создана (статус — pending, ожидает модерации)
      400:
        description: Отсутствуют обязательные поля
    """
    data = request.get_json()
    company = user.company

    required = ["title", "direction", "description", "work_format"]
    missing = [f for f in required if not data.get(f)]
    if missing:
        return jsonify({"error": f"Отсутствуют поля: {', '.join(missing)}"}), 400

    internship = Internship(
        company_id=company.id,
        title=data["title"],
        direction=data["direction"],
        description=data["description"],
        requirements=data.get("requirements", ""),
        selection_stages=data.get("selection_stages", ""),
        work_format=data["work_format"],
        schedule=data.get("schedule", ""),
        min_hours=data.get("min_hours", 0),
        max_hours=data.get("max_hours", 40),
        compatible_with_study=data.get("compatible_with_study", False),
        salary_min=data.get("salary_min", 0),
        salary_max=data.get("salary_max", 0),
        is_paid=data.get("is_paid", True),
        city=data.get("city", company.city),
        counts_as_practice=data.get("counts_as_practice", False),
        required_experience=data.get("required_experience", "none"),
        moderation_status="pending",
    )

    if data.get("deadline"):
        internship.deadline = date.fromisoformat(data["deadline"])

    if data.get("skills"):
        internship.required_skills = get_or_create_skills(data["skills"])

    db.session.add(internship)
    db.session.commit()

    return jsonify({"internship": internship.to_dict()}), 201


@app.route("/api/company/internships", methods=["GET"])
@role_required("company")
def list_company_internships(user):
    """
    Мои вакансии (для компании)
    ---
    tags:
      - 4. Компания
    security:
      - Bearer: []
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
    responses:
      200:
        description: Список вакансий компании со статусами модерации
    """
    query = Internship.query.filter_by(company_id=user.company.id)\
        .order_by(Internship.created_at.desc())
    return jsonify(paginate_query(query)), 200


@app.route("/api/company/internships/<int:internship_id>", methods=["PUT"])
@role_required("company")
def update_internship(user, internship_id):
    """
    Редактировать стажировку
    ---
    tags:
      - 4. Компания
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
          properties:
            title:
              type: string
            description:
              type: string
            salary_min:
              type: integer
            salary_max:
              type: integer
            deadline:
              type: string
              format: date
            skills:
              type: array
              items:
                type: string
    responses:
      200:
        description: Стажировка обновлена
      404:
        description: Стажировка не найдена
    """
    internship = db.session.get(Internship, internship_id)
    if not internship or internship.company_id != user.company.id:
        return jsonify({"error": "Стажировка не найдена"}), 404

    data = request.get_json()
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
        internship.deadline = date.fromisoformat(data["deadline"]) if data["deadline"] else None

    if "skills" in data:
        internship.required_skills = get_or_create_skills(data["skills"])

    db.session.commit()
    return jsonify({"internship": internship.to_dict()}), 200


@app.route("/api/company/internships/<int:internship_id>", methods=["DELETE"])
@role_required("company")
def delete_internship(user, internship_id):
    """
    Удалить стажировку
    ---
    tags:
      - 4. Компания
    security:
      - Bearer: []
    parameters:
      - name: internship_id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Стажировка удалена
      404:
        description: Стажировка не найдена
    """
    internship = db.session.get(Internship, internship_id)
    if not internship or internship.company_id != user.company.id:
        return jsonify({"error": "Стажировка не найдена"}), 404

    db.session.delete(internship)
    db.session.commit()
    return jsonify({"message": "Стажировка удалена"}), 200


# ═══════════════════════════════════════════════════════
#  APPLICATIONS — Отклики
# ═══════════════════════════════════════════════════════

@app.route("/api/applications", methods=["POST"])
@role_required("student")
def apply_to_internship(user):
    """
    Откликнуться на стажировку
    ---
    tags:
      - 5. Отклики
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
            internship_id:
              type: integer
              example: 1
            cover_letter:
              type: string
              example: Хочу у вас стажироваться, есть опыт с Python!
    responses:
      201:
        description: Отклик создан
      404:
        description: Стажировка не найдена или не опубликована
      409:
        description: Уже откликались на эту стажировку
    """
    data = request.get_json()
    internship_id = data.get("internship_id")

    internship = db.session.get(Internship, internship_id)
    if not internship or internship.moderation_status != "published":
        return jsonify({"error": "Стажировка не найдена или не опубликована"}), 404

    existing = Application.query.filter_by(
        student_id=user.student.id, internship_id=internship_id
    ).first()
    if existing:
        return jsonify({"error": "Вы уже откликнулись на эту стажировку"}), 409

    application = Application(
        student_id=user.student.id,
        internship_id=internship_id,
        cover_letter=data.get("cover_letter", ""),
    )
    db.session.add(application)
    db.session.commit()

    return jsonify({"application": application.to_dict()}), 201


@app.route("/api/applications", methods=["GET"])
@role_required("student")
def list_my_applications(user):
    """
    Мои отклики (для студента)
    ---
    tags:
      - 5. Отклики
    security:
      - Bearer: []
    description: >
      Список всех откликов студента с текущими статусами:
      applied → interview → offer / rejected / withdrawn
    responses:
      200:
        description: Список откликов с информацией о стажировках
    """
    query = Application.query.filter_by(student_id=user.student.id)\
        .order_by(Application.created_at.desc())

    applications = query.all()
    result = []
    for app_item in applications:
        data = app_item.to_dict()
        data["internship"] = app_item.internship.to_dict()
        result.append(data)

    return jsonify({"applications": result}), 200


@app.route("/api/applications/<int:application_id>/withdraw", methods=["POST"])
@role_required("student")
def withdraw_application(user, application_id):
    """
    Отозвать отклик
    ---
    tags:
      - 5. Отклики
    security:
      - Bearer: []
    parameters:
      - name: application_id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Отклик отозван
      404:
        description: Отклик не найден
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
    """
    Отклики на вакансию (для компании)
    ---
    tags:
      - 5. Отклики
    security:
      - Bearer: []
    parameters:
      - name: internship_id
        in: path
        type: integer
        required: true
        example: 1
    responses:
      200:
        description: Список откликов с расширенными профилями студентов
      404:
        description: Стажировка не найдена
    """
    internship = db.session.get(Internship, internship_id)
    if not internship or internship.company_id != user.company.id:
        return jsonify({"error": "Стажировка не найдена"}), 404

    applications = Application.query.filter_by(internship_id=internship_id)\
        .order_by(Application.created_at.desc()).all()

    result = []
    for app_item in applications:
        data = app_item.to_dict()
        data["student"] = app_item.student.to_dict(extended=True)
        result.append(data)

    return jsonify({"applications": result}), 200


@app.route("/api/company/applications/<int:application_id>/status", methods=["PUT"])
@role_required("company")
def update_application_status(user, application_id):
    """
    Изменить статус отклика
    ---
    tags:
      - 5. Отклики
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
    responses:
      200:
        description: Статус обновлён
      400:
        description: Недопустимый статус
      404:
        description: Отклик не найден
    """
    application = db.session.get(Application, application_id)
    if not application:
        return jsonify({"error": "Отклик не найден"}), 404

    if application.internship.company_id != user.company.id:
        return jsonify({"error": "Доступ запрещён"}), 403

    new_status = request.get_json().get("status")
    valid = ["applied", "interview", "offer", "rejected"]
    if new_status not in valid:
        return jsonify({"error": f"Допустимые статусы: {', '.join(valid)}"}), 400

    application.status = new_status
    db.session.commit()
    return jsonify({"application": application.to_dict()}), 200


# ═══════════════════════════════════════════════════════
#  BOOKMARKS — Отложенные стажировки
# ═══════════════════════════════════════════════════════

@app.route("/api/bookmarks", methods=["POST"])
@role_required("student")
def add_bookmark(user):
    """
    Отложить стажировку
    ---
    tags:
      - 6. Закладки
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
            internship_id:
              type: integer
              example: 2
    responses:
      201:
        description: Добавлено в отложенные
      409:
        description: Уже в отложенных
    """
    internship_id = request.get_json().get("internship_id")

    existing = Bookmark.query.filter_by(
        student_id=user.student.id, internship_id=internship_id
    ).first()
    if existing:
        return jsonify({"error": "Уже в отложенных"}), 409

    bookmark = Bookmark(student_id=user.student.id, internship_id=internship_id)
    db.session.add(bookmark)
    db.session.commit()

    return jsonify({"bookmark": bookmark.to_dict()}), 201


@app.route("/api/bookmarks", methods=["GET"])
@role_required("student")
def list_bookmarks(user):
    """
    Список отложенных стажировок
    ---
    tags:
      - 6. Закладки
    security:
      - Bearer: []
    responses:
      200:
        description: Список отложенных стажировок
    """
    bookmarks = Bookmark.query.filter_by(student_id=user.student.id)\
        .order_by(Bookmark.created_at.desc()).all()

    result = []
    for bm in bookmarks:
        data = bm.to_dict()
        if bm.internship:
            data["internship"] = bm.internship.to_dict()
        result.append(data)

    return jsonify({"bookmarks": result}), 200


@app.route("/api/bookmarks/<int:internship_id>", methods=["DELETE"])
@role_required("student")
def remove_bookmark(user, internship_id):
    """
    Убрать из отложенных
    ---
    tags:
      - 6. Закладки
    security:
      - Bearer: []
    parameters:
      - name: internship_id
        in: path
        type: integer
        required: true
        example: 2
    responses:
      200:
        description: Удалено из отложенных
      404:
        description: Закладка не найдена
    """
    bookmark = Bookmark.query.filter_by(
        student_id=user.student.id, internship_id=internship_id
    ).first()
    if not bookmark:
        return jsonify({"error": "Закладка не найдена"}), 404

    db.session.delete(bookmark)
    db.session.commit()
    return jsonify({"message": "Удалено из отложенных"}), 200


# ═══════════════════════════════════════════════════════
#  ADMIN / MODERATION — Модерация вакансий
# ═══════════════════════════════════════════════════════

@app.route("/api/admin/internships/pending", methods=["GET"])
@jwt_required()
def list_pending_internships():
    """
    Вакансии на модерации
    ---
    tags:
      - 7. Модерация
    security:
      - Bearer: []
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
    responses:
      200:
        description: Список вакансий со статусом pending
    """
    query = Internship.query.filter_by(moderation_status="pending")\
        .order_by(Internship.created_at.asc())
    return jsonify(paginate_query(query)), 200


@app.route("/api/admin/internships/<int:internship_id>/moderate", methods=["POST"])
@jwt_required()
def moderate_internship(internship_id):
    """
    Одобрить или отклонить вакансию
    ---
    tags:
      - 7. Модерация
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
    responses:
      200:
        description: Статус модерации обновлён
      400:
        description: Недопустимое действие
      404:
        description: Стажировка не найдена
    """
    internship = db.session.get(Internship, internship_id)
    if not internship:
        return jsonify({"error": "Стажировка не найдена"}), 404

    data = request.get_json()
    action = data.get("action")

    if action == "approve":
        internship.moderation_status = "published"
        internship.is_verified = True
        internship.last_confirmed_at = datetime.now(timezone.utc)
    elif action == "reject":
        internship.moderation_status = "rejected"
    else:
        return jsonify({"error": "Допустимые действия: approve, reject"}), 400

    db.session.commit()
    return jsonify({"internship": internship.to_dict()}), 200


# ═══════════════════════════════════════════════════════
#  SKILLS — Справочник навыков
# ═══════════════════════════════════════════════════════

@app.route("/api/skills", methods=["GET"])
def list_skills():
    """
    Справочник навыков
    ---
    tags:
      - 8. Справочники
    parameters:
      - name: search
        in: query
        type: string
        description: Поиск по названию навыка
        example: Py
    responses:
      200:
        description: Список навыков (макс. 50)
    """
    search = request.args.get("search", "")
    query = Skill.query
    if search:
        query = query.filter(Skill.name.ilike(f"%{search}%"))
    skills = query.order_by(Skill.name).limit(50).all()
    return jsonify({"skills": [s.to_dict() for s in skills]}), 200


# ═══════════════════════════════════════════════════════
#  HEALTH CHECK
# ═══════════════════════════════════════════════════════

@app.route("/api/health", methods=["GET"])
def health():
    """
    Проверка работоспособности
    ---
    tags:
      - 8. Справочники
    responses:
      200:
        description: Сервер работает
    """
    return jsonify({"status": "ok", "version": "1.0.0"}), 200


# ═══════════════════════════════════════════════════════
#  Запуск
# ═══════════════════════════════════════════════════════

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print("База данных создана.")
        print("Сервер запущен:  http://localhost:5051")
        print("Swagger UI:     http://localhost:5051/apidocs")
    app.run(debug=True, host="0.0.0.0", port=5051)
