def test_login_admin_success(client):
    res = client.post(
        "/api/auth/login",
        json={"ten_dang_nhap": "admin", "mat_khau": "MatKhau@123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["ten_dang_nhap"] == "admin"
    assert data["user"]["vai_tro"] == "QuanTri"
    assert data["user"]["ho_ten"] == "Trần Hữu Nghĩa"


def test_login_staff_success(client):
    res = client.post(
        "/api/auth/login",
        json={"ten_dang_nhap": "nv_miendong", "mat_khau": "MatKhau@123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["vai_tro"] == "NhanVienBanVe"
    assert data["user"]["chuc_vu"] == "Nhân viên Bến xe Miền Đông mới"


def test_login_customer_by_phone(client):
    res = client.post(
        "/api/auth/login",
        json={"ten_dang_nhap": "0908889999", "mat_khau": "MatKhau@123"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["user"]["ten_dang_nhap"] == "kh_dangvulong"
    assert data["user"]["vai_tro"] == "KhachHang"
    assert data["user"]["sdt"] == "0908889999"


def test_login_fail_wrong_password(client):
    res = client.post(
        "/api/auth/login",
        json={"ten_dang_nhap": "admin", "mat_khau": "MatKhauSai123"},
    )
    assert res.status_code == 401
    assert "không chính xác" in res.json()["detail"]


def test_login_fail_user_not_found(client):
    res = client.post(
        "/api/auth/login",
        json={"ten_dang_nhap": "khong_ton_tai", "mat_khau": "MatKhau@123"},
    )
    assert res.status_code == 401
    assert "không chính xác" in res.json()["detail"]


def test_get_me_success(client):
    # Đăng nhập lấy token
    login_res = client.post(
        "/api/auth/login",
        json={"ten_dang_nhap": "admin", "mat_khau": "MatKhau@123"},
    )
    token = login_res.json()["access_token"]

    # Gọi /me
    me_res = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["ten_dang_nhap"] == "admin"
    assert me_data["vai_tro"] == "QuanTri"


def test_get_me_unauthorized_no_token(client):
    res = client.get("/api/auth/me")
    assert res.status_code == 401


def test_get_me_invalid_token(client):
    res = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer token_khong_hop_le_123"},
    )
    assert res.status_code == 401


def test_register_customer_success(client):
    unique_suffix = "998877"
    reg_res = client.post(
        "/api/auth/register",
        json={
            "ten_dang_nhap": f"test_user_{unique_suffix}",
            "mat_khau": "MatKhau@123",
            "ho_ten": "Khách Hàng Mới Test",
            "sdt": f"0911{unique_suffix}",
            "dia_chi": "Quận 3, TP. Hồ Chí Minh",
        },
    )
    assert reg_res.status_code == 201
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["ho_ten"] == "Khách Hàng Mới Test"
    assert data["user"]["vai_tro"] == "KhachHang"


def test_register_duplicate_username(client):
    res = client.post(
        "/api/auth/register",
        json={
            "ten_dang_nhap": "admin",  # Đã có
            "mat_khau": "MatKhau@123",
            "ho_ten": "Người Dùng Trùng",
            "sdt": "0912999888",
        },
    )
    assert res.status_code == 400
    assert "đã được sử dụng" in res.json()["detail"]


def test_change_password_flow(client):
    # 1. Đăng ký tài khoản tạm
    username = "user_change_pass_test"
    reg_res = client.post(
        "/api/auth/register",
        json={
            "ten_dang_nhap": username,
            "mat_khau": "MatKhauCu123",
            "ho_ten": "Đổi Mật Khẩu User",
            "sdt": "0999000111",
        },
    )
    assert reg_res.status_code == 201
    token = reg_res.json()["access_token"]

    # 2. Đổi sai mật khẩu cũ -> lỗi 400
    fail_res = client.post(
        "/api/auth/doi-mat-khau",
        headers={"Authorization": f"Bearer {token}"},
        json={"mat_khau_cu": "MatKhauSai", "mat_khau_moi": "MatKhauMoi456"},
    )
    assert fail_res.status_code == 400

    # 3. Đổi đúng mật khẩu cũ
    ok_res = client.post(
        "/api/auth/doi-mat-khau",
        headers={"Authorization": f"Bearer {token}"},
        json={"mat_khau_cu": "MatKhauCu123", "mat_khau_moi": "MatKhauMoi456"},
    )
    assert ok_res.status_code == 200

    # 4. Đăng nhập lại bằng mật khẩu mới
    new_login = client.post(
        "/api/auth/login",
        json={"ten_dang_nhap": username, "mat_khau": "MatKhauMoi456"},
    )
    assert new_login.status_code == 200
