import uuid
from datetime import datetime, timedelta
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


@pytest.fixture
def customer_token(client):
    res = client.post("/api/auth/login", json={"ten_dang_nhap": "0908889999", "mat_khau": "MatKhau@123"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_admin_get_promotions_list(client, admin_token):
    res = client.get("/api/admin/khuyen-mai", headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if len(data) > 0:
        first = data[0]
        assert "ma_km" in first
        assert "ten_km" in first
        assert "ma_code" in first
        assert "loai_giam" in first
        assert "gia_tri_giam" in first
        assert "don_toi_thieu" in first
        assert "ngay_bat_dau" in first
        assert "ngay_ket_thuc" in first
        assert "trang_thai" in first
        assert "so_lan_su_dung" in first
        assert "con_hieu_luc" in first
        assert isinstance(first["so_lan_su_dung"], int)
        assert isinstance(first["con_hieu_luc"], bool)


def test_admin_create_promotion_percentage(client, admin_token):
    code = f"TESTPCT_{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now()
    payload = {
        "ten_km": "Chương trình giảm 15% mùa hè",
        "ma_code": code.lower(),  # Verify auto-uppercase
        "loai_giam": "PhanTram",
        "gia_tri_giam": 15,
        "gia_tri_giam_toi_da": 40000,
        "don_toi_thieu": 120000,
        "ngay_bat_dau": (now - timedelta(days=1)).isoformat(),
        "ngay_ket_thuc": (now + timedelta(days=30)).isoformat(),
        "mo_ta": "Khuyến mãi dành cho khách đặt sớm",
    }
    res = client.post(
        "/api/admin/khuyen-mai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["ma_code"] == code
    assert data["loai_giam"] == "PhanTram"
    assert float(data["gia_tri_giam"]) == 15.0
    assert float(data["gia_tri_giam_toi_da"]) == 40000.0
    assert data["so_lan_su_dung"] == 0
    assert data["con_hieu_luc"] is True
    assert data["trang_thai"] == "HoatDong"


def test_admin_create_promotion_cash(client, admin_token):
    code = f"TESTCASH_{uuid.uuid4().hex[:6].upper()}"
    now = datetime.now()
    payload = {
        "ten_km": "Giảm ngay 50.000đ trực tiếp",
        "ma_code": f"  {code}  ",  # Verify whitespace strip
        "loai_giam": "TienMat",
        "gia_tri_giam": 50000,
        "gia_tri_giam_toi_da": None,
        "don_toi_thieu": 250000,
        "ngay_bat_dau": (now - timedelta(days=2)).isoformat(),
        "ngay_ket_thuc": (now + timedelta(days=10)).isoformat(),
        "mo_ta": "Mã tiền mặt tri ân khách hàng",
    }
    res = client.post(
        "/api/admin/khuyen-mai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=payload,
    )
    assert res.status_code == 201
    data = res.json()
    assert data["ma_code"] == code
    assert data["loai_giam"] == "TienMat"
    assert float(data["gia_tri_giam"]) == 50000.0
    assert data["gia_tri_giam_toi_da"] is None
    assert data["so_lan_su_dung"] == 0
    assert data["con_hieu_luc"] is True


def test_admin_create_promotion_validations(client, admin_token):
    now = datetime.now()
    code = f"DUP_{uuid.uuid4().hex[:6].upper()}"
    base_payload = {
        "ten_km": "Test Validation",
        "ma_code": code,
        "loai_giam": "PhanTram",
        "gia_tri_giam": 20,
        "gia_tri_giam_toi_da": 50000,
        "don_toi_thieu": 100000,
        "ngay_bat_dau": now.isoformat(),
        "ngay_ket_thuc": (now + timedelta(days=10)).isoformat(),
    }
    # 1. Tạo thành công lần 1
    res1 = client.post("/api/admin/khuyen-mai", headers={"Authorization": f"Bearer {admin_token}"}, json=base_payload)
    assert res1.status_code == 201

    # 2. Trùng mã -> 400
    res2 = client.post("/api/admin/khuyen-mai", headers={"Authorization": f"Bearer {admin_token}"}, json=base_payload)
    assert res2.status_code == 400
    assert "đã tồn tại" in res2.json()["detail"]

    # 3. Ngày kết thúc <= Ngày bắt đầu -> 400
    invalid_dates = dict(base_payload)
    invalid_dates["ma_code"] = f"DATE_{uuid.uuid4().hex[:6].upper()}"
    invalid_dates["ngay_bat_dau"] = (now + timedelta(days=5)).isoformat()
    invalid_dates["ngay_ket_thuc"] = now.isoformat()
    res3 = client.post("/api/admin/khuyen-mai", headers={"Authorization": f"Bearer {admin_token}"}, json=invalid_dates)
    assert res3.status_code == 400
    assert "Ngày kết thúc phải sau ngày bắt đầu" in res3.json()["detail"]

    # 4. Phần trăm > 100 -> 400
    pct_over = dict(base_payload)
    pct_over["ma_code"] = f"PCT_{uuid.uuid4().hex[:6].upper()}"
    pct_over["gia_tri_giam"] = 105
    res4 = client.post("/api/admin/khuyen-mai", headers={"Authorization": f"Bearer {admin_token}"}, json=pct_over)
    assert res4.status_code == 400
    assert "phần trăm" in res4.json()["detail"]

    # 5. Phần trăm < 1 -> 400 hoặc 422
    pct_under = dict(base_payload)
    pct_under["ma_code"] = f"PCT0_{uuid.uuid4().hex[:6].upper()}"
    pct_under["gia_tri_giam"] = 0
    res5 = client.post("/api/admin/khuyen-mai", headers={"Authorization": f"Bearer {admin_token}"}, json=pct_under)
    assert res5.status_code in [400, 422]


def test_admin_toggle_promotion_status(client, admin_token):
    now = datetime.now()
    code = f"TOG_{uuid.uuid4().hex[:6].upper()}"
    create_res = client.post(
        "/api/admin/khuyen-mai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "ten_km": "Voucher Chuyển Đổi Trạng Thái",
            "ma_code": code,
            "loai_giam": "TienMat",
            "gia_tri_giam": 20000,
            "don_toi_thieu": 50000,
            "ngay_bat_dau": (now - timedelta(days=1)).isoformat(),
            "ngay_ket_thuc": (now + timedelta(days=15)).isoformat(),
        },
    )
    assert create_res.status_code == 201
    ma_km = create_res.json()["ma_km"]
    assert create_res.json()["trang_thai"] == "HoatDong"
    assert create_res.json()["con_hieu_luc"] is True

    # 1. Toggle lần 1 (HoatDong -> TamDung)
    toggle_1 = client.put(
        f"/api/admin/khuyen-mai/{ma_km}/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    assert toggle_1.status_code == 200
    data_1 = toggle_1.json()
    assert data_1["trang_thai"] == "TamDung"
    assert data_1["con_hieu_luc"] is False

    # 2. Toggle lần 2 (TamDung -> HoatDong)
    toggle_2 = client.put(
        f"/api/admin/khuyen-mai/{ma_km}/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    assert toggle_2.status_code == 200
    data_2 = toggle_2.json()
    assert data_2["trang_thai"] == "HoatDong"
    assert data_2["con_hieu_luc"] is True

    # 3. Chỉ định trạng thái rõ ràng
    set_tam_dung = client.put(
        f"/api/admin/khuyen-mai/{ma_km}/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"trang_thai": "TamDung"},
    )
    assert set_tam_dung.status_code == 200
    assert set_tam_dung.json()["trang_thai"] == "TamDung"

    # 4. Trạng thái không hợp lệ -> 400
    invalid_status = client.put(
        f"/api/admin/khuyen-mai/{ma_km}/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"trang_thai": "KhongHopLe"},
    )
    assert invalid_status.status_code == 400

    # 5. Mã KM không tồn tại -> 404
    not_found = client.put(
        "/api/admin/khuyen-mai/999999/trang-thai",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    assert not_found.status_code == 404


def test_admin_promotions_rbac(client, staff_token, customer_token):
    # Khách hàng bị 403
    r_cust_get = client.get("/api/admin/khuyen-mai", headers={"Authorization": f"Bearer {customer_token}"})
    assert r_cust_get.status_code == 403

    r_cust_post = client.post(
        "/api/admin/khuyen-mai",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"ten_km": "Hack", "ma_code": "HACK", "loai_giam": "TienMat", "gia_tri_giam": 10000, "ngay_bat_dau": "2026-01-01", "ngay_ket_thuc": "2026-02-01"},
    )
    assert r_cust_post.status_code == 403

    r_cust_put = client.put(
        "/api/admin/khuyen-mai/1/trang-thai",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={},
    )
    assert r_cust_put.status_code == 403

    # Nhân viên quầy bị 403
    r_staff_get = client.get("/api/admin/khuyen-mai", headers={"Authorization": f"Bearer {staff_token}"})
    assert r_staff_get.status_code == 403

    r_staff_post = client.post(
        "/api/admin/khuyen-mai",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={"ten_km": "Hack", "ma_code": "HACK", "loai_giam": "TienMat", "gia_tri_giam": 10000, "ngay_bat_dau": "2026-01-01", "ngay_ket_thuc": "2026-02-01"},
    )
    assert r_staff_post.status_code == 403

    r_staff_put = client.put(
        "/api/admin/khuyen-mai/1/trang-thai",
        headers={"Authorization": f"Bearer {staff_token}"},
        json={},
    )
    assert r_staff_put.status_code == 403

    # Không có token bị 401
    r_no_auth = client.get("/api/admin/khuyen-mai")
    assert r_no_auth.status_code == 401
