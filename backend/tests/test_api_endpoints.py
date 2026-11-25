import uuid

import pytest


@pytest.fixture
def admin_token(client):
    res = client.post("/api/auth/login", json={"ten_dang_nhap": "admin", "mat_khau": "MatKhau@123"})
    assert res.status_code == 200
    return res.json()["access_token"]


@pytest.fixture
def staff_token(client):
    res = client.post("/api/auth/login", json={"ten_dang_nhap": "nv_miendong", "mat_khau": "MatKhau@123"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_get_routes(client):
    res = client.get("/api/tuyen-xe")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "diem_di" in data[0]
    assert "diem_den" in data[0]


def test_search_trips(client):
    res = client.get("/api/chuyen-xe?diem_di=TP.+Hồ+Chí+Minh")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        assert data[0]["tong_so_ghe"] > 0
        assert data[0]["so_ghe_trong"] >= 0


def test_get_seat_map(client):
    res = client.get("/api/chuyen-xe/1/so-do-ghe")
    assert res.status_code == 200
    data = res.json()
    assert data["ma_chuyen"] == 1
    assert "danh_sach_ghe" in data
    assert len(data["danh_sach_ghe"]) > 0
    assert data["danh_sach_ghe"][0]["trang_thai_chuyen"] in ["TRONG", "DA_DAT", "TAM_GIU", "BAO_TRI"]


def test_validate_coupon(client):
    res = client.post(
        "/api/khuyen-mai/kiem-tra",
        json={"ma_code": "CHAOBANMOI", "tong_tien": 400000},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["hop_le"] is True
    assert float(data["tien_giam"]) > 0
    assert float(data["tong_tien_sau_giam"]) < 400000


def test_booking_and_payment_flow(client):
    uid = uuid.uuid4().hex[:6]
    trips = client.get("/api/chuyen-xe").json()
    target_trip = next((t for t in trips if t.get("so_ghe_trong", 0) >= 2 and t["trang_thai"] in ["DangBan", "SapKhoiHanh", "HoatDong"]), None)
    target_trip_id = target_trip["ma_chuyen"] if target_trip else 2
    seat_map = client.get(f"/api/chuyen-xe/{target_trip_id}/so-do-ghe").json()
    available_seats = [g["ma_ghe"] for g in seat_map["danh_sach_ghe"] if g["trang_thai_chuyen"] == "TRONG"]
    assert len(available_seats) >= 2

    # 1. Tạo đơn đặt vé
    book_res = client.post(
        "/api/dat-ve",
        json={
            "ma_chuyen": target_trip_id,
            "danh_sach_ma_ghe": [available_seats[0]],
            "ma_code_km": "CHAOBANMOI",
            "ho_ten": f"Khách Test {uid}",
            "sdt": f"0933{uid}",
            "dia_chi": "Quận 5, TP.HCM",
        },
    )
    assert book_res.status_code == 201
    order = book_res.json()
    assert order["trang_thai"] == "ChoThanhToan"
    ma_dat_ve = order["ma_dat_ve"]

    # 2. Thử đặt lại đúng cái ghế đó -> Phải bị chặn 409 Conflict
    conflict_res = client.post(
        "/api/dat-ve",
        json={
            "ma_chuyen": target_trip_id,
            "danh_sach_ma_ghe": [available_seats[0]],
            "ho_ten": "Khách Khác",
            "sdt": "0911000999",
        },
    )
    assert conflict_res.status_code == 409
    assert "đã có người đặt" in conflict_res.json()["detail"]

    # 3. Thanh toán đơn hàng
    pay_res = client.post(
        f"/api/dat-ve/{ma_dat_ve}/thanh-toan",
        json={"phuong_thuc": "VietQR", "mo_phong": "thanh_cong"},
    )
    assert pay_res.status_code == 200
    assert pay_res.json()["trang_thai"] == "ThanhCong"

    # 4. Thử thanh toán lại đơn đã thanh toán -> Báo lỗi 400
    pay_again = client.post(
        f"/api/dat-ve/{ma_dat_ve}/thanh-toan",
        json={"phuong_thuc": "VietQR", "mo_phong": "thanh_cong"},
    )
    assert pay_again.status_code == 400

    # 5. Tra cứu lại vé công khai
    lookup_res = client.get(f"/api/ve/tra-cuu?ma_dat_ve={ma_dat_ve}")
    assert lookup_res.status_code == 200
    assert lookup_res.json()[0]["trang_thai"] == "DaThanhToan"


def test_online_booking_extended_features(client):
    uid = uuid.uuid4().hex[:6]
    # Lấy chuyến xe khả dụng
    trips = client.get("/api/chuyen-xe").json()
    trip_target = next((t for t in trips if t.get("so_ghe_trong", 0) >= 3 and t["trang_thai"] in ["DangBan", "SapKhoiHanh", "HoatDong"]), None)
    if not trip_target:
        trip_target = trips[0]
    target_trip_id = trip_target["ma_chuyen"]

    seat_map = client.get(f"/api/chuyen-xe/{target_trip_id}/so-do-ghe").json()
    available_seats = [g["ma_ghe"] for g in seat_map["danh_sach_ghe"] if g["trang_thai_chuyen"] == "TRONG"]
    assert len(available_seats) >= 2
    seat_1, seat_2 = available_seats[0], available_seats[1]

    # 1. Đặt 2 vé: 1 ghế chỉ định khách đi cùng, 1 ghế để trống (mặc định lấy người đặt)
    create_res = client.post(
        "/api/dat-ve",
        json={
            "ma_chuyen": target_trip_id,
            "danh_sach_ma_ghe": [seat_1, seat_2],
            "ho_ten": f"Người Đặt {uid}",
            "sdt": f"0912{uid}",
            "danh_sach_hanh_khach": [
                {"ma_ghe": seat_1, "ho_ten": f"Bạn Đi Cùng {uid}", "sdt": f"0988{uid}"},
            ],
        },
    )
    assert create_res.status_code == 201
    order_data = create_res.json()
    assert order_data["trang_thai"] == "ChoThanhToan"
    ve_list = order_data["danh_sach_ve"]
    assert len(ve_list) == 2

    ve_1 = next(v for v in ve_list if v["ma_ghe"] == seat_1)
    ve_2 = next(v for v in ve_list if v["ma_ghe"] == seat_2)
    assert ve_1["ho_ten_hanh_khach"] == f"Bạn Đi Cùng {uid}"
    assert ve_1["sdt_hanh_khach"] == f"0988{uid}"
    assert ve_2["ho_ten_hanh_khach"] == f"Người Đặt {uid}"
    assert ve_2["sdt_hanh_khach"] == f"0912{uid}"

    # 2. Hủy đơn giữ chỗ chưa thanh toán -> giải phóng ghế ngay
    cancel_res = client.post(f"/api/dat-ve/{order_data['ma_dat_ve']}/huy")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["trang_thai"] == "DaHuy"

    # Kiểm tra ghế đã được giải phóng
    seat_map_after = client.get(f"/api/chuyen-xe/{target_trip_id}/so-do-ghe").json()
    seat_1_status = next(g for g in seat_map_after["danh_sach_ghe"] if g["ma_ghe"] == seat_1)
    assert seat_1_status["trang_thai_chuyen"] == "TRONG"

    # 3. Đặt lại và thanh toán có nhập thông tin tài khoản ngân hàng hoàn tiền + mã giảm giá
    rebook_res = client.post(
        "/api/dat-ve",
        json={
            "ma_chuyen": target_trip_id,
            "danh_sach_ma_ghe": [seat_1],
            "ho_ten": f"Khách Mua {uid}",
            "sdt": f"0933{uid}",
        },
    )
    assert rebook_res.status_code == 201
    new_bk_id = rebook_res.json()["ma_dat_ve"]
    ma_ct = rebook_res.json()["danh_sach_ve"][0]["ma_ct"]

    # Thanh toán có voucher và thông tin ngân hàng
    pay_res = client.post(
        f"/api/dat-ve/{new_bk_id}/thanh-toan",
        json={
            "phuong_thuc": "VietQR",
            "so_tai_khoan": "0987654321",
            "ten_ngan_hang": "Techcombank",
            "ten_chu_tai_khoan": "NGUYEN VAN CHU TK",
            "ma_code_km": "CHAOBAN",
            "mo_phong": "thanh_cong",
        },
    )
    assert pay_res.status_code == 200
    assert pay_res.json()["trang_thai"] == "ThanhCong"

    # 4. Cập nhật thông tin hành khách sau khi đặt vé
    update_hk_res = client.put(
        f"/api/ve/{new_bk_id}/hanh-khach",
        json={
            "danh_sach_hanh_khach": [
                {"ma_ct": ma_ct, "ho_ten": "Tên Mới Sau Cập Nhật", "sdt": "0999888777"}
            ]
        },
    )
    # Nếu chuyến xe trong tương lai > 2 giờ -> 200 OK
    if update_hk_res.status_code == 200:
        updated_data = update_hk_res.json()
        assert updated_data["danh_sach_ve"][0]["ho_ten_hanh_khach"] == "Tên Mới Sau Cập Nhật"
        assert updated_data["danh_sach_ve"][0]["sdt_hanh_khach"] == "0999888777"
    else:
        # Nếu chuyến xe đã sát giờ <= 2 giờ
        assert update_hk_res.status_code == 400
        assert "2 giờ" in update_hk_res.json()["detail"]


def test_counter_pos_and_checkin_flow(client, staff_token, admin_token):
    uid = uuid.uuid4().hex[:6]
    trips = client.get("/api/chuyen-xe").json()
    trip_target = next((t for t in trips if t.get("so_ghe_trong", 0) > 0 and t["trang_thai"] in ["DangBan", "SapKhoiHanh", "HoatDong"]), None)
    target_trip_id = trip_target["ma_chuyen"] if trip_target else 3

    seat_map = client.get(f"/api/chuyen-xe/{target_trip_id}/so-do-ghe").json()
    available_seats = [g["ma_ghe"] for g in seat_map["danh_sach_ghe"] if g["trang_thai_chuyen"] == "TRONG"]
    assert len(available_seats) >= 1

    # 1. Bán vé tại quầy
    res = client.post(
        "/api/quay/dat-ve",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={
            "ma_chuyen": target_trip_id,
            "danh_sach_ma_ghe": [available_seats[0]],
            "ho_ten": f"Khách Quầy {uid}",
            "sdt": f"0977{uid}",
            "phuong_thuc": "TienMatTaiQuay",
        },
    )
    assert res.status_code == 201
    order = res.json()
    assert order["trang_thai"] == "DaThanhToan"
    ma_dat_ve = order["ma_dat_ve"]

    # 2. Thống kê ca trực
    shift_res = client.get("/api/quay/thong-ke-ca", headers={"Authorization": f"Bearer {staff_token}"})
    assert shift_res.status_code == 200
    assert shift_res.json()["tong_so_don"] >= 1

    # 3. Soát vé lên xe lần đầu (hợp lệ)
    soat_res = client.post(
        "/api/quay/soat-ve",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={"ma_dat_ve": ma_dat_ve},
    )
    assert soat_res.status_code == 200
    soat_data = soat_res.json()
    assert soat_data["hop_le"] is True
    assert soat_data["da_soat_truoc_do"] is False
    assert "bien_so" in soat_data
    assert "HỢP LỆ" in soat_data["thong_diep"]

    # 4. CHỐNG DOUBLE CHECK-IN: Soát vé lại lần 2 -> cảnh báo trùng lặp
    soat_dup_res = client.post(
        "/api/quay/soat-ve",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={"ma_dat_ve": ma_dat_ve},
    )
    assert soat_dup_res.status_code == 200
    dup_data = soat_dup_res.json()
    assert dup_data["hop_le"] is False
    assert dup_data["da_soat_truoc_do"] is True
    assert "CẢNH BÁO" in dup_data["thong_diep"]
    assert "ĐÃ ĐƯỢC SOÁT LÊN XE" in dup_data["thong_diep"]

    # 5. Tra cứu nhanh thông tin vé trước khi soát (/api/quay/tra-cuu-soat-ve)
    lookup_res = client.get(
        f"/api/quay/tra-cuu-soat-ve?q={ma_dat_ve}",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert lookup_res.status_code == 200
    lookup_items = lookup_res.json()
    assert len(lookup_items) >= 1
    found_item = next((it for it in lookup_items if it["ma_dat_ve"] == ma_dat_ve), None)
    assert found_item is not None
    assert found_item["da_soat_ve"] is True
    assert found_item["sdt_khach"] == order["sdt_kh"]

    # Tra cứu bằng SĐT
    lookup_phone_res = client.get(
        f"/api/quay/tra-cuu-soat-ve?q={order['sdt_kh']}",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert lookup_phone_res.status_code == 200
    assert any(it["ma_dat_ve"] == ma_dat_ve for it in lookup_phone_res.json())

    # 6. RBAC kiểm soát soát vé: Admin & Khách hàng bị chặn 403 Forbidden
    rbac_admin_soat = client.post(
        "/api/quay/soat-ve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"ma_dat_ve": ma_dat_ve},
    )
    assert rbac_admin_soat.status_code == 403

    rbac_admin_lookup = client.get(
        f"/api/quay/tra-cuu-soat-ve?q={ma_dat_ve}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert rbac_admin_lookup.status_code == 403


def test_admin_kpi_and_routes_stats(client, admin_token):
    # 1. KPI tổng quan
    kpi_res = client.get("/api/admin/thong-ke", headers={"Authorization": f"Bearer {admin_token}"})
    assert kpi_res.status_code == 200
    data = kpi_res.json()
    assert "tong_doanh_thu" in data
    assert "tong_so_chuyen_hoat_dong" in data

    # 2. Doanh thu theo tuyến
    route_res = client.get("/api/admin/thong-ke/doanh-thu-theo-tuyen", headers={"Authorization": f"Bearer {admin_token}"})
    assert route_res.status_code == 200
    assert isinstance(route_res.json(), list)


def test_customer_cannot_access_admin_or_counter(client):
    # Đăng nhập bằng khách hàng
    login_res = client.post("/api/auth/login", json={"ten_dang_nhap": "0908889999", "mat_khau": "MatKhau@123"})
    cust_token = login_res.json()["access_token"]

    # Thử vào endpoint Admin -> 403 Forbidden
    res_admin = client.get("/api/admin/thong-ke", headers={"Authorization": f"Bearer {cust_token}"})
    assert res_admin.status_code == 403

    # Thử vào endpoint Quầy bán vé -> 403 Forbidden
    res_counter = client.get("/api/quay/thong-ke-ca", headers={"Authorization": f"Bearer {cust_token}"})
    assert res_counter.status_code == 403

    res_soat = client.post("/api/quay/soat-ve", headers={"Authorization": f"Bearer {cust_token}"}, json={"ma_dat_ve": 1})
    assert res_soat.status_code == 403

    res_tra_cuu = client.get("/api/quay/tra-cuu-soat-ve?q=1", headers={"Authorization": f"Bearer {cust_token}"})
    assert res_tra_cuu.status_code == 403


def test_admin_cannot_access_counter(client, admin_token):
    # Admin (QuanTri) không có quyền vào quầy bán vé (chỉ NhanVienBanVe) -> 403 Forbidden
    res = client.get("/api/quay/thong-ke-ca", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 403

    res_book = client.post(
        "/api/quay/dat-ve",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ma_chuyen": 1,
            "danh_sach_ma_ghe": [1],
            "ho_ten": "Test",
            "sdt": "0987123456",
        },
    )
    assert res_book.status_code == 403


def test_get_settings_public(client):
    res = client.get("/api/cai-dat")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    keys = [item["khoa"] for item in data]
    assert "THOI_GIAN_GIU_CHO_PHUT" in keys
    assert "TY_LE_PHI_HUY_VE" in keys
    assert "THOI_GIAN_HUY_TOI_THIEU_GIO" in keys


def test_admin_update_settings(client, admin_token):
    res = client.put(
        "/api/cai-dat",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "thoi_gian_giu_cho_phut": 20,
            "ty_le_phi_huy_ve": 15,
            "thoi_gian_huy_toi_thieu_gio": 24,
        },
    )
    assert res.status_code == 200
    settings_map = {item["khoa"]: item["gia_tri"] for item in res.json()}
    assert settings_map["THOI_GIAN_GIU_CHO_PHUT"] == "20"
    assert settings_map["TY_LE_PHI_HUY_VE"] == "15"

    # Reset lại 15 phút, 10%
    client.put(
        "/api/cai-dat",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"thoi_gian_giu_cho_phut": 15, "ty_le_phi_huy_ve": 10},
    )


def test_customer_cannot_update_settings(client):
    login_res = client.post("/api/auth/login", json={"ten_dang_nhap": "0908889999", "mat_khau": "MatKhau@123"})
    cust_token = login_res.json()["access_token"]
    res = client.put(
        "/api/cai-dat",
        headers={"Authorization": f"Bearer {cust_token}"},
        json={"thoi_gian_giu_cho_phut": 30},
    )
    assert res.status_code == 403


def test_trip_cancellation_flow(client, admin_token, staff_token):
    import random
    rand_day = random.randint(10, 28)
    rand_hour = random.randint(1, 23)
    rand_min = random.randint(0, 59)
    # 1. Tạo một chuyến xe mới để test hủy
    trip_create = client.post(
        "/api/admin/chuyen-xe",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ma_tuyen": 1,
            "ma_xe": 1,
            "ngay_khoi_hanh": f"2027-05-{rand_day:02d}",
            "gio_khoi_hanh": f"{rand_hour:02d}:{rand_min:02d}:00",
            "gia_ve": 250000,
            "ghi_chu": "Chuyến test hủy và đền bù",
        },
    )
    assert trip_create.status_code == 201
    new_trip_id = trip_create.json()["ma_chuyen"]

    # 2. Đặt vé trực tuyến (Online)
    seat_map = client.get(f"/api/chuyen-xe/{new_trip_id}/so-do-ghe").json()
    seat_id_online = seat_map["danh_sach_ghe"][0]["ma_ghe"]
    seat_id_quay = seat_map["danh_sach_ghe"][1]["ma_ghe"]

    booking_res = client.post(
        "/api/dat-ve",
        json={
            "ma_chuyen": new_trip_id,
            "danh_sach_ma_ghe": [seat_id_online],
            "ho_ten": "Hành Khách Online",
            "sdt": f"0933{uuid.uuid4().hex[:6]}",
        },
    )
    assert booking_res.status_code == 201
    bk_online_id = booking_res.json()["ma_dat_ve"]

    # Thanh toán vé online kèm thông tin số tài khoản
    client.post(
        f"/api/dat-ve/{bk_online_id}/thanh-toan",
        json={
            "phuong_thuc": "VietQR",
            "so_tai_khoan": "0988776655",
            "ten_ngan_hang": "MBBank",
            "ten_chu_tai_khoan": "NGUYEN VAN ONLINE",
            "mo_phong": "thanh_cong",
        },
    )

    # Đặt vé trực tiếp tại quầy POS (bán bằng tiền mặt)
    counter_order_res = client.post(
        "/api/quay/dat-ve",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={
            "ma_chuyen": new_trip_id,
            "danh_sach_ma_ghe": [seat_id_quay],
            "ho_ten": "Hành Khách Mua Tại Quầy",
            "sdt": "0911223344",
            "phuong_thuc": "TienMatTaiQuay",
        },
    )
    assert counter_order_res.status_code == 201
    bk_quay_id = counter_order_res.json()["ma_dat_ve"]

    # Thử khách mua tại quầy gọi API tự hủy vé online -> Bị chặn 400 và yêu cầu ra quầy
    cancel_quay_attempt = client.post(
        f"/api/ve/{bk_quay_id}/yeu-cau-huy",
        json={"ly_do": "Khách thử tự hủy vé quầy qua mạng"},
    )
    assert cancel_quay_attempt.status_code == 400
    assert "quầy vé" in cancel_quay_attempt.json()["detail"]

    # 3. Lấy báo cáo hủy chuyến xe xem trước (Tab 1 & Tab 2)
    report_res = client.get(
        f"/api/admin/chuyen-xe/{new_trip_id}/bao-cao-huy",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert report_res.status_code == 200
    report_data = report_res.json()
    assert report_data["tong_so_ve_da_ban"] == 2
    assert report_data["ty_le_hoan_mac_dinh"] == 110
    assert float(report_data["tong_tien_goc"]) == 500000.0
    assert float(report_data["tong_tien_hoan_du_kien"]) == 550000.0  # 110% của 500,000

    # Kiểm tra Tab 2: Bảng 3 cột thông báo người dùng
    tb_list = report_data["danh_sach_thong_bao_khach"]
    assert len(tb_list) == 2

    # Tìm dòng online: có số tài khoản, không có SĐT SMS
    item_online = next(i for i in tb_list if i["hinh_thuc_mua"] == "Online")
    assert "MBBank" in item_online["tai_khoan_hoan_tien"]
    assert item_online["sdt_gui_message"] is None

    # Tìm dòng tại quầy: tài khoản để trống, có SĐT gửi SMS
    item_quay = next(i for i in tb_list if i["hinh_thuc_mua"] == "TaiQuay")
    assert item_quay["tai_khoan_hoan_tien"] is None
    assert item_quay["sdt_gui_message"] == "0911223344"

    # Kiểm tra mẫu SMS ở cuối Tab 2
    assert "NHA XE" in report_data["mau_tin_nhan_sms"]
    assert report_data["noi_dung_sms_xem_truoc"] is not None

    # 4. Xác nhận hủy chuyến với bồi thường 110%
    cancel_res = client.post(
        f"/api/admin/chuyen-xe/{new_trip_id}/xac-nhan-huy",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ly_do": "Sự cố thời tiết bão lũ ngập đường",
            "ty_le_hoan_tien": 110,
        },
    )
    assert cancel_res.status_code == 200
    cancel_data = cancel_res.json()
    assert cancel_data["trang_thai"] == "HuyChuyen"
    assert cancel_data["so_don_da_huy"] == 2
    assert cancel_data["so_ve_da_huy"] == 2
    assert cancel_data["so_don_online_hoan_ngay"] == 1
    assert cancel_data["so_don_quay_cho_nhan_tien_mat"] == 1
    assert cancel_data["so_sms_da_gui"] == 1
    assert len(cancel_data["danh_sach_sms"]) == 1
    assert cancel_data["danh_sach_sms"][0]["sdt"] == "0911223344"
    assert float(cancel_data["tong_tien_hoan_thuc_te"]) == 550000.0

    # 5. Thử hủy lại chuyến đã hủy -> 400 Bad Request
    again_res = client.post(
        f"/api/admin/chuyen-xe/{new_trip_id}/xac-nhan-huy",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"ly_do": "Thử hủy lại"},
    )
    assert again_res.status_code == 400
    assert "đã bị hủy trước đó" in again_res.json()["detail"]


def test_cannot_cancel_completed_trip(client, admin_token):
    # Chuyến 1 đã ở trạng thái HoanThanh
    res = client.post(
        "/api/admin/chuyen-xe/1/xac-nhan-huy",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"ly_do": "Cố tình hủy chuyến đã hoàn thành"},
    )
    assert res.status_code == 400
    assert "kết thúc hành trình" in res.json()["detail"]


def test_confirm_complete_trip(client, admin_token):
    import random
    rand_day = random.randint(10, 28)
    rand_hour = random.randint(1, 23)
    rand_min = random.randint(0, 59)
    # Tạo chuyến mới trạng thái SapKhoiHanh
    trip_create = client.post(
        "/api/admin/chuyen-xe",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ma_tuyen": 1,
            "ma_xe": 2,
            "ngay_khoi_hanh": f"2027-06-{rand_day:02d}",
            "gio_khoi_hanh": f"{rand_hour:02d}:{rand_min:02d}:00",
            "gia_ve": 280000,
        },
    )
    assert trip_create.status_code == 201
    tid = trip_create.json()["ma_chuyen"]

    # Đổi sang DangChay
    client.put(
        f"/api/admin/chuyen-xe/{tid}/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"trang_thai": "DangChay"},
    )

    # Không thể hủy khi xe đang chạy
    cancel_err = client.post(
        f"/api/admin/chuyen-xe/{tid}/xac-nhan-huy",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"ly_do": "Hủy khi xe đang chạy"},
    )
    assert cancel_err.status_code == 400
    assert "lăn bánh trên đường" in cancel_err.json()["detail"]

    # Xác nhận hoàn thành
    complete_res = client.post(
        f"/api/admin/chuyen-xe/{tid}/xac-nhan-hoan-thanh?ghi_chu=Xe đã về bến đỗ an toàn",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["trang_thai"] == "HoanThanh"


def test_counter_phone_hold_print_and_cash_refund(client, admin_token, staff_token):
    import random
    rand_day = random.randint(10, 28)
    rand_hour = random.randint(1, 23)
    rand_min = random.randint(0, 59)
    # 1. Tạo chuyến xe tương lai để test
    trip_create = client.post(
        "/api/admin/chuyen-xe",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ma_tuyen": 1,
            "ma_xe": 1,
            "ngay_khoi_hanh": f"2027-12-{rand_day:02d}",
            "gio_khoi_hanh": f"{rand_hour:02d}:{rand_min:02d}:00",
            "gia_ve": 300000,
        },
    )
    assert trip_create.status_code == 201
    tid = trip_create.json()["ma_chuyen"]

    # 2. Lấy sơ đồ ghế
    seat_map = client.get(f"/api/chuyen-xe/{tid}/so-do-ghe").json()
    available_seats = [g["ma_ghe"] for g in seat_map["danh_sach_ghe"] if g["trang_thai_chuyen"] == "TRONG"]
    assert len(available_seats) >= 3

    # 3. Test Giữ chỗ qua điện thoại (POST /api/quay/giu-cho-dien-thoai)
    hold_res = client.post(
        "/api/quay/giu-cho-dien-thoai",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={
            "ma_chuyen": tid,
            "danh_sach_ma_ghe": [available_seats[0]],
            "ho_ten": "Khách Gọi Điện Thoại",
            "sdt": "0987654321",
            "thoi_han_phut": 60,
            "ghi_chu": "Khách hẹn 30 phút sau ra quầy nhận vé",
        },
    )
    assert hold_res.status_code == 201
    hold_data = hold_res.json()
    assert hold_data["trang_thai"] == "ChoThanhToan"
    assert "Giữ chỗ qua điện thoại" in hold_data["ghi_chu"]
    hold_order_id = hold_data["ma_dat_ve"]

    # In vé khi đơn đang giữ chỗ
    print_hold = client.get(
        f"/api/quay/ve/{hold_order_id}/in-ve",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert print_hold.status_code == 200
    assert "NHA XE CHAT LUONG CAO" in print_hold.json()["noi_dung_in"]

    # 4. Bán vé thu tiền ngay tại quầy bằng ChuyenKhoanPOS
    pos_res = client.post(
        "/api/quay/dat-ve",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={
            "ma_chuyen": tid,
            "danh_sach_ma_ghe": [available_seats[1]],
            "ho_ten": "Khách POS Thẻ",
            "sdt": "0912345678",
            "phuong_thuc": "ChuyenKhoanPOS",
        },
    )
    assert pos_res.status_code == 201
    pos_data = pos_res.json()
    assert pos_data["trang_thai"] == "DaThanhToan"
    pos_order_id = pos_data["ma_dat_ve"]

    # 5. In phôi vé in nhiệt POS (GET /api/quay/ve/{ma_dat_ve}/in-ve)
    print_res = client.get(
        f"/api/quay/ve/{pos_order_id}/in-ve",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert print_res.status_code == 200
    p_data = print_res.json()
    assert "VE XE KHACH (POS)" in p_data["noi_dung_in"]
    assert p_data["ma_ve_barcode"] == f"BK{pos_order_id:06d}"
    assert float(p_data["tong_tien"]) == 300000

    # 6. Nghiệp vụ khách mang vé ra quầy trả và nhận lại tiền mặt (POST /api/quay/ve/{ma_dat_ve}/hoan-tien-mat)
    # Vì chuyến xe ở 2027 (còn > 24h), phí hủy là 10%
    refund_res = client.post(
        f"/api/quay/ve/{pos_order_id}/hoan-tien-mat",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={"ly_do": "Khách đổi lịch công tác đột xuất cần nhận lại tiền mặt"},
    )
    assert refund_res.status_code == 200
    ref_data = refund_res.json()
    assert float(ref_data["tong_tien_ve"]) == 300000
    assert float(ref_data["ty_le_phi_huy"]) in [10, 15]
    expected_phi = 300000 * (float(ref_data["ty_le_phi_huy"]) / 100)
    assert float(ref_data["phi_huy"]) == expected_phi
    assert float(ref_data["so_tien_hoan_mat"]) == 300000 - expected_phi
    assert "PHIEU CHI HOAN TIEN MAT (POS)" in ref_data["noi_dung_in_phieu_chi"]

    # Thử hoàn lại lần 2 -> báo lỗi 400
    refund_again = client.post(
        f"/api/quay/ve/{pos_order_id}/hoan-tien-mat",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={"ly_do": "Thử hoàn lần 2"},
    )
    assert refund_again.status_code == 400

    # 7. Thống kê ca trực đầy đủ
    shift_res = client.get("/api/quay/thong-ke-ca", headers={"Authorization": f"Bearer {staff_token}"})
    assert shift_res.status_code == 200
    shift_data = shift_res.json()
    assert shift_data["tong_so_don"] >= 1
    assert "danh_sach_don" in shift_data
    assert len(shift_data["danh_sach_don"]) >= 1
    assert float(shift_data["tong_tien_mat_hoan"]) >= 270000


def test_checkin_unpaid_or_cancelled_ticket_rejected(client, staff_token):
    # 1. Tìm chuyến xe đang bán và có ghế trống
    trips = client.get("/api/chuyen-xe").json()
    trip_target = next((t for t in trips if t.get("so_ghe_trong", 0) > 0 and t["trang_thai"] in ["DangBan", "SapKhoiHanh", "HoatDong"]), None)
    if not trip_target:
        return
    trip_id = trip_target["ma_chuyen"]

    # Lấy ghế trống
    seat_map = client.get(f"/api/chuyen-xe/{trip_id}/so-do-ghe").json()
    empty_seats = [g for g in seat_map["danh_sach_ghe"] if g["trang_thai_chuyen"] == "TRONG"]
    if not empty_seats:
        return

    # Giữ chỗ chưa trả tiền (ChoThanhToan)
    hold_res = client.post(
        "/api/quay/giu-cho-dien-thoai",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={
            "ma_chuyen": trip_id,
            "danh_sach_ma_ghe": [empty_seats[0]["ma_ghe"]],
            "ho_ten": "Khách Chưa Trả Tiền",
            "sdt": f"0911{uuid.uuid4().hex[:6]}",
        },
    )
    assert hold_res.status_code == 201
    unpaid_order_id = hold_res.json()["ma_dat_ve"]

    # Soát vé khi đơn chưa thanh toán -> hop_le=False, da_soat_truoc_do=False
    soat_res = client.post(
        "/api/quay/soat-ve",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={"ma_dat_ve": unpaid_order_id},
    )
    assert soat_res.status_code == 200
    res_data = soat_res.json()
    assert res_data["hop_le"] is False
    assert res_data["da_soat_truoc_do"] is False
    assert "KHÔNG hợp lệ" in res_data["thong_diep"]
    assert res_data["trang_thai_ve"] == "ChoThanhToan"


def test_feature5_route_management_and_safety_warning(client, admin_token):
    uid = uuid.uuid4().hex[:6]
    # 1. Admin tạo tuyến mới
    create_route_res = client.post(
        "/api/admin/tuyen-xe",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "diem_di": f"Hà Nội {uid}",
            "diem_den": f"Hải Phòng {uid}",
            "khoang_cach": 120.5,
            "thoi_gian_du_kien": 150,
            "mo_ta": "Cao tốc Hà Nội - Hải Phòng hiện đại",
        },
    )
    assert create_route_res.status_code == 201
    route_data = create_route_res.json()
    r_id = route_data["ma_tuyen"]
    assert route_data["trang_thai"] == "HoatDong"

    # 2. Tạm dừng tuyến khi chưa có chuyến nào -> không có cảnh báo
    pause_res = client.put(
        f"/api/admin/tuyen-xe/{r_id}/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"trang_thai": "TamDung"},
    )
    assert pause_res.status_code == 200
    p_data = pause_res.json()
    assert p_data["trang_thai"] == "TamDung"
    assert p_data["so_chuyen_dang_mo_ban"] == 0

    # 3. Kích hoạt lại tuyến
    active_res = client.put(
        f"/api/admin/tuyen-xe/{r_id}/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"trang_thai": "HoatDong"},
    )
    assert active_res.status_code == 200
    assert active_res.json()["trang_thai"] == "HoatDong"

    # 4. Lập lịch chuyến xe cho tuyến này (trạng thái DangBan)
    import random
    rnd_d = random.randint(1, 28)
    rnd_h = random.randint(1, 23)
    rnd_m = random.randint(0, 59)
    trip_res = client.post(
        "/api/admin/chuyen-xe",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ma_tuyen": r_id,
            "ma_xe": 1,
            "ngay_khoi_hanh": f"2029-10-{rnd_d:02d}",
            "gio_khoi_hanh": f"{rnd_h:02d}:{rnd_m:02d}:00",
            "gia_ve": 150000,
        },
    )
    assert trip_res.status_code == 201
    assert trip_res.json()["trang_thai"] == "DangBan"

    # 5. Tạm dừng tuyến khi ĐANG CÓ CHUYẾN MỞ BÁN -> Có cảnh báo rõ ràng
    pause_warning_res = client.put(
        f"/api/admin/tuyen-xe/{r_id}/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"trang_thai": "TamDung"},
    )
    assert pause_warning_res.status_code == 200
    pw_data = pause_warning_res.json()
    assert pw_data["trang_thai"] == "TamDung"
    assert pw_data["so_chuyen_dang_mo_ban"] >= 1
    assert "chuyến xe đang mở bán hoặc chuẩn bị chạy" in pw_data["thong_diep"]


def test_feature5_bulk_schedule_trips_and_conflict_check(client, admin_token):
    import random
    rand_hour = random.randint(1, 23)
    rand_min = random.randint(0, 59)
    # 1. Lập lịch định kỳ 3 ngày liên tiếp
    bulk_res = client.post(
        "/api/admin/chuyen-xe/lap-lich-hang-loat",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ma_tuyen": 1,
            "ma_xe": 3,
            "ngay_bat_dau": "2028-12-01",
            "ngay_ket_thuc": "2028-12-03",
            "gio_khoi_hanh": f"{rand_hour:02d}:{rand_min:02d}:00",
            "gia_ve": 250000,
            "ghi_chu": "Lập lịch định kỳ chạy đầu tháng 12",
        },
    )
    assert bulk_res.status_code == 201
    bulk_data = bulk_res.json()
    assert bulk_data["so_chuyen_tao"] == 3
    assert len(bulk_data["danh_sach_ma_chuyen"]) == 3

    # 2. Thử lập lịch lại trong cùng khoảng ngày với cùng xe và giờ -> Phải bị chặn 400 xung đột
    conflict_res = client.post(
        "/api/admin/chuyen-xe/lap-lich-hang-loat",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ma_tuyen": 1,
            "ma_xe": 3,
            "ngay_bat_dau": "2028-12-02",
            "ngay_ket_thuc": "2028-12-04",
            "gio_khoi_hanh": f"{rand_hour:02d}:{rand_min:02d}:00",
            "gia_ve": 250000,
        },
    )
    assert conflict_res.status_code == 400
    assert "đã có lịch chạy vào lúc" in conflict_res.json()["detail"]


def test_feature5_sync_trip_lifecycle(client, admin_token):
    # Đồng bộ vòng đời trạng thái chuyến xe theo thời gian thực
    sync_res = client.post(
        "/api/admin/chuyen-xe/dong-bo-vong-doi",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert sync_res.status_code == 200
    sync_data = sync_res.json()
    assert sync_data["status"] == "success"
    assert "Đồng bộ thành công" in sync_data["thong_diep"]
    assert "chi_tiet" in sync_data
    assert "dang_ban" in sync_data["chi_tiet"]
    assert "sap_khoi_hanh" in sync_data["chi_tiet"]
    assert "dang_chay" in sync_data["chi_tiet"]


def test_feature5_complete_trip_rigid_rules(client, admin_token):
    import random
    rand_day = random.randint(10, 28)
    rand_hour = random.randint(1, 23)
    rand_min = random.randint(0, 59)
    # 1. Tạo chuyến xe mới (ở tương lai -> DangBan)
    create_res = client.post(
        "/api/admin/chuyen-xe",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ma_tuyen": 1,
            "ma_xe": 2,
            "ngay_khoi_hanh": f"2029-07-{rand_day:02d}",
            "gio_khoi_hanh": f"{rand_hour:02d}:{rand_min:02d}:00",
            "gia_ve": 310000,
        },
    )
    assert create_res.status_code == 201
    tid = create_res.json()["ma_chuyen"]
    assert create_res.json()["trang_thai"] == "DangBan"

    # 2. RÀNG BUỘC CỨNG: Xác nhận hoàn thành khi chuyến đang 'DangBan' -> Phải bị từ chối 400
    err_dangban = client.post(
        f"/api/admin/chuyen-xe/{tid}/xac-nhan-hoan-thanh",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert err_dangban.status_code == 400
    assert "Chuyến xe chưa khởi hành lăn bánh, không thể xác nhận hoàn thành!" in err_dangban.json()["detail"]

    # 3. Đổi sang 'SapKhoiHanh' -> Thử xác nhận hoàn thành -> Vẫn phải bị từ chối 400
    client.put(
        f"/api/admin/chuyen-xe/{tid}/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"trang_thai": "SapKhoiHanh"},
    )
    err_sapkhoihanh = client.post(
        f"/api/admin/chuyen-xe/{tid}/xac-nhan-hoan-thanh",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert err_sapkhoihanh.status_code == 400
    assert "Chuyến xe chưa khởi hành lăn bánh, không thể xác nhận hoàn thành!" in err_sapkhoihanh.json()["detail"]

    # 4. Đổi sang 'DangChay' (xe đang chở khách trên đường) -> Xác nhận hoàn thành -> Thành công!
    client.put(
        f"/api/admin/chuyen-xe/{tid}/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"trang_thai": "DangChay"},
    )
    success_res = client.post(
        f"/api/admin/chuyen-xe/{tid}/xac-nhan-hoan-thanh?ghi_chu=Xe đã về bến đỗ an toàn",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert success_res.status_code == 200
    s_data = success_res.json()
    assert s_data["status"] == "success"
    assert s_data["trang_thai"] == "HoanThanh"


def test_feature5_get_vehicles_with_latest_trip(client, admin_token):
    # Lấy danh sách xe kèm chuyến xe mới nhất
    res = client.get(
        "/api/admin/xe",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    vehicles = res.json()
    assert isinstance(vehicles, list)
    assert len(vehicles) > 0
    assert "ma_xe" in vehicles[0]
    assert "bien_so" in vehicles[0]
    assert "chuyen_gan_nhat" in vehicles[0]


# ============================================================================
# CHỨC NĂNG SỐ 6: THỐNG KÊ BÁO CÁO DOANH THU & DASHBOARD KPI ADMIN (UC15, UC16)
# ============================================================================


def test_feature6_admin_analytics_kpi_and_routes(client, admin_token):
    # 1. KPI tổng quan
    kpi_res = client.get("/api/admin/thong-ke", headers={"Authorization": f"Bearer {admin_token}"})
    assert kpi_res.status_code == 200
    kpi = kpi_res.json()
    assert "tong_doanh_thu_thuc_te" in kpi
    assert "tong_tien_thu" in kpi
    assert "tong_tien_hoan" in kpi
    assert "tong_don_hang" in kpi
    assert "tong_ve_ban" in kpi
    assert "tong_chuyen_xe" in kpi
    assert "tong_khach_hang" in kpi
    # Kiểm tra tính toán doanh thu thực = thu - hoàn
    assert float(kpi["tong_doanh_thu_thuc_te"]) == float(kpi["tong_tien_thu"]) - float(kpi["tong_tien_hoan"])
    assert kpi["tong_chuyen_xe"] > 0
    assert kpi["tong_khach_hang"] > 0

    # 2. Thống kê theo tuyến xe
    routes_res = client.get("/api/admin/thong-ke/tuyen-xe", headers={"Authorization": f"Bearer {admin_token}"})
    assert routes_res.status_code == 200
    routes = routes_res.json()
    assert isinstance(routes, list)
    assert len(routes) > 0

    first_route = routes[0]
    assert "ma_tuyen" in first_route
    assert "tuyen_xe" in first_route
    assert "so_chuyen" in first_route
    assert "so_ve_ban" in first_route
    assert "tong_doanh_thu" in first_route
    assert "ty_le_lap_day_trung_binh" in first_route
    assert "->" in first_route["tuyen_xe"]


def test_feature6_admin_analytics_daily_and_payment_methods(client, admin_token):
    # 1. Thống kê theo ngày (7 ngày)
    res_7 = client.get("/api/admin/thong-ke/theo-ngay?so_ngay=7", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_7.status_code == 200
    days_7 = res_7.json()
    assert isinstance(days_7, list)
    assert len(days_7) == 7
    for d in days_7:
        assert "ngay" in d
        assert "doanh_thu" in d
        assert "so_ve" in d
        assert "so_don" in d

    # 2. Thống kê theo ngày (30 ngày)
    res_30 = client.get("/api/admin/thong-ke/theo-ngay?so_ngay=30", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_30.status_code == 200
    days_30 = res_30.json()
    assert len(days_30) == 30

    # 3. Tỷ trọng theo phương thức thanh toán
    res_methods = client.get(
        "/api/admin/thong-ke/phuong-thuc-thanh-toan",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_methods.status_code == 200
    methods = res_methods.json()
    assert isinstance(methods, list)
    assert len(methods) > 0

    total_pct = sum(m["ty_le_phan_tram"] for m in methods)
    # Tổng phần trăm xấp xỉ 100% (cho phép sai số làm tròn 1-2%)
    assert 98.0 <= total_pct <= 102.0
    for m in methods:
        assert "phuong_thuc" in m
        assert "ten_hien_thi" in m
        assert "so_giao_dich" in m
        assert "tong_tien" in m
        assert "ty_le_phan_tram" in m


def test_feature6_admin_analytics_export_csv(client, admin_token):
    # Xuất báo cáo CSV UTF-8 BOM
    res_csv = client.get("/api/admin/thong-ke/xuat-csv", headers={"Authorization": f"Bearer {admin_token}"})
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    assert "attachment;" in res_csv.headers["content-disposition"]
    assert "BaoCao_DoanhThu_" in res_csv.headers["content-disposition"]

    # Kiểm tra nội dung CSV có UTF-8 BOM và các đề mục tiếng Việt chuẩn xác
    content_bytes = res_csv.content
    assert content_bytes.startswith(b"\xef\xbb\xbf")
    content_text = content_bytes.decode("utf-8-sig")
    assert "BÁO CÁO THỐNG KÊ DOANH THU & KPI TOÀN HỆ THỐNG" in content_text
    assert "1. CHỈ SỐ KPI TỔNG QUAN" in content_text
    assert "2. THỐNG KÊ DOANH THU THEO TUYẾN XE" in content_text
    assert "3. TỶ TRỌNG THEO PHƯƠNG THỨC THANH TOÁN" in content_text
    assert "4. DOANH THU THEO NGÀY (30 NGÀY GẦN NHẤT)" in content_text


def test_feature6_admin_analytics_rbac_protection(client, staff_token):
    # Khách hàng đăng nhập
    login_res = client.post("/api/auth/login", json={"ten_dang_nhap": "0908889999", "mat_khau": "MatKhau@123"})
    cust_token = login_res.json()["access_token"]

    endpoints = [
        "/api/admin/thong-ke",
        "/api/admin/thong-ke/tuyen-xe",
        "/api/admin/thong-ke/theo-ngay",
        "/api/admin/thong-ke/phuong-thuc-thanh-toan",
        "/api/admin/thong-ke/xuat-csv",
    ]

    for ep in endpoints:
        # Khách hàng bị chặn 403 Forbidden
        r_cust = client.get(ep, headers={"Authorization": f"Bearer {cust_token}"})
        assert r_cust.status_code == 403

        # Nhân viên quầy vé bị chặn 403 Forbidden
        r_staff = client.get(ep, headers={"Authorization": f"Bearer {staff_token}"})
        assert r_staff.status_code == 403

        # Chưa đăng nhập bị chặn 401 Unauthorized
        r_anon = client.get(ep)
        assert r_anon.status_code == 401





