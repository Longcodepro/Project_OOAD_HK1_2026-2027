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

## Clean Architecture bản gọn (đã chốt)

- **Giữ 4 tầng**, nhưng CRUD đơn giản (xem danh sách tuyến, xe, loại xe...) cho router gọi thẳng repository, không viết use case.
- **Use case đầy đủ** chỉ cho phần có nghiệp vụ thật: đặt và giữ ghế (5 phút), thanh toán, hủy vé và hoàn tiền (phí 15%), đăng nhập và OTP.
- **Repository interface** (ở `application`) chỉ tạo khi use case cần mock lúc test. Không tạo interface cho mọi bảng.
- **Luật bắt buộc duy nhất:** `domain` không import gì từ framework hay tầng ngoài (FastAPI, SQLAlchemy, Pydantic).

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

## Database và migration

```bash
alembic upgrade head                         # tạo bảng + seed 3 vai trò (cần MySQL đang chạy, đọc .env)
alembic revision --autogenerate -m "tên"     # sinh migration mới sau khi sửa model
```

Tên trong code là tiếng Anh, ánh xạ với `docs/rdm/RDM.md`:

| Code (bảng) | RDM |
|---|---|
| `roles` | VaiTro |
| `accounts` | TaiKhoan (`phone`=SDT, `token_version`=PhienBanToken, `failed_login_count`=SoLanDangNhapSai, `locked_until`=KhoaDangNhapDen) |
| `otp_codes` | OtpXacThuc (`code_hash`=MaXacThucBam, `wrong_count`=SoLanSai) |

## Chức năng đã có

Vé (UC07 lịch sử, UC23 tra cứu): `GET /me/tickets?status=`, `GET /tickets/lookup?qr=|ticket_id=|phone=` (nhân viên/Admin), `GET /tickets/{id}`.

Bán vé tại quầy (UC04, nhân viên bán vé): `POST /counter/orders`, thanh toán qua `POST /orders/{id}/pay` (tiền mặt hoặc VietQR, đổi phương thức được), `GET /counter/orders/{id}/receipts` (in và in lại vé), `GET /counter/orders` (đối soát doanh thu trong ngày).

Đặt vé trực tuyến & thanh toán (UC02, UC21, khách hàng): `POST /orders` (ghế phải đã giữ chỗ), `POST /orders/{id}/pay`, `GET /orders`, `GET /orders/{id}`, `POST /orders/{id}/cancel-pending`, `POST /payments/webhook`. Cổng thanh toán đang mock: tham số `simulate` = `success` / `fail` / `pending` để ép kết quả.

Khuyến mãi & giá vé (UC15, Admin): `/admin/coupons` (chỉ thêm và bật/tắt), `PATCH /admin/trips/{id}/price`. Kiểm tra mã khi đặt vé: `POST /coupons/validate`.

Giữ chỗ (UC20, khách hoặc nhân viên quầy): `POST /trips/{id}/hold` (mặc định 5 phút theo bảng `settings`), `GET /trips/{id}/hold`, `POST /trips/{id}/release`.

Xe & sơ đồ ghế (UC14, Admin): `/admin/vehicle-types`, `/admin/vehicles` (kèm `PUT /admin/vehicles/{id}/seats`).
Tuyến & chuyến (UC13, Admin): `/admin/routes`, `/admin/trips`. Tra cứu (UC01, công khai): `GET /trips/search`, `GET /trips/{id}`, `GET /trips/{id}/seats`.

Tài khoản (UC10, UC11, UC12): `POST /auth/password/forgot/otp`, `POST /auth/password/reset`, `POST /auth/password/change`, `PATCH /auth/me`.

Xác thực (UC08, UC09, UC19): `POST /auth/register/otp`, `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`.
OTP đang mock: với `SMS_MOCK=true` (mặc định) API trả mã trong trường `mock_otp`. Các ngưỡng (OTP 120 giây, khóa đăng nhập sau 5 lần sai trong 15 phút) đang để trong `app/config.py`, chưa đọc từ bảng `ThamSo`.
