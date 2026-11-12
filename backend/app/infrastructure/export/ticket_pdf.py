"""Xuất phôi vé xe khách điện tử chuẩn PDF khổ A4 có hỗ trợ tiếng Việt có dấu.

Sử dụng thư viện fpdf2 với phông chữ DejaVu Sans tiếng Việt có sẵn trong repository.
"""

from __future__ import annotations

import pathlib
from fpdf import FPDF
from app.domain.entities.booking import TicketRecord

FONTS = pathlib.Path(__file__).resolve().parents[2] / "assets" / "fonts"


def _money(val: float | int) -> str:
    return f"{float(val):,.0f} đ".replace(",", ".")


def generate_ticket_pdf(rec: TicketRecord) -> bytes:
    t = rec.ticket
    pdf = FPDF(orientation="P", format="A4")
    pdf.add_font("DejaVu", "", str(FONTS / "DejaVuSans.ttf"))
    pdf.add_font("DejaVu", "B", str(FONTS / "DejaVuSans-Bold.ttf"))
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)

    # Header Banner
    pdf.set_fill_color(30, 41, 59)  # Slate-800
    pdf.rect(0, 0, 210, 32, "F")

    pdf.set_text_color(255, 255, 255)
    pdf.set_font("DejaVu", "B", 18)
    pdf.set_xy(15, 8)
    pdf.cell(180, 8, "VÉ XE KHÁCH ĐIỆN TỬ", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("DejaVu", "", 10)
    pdf.set_text_color(203, 213, 225)
    pdf.set_x(15)
    pdf.cell(180, 6, "HỆ THỐNG ĐẶT VÉ XE KHÁCH LIÊN TỈNH (OOAD BUS LINES)", align="C", new_x="LMARGIN", new_y="NEXT")

    pdf.set_xy(15, 38)
    pdf.set_text_color(30, 41, 59)

    # Box Mã vé & Trạng thái
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(226, 232, 240)
    pdf.rect(15, 38, 180, 22, "FD")

    pdf.set_xy(20, 42)
    pdf.set_font("DejaVu", "B", 11)
    ticket_code = t.code or f"VE-{t.id:04d}"
    pdf.cell(85, 6, f"MÃ VÉ: {ticket_code}")

    pdf.set_xy(110, 42)
    pdf.set_font("DejaVu", "B", 11)
    raw_status = str(t.status.value if hasattr(t.status, "value") else t.status)
    status_text = "CHƯA ĐI (HỢP LỆ)" if raw_status == "CHUA_DI" else raw_status
    pdf.cell(80, 6, f"TRẠNG THÁI: {status_text}", align="R")

    pdf.set_xy(20, 50)
    pdf.set_font("DejaVu", "", 9)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(85, 5, f"Kênh xuất vé: {'Bán tại quầy' if rec.channel == 'TAI_QUAY' else 'Trực tuyến'}")
    pdf.set_xy(110, 50)
    pdf.cell(80, 5, f"Hình thức thanh toán: {rec.payment_method or 'Đã thanh toán'}", align="R")

    # Mục 1: Thông tin hành khách
    pdf.set_xy(15, 66)
    pdf.set_text_color(15, 23, 42)
    pdf.set_font("DejaVu", "B", 12)
    pdf.cell(180, 8, "1. THÔNG TIN HÀNH KHÁCH", border="B", new_x="LMARGIN", new_y="NEXT")

    pdf.set_font("DejaVu", "", 10)
    pdf.ln(2)
    pdf.set_x(20)
    pdf.cell(90, 7, f"Họ và tên: {t.passenger_name}")
    pdf.cell(90, 7, f"Số điện thoại: {t.passenger_phone}", new_x="LMARGIN", new_y="NEXT")

    # Mục 2: Thông tin chuyến xe
    pdf.ln(3)
    pdf.set_x(15)
    pdf.set_font("DejaVu", "B", 12)
    pdf.cell(180, 8, "2. THÔNG TIN CHUYẾN ĐI & VỊ TRÍ GHẾ", border="B", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(2)
    pdf.set_x(20)
    pdf.set_font("DejaVu", "", 10)
    route_name = f"{t.origin or 'Điểm đi'} -> {t.destination or 'Điểm đến'}"
    pdf.cell(90, 7, f"Tuyến đường: {route_name}")
    pdf.cell(90, 7, f"Biển số xe: {t.plate or 'Xe tuyến'}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(20)
    dep_date_str = t.departure_at.strftime("%d/%m/%Y") if (t.departure_at and hasattr(t.departure_at, "strftime")) else "Theo thông báo"
    dep_time_str = t.departure_at.strftime("%H:%M") if (t.departure_at and hasattr(t.departure_at, "strftime")) else ""
    pdf.cell(90, 7, f"Ngày khởi hành: {dep_date_str}")
    pdf.cell(90, 7, f"Giờ khởi hành: {dep_time_str}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(20)
    pdf.set_font("DejaVu", "B", 11)
    pdf.set_text_color(194, 65, 12)  # Terracotta / Cam đậm
    pdf.cell(90, 7, f"Số ghế chỉ định: {t.seat_code or f'#{t.seat_id}'}")
    pdf.set_text_color(15, 23, 42)
    pdf.set_font("DejaVu", "", 10)
    pdf.cell(90, 7, f"Chuyến xe số: #{t.trip_id}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(20)
    pdf.cell(90, 7, f"Điểm đón: {t.pickup_name or 'Bến xe xuất phát'}")
    pdf.cell(90, 7, f"Điểm trả: {t.dropoff_name or 'Bến xe đến'}", new_x="LMARGIN", new_y="NEXT")

    # Mục 3: Chi tiết thanh toán
    pdf.ln(3)
    pdf.set_x(15)
    pdf.set_font("DejaVu", "B", 12)
    pdf.cell(180, 8, "3. CHI TIẾT CƯỚC VẬN CHUYỂN", border="B", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(2)
    pdf.set_x(20)
    pdf.set_font("DejaVu", "", 10)
    pdf.cell(90, 7, f"Giá vé niêm yết: {_money(t.original_price)}")
    pdf.cell(90, 7, f"Khuyến mãi / Giảm trừ: {_money(t.discount)}", new_x="LMARGIN", new_y="NEXT")

    pdf.set_x(20)
    pdf.set_font("DejaVu", "B", 11)
    pdf.cell(90, 7, f"Tổng tiền đã thanh toán: {_money(t.amount)}")
    pdf.cell(90, 7, "", new_x="LMARGIN", new_y="NEXT")

    # Mục 4: Mã QR và Hướng dẫn lên xe
    pdf.ln(3)
    pdf.set_x(15)
    pdf.set_font("DejaVu", "B", 12)
    pdf.cell(180, 8, "4. QUY ĐỊNH & HƯỚNG DẪN ĐI XE", border="B", new_x="LMARGIN", new_y="NEXT")

    pdf.ln(3)
    pdf.set_font("DejaVu", "", 9)
    pdf.set_text_color(71, 85, 105)
    pdf.set_x(20)
    qr_str = t.qr_code or f"VEXE-{ticket_code}"
    pdf.multi_cell(
        170,
        5,
        "• Quý khách vui lòng có mặt tại điểm đón trước giờ khởi hành ít nhất 20 phút.\n"
        "• Xuất trình mã vé hoặc mã QR trên file vé điện tử này cho nhân viên soát vé khi lên xe.\n"
        "• Hành khách có quyền hủy vé online trước hạn quy định theo chính sách của nhà xe (hoàn tiền tự động).\n"
        "• Mọi thắc mắc vui lòng liên hệ tổng đài hỗ trợ hành khách: 1900 6868.\n"
        f"• Chuỗi xác thực bảo mật vé: {qr_str}",
    )

    # Footer chân trang
    pdf.set_xy(15, 272)
    pdf.set_font("DejaVu", "", 8)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(180, 5, "Vé điện tử được khởi tạo tự động từ Hệ thống Quản trị & Đặt vé Xe Khách OOAD. Có giá trị pháp lý tương đương vé giấy.", align="C")

    return bytes(pdf.output())
