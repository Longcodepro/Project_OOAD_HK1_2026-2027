# Frontend — React + Vite

Scaffold bằng Vite + React + TypeScript, lint bằng Oxlint.

## Plugin React chính thức
- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) dùng [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) dùng [SWC](https://swc.rs/)

React Compiler chưa bật vì ảnh hưởng tốc độ dev & build — xem [hướng dẫn cài](https://react.dev/learn/react-compiler/installation) nếu cần.

## Kết nối với backend
- Backend chạy ở `http://localhost:8000` khi dùng `docker compose up` từ thư mục gốc project (xem `../backend/README.md`).
- Swagger docs: `http://localhost:8000/docs` — xem trực tiếp request/response thật, không đoán field.
- Hợp đồng API dùng chung: `../contracts/README.md` (`openapi.json` được backend export ra, không hand-edit).
- Sau khi frontend có `Dockerfile` thật, mở comment phần `frontend` trong `../docker-compose.yml` để chạy chung với backend + MySQL trong cùng một lệnh `docker compose up`.
