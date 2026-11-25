import json
from pathlib import Path


def build_collection():
    collection = {
        "info": {
            "name": "OOAD - Auth & Accounts Verification (Newman)",
            "_postman_id": "c1f7a8e2-8921-4d3a-b8e1-93c6f0012345",
            "description": "Bộ test tự động cho Phân hệ Xác thực & Quản lý Tài khoản (Auth & Accounts) chạy bằng Newman.",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "variable": [
            {"key": "baseUrl", "value": "http://127.0.0.1:8000", "type": "string"},
            {"key": "admin_token", "value": "", "type": "string"},
            {"key": "staff_token", "value": "", "type": "string"},
            {"key": "customer_token", "value": "", "type": "string"},
            {"key": "new_user_token", "value": "", "type": "string"},
            {"key": "random_user", "value": "", "type": "string"},
            {"key": "random_phone", "value": "", "type": "string"},
        ],
        "item": [
            # 1. Healthcheck
            {
                "name": "01. Health Check (Hệ thống & DB sẵn sàng)",
                "request": {
                    "method": "GET",
                    "header": [],
                    "url": {
                        "raw": "{{baseUrl}}/health",
                        "host": ["{{baseUrl}}"],
                        "path": ["health"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 200', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "pm.test('Hệ thống và Database đều UP', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.status).to.eql('ok');",
                                "    pm.expect(jsonData.database).to.eql('up');",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 2. Login Admin
            {
                "name": "02. Đăng nhập Admin thành công",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({"ten_dang_nhap": "admin", "mat_khau": "MatKhau@123"}),
                    },
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/login",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "login"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 200', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "pm.test('Trả về Access Token và đúng vai trò QuanTri', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.access_token).to.be.a('string');",
                                "    pm.expect(jsonData.user.vai_tro).to.eql('QuanTri');",
                                "    pm.expect(jsonData.user.ho_ten).to.eql('Trần Hữu Nghĩa');",
                                "    pm.collectionVariables.set('admin_token', jsonData.access_token);",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 3. Login Staff
            {
                "name": "03. Đăng nhập Nhân viên quầy Bến xe Miền Đông",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({"ten_dang_nhap": "nv_miendong", "mat_khau": "MatKhau@123"}),
                    },
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/login",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "login"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 200', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "pm.test('Đúng vai trò NhanVienBanVe', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.user.vai_tro).to.eql('NhanVienBanVe');",
                                "    pm.expect(jsonData.user.chuc_vu).to.include('Miền Đông');",
                                "    pm.collectionVariables.set('staff_token', jsonData.access_token);",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 4. Login Customer by Phone
            {
                "name": "04. Đăng nhập Khách hàng bằng Số điện thoại",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({"ten_dang_nhap": "0908889999", "mat_khau": "MatKhau@123"}),
                    },
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/login",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "login"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 200', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "pm.test('Đăng nhập SĐT thành công vào tài khoản kh_dangvulong', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.user.ten_dang_nhap).to.eql('kh_dangvulong');",
                                "    pm.expect(jsonData.user.vai_tro).to.eql('KhachHang');",
                                "    pm.collectionVariables.set('customer_token', jsonData.access_token);",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 5. Login Fail: Wrong password
            {
                "name": "05. Đăng nhập thất bại - Sai mật khẩu (Kỳ vọng 401)",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({"ten_dang_nhap": "admin", "mat_khau": "MatKhauSaiChacChan"}),
                    },
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/login",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "login"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 401 Unauthorized', function () {",
                                "    pm.response.to.have.status(401);",
                                "});",
                                "pm.test('Báo lỗi mật khẩu không chính xác', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.detail).to.include('không chính xác');",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 6. Login Fail: User not found
            {
                "name": "06. Đăng nhập thất bại - Tài khoản không tồn tại (Kỳ vọng 401)",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({"ten_dang_nhap": "tai_khoan_ao_99999", "mat_khau": "MatKhau@123"}),
                    },
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/login",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "login"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 401 Unauthorized', function () {",
                                "    pm.response.to.have.status(401);",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 7. Get Me - Admin
            {
                "name": "07. Lấy thông tin tài khoản hiện tại /me (Admin)",
                "request": {
                    "method": "GET",
                    "header": [{"key": "Authorization", "value": "Bearer {{admin_token}}"}],
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/me",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "me"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 200 OK', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "pm.test('Thông tin admin chính xác', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.ten_dang_nhap).to.eql('admin');",
                                "    pm.expect(jsonData.vai_tro).to.eql('QuanTri');",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 8. Get Me - Staff
            {
                "name": "08. Lấy thông tin tài khoản hiện tại /me (Nhân viên bán vé)",
                "request": {
                    "method": "GET",
                    "header": [{"key": "Authorization", "value": "Bearer {{staff_token}}"}],
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/me",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "me"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 200 OK', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "pm.test('Thông tin nhân viên chính xác', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.vai_tro).to.eql('NhanVienBanVe');",
                                "    pm.expect(jsonData.sdt).to.eql('0912345678');",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 9. Get Me - No Token
            {
                "name": "09. Gọi /me không truyền Token (Kỳ vọng 401)",
                "request": {
                    "method": "GET",
                    "header": [],
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/me",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "me"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 401 Unauthorized', function () {",
                                "    pm.response.to.have.status(401);",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 10. Get Me - Fake Token
            {
                "name": "10. Gọi /me với Token giả mạo (Kỳ vọng 401)",
                "request": {
                    "method": "GET",
                    "header": [{"key": "Authorization", "value": "Bearer fake_token_abc_xyz"}],
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/me",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "me"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 401 Unauthorized', function () {",
                                "    pm.response.to.have.status(401);",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 11. Register new customer
            {
                "name": "11. Đăng ký tài khoản Khách Hàng mới (Kỳ vọng 201 Created)",
                "event": [
                    {
                        "listen": "prerequest",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "var timestamp = Date.now();",
                                "var randomUser = 'kh_test_' + timestamp;",
                                "var randomPhone = '098' + Math.floor(1000000 + Math.random() * 9000000);",
                                "pm.collectionVariables.set('random_user', randomUser);",
                                "pm.collectionVariables.set('random_phone', randomPhone);",
                            ],
                        },
                    },
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 201 Created', function () {",
                                "    pm.response.to.have.status(201);",
                                "});",
                                "pm.test('Tài khoản mới được cấp token và vai trò KhachHang', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.access_token).to.be.a('string');",
                                "    pm.expect(jsonData.user.vai_tro).to.eql('KhachHang');",
                                "    pm.expect(jsonData.user.ho_ten).to.eql('Nguyễn Văn Newman');",
                                "    pm.collectionVariables.set('new_user_token', jsonData.access_token);",
                                "});",
                            ],
                        },
                    },
                ],
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": '{\n  "ten_dang_nhap": "{{random_user}}",\n  "mat_khau": "MatKhau@123",\n  "ho_ten": "Nguyễn Văn Newman",\n  "sdt": "{{random_phone}}",\n  "dia_chi": "Quận 1, TP. Hồ Chí Minh"\n}',
                    },
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/register",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "register"],
                    },
                },
            },
            # 12. Register duplicate username
            {
                "name": "12. Đăng ký thất bại - Trùng tên đăng nhập (Kỳ vọng 400 Bad Request)",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({
                            "ten_dang_nhap": "admin",
                            "mat_khau": "MatKhau@123",
                            "ho_ten": "Người Dùng Trùng",
                            "sdt": "0912999888",
                        }),
                    },
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/register",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "register"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 400 Bad Request', function () {",
                                "    pm.response.to.have.status(400);",
                                "});",
                                "pm.test('Báo lỗi tên đăng nhập đã được sử dụng', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.detail).to.include('đã được sử dụng');",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 13. Change password fail: wrong old pass
            {
                "name": "13. Đổi mật khẩu thất bại - Sai mật khẩu cũ (Kỳ vọng 400)",
                "request": {
                    "method": "POST",
                    "header": [
                        {"key": "Content-Type", "value": "application/json"},
                        {"key": "Authorization", "value": "Bearer {{new_user_token}}"},
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({"mat_khau_cu": "PassCuSai123", "mat_khau_moi": "PassMoi456789"}),
                    },
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/doi-mat-khau",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "doi-mat-khau"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 400 Bad Request', function () {",
                                "    pm.response.to.have.status(400);",
                                "});",
                                "pm.test('Báo lỗi mật khẩu cũ không chính xác', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.detail).to.include('không chính xác');",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 14. Change password success
            {
                "name": "14. Đổi mật khẩu thành công (Kỳ vọng 200 OK)",
                "request": {
                    "method": "POST",
                    "header": [
                        {"key": "Content-Type", "value": "application/json"},
                        {"key": "Authorization", "value": "Bearer {{new_user_token}}"},
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({"mat_khau_cu": "MatKhau@123", "mat_khau_moi": "Moi456789"}),
                    },
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/doi-mat-khau",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "doi-mat-khau"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 200 OK', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "pm.test('Đổi mật khẩu thành công', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.message).to.include('thành công');",
                                "});",
                            ],
                        },
                    }
                ],
            },
            # 15. Login again with new password
            {
                "name": "15. Đăng nhập lại với mật khẩu mới (Kỳ vọng 200 OK)",
                "request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": '{\n  "ten_dang_nhap": "{{random_user}}",\n  "mat_khau": "Moi456789"\n}',
                    },
                    "url": {
                        "raw": "{{baseUrl}}/api/auth/login",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "auth", "login"],
                    },
                },
                "event": [
                    {
                        "listen": "test",
                        "script": {
                            "type": "text/javascript",
                            "exec": [
                                "pm.test('Status code is 200 OK', function () {",
                                "    pm.response.to.have.status(200);",
                                "});",
                                "pm.test('Đăng nhập thành công với mật khẩu mới', function () {",
                                "    var jsonData = pm.response.json();",
                                "    pm.expect(jsonData.access_token).to.be.a('string');",
                                "});",
                            ],
                        },
                    }
                ],
            },
        ],
    }

    out_path = Path("tests/postman/Auth_Newman_Collection.json")
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(collection, f, ensure_ascii=False, indent=2)
    print(f"Collection saved to {out_path} with {len(collection['item'])} requests.")


if __name__ == "__main__":
    build_collection()
