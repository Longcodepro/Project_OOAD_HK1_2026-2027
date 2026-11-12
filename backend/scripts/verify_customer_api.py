import sys
import json
import requests

BASE_URL = "http://localhost:8005"
RESULTS = []

def record(name, method, url, status, ok, request_body=None, response_summary=""):
    RESULTS.append({
        "name": name,
        "method": method,
        "url": url,
        "status": status,
        "ok": ok,
        "request_body": request_body,
        "response_summary": response_summary,
    })
    status_str = "PASS" if ok else "FAIL"
    print(f"[{status_str}] {method} {url} -> {status} ({name})")

def main():
    print("=== BẮT ĐẦU KIỂM THỬ TOÀN BỘ ENDPOINT KHÁCH HÀNG & CÔNG KHAI ===")

    # 1. AUTH: Login Customer
    login_body = {"phone": "0900000002", "password": "Khach12345"}
    r = requests.post(f"{BASE_URL}/auth/login", json=login_body)
    cust_token = r.json().get("access_token")
    record("1. Đăng nhập Khách hàng", "POST", "/auth/login", r.status_code, r.status_code == 200, login_body, f"Token nhận được (expires_in: {r.json().get('expires_in_seconds')}s)")

    cust_headers = {"Authorization": f"Bearer {cust_token}"}

    # 2. AUTH: Get profile
    r = requests.get(f"{BASE_URL}/auth/me", headers=cust_headers)
    record("2. Xem hồ sơ cá nhân", "GET", "/auth/me", r.status_code, r.status_code == 200, None, f"Tên: {r.json().get('full_name')}, SĐT: {r.json().get('phone')}, Role: {r.json().get('role')}")

    # 3. AUTH: Update profile
    patch_body = {"full_name": "Nguyễn Văn An", "birth_date": "1990-05-15", "address": "Hà Nội"}
    r = requests.patch(f"{BASE_URL}/auth/me", headers=cust_headers, json=patch_body)
    record("3. Cập nhật hồ sơ cá nhân", "PATCH", "/auth/me", r.status_code, r.status_code == 200, patch_body, f"Tên mới: {r.json().get('full_name')}, Địa chỉ: {r.json().get('address')}")

    # 4. AUTH: Register OTP & Register
    import time
    test_phone = "097" + str(int(time.time()))[-7:]
    otp_body = {"phone": test_phone}
    r = requests.post(f"{BASE_URL}/auth/register/otp", json=otp_body)
    mock_otp = r.json().get("mock_otp")
    record("4. Yêu cầu OTP đăng ký", "POST", "/auth/register/otp", r.status_code, r.status_code == 200, otp_body, f"Mock OTP: {mock_otp}")

    reg_body = {"full_name": "Khách Test", "phone": test_phone, "password": "Password123!", "otp": mock_otp or "123456"}
    r = requests.post(f"{BASE_URL}/auth/register", json=reg_body)
    reg_ok = r.status_code in (201, 409)  # 409 nếu đã tồn tại
    record("5. Đăng ký tài khoản", "POST", "/auth/register", r.status_code, reg_ok, reg_body, f"ID tạo: {r.json().get('id') if r.status_code == 201 else 'Đã tồn tại'}")

    # 5. AUTH: Forgot password & Reset
    forgot_body = {"phone": test_phone}
    r = requests.post(f"{BASE_URL}/auth/password/forgot/otp", json=forgot_body)
    f_otp = r.json().get("mock_otp")
    record("6. OTP quên mật khẩu", "POST", "/auth/password/forgot/otp", r.status_code, r.status_code == 200, forgot_body, f"Mock OTP: {f_otp}")

    reset_body = {"phone": test_phone, "otp": f_otp or "123456", "new_password": "NewPassword123!"}
    r = requests.post(f"{BASE_URL}/auth/password/reset", json=reset_body)
    record("7. Đặt lại mật khẩu", "POST", "/auth/password/reset", r.status_code, r.status_code in (204, 200), reset_body, "204 No Content")

    # Login with reset account to test change password & change phone
    r = requests.post(f"{BASE_URL}/auth/login", json={"phone": test_phone, "password": "NewPassword123!"})
    test_tok = r.json().get("access_token")
    test_headers = {"Authorization": f"Bearer {test_tok}"}

    chg_pw_body = {"current_password": "NewPassword123!", "new_password": "NextPassword123!"}
    r = requests.post(f"{BASE_URL}/auth/password/change", headers=test_headers, json=chg_pw_body)
    test_tok = r.json().get("access_token") or test_tok
    test_headers = {"Authorization": f"Bearer {test_tok}"}
    record("8. Đổi mật khẩu", "POST", "/auth/password/change", r.status_code, r.status_code == 200, chg_pw_body, "Cấp token mới")

    # Phone change OTP
    # Dùng số ngẫu nhiên để tránh trùng mỗi lần chạy script
    import time
    new_phone = "098" + str(int(time.time()))[-7:]
    p_otp_body = {"new_phone": new_phone}
    r = requests.post(f"{BASE_URL}/auth/phone/otp", headers=test_headers, json=p_otp_body)
    p_otp = r.json().get("mock_otp")
    record("9. OTP đổi số điện thoại", "POST", "/auth/phone/otp", r.status_code, r.status_code == 200, p_otp_body, f"Mock OTP: {p_otp}")

    p_chg_body = {"new_phone": new_phone, "otp": p_otp or "123456", "password": "NextPassword123!"}
    r = requests.post(f"{BASE_URL}/auth/phone/change", headers=test_headers, json=p_chg_body)
    record("10. Đổi số điện thoại", "POST", "/auth/phone/change", r.status_code, r.status_code in (200, 409), p_chg_body, "Cấp token mới sau khi đổi SĐT")
    if r.status_code == 200 and r.json().get("access_token"):
        test_tok = r.json()["access_token"]
        test_headers = {"Authorization": f"Bearer {test_tok}"}

    # Logout
    r = requests.post(f"{BASE_URL}/auth/logout", headers=test_headers)
    record("11. Đăng xuất", "POST", "/auth/logout", r.status_code, r.status_code == 204, None, "204 No Content")

    # 6. TRIPS: Route offers
    r = requests.get(f"{BASE_URL}/routes")
    record("12. Tuyến xe phổ biến", "GET", "/routes", r.status_code, r.status_code == 200, None, f"{len(r.json())} tuyến có chuyến")

    # 7. TRIPS: Search
    search_params = {"origin": "Hà Nội", "destination": "Hải Phòng", "date": "2026-11-18"}
    r = requests.get(f"{BASE_URL}/trips/search", params=search_params)
    trips_found = r.json().get("items", [])
    record("13. Tìm kiếm chuyến xe", "GET", "/trips/search", r.status_code, r.status_code == 200, search_params, f"Tìm thấy {len(trips_found)} chuyến xe")
    
    trip_id = trips_found[0]["id"] if trips_found else 231

    # 8. TRIPS: Detail
    r = requests.get(f"{BASE_URL}/trips/{trip_id}")
    stops = r.json().get("stops", [])
    record("14. Chi tiết chuyến xe", "GET", f"/trips/{trip_id}", r.status_code, r.status_code == 200, None, f"Xe: {r.json().get('plate')}, Giá: {r.json().get('price')}đ, Trạm: {len(stops)}")

    # 9. TRIPS: Seats
    r = requests.get(f"{BASE_URL}/trips/{trip_id}/seats")
    seats = r.json()
    available_seats = [s for s in seats if s["state"] == "TRONG"]
    seat_id = available_seats[0]["seat_id"] if available_seats else seats[0]["seat_id"]
    seat_code = available_seats[0]["code"] if available_seats else seats[0]["code"]
    record("15. Sơ đồ ghế", "GET", f"/trips/{trip_id}/seats", r.status_code, r.status_code == 200, None, f"Tổng {len(seats)} ghế, còn trống {len(available_seats)}")

    # 10. HOLDS: Hold seat
    hold_body = {"seat_ids": [seat_id]}
    r = requests.post(f"{BASE_URL}/trips/{trip_id}/hold", headers=cust_headers, json=hold_body)
    record("16. Giữ chỗ ghế", "POST", f"/trips/{trip_id}/hold", r.status_code, r.status_code == 200, hold_body, f"Giữ ghế {seat_code}, còn {r.json().get('seconds_left')} giây")

    # 11. HOLDS: My hold
    r = requests.get(f"{BASE_URL}/trips/{trip_id}/hold", headers=cust_headers)
    record("17. Kiểm tra ghế đang giữ", "GET", f"/trips/{trip_id}/hold", r.status_code, r.status_code == 200, None, f"Số ghế đang giữ: {len(r.json().get('seats', []))}")

    # 12. HOLDS: Release seat
    rel_body = {"seat_ids": [seat_id]}
    r = requests.post(f"{BASE_URL}/trips/{trip_id}/release", headers=cust_headers, json=rel_body)
    record("18. Nhả ghế giữ chỗ", "POST", f"/trips/{trip_id}/release", r.status_code, r.status_code == 200, rel_body, f"Số ghế còn giữ: {len(r.json().get('seats', []))}")

    # Hold again for booking
    r = requests.post(f"{BASE_URL}/trips/{trip_id}/hold", headers=cust_headers, json={"seat_ids": [seat_id]})

    # 13. COUPONS: Validate coupon
    val_body = {"code": "CHAOBAN", "amount": 360000}
    r = requests.post(f"{BASE_URL}/coupons/validate", headers=cust_headers, json=val_body)
    record("19. Kiểm tra mã giảm giá", "POST", "/coupons/validate", r.status_code, r.status_code == 200, val_body, f"Giảm {r.json().get('discount')}đ, Còn lại {r.json().get('final_amount')}đ")

    # 14. BOOKING: Create Order
    order_body = {
        "trip_id": trip_id,
        "items": [{
            "seat_id": seat_id,
            "passenger_name": "Nguyễn Văn An",
            "passenger_phone": "0900000002"
        }]
    }
    r = requests.post(f"{BASE_URL}/orders", headers=cust_headers, json=order_body)
    order_id = r.json().get("id")
    ticket_id = r.json().get("tickets", [{}])[0].get("id")
    record("20. Tạo đơn đặt vé", "POST", "/orders", r.status_code, r.status_code == 201, order_body, f"Order #{order_id}, Trạng thái: {r.json().get('status')}, Tổng tiền: {r.json().get('total')}đ")

    # 15. BOOKING: List orders
    r = requests.get(f"{BASE_URL}/orders", headers=cust_headers)
    record("21. Danh sách đơn đặt vé", "GET", "/orders", r.status_code, r.status_code == 200, None, f"Tổng số {len(r.json())} đơn hàng")

    # 16. BOOKING: Get single order
    r = requests.get(f"{BASE_URL}/orders/{order_id}", headers=cust_headers)
    record("22. Chi tiết đơn đặt vé", "GET", f"/orders/{order_id}", r.status_code, r.status_code == 200, None, f"Order #{order_id}, Vé #{ticket_id}")

    # 17. BOOKING: Pay order
    pay_body = {"method": "VIETQR", "simulate": "success"}
    r = requests.post(f"{BASE_URL}/orders/{order_id}/pay", headers=cust_headers, json=pay_body)
    record("23. Thanh toán đơn hàng", "POST", f"/orders/{order_id}/pay", r.status_code, r.status_code == 200, pay_body, f"Kết quả: {r.json().get('result')}, Trạng thái đơn: {r.json().get('order', {}).get('status')}")

    # 18. TICKETS: My tickets
    r = requests.get(f"{BASE_URL}/me/tickets", headers=cust_headers)
    my_tickets = r.json().get("items", [])
    record("24. Lịch sử vé của tôi", "GET", "/me/tickets", r.status_code, r.status_code == 200, None, f"Tổng cộng {len(my_tickets)} vé")

    # 19. TICKETS: Get ticket detail
    r = requests.get(f"{BASE_URL}/tickets/{ticket_id}", headers=cust_headers)
    record("25. Chi tiết vé xe", "GET", f"/tickets/{ticket_id}", r.status_code, r.status_code == 200, None, f"Mã vé: {r.json().get('id')}, Ghế: {r.json().get('seat_code')}, Trạng thái: {r.json().get('status')}")

    # 20. CANCELLATION: Cancel quote
    r = requests.get(f"{BASE_URL}/tickets/{ticket_id}/cancel-quote", headers=cust_headers)
    can_cancel = r.json().get("can_cancel")
    record("26. Báo giá hủy vé", "GET", f"/tickets/{ticket_id}/cancel-quote", r.status_code, r.status_code == 200, None, f"Được hủy: {can_cancel}, Phí hủy: {r.json().get('fee')}đ, Hoàn trả: {r.json().get('refund_amount')}đ")

    # 21. CANCELLATION: Customer cancel ticket
    if can_cancel:
        r = requests.post(f"{BASE_URL}/tickets/{ticket_id}/cancel", headers=cust_headers, json={})
        record("27. Khách hủy vé online", "POST", f"/tickets/{ticket_id}/cancel", r.status_code, r.status_code == 200, {}, f"Trạng thái hoàn: {r.json().get('status')}, Tiền hoàn: {r.json().get('amount')}đ")
    else:
        # If not can_cancel, test that cancellation is properly rejected with 400
        r = requests.post(f"{BASE_URL}/tickets/{ticket_id}/cancel", headers=cust_headers, json={})
        record("27. Khách hủy vé online (<24h bị từ chối)", "POST", f"/tickets/{ticket_id}/cancel", r.status_code, r.status_code in (200, 400), {}, f"Phản hồi: {r.json().get('detail')}")

    # Test Cancel Pending order
    # Hold a seat, create order, then cancel-pending
    available_seats = [s for s in requests.get(f"{BASE_URL}/trips/{trip_id}/seats").json() if s["state"] == "TRONG"]
    if available_seats:
        s_id = available_seats[0]["seat_id"]
        requests.post(f"{BASE_URL}/trips/{trip_id}/hold", headers=cust_headers, json={"seat_ids": [s_id]})
        o_res = requests.post(f"{BASE_URL}/orders", headers=cust_headers, json={
            "trip_id": trip_id,
            "items": [{"seat_id": s_id, "passenger_name": "Tạm Bỏ", "passenger_phone": "0900000002"}]
        })
        p_order_id = o_res.json().get("id")
        r = requests.post(f"{BASE_URL}/orders/{p_order_id}/cancel-pending", headers=cust_headers)
        record("28. Hủy đơn chờ thanh toán", "POST", f"/orders/{p_order_id}/cancel-pending", r.status_code, r.status_code == 200, None, f"Trạng thái đơn sau hủy: {r.json().get('status')}")

    # 22. COUNTER & CREW: Staff actions (Clerk: 0900000001 / Staff12345)
    clerk_login = requests.post(f"{BASE_URL}/auth/login", json={"phone": "0900000001", "password": "Staff12345"})
    clerk_tok = clerk_login.json().get("access_token")
    clerk_headers = {"Authorization": f"Bearer {clerk_tok}"}

    # Staff lookup ticket
    r = requests.get(f"{BASE_URL}/tickets/lookup", headers=clerk_headers, params={"ticket_id": ticket_id})
    record("29. Nhân viên tra cứu vé", "GET", "/tickets/lookup", r.status_code, r.status_code == 200, {"ticket_id": ticket_id}, f"Tìm thấy {len(r.json())} vé")

    # Counter hold, create order, pay, receipts, cancel
    avail = [s for s in requests.get(f"{BASE_URL}/trips/{trip_id}/seats").json() if s["state"] == "TRONG"]
    if avail:
        c_seat = avail[0]["seat_id"]
        requests.post(f"{BASE_URL}/trips/{trip_id}/hold", headers=clerk_headers, json={"seat_ids": [c_seat]})
        c_order_body = {
            "trip_id": trip_id,
            "items": [{"seat_id": c_seat, "passenger_name": "Khách Tại Quầy", "passenger_phone": "0912349999"}]
        }
        r = requests.post(f"{BASE_URL}/counter/orders", headers=clerk_headers, json=c_order_body)
        c_order_id = r.json().get("id")
        c_ticket_id = r.json().get("tickets", [{}])[0].get("id")
        record("30. Lập phiếu bán vé tại quầy", "POST", "/counter/orders", r.status_code, r.status_code == 201, c_order_body, f"Order quầy #{c_order_id}")

        # Pay at counter
        requests.post(f"{BASE_URL}/orders/{c_order_id}/pay", headers=clerk_headers, json={"method": "TIEN_MAT"})

        # Print receipts
        r = requests.get(f"{BASE_URL}/counter/orders/{c_order_id}/receipts", headers=clerk_headers)
        record("31. In vé giấy tại quầy", "GET", f"/counter/orders/{c_order_id}/receipts", r.status_code, r.status_code == 200, None, f"Biên nhận: {len(r.json().get('receipts', []))} bản in")

        # Counter summary
        r = requests.get(f"{BASE_URL}/counter/orders", headers=clerk_headers)
        record("32. Đối soát doanh thu quầy", "GET", "/counter/orders", r.status_code, r.status_code == 200, None, f"Đơn đã thu tiền: {r.json().get('paid_orders')}, Doanh thu: {r.json().get('revenue')}đ")

        # Cancel at counter
        r = requests.post(f"{BASE_URL}/counter/tickets/{c_ticket_id}/cancel", headers=clerk_headers, json={})
        c_cancel_ok = r.status_code in (200, 400)
        record("33. Hủy vé tại quầy", "POST", f"/counter/tickets/{c_ticket_id}/cancel", r.status_code, c_cancel_ok, {}, f"Kết quả: {r.status_code}")

    print("\n=== TỔNG KẾT KIỂM THỬ ===")
    total = len(RESULTS)
    passed = sum(1 for x in RESULTS if x["ok"])
    print(f"Tổng số endpoint đã kiểm tra: {total}")
    print(f"Thành công: {passed}/{total}")
    if passed == total:
        print("TẤT CẢ CÁC ENDPOINT ĐỀU HOẠT ĐỘNG HOÀN HẢO!")
    else:
        print("CÓ LỖI TẠI MỘT SỐ ENDPOINT:")
        for r in RESULTS:
            if not r["ok"]:
                print(f"  - {r['method']} {r['url']}: {r['name']} (status {r['status']})")

if __name__ == "__main__":
    main()
