# Frontend — OOAD Bus Ticket Client & Admin Portal

> Ứng dụng Single-Page Application (SPA) xây dựng trên nền tảng **React 19 + TypeScript + Vite + Tailwind CSS**, tích hợp thiết kế giao diện độc bản với bản sắc văn hóa Việt Nam (**Hoa văn Trống đồng Đông Sơn, Đàn chim Lạc bay, Nón lá**).

---

## 🎨 Điểm nhấn Giao diện & Trải nghiệm (UI/UX Highlights)

- **Phong cách Thiết kế Bản sắc Việt**: Kết hợp tinh tế giữa giao diện ứng dụng vận tải hiện đại với các họa tiết văn hóa dân tộc truyền thống (Trống đồng Đông Sơn vector, chim Lạc bay uyển chuyển, hiệu ứng sóng gợn âm vang).
- **Cổng Khách Hàng (Customer Portal)**:
  - Tìm kiếm chuyến xe thông minh với bộ lọc đa tiêu chí: Giờ chạy (sáng/chiều/tối), Điểm đón/trả, Loại xe (Giường nằm, Limousine VIP).
  - Sơ đồ xe 2 tầng tương tác trực quan: hiển thị vị trí ghế (Dãy A - Tầng 1, Dãy B - Tầng 2), phân biệt trạng thái rõ ràng (Ghế trống, Đang giữ chỗ, Đã bán).
  - Quy trình Đặt vé & Thanh toán mượt mà: Áp dụng mã giảm giá (Coupon), hỗ trợ đa phương thức (VietQR động có mã đơn, Chuyển khoản, Thẻ quốc tế, Tiền mặt).
  - Tra cứu vé điện tử công khai: Xem thông tin vé, xuất trình mã QR lên xe, yêu cầu hủy vé hoàn tiền online tự động theo quy định.
- **Cổng Quản Trị & Bán Vé Quầy (Admin & POS Station)**:
  - **POS Counter (`/#/admin/counter`)**: Dành riêng cho nhân viên nhà xe tại bến (Mỹ Đình, Miền Đông, Miền Tây...), thao tác bán vé nhanh, thu tiền mặt, in phôi vé nhiệt, đối soát ca trực.
  - **Soát Vé QR (`/#/admin/scanner`)**: Giao diện tối ưu cho nhân viên phụ xe/soát vé tại cửa xe, quét mã QR trên vé hành khách để check-in lên xe tức thì.
  - **Dashboard Quản Trị**: Thống kê doanh thu, tỷ lệ lấp đầy ghế, quản lý Tuyến xe, Chuyến xe, Đội xe & cấu hình tham số hệ thống.

---

## 🏗️ Cấu trúc Thư mục Frontend (`frontend/src/`)

```
src/
├── assets/                  # Tài nguyên tĩnh, logo, biểu tượng SVG
├── components/              # Các thành phần giao diện tái sử dụng
│   ├── admin/               # Layout, Sidebar, Modals cho Admin
│   ├── auth/                # Khung xác thực, form đăng nhập/đăng ký
│   ├── common/              # Button, Modal, Logo, PickerFields, AccountMenu
│   ├── dongson/             # Linh hồn văn hóa: Trống đồng, Chim Lạc, Nón lá, Sóng gợn
│   ├── layout/              # Header, Footer, BottomBar điều hướng mobile
│   ├── results/             # Bộ lọc Sidebar, Thẻ thông tin chuyến xe
│   ├── seats/               # Ghế đơn, sơ đồ bố trí tầng 1 / tầng 2
│   └── ticket/              # Modal hủy vé, sửa thông tin hành khách
├── pages/                   # Các trang màn hình chính
│   ├── admin/               # Dashboard, Tuyến xe, Chuyến xe, Xe buýt, Bán vé quầy, Soát vé...
│   ├── customer/            # Lịch sử đơn hàng, thông tin cá nhân
│   ├── HomePage.tsx         # Trang chủ tìm kiếm chuyến
│   ├── ResultsPage.tsx      # Danh sách kết quả chuyến xe
│   ├── SeatsPage.tsx        # Màn hình chọn ghế 2 tầng
│   ├── CheckoutPage.tsx     # Thanh toán VietQR & giữ chỗ
│   ├── SuccessPage.tsx      # Hoàn tất đặt vé & QR lên xe
│   ├── TicketLookupPage.tsx # Tra cứu vé công khai
│   └── ProfilePage.tsx      # Trang quản lý vé cá nhân
├── services/                # Tầng giao tiếp mạng & Session
│   ├── api.ts               # Axios client kèm Interceptor gắn JWT Token
│   ├── session.ts           # Quản lý phiên đăng nhập & thông tin người dùng
│   └── viewState.ts         # Quản lý bộ lọc và dữ liệu tìm kiếm tạm thời
├── styles/                  # Định kiểu CSS module & animations
└── types/                   # Định nghĩa TypeScript Types cho Domain & API
```

---

## 🚀 Hướng dẫn Cài đặt & Chạy Cục bộ

### Yêu cầu tiên quyết:
- **Node.js**: Phiên bản 18+ (khuyên dùng Node.js 20 hoặc 22 LTS).
- **npm** hoặc **pnpm / yarn**.

### Các bước thực hiện:

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Khởi chạy máy chủ phát triển (Dev Server)
npm run dev
```

Ứng dụng sẽ được phục vụ tại: **`http://localhost:5173`**  
*(Vite proxy đã được cấu hình tự động chuyển tiếp các yêu cầu `/api` sang Backend FastAPI tại `http://localhost:8005` hoặc `http://localhost:8000`).*

### Đóng gói cho môi trường Production:

```bash
npm run build
```
Kết quả build được tạo trong thư mục `dist/` với dung lượng siêu nhẹ, sẵn sàng deploy lên Nginx, Vercel hoặc Docker.
