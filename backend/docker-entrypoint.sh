#!/bin/sh
# Chạy khi container backend khởi động: tạo/nâng cấp bảng rồi nạp dữ liệu mẫu, sau đó mới bật server.
set -e

echo "[backend] chờ MySQL nhận kết nối..."
python - <<'PY'
import sys
import time

from sqlalchemy import create_engine

from app.config import settings

for _ in range(60):
    try:
        create_engine(settings.database_url).connect().close()
        sys.exit(0)
    except Exception:  # noqa: BLE001 - MySQL còn đang khởi tạo
        time.sleep(2)
sys.exit("MySQL không sẵn sàng sau 120 giây")
PY

echo "[backend] alembic upgrade head"
alembic upgrade head

if [ "${SEED_DEMO_DATA:-true}" = "true" ]; then
  echo "[backend] nạp dữ liệu mẫu (SEED_DEMO_DATA=false để tắt)"
  python -m app.seed
fi

exec "$@"
