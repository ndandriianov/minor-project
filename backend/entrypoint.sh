#!/bin/sh
set -e

python init_db.py

exec gunicorn --bind 0.0.0.0:5051 app:app
