#!/usr/bin/env bash
set -e

echo "Waiting for the database..."
python - <<'PY'
import os
import sys
import time

import psycopg

url = os.environ["DATABASE_URL"]
for attempt in range(1, 31):
    try:
        with psycopg.connect(url, connect_timeout=2):
            print("Database is up.")
            break
    except Exception as exc:  # noqa: BLE001
        print(f"  not ready ({attempt}/30): {exc}")
        time.sleep(2)
else:
    sys.exit("Database unavailable after 60s.")
PY

echo "Applying migrations..."
python manage.py migrate --noinput

exec "$@"
