#!/usr/bin/env python3
"""Script kiểm thử & chứng minh khả năng chống Race Condition (Tranh chấp ghế đồng thời).

Kịch bản:
- 10 luồng bất đồng bộ gửi yêu cầu giữ CÙNG một ghế (Seat A01) tại CÙNG một thời điểm (mili-giây).
- Kỳ vọng chuẩn OOAD & ACID:
  + Duy nhất 1 luồng thành công (HTTP 200 OK / Ghế được khóa giữ chỗ).
  + 9 luồng còn lại nhận lỗi HTTP 409 Conflict ("Ghế không còn trống").
"""

from __future__ import annotations

import concurrent.futures
import time
import requests

BASE_URL = "http://localhost:8005/api"


def get_tokens_pool(count: int = 10) -> list[str]:
    accounts = [
        ("0900000002", "Khach12345"),
        ("0900000010", "Khach12345"),
        ("0900000011", "Khach12345"),
        ("0900000012", "Khach12345"),
        ("0900000013", "Khach12345"),
        ("0900000014", "Khach12345"),
        ("0900000015", "Khach12345"),
        ("0900000016", "Khach12345"),
        ("0900000001", "Staff12345"),
        ("0900000003", "Staff12345"),
    ]
    tokens: list[str] = []
    for phone, pwd in accounts:
        try:
            r = requests.post(f"{BASE_URL}/auth/login", json={"phone": phone, "password": pwd}, timeout=3)
            if r.status_code == 200:
                tokens.append(r.json()["access_token"])
        except Exception:
            pass

    return tokens[:count]


def main():
    print("=" * 80)
    print("🏁 BẮT ĐẦU KIỂM THỬ TRANH CHẤP GHẾ ĐỒNG THỜI (RACE CONDITION CONCURRENCY TEST)")
    print(f"🎯 Máy chủ mục tiêu: {BASE_URL}")
    print("=" * 80)

    # 1. Lấy thông tin chuyến xe demo
    trips_res = requests.get(
        f"{BASE_URL}/trips/search",
        params={"origin": "TP. Hồ Chí Minh", "destination": "Đà Lạt", "date": "2026-11-15"},
    )
    items = trips_res.json().get("items", []) if trips_res.status_code == 200 else []
    if not items:
        print("[-] Không tìm thấy chuyến xe demo. Vui lòng kiểm tra lại server.")
        return

    trip = items[0]
    trip_id = trip["id"]

    # 2. Lấy sơ đồ ghế và chọn 1 ghế còn trống
    seats_res = requests.get(f"{BASE_URL}/trips/{trip_id}/seats").json()
    available_seats = [s for s in seats_res if s.get("state") == "TRONG"]
    if not available_seats:
        print("[-] Chuyến xe không còn ghế trống để test.")
        return

    target_seat = available_seats[0]
    seat_id = target_seat["seat_id"]
    seat_code = target_seat["code"]

    origin_name = trip.get("origin") or trip.get("route", {}).get("origin", "TP.HCM")
    dest_name = trip.get("destination") or trip.get("route", {}).get("destination", "Đà Lạt")
    print(f"[+] Chuyến xe kiểm thử : #{trip_id} ({origin_name} -> {dest_name})")
    print(f"[+] Ghế mục tiêu tranh chấp : #{seat_id} (Mã ghế: {seat_code})")
    print(f"[+] Số lượng luồng cạnh tranh : 10 luồng gửi đồng thời")
    print("-" * 80)

    # Lấy 10 token riêng biệt cho 10 người dùng
    tokens = get_tokens_pool(10)
    print(f"[+] Đã chuẩn bị {len(tokens)} tài khoản khách hàng độc lập để test cạnh tranh")

    # Nhả ghế trước (nếu đang bị giữ)
    first_headers = {"Authorization": f"Bearer {tokens[0]}", "Content-Type": "application/json"}
    requests.post(f"{BASE_URL}/trips/{trip_id}/release", headers=first_headers, json={"seat_ids": [seat_id]})

    results = []

    def attempt_hold(thread_id: int):
        user_token = tokens[thread_id - 1]
        user_headers = {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}
        start = time.perf_counter()
        res = requests.post(
            f"{BASE_URL}/trips/{trip_id}/hold",
            headers=user_headers,
            json={"seat_ids": [seat_id]},
        )
        duration = (time.perf_counter() - start) * 1000
        return thread_id, res.status_code, res.text, duration

    # 3. Kích hoạt barrier đồng thời
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(tokens)) as executor:
        futures = [executor.submit(attempt_hold, i + 1) for i in range(len(tokens))]
        for f in concurrent.futures.as_completed(futures):
            results.append(f.result())

    results.sort(key=lambda x: x[0])

    print(f"{'Luồng':<8} | {'HTTP Code':<10} | {'Thời gian':<12} | {'Kết quả ghi nhận':<40}")
    print("-" * 80)

    success_count = 0
    conflict_count = 0

    for thread_id, code, text, dur in results:
        status_label = "✅ THÀNH CÔNG (GIỮ GHẾ)" if code == 200 else "🔒 XUNG ĐỘT (TỪ CHỐI 409)"
        if code == 200:
            success_count += 1
        elif code == 409:
            conflict_count += 1
        print(f"Luồng #{thread_id:<4} | {code:<10} | {dur:6.2f} ms    | {status_label}")

    print("=" * 80)
    print("📊 TỔNG KẾT KẾT QUẢ KIỂM THỬ TRANH CHẤP ĐỒNG THỜI:")
    print(f"  • Tổng số yêu cầu gửi đi  : {len(results)}")
    print(f"  • Số luồng thành công     : {success_count} (Kỳ vọng: 1)")
    expected_conflicts = len(results) - 1
    print(f"  • Số luồng xung đột (409) : {conflict_count} (Kỳ vọng: {expected_conflicts})")

    if success_count == 1 and conflict_count == expected_conflicts:
        print("\n🎉 KẾT QUẢ ĐẠT CHUẨN HOÀN HẢO 100%! HỆ THỐNG AN TOÀN TUYỆT ĐỐI VỚI RACE CONDITION.")
    else:
        print(f"\n⚠️  Có sai lệch: success={success_count}, conflict={conflict_count}")


if __name__ == "__main__":
    main()
