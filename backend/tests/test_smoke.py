def auth(token):
    return {"Authorization": f"Bearer {token}"}


def test_health(client):
    r = client.get("/api/health")
    assert r.status_code in (200, 503)
    body = r.get_json()
    assert "db" in body and "version" in body


def test_register_and_me(client, student_token):
    r = client.get("/api/auth/me", headers=auth(student_token))
    assert r.status_code == 200
    data = r.get_json()
    assert data["user"]["role"] == "student"
    assert data["student"]["first_name"] == "Тест"


def test_internship_create_and_list(client, company_token):
    r = client.post("/api/company/internships", headers=auth(company_token), json={
        "title": "Test Job", "direction": "IT",
        "description": "desc", "work_format": "remote",
        "skills": ["Python"],
    })
    assert r.status_code == 201
    iid = r.get_json()["internship"]["id"]
    # пока pending — в публичной ленте быть не должна
    r = client.get("/api/internships")
    assert iid not in [i["id"] for i in r.get_json()["items"]]


def test_validation_bad_work_format(client):
    r = client.post("/api/auth/register/student", json={
        "email": "x@x.ru", "password": "password123",
        "first_name": "A", "last_name": "B",
        "university": "u", "course": 2, "city": "M",
        "work_format": "INVALID",
    })
    assert r.status_code == 400


def test_subscription_plans(client):
    r = client.get("/api/subscriptions/plans")
    assert r.status_code == 200
    plans = r.get_json()["plans"]
    assert {p["key"] for p in plans} == {"free", "premium", "b2b"}


def test_dictionaries(client):
    for path in ("/api/skills", "/api/universities", "/api/faculties", "/api/cities"):
        r = client.get(path)
        assert r.status_code == 200


def test_mock_payment_flow(client, student_token, monkeypatch):
    # DA не настроен → checkout вернёт mock-url
    r = client.post("/api/subscriptions/checkout",
                    headers=auth(student_token), json={"plan": "premium"})
    assert r.status_code == 201, r.get_json()
    data = r.get_json()
    assert data["provider"] == "mock"
    assert "payment_url" in data

    # вызываем mock-confirm
    r = client.get(data["payment_url"])
    assert r.status_code == 200
    body = r.get_json()
    assert body["payment"]["status"] == "paid"
    assert body["subscription"]["plan"] == "premium"
