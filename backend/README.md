# Backend — OOAD Bus Ticket API

Đây mới là **khung thư mục** (setup trước khi code) — CHƯA có code thật. Mỗi thư mục con trong `app/` chỉ có 1 file ví dụ, nội dung chỉ là comment mô tả sau này thư mục đó sẽ chứa những file gì. Chưa chạy được (`docker compose up` sẽ lỗi vì `app/main.py` chưa có `app = FastAPI(...)` thật).

## Cấu trúc

```
backend/
├── Dockerfile
├── requirements.txt
├── .dockerignore
└── app/
    ├── main.py              # entry point — sẽ tạo FastAPI app + đăng ký router ở đây
    ├── core/
    │   └── config.py        # sẽ có: config.py (đọc .env), database.py (engine, session)
    ├── models/
    │   └── example_entity.py  # mỗi entity 1 file, ví dụ: bus_route.py, trip.py, seat.py, booking.py...
    ├── api/
    │   ├── deps.py           # dependency dùng chung (session DB, auth...)
    │   └── routers/
    │       └── example_router.py  # mỗi resource 1 file, ví dụ: customers.py, trips.py, bookings.py...
    └── services/
        └── example_service.py  # business logic thật (BR01 tạm khóa ghế, BR04 hủy vé...)
tests/
└── test_example.py           # sẽ có: test_health.py, test_bookings.py...
```

## Công nghệ đã chốt (chưa cài đặt/code)
FastAPI + SQLModel + MySQL (qua `pymysql`) — xem `requirements.txt`, `Dockerfile`, `../docker-compose.yml`, `../.env.example`.

## Bước tiếp theo (khi bắt đầu code thật)
1. Vẽ xong Class Diagram / RDM (`../Insight/06_Class_Diagram/`, `../Insight/07_Database_Design_RDM/`) để chốt tên entity/field — tránh đoán rồi phải sửa lại.
2. Viết task cụ thể vào `../tasks/` (xem `../AGENTS.md`) cho từng phần: models, routers, services...
3. Sau khi có code thật, chạy `docker compose up --build` từ gốc project để test, rồi export `contracts/openapi.json` (xem `../contracts/README.md`).
