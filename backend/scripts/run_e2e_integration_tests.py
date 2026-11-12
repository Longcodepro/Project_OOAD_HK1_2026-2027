#!/usr/bin/env python3
"""
OOAD Bus Ticket System - Comprehensive E2E Integration & QA Testing Suite
Simulates all user journeys across Customer, Staff, and Admin roles
via the Frontend Vite Proxy (http://localhost:5173/api) and validates the backend directly (http://localhost:8005).
"""

import sys
import time
import json
import random
import subprocess
from decimal import Decimal
import requests

# Base URLs
BACKEND_BASE = "http://localhost:8005"
FRONTEND_BASE = "http://localhost:5173"
API_BASE = "http://localhost:5173/api"  # All application requests routed via Vite Proxy

class TestRunner:
    def __init__(self):
        self.results = []
        self.session = requests.Session()

    def run_step(self, scenario: str, name: str, method: str, url: str, check_fn, **kwargs):
        full_url = f"{API_BASE}{url}" if url.startswith("/") else url
        start_time = time.perf_counter()
        error = None
        resp = None
        status_code = None
        
        try:
            resp = self.session.request(method, full_url, **kwargs)
            status_code = resp.status_code
        except Exception as e:
            error = str(e)

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        passed = False
        details = ""

        if error:
            details = f"Connection error: {error}"
        else:
            try:
                passed, details = check_fn(resp)
            except Exception as e:
                passed = False
                details = f"Assertion failed: {str(e)}"

        status_str = "PASS" if passed else "FAIL"
        print(f"[{status_str}] ({elapsed_ms:6.2f}ms) [{method:5}] {url} - {name}")
        if not passed:
            print(f"       -> Details: {details}")

        self.results.append({
            "scenario": scenario,
            "name": name,
            "method": method,
            "url": url,
            "status_code": status_code,
            "elapsed_ms": elapsed_ms,
            "passed": passed,
            "details": details
        })
        return resp, passed

def main():
    runner = TestRunner()
    print("=" * 80)
    print("🚀 BẮT ĐẦU KIỂM THỬ E2E TÍCH HỢP HỆ THỐNG VÉ XE KHÁCH (OOAD)")
    print(f"🎯 Backend Host  : {BACKEND_BASE}")
    print(f"🎯 Frontend Host : {FRONTEND_BASE}")
    print(f"🎯 API Gateway   : {API_BASE} (Vite Proxy)")
    print("=" * 80)

    # -------------------------------------------------------------
    # 0. PRE-FLIGHT CONNECTIVITY & PROXY CHECKS
    # -------------------------------------------------------------
    print("\n[0] KIỂM TRA TRẠNG THÁI MÁY CHỦ & KẾT NỐI PROXY...")

    # 0.1 Direct Backend Health
    runner.run_step(
        "0. Hạ tầng mạng & Proxy",
        "Backend Direct Health Check (http://localhost:8005/health)",
        "GET",
        f"{BACKEND_BASE}/health",
        lambda r: (r.status_code == 200 and r.json().get("status") == "ok", f"DB Status: {r.json().get('database')}")
    )

    # 0.2 Frontend Vite Server
    runner.run_step(
        "0. Hạ tầng mạng & Proxy",
        "Frontend Vite Dev Server (http://localhost:5173/)",
        "GET",
        f"{FRONTEND_BASE}/",
        lambda r: (r.status_code == 200 and "<html" in r.text.lower(), f"HTTP {r.status_code} - Vite HTML ready")
    )

    # 0.3 Frontend Vite Proxy forwarding /api/health
    runner.run_step(
        "0. Hạ tầng mạng & Proxy",
        "Vite Proxy /api/health forwarding to Backend",
        "GET",
        "/health",
        lambda r: (r.status_code == 200 and r.json().get("status") == "ok", f"DB Status: {r.json().get('database')}")
    )

    # -------------------------------------------------------------
    # SETUP: Admin chuẩn bị tham số và voucher ban đầu
    # -------------------------------------------------------------
    print("\n[*] THIẾT LẬP THAM SỐ VÀ DỮ LIỆU BAN ĐẦU...")
    admin_login_res = runner.session.post(f"{API_BASE}/auth/login", json={"phone": "0900000000", "password": "Admin12345"})
    admin_token = admin_login_res.json()["access_token"]
    admin_auth_header = {"Authorization": f"Bearer {admin_token}"}

    # Cấu hình thời gian giữ chỗ 15 phút
    runner.run_step(
        "Thiết lập tham số",
        "Admin: Cấu hình THOI_GIAN_GIU_CHO_PHUT = 15",
        "PATCH",
        "/admin/settings/THOI_GIAN_GIU_CHO_PHUT",
        lambda r: (r.status_code == 200 and r.json().get("value") == "15", f"Value: {r.json().get('value')} phút"),
        json={"value": 15},
        headers=admin_auth_header
    )

    # Đảm bảo voucher CHAOBAN đang bật (BAT)
    try:
        coupons_resp = runner.session.get(f"{API_BASE}/admin/coupons", headers=admin_auth_header).json()
        cb_id = next((c["id"] for c in coupons_resp if c["code"] == "CHAOBAN"), 1)
    except Exception:
        cb_id = 1
    runner.run_step(
        "Thiết lập tham số",
        "Admin: Kích hoạt voucher CHAOBAN (BAT)",
        "PATCH",
        f"/admin/coupons/{cb_id}",
        lambda r: (r.status_code == 200 and r.json().get("status") == "BAT", f"Status: {r.json().get('status')}"),
        json={"status": "BAT"},
        headers=admin_auth_header
    )

    # -------------------------------------------------------------
    # KỊCH BẢN 1: KHÁCH HÀNG (CUSTOMER E2E)
    # -------------------------------------------------------------
    print("\n" + "=" * 80)
    print("📋 KỊCH BẢN 1: KHÁCH HÀNG (CUSTOMER E2E WORKFLOW)")
    print("=" * 80)

    customer_phone = f"097{random.randint(1000000, 9999999)}"
    customer_password = "Password@123"
    customer_name = "Nguyễn E2E Khách Hàng"
    mock_otp = None
    customer_token = None
    customer_auth_header = {}
    selected_trip = None
    selected_seat_id = None
    seat_code = None
    order_id = None
    ticket_id = None

    # 1.1 Yêu cầu OTP đăng ký
    otp_resp, _ = runner.run_step(
        "Kịch bản 1: Khách hàng",
        "1.1 Gửi yêu cầu OTP đăng ký số điện thoại mới",
        "POST",
        "/auth/register/otp",
        lambda r: (r.status_code == 200 and r.json().get("mock_otp") is not None, f"OTP nhận được: {r.json().get('mock_otp')}"),
        json={"phone": customer_phone}
    )
    if otp_resp and otp_resp.status_code == 200:
        mock_otp = otp_resp.json().get("mock_otp")

    # 1.2 Đăng ký tài khoản với OTP
    runner.run_step(
        "Kịch bản 1: Khách hàng",
        "1.2 Hoàn tất đăng ký tài khoản khách hàng bằng OTP",
        "POST",
        "/auth/register",
        lambda r: (r.status_code == 201 and r.json().get("phone") == customer_phone, f"Tài khoản #{r.json().get('id')} - {r.json().get('full_name')}"),
        json={
            "phone": customer_phone,
            "full_name": customer_name,
            "password": customer_password,
            "otp": mock_otp or "123456"
        }
    )

    # 1.3 Đăng nhập tài khoản khách hàng mới tạo
    login_resp, _ = runner.run_step(
        "Kịch bản 1: Khách hàng",
        "1.3 Đăng nhập tài khoản khách hàng lấy access token JWT",
        "POST",
        "/auth/login",
        lambda r: (r.status_code == 200 and bool(r.json().get("access_token")), f"Token thời hạn: {r.json().get('expires_in_seconds')}s"),
        json={"phone": customer_phone, "password": customer_password}
    )
    if login_resp and login_resp.status_code == 200:
        customer_token = login_resp.json()["access_token"]
        customer_auth_header = {"Authorization": f"Bearer {customer_token}"}

    # 1.4 Tìm kiếm chuyến TP.HCM - Đà Lạt
    search_resp, _ = runner.run_step(
        "Kịch bản 1: Khách hàng",
        "1.4 Tìm kiếm chuyến xe TP.HCM - Đà Lạt ngày 2026-11-15",
        "GET",
        "/trips/search?origin=TP.+H%E1%BB%93+Ch%C3%AD+Minh&destination=%C4%90%C3%A0+L%E1%BA%A1t&date=2026-11-15",
        lambda r: (r.status_code == 200 and len(r.json().get("items", [])) > 0, f"Tìm thấy {len(r.json().get('items', []))} chuyến xe")
    )
    if search_resp and search_resp.status_code == 200 and search_resp.json().get("items"):
        selected_trip = search_resp.json()["items"][0]

    # 1.5 Lấy sơ đồ ghế và chọn ghế trống
    seats_resp, _ = runner.run_step(
        "Kịch bản 1: Khách hàng",
        f"1.5 Lấy sơ đồ ghế chuyến #{selected_trip['id']} ({selected_trip['origin']} -> {selected_trip['destination']})",
        "GET",
        f"/trips/{selected_trip['id']}/seats",
        lambda r: (r.status_code == 200 and len(r.json()) > 0, f"Tổng số {len(r.json())} vị trí ghế trên xe")
    )
    if seats_resp and seats_resp.status_code == 200:
        available_seats = [s for s in seats_resp.json() if s["state"] == "TRONG"]
        if available_seats:
            selected_seat_id = available_seats[0]["seat_id"]
            seat_code = available_seats[0]["code"]

    # 1.6 Giữ ghế 15 phút
    runner.run_step(
        "Kịch bản 1: Khách hàng",
        f"1.6 Khóa tạm giữ ghế {seat_code} trong 15 phút (900s)",
        "POST",
        f"/trips/{selected_trip['id']}/hold",
        lambda r: (
            r.status_code == 200 and r.json().get("seconds_left", 0) >= 890,
            f"Thời gian giữ: {r.json().get('seconds_left')}s (Hạn giữ: {r.json().get('hold_until')})"
        ),
        json={"seat_ids": [selected_seat_id]},
        headers=customer_auth_header
    )

    # 1.7 Áp dụng mã giảm giá CHAOBAN
    runner.run_step(
        "Kịch bản 1: Khách hàng",
        "1.7 Kiểm tra tính hợp lệ và áp dụng voucher CHAOBAN",
        "POST",
        "/coupons/validate",
        lambda r: (
            r.status_code == 200 and (r.json().get("discount") or 0) > 0,
            f"Mã: {r.json().get('code')}, Giảm: {r.json().get('discount', 0):,.0f}đ, Cần trả: {r.json().get('final_amount', 0):,.0f}đ"
        ),
        json={"code": "CHAOBAN", "amount": float(selected_trip["price"])},
        headers=customer_auth_header
    )

    # 1.8 Tạo đơn hàng đặt vé
    order_resp, _ = runner.run_step(
        "Kịch bản 1: Khách hàng",
        "1.8 Tạo đơn hàng đặt vé trực tuyến",
        "POST",
        "/orders",
        lambda r: (
            r.status_code == 201 and r.json().get("status") == "CHO_THANH_TOAN",
            f"Đơn hàng #{r.json().get('id')}, Tổng tiền: {r.json().get('total', 0):,.0f}đ, Số vé: {len(r.json().get('tickets', []))}"
        ),
        json={
            "trip_id": selected_trip["id"],
            "items": [{
                "seat_id": selected_seat_id,
                "passenger_name": customer_name,
                "passenger_phone": customer_phone,
                "pickup_stop_id": None,
                "dropoff_stop_id": None
            }],
            "coupon_code": "CHAOBAN"
        },
        headers=customer_auth_header
    )
    if order_resp and order_resp.status_code == 201:
        order_data = order_resp.json()
        order_id = order_data["id"]
        ticket_id = order_data["tickets"][0]["id"]

    # 1.9 Thanh toán VietQR (mô phỏng thành công)
    runner.run_step(
        "Kịch bản 1: Khách hàng",
        f"1.9 Thanh toán đơn hàng #{order_id} qua VietQR (Giả lập thành công)",
        "POST",
        f"/orders/{order_id}/pay",
        lambda r: (
            r.status_code == 200 and r.json().get("result") == "THANH_CONG" and r.json().get("order", {}).get("status") == "DA_THANH_TOAN",
            f"Kết quả GD: {r.json().get('result')}, Trạng thái đơn: {r.json().get('order', {}).get('status')}"
        ),
        json={"method": "VIETQR", "simulate": "success"},
        headers=customer_auth_header
    )

    # 1.10 Tra cứu vé điện tử của tôi
    runner.run_step(
        "Kịch bản 1: Khách hàng",
        "1.10 Tra cứu lịch sử vé điện tử của khách hàng (CHUA_DI)",
        "GET",
        "/me/tickets?status=CHUA_DI",
        lambda r: (
            r.status_code == 200 and any(t["id"] == ticket_id for t in r.json().get("items", [])),
            f"Tổng số {len(r.json().get('items', []))} vé chưa khởi hành"
        ),
        headers=customer_auth_header
    )

    # 1.10b Chi tiết vé điện tử và mã QR
    runner.run_step(
        "Kịch bản 1: Khách hàng",
        f"1.10b Xem chi tiết vé điện tử #{ticket_id} (Mã QR & Chỗ ngồi)",
        "GET",
        f"/tickets/{ticket_id}",
        lambda r: (
            r.status_code == 200 and r.json().get("status") == "CHUA_DI" and bool(r.json().get("qr_code")),
            f"Ghế: {r.json().get('seat_code')}, QR: {r.json().get('qr_code')}, Biển số xe: {r.json().get('plate')}"
        ),
        headers=customer_auth_header
    )

    # 1.11 Báo giá hủy vé (phí hủy 15%)
    runner.run_step(
        "Kịch bản 1: Khách hàng",
        f"1.11 Báo giá hủy vé trực tuyến trước giờ khởi hành (Phí 15%)",
        "GET",
        f"/tickets/{ticket_id}/cancel-quote",
        lambda r: (
            r.status_code == 200 and r.json().get("can_cancel") is True and r.json().get("fee_percent") == 15,
            f"Đủ điều kiện: {r.json().get('can_cancel')}, Phí hủy: {r.json().get('fee_percent')}%, Hoàn lại: {r.json().get('refund_amount', 0):,.0f}đ"
        ),
        headers=customer_auth_header
    )

    # 1.12 Xác nhận hủy vé trực tuyến
    runner.run_step(
        "Kịch bản 1: Khách hàng",
        f"1.12 Xác nhận hủy vé #{ticket_id} trực tuyến và nhận tiền hoàn",
        "POST",
        f"/tickets/{ticket_id}/cancel",
        lambda r: (
            r.status_code == 200 and r.json().get("status") == "DA_HOAN",
            f"Trạng thái hoàn: {r.json().get('status')}, Tiền hoàn: {r.json().get('amount', 0):,.0f}đ, Mã GD hoàn: {r.json().get('transaction_id')}"
        ),
        json={"simulate": None},
        headers=customer_auth_header
    )

    # 1.13 Kiểm tra vé sau khi hủy chuyển sang DA_HUY
    runner.run_step(
        "Kịch bản 1: Khách hàng",
        f"1.13 Xác minh trạng thái vé #{ticket_id} sau khi hủy là DA_HUY",
        "GET",
        f"/tickets/{ticket_id}",
        lambda r: (r.status_code == 200 and r.json().get("status") == "DA_HUY", f"Trạng thái vé hiện tại: {r.json().get('status')}"),
        headers=customer_auth_header
    )

    # -------------------------------------------------------------
    # KỊCH BẢN 2: NHÂN VIÊN QUẦY (STAFF POS E2E)
    # -------------------------------------------------------------
    print("\n" + "=" * 80)
    print("📋 KỊCH BẢN 2: NHÂN VIÊN QUẦY (STAFF POS & TICKET INSPECTION)")
    print("=" * 80)

    staff_phone = "0900000001"
    staff_pass = "Staff12345"
    staff_token = None
    staff_auth_header = {}
    counter_seat_id = None
    counter_seat_code = None
    counter_order_id = None
    counter_ticket_id = None

    # 2.1 Đăng nhập tài khoản nhân viên quầy
    staff_login_res, _ = runner.run_step(
        "Kịch bản 2: Nhân viên quầy",
        "2.1 Đăng nhập nhân viên bán vé (Staff 0900000001)",
        "POST",
        "/auth/login",
        lambda r: (r.status_code == 200 and bool(r.json().get("access_token")), f"Token thời hạn: {r.json().get('expires_in_seconds')}s"),
        json={"phone": staff_phone, "password": staff_pass}
    )
    if staff_login_res and staff_login_res.status_code == 200:
        staff_token = staff_login_res.json()["access_token"]
        staff_auth_header = {"Authorization": f"Bearer {staff_token}"}

    # Chọn ghế trống trên chuyến 317 cho khách mua tại quầy
    seats_resp, _ = runner.run_step(
        "Kịch bản 2: Nhân viên quầy",
        f"2.1b Tra cứu sơ đồ ghế chuyến #{selected_trip['id']}",
        "GET",
        f"/trips/{selected_trip['id']}/seats",
        lambda r: (r.status_code == 200, f"Ghế khả dụng: {len([s for s in r.json() if s['state'] == 'TRONG'])}")
    )
    if seats_resp and seats_resp.status_code == 200:
        avail = [s for s in seats_resp.json() if s["state"] == "TRONG"]
        if avail:
            counter_seat_id = avail[0]["seat_id"]
            counter_seat_code = avail[0]["code"]

    # 2.2 Giữ ghế quầy
    runner.run_step(
        "Kịch bản 2: Nhân viên quầy",
        f"2.2 Nhân viên quầy khóa tạm ghế {counter_seat_code}",
        "POST",
        f"/trips/{selected_trip['id']}/hold",
        lambda r: (r.status_code == 200 and r.json().get("seconds_left", 0) > 0, f"Còn {r.json().get('seconds_left')}s"),
        json={"seat_ids": [counter_seat_id]},
        headers=staff_auth_header
    )

    # 2.3 Lập đơn bán vé tại quầy
    counter_order_resp, _ = runner.run_step(
        "Kịch bản 2: Nhân viên quầy",
        "2.3 Lập phiếu bán vé cho khách vãng lai tại bến xe",
        "POST",
        "/counter/orders",
        lambda r: (
            r.status_code == 201 and r.json().get("channel") == "TAI_QUAY" and r.json().get("status") == "CHO_THANH_TOAN",
            f"Mã đơn quầy: #{r.json().get('id')}, Tổng tiền: {r.json().get('total', 0):,.0f}đ"
        ),
        json={
            "trip_id": selected_trip["id"],
            "items": [{
                "seat_id": counter_seat_id,
                "passenger_name": "Khách Vãng Lai Bác Ba",
                "passenger_phone": "0918123456",
                "pickup_stop_id": None,
                "dropoff_stop_id": None
            }],
            "coupon_code": None
        },
        headers=staff_auth_header
    )
    if counter_order_resp and counter_order_resp.status_code == 201:
        co = counter_order_resp.json()
        counter_order_id = co["id"]
        counter_ticket_id = co["tickets"][0]["id"]

    # 2.4 Thu tiền mặt tại quầy
    runner.run_step(
        "Kịch bản 2: Nhân viên quầy",
        f"2.4 Thu tiền mặt đơn hàng #{counter_order_id} tại quầy",
        "POST",
        f"/orders/{counter_order_id}/pay",
        lambda r: (
            r.status_code == 200 and r.json().get("result") == "THANH_CONG" and r.json().get("order", {}).get("status") == "DA_THANH_TOAN",
            f"Kết quả: {r.json().get('result')}, Trạng thái: {r.json().get('order', {}).get('status')}"
        ),
        json={"method": "TIEN_MAT", "simulate": "success"},
        headers=staff_auth_header
    )

    # 2.5 In vé giấy POS
    runner.run_step(
        "Kịch bản 2: Nhân viên quầy",
        f"2.5 In phôi vé giấy POS cho khách mua tại quầy",
        "GET",
        f"/counter/orders/{counter_order_id}/receipts",
        lambda r: (
            r.status_code == 200 and len(r.json().get("receipts", [])) > 0,
            f"Số liên in: {len(r.json().get('receipts', []))}, Chiều dài văn bản in: {len(r.json().get('receipts', [''])[0])} ký tự"
        ),
        headers=staff_auth_header
    )

    # 2.6 Đối soát doanh thu ca trực của nhân viên
    runner.run_step(
        "Kịch bản 2: Nhân viên quầy",
        "2.6 Đối soát doanh thu ca trực trong ngày của nhân viên",
        "GET",
        "/counter/orders",
        lambda r: (
            r.status_code == 200 and r.json().get("paid_orders", 0) >= 1 and r.json().get("revenue", 0) > 0,
            f"Đơn đã thanh toán: {r.json().get('paid_orders')}, Vé bán: {r.json().get('tickets_sold')}, Doanh thu: {r.json().get('revenue', 0):,.0f}đ"
        ),
        headers=staff_auth_header
    )

    # 2.7 Soát vé lên xe
    runner.run_step(
        "Kịch bản 2: Nhân viên quầy",
        f"2.7 Soát vé lên xe theo mã vé #{counter_ticket_id}",
        "GET",
        f"/tickets/lookup?ticket_id={counter_ticket_id}",
        lambda r: (
            r.status_code == 200 and len(r.json()) == 1 and r.json()[0]["status"] == "CHUA_DI",
            f"Hợp lệ lên xe: Vé #{r.json()[0]['id']}, Khách: {r.json()[0]['passenger_name']}, Ghế: {r.json()[0]['seat_code']}, Trạng thái: {r.json()[0]['status']}"
        ),
        headers=staff_auth_header
    )

    # -------------------------------------------------------------
    # KỊCH BẢN 3: QUẢN TRỊ VIÊN (ADMIN E2E)
    # -------------------------------------------------------------
    print("\n" + "=" * 80)
    print("📋 KỊCH BẢN 3: QUẢN TRỊ VIÊN (ADMIN MANAGEMENT E2E)")
    print("=" * 80)

    # 3.1 Đăng nhập Quản trị viên
    runner.run_step(
        "Kịch bản 3: Quản trị viên",
        "3.1 Đăng nhập Quản trị viên (Admin 0900000000)",
        "POST",
        "/auth/login",
        lambda r: (r.status_code == 200 and bool(r.json().get("access_token")), f"Token exp: {r.json().get('expires_in_seconds')}s"),
        json={"phone": "0900000000", "password": "Admin12345"}
    )

    # 3.2 Báo cáo doanh thu & tỷ lệ lấp đầy
    runner.run_step(
        "Kịch bản 3: Quản trị viên",
        "3.2 Lấy báo cáo doanh thu & tỷ lệ lấp đầy thời gian thực",
        "GET",
        "/admin/reports?date_from=2026-11-01&date_to=2026-11-30",
        lambda r: (
            r.status_code == 200 and "gross" in r.json() and "net" in r.json(),
            f"Gross: {r.json().get('gross', 0):,.0f}đ, Refund: {r.json().get('refunded', 0):,.0f}đ, Net: {r.json().get('net', 0):,.0f}đ, Occupancy: {r.json().get('occupancy', 0) * 100:.1f}%"
        ),
        headers=admin_auth_header
    )

    # 3.3 Tải báo cáo CSV
    runner.run_step(
        "Kịch bản 3: Quản trị viên",
        "3.3 Xuất báo cáo doanh thu ra định dạng CSV (UTF-8 BOM)",
        "GET",
        "/admin/reports/export.csv?date_from=2026-11-01&date_to=2026-11-30",
        lambda r: (
            r.status_code == 200 and "text/csv" in r.headers.get("Content-Type", "") and len(r.content) > 0,
            f"Size: {len(r.content)} bytes, Type: {r.headers.get('Content-Type')}"
        ),
        headers=admin_auth_header
    )

    # 3.3b Tải báo cáo XLSX (Excel)
    runner.run_step(
        "Kịch bản 3: Quản trị viên",
        "3.3b Xuất báo cáo doanh thu ra bảng tính Excel (XLSX)",
        "GET",
        "/admin/reports/export.xlsx?date_from=2026-11-01&date_to=2026-11-30",
        lambda r: (
            r.status_code == 200 and len(r.content) > 100,
            f"Size: {len(r.content)} bytes, Type: {r.headers.get('Content-Type')}"
        ),
        headers=admin_auth_header
    )

    # 3.3c Tải báo cáo PDF (Khổ A4)
    runner.run_step(
        "Kịch bản 3: Quản trị viên",
        "3.3c Xuất báo cáo doanh thu ra tài liệu PDF khổ A4",
        "GET",
        "/admin/reports/export.pdf?date_from=2026-11-01&date_to=2026-11-30",
        lambda r: (
            r.status_code == 200 and r.content.startswith(b"%PDF") and len(r.content) > 1000,
            f"Size: {len(r.content)} bytes, Header: {r.content[:4]}"
        ),
        headers=admin_auth_header
    )

    # 3.4 Duyệt lệnh hoàn tiền thủ công
    print("   [+] Tạo đơn mẫu mô phỏng hoàn tiền lỗi cổng để đưa vào hàng đợi duyệt thủ công...")
    dummy_seats = runner.session.get(f"{API_BASE}/trips/{selected_trip['id']}/seats").json()
    dummy_avail = [s for s in dummy_seats if s["state"] == "TRONG"]
    if dummy_avail:
        dummy_seat_id = dummy_avail[0]["seat_id"]
        runner.session.post(f"{API_BASE}/trips/{selected_trip['id']}/hold", json={"seat_ids": [dummy_seat_id]}, headers=customer_auth_header)
        dummy_ord = runner.session.post(f"{API_BASE}/orders", json={
            "trip_id": selected_trip["id"],
            "items": [{"seat_id": dummy_seat_id, "passenger_name": "Test Duyet Hoan Tien", "passenger_phone": customer_phone}],
            "coupon_code": None
        }, headers=customer_auth_header).json()
        dummy_oid = dummy_ord["id"]
        dummy_tid = dummy_ord["tickets"][0]["id"]
        runner.session.post(f"{API_BASE}/orders/{dummy_oid}/pay", json={"method": "VIETQR", "simulate": "success"}, headers=customer_auth_header)
        runner.session.post(f"{API_BASE}/tickets/{dummy_tid}/cancel", json={"simulate": "fail_refund"}, headers=customer_auth_header)

    # 3.4a Tra cứu hàng đợi hoàn tiền thủ công
    refund_list_resp, _ = runner.run_step(
        "Kịch bản 3: Quản trị viên",
        "3.4a Xem danh sách lệnh hoàn tiền chờ xử lý thủ công (CHO_XU_LY_THU_CONG)",
        "GET",
        "/admin/refunds?status=CHO_XU_LY_THU_CONG",
        lambda r: (r.status_code == 200 and len(r.json()) > 0, f"Hàng đợi đang có {len(r.json())} lệnh chờ duyệt"),
        headers=admin_auth_header
    )

    pending_refund_id = None
    if refund_list_resp and refund_list_resp.status_code == 200 and refund_list_resp.json():
        pending_refund_id = refund_list_resp.json()[0]["id"]

    # 3.4b Phê duyệt lệnh hoàn tiền thủ công (Retry)
    if pending_refund_id:
        runner.run_step(
            "Kịch bản 3: Quản trị viên",
            f"3.4b Admin duyệt / xử lý lại lệnh hoàn tiền #{pending_refund_id}",
            "POST",
            f"/admin/refunds/{pending_refund_id}/retry",
            lambda r: (
                r.status_code == 200 and r.json().get("status") == "DA_HOAN",
                f"Trạng thái: {r.json().get('status')}, Đã xử lý bởi Admin #{r.json().get('processed_by')}"
            ),
            json={},
            headers=admin_auth_header
        )

    # 3.5 Thêm chuyến xe mới (dùng ngày ngẫu nhiên để tránh trùng lịch xe khi chạy test nhiều lần)
    try:
        routes_resp = runner.session.get(f"{API_BASE}/admin/routes", headers=admin_auth_header).json()
        sg_dl_route = next((r for r in routes_resp if "Đà Lạt" in r["destination"] and ("Hồ Chí Minh" in r["origin"] or "Sài Gòn" in r["origin"])), None)
        sg_dl_id = sg_dl_route["id"] if sg_dl_route else 1
    except Exception:
        sg_dl_id = 1
    try:
        vehs_resp = runner.session.get(f"{API_BASE}/admin/vehicles", headers=admin_auth_header).json()
        veh_items = vehs_resp.get("items", vehs_resp) if isinstance(vehs_resp, dict) else vehs_resp
        veh_id = veh_items[0]["id"] if veh_items else 1
    except Exception:
        veh_id = 1

    new_trip_day = random.randint(1, 28)
    new_trip_hour = random.randint(5, 20)
    new_trip_date = f"2027-01-{new_trip_day:02d}"
    new_trip_time = f"{new_trip_hour:02d}:00:00"
    trip_create_resp, _ = runner.run_step(
        "Kịch bản 3: Quản trị viên",
        f"3.5 Khởi tạo chuyến xe mới tuyến TP.HCM - Đà Lạt ({new_trip_date} {new_trip_time})",
        "POST",
        "/admin/trips",
        lambda r: (
            r.status_code == 201 and r.json().get("status") == "MO_BAN",
            f"Mã chuyến: #{r.json().get('id')}, Tuyến: {r.json().get('origin')} -> {r.json().get('destination')}, Khởi hành: {r.json().get('departure_date')} {r.json().get('departure_time')}"
        ),
        json={
            "route_id": sg_dl_id,
            "vehicle_id": veh_id,
            "departure_date": new_trip_date,
            "departure_time": new_trip_time,
            "price": 320000,
            "pickup_points": ["Bến xe Miền Đông mới", "Ngã 4 Thủ Đức"],
            "dropoff_points": ["Bến xe Liên tỉnh Đà Lạt", "Hồ Xuân Hương"],
            "note": "Chuyến tăng cường du lịch cuối tuần"
        },
        headers=admin_auth_header
    )

    # 3.6 Cấu hình mã voucher khuyến mãi mới
    new_coupon_code = f"E2E{random.randint(1000, 9999)}"
    coupon_create_resp, _ = runner.run_step(
        "Kịch bản 3: Quản trị viên",
        f"3.6 Tạo mã voucher khuyến mãi mới: {new_coupon_code}",
        "POST",
        "/admin/coupons",
        lambda r: (
            r.status_code == 201 and r.json().get("code") == new_coupon_code and r.json().get("status") == "BAT",
            f"ID: #{r.json().get('id')}, Giảm: {r.json().get('value', 0):,.0f}đ, Hạn: {r.json().get('valid_to')}"
        ),
        json={
            "code": new_coupon_code,
            "kind": "SO_TIEN",
            "value": 50000,
            "max_discount": None,
            "min_order": 200000,
            "quantity": 50,
            "valid_from": "2026-11-01T00:00:00",
            "valid_to": "2026-12-31T23:59:59",
            "description": "Voucher E2E giảm 50k"
        },
        headers=admin_auth_header
    )

    created_coupon_id = None
    if coupon_create_resp and coupon_create_resp.status_code == 201:
        created_coupon_id = coupon_create_resp.json()["id"]

    # 3.6b Bật / Tắt voucher vừa tạo
    if created_coupon_id:
        runner.run_step(
            "Kịch bản 3: Quản trị viên",
            f"3.6b Tắt nhanh trạng thái voucher #{created_coupon_id}",
            "POST",
            f"/admin/coupons/{created_coupon_id}/toggle",
            lambda r: (r.status_code == 200 and r.json().get("status") == "TAT", f"Trạng thái sau toggle: {r.json().get('status')}"),
            headers=admin_auth_header
        )
        runner.run_step(
            "Kịch bản 3: Quản trị viên",
            f"3.6c Mở lại kích hoạt voucher #{created_coupon_id}",
            "POST",
            f"/admin/coupons/{created_coupon_id}/toggle",
            lambda r: (r.status_code == 200 and r.json().get("status") == "BAT", f"Trạng thái sau toggle: {r.json().get('status')}"),
            headers=admin_auth_header
        )

    # 3.7 Khóa và mở khóa người dùng
    user_to_lock_id = None
    users_resp = runner.session.get(f"{API_BASE}/admin/users?q={customer_phone}", headers=admin_auth_header).json()
    if users_resp:
        user_to_lock_id = users_resp[0]["id"]

    if user_to_lock_id:
        # Khóa tài khoản
        runner.run_step(
            "Kịch bản 3: Quản trị viên",
            f"3.7a Khóa tài khoản khách hàng #{user_to_lock_id} ({customer_phone})",
            "POST",
            f"/admin/users/{user_to_lock_id}/lock",
            lambda r: (r.status_code == 200 and r.json().get("status") == "KHOA", f"Trạng thái: {r.json().get('status')} (Cảnh báo: {r.json().get('warning')})"),
            headers=admin_auth_header
        )

        # Thử đăng nhập tài khoản bị khóa -> phải nhận 403 Forbidden
        runner.run_step(
            "Kịch bản 3: Quản trị viên",
            f"3.7b Xác minh tài khoản bị khóa không thể đăng nhập (HTTP 403)",
            "POST",
            "/auth/login",
            lambda r: (r.status_code == 403, f"Bị từ chối: {r.status_code} - {r.json().get('detail')}"),
            json={"phone": customer_phone, "password": customer_password}
        )

        # Mở khóa tài khoản
        runner.run_step(
            "Kịch bản 3: Quản trị viên",
            f"3.7c Mở khóa khôi phục tài khoản #{user_to_lock_id}",
            "POST",
            f"/admin/users/{user_to_lock_id}/unlock",
            lambda r: (r.status_code == 200 and r.json().get("status") == "HOAT_DONG", f"Trạng thái: {r.json().get('status')}"),
            headers=admin_auth_header
        )

    # 3.8 Cập nhật tham số hệ thống
    runner.run_step(
        "Kịch bản 3: Quản trị viên",
        "3.8 Tra cứu toàn bộ danh sách tham số vận hành hệ thống",
        "GET",
        "/admin/settings",
        lambda r: (r.status_code == 200 and len(r.json()) >= 8, f"Số tham số cấu hình: {len(r.json())}"),
        headers=admin_auth_header
    )

    runner.run_step(
        "Kịch bản 3: Quản trị viên",
        "3.8b Cập nhật tham số PHI_HUY_PHAN_TRAM = 15",
        "PATCH",
        "/admin/settings/PHI_HUY_PHAN_TRAM",
        lambda r: (r.status_code == 200 and r.json().get("value") == "15", f"Phí hủy vé: {r.json().get('value')}%"),
        json={"value": 15},
        headers=admin_auth_header
    )

    runner.run_step(
        "Kịch bản 3: Quản trị viên",
        "3.8c Cập nhật tham số HAN_HUY_VE_GIO = 24",
        "PATCH",
        "/admin/settings/HAN_HUY_VE_GIO",
        lambda r: (r.status_code == 200 and r.json().get("value") == "24", f"Hạn hủy trước giờ chạy: {r.json().get('value')} giờ"),
        json={"value": 24},
        headers=admin_auth_header
    )

    # -------------------------------------------------------------
    # TỔNG KẾT BÁO CÁO KẾT QUẢ KIỂM THỬ
    # -------------------------------------------------------------
    print("\n" + "=" * 80)
    print("📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ E2E TÍCH HỢP HỆ THỐNG")
    print("=" * 80)

    total_tests = len(runner.results)
    passed_tests = sum(1 for r in runner.results if r["passed"])
    failed_tests = total_tests - passed_tests
    success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0

    latencies = [r["elapsed_ms"] for r in runner.results]
    avg_latency = sum(latencies) / len(latencies) if latencies else 0
    min_latency = min(latencies) if latencies else 0
    max_latency = max(latencies) if latencies else 0

    # Phân nhóm theo Scenario
    scenarios = {}
    for r in runner.results:
        sc = r["scenario"]
        if sc not in scenarios:
            scenarios[sc] = {"total": 0, "passed": 0, "times": []}
        scenarios[sc]["total"] += 1
        if r["passed"]:
            scenarios[sc]["passed"] += 1
        scenarios[sc]["times"].append(r["elapsed_ms"])

    print(f"🔹 Tổng số ca kiểm thử (Steps) : {total_tests}")
    print(f"✅ Thành công (Passed)         : {passed_tests}")
    print(f"❌ Thất bại (Failed)           : {failed_tests}")
    print(f"🎯 Tỷ lệ thành công            : {success_rate:.2f}%")
    print(f"⏱️  Thời gian phản hồi TB      : {avg_latency:.2f} ms (Min: {min_latency:.2f} ms | Max: {max_latency:.2f} ms)")
    print("-" * 80)
    print("📈 KẾT QUẢ THEO TỪNG KỊCH BẢN NGHIỆP VỤ:")
    for sc, stats in scenarios.items():
        sc_rate = (stats["passed"] / stats["total"]) * 100
        sc_avg = sum(stats["times"]) / len(stats["times"])
        print(f"   • {sc:<30}: {stats['passed']}/{stats['total']} PASS ({sc_rate:5.1f}%) | Phản hồi TB: {sc_avg:6.2f} ms")
    print("=" * 80)

    # Save summary report to JSON
    summary_data = {
        "total_tests": total_tests,
        "passed_tests": passed_tests,
        "failed_tests": failed_tests,
        "success_rate": success_rate,
        "avg_latency_ms": round(avg_latency, 2),
        "min_latency_ms": round(min_latency, 2),
        "max_latency_ms": round(max_latency, 2),
        "scenarios": scenarios,
        "detailed_steps": runner.results
    }
    with open("e2e_test_report.json", "w", encoding="utf-8") as f:
        json.dump(summary_data, f, ensure_ascii=False, indent=2)
    print("📁 Chi tiết báo cáo máy đọc được lưu tại: e2e_test_report.json")

    if failed_tests > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == "__main__":
    main()
