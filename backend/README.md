# Backend — OOAD Bus Ticket API

FastAPI + SQLAlchemy 2 + Alembic + MySQL 8, theo Clean Architecture. Hiện mới có khung 4 tầng và endpoint `GET /health`.

## Cấu trúc

```
backend/
├── Dockerfile
├── requirements.txt         # chạy production
├── requirements-dev.txt     # thêm pytest, httpx, ruff
├── app/
│   ├── main.py              # tạo FastAPI app, đăng ký router
│   ├── config.py            # Settings đọc .env (DB, JWT)
│   ├── domain/              # entity (dataclass thuần), quy tắc nghiệp vụ, không phụ thuộc framework
│   ├── application/         # use case (UC01..UC23), cổng (interface) repository
│   ├── infrastructure/      # SQLAlchemy, repository, Alembic, JWT, mock thanh toán/SMS
│   └── presentation/        # router, schema request/response, dependency
└── tests/
```

Quy ước: tầng trong không import tầng ngoài (`domain` ← `application` ← `infrastructure`/`presentation`).

## Chạy thử

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
pytest
ruff check . && ruff format --check .
uvicorn app.main:app --reload    # Swagger: http://localhost:8000/docs
```

Hoặc từ gốc project: `docker compose up --build` (cần file `.env`, xem `../.env.example`).

Xuất OpenAPI để import vào Postman: `http://localhost:8000/openapi.json`.
