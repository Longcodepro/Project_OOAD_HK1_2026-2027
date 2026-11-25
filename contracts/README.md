# API Contract (contracts/)

Mục đích: nguồn tham chiếu chung về API giữa backend (FastAPI) và frontend (React), để hai người phát triển song song mà không bị lệch dữ liệu/endpoint.

## Quy ước
- File `openapi.json` trong thư mục này là bản export từ FastAPI (`/openapi.json`) — **không chỉnh tay**.
- Mỗi khi backend thêm/đổi endpoint hoặc schema (Pydantic model), export lại file này và commit cùng lúc với code liên quan.
- Frontend đọc file này (hoặc mở `http://localhost:8000/docs` lúc backend đang chạy) để biết chính xác request/response — không đoán field, không tự suy ra cấu trúc.

## Cách export lại openapi.json

Khi backend đang chạy:
```bash
curl http://localhost:8000/openapi.json -o contracts/openapi.json
```

Hoặc export trực tiếp từ code (không cần server đang chạy — chạy từ thư mục `backend/`, vì lệnh cần import được package `app`):
```bash
cd backend
python -c "import json; from app.main import app; json.dump(app.openapi(), open('../contracts/openapi.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)"
```

## Trạng thái hiện tại
✅ Đã hoàn thiện toàn diện tệp đặc tả `contracts/openapi.json` (OpenAPI 3.1.0) bao quát 100% các nhóm endpoint: Xác thực & Tài khoản, Tra cứu Chuyến xe & Sơ đồ ghế, Đặt vé & Thanh toán VietQR, Bán vé Quầy POS, Soát vé QR Code, Quản trị Tuyến/Chuyến/Xe, Quản lý Khuyến mãi và Báo cáo Dashboard.
