"""
Скрипт заполнения базы тестовыми данными из JSON.
Запуск: python seed.py
"""

import json
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from app import app
from models import (
    db, User, Student, Company, Internship, Skill, Application, Bookmark,
    University, Faculty, City, Article, NewsPost, Review, Subscription,
)


SEED_DIR = Path(__file__).resolve().parent / "seed"


def load_seed_file(filename):
    path = SEED_DIR / filename
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def get_required(mapping, key, entity_name):
    try:
        return mapping[key]
    except KeyError as exc:
        raise ValueError(f"{entity_name} references unknown key: {key}") from exc


def resolve_deadline(data):
    if "deadline" in data and data["deadline"]:
        return date.fromisoformat(data["deadline"])
    if "deadline_days_from_today" in data:
        return date.today() + timedelta(days=data["deadline_days_from_today"])
    return None


def create_subscription(user_id, plan="free", status="active"):
    expires = datetime.now(timezone.utc) + timedelta(days=30) if plan != "free" else None
    return Subscription(
        user_id=user_id,
        plan=plan,
        status=status,
        started_at=datetime.now(timezone.utc),
        expires_at=expires,
    )


def seed():
    seed_data = {
        "skills": load_seed_file("skills.json"),
        "cities": load_seed_file("cities.json"),
        "universities": load_seed_file("universities.json"),
        "users": load_seed_file("users.json"),
        "students": load_seed_file("students.json"),
        "companies": load_seed_file("companies.json"),
        "internships": load_seed_file("internships.json"),
        "applications": load_seed_file("applications.json"),
        "bookmarks": load_seed_file("bookmarks.json"),
        "articles": load_seed_file("articles.json"),
        "news": load_seed_file("news.json"),
        "reviews": load_seed_file("reviews.json"),
    }

    with app.app_context():
        db.drop_all()
        db.create_all()

        skills = {}
        for name in seed_data["skills"]:
            skill = Skill(name=name)
            db.session.add(skill)
            skills[name] = skill
        db.session.flush()

        for city in seed_data["cities"]:
            db.session.add(City(name=city))

        for university_data in seed_data["universities"]:
            university = University(
                name=university_data["name"],
                city=university_data.get("city", ""),
            )
            db.session.add(university)
            db.session.flush()

            for faculty_name in university_data.get("faculties", []):
                db.session.add(Faculty(name=faculty_name, university_id=university.id))

        student_objects_by_email = {}
        company_objects_by_email = {}
        internship_objects_by_title = {}

        for user_data in seed_data["users"]:
            user = User(email=user_data["email"], role=user_data["role"])
            user.set_password(user_data["password"])
            db.session.add(user)
            db.session.flush()
            db.session.add(create_subscription(
                user_id=user.id,
                plan=user_data.get("subscription", "free"),
                status=user_data.get("subscription_status", "active"),
            ))

        for student_data in seed_data["students"]:
            user = User(email=student_data["email"], role="student")
            user.set_password(student_data["password"])
            db.session.add(user)
            db.session.flush()

            student = Student(
                user_id=user.id,
                first_name=student_data["first_name"],
                last_name=student_data["last_name"],
                patronymic=student_data.get("patronymic", ""),
                university=student_data["university"],
                faculty=student_data.get("faculty", ""),
                course=student_data["course"],
                speciality=student_data.get("speciality", ""),
                city=student_data["city"],
                work_format=student_data.get("work_format", "any"),
                desired_hours=student_data.get("desired_hours", "any"),
                experience=student_data.get("experience", ""),
                bio=student_data.get("bio", ""),
                portfolio_url=student_data.get("portfolio_url", ""),
                github_url=student_data.get("github_url", ""),
                certificates=student_data.get("certificates", ""),
                is_boosted=student_data.get("is_boosted", False),
            )
            student.skills = [
                get_required(skills, skill_name, f"student {student_data['email']}")
                for skill_name in student_data.get("skills", [])
            ]
            db.session.add(student)
            student_objects_by_email[student_data["email"]] = student
            db.session.add(create_subscription(
                user_id=user.id,
                plan=student_data.get("subscription", "free"),
                status=student_data.get("subscription_status", "active"),
            ))

        db.session.flush()

        for company_data in seed_data["companies"]:
            user = User(email=company_data["email"], role="company")
            user.set_password(company_data["password"])
            db.session.add(user)
            db.session.flush()

            company = Company(
                user_id=user.id,
                name=company_data["name"],
                description=company_data.get("description", ""),
                website=company_data.get("website", ""),
                logo_url=company_data.get("logo_url", ""),
                city=company_data.get("city", ""),
                posting_limit=company_data.get("posting_limit", 3),
            )
            db.session.add(company)
            company_objects_by_email[company_data["email"]] = company
            db.session.add(create_subscription(
                user_id=user.id,
                plan=company_data.get("subscription", "free"),
                status=company_data.get("subscription_status", "active"),
            ))

        db.session.flush()

        for internship_data in seed_data["internships"]:
            company = get_required(
                company_objects_by_email,
                internship_data["company_email"],
                f"internship {internship_data['title']}",
            )
            internship = Internship(
                company_id=company.id,
                title=internship_data["title"],
                direction=internship_data["direction"],
                description=internship_data["description"],
                requirements=internship_data.get("requirements", ""),
                selection_stages=internship_data.get("selection_stages", ""),
                work_format=internship_data["work_format"],
                schedule=internship_data.get("schedule", ""),
                min_hours=internship_data.get("min_hours", 0),
                max_hours=internship_data.get("max_hours", 40),
                compatible_with_study=internship_data.get("compatible_with_study", False),
                salary_min=internship_data.get("salary_min", 0),
                salary_max=internship_data.get("salary_max", 0),
                is_paid=internship_data.get("is_paid", True),
                city=internship_data.get("city", ""),
                counts_as_practice=internship_data.get("counts_as_practice", False),
                required_experience=internship_data.get("required_experience", "none"),
                deadline=resolve_deadline(internship_data),
                moderation_status=internship_data.get("status", "pending"),
                is_verified=internship_data.get("is_verified", True),
                last_confirmed_at=datetime.now(timezone.utc),
                is_promoted=internship_data.get("is_promoted", False),
                views_count=internship_data.get("views_count", 0),
            )
            internship.required_skills = [
                get_required(skills, skill_name, f"internship {internship_data['title']}")
                for skill_name in internship_data.get("skills", [])
            ]
            db.session.add(internship)
            internship_objects_by_title[internship.title] = internship

        db.session.flush()

        for application_data in seed_data["applications"]:
            db.session.add(Application(
                student_id=get_required(
                    student_objects_by_email,
                    application_data["student_email"],
                    "application",
                ).id,
                internship_id=get_required(
                    internship_objects_by_title,
                    application_data["internship_title"],
                    "application",
                ).id,
                status=application_data.get("status", "applied"),
                cover_letter=application_data.get("cover_letter", ""),
            ))

        for bookmark_data in seed_data["bookmarks"]:
            db.session.add(Bookmark(
                student_id=get_required(
                    student_objects_by_email,
                    bookmark_data["student_email"],
                    "bookmark",
                ).id,
                internship_id=get_required(
                    internship_objects_by_title,
                    bookmark_data["internship_title"],
                    "bookmark",
                ).id,
            ))

        db.session.add_all([
            Article(
                title=article_data["title"],
                category=article_data.get("category", "general"),
                body=article_data["body"],
                image_url=article_data.get("image_url", ""),
            )
            for article_data in seed_data["articles"]
        ])

        db.session.add_all([
            NewsPost(
                title=news_data["title"],
                body=news_data["body"],
                category=news_data.get("category", "news"),
                image_url=news_data.get("image_url", ""),
            )
            for news_data in seed_data["news"]
        ])

        for review_data in seed_data["reviews"]:
            internship = None
            internship_title = review_data.get("internship_title")
            if internship_title:
                internship = get_required(internship_objects_by_title, internship_title, "review")

            db.session.add(Review(
                student_id=get_required(
                    student_objects_by_email,
                    review_data["student_email"],
                    "review",
                ).id,
                company_id=get_required(
                    company_objects_by_email,
                    review_data["company_email"],
                    "review",
                ).id,
                internship_id=internship.id if internship else None,
                rating=review_data["rating"],
                text=review_data.get("text", ""),
            ))

        db.session.commit()

        print("Тестовые данные загружены!")
        print(f"  Навыков: {len(seed_data['skills'])}")
        print(f"  Студентов: {len(seed_data['students'])}")
        print(f"  Компаний: {len(seed_data['companies'])}")
        print(f"  Вакансий в стартапах: {len(seed_data['internships'])}")
        print(f"  Откликов: {len(seed_data['applications'])}")
        print(f"  Городов: {len(seed_data['cities'])}, Вузов: {len(seed_data['universities'])}")
        print(
            f"  Статей: {len(seed_data['articles'])}, "
            f"Новостей: {len(seed_data['news'])}, "
            f"Отзывов: {len(seed_data['reviews'])}"
        )
        print()
        print("Тестовые аккаунты:")
        for student_data in seed_data["students"]:
            print(f"  Студент:  {student_data['email']} / {student_data['password']}")
        for company_data in seed_data["companies"]:
            print(f"  Компания: {company_data['email']} / {company_data['password']}")
        role_labels = {"admin": "Админ"}
        for user_data in seed_data["users"]:
            role_label = role_labels.get(user_data["role"], user_data["role"].capitalize())
            print(f"  {role_label}:    {user_data['email']} / {user_data['password']}")


if __name__ == "__main__":
    seed()
