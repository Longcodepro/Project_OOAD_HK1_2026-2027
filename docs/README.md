# Thư Viện Tài Liệu Thiết Kế OOAD (Documentation Index)

Thư mục `docs/` chứa toàn bộ các hồ sơ tài liệu phân tích và thiết kế hướng đối tượng (OOAD), kiến trúc phần mềm, đặc tả ca sử dụng, sơ đồ UML, thiết kế cơ sở dữ liệu và báo cáo nghiệm thu của hệ thống **Quản trị & Bán vé xe khách liên tỉnh**.

---

## 🗺️ Mục Lục Tài Liệu (Documentation Roadmap)

```
docs/
├── academic/                 # Hồ sơ đề tài & tài liệu hướng dẫn môn học
│   ├── YeuCauDoAn-OOAD.pdf   # Đề bài & yêu cầu kỹ thuật đồ án OOAD của giảng viên
│   └── OOAD - BTH.pdf        # Bài tập thực hành & quy chuẩn môn học
│
├── architecture/             # Sơ đồ kiến trúc phần mềm tương tác
│   ├── architecture.html     # Sơ đồ kiến trúc tương tác trực quan (render độc lập)
│   └── architecture.delivery.json # Đặc tả kiến trúc máy đọc được
│
├── assets/screenshots/       # Thư viện ảnh chụp màn hình giao diện thực tế
│   ├── home.png              # Màn hình Trang chủ & Tìm chuyến
│   ├── results.png           # Danh sách chuyến xe & Bộ lọc nâng cao
│   ├── seats.png             # Sơ đồ chọn ghế 2 tầng
│   ├── payment.png           # Màn hình thanh toán VietQR & Countdown giữ chỗ
│   ├── ticket_success.png    # Xuất vé điện tử kèm mã QR lên xe
│   ├── ticket_lookup.png     # Tra cứu vé công khai
│   ├── login.png             # Đăng nhập & Xác thực
│   ├── profile.png           # Quản lý tài khoản & Lịch sử đặt vé
│   └── postman_test.png      # Kết quả kiểm thử tự động Postman/Newman
│
├── bfd/                      # Business Function Diagram (Sơ đồ phân rã chức năng)
│   ├── BFD.drawio            # Sơ đồ BFD định dạng Draw.io
│   └── bfd.md                # Diễn giải chi tiết các khối chức năng nghiệp vụ
│
├── use-case/                 # Sơ đồ Ca sử dụng (Use Case Diagram)
│   ├── UseCase_DatVeXeKhach.drawio # Sơ đồ tổng thể 24 Use Cases
│   └── USECASE.md            # Tổng quan danh mục Use Case
│
├── specs/                    # Đặc tả chi tiết Ca sử dụng (Use Case Specifications)
│   └── DacTaUseCase.md       # Luồng sự kiện chính, luồng phụ, ngoại lệ của 24 Use Cases
│
├── class/                    # Sơ đồ Lớp (Class Diagram)
│   ├── ClassDiagram_DatVeXeKhach.drawio # Sơ đồ quan hệ giữa các Domain Entities & Services
│   └── Class.md              # Bảng mô tả chi tiết thuộc tính và phương thức các lớp
│
├── sequence/                 # Sơ đồ Tuần tự (Sequence Diagrams)
│   ├── Sequence_DatVeXeKhach.drawio # Sơ đồ tuần tự tương tác giữa các tầng
│   ├── Sequence_diagram.md   # Diễn giải các kịch bản tương tác (Giữ ghế, Thanh toán, Hủy vé)
│   └── gen_sequence_drawio.py # Script hỗ trợ sinh sơ đồ tuần tự tự động
│
├── rdm/                      # Relational Data Model (Mô hình dữ liệu quan hệ CSDL)
│   ├── RDM_DatVeXeKhach.drawio # Sơ đồ thực thể liên kết (ERD/RDM)
│   ├── rdm_chuan.md          # Đặc tả cấu trúc 14 bảng quan hệ chuẩn 3NF
│   └── RDM.md                # Ánh xạ trường dữ liệu giữa thiết kế và code
│
├── reports/                  # Báo cáo nghiệm thu & Đánh giá chất lượng
│   ├── BaoCao_CaiDat_Va_ThuNghiem_OOAD.docx # Báo cáo nghiệm thu hoàn chỉnh môn học
│   ├── generate_report_docx.py # Script Python tự động biên soạn báo cáo
│   └── e2e_test_report.json  # Kết quả chạy kiểm thử tích hợp End-to-End
│
├── OOAD_DESIGN_MAPPING.md    # Ánh xạ chuẩn mực giữa 24 Use Cases vào mã nguồn thực tế
├── API_TESTING_GUIDE.md      # Cẩm nang kiểm thử thủ công qua Swagger UI & Postman
├── DANH_MUC_CHUC_NANG_VA_TEST_CASES_POSTMAN.md # Ma trận kiểm thử chức năng
├── CHITIET_LOGIC_NGHIEP_VU.md # Phân tích logic nghiệp vụ giữ chỗ, hủy vé, cước phí
└── THAY_DOI_KHI_CODE.md      # Nhật ký các cải tiến kỹ thuật thực tế so với bản vẽ lý thuyết
```

---

## 💡 Hướng Dẫn Mở Sơ Đồ Trực Quan

1. **Sơ đồ Draw.io (`.drawio`)**:  
   Có thể mở trực tiếp bằng phần mềm [Draw.io Desktop](https://www.drawio.com/) hoặc tiện ích mở rộng [Draw.io Integration](https://marketplace.visualstudio.com/items?itemName=hediet.vscode-drawio) trên VS Code / Antigravity IDE.

2. **Sơ đồ Kiến Trúc Tương Tác (`architecture/architecture.html`)**:  
   Mở tệp này trực tiếp trên bất kỳ trình duyệt web nào (Chrome, Firefox, Safari, Edge) để khám phá cấu trúc module, luồng dữ liệu và quan hệ giữa các tầng trong hệ thống với giao diện trực quan, tương tác zoom/pan/filter.
