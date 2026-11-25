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


def test_get_users_list_admin(client, admin_token):
    """Admin lấy danh sách tài khoản kèm bộ lọc vai trò, trạng thái và tìm kiếm."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Lấy toàn bộ danh sách
    res = client.get("/api/admin/tai-khoan", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0

    first_user = data[0]
    for key in ["ma_tk", "ten_dang_nhap", "vai_tro", "trang_thai", "ngay_tao"]:
        assert key in first_user

    # 2. Lọc theo vai trò QuanTri
    res_admin = client.get("/api/admin/tai-khoan?vai_tro=QuanTri", headers=headers)
    assert res_admin.status_code == 200
    for u in res_admin.json():
        assert u["vai_tro"] == "QuanTri"

    # 3. Lọc theo vai trò NhanVienBanVe
    res_nv = client.get("/api/admin/tai-khoan?vai_tro=NhanVienBanVe", headers=headers)
    assert res_nv.status_code == 200
    for u in res_nv.json():
        assert u["vai_tro"] == "NhanVienBanVe"

    # 4. Lọc theo trạng thái HoatDong
    res_active = client.get("/api/admin/tai-khoan?trang_thai=HoatDong", headers=headers)
    assert res_active.status_code == 200
    for u in res_active.json():
        assert u["trang_thai"] == "HoatDong"

    # 5. Tìm kiếm theo từ khóa q
    res_search = client.get("/api/admin/tai-khoan?q=admin", headers=headers)
    assert res_search.status_code == 200
    assert any(u["ten_dang_nhap"] == "admin" for u in res_search.json())


def test_create_staff_account_success_and_duplicates(client, admin_token):
    """Admin tạo mới nhân viên bán vé quầy POS và kiểm tra trùng tên/SĐT."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    uid = uuid.uuid4().hex[:6]
    test_username = f"nv_pos_{uid}"
    test_phone = f"098{uuid.uuid4().hex[:7].replace('a','1').replace('b','2').replace('c','3').replace('d','4').replace('e','5').replace('f','6')}"[:10]

    payload = {
        "ten_dang_nhap": test_username,
        "mat_khau": "MatKhau@123",
        "ho_ten": f"Nhân Viên Test {uid}",
        "sdt": test_phone,
        "chuc_vu": "Nhân viên Bến xe Miền Tây",
    }

    # 1. Tạo mới thành công
    res = client.post("/api/admin/nhan-vien", json=payload, headers=headers)
    assert res.status_code == 201
    created = res.json()
    assert created["ten_dang_nhap"] == test_username
    assert created["vai_tro"] == "NhanVienBanVe"
    assert created["trang_thai"] == "HoatDong"
    assert created["ho_ten"] == payload["ho_ten"]
    assert created["sdt"] == test_phone
    assert created["chuc_vu"] == payload["chuc_vu"]

    # 2. Đăng nhập thử bằng tài khoản vừa tạo
    login_res = client.post(
        "/api/auth/login",
        json={"ten_dang_nhap": test_username, "mat_khau": "MatKhau@123"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["vai_tro"] == "NhanVienBanVe"

    # 3. Trùng tên đăng nhập -> 400 Bad Request
    dup_user_res = client.post(
        "/api/admin/nhan-vien",
        json={**payload, "sdt": "0919999888"},
        headers=headers,
    )
    assert dup_user_res.status_code == 400
    assert "Tên đăng nhập đã tồn tại" in dup_user_res.json()["detail"]

    # 4. Trùng số điện thoại -> 400 Bad Request
    dup_phone_res = client.post(
        "/api/admin/nhan-vien",
        json={**payload, "ten_dang_nhap": f"nv_diff_{uid}"},
        headers=headers,
    )
    assert dup_phone_res.status_code == 400
    assert "Số điện thoại đã được đăng ký" in dup_phone_res.json()["detail"]


def test_lock_and_unlock_account_flow(client, admin_token):
    """Admin khóa và mở khóa tài khoản nhân viên."""
    headers = {"Authorization": f"Bearer {admin_token}"}
    uid = uuid.uuid4().hex[:6]
    test_username = f"nv_lock_{uid}"
    test_phone = f"097{uuid.uuid4().hex[:7].replace('a','1').replace('b','2').replace('c','3').replace('d','4').replace('e','5').replace('f','6')}"[:10]

    create_res = client.post(
        "/api/admin/nhan-vien",
        json={
            "ten_dang_nhap": test_username,
            "mat_khau": "MatKhau@123",
            "ho_ten": f"Nhân Viên Khóa {uid}",
            "sdt": test_phone,
            "chuc_vu": "Nhân viên Bến xe",
        },
        headers=headers,
    )
    assert create_res.status_code == 201
    ma_tk = create_res.json()["ma_tk"]

    # 1. Khóa tài khoản
    lock_res = client.put(
        f"/api/admin/tai-khoan/{ma_tk}/trang-thai",
        json={"trang_thai": "Khoa"},
        headers=headers,
    )
    assert lock_res.status_code == 200
    assert lock_res.json()["trang_thai"] == "Khoa"

    # 2. Thử đăng nhập tài khoản vừa bị khóa -> Không được phép (403 Forbidden)
    login_locked = client.post(
        "/api/auth/login",
        json={"ten_dang_nhap": test_username, "mat_khau": "MatKhau@123"},
    )
    assert login_locked.status_code == 403
    assert "khóa" in login_locked.json()["detail"].lower()

    # 3. Mở khóa lại tài khoản
    unlock_res = client.put(
        f"/api/admin/tai-khoan/{ma_tk}/trang-thai",
        json={"trang_thai": "HoatDong"},
        headers=headers,
    )
    assert unlock_res.status_code == 200
    assert unlock_res.json()["trang_thai"] == "HoatDong"

    # 4. Đăng nhập lại thành công
    login_unlocked = client.post(
        "/api/auth/login",
        json={"ten_dang_nhap": test_username, "mat_khau": "MatKhau@123"},
    )
    assert login_unlocked.status_code == 200


def test_admin_cannot_lock_self_security_rule(client, admin_token):
    """Ràng buộc bảo mật cứng: Admin KHÔNG ĐƯỢC PHÉP tự khóa tài khoản của chính mình."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Lấy thông tin tài khoản admin hiện tại
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    admin_ma_tk = me_res.json()["ma_tk"]

    # Thử tự khóa tài khoản của chính mình
    lock_self_res = client.put(
        f"/api/admin/tai-khoan/{admin_ma_tk}/trang-thai",
        json={"trang_thai": "Khoa"},
        headers=headers,
    )
    assert lock_self_res.status_code == 400
    detail = lock_self_res.json()["detail"]
    assert "Bạn không thể tự khóa tài khoản quản trị của chính mình!" in detail


def test_get_user_audit_logs(client, admin_token):
    """Admin xem nhật ký thao tác (Audit log) của tài khoản."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # Tài khoản admin (ma_tk = 1)
    res = client.get("/api/admin/tai-khoan/1/nhat-ky", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)

    # Tài khoản không tồn tại -> 404 Not Found
    res_not_found = client.get("/api/admin/tai-khoan/999999/nhat-ky", headers=headers)
    assert res_not_found.status_code == 404


def test_rbac_user_management_forbidden_for_staff_and_customer(client, staff_token, customer_token):
    """Kiểm tra RBAC: Nhân viên và Khách hàng không thể truy cập các endpoint quản lý tài khoản (403 Forbidden)."""
    endpoints = [
        ("GET", "/api/admin/tai-khoan"),
        ("POST", "/api/admin/nhan-vien"),
        ("PUT", "/api/admin/tai-khoan/1/trang-thai"),
        ("GET", "/api/admin/tai-khoan/1/nhat-ky"),
    ]

    for token, role_name in [(staff_token, "Staff"), (customer_token, "Customer")]:
        headers = {"Authorization": f"Bearer {token}"}
        for method, url in endpoints:
            if method == "GET":
                res = client.get(url, headers=headers)
            elif method == "POST":
                res = client.post(url, json={}, headers=headers)
            elif method == "PUT":
                res = client.put(url, json={}, headers=headers)

            assert res.status_code == 403, f"{role_name} should get 403 on {method} {url}, got {res.status_code}"
            assert "không có quyền" in res.json()["detail"].lower() or "forbidden" in res.json()["detail"].lower()
