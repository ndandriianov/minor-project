#!/bin/sh
set -e

python init_db.py

exec gunicorn --bind 0.0.0.0:5051 --access-logfile - --error-logfile - app:app
