# ---------- 00. Chuẩn bị ----------
def f_setup():
    f = Folder(
        "00. Chuẩn bị (chạy trước)",
        "Đăng nhập tài khoản mẫu, tạo khách hàng, xe, tuyến dùng riêng cho lần chạy này.",
    )
    pre = """
const base = Date.now() % 1e8;
const ph = k => '09' + String((base + k) % 1e8).padStart(8, '0');
['ph_cust','ph_cust2','ph_new','ph_lock','ph_resend','ph_acc','ph_staff','ph_victim','ph_lock2', 'ph_acc_new'].forEach((n, i) => pm.collectionVariables.set(n, ph(i * 7 + 1)));
pm.collectionVariables.set('rid', base.toString(36).toUpperCase());
"""
    f.add(
        Req(
            "Đăng nhập Admin mẫu",
            "POST",
            "/auth/login",
            body='{"phone":"0900000000","password":"Admin12345"}',
            pre=pre,
            expect=200,
            tests=[setv("tok_admin", "j.access_token")],
            desc="Cần đã chạy `python -m app.seed`.",
        ),
        login("Đăng nhập nhân viên quầy mẫu", "tok_clerk", "0900000001", "Staff12345"),
        *new_user("ph_cust", "tok_cust", "cust_id"),
        *new_user("ph_cust2", "tok_cust2", "cust2_id"),
        Req(
            "Lấy id loại xe",
            "GET",
            "/admin/vehicle-types",
            tok="tok_admin",
            expect=200,
            tests=[setv("vtype_id", "j[0].id")],
        ),
        Req(
            "Tạo xe lớn (24 ghế)",
            "POST",
            "/admin/vehicles",
            tok="tok_admin",
            expect=201,
            body='{"plate":"T@{rid}A","vehicle_type_id":@{vtype_id},"layout":{"floors":1,"rows":6,"seats_per_row":4}}',
            tests=[setv("veh_big", "j.id")],
        ),
        Req(
            "Tạo xe nhỏ (4 ghế)",
            "POST",
            "/admin/vehicles",
            tok="tok_admin",
            expect=201,
            body='{"plate":"T@{rid}B","vehicle_type_id":@{vtype_id},"layout":{"floors":1,"rows":2,"seats_per_row":2}}',
            tests=[setv("veh_small", "j.id")],
        ),
        Req(
            "Tạo tuyến thử (60 phút)",
            "POST",
            "/admin/routes",
            tok="tok_admin",
            expect=201,
            body='{"origin":"Thử-A-@{rid}","destination":"Thử-B-@{rid}","distance_km":100,"expected_minutes":60}',
            tests=[setv("route_id", "j.id")],
        ),
    )
    return f


# ---------- 01. Xác thực ----------
def f_auth():
    f = Folder("01. Xác thực (UC08 Đăng ký, UC09 Đăng nhập/Đăng xuất, UC19 OTP)")
    f.add(
        Req(
            "OTP: SĐT sai định dạng → 422",
            "POST",
            "/auth/register/otp",
            body='{"phone":"12345"}',
            expect=422,
        ),
        Req(
            "OTP: SĐT hợp lệ → 200, có mã mock",
            "POST",
            "/auth/register/otp",
            body='{"phone":"@{ph_new}"}',
            expect=200,
            tests=[
                js("mã OTP 6 số", OTP6),
                js("hạn hiệu lực 120 giây", "j.expires_in_seconds === 120"),
                setv("otp_new", "j.mock_otp"),
            ],
        ),
        Req(
            "OTP: xin lại ngay → 429 (chống spam SMS)",
            "POST",
            "/auth/register/otp",
            body='{"phone":"@{ph_new}"}',
            expect=429,
        ),
        Req(
            "Đăng ký: OTP sai → 400",
            "POST",
            "/auth/register",
            body='{"full_name":"Nguyễn A","phone":"@{ph_new}","password":"matkhau123","otp":"000000"}',
            expect=400,
        ),
        Req(
            "Đăng ký: mật khẩu yếu (chỉ có chữ) → 422",
            "POST",
            "/auth/register",
            body='{"full_name":"Nguyễn A","phone":"@{ph_new}","password":"chiconchucai","otp":"@{otp_new}"}',
            expect=422,
        ),
        Req(
            "Đăng ký: mật khẩu quá ngắn → 422",
            "POST",
            "/auth/register",
            body='{"full_name":"Nguyễn A","phone":"@{ph_new}","password":"ab1","otp":"@{otp_new}"}',
            expect=422,
        ),
        Req(
            "Đăng ký: thành công → 201, vai trò KHACH_HANG",
            "POST",
            "/auth/register",
            body='{"full_name":"Nguyễn A","phone":"@{ph_new}","password":"matkhau123","otp":"@{otp_new}"}',
            expect=201,
            tests=[
                js("vai trò khách hàng", "j.role === 'KHACH_HANG'"),
                js(
                    "không lộ mật khẩu", "j.password === undefined && j.password_hash === undefined"
                ),
            ],
        ),
        Req(
            "Đăng ký lại cùng SĐT → 409",
            "POST",
            "/auth/register",
            body='{"full_name":"Nguyễn A","phone":"@{ph_new}","password":"matkhau123","otp":"@{otp_new}"}',
            expect=409,
            desc="SĐT đã có tài khoản nên trả 409 trước khi xét OTP.",
        ),
        Req(
            "OTP: SĐT đã đăng ký → 409",
            "POST",
            "/auth/register/otp",
            body='{"phone":"@{ph_new}"}',
            expect=409,
        ),
        Req(
            "Đăng nhập: sai mật khẩu → 401, câu thông báo chung",
            "POST",
            "/auth/login",
            body='{"phone":"@{ph_new}","password":"saimatkhau1"}',
            expect=401,
            tests=[
                js(
                    "không tiết lộ sai ở đâu",
                    "j.detail === 'Số điện thoại hoặc mật khẩu không đúng'",
                )
            ],
        ),
        Req(
            "Đăng nhập: SĐT chưa đăng ký → 401, cùng câu thông báo",
            "POST",
            "/auth/login",
            body='{"phone":"0999999999","password":"matkhau123"}',
            expect=401,
            tests=[
                js(
                    "giống hệt trường hợp sai mật khẩu",
                    "j.detail === 'Số điện thoại hoặc mật khẩu không đúng'",
                )
            ],
        ),
        Req(
            "Đăng nhập: đúng → 200 + token 1 giờ",
            "POST",
            "/auth/login",
            body='{"phone":"@{ph_new}","password":"matkhau123"}',
            expect=200,
            tests=[
                js("hạn token 3600 giây", "j.expires_in_seconds === 3600"),
                js("không buộc đổi mật khẩu", "j.must_change_password === false"),
                setv("tok_new", "j.access_token"),
            ],
        ),
        Req(
            "Xem tôi: có token → 200",
            "GET",
            "/auth/me",
            tok="tok_new",
            expect=200,
            tests=[js("đúng số điện thoại", "j.phone === pm.collectionVariables.get('ph_new')")],
        ),
        Req("Xem tôi: không token → 401", "GET", "/auth/me", expect=401),
        Req("Xem tôi: token giả → 401", "GET", "/auth/me", tok="tok_fake", expect=401),
        Req("Đăng xuất → 204", "POST", "/auth/logout", tok="tok_new", expect=204),
        Req(
            "Xem tôi: token cũ sau khi đăng xuất → 401",
            "GET",
            "/auth/me",
            tok="tok_new",
            expect=401,
            desc="token_version đã tăng nên token cũ bị thu hồi dù chưa hết hạn.",
        ),
        # khóa tạm
        *new_user("ph_lock", "tok_lock"),
        *[
            Req(
                f"Khóa tạm: sai mật khẩu lần {i} → 401",
                "POST",
                "/auth/login",
                body='{"phone":"@{ph_lock}","password":"saimatkhau1"}',
                expect=401,
            )
            for i in range(1, 6)
        ],
        Req(
            "Khóa tạm: lần 6 dù nhập ĐÚNG mật khẩu vẫn bị chặn → 423",
            "POST",
            "/auth/login",
            body='{"phone":"@{ph_lock}","password":"matkhau123"}',
            expect=423,
        ),
    )
    return f


# ---------- 02. Tài khoản ----------
def f_account():
    f = Folder("02. Tài khoản (UC10 Quên mật khẩu, UC11 Hồ sơ, UC12 Đổi mật khẩu)")
    f.add(
        *new_user("ph_acc", "tok_acc"),
        Req(
            "Quên MK: SĐT lạ → 200 trung lập, không có mã",
            "POST",
            "/auth/password/forgot/otp",
            body='{"phone":"0999999998"}',
            expect=200,
            tests=[js("không lộ số có/không có tài khoản", "j.mock_otp === null")],
        ),
        Req(
            "Quên MK: SĐT có tài khoản → 200 có mã",
            "POST",
            "/auth/password/forgot/otp",
            body='{"phone":"@{ph_acc}"}',
            expect=200,
            tests=[js("mã OTP 6 số", OTP6), setv("otp_reset", "j.mock_otp")],
        ),
        Req(
            "Đặt lại MK: OTP sai → 400",
            "POST",
            "/auth/password/reset",
            body='{"phone":"@{ph_acc}","otp":"000000","new_password":"matkhaumoi9"}',
            expect=400,
        ),
        Req(
            "Đặt lại MK: mật khẩu mới yếu → 422",
            "POST",
            "/auth/password/reset",
            body='{"phone":"@{ph_acc}","otp":"@{otp_reset}","new_password":"chiconchucai"}',
            expect=422,
        ),
        Req(
            "Đặt lại MK: thành công → 204",
            "POST",
            "/auth/password/reset",
            body='{"phone":"@{ph_acc}","otp":"@{otp_reset}","new_password":"matkhaumoi9"}',
            expect=204,
        ),
        Req("Đặt lại MK: phiên cũ bị thu hồi → 401", "GET", "/auth/me", tok="tok_acc", expect=401),
        Req(
            "Đặt lại MK: mật khẩu cũ không còn dùng được → 401",
            "POST",
            "/auth/login",
            body='{"phone":"@{ph_acc}","password":"matkhau123"}',
            expect=401,
        ),
        Req(
            "Đặt lại MK: đăng nhập bằng mật khẩu mới → 200",
            "POST",
            "/auth/login",
            body='{"phone":"@{ph_acc}","password":"matkhaumoi9"}',
            expect=200,
            tests=[setv("tok_acc", "j.access_token")],
        ),
        Req(
            "Đổi MK: mật khẩu hiện tại sai → 400",
            "POST",
            "/auth/password/change",
            tok="tok_acc",
            body='{"current_password":"saisaisai1","new_password":"matkhaumoi8"}',
            expect=400,
        ),
        Req(
            "Đổi MK: mật khẩu mới trùng cũ → 400",
            "POST",
            "/auth/password/change",
            tok="tok_acc",
            body='{"current_password":"matkhaumoi9","new_password":"matkhaumoi9"}',
            expect=400,
        ),
        Req(
            "Đổi MK: mật khẩu mới yếu → 422",
            "POST",
            "/auth/password/change",
            tok="tok_acc",
            body='{"current_password":"matkhaumoi9","new_password":"chiconchucai"}',
            expect=422,
        ),
        Req(
            "Đổi MK: không đăng nhập → 401",
            "POST",
            "/auth/password/change",
            body='{"current_password":"matkhaumoi9","new_password":"matkhaumoi8"}',
            expect=401,
        ),
        Req(
            "Đổi MK: thành công → 200, cấp token mới",
            "POST",
            "/auth/password/change",
            tok="tok_acc",
            body='{"current_password":"matkhaumoi9","new_password":"matkhaumoi8"}',
            expect=200,
            tests=[
                js("có token mới", "!!j.access_token"),
                setv("tok_acc_old", "pm.collectionVariables.get('tok_acc')"),
                setv("tok_acc", "j.access_token"),
            ],
        ),
        Req(
            "Đổi MK: token cũ hết hiệu lực → 401", "GET", "/auth/me", tok="tok_acc_old", expect=401
        ),
        Req(
            "Hồ sơ: cập nhật tên, ngày sinh, địa chỉ → 200",
            "PATCH",
            "/auth/me",
            tok="tok_acc",
            body='{"full_name":"Tên Mới","birth_date":"2000-05-20","address":"Hà Nội"}',
            expect=200,
            tests=[
                js(
                    "đã lưu",
                    "j.full_name === 'Tên Mới' && j.birth_date === '2000-05-20' && j.address === 'Hà Nội'",
                )
            ],
        ),
        Req(
            "Hồ sơ: xem lại → số điện thoại không đổi",
            "GET",
            "/auth/me",
            tok="tok_acc",
            expect=200,
            tests=[
                js("SĐT giữ nguyên", "j.phone === pm.collectionVariables.get('ph_acc')"),
                js("tên đã đổi", "j.full_name === 'Tên Mới'"),
            ],
        ),
        Req(
            "Hồ sơ: tên rỗng → 422",
            "PATCH",
            "/auth/me",
            tok="tok_acc",
            body='{"full_name":""}',
            expect=422,
        ),
        Req(
            "Hồ sơ: ngày sinh sai định dạng → 422",
            "PATCH",
            "/auth/me",
            tok="tok_acc",
            body='{"birth_date":"20/05/2000"}',
            expect=422,
        ),
    )
    return f


# ---------- 03. Xe & sơ đồ ghế ----------
def f_fleet():
    f = Folder("03. Xe & sơ đồ ghế (UC14, Admin)")
    f.add(
        Req(
            "Danh sách loại xe → 200, có loại mẫu",
            "GET",
            "/admin/vehicle-types",
            tok="tok_admin",
            expect=200,
            tests=[js("có Giường nằm", "j.some(t => t.name === 'Giường nằm')")],
        ),
        Req(
            "Tạo loại xe trùng tên → 409",
            "POST",
            "/admin/vehicle-types",
            tok="tok_admin",
            body='{"name":"Giường nằm"}',
            expect=409,
        ),
        Req(
            "Tạo loại xe mới → 201",
            "POST",
            "/admin/vehicle-types",
            tok="tok_admin",
            body='{"name":"Loại thử @{rid}"}',
            expect=201,
        ),
        Req(
            "Thêm xe 2 tầng 10 hàng x 3 ghế → 201, 60 ghế A01..B30",
            "POST",
            "/admin/vehicles",
            tok="tok_admin",
            expect=201,
            body='{"plate":"t@{rid}c","vehicle_type_id":@{vtype_id},"brand":"Thaco","manufacture_year":2022,"layout":{"floors":2,"rows":10,"seats_per_row":3}}',
            tests=[
                js("biển số viết hoa", "j.plate === 'T' + pm.collectionVariables.get('rid') + 'C'"),
                js("60 ghế", "j.seat_count === 60 && j.seats.length === 60"),
                js(
                    "mã ghế A01 → B30",
                    "j.seats[0].code === 'A01' && j.seats[29].code === 'A30' && j.seats[30].code === 'B01' && j.seats[59].code === 'B30'",
                ),
                setv("veh_fleet", "j.id"),
            ],
        ),
        Req(
            "Thêm xe trùng biển số → 409",
            "POST",
            "/admin/vehicles",
            tok="tok_admin",
            expect=409,
            body='{"plate":"T@{rid}C","vehicle_type_id":@{vtype_id},"layout":{"floors":1,"rows":2,"seats_per_row":2}}',
        ),
        Req(
            "Thêm xe: 3 tầng → 422",
            "POST",
            "/admin/vehicles",
            tok="tok_admin",
            expect=422,
            body='{"plate":"T@{rid}D","vehicle_type_id":@{vtype_id},"layout":{"floors":3,"rows":2,"seats_per_row":2}}',
        ),
        Req(
            "Thêm xe: 0 hàng ghế → 422",
            "POST",
            "/admin/vehicles",
            tok="tok_admin",
            expect=422,
            body='{"plate":"T@{rid}E","vehicle_type_id":@{vtype_id},"layout":{"floors":1,"rows":0,"seats_per_row":2}}',
        ),
        Req(
            "Thêm xe: loại xe không tồn tại → 404",
            "POST",
            "/admin/vehicles",
            tok="tok_admin",
            expect=404,
            body='{"plate":"T@{rid}F","vehicle_type_id":999999,"layout":{"floors":1,"rows":2,"seats_per_row":2}}',
        ),
        Req(
            "Tìm xe theo biển số → 200",
            "GET",
            "/admin/vehicles?q=T@{rid}C",
            tok="tok_admin",
            expect=200,
            tests=[js("đúng 1 xe", "j.length === 1")],
        ),
        Req(
            "Xem chi tiết xe kèm sơ đồ ghế → 200",
            "GET",
            "/admin/vehicles/@{veh_fleet}",
            tok="tok_admin",
            expect=200,
            tests=[js("đủ 60 ghế", "j.seats.length === 60")],
        ),
        Req(
            "Sửa xe: đổi ghi chú và biển số (tự viết hoa) → 200",
            "PATCH",
            "/admin/vehicles/@{veh_fleet}",
            tok="tok_admin",
            body='{"note":"bảo dưỡng","plate":"t@{rid}g"}',
            expect=200,
            tests=[
                js(
                    "biển số mới viết hoa",
                    "j.plate === 'T' + pm.collectionVariables.get('rid') + 'G'",
                )
            ],
        ),
        Req(
            "Sửa xe: đổi sang biển số đã có → 409",
            "PATCH",
            "/admin/vehicles/@{veh_fleet}",
            tok="tok_admin",
            body='{"plate":"T@{rid}A"}',
            expect=409,
        ),
        Req(
            "Ngừng hoạt động xe (chưa có chuyến) → 200",
            "POST",
            "/admin/vehicles/@{veh_fleet}/deactivate",
            tok="tok_admin",
            expect=200,
            tests=[js("trạng thái ngừng", "j.status === 'NGUNG_HOAT_DONG'")],
        ),
        Req(
            "Lọc xe đang hoạt động: không còn xe vừa ngừng → 200",
            "GET",
            "/admin/vehicles?q=T@{rid}G&status=HOAT_DONG",
            tok="tok_admin",
            expect=200,
            tests=[js("rỗng", "j.length === 0")],
        ),
        Req(
            "Kích hoạt lại xe → 200",
            "POST",
            "/admin/vehicles/@{veh_fleet}/activate",
            tok="tok_admin",
            expect=200,
        ),
        Req(
            "Sửa sơ đồ ghế khi chưa có chuyến → 200, 36 ghế",
            "PUT",
            "/admin/vehicles/@{veh_fleet}/seats",
            tok="tok_admin",
            body='{"floors":1,"rows":9,"seats_per_row":4}',
            expect=200,
            tests=[js("36 ghế", "j.seat_count === 36")],
        ),
        Req(
            "Xe: khách hàng gọi API xe → 403", "GET", "/admin/vehicles", tok="tok_cust", expect=403
        ),
        Req(
            "Xe: nhân viên quầy gọi API xe → 403",
            "GET",
            "/admin/vehicles",
            tok="tok_clerk",
            expect=403,
        ),
        Req("Xe: không đăng nhập → 401", "GET", "/admin/vehicles", expect=401),
    )
    return f
