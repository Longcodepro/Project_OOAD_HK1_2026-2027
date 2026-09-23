# Frontend — chưa scaffold

Thư mục này cố tình để trống. Người phụ trách frontend tự chọn tooling (Vite/CRA, JS/TS, thư viện UI...) và scaffold theo ý mình — không bị áp cấu trúc từ phía backend.

## Gợi ý nhanh (không bắt buộc)
```bash
cd Project_OOAD_HK1_2026-2027
npm create vite@latest frontend -- --template react-ts
```

## Kết nối với backend
- Backend chạy ở `http://localhost:8000` khi dùng `docker compose up` từ thư mục gốc project (xem `../backend/README.md`).
- Swagger docs: `http://localhost:8000/docs` — xem trực tiếp request/response thật, không đoán field.
- Hợp đồng API dùng chung: `../contracts/README.md` (`openapi.json` được backend export ra, không hand-edit).
- Sau khi frontend có `Dockerfile` thật, mở comment phần `frontend` trong `../docker-compose.yml` để chạy chung với backend + MySQL trong cùng một lệnh `docker compose up`.
