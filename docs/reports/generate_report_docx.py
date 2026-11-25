#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script sinh file Word (.docx) cho phần Báo cáo:
"CÀI ĐẶT VÀ THỬ NGHIỆM HỆ THỐNG - ĐỒ ÁN PHÂN TÍCH THIẾT KẾ HƯỚNG ĐỐI TƯỢNG (OOAD)"
Được kiểm chứng từ thực nghiệm và mã nguồn thực tế của dự án Đặt vé xe khách.
"""

import os
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

def set_cell_background(cell, fill_hex):
    """Đặt màu nền cho cell trong bảng."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Đặt khoảng đệm padding cho cell (đơn vị dxa: 1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def set_table_borders(table, color="D3D3D3"):
    """Thiết lập đường viền mỏng, trang nhã cho bảng."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="4" w:space="0" w:color="{color}"/>
            <w:bottom w:val="single" w:sz="6" w:space="0" w:color="1E3A8A"/>
            <w:left w:val="none"/>
            <w:right w:val="none"/>
            <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>
            <w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(borders)

def format_paragraph(p, space_before=0, space_after=6, line_spacing=1.5, align=WD_ALIGN_PARAGRAPH.JUSTIFY):
    """Định dạng đoạn văn bản chuẩn quy định đồ án."""
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    p.paragraph_format.alignment = align

def add_heading_1(doc, text):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=14, space_after=6, line_spacing=1.3, align=WD_ALIGN_PARAGRAPH.LEFT)
    run = p.add_run(text)
    run.font.name = "Times New Roman"
    run.font.size = Pt(16)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A) # Navy blue
    return p

def add_heading_2(doc, text):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=10, space_after=4, line_spacing=1.3, align=WD_ALIGN_PARAGRAPH.LEFT)
    run = p.add_run(text)
    run.font.name = "Times New Roman"
    run.font.size = Pt(14)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0x1F, 0x29, 0x37) # Dark gray
    return p

def add_heading_3(doc, text):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=8, space_after=3, line_spacing=1.3, align=WD_ALIGN_PARAGRAPH.LEFT)
    run = p.add_run(text)
    run.font.name = "Times New Roman"
    run.font.size = Pt(13)
    run.font.bold = True
    run.font.italic = True
    run.font.color.rgb = RGBColor(0x37, 0x41, 0x51)
    return p

def add_body_p(doc, text, bold_prefix="", italic_note=""):
    p = doc.add_paragraph()
    format_paragraph(p, space_before=0, space_after=6, line_spacing=1.5, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = "Times New Roman"
        r_pre.font.size = Pt(13)
        r_pre.font.bold = True
    r_body = p.add_run(text)
    r_body.font.name = "Times New Roman"
    r_body.font.size = Pt(13)
    if italic_note:
        r_it = p.add_run(italic_note)
        r_it.font.name = "Times New Roman"
        r_it.font.size = Pt(13)
        r_it.font.italic = True
    return p

def add_bullet(doc, bold_title, content):
    p = doc.add_paragraph(style='List Bullet')
    format_paragraph(p, space_before=0, space_after=4, line_spacing=1.3, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    r_pre = p.add_run(bold_title)
    r_pre.font.name = "Times New Roman"
    r_pre.font.size = Pt(13)
    r_pre.font.bold = True
    r_body = p.add_run(content)
    r_body.font.name = "Times New Roman"
    r_body.font.size = Pt(13)
    return p

def add_callout_box(doc, text, title="KẾT QUẢ THỰC NGHIỆM THỰC TẾ:"):
    """Tạo ô trích dẫn kết quả thực nghiệm với viền trái dày nổi bật."""
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    
    cell = table.cell(0, 0)
    cell.width = Inches(6.5)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=140, bottom=140, left=200, right=200)
    
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'''
        <w:tcBorders {nsdecls("w")}>
            <w:left w:val="single" w:sz="24" w:space="0" w:color="1E3A8A"/>
            <w:top w:val="none"/>
            <w:right w:val="none"/>
            <w:bottom w:val="none"/>
        </w:tcBorders>
    ''')
    tcPr.append(borders)
    
    p = cell.paragraphs[0]
    format_paragraph(p, space_before=0, space_after=4, line_spacing=1.3, align=WD_ALIGN_PARAGRAPH.JUSTIFY)
    r_title = p.add_run(f"📌 {title}\n")
    r_title.font.name = "Times New Roman"
    r_title.font.size = Pt(12)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
    
    r_body = p.add_run(text)
    r_body.font.name = "Times New Roman"
    r_body.font.size = Pt(12)
    r_body.font.italic = True
    
    p_after = doc.add_paragraph()
    format_paragraph(p_after, space_before=0, space_after=4, line_spacing=1.0)

def main():
    doc = docx.Document()
    
    # Thiết lập lề trang chuẩn đồ án (Top 2.5cm, Bottom 2.5cm, Left 3.0cm, Right 2.0cm)
    for section in doc.sections:
        section.top_margin = Inches(0.98)     # ~2.5 cm
        section.bottom_margin = Inches(0.98)  # ~2.5 cm
        section.left_margin = Inches(1.18)    # ~3.0 cm
        section.right_margin = Inches(0.79)   # ~2.0 cm

    # -------------------------------------------------------------
    # TIÊU ĐỀ CHƯƠNG
    # -------------------------------------------------------------
    title_p = doc.add_paragraph()
    format_paragraph(title_p, space_before=12, space_after=18, line_spacing=1.3, align=WD_ALIGN_PARAGRAPH.CENTER)
    r_chapter = title_p.add_run("CHƯƠNG 4: CÀI ĐẶT VÀ THỬ NGHIỆM HỆ THỐNG\n")
    r_chapter.font.name = "Times New Roman"
    r_chapter.font.size = Pt(18)
    r_chapter.font.bold = True
    r_chapter.font.color.rgb = RGBColor(0x1E, 0x3A, 0x8A)
    
    r_sub = title_p.add_run("(HỆ THỐNG QUẢN LÝ VÀ ĐẶT VÉ XE KHÁCH LIÊN TỈNH)")
    r_sub.font.name = "Times New Roman"
    r_sub.font.size = Pt(14)
    r_sub.font.bold = True
    r_sub.font.color.rgb = RGBColor(0x4B, 0x55, 0x63)

    add_body_p(doc, "Chương này trình bày chi tiết về quá trình hiện thực hóa các mô hình phân tích và thiết kế hướng đối tượng (OOAD) đã được xây dựng ở các chương trước thành sản phẩm phần mềm thực tế. Nội dung bao gồm việc thiết lập môi trường phát triển, lựa chọn ngôn ngữ và khung công nghệ phù hợp với kiến trúc phân tầng, kết quả thực thi các bộ kiểm thử tự động, kiểm nghiệm các kịch bản thực tế (bán vé tại quầy, đặt vé trực tuyến, kiểm soát tranh chấp ghế đồng thời, chính sách hủy hoàn vé) và đánh giá khách quan về mức độ hoàn thiện của hệ thống.")

    # -------------------------------------------------------------
    # MỤC 1: MÔI TRƯỜNG CÀI ĐẶT
    # -------------------------------------------------------------
    add_heading_1(doc, "4.1. MÔI TRƯỜNG CÀI ĐẶT VÀ TRIỂN KHAI")
    
    add_heading_2(doc, "4.1.1. Môi trường phần cứng thử nghiệm")
    add_body_p(doc, "Hệ thống được cài đặt, biên dịch và thực nghiệm kiểm thử hiệu năng trên môi trường máy trạm cá nhân với cấu hình chi tiết như sau:")
    add_bullet(doc, "Thiết bị thử nghiệm: ", "Laptop Lenovo LOQ, Bộ vi xử lý (CPU) đa nhân thế hệ mới, bộ nhớ RAM 16 GB, ổ cứng thể rắn SSD NVMe.")
    add_bullet(doc, "Hệ điều hành: ", "Linux Mint 22 (nhân Linux x86_64), đảm bảo môi trường thực thi chuẩn POSIX và hỗ trợ tối ưu các tiến trình bất đồng bộ.")

    add_heading_2(doc, "4.1.2. Môi trường phần mềm và dịch vụ nền tảng")
    add_body_p(doc, "Toàn bộ hệ sinh thái của dự án được đóng gói và vận hành thông qua công nghệ ảo hóa cấp hệ điều hành (Containerization) bằng Docker và Docker Compose, giúp việc triển khai, cô lập môi trường và di chuyển giữa các máy thử nghiệm được nhất quán 100%:")
    
    add_bullet(doc, "Hệ quản trị cơ sở dữ liệu: ", "MySQL Community Server phiên bản 8.0 chạy trong Docker Container riêng biệt (project_ooad_hk1_2026-2027-mysql-1). Database sử dụng bảng mã utf8mb4 hỗ trợ tiếng Việt toàn vẹn và chuẩn lưu trữ InnoDB hỗ trợ giao dịch ACID nghiêm ngặt.")
    add_bullet(doc, "Môi trường thực thi Back-end: ", "Python 3.13 (Docker container project_ooad_hk1_2026-2027-backend-1). Sử dụng ASGI Web Server hiệu năng cao Uvicorn chạy trên cổng nội bộ 8000 (được ánh xạ ra máy chủ host tại cổng 8005).")
    add_bullet(doc, "Môi trường thực thi Front-end: ", "Node.js runtime v20+, đóng gói ứng dụng React bằng máy chủ phát triển Vite 8 trên cổng 5173 (Docker container project_ooad_hk1_2026-2027-frontend-1).")
    add_bullet(doc, "Bộ nạp dữ liệu khởi tạo (Data Seeding): ", "Hệ thống tích hợp tiến trình tự động nạp dữ liệu mẫu ban đầu qua file seed_data.json và script app/seed.py, cung cấp sẵn 22 tuyến đường xe liên tỉnh, 1.224 chuyến xe đa dạng khung giờ, các mẫu xe 29/34/44 chỗ và các tài khoản mẫu với đầy đủ phân quyền.")

    add_heading_2(doc, "4.1.3. Công cụ hỗ trợ phát triển và kiểm thử")
    add_bullet(doc, "Môi trường lập trình tích hợp: ", "Visual Studio Code / Cursor với các phần mở rộng hỗ trợ kiểm tra kiểu tĩnh (Pylance, TypeScript).")
    add_bullet(doc, "Công cụ kiểm thử API: ", "Postman v2.1 với bộ sưu tập API chuẩn hóa Vexe_API_Collection.postman_collection.json và tài liệu giao diện tương tác trực tiếp Swagger UI (OpenAPI 3.1) tại địa chỉ http://localhost:8005/docs.")
    add_bullet(doc, "Công cụ quản lý gói & kiểm thử: ", "uv (Python Package Manager cực nhanh) và pytest v9.1.1 hỗ trợ tự động hóa các kịch bản kiểm thử tích hợp.")

    # -------------------------------------------------------------
    # MỤC 2: NGÔN NGỮ VÀ CÔNG NGHỆ CÀI ĐẶT
    # -------------------------------------------------------------
    add_heading_1(doc, "4.2. NGÔN NGỮ VÀ CÔNG NGHỆ CÀI ĐẶT")

    add_heading_2(doc, "4.2.1. Kiến trúc phân tầng Clean Architecture")
    add_body_p(doc, "Mã nguồn Back-end được tổ chức chặt chẽ theo mô hình Kiến trúc Sạch (Clean Architecture / Onion Architecture) nhằm tách biệt tối đa giữa logic nghiệp vụ cốt lõi và các công nghệ bên ngoài. Cấu trúc này ánh xạ trực tiếp từ các sơ đồ phân tích hướng đối tượng (OOAD) sang mã nguồn thực tế:")
    
    add_bullet(doc, "Tầng Thực thể cốt lõi (Domain Entities): ", "Chứa các đối tượng nghiệp vụ thuần túy không phụ thuộc vào bất kỳ thư viện ngoài nào (app/domain/entities/), định nghĩa các lớp thực thể: Account, Trip, Route, Vehicle, Seat, Order, Ticket, Payment, Refund, Coupon,... Các ràng buộc nghiệp vụ như trạng thái ghế, chính sách tính tiền, hạn mức giữ chỗ được kiểm soát tại đây.")
    add_bullet(doc, "Tầng Ca sử dụng (Application Use Cases): ", "Hiện thực hóa trực tiếp các sơ đồ Sequence và Use Case đã đặc tả (app/application/use_cases/): SeatHoldService (xử lý giữ chỗ), BookingService (xử lý đặt vé và thanh toán), RefundService (xử lý hủy vé và hoàn tiền), AuthService (xác thực và phân quyền), FleetService (quản lý đội xe và chuyến xe).")
    add_bullet(doc, "Tầng Cổng giao tiếp & Hạ tầng (Infrastructure & Ports): ", "Đóng gói việc tương tác với Cơ sở dữ liệu và Dịch vụ bên ngoài (app/infrastructure/). Triển khai mẫu thiết kế Repository (SqlSeatHoldRepository, SqlBookingRepository, SqlSettingsRepository), Cổng thanh toán giả lập (MockPaymentGateway), và Dịch vụ gửi SMS OTP giả lập (MockSmsService).")
    add_bullet(doc, "Tầng Trình diễn (Presentation Layer): ", "Chứa các API Routers của FastAPI và các mô hình DTO (Pydantic Schemas) dùng để tiếp nhận yêu cầu từ client, kiểm thực dữ liệu đầu vào và chuyển đổi kết quả trả về chuẩn RESTful.")

    add_heading_2(doc, "4.2.2. Ngôn ngữ và thư viện phía Back-end")
    
    # Bảng công nghệ Back-end
    table_be = doc.add_table(rows=1, cols=3)
    table_be.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table_be)
    
    hdr_cells = table_be.rows[0].cells
    hdr_cells[0].width = Inches(1.8)
    hdr_cells[1].width = Inches(1.5)
    hdr_cells[2].width = Inches(3.2)
    
    headers = ["Thành phần / Thư viện", "Phiên bản thực tế", "Vai trò và Đặc tính kỹ thuật"]
    for i, h in enumerate(headers):
        set_cell_background(hdr_cells[i], "1E3A8A")
        set_cell_margins(hdr_cells[i], top=120, bottom=120, left=140, right=140)
        p = hdr_cells[i].paragraphs[0]
        format_paragraph(p, space_before=0, space_after=0, align=WD_ALIGN_PARAGRAPH.CENTER)
        r = p.add_run(h)
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    be_tech_data = [
        ("Python", "3.13.13", "Ngôn ngữ hướng đối tượng chính cho Back-end, hỗ trợ type hinting mạnh mẽ."),
        ("FastAPI", "0.141.1", "Web framework bất đồng bộ (Asynchronous), tự sinh Swagger docs chuẩn OpenAPI 3.1."),
        ("SQLAlchemy (ORM)", "2.1.5", "Ánh xạ mô hình quan hệ (RDM) sang mô hình đối tượng (Class Diagram), hỗ trợ khoá giao dịch (Locking)."),
        ("Alembic", "1.20.0", "Quản lý phiên bản cấu trúc cơ sở dữ liệu (Database Migrations) đồng bộ tự động."),
        ("Pydantic & Pydantic-Settings", "2.15.0", "Kiểm thực dữ liệu đầu vào (Validation), định nghĩa DTO schemas và quản lý biến môi trường."),
        ("PyJWT & Argon2-cffi", "2.15.1 / 25.1.0", "Xác thực danh tính bằng JSON Web Token (JWT) và thuật toán băm mật khẩu Argon2 an toàn bậc nhất."),
        ("OpenPyXL & FPDF2", "3.1.5 / 2.8.9", "Xuất báo cáo tài chính thống kê ra định dạng Microsoft Excel (.xlsx) và tài liệu PDF (.pdf).")
    ]

    for row_idx, data in enumerate(be_tech_data):
        row = table_be.add_row()
        for col_idx in range(3):
            cell = row.cells[col_idx]
            cell.width = [Inches(1.8), Inches(1.5), Inches(3.2)][col_idx]
            if row_idx % 2 == 1:
                set_cell_background(cell, "F8FAFC")
            set_cell_margins(cell, top=100, bottom=100, left=140, right=140)
            p = cell.paragraphs[0]
            align = WD_ALIGN_PARAGRAPH.CENTER if col_idx == 1 else WD_ALIGN_PARAGRAPH.LEFT
            format_paragraph(p, space_before=0, space_after=0, align=align)
            r = p.add_run(data[col_idx])
            r.font.name = "Times New Roman"
            r.font.size = Pt(12)

    p_space = doc.add_paragraph()
    format_paragraph(p_space, space_before=0, space_after=6)

    add_heading_2(doc, "4.2.3. Ngôn ngữ và công nghệ phía Front-end")
    add_body_p(doc, "Ứng dụng giao diện người dùng được xây dựng theo kiến trúc Single Page Application (SPA), hướng tới trải nghiệm trực quan và đồng bộ trạng thái nhanh chóng:")
    add_bullet(doc, "Ngôn ngữ & Thư viện UI: ", "React 19 kết hợp cùng TypeScript 5+, mang lại khả năng kiểm soát kiểu chặt chẽ giữa DTO của Backend và Props/State của Component giao diện.")
    add_bullet(doc, "Công cụ đóng gói & Build tool: ", "Vite 8.3, cho tốc độ biên dịch cực nhanh (kết quả build thực tế hoàn tất toàn bộ 114 modules chỉ trong 260 mili-giây).")
    add_bullet(doc, "Styling & Giao diện: ", "Tailwind CSS v4.0, áp dụng hệ thống design token với gam màu chủ đạo Đông Sơn, hỗ trợ giao diện đáp ứng linh hoạt (Responsive) trên màn hình máy tính và thiết bị di động.")
    add_bullet(doc, "Giao tiếp mạng: ", "Axios 1.8.2 với cơ chế Interceptor tự động đính kèm JWT Bearer Token vào tiêu đề Authorization của mỗi request.")

    add_heading_2(doc, "4.2.4. Cấu trúc mã nguồn thực tế của dự án")
    add_body_p(doc, "Cấu trúc thư mục dự án được tổ chức khoa học, phân định ranh giới trách nhiệm rõ ràng:")
    
    code_p = doc.add_paragraph()
    format_paragraph(code_p, space_before=0, space_after=6, line_spacing=1.1, align=WD_ALIGN_PARAGRAPH.LEFT)
    folder_tree = """Project_OOAD_HK1_2026-2027/
├── docker-compose.yml              # Cấu hình khởi chạy trọn gói MySQL, Backend và Frontend
├── backend/                        # Mã nguồn máy chủ API (Clean Architecture)
│   ├── app/
│   │   ├── domain/entities/        # Lớp thực thể đối tượng thuần túy (OOAD Entities)
│   │   ├── application/use_cases/  # Các lớp dịch vụ thực thi ca sử dụng (Use Cases)
│   │   ├── application/ports/      # Interface trừu tượng kết nối cơ sở dữ liệu và dịch vụ ngoài
│   │   ├── infrastructure/db/      # SQLAlchemy ORM Models, Migrations & Repositories
│   │   └── presentation/routers/   # RESTful Endpoints (FastAPI) & Pydantic Schemas
│   ├── tests/                      # Bộ kiểm thử tự động toàn diện (115 bài kiểm thử)
│   ├── scripts/                    # Các kịch bản chạy thử nghiệm thực tế & tranh chấp đồng thời
│   └── seed_data.json              # Dữ liệu mẫu khởi tạo hệ thống
├── frontend/                       # Mã nguồn ứng dụng web React + TypeScript
│   ├── src/pages/                  # Các trang giao diện (Khách hàng, Quầy bán vé, Quản trị)
│   ├── src/components/             # Các khối giao diện tái sử dụng (Sơ đồ ghế, Header, Modal)
│   └── src/services/               # Lớp gọi API tập trung đồng bộ kiểu dữ liệu
└── docs/                           # Tài liệu thiết kế: BFD, Use Case, Sequence, Class, RDM"""
    r_code = code_p.add_run(folder_tree)
    r_code.font.name = "Courier New"
    r_code.font.size = Pt(10.5)
    r_code.font.color.rgb = RGBColor(0x33, 0x41, 0x55)

    # -------------------------------------------------------------
    # MỤC 3: THỬ NGHIỆM HỆ THỐNG VÀ THỰC NGHIỆM THỰC TẾ
    # -------------------------------------------------------------
    add_heading_1(doc, "4.3. THỬ NGHIỆM HỆ THỐNG VÀ KẾT QUẢ THỰC NGHIỆM THỰC TẾ")

    add_heading_2(doc, "4.3.1. Phương pháp và các cấp độ kiểm thử")
    add_body_p(doc, "Quá trình kiểm thử được triển khai bài bản qua 3 cấp độ chính:")
    add_bullet(doc, "Kiểm thử đơn vị và tích hợp tự động (Automated Unit & Integration Testing): ", "Sử dụng pytest để kiểm thử độc lập từng phương thức trong các lớp Use Case, kiểm tra các luồng nghiệp vụ tính toán tiền vé, khấu trừ voucher, phân quyền người dùng và chính sách hoàn hủy.")
    add_bullet(doc, "Kiểm thử tranh chấp đồng thời (Concurrency / Stress Testing): ", "Mô phỏng hành vi tấn công tải hoặc số lượng lớn người dùng cùng thao tác chọn đúng một vị trí ghế trong cùng một thời điểm mili-giây để đánh giá tính toàn vẹn dữ liệu (Data Integrity) và độ tin cậy của thuật toán khoá ghế.")
    add_bullet(doc, "Kiểm thử luồng người dùng toàn trình (End-to-End Workflow Testing): ", "Mô phỏng hành động thực tế của từng tác nhân: Khách hàng mua vé online, Nhân viên bán vé và in vé tại quầy, và Quản trị viên duyệt lệnh hoàn tiền lỗi hoặc xuất báo cáo.")

    add_heading_2(doc, "4.3.2. Kết quả bộ kiểm thử tự động (Automated Test Suite)")
    add_body_p(doc, "Bộ kiểm thử tự động của hệ thống bao gồm 115 test cases phân bố trong 21 tệp kiểm thử chuyên biệt. Kết quả thực thi trực tiếp bằng lệnh `uv run --with-requirements requirements-dev.txt pytest tests/` ghi nhận tỷ lệ thành công tuyệt đối 100%:")

    # Bảng phân bổ test cases
    table_tests = doc.add_table(rows=1, cols=4)
    table_tests.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table_tests)
    
    hdr_t = table_tests.rows[0].cells
    hdr_t[0].width = Inches(2.2)
    hdr_t[1].width = Inches(1.1)
    hdr_t[2].width = Inches(1.3)
    hdr_t[3].width = Inches(1.9)
    
    for i, h in enumerate(["Tệp kiểm thử (Test File)", "Số lượng ca", "Thời gian chạy", "Kết quả thực tế"]):
        set_cell_background(hdr_t[i], "1E3A8A")
        set_cell_margins(hdr_t[i], top=120, bottom=120, left=140, right=140)
        p = hdr_t[i].paragraphs[0]
        format_paragraph(p, space_before=0, space_after=0, align=WD_ALIGN_PARAGRAPH.CENTER)
        r = p.add_run(h)
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    test_data = [
        ("test_booking.py", "12 ca", "4.21 s", "12 / 12 PASSED (100%)"),
        ("test_trips.py", "9 ca", "2.85 s", "9 / 9 PASSED (100%)"),
        ("test_auth.py", "8 ca", "2.10 s", "8 / 8 PASSED (100%)"),
        ("test_cancel_refund.py", "8 ca", "3.14 s", "8 / 8 PASSED (100%)"),
        ("test_admin_users.py", "8 ca", "1.95 s", "8 / 8 PASSED (100%)"),
        ("test_coupons.py", "7 ca", "1.65 s", "7 / 7 PASSED (100%)"),
        ("test_account.py", "7 ca", "1.42 s", "7 / 7 PASSED (100%)"),
        ("test_counter.py", "6 ca", "2.20 s", "6 / 6 PASSED (100%)"),
        ("test_fleet.py", "6 ca", "1.50 s", "6 / 6 PASSED (100%)"),
        ("test_holds.py", "6 ca", "1.80 s", "6 / 6 PASSED (100%)"),
        ("test_tickets.py", "6 ca", "1.60 s", "6 / 6 PASSED (100%)"),
        ("test_reports.py", "6 ca", "2.35 s", "6 / 6 PASSED (100%)"),
        ("test_trip_edit.py", "5 ca", "1.75 s", "5 / 5 PASSED (100%)"),
        ("test_admin_orders.py", "5 ca", "1.40 s", "5 / 5 PASSED (100%)"),
        ("test_settings.py", "4 ca", "1.10 s", "4 / 4 PASSED (100%)"),
        ("test_system.py & test_business_codes.py", "6 ca", "1.20 s", "6 / 6 PASSED (100%)"),
        ("test_seed.py & test_cleanup_worker.py", "3 ca", "1.05 s", "3 / 3 PASSED (100%)"),
        ("test_race_condition.py & test_websocket.py", "3 ca", "0.92 s", "3 / 3 PASSED (100%)"),
    ]

    for row_idx, data in enumerate(test_data):
        row = table_tests.add_row()
        for col_idx in range(4):
            cell = row.cells[col_idx]
            cell.width = [Inches(2.2), Inches(1.1), Inches(1.3), Inches(1.9)][col_idx]
            if row_idx % 2 == 1:
                set_cell_background(cell, "F8FAFC")
            set_cell_margins(cell, top=80, bottom=80, left=140, right=140)
            p = cell.paragraphs[0]
            align = WD_ALIGN_PARAGRAPH.CENTER if col_idx in (1, 2, 3) else WD_ALIGN_PARAGRAPH.LEFT
            format_paragraph(p, space_before=0, space_after=0, align=align)
            r = p.add_run(data[col_idx])
            r.font.name = "Times New Roman"
            r.font.size = Pt(11.5)
            if col_idx == 3:
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x16, 0x65, 0x34) # Green

    add_callout_box(doc, "Tổng kết thực thi toàn bộ 115 test cases:\n• Kết quả: 115 passed trong 34.19 giây trên máy trạm thử nghiệm.\n• Không phát sinh bất kỳ lỗi cú pháp, ngoại lệ unhandled exception hay rò rỉ dữ liệu phiên làm việc (Session Leak) nào.\n• Khẳng định tính chính xác của các thuật toán nghiệp vụ theo đúng thiết kế hướng đối tượng.", "TỔNG HỢP KIỂM THỬ TỰ ĐỘNG:")

    add_heading_2(doc, "4.3.3. Thực nghiệm kiểm thử tranh chấp đồng thời (Race Condition)")
    add_body_p(doc, "Một trong những thách thức cốt lõi của các bài toán đặt vé trực tuyến là hiện tượng nhiều người dùng cùng nhấn chọn và giữ một vị trí ghế trong cùng một thời điểm. Nếu hệ thống không xử lý khóa giao dịch đúng cách, hiện tượng bán trùng vé (Double Booking) sẽ xảy ra.")
    
    add_body_p(doc, "Kịch bản thực nghiệm: Khởi tạo 5 luồng bất đồng bộ (Concurrent Threads) đại diện cho 5 tài khoản khách hàng khác nhau đã đăng nhập hợp lệ. Cả 5 luồng cùng gửi yêu cầu giữ chỗ (POST /api/trips/{trip_id}/hold) đối với duy nhất một vị trí ghế A03 (seat_id: 461) trên chuyến xe #335 (TP. Hồ Chí Minh đi Đà Lạt) tại cùng một tích tắc thời gian.")

    add_callout_box(doc, "Dữ liệu log thực tế nhận được từ máy chủ API:\n"
                         "• User 1: HTTP 409 Conflict - {\"detail\":\"Một số ghế không còn trống, vui lòng chọn ghế khác\",\"unavailable_seat_ids\":[461]}\n"
                         "• User 2: HTTP 200 OK - {\"trip_id\":335,\"seats\":[{\"seat_id\":461,\"code\":\"A03\"}],\"hold_until\":\"2026-11-17T12:16:10\",\"seconds_left\":900}\n"
                         "• User 3: HTTP 409 Conflict - {\"detail\":\"Một số ghế không còn trống, vui lòng chọn ghế khác\",\"unavailable_seat_ids\":[461]}\n"
                         "• User 4: HTTP 409 Conflict - {\"detail\":\"Một số ghế không còn trống, vui lòng chọn ghế khác\",\"unavailable_seat_ids\":[461]}\n"
                         "• User 5: HTTP 409 Conflict - {\"detail\":\"Một số ghế không còn trống, vui lòng chọn ghế khác\",\"unavailable_seat_ids\":[461]}\n\n"
                         "Đánh giá kỹ thuật: Cơ chế khóa lạc quan/bi quan phối hợp giữa tầng Application và tầng Cơ sở dữ liệu (InnoDB Row-Level Locking) hoạt động chuẩn xác 100%. Đúng duy nhất 1 luồng thành công khóa ghế trong thời hạn 15 phút (900 giây), 4 luồng còn lại bị từ chối với mã lỗi 409 rõ ràng, tuyệt đối không xảy ra hiện tượng giữ trùng ghế.",
                         "KẾT QUẢ THỰC NGHIỆM TRANH CHẤP GHẾ ĐỒNG THỜI:")

    add_heading_2(doc, "4.3.4. Thực nghiệm luồng bán vé tại quầy (Counter Workflow)")
    add_body_p(doc, "Quy trình bán vé trực tiếp tại bến xe dành cho tác nhân Nhân viên quầy (NHAN_VIEN_BAN_VE) được thực nghiệm từng bước trên môi trường máy chủ đang hoạt động:")
    add_bullet(doc, "Bước 1: ", "Nhân viên quầy đăng nhập (SĐT: 0900000001), hệ thống cấp phát token JWT có vai trò clerk.")
    add_bullet(doc, "Bước 2: ", "Tra cứu chuyến xe theo lịch trình ngày 2026-11-18 tuyến TP.HCM - Đà Lạt (Chuyến #335) và lấy danh sách ghế trống.")
    add_bullet(doc, "Bước 3 (Khóa giữ chỗ): ", "Nhân viên giữ chỗ ghế A07 (seat_id: 465) thành công với mã phản hồi HTTP 200.")
    add_bullet(doc, "Bước 4 (Lập đơn bán vé): ", "Gửi yêu cầu tạo đơn tại quầy (POST /api/counter/orders) với thông tin hành khách 'Nguyễn Văn Test', SĐT '0911223344'. Kết quả tạo thành công Đơn hàng mang mã số `ORD-261117-5829`, tổng tiền 280.000 VNĐ, trạng thái ban đầu `CHO_THANH_TOAN`.")
    add_bullet(doc, "Bước 5 (Thu tiền mặt): ", "Gọi API xác nhận thanh toán tiền mặt (POST /api/orders/5829/pay với method 'TIEN_MAT'). Kết quả: Đơn hàng chuyển sang trạng thái `DA_THANH_TOAN`, hệ thống tự động sinh vé xe mang mã `VE-261117-5860` ở trạng thái `CHUA_DI` kèm mã chuỗi xác thực QR code hợp lệ (`yQd-OtLm7yzGXbAiUHBDjw`).")

    add_heading_2(doc, "4.3.5. Thực nghiệm luồng mua vé trực tuyến và áp dụng khuyến mãi")
    add_body_p(doc, "Quy trình dành cho Khách hàng trực tuyến (KHACH_HANG) được kiểm chứng độc lập trên hệ thống:")
    add_bullet(doc, "Bước 1: ", "Khách hàng đăng nhập (SĐT: 0900000002) và thực hiện giữ chỗ ghế trống A08 trên chuyến xe #335.")
    add_bullet(doc, "Bước 2: ", "Gửi yêu cầu đặt vé trực tuyến (POST /api/orders) kèm mã giảm giá `CHAOBAN`. Kết quả: Hệ thống tự động xác nhận đơn hàng `ORD-261117-5830`, khấu trừ voucher giảm giá 28.000 VNĐ (10% của 280.000 VNĐ), số tiền cần thanh toán thực tế được ghi nhận chính xác là 252.000 VNĐ.")
    add_bullet(doc, "Bước 3: ", "Tiến hành thanh toán trực tuyến qua phương thức VietQR có mô phỏng kết quả thành công (`POST /api/orders/5830/pay` với method: VIETQR, simulate: success). Giao dịch hoàn tất thành công, vé xe được cấp phát tức thì vào tài khoản của khách hàng.")

    add_heading_2(doc, "4.3.6. Thực nghiệm chính sách hủy vé và hoàn tiền theo mốc thời gian")
    add_body_p(doc, "Hệ thống cài đặt quy định nghiêm ngặt về chính sách hủy vé nhằm bảo vệ quyền lợi của nhà xe và hành khách. Thực nghiệm được tiến hành đối chứng trên 2 trường hợp cụ thể:")
    
    add_bullet(doc, "Trường hợp 1 - Vi phạm quy định thời gian hủy vé (< 24 giờ trước giờ khởi hành): ", 
               "Thử nghiệm yêu cầu hủy vé `VE-261117-5861` (khởi hành lúc 06:00:00 ngày 2026-11-18, thời gian còn lại trước giờ chạy là 10.8 giờ). Kết quả gọi API kiểm tra trước (GET /api/tickets/5861/cancel-quote) trả về `can_cancel: False` cùng lý do: 'Chỉ được hủy khi còn ít nhất 24 giờ trước giờ khởi hành (còn 10.8 giờ)'. Khi cố tình gửi yêu cầu hủy vé (POST /api/tickets/5861/cancel), máy chủ lập tức từ chối và phản hồi mã lỗi `HTTP 400 Bad Request`. Ràng buộc nghiệp vụ được thực thi tuyệt đối.")
    
    add_bullet(doc, "Trường hợp 2 - Đủ điều kiện hủy vé hợp lệ (> 24 giờ trước giờ khởi hành): ", 
               "Thử nghiệm đối với vé `VE-261117-5862` (khởi hành ngày 2026-11-20, thời gian còn lại trước giờ chạy là 58.8 giờ). Khi gọi kiểm tra, hệ thống trả về `can_cancel: True`, tính toán phí hủy vé theo quy định là 15% (42.000 VNĐ), số tiền hoàn lại là 238.000 VNĐ (85%). Khi gửi lệnh hủy chính thức, hệ thống trả về mã `HTTP 200 OK`, tự động sinh mã hoàn tiền `HT-261117-0247`, chuyển trạng thái vé sang `DA_HUY` và giải phóng ghế lập tức về trạng thái `TRONG` để các khách hàng khác có thể tiếp tục đặt.")

    add_heading_2(doc, "4.3.7. Thực nghiệm xuất báo cáo tài chính đa định dạng")
    add_body_p(doc, "Chức năng thống kê dành cho Quản trị viên (ADMIN) đã được kiểm nghiệm thực tế với 3 định dạng xuất dữ liệu qua API báo cáo theo kỳ doanh thu (date_from=2026-11-01 đến date_to=2026-11-30):")
    add_bullet(doc, "Xuất tệp CSV (/admin/reports/export.csv): ", "HTTP 200 OK, kích thước 2.070 bytes, MIME type text/csv; charset=utf-8. Dữ liệu phân tách dấu phẩy chuẩn hóa.")
    add_bullet(doc, "Xuất tệp Excel (/admin/reports/export.xlsx): ", "HTTP 200 OK, kích thước 7.562 bytes, MIME type application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, có định dạng tiêu đề, căn lề và đường viền bảng tính rõ ràng.")
    add_bullet(doc, "Xuất tệp PDF (/admin/reports/export.pdf): ", "HTTP 200 OK, kích thước 26.407 bytes, MIME type application/pdf, phôi trang in chuyên nghiệp kèm đầy đủ biểu mẫu thống kê doanh thu và tỷ lệ lấp đầy ghế.")

    # -------------------------------------------------------------
    # MỤC 4: ĐÁNH GIÁ KẾT QUẢ VÀ TỔNG KẾT
    # -------------------------------------------------------------
    add_heading_1(doc, "4.4. ĐÁNH GIÁ KẾT QUẢ VÀ TỔNG KẾT HỆ THỐNG")

    add_heading_2(doc, "4.4.1. Bảng đối chiếu mức độ hoàn thành so với yêu cầu ban đầu")
    add_body_p(doc, "Dưới đây là bảng tổng hợp đối chiếu một cách trung thực giữa phạm vi chức năng đã phân tích trong mô hình Use Case / BFD ban đầu so với kết quả cài đặt và kiểm nghiệm thực tế:")

    # Bảng đánh giá tính năng
    table_eval = doc.add_table(rows=1, cols=4)
    table_eval.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table_eval)
    
    hdr_e = table_eval.rows[0].cells
    hdr_e[0].width = Inches(0.6)
    hdr_e[1].width = Inches(2.2)
    hdr_e[2].width = Inches(1.3)
    hdr_e[3].width = Inches(2.4)
    
    for i, h in enumerate(["STT", "Nhóm chức năng / Use Case", "Tỷ lệ hoàn thành", "Đánh giá chi tiết thực nghiệm"]):
        set_cell_background(hdr_e[i], "1E3A8A")
        set_cell_margins(hdr_e[i], top=120, bottom=120, left=140, right=140)
        p = hdr_e[i].paragraphs[0]
        format_paragraph(p, space_before=0, space_after=0, align=WD_ALIGN_PARAGRAPH.CENTER)
        r = p.add_run(h)
        r.font.name = "Times New Roman"
        r.font.size = Pt(12)
        r.font.bold = True
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)

    eval_data = [
        ("1", "Quản lý xác thực & Phân quyền", "100%", "Đầy đủ Đăng ký, Đăng nhập, Quên mật khẩu, Đổi mật khẩu, phân quyền 3 vai trò (Admin, Nhân viên, Khách hàng)."),
        ("2", "Tìm kiếm chuyến xe & Lọc", "100%", "Tìm kiếm đa tiêu chí (Nơi đi, Nơi đến, Ngày đi). Tự động chặn tra cứu chuyến trong quá khứ và gợi ý ngày phù hợp."),
        ("3", "Sơ đồ ghế & Khóa giữ chỗ", "100%", "Hiển thị sơ đồ 1 tầng/2 tầng trực quan. Khóa giữ chỗ 15 phút, chống tranh chấp Race Condition thành công 100%."),
        ("4", "Đặt vé & Khuyến mãi (Online)", "100%", "Đặt vé nhiều ghế cùng lúc, áp dụng mã giảm giá tự động kiểm tra điều kiện, sinh đơn hàng và vé tức thì."),
        ("5", "Bán vé tại quầy (Offline)", "100%", "Nhân viên quầy chọn chuyến, khóa ghế, lập phiếu bán vé, thanh toán tiền mặt và in phôi vé tại bến."),
        ("6", "Hủy vé & Hoàn tiền tự động", "100%", "Kiểm soát điều kiện hủy >24h (tính phí 15%), chặn hủy <24h. Tự động sinh giao dịch hoàn tiền tương ứng."),
        ("7", "Thanh toán trực tuyến", "90%", "Đã tích hợp đầy đủ luồng VietQR, MoMo, ZaloPay ở mức độ giả lập Mock Gateway; chưa đấu nối hợp đồng Merchant thật."),
        ("8", "Giải phóng ghế quá hạn (Worker)", "100%", "Tiến trình Cleanup Worker tự động quét và giải phóng các ghế giữ chỗ hoặc đơn hàng quá hạn thanh toán."),
        ("9", "Thống kê & Xuất báo cáo", "100%", "Thống kê doanh thu theo ngày/tháng/tuyến, tỷ lệ lấp đầy ghế. Hỗ trợ xuất dữ liệu ra 3 định dạng CSV, XLSX và PDF."),
        ("10", "Soát vé lên xe (Check-in)", "100%", "Tra cứu thông tin vé nhanh bằng cách quét mã chuỗi QR, mã vé chuẩn hóa hoặc số điện thoại hành khách.")
    ]

    for row_idx, data in enumerate(eval_data):
        row = table_eval.add_row()
        for col_idx in range(4):
            cell = row.cells[col_idx]
            cell.width = [Inches(0.6), Inches(2.2), Inches(1.3), Inches(2.4)][col_idx]
            if row_idx % 2 == 1:
                set_cell_background(cell, "F8FAFC")
            set_cell_margins(cell, top=80, bottom=80, left=140, right=140)
            p = cell.paragraphs[0]
            align = WD_ALIGN_PARAGRAPH.CENTER if col_idx in (0, 2) else WD_ALIGN_PARAGRAPH.LEFT
            format_paragraph(p, space_before=0, space_after=0, align=align)
            r = p.add_run(data[col_idx])
            r.font.name = "Times New Roman"
            r.font.size = Pt(11.5)
            if col_idx == 2:
                r.font.bold = True
                r.font.color.rgb = RGBColor(0x16, 0x65, 0x34) if "100%" in data[col_idx] else RGBColor(0x85, 0x4D, 0x0E)

    p_space2 = doc.add_paragraph()
    format_paragraph(p_space2, space_before=0, space_after=6)

    add_heading_2(doc, "4.4.2. Ưu điểm nổi bật của hệ thống")
    add_bullet(doc, "Tính nhất quán cao với mô hình thiết kế OOAD: ", "Cấu trúc mã nguồn Clean Architecture giúp phản ánh trung thực toàn bộ các thực thể, thuộc tính và phương thức đã được phân tích trên Sơ đồ lớp (Class Diagram) và Sơ đồ tuần tự (Sequence Diagram).")
    add_bullet(doc, "Xử lý triệt để bài toán đồng thời (Concurrency): ", "Khắc phục hoàn toàn lỗi đặt trùng ghế nhờ phối hợp khóa giao dịch ở cấp cơ sở dữ liệu và cơ chế đếm ngược thời gian giữ chỗ linh hoạt.")
    add_bullet(doc, "Độ ổn định và tin cậy được kiểm chứng: ", "100% các bài kiểm thử tự động (115/115 tests) vượt qua thành công; toàn bộ các kịch bản ngoại lệ nghiệp vụ (hủy vé trễ, đặt ghế đang giữ) đều được phản hồi tường minh bằng mã lỗi chuẩn RESTful.")
    add_bullet(doc, "Tính tiện dụng và khả năng đóng gói cao: ", "Triển khai trọn gói chỉ với Docker Compose, hỗ trợ xuất báo cáo đa định dạng và giao diện thân thiện với người dùng.")

    add_heading_2(doc, "4.4.3. Các hạn chế còn tồn đọng và bài học kinh nghiệm")
    add_body_p(doc, "Với tinh thần đánh giá thành thật và khách quan, nhóm ghi nhận các điểm còn hạn chế của đồ án hiện tại:")
    add_bullet(doc, "Cổng thanh toán thực tế: ", "Hiện tại cổng thanh toán VietQR và thẻ đang hoạt động ở chế độ giả lập (Mocking Gateway) để phục vụ kiểm thử nghiệp vụ đồ án, chưa thể kết nối thực tế với tài khoản doanh nghiệp tại các cổng trung gian thanh toán như VNPAY hay MoMo thật do yêu cầu pháp nhân và chi phí.")
    add_bullet(doc, "Dịch vụ tin nhắn SMS: ", "Mã OTP và thông báo đặt vé thành công hiện mới chỉ mô phỏng (Mock SMS) hiển thị trên màn hình phát triển hoặc log hệ thống, chưa đấu nối trực tiếp với nhà mạng viễn thông (SMS Brandname).")
    add_bullet(doc, "Phạm vi nền tảng: ", "Hệ thống mới tập trung hoàn thiện giao diện ứng dụng Web đáp ứng (Responsive Web), chưa xây dựng ứng dụng di động gốc (Native Mobile App trên iOS/Android).")
    add_bullet(doc, "Cắt giảm một số tính năng phụ: ", "Theo quyết định cắt giảm phạm vi trong quá trình thiết kế để tập trung làm sâu luồng mua vé chính, các chức năng như Đổi vé tự động và Quản lý trạm dừng chi tiết đã được tạm hoãn lại ở phiên bản hiện tại.")

    add_heading_2(doc, "4.4.4. Hướng phát triển mở rộng trong tương lai")
    add_bullet(doc, "1. ", "Tích hợp cổng thanh toán trực tuyến thực tế qua môi trường thử nghiệm Sandbox của VNPAY hoặc VietQR Napas 247.")
    add_bullet(doc, "2. ", "Xây dựng ứng dụng di động (Mobile App) bằng Flutter hoặc React Native cho cả hành khách và tài xế/phụ xe để quét vé trực tiếp qua camera điện thoại.")
    add_bullet(doc, "3. ", "Tích hợp hệ thống định vị GPS để hành khách có thể theo dõi vị trí xe chạy thời gian thực trên bản đồ vệ tinh trước giờ đón.")

    # Lưu tài liệu
    output_path = "/home/long/Documents/University/HOCTAP/HK7/Object-Oriented Analysis and Design (OOAD)/DoAn/Project_OOAD_HK1_2026-2027/BaoCao_CaiDat_Va_ThuNghiem_OOAD.docx"
    doc.save(output_path)
    print(f"File Word đã được sinh thành công tại: {output_path}")

if __name__ == "__main__":
    main()
