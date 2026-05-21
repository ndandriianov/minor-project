"""
Модели базы данных для платформы стажировок.
Роли: Студент (Student), Компания (Company), Админ.
"""

from datetime import datetime, timezone, timedelta
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


def _aware(dt):
    """SQLite не сохраняет tzinfo — приводим naive к UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


student_skills = db.Table(
    "student_skills",
    db.Column("student_id", db.Integer, db.ForeignKey("students.id"), primary_key=True),
    db.Column("skill_id", db.Integer, db.ForeignKey("skills.id"), primary_key=True),
)

internship_skills = db.Table(
    "internship_skills",
    db.Column("internship_id", db.Integer, db.ForeignKey("internships.id"), primary_key=True),
    db.Column("skill_id", db.Integer, db.ForeignKey("skills.id"), primary_key=True),
)


class Skill(db.Model):
    __tablename__ = "skills"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class University(db.Model):
    __tablename__ = "universities"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), unique=True, nullable=False)
    city = db.Column(db.String(100), default="")

    def to_dict(self):
        return {"id": self.id, "name": self.name, "city": self.city}


class Faculty(db.Model):
    __tablename__ = "faculties"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    university_id = db.Column(db.Integer, db.ForeignKey("universities.id"), nullable=True)
    __table_args__ = (db.UniqueConstraint("name", "university_id", name="uq_faculty"),)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "university_id": self.university_id}


class City(db.Model):
    __tablename__ = "cities"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name}


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    student = db.relationship("Student", backref="user", uselist=False, cascade="all, delete-orphan")
    company = db.relationship("Company", backref="user", uselist=False, cascade="all, delete-orphan")
    subscription = db.relationship("Subscription", backref="user", uselist=False, cascade="all, delete-orphan")
    notifications = db.relationship("Notification", backref="user", cascade="all, delete-orphan")
    payments = db.relationship("Payment", backref="user", cascade="all, delete-orphan")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def has_active_premium(self):
        sub = self.subscription
        if not sub or sub.status != "active":
            return False
        exp = _aware(sub.expires_at)
        if exp and exp < datetime.now(timezone.utc):
            return False
        return sub.plan in ("premium", "b2b")

    def has_active_b2b(self):
        sub = self.subscription
        if not sub or sub.status != "active":
            return False
        exp = _aware(sub.expires_at)
        if exp and exp < datetime.now(timezone.utc):
            return False
        return sub.plan == "b2b"

    def to_dict(self):
        return {
            "id": self.id,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "is_premium": self.has_active_premium(),
            "is_b2b": self.has_active_b2b(),
        }


class Student(db.Model):
    __tablename__ = "students"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    patronymic = db.Column(db.String(100), default="")
    university = db.Column(db.String(255), nullable=False)
    faculty = db.Column(db.String(255), default="")
    course = db.Column(db.Integer, nullable=False)
    speciality = db.Column(db.String(255), default="")
    city = db.Column(db.String(100), nullable=False)

    work_format = db.Column(db.String(50), default="any")
    desired_hours = db.Column(db.String(50), default="any")

    bio = db.Column(db.Text, default="")
    portfolio_url = db.Column(db.String(500), default="")
    github_url = db.Column(db.String(500), default="")
    resume_filename = db.Column(db.String(255), default="")
    experience = db.Column(db.Text, default="")
    certificates = db.Column(db.Text, default="")

    is_boosted = db.Column(db.Boolean, default=False)
    boosted_until = db.Column(db.DateTime, nullable=True)

    skills = db.relationship("Skill", secondary=student_skills, backref="students")
    applications = db.relationship("Application", backref="student", cascade="all, delete-orphan")
    bookmarks = db.relationship("Bookmark", backref="student", cascade="all, delete-orphan")
    reviews = db.relationship("Review", backref="student", cascade="all, delete-orphan")

    def is_currently_boosted(self):
        if not self.is_boosted:
            return False
        bu = _aware(self.boosted_until)
        if bu and bu < datetime.now(timezone.utc):
            return False
        return True

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
            "is_boosted": self.is_currently_boosted(),
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
    __tablename__ = "companies"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)

    name = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, default="")
    website = db.Column(db.String(500), default="")
    logo_url = db.Column(db.String(500), default="")
    city = db.Column(db.String(100), default="")
    posting_limit = db.Column(db.Integer, default=3)  # лимит активных вакансий для бесплатного тарифа

    internships = db.relationship("Internship", backref="company", cascade="all, delete-orphan")
    reviews = db.relationship("Review", backref="company", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.name,
            "description": self.description,
            "website": self.website,
            "logo_url": self.logo_url,
            "city": self.city,
            "posting_limit": self.posting_limit,
        }


class Internship(db.Model):
    __tablename__ = "internships"
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)

    title = db.Column(db.String(255), nullable=False)
    direction = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=False)
    requirements = db.Column(db.Text, default="")
    selection_stages = db.Column(db.Text, default="")

    work_format = db.Column(db.String(50), nullable=False)
    schedule = db.Column(db.String(100), default="")
    min_hours = db.Column(db.Integer, default=0)
    max_hours = db.Column(db.Integer, default=40)
    compatible_with_study = db.Column(db.Boolean, default=False)

    salary_min = db.Column(db.Integer, default=0)
    salary_max = db.Column(db.Integer, default=0)
    is_paid = db.Column(db.Boolean, default=True)

    city = db.Column(db.String(100), default="")
    counts_as_practice = db.Column(db.Boolean, default=False)
    required_experience = db.Column(db.String(50), default="none")
    deadline = db.Column(db.Date, nullable=True)

    moderation_status = db.Column(db.String(20), default="pending")
    is_verified = db.Column(db.Boolean, default=False)
    last_confirmed_at = db.Column(db.DateTime, nullable=True)

    is_promoted = db.Column(db.Boolean, default=False)
    promoted_until = db.Column(db.DateTime, nullable=True)
    views_count = db.Column(db.Integer, default=0)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

    required_skills = db.relationship("Skill", secondary=internship_skills, backref="internships")
    applications = db.relationship("Application", backref="internship", cascade="all, delete-orphan")
    bookmarks = db.relationship("Bookmark", backref="internship", cascade="all, delete-orphan")
    reviews = db.relationship("Review", backref="internship", cascade="all, delete-orphan")

    def is_currently_promoted(self):
        if not self.is_promoted:
            return False
        pu = _aware(self.promoted_until)
        if pu and pu < datetime.now(timezone.utc):
            return False
        return True

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
            "is_promoted": self.is_currently_promoted(),
            "views_count": self.views_count,
            "last_confirmed_at": self.last_confirmed_at.isoformat() if self.last_confirmed_at else None,
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
    __tablename__ = "applications"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    internship_id = db.Column(db.Integer, db.ForeignKey("internships.id"), nullable=False)
    status = db.Column(db.String(20), default="applied")
    cover_letter = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc),
                           onupdate=lambda: datetime.now(timezone.utc))

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


class Article(db.Model):
    """Раздел Инструменты — статьи (Как написать резюме и т.п.)."""
    __tablename__ = "articles"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500), default="")
    category = db.Column(db.String(100), default="general")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "body": self.body,
            "image_url": self.image_url,
            "category": self.category,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class NewsPost(db.Model):
    """Новостная лента — апдейты о вакансиях, событиях вузов."""
    __tablename__ = "news_posts"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    body = db.Column(db.Text, nullable=False)
    image_url = db.Column(db.String(500), default="")
    category = db.Column(db.String(100), default="news")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "body": self.body,
            "image_url": self.image_url,
            "category": self.category,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Notification(db.Model):
    """Уведомления: приглашения, смена статуса отклика и т.д."""
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    type = db.Column(db.String(50), default="info")
    text = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False)
    application_id = db.Column(db.Integer,
        db.ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    internship_id = db.Column(db.Integer,
        db.ForeignKey("internships.id", ondelete="SET NULL"), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "text": self.text,
            "is_read": self.is_read,
            "application_id": self.application_id,
            "internship_id": self.internship_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Review(db.Model):
    """Отзыв стажёра о компании/вакансии."""
    __tablename__ = "reviews"
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id"), nullable=False)
    company_id = db.Column(db.Integer, db.ForeignKey("companies.id"), nullable=False)
    internship_id = db.Column(db.Integer, db.ForeignKey("internships.id"), nullable=True)
    rating = db.Column(db.Integer, nullable=False)  # 1..5
    text = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self, include_student=False):
        data = {
            "id": self.id,
            "student_id": self.student_id,
            "company_id": self.company_id,
            "internship_id": self.internship_id,
            "rating": self.rating,
            "text": self.text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_student and self.student:
            data["student_name"] = f"{self.student.first_name} {self.student.last_name[:1]}."
        return data


class Subscription(db.Model):
    """Подписка пользователя: free / premium / b2b."""
    __tablename__ = "subscriptions"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    plan = db.Column(db.String(20), default="free")  # free / premium / b2b
    status = db.Column(db.String(20), default="active")  # active / expired / cancelled
    started_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan": self.plan,
            "status": self.status,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
        }


class Payment(db.Model):
    """Запись о платеже. Шлюз: DonationAlerts (или mock, если не настроен)."""
    __tablename__ = "payments"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    plan = db.Column(db.String(20), nullable=False)  # premium / b2b
    amount = db.Column(db.Integer, nullable=False)  # в рублях
    period_days = db.Column(db.Integer, default=30)
    status = db.Column(db.String(20), default="pending")  # pending / paid / failed / expired
    provider = db.Column(db.String(20), default="mock")  # donationalerts / mock
    external_id = db.Column(db.String(100), default="")  # уникальный код для match по сообщению
    da_donation_id = db.Column(db.BigInteger, nullable=True)  # ID доната в DonationAlerts
    da_amount = db.Column(db.Integer, nullable=True)  # фактически уплачено (на случай неполной суммы)
    da_currency = db.Column(db.String(10), default="")
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    paid_at = db.Column(db.DateTime, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "plan": self.plan,
            "amount": self.amount,
            "period_days": self.period_days,
            "status": self.status,
            "provider": self.provider,
            "external_id": self.external_id,
            "da_donation_id": self.da_donation_id,
            "da_amount": self.da_amount,
            "da_currency": self.da_currency,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
        }
