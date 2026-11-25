# Hướng Dẫn Chạy Kiểm Thử Tự Động (Automated Testing Guide)

Thư mục này chứa toàn bộ các kịch bản kiểm thử tích hợp tự động (End-to-End & Integration Test) và các bộ sưu tập Postman Newman của hệ thống **Vé Xe Khách Liên Tỉnh**.

---

## 📁 Cấu trúc Thư mục `tests/`

```
tests/
├── postman/
│   ├── Full_System_Newman_Collection.json   # Bộ kịch bản Postman toàn diện (E2E API)
│   ├── Auth_Newman_Collection.json          # Kịch bản kiểm thử chuyên sâu cho luồng Xác thực (JWT/OTP)
│   ├── Vexe_API_Collection.postman_collection.json # Bộ sưu tập Postman v2.1 import vào app Postman
│   ├── generate_full_collection.py          # Script sinh collection tự động từ specs
│   └── build_auth_collection.py             # Script sinh auth collection
├── test_feature1_frontend_api.py            # Test tích hợp luồng Hủy chuyến & Hoàn tiền tự động
└── README.md                                # Tài liệu hướng dẫn này
```

---

## 🧪 1. Kiểm thử Tích hợp với Pytest

Các bài test tích hợp có thể chạy trực tiếp từ thư mục gốc của dự án:

```bash
# Đảm bảo môi trường ảo và backend dependencies đã sẵn sàng
cd backend && uv run pytest ../tests/test_feature1_frontend_api.py -v
```

Hoặc chạy toàn bộ kiểm thử backend trong `backend/tests/`:

```bash
cd backend
uv run pytest tests/ -v
```

---

## 📮 2. Kiểm thử API Tự động Bằng Newman (Postman CLI)

Hệ thống cung cấp file collection Newman để có thể tích hợp trực tiếp vào quy trình CI/CD:

### Cài đặt Newman (nếu chưa có):
```bash
npm install -g newman
```

### Chạy kiểm thử toàn bộ hệ thống API:
*(Yêu cầu backend đang chạy tại `http://localhost:8005` hoặc `http://localhost:8000`)*

```bash
newman run tests/postman/Full_System_Newman_Collection.json \
  --reporters cli
```

### Chạy kiểm thử luồng Xác thực & Phân quyền (Auth/RBAC):
```bash
newman run tests/postman/Auth_Newman_Collection.json \
  --reporters cli
```
