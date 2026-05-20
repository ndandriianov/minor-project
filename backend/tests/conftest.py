import os
import sys
import tempfile

import pytest

# Гарантируем чистую in-memory БД и отключаем фоновые задачи
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DISABLE_SCHEDULER"] = "1"
os.environ["JWT_SECRET"] = "test-secret-32chars-test-test-test"
os.environ["RATELIMIT_STORAGE"] = "memory://"

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app as flask_app  # noqa: E402
from models import db  # noqa: E402


@pytest.fixture()
def app():
    flask_app.config.update(TESTING=True)
    with flask_app.app_context():
        db.drop_all()
        db.create_all()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def student_token(client):
    r = client.post("/api/auth/register/student", json={
        "email": "test_student@example.com",
        "password": "password123",
        "first_name": "Тест", "last_name": "Студентов",
        "university": "ВШЭ", "course": 2, "city": "Москва",
    })
    assert r.status_code == 201, r.get_json()
    return r.get_json()["access_token"]


@pytest.fixture()
def company_token(client):
    r = client.post("/api/auth/register/company", json={
        "email": "test_co@example.com",
        "password": "password123",
        "name": "Тест Компания",
    })
    assert r.status_code == 201, r.get_json()
    return r.get_json()["access_token"]
