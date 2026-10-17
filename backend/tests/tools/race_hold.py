"""Thử tranh chấp giữ ghế: nhiều khách cùng giữ MỘT bộ ghế cùng lúc, chỉ đúng một người được thắng.

Dùng khi backend đang chạy với dữ liệu mẫu:  python backend/tests/tools/race_hold.py [http://localhost:8000]
Cần: pip install httpx.  Mong đợi: một mã 200 và các mã 409, đúng 3 ghế bị giữ.
"""

import sys
import threading
from datetime import date, timedelta

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8000"
PHONES = ["0900000002"] + [
    f"09000000{n}" for n in range(10, 17)
]  # 8 khách mẫu, mật khẩu Khach12345


def main() -> None:
    tokens = [
        httpx.post(f"{BASE}/auth/login", json={"phone": p, "password": "Khach12345"}).json()[
            "access_token"
        ]
        for p in PHONES
    ]
    day = (date.today() + timedelta(days=9)).isoformat()
    trips = httpx.get(
        f"{BASE}/trips/search", params={"origin": "Hà Nội", "destination": "Hải Phòng", "date": day}
    ).json()["items"]
    trip_id = trips[0]["id"]
    free = [
        s["seat_id"]
        for s in httpx.get(f"{BASE}/trips/{trip_id}/seats").json()
        if s["state"] == "TRONG"
    ][:3]
    results, barrier = [], threading.Barrier(len(tokens))

    def go(token: str) -> None:
        barrier.wait()  # tất cả bấm "giữ ghế" cùng một thời điểm
        r = httpx.post(
            f"{BASE}/trips/{trip_id}/hold",
            headers={"Authorization": f"Bearer {token}"},
            json={"seat_ids": free},
            timeout=30,
        )
        results.append(r.status_code)

    threads = [threading.Thread(target=go, args=(t,)) for t in tokens]
    [t.start() for t in threads]
    [t.join() for t in threads]
    held = sum(
        1 for s in httpx.get(f"{BASE}/trips/{trip_id}/seats").json() if s["state"] == "TAM_KHOA"
    )
    print(f"{len(tokens)} người giữ cùng 3 ghế: {sorted(results)}; ghế đang bị giữ: {held}")
    ok = results.count(200) == 1 and results.count(409) == len(tokens) - 1
    print("ĐẠT" if ok else "KHÔNG ĐẠT: có hơn một người giữ được cùng ghế!")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
