import os

from app import app, ensure_default_settings
from models import db, User
from seed import seed


def _migrate_schema():
    """Добавляет колонки, которых нет в существующей схеме.
    Работает только для SQLite — для Postgres миграции делает SQLAlchemy/Alembic."""
    if db.engine.dialect.name != "sqlite":
        return

    conn = db.engine.raw_connection()
    cur = conn.cursor()

    cur.execute("PRAGMA table_info(students)")
    student_cols = {row[1] for row in cur.fetchall()}

    cur.execute("PRAGMA table_info(internships)")
    internship_cols = {row[1] for row in cur.fetchall()}

    student_migrations = [
        ("is_boosted",    "BOOLEAN DEFAULT 0"),
        ("boosted_until", "DATETIME"),
    ]
    for col, typedef in student_migrations:
        if col not in student_cols:
            cur.execute(f"ALTER TABLE students ADD COLUMN {col} {typedef}")

    internship_migrations = [
        ("last_confirmed_at", "DATETIME"),
        ("is_promoted",       "BOOLEAN DEFAULT 0"),
        ("promoted_until",    "DATETIME"),
        ("views_count",       "INTEGER DEFAULT 0"),
    ]
    for col, typedef in internship_migrations:
        if col not in internship_cols:
            cur.execute(f"ALTER TABLE internships ADD COLUMN {col} {typedef}")

    conn.commit()
    conn.close()


def init_db():
    with app.app_context():
        os.makedirs(app.instance_path, exist_ok=True)
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
        db.create_all()
        _migrate_schema()
        ensure_default_settings()

        if os.environ.get("SEED_DB", "1") == "1" and User.query.count() == 0:
            seed()


if __name__ == "__main__":
    init_db()
