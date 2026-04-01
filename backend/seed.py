"""
Скрипт заполнения базы тестовыми данными.
Запуск: python seed.py
"""

from datetime import date, timedelta
from app import app
from models import db, User, Student, Company, Internship, Skill, Application, Bookmark

SKILLS_LIST = [
    "Python", "JavaScript", "TypeScript", "React", "Vue.js",
    "HTML/CSS", "SQL", "PostgreSQL", "Git", "Docker",
    "Figma", "Adobe Photoshop", "Excel", "Google Sheets",
    "1С", "Power BI", "Tableau", "R",
    "Machine Learning", "Data Analysis",
    "Копирайтинг", "SMM", "SEO", "Google Analytics",
    "Управление проектами", "Agile/Scrum",
    "Adobe Premiere", "Adobe Illustrator",
]


def seed():
    with app.app_context():
        db.drop_all()
        db.create_all()

        # ── Навыки ──
        skills = {}
        for name in SKILLS_LIST:
            s = Skill(name=name)
            db.session.add(s)
            skills[name] = s
        db.session.flush()

        # ── Студенты ──
        students_data = [
            {
                "email": "ivan@student.ru", "password": "password123",
                "first_name": "Иван", "last_name": "Петров",
                "university": "НИУ ВШЭ", "faculty": "Факультет компьютерных наук",
                "course": 3, "speciality": "Программная инженерия",
                "city": "Москва", "work_format": "hybrid", "desired_hours": "20-40",
                "skills": ["Python", "JavaScript", "React", "Git", "SQL"],
            },
            {
                "email": "maria@student.ru", "password": "password123",
                "first_name": "Мария", "last_name": "Сидорова",
                "university": "МГУ", "faculty": "Экономический факультет",
                "course": 2, "speciality": "Маркетинг",
                "city": "Москва", "work_format": "remote", "desired_hours": "<20",
                "skills": ["Excel", "Google Analytics", "SMM", "Копирайтинг", "Figma"],
            },
            {
                "email": "alex@student.ru", "password": "password123",
                "first_name": "Алексей", "last_name": "Козлов",
                "university": "ИТМО", "faculty": "Факультет ИТ",
                "course": 4, "speciality": "Data Science",
                "city": "Санкт-Петербург", "work_format": "any", "desired_hours": "20-40",
                "skills": ["Python", "SQL", "Machine Learning", "Data Analysis", "R", "Power BI"],
            },
        ]

        student_objects = []
        for sd in students_data:
            user = User(email=sd["email"], role="student")
            user.set_password(sd["password"])
            db.session.add(user)
            db.session.flush()

            student = Student(
                user_id=user.id,
                first_name=sd["first_name"], last_name=sd["last_name"],
                university=sd["university"], faculty=sd["faculty"],
                course=sd["course"], speciality=sd["speciality"],
                city=sd["city"], work_format=sd["work_format"],
                desired_hours=sd["desired_hours"],
            )
            student.skills = [skills[s] for s in sd["skills"]]
            db.session.add(student)
            student_objects.append(student)

        db.session.flush()

        # ── Компании ──
        companies_data = [
            {
                "email": "hr@yandex.ru", "password": "password123",
                "name": "Яндекс", "description": "Технологическая компания",
                "website": "https://yandex.ru", "city": "Москва",
            },
            {
                "email": "hr@sber.ru", "password": "password123",
                "name": "Сбер", "description": "Крупнейший банк России",
                "website": "https://sber.ru", "city": "Москва",
            },
            {
                "email": "hr@vk.ru", "password": "password123",
                "name": "VK", "description": "Социальная сеть и экосистема",
                "website": "https://vk.com", "city": "Санкт-Петербург",
            },
            {
                "email": "hr@tinkoff.ru", "password": "password123",
                "name": "Т-Банк", "description": "Онлайн-банк и финтех",
                "website": "https://tinkoff.ru", "city": "Москва",
            },
        ]

        company_objects = []
        for cd in companies_data:
            user = User(email=cd["email"], role="company")
            user.set_password(cd["password"])
            db.session.add(user)
            db.session.flush()

            company = Company(
                user_id=user.id, name=cd["name"],
                description=cd["description"], website=cd["website"],
                city=cd["city"],
            )
            db.session.add(company)
            company_objects.append(company)

        db.session.flush()

        # ── Стажировки ──
        internships_data = [
            {
                "company": 0, "title": "Стажёр-разработчик Python",
                "direction": "IT", "work_format": "hybrid",
                "description": "Разработка микросервисов на Python. Работа в продуктовой команде Яндекс.Маркета.",
                "requirements": "Python, знание SQL, базовое понимание REST API.",
                "selection_stages": "Тестовое задание → Техническое интервью → Финальное собеседование",
                "schedule": "Свободный", "min_hours": 20, "max_hours": 40,
                "compatible_with_study": True, "salary_min": 40000, "salary_max": 60000,
                "city": "Москва", "required_experience": "none",
                "deadline": date.today() + timedelta(days=30),
                "skills": ["Python", "SQL", "Git", "Docker"],
                "status": "published",
            },
            {
                "company": 0, "title": "Стажёр-аналитик данных",
                "direction": "Аналитика", "work_format": "remote",
                "description": "Анализ данных пользователей, построение дашбордов, A/B тесты.",
                "requirements": "SQL, Python или R, навыки визуализации данных.",
                "selection_stages": "Тестовое → Интервью",
                "schedule": "Свободный", "min_hours": 15, "max_hours": 30,
                "compatible_with_study": True, "salary_min": 35000, "salary_max": 50000,
                "city": "Москва", "required_experience": "none",
                "deadline": date.today() + timedelta(days=45),
                "skills": ["Python", "SQL", "Data Analysis", "Power BI"],
                "status": "published",
            },
            {
                "company": 1, "title": "Стажёр в команду маркетинга",
                "direction": "Маркетинг", "work_format": "hybrid",
                "description": "Участие в маркетинговых кампаниях, ведение соцсетей, подготовка контента.",
                "requirements": "Навыки копирайтинга, знание SMM, креативность.",
                "selection_stages": "Резюме → Собеседование",
                "schedule": "2-3 дня в неделю", "min_hours": 15, "max_hours": 25,
                "compatible_with_study": True, "salary_min": 25000, "salary_max": 35000,
                "city": "Москва", "required_experience": "none",
                "deadline": date.today() + timedelta(days=20),
                "skills": ["SMM", "Копирайтинг", "Google Analytics", "Figma"],
                "status": "published",
            },
            {
                "company": 1, "title": "Стажёр Data Science",
                "direction": "IT", "work_format": "remote",
                "description": "Работа с ML-моделями в команде AI Lab Сбера. Реальные задачи NLP и CV.",
                "requirements": "Python, библиотеки ML (scikit-learn, PyTorch), математическая статистика.",
                "selection_stages": "Тестовое → Техническое интервью → Оффер",
                "schedule": "Свободный", "min_hours": 20, "max_hours": 40,
                "compatible_with_study": True, "salary_min": 50000, "salary_max": 80000,
                "city": "Москва", "required_experience": "none",
                "deadline": date.today() + timedelta(days=60),
                "skills": ["Python", "Machine Learning", "SQL", "Data Analysis"],
                "status": "published",
            },
            {
                "company": 2, "title": "Стажёр Frontend-разработчик",
                "direction": "IT", "work_format": "office",
                "description": "Разработка интерфейсов ВКонтакте. Стек: React, TypeScript.",
                "requirements": "JavaScript/TypeScript, React, HTML/CSS, Git.",
                "selection_stages": "Тестовое → Код-ревью → Собеседование",
                "schedule": "5/2", "min_hours": 40, "max_hours": 40,
                "compatible_with_study": False, "salary_min": 60000, "salary_max": 80000,
                "city": "Санкт-Петербург", "required_experience": "none",
                "deadline": date.today() + timedelta(days=15),
                "skills": ["JavaScript", "TypeScript", "React", "HTML/CSS", "Git"],
                "status": "published",
            },
            {
                "company": 3, "title": "Стажёр-дизайнер продукта",
                "direction": "Дизайн", "work_format": "remote",
                "description": "Участие в дизайне мобильного приложения Т-Банка. UX-исследования, макеты в Figma.",
                "requirements": "Figma, понимание UX/UI, портфолио.",
                "selection_stages": "Портфолио → Тестовое задание → Финал",
                "schedule": "Свободный", "min_hours": 10, "max_hours": 20,
                "compatible_with_study": True, "salary_min": 30000, "salary_max": 45000,
                "city": "Москва", "required_experience": "none",
                "deadline": date.today() + timedelta(days=40),
                "skills": ["Figma", "Adobe Illustrator"],
                "status": "published",
            },
            {
                "company": 3, "title": "Стажёр бизнес-аналитик",
                "direction": "Аналитика", "work_format": "hybrid",
                "description": "Анализ бизнес-процессов, подготовка требований, работа с продуктовыми метриками.",
                "requirements": "SQL, Excel, системное мышление.",
                "selection_stages": "Кейс → Интервью",
                "schedule": "3 дня в неделю", "min_hours": 20, "max_hours": 30,
                "compatible_with_study": True, "salary_min": 35000, "salary_max": 50000,
                "city": "Москва", "required_experience": "none",
                "deadline": date.today() + timedelta(days=25),
                "skills": ["SQL", "Excel", "Data Analysis"],
                "status": "published",
            },
            {
                "company": 2, "title": "Стажёр контент-менеджер",
                "direction": "Маркетинг", "work_format": "remote",
                "description": "Создание контента для сообществ VK, работа с редакцией, аналитика публикаций.",
                "requirements": "Грамотный русский язык, чувство стиля, знание соцсетей.",
                "selection_stages": "Тестовое задание → Собеседование",
                "schedule": "Свободный", "min_hours": 10, "max_hours": 20,
                "compatible_with_study": True, "salary_min": 20000, "salary_max": 30000,
                "city": "Санкт-Петербург", "required_experience": "none",
                "deadline": date.today() + timedelta(days=35),
                "skills": ["Копирайтинг", "SMM"],
                "status": "published",
            },
        ]

        internship_objects = []
        for d in internships_data:
            i = Internship(
                company_id=company_objects[d["company"]].id,
                title=d["title"], direction=d["direction"],
                description=d["description"], requirements=d["requirements"],
                selection_stages=d["selection_stages"],
                work_format=d["work_format"], schedule=d["schedule"],
                min_hours=d["min_hours"], max_hours=d["max_hours"],
                compatible_with_study=d["compatible_with_study"],
                salary_min=d["salary_min"], salary_max=d["salary_max"],
                is_paid=True, city=d["city"],
                required_experience=d["required_experience"],
                deadline=d["deadline"],
                moderation_status=d["status"],
                is_verified=True,
            )
            i.required_skills = [skills[s] for s in d["skills"]]
            db.session.add(i)
            internship_objects.append(i)

        db.session.flush()

        # ── Тестовые отклики ──
        app1 = Application(
            student_id=student_objects[0].id,
            internship_id=internship_objects[0].id,
            status="interview",
            cover_letter="Хочу пройти стажировку в Яндексе, у меня есть опыт с Python.",
        )
        app2 = Application(
            student_id=student_objects[1].id,
            internship_id=internship_objects[2].id,
            status="applied",
            cover_letter="Интересуюсь маркетингом, веду блог в ВК.",
        )
        app3 = Application(
            student_id=student_objects[2].id,
            internship_id=internship_objects[3].id,
            status="applied",
        )
        db.session.add_all([app1, app2, app3])

        # ── Закладки ──
        bm1 = Bookmark(student_id=student_objects[0].id, internship_id=internship_objects[3].id)
        bm2 = Bookmark(student_id=student_objects[1].id, internship_id=internship_objects[5].id)
        db.session.add_all([bm1, bm2])

        db.session.commit()
        print("Тестовые данные загружены!")
        print(f"  Навыков: {len(SKILLS_LIST)}")
        print(f"  Студентов: {len(students_data)}")
        print(f"  Компаний: {len(companies_data)}")
        print(f"  Стажировок: {len(internships_data)}")
        print(f"  Откликов: 3")
        print()
        print("Тестовые аккаунты:")
        print("  Студент:  ivan@student.ru / password123")
        print("  Студент:  maria@student.ru / password123")
        print("  Студент:  alex@student.ru / password123")
        print("  Компания: hr@yandex.ru / password123")
        print("  Компания: hr@sber.ru / password123")
        print("  Компания: hr@vk.ru / password123")
        print("  Компания: hr@tinkoff.ru / password123")


if __name__ == "__main__":
    seed()
