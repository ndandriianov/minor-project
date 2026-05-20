import os

from app import app, ensure_default_settings
from models import db, User
from seed import seed


def init_db():
    with app.app_context():
        os.makedirs(app.instance_path, exist_ok=True)
        os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
        db.create_all()
        ensure_default_settings()

        if os.environ.get("SEED_DB", "1") == "1" and User.query.count() == 0:
            seed()


if __name__ == "__main__":
    init_db()
