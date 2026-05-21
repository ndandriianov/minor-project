"""
Скрипт заполнения базы тестовыми данными.
Запуск: python seed.py
"""

from datetime import date, timedelta, datetime, timezone
from app import app
from models import (
    db, User, Student, Company, Internship, Skill, Application, Bookmark,
    University, Faculty, City, Article, NewsPost, Review, Subscription,
)

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

        # ── Справочники ──
        cities = ["Москва", "Санкт-Петербург", "Казань", "Новосибирск",
                  "Екатеринбург", "Нижний Новгород", "Краснодар", "Уфа"]
        for c in cities:
            db.session.add(City(name=c))

        universities_data = [
            {"name": "НИУ ВШЭ", "city": "Москва",
             "faculties": ["Факультет компьютерных наук", "Экономический факультет",
                           "Факультет права", "Факультет менеджмента"]},
            {"name": "МГУ им. М.В. Ломоносова", "city": "Москва",
             "faculties": ["ВМК", "Экономический факультет", "Физический факультет"]},
            {"name": "МФТИ", "city": "Москва",
             "faculties": ["ФПМИ", "ФУПМ", "ФИВТ"]},
            {"name": "ИТМО", "city": "Санкт-Петербург",
             "faculties": ["Факультет ИТ", "Факультет программной инженерии"]},
            {"name": "СПбГУ", "city": "Санкт-Петербург",
             "faculties": ["Экономический факультет", "Математико-механический факультет"]},
            {"name": "МГТУ им. Баумана", "city": "Москва",
             "faculties": ["ИУ", "РК", "ФН"]},
        ]
        for ud in universities_data:
            u = University(name=ud["name"], city=ud["city"])
            db.session.add(u)
            db.session.flush()
            for fname in ud["faculties"]:
                db.session.add(Faculty(name=fname, university_id=u.id))

        # ── Администратор ──
        admin_user = User(email="admin@platform.ru", role="admin")
        admin_user.set_password("password123")
        db.session.add(admin_user)
        db.session.flush()
        db.session.add(Subscription(user_id=admin_user.id, plan="free", status="active"))

        # ── Студенты ──
        students_data = [
            {
                "email": "ivan@student.ru", "password": "password123",
                "first_name": "Иван", "last_name": "Петров",
                "university": "НИУ ВШЭ", "faculty": "Факультет компьютерных наук",
                "course": 3, "speciality": "Программная инженерия",
                "city": "Москва", "work_format": "hybrid", "desired_hours": "20-40",
                "skills": ["Python", "SQL", "Git", "JavaScript", "React"],
                "experience": "Учебные проекты с применением Python и SQL. Разработка клиент-серверных приложений.",
                "bio": "Стажёр-разработчик Python. Готов развиваться в написании микросервисов и осваивать Docker.",
                "subscription": "premium",
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
                university=sd["university"], faculty=sd.get("faculty"),
                course=sd["course"], speciality=sd.get("speciality"),
                city=sd["city"], work_format=sd.get("work_format"),
                desired_hours=sd.get("desired_hours"),
                experience=sd.get("experience"),
                bio=sd.get("bio"),
            )
            student.skills = [skills[s] for s in sd["skills"]]
            db.session.add(student)
            student_objects.append(student)
            plan = sd.get("subscription", "free")
            expires = datetime.now(timezone.utc) + timedelta(days=30) if plan != "free" else None
            db.session.add(Subscription(
                user_id=user.id, plan=plan, status="active",
                started_at=datetime.now(timezone.utc), expires_at=expires,
            ))

        db.session.flush()

        # ── Компании ──
        companies_data = [
            {
                "email": "hr@mindbox.ru", "password": "password123",
                "name": "Mindbox", "description": "Платформа автоматизации маркетинга",
                "website": "https://mindbox.ru", "city": "Москва",
            },
            {
                "email": "hr@calltouch.ru", "password": "password123",
                "name": "Calltouch", "description": "Платформа аналитики и маркетинга",
                "website": "https://calltouch.ru", "city": "Москва",
            },
            {
                "email": "hr@smartcat.io", "password": "password123",
                "name": "Smartcat", "description": "AI-платформа для локализации контента",
                "website": "https://smartcat.io", "city": "Санкт-Петербург",
            },
            {
                "email": "hr@sendsay.ru", "password": "password123",
                "name": "Sendsay", "description": "Платформа омниканальных коммуникаций",
                "website": "https://sendsay.ru", "city": "Москва",
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
            db.session.add(Subscription(user_id=user.id, plan="free", status="active"))

        db.session.flush()

        # ── Стажировки ──
        internships_data = [
            {
                "company": 0, "title": "Стажёр-разработчик Python",
                "direction": "IT", "work_format": "hybrid",
                "description": "Разработка микросервисов на Python. Работа в продуктовой команде Mindbox.",
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
                "description": "Работа с ML-моделями в аналитической команде Calltouch. Реальные задачи NLP и CV.",
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
                "description": "Разработка интерфейсов платформы Smartcat. Стек: React, TypeScript.",
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
                "description": "Участие в дизайне платформы Sendsay. UX-исследования, макеты в Figma.",
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
                "description": "Создание контента для блога и каналов Smartcat, работа с редакцией, аналитика публикаций.",
                "requirements": "Грамотный русский язык, чувство стиля, знание соцсетей.",
                "selection_stages": "Тестовое задание → Собеседование",
                "schedule": "Свободный", "min_hours": 10, "max_hours": 20,
                "compatible_with_study": True, "salary_min": 20000, "salary_max": 30000,
                "city": "Санкт-Петербург", "required_experience": "none",
                "deadline": date.today() + timedelta(days=35),
                "skills": ["Копирайтинг", "SMM"],
                "status": "published",
            },
            {
                "company": 0, "title": "Стажёр QA-инженер",
                "direction": "IT", "work_format": "hybrid",
                "description": "Тестирование веб-сервисов, написание тест-кейсов и участие в регрессионном тестировании.",
                "requirements": "Базовые знания тест-дизайна, внимательность, понимание клиент-серверной архитектуры.",
                "selection_stages": "Тестовое задание → Интервью",
                "schedule": "Свободный", "min_hours": 20, "max_hours": 30,
                "compatible_with_study": True, "salary_min": 30000, "salary_max": 45000,
                "city": "Москва", "required_experience": "none",
                "deadline": date.today() + timedelta(days=50),
                "skills": ["SQL", "Git"],
                "status": "pending",
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
                last_confirmed_at=datetime.now(timezone.utc),
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
            cover_letter="Хочу пройти вакансию в Mindbox, у меня есть опыт с Python.",
        )
        app2 = Application(
            student_id=student_objects[1].id,
            internship_id=internship_objects[2].id,
            status="applied",
            cover_letter="Интересуюсь маркетингом, слежу за трендами в digital-коммуникациях.",
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

        # ── Статьи (Инструменты) ──
        articles = [
            Article(
                title="Как написать резюме студенту",
                category="resume",
                body=(
                    "Резюме — это первая точка контакта с работодателем. "
                    "Укажите релевантный опыт (учебные проекты, хакатоны), ключевые навыки, "
                    "ссылки на портфолио/GitHub. Не растягивайте текст: одна страница, "
                    "конкретные результаты, цифры. Адаптируйте резюме под каждую вакансию."
                ),
                image_url="",
            ),
            Article(
                title="Как подготовиться к собеседованию",
                category="interview",
                body=(
                    "Изучите компанию: продукт, ценности, технологический стек. "
                    "Подготовьте 2–3 истории по STAR-формату (ситуация → задача → действие → результат). "
                    "Прорешайте типовые задачи и вопросы по фундаментальным темам. "
                    "Не бойтесь задавать вопросы интервьюеру — это показывает интерес."
                ),
                image_url="",
            ),
            Article(
                title="Что писать в сопроводительном письме",
                category="resume",
                body=(
                    "Короткое (3–5 предложений) письмо, в котором вы объясняете, почему вам интересна "
                    "именно эта вакансия, и приводите 1–2 конкретных факта из своего опыта, "
                    "которые подтверждают, что вы справитесь."
                ),
                image_url="",
            ),
        ]
        db.session.add_all(articles)

        # ── Новости ──
        news = [
            NewsPost(
                title="Открыт набор на летнюю вакансию в Mindbox",
                body="Mindbox открыл набор на летние вакансии 2026 года для студентов IT-направлений. "
                     "Подавайте заявки до конца мая.",
                category="internship",
            ),
            NewsPost(
                title="ВШЭ и Calltouch запустили совместный курс по аналитике",
                body="Студенты ВШЭ получили возможность пройти курс по маркетинговой аналитике "
                     "с практикой в команде Calltouch.",
                category="university",
            ),
            NewsPost(
                title="День карьеры в МФТИ",
                body="15 апреля в МФТИ пройдёт ярмарка вакансий и стажировок. Участвуют 40+ компаний.",
                category="event",
            ),
        ]
        db.session.add_all(news)

        # ── Отзывы ──
        reviews = [
            Review(student_id=student_objects[0].id,
                   company_id=company_objects[0].id,
                   internship_id=internship_objects[0].id,
                   rating=5,
                   text="Отличная команда и хорошее наставничество. Рекомендую."),
            Review(student_id=student_objects[2].id,
                   company_id=company_objects[1].id,
                   internship_id=internship_objects[3].id,
                   rating=4,
                   text="Интересные задачи, но процесс ревью можно было бы ускорить."),
        ]
        db.session.add_all(reviews)

        db.session.commit()
        print("Тестовые данные загружены!")
        print(f"  Навыков: {len(SKILLS_LIST)}")
        print(f"  Студентов: {len(students_data)}")
        print(f"  Компаний: {len(companies_data)}")
        print(f"  Стажировок: {len(internships_data)}")
        print(f"  Откликов: 3")
        print(f"  Городов: {len(cities)}, Вузов: {len(universities_data)}")
        print(f"  Статей: 3, Новостей: 3, Отзывов: 2")
        print()
        print("Тестовые аккаунты:")
        print("  Студент:  ivan@student.ru / password123")
        print("  Студент:  maria@student.ru / password123")
        print("  Студент:  alex@student.ru / password123")
        print("  Компания: hr@mindbox.ru / password123")
        print("  Компания: hr@calltouch.ru / password123")
        print("  Компания: hr@smartcat.io / password123")
        print("  Компания: hr@sendsay.ru / password123")
        print("  Админ:    admin@platform.ru / password123")


if __name__ == "__main__":
    seed()
