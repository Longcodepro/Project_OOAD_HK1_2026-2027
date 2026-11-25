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


@pytest.fixture
def customer_token(client):
    res = client.post("/api/auth/login", json={"ten_dang_nhap": "0908889999", "mat_khau": "MatKhau@123"})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_admin_get_vehicle_types(client, admin_token):
    """GET /api/admin/loai-xe: Admin lấy danh mục loại xe."""
    res = client.get(
        "/api/admin/loai-xe",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 4
    first_type = data[0]
    assert "ma_loai_xe" in first_type
    assert "ten_loai_xe" in first_type
    assert "so_ghe" in first_type
    assert first_type["so_ghe"] > 0


def test_admin_get_vehicles_list(client, admin_token):
    """GET /api/admin/phuong-tien: Admin lấy danh sách xe kèm số chuyến đã phụ trách."""
    res = client.get(
        "/api/admin/phuong-tien",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    xe = data[0]
    assert "ma_xe" in xe
    assert "bien_so" in xe
    assert "ten_loai_xe" in xe
    assert "so_ghe" in xe
    assert "trang_thai" in xe
    assert xe["trang_thai"] in ["HoatDong", "BaoTri", "NgungHoatDong"]
    assert "so_chuyen_da_chay" in xe
    assert isinstance(xe["so_chuyen_da_chay"], int)


def test_admin_create_vehicle_and_auto_generate_seats_2_floors(client, admin_token):
    """POST /api/admin/phuong-tien: Thêm xe 2 tầng (34 chỗ) và tự động sinh ghế A01..A17, B01..B17."""
    unique_suffix = uuid.uuid4().hex[:4].upper()
    bien_so = f"51B-88{unique_suffix[:3]}.{unique_suffix[-2:]}"

    payload = {
        "bien_so": bien_so.lower(),  # Kiểm tra chuẩn hóa viết hoa
        "hang_xe": "Thaco Mobihome 2024",
        "nam_san_xuat": 2024,
        "ma_loai_xe": 1,  # Limousine 34 Phòng
    }

    res = client.post(
        "/api/admin/phuong-tien",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    data = res.json()
    assert data["bien_so"] == bien_so.upper()
    assert data["hang_xe"] == "Thaco Mobihome 2024"
    assert data["ma_loai_xe"] == 1
    assert data["so_ghe"] == 34
    assert data["trang_thai"] == "HoatDong"
    assert data["so_chuyen_da_chay"] == 0

    ma_xe = data["ma_xe"]

    # Kiểm tra tự động sinh sơ đồ ghế
    seat_res = client.get(
        f"/api/admin/phuong-tien/{ma_xe}/so-do-ghe",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert seat_res.status_code == 200
    seats = seat_res.json()
    assert len(seats) == 34

    tang1 = [s for s in seats if s["tang"] == 1]
    tang2 = [s for s in seats if s["tang"] == 2]
    assert len(tang1) == 17
    assert len(tang2) == 17

    assert tang1[0]["so_ghe"] == "A01"
    assert tang1[-1]["so_ghe"] == "A17"
    assert tang2[0]["so_ghe"] == "B01"
    assert tang2[-1]["so_ghe"] == "B17"
    assert all(s["trang_thai"] == "Trong" for s in seats)


def test_admin_create_single_floor_vehicle_seats(client, admin_token):
    """POST /api/admin/phuong-tien: Thêm xe ghế ngồi 1 tầng (28 chỗ) và tự động sinh ghế 01..28."""
    unique_suffix = uuid.uuid4().hex[:4].upper()
    bien_so = f"51B-45{unique_suffix[:3]}.{unique_suffix[-2:]}"

    payload = {
        "bien_so": bien_so,
        "hang_xe": "Hyundai County",
        "nam_san_xuat": 2023,
        "ma_loai_xe": 4,  # Ghế Ngồi Cao Cấp 28 Chỗ
    }

    res = client.post(
        "/api/admin/phuong-tien",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 201
    data = res.json()
    ma_xe = data["ma_xe"]

    seat_res = client.get(
        f"/api/admin/phuong-tien/{ma_xe}/so-do-ghe",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert seat_res.status_code == 200
    seats = seat_res.json()
    assert len(seats) == 28
    assert all(s["tang"] == 1 for s in seats)
    assert seats[0]["so_ghe"] == "01"
    assert seats[-1]["so_ghe"] == "28"


def test_admin_create_vehicle_duplicate_plate(client, admin_token):
    """POST /api/admin/phuong-tien: Kiểm tra biển số trùng lặp trả về 400 Bad Request."""
    payload = {
        "bien_so": "51B-289.45",  # Biển số xe #1 đã có sẵn trong seed
        "hang_xe": "Samco Felix",
        "nam_san_xuat": 2022,
        "ma_loai_xe": 1,
    }
    res = client.post(
        "/api/admin/phuong-tien",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 400
    assert "đã tồn tại" in res.json()["detail"].lower()


def test_admin_create_vehicle_invalid_type(client, admin_token):
    """POST /api/admin/phuong-tien: Loại xe không tồn tại trả về 404 Not Found."""
    payload = {
        "bien_so": "51B-999.99",
        "hang_xe": "Test",
        "nam_san_xuat": 2023,
        "ma_loai_xe": 99999,
    }
    res = client.post(
        "/api/admin/phuong-tien",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 404
    assert "không tìm thấy" in res.json()["detail"].lower()


def test_admin_update_vehicle_status_with_trip_warning(client, admin_token):
    """PUT /api/admin/phuong-tien/{ma_xe}/trang-thai: Chuyển sang BaoTri khi xe đang có chuyến mở bán."""
    # Xe #1 có chuyến xe trong cơ sở dữ liệu
    res = client.put(
        "/api/admin/phuong-tien/1/trang-thai",
        json={"trang_thai": "BaoTri"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["ma_xe"] == 1
    assert data["trang_thai"] == "BaoTri"
    # Xe #1 có chuyến chạy nên phải có cảnh báo
    if data["so_chuyen_anh_huong"] > 0:
        assert data["canh_bao"] is not None
        assert "cảnh báo an toàn" in data["canh_bao"].lower()
        assert len(data["danh_sach_chuyen_anh_huong"]) > 0

    # Chuyển lại về HoatDong
    res_restore = client.put(
        "/api/admin/phuong-tien/1/trang-thai",
        json={"trang_thai": "HoatDong"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res_restore.status_code == 200
    restore_data = res_restore.json()
    assert restore_data["trang_thai"] == "HoatDong"
    assert restore_data["so_chuyen_anh_huong"] == 0
    assert restore_data["canh_bao"] is None


def test_admin_update_vehicle_status_invalid_value(client, admin_token):
    """PUT /api/admin/phuong-tien/{ma_xe}/trang-thai: Trạng thái không hợp lệ trả về 400."""
    res = client.put(
        "/api/admin/phuong-tien/1/trang-thai",
        json={"trang_thai": "DangSuaChua"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 400
    assert "không hợp lệ" in res.json()["detail"].lower()


def test_admin_update_vehicle_status_not_found(client, admin_token):
    """PUT /api/admin/phuong-tien/{ma_xe}/trang-thai: Xe không tồn tại trả về 404."""
    res = client.put(
        "/api/admin/phuong-tien/999999/trang-thai",
        json={"trang_thai": "BaoTri"},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 404


def test_admin_get_seats_not_found(client, admin_token):
    """GET /api/admin/phuong-tien/999999/so-do-ghe: Xe không tồn tại trả về 404."""
    res = client.get(
        "/api/admin/phuong-tien/999999/so-do-ghe",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert res.status_code == 404


def test_vehicles_admin_rbac(client, staff_token, customer_token):
    """RBAC 403 Forbidden: Staff và Customer không được phép can thiệp đội xe Admin."""
    # 1. Staff cố truy cập
    r_staff_get = client.get(
        "/api/admin/phuong-tien",
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert r_staff_get.status_code == 403

    r_staff_post = client.post(
        "/api/admin/phuong-tien",
        json={"bien_so": "51B-999.88", "ma_loai_xe": 1},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert r_staff_post.status_code == 403

    r_staff_put = client.put(
        "/api/admin/phuong-tien/1/trang-thai",
        json={"trang_thai": "BaoTri"},
        headers={"Authorization": f"Bearer {staff_token}"},
    )
    assert r_staff_put.status_code == 403

    # 2. Customer cố truy cập
    r_cust_get = client.get(
        "/api/admin/phuong-tien",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert r_cust_get.status_code == 403

    r_cust_types = client.get(
        "/api/admin/loai-xe",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert r_cust_types.status_code == 403

    r_cust_seats = client.get(
        "/api/admin/phuong-tien/1/so-do-ghe",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert r_cust_seats.status_code == 403
