"""
Модели базы данных для платформы стажировок.
Две роли: Студент (Student) и Компания (Company).
"""

from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

# Explicitly use pbkdf2 for compatibility with Python builds where hashlib.scrypt is unavailable.
PASSWORD_HASH_METHOD = "pbkdf2:sha256"

db = SQLAlchemy()


# ─── Связь "многие ко многим": навыки студента ───
student_skills = db.Table(
    "student_skills",
    db.Column("student_id", db.Integer, db.ForeignKey("students.id"), primary_key=True),
    db.Column("skill_id", db.Integer, db.ForeignKey("skills.id"), primary_key=True),
)

# ─── Связь "многие ко многим": требуемые навыки вакансии ───
internship_skills = db.Table(
    "internship_skills",
    db.Column("internship_id", db.Integer, db.ForeignKey("internships.id"), primary_key=True),
    db.Column("skill_id", db.Integer, db.ForeignKey("skills.id"), primary_key=True),
)


class Skill(db.Model):
    """Справочник навыков (Python, Excel, Figma и т.д.)"""
    __tablename__ = "skills"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class User(db.Model):
    """
    Базовая модель пользователя.
    role: 'student' | 'company'
    """
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'student' или 'company'
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # Связи
    student = db.relationship("Student", backref="user", uselist=False, cascade="all, delete-orphan")
    company = db.relationship("Company", backref="user", uselist=False, cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password, method=PASSWORD_HASH_METHOD)

    def check_password(self, password):
        try:
            return check_password_hash(self.password_hash, password)
        except (AttributeError, ValueError):
            # Some Python builds do not provide hashlib.scrypt; treat unsupported legacy hashes as invalid.
            return False

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Student(db.Model):
    """
    Профиль студента.
    Базовый: ФИО, вуз, факультет, курс, направление, город, формат, занятость.
    Расширенный: навыки, портфолио, резюме, опыт.
    """
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    # Базовый профиль
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    patronymic = db.Column(db.String(100), default="")
    university = db.Column(db.String(255), nullable=False)
    faculty = db.Column(db.String(255), default="")
    course = db.Column(db.Integer, nullable=False)  # 1-6
    speciality = db.Column(db.String(255), default="")
    city = db.Column(db.String(100), nullable=False)

    # Предпочтения по работе
    work_format = db.Column(db.String(50), default="any")  # office / hybrid / remote / any
    desired_hours = db.Column(db.String(50), default="any")  # 40 / 20-40 / <20 / any

    # Расширенный профиль
    bio = db.Column(db.Text, default="")
    portfolio_url = db.Column(db.String(500), default="")
    github_url = db.Column(db.String(500), default="")
    resume_filename = db.Column(db.String(255), default="")
    experience = db.Column(db.Text, default="")
    certificates = db.Column(db.Text, default="")

    # Связи
    skills = db.relationship("Skill", secondary=student_skills, backref="students")
    applications = db.relationship("Application", backref="student", cascade="all, delete-orphan")
    bookmarks = db.relationship("Bookmark", backref="student", cascade="all, delete-orphan")

    def to_dict(self, extended=False):
        data = {
            "id": self.id,
            "user_id": self.user_id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "patronymic": self.patronymic,
            "university": self.university,
            "faculty": self.faculty,
            "course": self.course,
            "speciality": self.speciality,
            "city": self.city,
            "work_format": self.work_format,
            "desired_hours": self.desired_hours,
        }
        if extended:
            data.update({
                "bio": self.bio,
                "portfolio_url": self.portfolio_url,
                "github_url": self.github_url,
                "resume_filename": self.resume_filename,
                "experience": self.experience,
                "certificates": self.certificates,
                "skills": [s.to_dict() for s in self.skills],
            })
        return data


class Company(db.Model):
    """Профиль компании / работодателя."""
    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default="")
    website = db.Column(db.String(500), default="")
    logo_url = db.Column(db.String(500), default="")
    city = db.Column(db.String(100), default="")

    # Связи
    internships = db.relationship("Internship", backref="company", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "website": self.website,
            "logo_url": self.logo_url,
            "city": self.city,
        }


class Internship(db.Model):
    """
    Вакансия / стажировка.
    Статусы модерации: pending, published, rejected, archived.
    """
    __tablename__ = "internships"

    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)

    # Основные поля
    title = db.Column(db.String(255), nullable=False)
    direction = db.Column(db.String(100), nullable=False)  # IT, маркетинг, аналитика и т.д.
    description = db.Column(db.Text, nullable=False)
    requirements = db.Column(db.Text, default="")
    selection_stages = db.Column(db.Text, default="")  # Этапы отбора

    # Формат и график
    work_format = db.Column(db.String(50), nullable=False)  # office / hybrid / remote
    schedule = db.Column(db.String(100), default="")  # Свободный, 5/2, 2/2 и пр.
    min_hours = db.Column(db.Integer, default=0)
    max_hours = db.Column(db.Integer, default=40)
    compatible_with_study = db.Column(db.Boolean, default=False)  # Совместимо с очным обучением

    # Оплата
    salary_min = db.Column(db.Integer, default=0)
    salary_max = db.Column(db.Integer, default=0)
    is_paid = db.Column(db.Boolean, default=True)

    # Прочее
    city = db.Column(db.String(100), default="")
    counts_as_practice = db.Column(db.Boolean, default=False)  # Засчитывается за практику
    required_experience = db.Column(db.String(50), default="none")  # none / <1year / 1-3years
    deadline = db.Column(db.Date, nullable=True)

    # Модерация
    moderation_status = db.Column(db.String(20), default="pending")  # pending / published / rejected / archived
    is_verified = db.Column(db.Boolean, default=False)  # Метка «проверено»
    last_confirmed_at = db.Column(db.DateTime, nullable=True)  # Последнее подтверждение актуальности

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Связи
    required_skills = db.relationship("Skill", secondary=internship_skills, backref="internships")
    applications = db.relationship("Application", backref="internship", cascade="all, delete-orphan")
    bookmarks = db.relationship("Bookmark", backref="internship", cascade="all, delete-orphan")

    def to_dict(self, include_company=True):
        data = {
            "id": self.id,
            "company_id": self.company_id,
            "title": self.title,
            "direction": self.direction,
            "description": self.description,
            "requirements": self.requirements,
            "selection_stages": self.selection_stages,
            "work_format": self.work_format,
            "schedule": self.schedule,
            "min_hours": self.min_hours,
            "max_hours": self.max_hours,
            "compatible_with_study": self.compatible_with_study,
            "salary_min": self.salary_min,
            "salary_max": self.salary_max,
            "is_paid": self.is_paid,
            "city": self.city,
            "counts_as_practice": self.counts_as_practice,
            "required_experience": self.required_experience,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "moderation_status": self.moderation_status,
            "is_verified": self.is_verified,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "required_skills": [s.to_dict() for s in self.required_skills],
        }
        if include_company and self.company:
            data["company"] = {
                "id": self.company.id,
                "name": self.company.name,
                "logo_url": self.company.logo_url,
            }
        return data


class Application(db.Model):
    """
    Отклик студента на стажировку.
    Статусы: applied, interview, offer, rejected, withdrawn.
    """
    __tablename__ = "applications"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    internship_id = db.Column(db.Integer, db.ForeignKey("internships.id"), nullable=False)
    status = db.Column(db.String(20), default="applied")  # applied / interview / offer / rejected / withdrawn
    cover_letter = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    # Уникальность: один студент — один отклик на вакансию
    __table_args__ = (db.UniqueConstraint("student_id", "internship_id", name="uq_student_internship"),)

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "internship_id": self.internship_id,
            "status": self.status,
            "cover_letter": self.cover_letter,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Bookmark(db.Model):
    """Отложенные вакансии студента."""
    __tablename__ = "bookmarks"

    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    internship_id = db.Column(db.Integer, db.ForeignKey("internships.id"), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (db.UniqueConstraint("student_id", "internship_id", name="uq_bookmark"),)

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "internship_id": self.internship_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
