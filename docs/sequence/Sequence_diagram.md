# PHÂN HỆ 05: SƠ ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM)
*(Tương ứng Bài thực hành BTH 5)*

---

## 🌳 MỤC LỤC TÓM TẮT CÁC SƠ ĐỒ TUẦN TỰ

```text
HỆ THỐNG ĐẶT VÉ XE KHÁCH (SEQUENCE DIAGRAMS)
│
├── 1. GIAI ĐOẠN 1: MỨC PHÂN TÍCH (LUỒNG TÁC NGHIỆP)
│   ├── 1.1. Khách hàng Đặt vé & Thanh toán trực tuyến
│   └── 1.2. Bán vé trực tiếp & Thanh toán tại quầy bến xe
│
├── 2. GIAI ĐOẠN 2: MỨC THIẾT KẾ CHI TIẾT (MÔ HÌNH 3 LỚP BCE)
│   ├── 2.1. Tạm khóa chỗ ngồi (UC02)
│   ├── 2.2. Xử lý Thanh toán & Xuất vé điện tử
│   ├── 2.3. Đăng ký tài khoản (UC08)
│   ├── 2.4. Đăng nhập Hệ thống (UC09)
│   ├── 2.5. Tra cứu & Tìm chuyến xe (UC01)
│   ├── 2.6. Hủy vé trực tuyến (UC05)
│   ├── 2.7. Hủy vé tại quầy (UC06)
│   ├── 2.8. Khôi phục mật khẩu (UC10)
│   ├── 2.9. Lịch sử mua vé (UC07)
│   ├── 2.10. Quản lý thông tin cá nhân (UC11)
│   ├── 2.11. Đổi mật khẩu (UC12)
│   ├── 2.12. Quản lý chuyến xe & lịch trình (UC13)
│   ├── 2.13. Quản lý xe & sơ đồ ghế (UC14)
│   ├── 2.14. Quản lý giá vé (UC15a)
│   ├── 2.15. Quản lý khuyến mãi (UC15b)
│   ├── 2.16. Quản lý tài khoản & phân quyền (UC16)
│   └── 2.17. Thống kê & báo cáo doanh thu (UC17)
│
└── 3. BẢNG TỔNG KẾT ÁNH XẠ THÔNG ĐIỆP
```

---
## 1. GIAI ĐOẠN 1: BIỂU ĐỒ TUẦN TỰ BAN ĐẦU (MỨC PHÂN TÍCH / LUỒNG TÁC NGHIỆP)
*(Áp dụng đầy đủ ô chữ nhật đứng / activation bars cho các tác nhân và các thành phần hệ thống theo đúng luồng tác nghiệp thực tế)*

### 1.1. Luồng tác nghiệp 1: Khách hàng Đặt vé & Thanh toán trực tuyến (Kênh Website / Mobile)
*(Khách hàng thực hiện tra cứu, chọn ghế trên sơ đồ 2 tầng, thanh toán trực tuyến và nhận vé điện tử kèm mã QR)*

```mermaid
sequenceDiagram
    autonumber
    actor KH as :KhachHang
    participant GD as GiaoDien
    participant HT as HeThong
    participant CTT as :CongThanhToan

    %% 1. Tra cứu chuyến xe
    activate KH
    KH ->> GD: 1: Nhập thông tin tìm
    deactivate KH
    activate GD
    GD ->> HT: 1a: Yêu cầu tìm chuyến (điểm đi, điểm đến, ngày đi)
    deactivate GD
    activate HT
    HT -->> GD: 2: Trả về danh sách
    deactivate HT
    activate GD
    GD -->> KH: 2a: Hiển thị danh sách chuyến xe phù hợp
    deactivate GD

    %% 2. Chọn chuyến xe & xem sơ đồ ghế
    activate KH
    KH ->> GD: 3: Chọn chuyến xe
    deactivate KH
    activate GD
    GD ->> HT: 3a: Gửi yêu cầu
    deactivate GD
    activate HT
    HT -->> GD: 4: Trả về sơ đồ
    deactivate HT
    activate GD
    GD -->> KH: 4a: Hiển thị sơ đồ ghế 2 tầng
    deactivate GD

    %% 3. Chọn ghế & khóa tạm thời
    activate KH
    KH ->> GD: 5: Chọn vị trí
    deactivate KH
    activate GD
    GD ->> HT: 5a: Yêu cầu khóa ghế ghế ngồi
    deactivate GD
    activate HT
    HT -->> GD: 6: Trả về kết quả
    deactivate HT
    activate GD
    GD -->> KH: 6a: Yêu cầu nhập thông tin hành khách
    deactivate GD

    %% 4. Nhập thông tin & chuyển cổng thanh toán
    activate KH
    KH ->> GD: 7: Nhập thông tin hành khách
    deactivate KH
    activate GD
    GD ->> HT: 7a: Gửi thông tin & chọn thanh toán
    deactivate GD
    activate HT
    HT ->> CTT: 8: Chuyển hướng thanh toán
    deactivate HT
    activate CTT
    CTT -->> KH: 9: Hiển thị giao diện thanh toán / Mã QR
    deactivate CTT

    %% 5. Thực hiện thanh toán & nhận vé
    activate KH
    KH ->> CTT: 10: Thực hiện thanh toán (quét mã / chuyển khoản)
    deactivate KH
    activate CTT
    CTT ->> HT: 11: Thông báo thanh toán thành công
    deactivate CTT
    activate HT
    HT -->> KH: 12: Trả về mã vé điện tử và gửi SMS xác nhận
    deactivate HT
```

---

### 1.2. Luồng tác nghiệp 2: Bán vé trực tiếp & Thanh toán tại quầy bến xe (Kênh Quầy vé / Nhân viên)
*(Nhân viên bán vé tiếp nhận yêu cầu từ hành khách tại quầy bến xe, tra cứu chuyến, tư vấn vị trí ghế, xác nhận thu tiền mặt hoặc quét VietQR qua hệ thống thanh toán và bàn giao vé cho khách)*

```mermaid
sequenceDiagram
    autonumber
    actor KH as :KhachHang
    actor NV as :NhanVienBanVe
    participant GD as GiaoDien
    participant HT as HeThong
    participant TT as :ThanhToan

    %% 1. Tra cứu chuyến xe
    activate KH
    KH ->> NV: 1: Yêu cầu mua vé (nơi đến, ngày đi)
    deactivate KH
    activate NV
    NV ->> GD: 2: Tra cứu chuyến xe
    deactivate NV
    activate GD
    GD ->> HT: 2a: Yêu cầu tìm chuyến xe
    deactivate GD
    activate HT
    HT -->> GD: 3: Trả về danh sách chuyến & số ghế trống
    deactivate HT
    activate GD
    GD -->> NV: 3a: Hiển thị danh sách chuyến xe
    deactivate GD

    %% 2. Tư vấn và chọn chuyến
    activate NV
    NV ->> KH: 4: Tư vấn giờ chạy và giá vé
    deactivate NV
    activate KH
    KH ->> NV: 5: Chốt chuyến và vị trí ghế
    deactivate KH

    %% 3. Chọn ghế & tạm giữ chỗ
    activate NV
    NV ->> GD: 6: Chọn ghế trên sơ đồ
    deactivate NV
    activate GD
    GD ->> HT: 6a: Yêu cầu giữ chỗ tạm thời
    deactivate GD
    activate HT
    HT -->> GD: 7: Xác nhận giữ chỗ tạm thời
    deactivate HT
    activate GD
    GD -->> NV: 7a: Hiển thị giữ chỗ thành công
    deactivate GD

    %% 4. Nhập thông tin hành khách & tính tiền
    activate NV
    NV ->> GD: 8: Nhập thông tin hành khách
    deactivate NV
    activate GD
    GD ->> HT: 8a: Gửi thông tin & tính tổng tiền
    deactivate GD
    activate HT
    HT -->> GD: 9: Hiển thị tổng tiền cần thu
    deactivate HT
    activate GD
    GD -->> NV: 9a: Hiển thị tổng tiền cần thu
    deactivate GD

    %% 5. Thu tiền & xử lý thanh toán
    activate NV
    NV ->> KH: 10: Báo tổng tiền cho khách
    deactivate NV
    activate KH
    KH ->> NV: 11: Đưa tiền mặt hoặc quét mã VietQR
    deactivate KH
    activate NV
    NV ->> GD: 12: Xác nhận đã thu tiền & yêu cầu thanh toán
    deactivate NV
    activate GD
    GD ->> HT: 12a: Gửi yêu cầu ghi nhận thanh toán
    deactivate GD
    activate HT
    HT ->> TT: 13: Xử lý giao dịch thanh toán (tiền mặt / VietQR)
    deactivate HT
    activate TT
    TT -->> HT: 14: Xác nhận thanh toán thành công
    deactivate TT
    activate HT
    HT -->> GD: 15: Cập nhật vé đã bán & thông báo thành công
    deactivate HT
    activate GD
    GD -->> NV: 15a: Hiển thị thông báo bán vé thành công
    deactivate GD
    activate NV
    NV ->> KH: 16: Bàn giao vé và tiền thối (nếu có)
    deactivate NV
```

---

## 2. GIAI ĐOẠN 2: BIỂU ĐỒ TUẦN TỰ THIẾT KẾ CHI TIẾT (MÔ HÌNH 3 LỚP BCE)

---

### 2.1. Sơ đồ Tuần tự Chi tiết: Tạm khóa chỗ ngồi (UC02)
- **Ngữ cảnh:** Khách hàng chọn vị trí ghế ngồi trên sơ đồ xe, hệ thống kiểm tra và tạm khóa vị trí ghế trong phiên đặt vé (5 phút), xử lý tình huống ghế còn trống, ghế xung đột và giải phóng ghế khi hết thời gian.
- **Thành phần:**
  - `Boundary`: `:ManHinhChonGhe`
  - `Control`: `:DieuKhienGiuCho`
  - `Entity`: `:Ghe`

```mermaid
sequenceDiagram
    autonumber
    actor KH as :KhachHang
    participant MH as :ManHinhChonGhe
    participant DK as :DieuKhienGiuCho
    participant QLG as :QuanLyGhe
    participant GHE as :Ghe

    %% Luồng: Chọn vị trí ghế & Tạm giữ chỗ
    activate KH
    KH ->> MH: 1: chonViTriGhe(maGhe)
    deactivate KH
    activate MH
    MH ->> DK: 2: yeuCauTamGiuGhe(maChuyen, maGhe)
    deactivate MH

    activate DK
    DK ->> QLG: 3: kiemTraVaKhoaGhe(maChuyen, maGhe)
    deactivate DK
    activate QLG
    QLG ->> GHE: 4: layTrangThaiGhe(maGhe)
    deactivate QLG
    activate GHE
    GHE -->> QLG: 5: traVeTrangThai(trangThai)
    deactivate GHE

    alt [trangThai == 'TRONG']
        activate QLG
        QLG ->> GHE: 6: capNhatTrangThai('TAM_KHOA', thoiGianKhoa=300s)
        deactivate QLG
        activate GHE
        GHE -->> QLG: 7: xacNhanCapNhat()
        deactivate GHE
        activate QLG
        QLG -->> DK: 8: baoTamGiuThanhCong(thoiGianConLai=300s)
        deactivate QLG
        activate DK
        DK -->> MH: 9: hienThiGheDaChonVaBoDem(mauCam, 300s)
        deactivate DK
        activate MH
        MH -->> KH: 10: sangMauGheVaBatTimerDemNguoc()
        deactivate MH
    else [trangThai != 'TRONG']
        activate QLG
        QLG -->> DK: 8a: baoGheKhongKhaDung()
        deactivate QLG
        activate DK
        DK -->> MH: 9a: thongBaoLoi("Ghế đã có người chọn")
        deactivate DK
        activate MH
        MH -->> KH: 10a: hienThiThongBaoChonLai()
        deactivate MH
    end

    opt [Khách hủy chọn ghế hoặc hết thời gian 5 phút]
        activate DK
        DK ->> QLG: 11: yeuCauGiaiPhongGhe(maGhe)
        deactivate DK
        activate QLG
        QLG ->> GHE: 12: capNhatTrangThai('TRONG')
        deactivate QLG
        activate GHE
        GHE -->> QLG: 13: xacNhanGiaiPhong()
        deactivate GHE
        activate QLG
        QLG -->> DK: 14: baoGiaiPhongThanhCong()
        deactivate QLG
        activate DK
        DK -->> MH: 15: capNhatTrangThaiSoDoGhe()
        deactivate DK
        activate MH
        MH -->> KH: 16: hienThiGheTrongTroLai()
        deactivate MH
    end
```

---

### 2.2. Sơ đồ Tuần tự Chi tiết: Xử lý Thanh toán & Xuất vé điện tử
- **Ngữ cảnh:** Cổng thanh toán gửi thông báo webhook kết quả giao dịch, hệ thống đối soát, cập nhật vé chính thức và sinh mã QR.
- **Thành phần:**
  - `Boundary / External`: `:CongThanhToan`
  - `Control`: `:DieuKhienThanhToan`, `:DichVuVe`, `:DichVuThongBao`
  - `Entity`: `:DonDatVe`, `:VeXe`, `:Ghe`
  - `Actor`: `:KhachHang`

```mermaid
sequenceDiagram
    autonumber
    participant CTT as :CongThanhToan
    participant DK_TT as :DieuKhienThanhToan
    participant DV_Ve as :DichVuVe
    participant DON as :DonDatVe
    participant VE as :VeXe
    participant GHE as :Ghe
    participant DV_TB as :DichVuThongBao
    actor KH as :KhachHang

    activate CTT
    CTT ->> DK_TT: 1: thongBaoGiaoDich(maDon, maGiaoDich, soTien, ketQua)
    deactivate CTT
    activate DK_TT
    DK_TT ->> DK_TT: 2: kiemTraChuKySo(maGiaoDich)
    deactivate DK_TT

    alt [ketQua == 'THANH_CONG' && chuKyHopLe]
        activate DK_TT
        DK_TT ->> DON: 3: capNhatTrangThai('DA_THANH_TOAN')
        deactivate DK_TT
        activate DON
        DON -->> DK_TT: 4: xacNhanDaCapNhat()
        deactivate DON

        activate DK_TT
        DK_TT ->> DV_Ve: 5: phatHanhVeDienTu(maDon)
        deactivate DK_TT
        activate DV_Ve
        DV_Ve ->> DV_Ve: 6: sinhMaVeVaMaQR()
        deactivate DV_Ve

        activate DV_Ve
        DV_Ve ->> VE: 7: luuThongTinVe(maVe, maQR, maChuyen, maGhe, hoTen)
        deactivate DV_Ve
        activate VE
        VE -->> DV_Ve: 8: xacNhanDaTaoVe()
        deactivate VE

        activate DV_Ve
        DV_Ve ->> GHE: 9: capNhatTrangThai('DA_BAN')
        deactivate DV_Ve
        activate GHE
        GHE -->> DV_Ve: 10: xacNhanGheDaBan()
        deactivate GHE
        activate DV_Ve
        DV_Ve -->> DK_TT: 11: danhSachVeHoanTat()
        deactivate DV_Ve

        activate DK_TT
        DK_TT ->> DV_TB: 12: guiVeChoKhachHang(sdt, thongTinVe)
        deactivate DK_TT
        activate DV_TB
        DV_TB -->> KH: 13: guiTinNhanSMS(maVe, linkQR)
        deactivate DV_TB

        activate DK_TT
        DK_TT -->> CTT: 14: phanHoiThanhCong(200_OK)
        deactivate DK_TT
    else [ketQua == 'THAT_BAI' || !chuKyHopLe]
        activate DK_TT
        DK_TT ->> DON: 3a: capNhatTrangThai('THAT_BAI')
        deactivate DK_TT
        activate DON
        DON -->> DK_TT: 4a: xacNhanHuyDon()
        deactivate DON

        activate DK_TT
        DK_TT ->> GHE: 5a: giaiPhongGhe('TRONG')
        deactivate DK_TT
        activate GHE
        GHE -->> DK_TT: 6a: xacNhanGheDaMoLai()
        deactivate GHE

        activate DK_TT
        DK_TT -->> CTT: 7a: phanHoiLoiGiaoDich()
        deactivate DK_TT
    end
```

---

### 2.3. Sơ đồ Tuần tự Chi tiết: Đăng ký tài khoản (UC08)
- **Ngữ cảnh:** Người dùng chưa có tài khoản, thực hiện đăng ký bằng cách nhập thông tin và xác thực mã OTP gửi về số điện thoại qua dịch vụ SMS.
- **Thành phần:**
  - `Boundary`: `:ManHinhDangKy`
  - `Control`: `:DieuKhienDangKy`
  - `Entity`: `:TaiKhoan`
  - `External`: `:DichVuSMS`

```mermaid
sequenceDiagram
    autonumber
    actor ND as :NguoiDung
    participant MH_DK as :ManHinhDangKy
    participant DK_DK as :DieuKhienDangKy
    participant TK as :TaiKhoan
    participant SMS as :DichVuSMS

    activate ND
    ND ->> MH_DK: 1: nhapThongTinDangKy(hoTen, sdt, email, matKhau)
    deactivate ND
    activate ND
    ND ->> MH_DK: 2: nhanNutDangKy()
    deactivate ND
    activate MH_DK
    MH_DK ->> DK_DK: 3: yeuCauDangKy(thongTin)
    deactivate MH_DK

    activate DK_DK
    DK_DK ->> TK: 4: kiemTraTonTai(sdt)
    deactivate DK_DK
    activate TK
    TK -->> DK_DK: 5: ketQuaKiemTra(daTonTai)
    deactivate TK

    alt [sdt da ton tai]
        activate DK_DK
        DK_DK -->> MH_DK: 6a: thongBaoLoi("Số điện thoại đã được đăng ký")
        deactivate DK_DK
        activate MH_DK
        MH_DK -->> ND: 7a: hienThiCanhBaoTrungSDT()
        deactivate MH_DK
    else [sdt hop le - chua ton tai]
        activate DK_DK
        DK_DK ->> DK_DK: 6: sinhMaOTP()
        deactivate DK_DK
        activate DK_DK
        DK_DK ->> SMS: 7: guiTinNhanOTP(sdt, maOTP)
        deactivate DK_DK
        activate SMS
        SMS -->> ND: 8: guiSMSChuaMaOTP()
        deactivate SMS
        activate DK_DK
        DK_DK -->> MH_DK: 9: yeuCauNhapOTP()
        deactivate DK_DK
        activate MH_DK
        MH_DK -->> ND: 10: hienThiPopupNhapOTP()
        deactivate MH_DK

        activate ND
        ND ->> MH_DK: 11: nhapMaOTP(maOTP)
        deactivate ND
        activate MH_DK
        MH_DK ->> DK_DK: 12: xacThucOTP(maOTP)
        deactivate MH_DK

        alt [maOTP hop le]
            activate DK_DK
            DK_DK ->> TK: 13: taoTaiKhoanMoi(hoTen, sdt, email, hashMatKhau)
            deactivate DK_DK
            activate TK
            TK -->> DK_DK: 14: xacNhanLuuThanhCong()
            deactivate TK
            activate DK_DK
            DK_DK -->> MH_DK: 15: thongBaoDangKyThanhCong()
            deactivate DK_DK
            activate MH_DK
            MH_DK -->> ND: 16: hienThiThanhCongVaChuyenTrangDangNhap()
            deactivate MH_DK
        else [maOTP khong dung / het han]
            activate DK_DK
            DK_DK -->> MH_DK: 13a: thongBaoLoiOTP("Mã OTP không chính xác")
            deactivate DK_DK
            activate MH_DK
            MH_DK -->> ND: 14a: hienThiLoiNhapLaiOTP()
            deactivate MH_DK
        end
    end
```

---

### 2.4. Sơ đồ Tuần tự Chi tiết: Đăng nhập Hệ thống (UC09)
- **Ngữ cảnh:** Người dùng đăng nhập vào hệ thống bằng thông tin đăng nhập, hệ thống kiểm tra mật khẩu, trạng thái khóa và khởi tạo phiên làm việc.
- **Thành phần:**
  - `Boundary`: `:ManHinhDangNhap`
  - `Control`: `:DieuKhienDangNhap`
  - `Entity`: `:TaiKhoan`

```mermaid
sequenceDiagram
    autonumber
    actor ND as :NguoiDung
    participant MH_DN as :ManHinhDangNhap
    participant DK_DN as :DieuKhienDangNhap
    participant TK as :TaiKhoan

    activate ND
    ND ->> MH_DN: 1: nhapThongTin(tenDangNhap, matKhau)
    deactivate ND
    activate ND
    ND ->> MH_DN: 2: nhanNutDangNhap()
    deactivate ND
    activate MH_DN
    MH_DN ->> DK_DN: 3: xuLyDangNhap(tenDangNhap, matKhau)
    deactivate MH_DN

    activate DK_DN
    DK_DN ->> TK: 4: timTaiKhoan(tenDangNhap)
    deactivate DK_DN
    activate TK
    TK -->> DK_DN: 5: traVeThongTin(taiKhoan, hashMatKhau, trangThai, vaiTro)
    deactivate TK

    alt [Khong tim thay hoac Sai mat khau]
        activate DK_DN
        DK_DN -->> MH_DN: 6a: thongBaoLoi("Tên đăng nhập hoặc mật khẩu không đúng")
        deactivate DK_DN
        activate MH_DN
        MH_DN -->> ND: 7a: hienThiLoiDangNhap()
        deactivate MH_DN
    else [Tai khoan bi khoa]
        activate DK_DN
        DK_DN -->> MH_DN: 6b: thongBaoLoi("Tài khoản đã bị khóa")
        deactivate DK_DN
        activate MH_DN
        MH_DN -->> ND: 7b: hienThiCanhBaoKhoaTaiKhoan()
        deactivate MH_DN
    else [Dang nhap thanh cong]
        activate DK_DN
        DK_DN ->> DK_DN: 6: taoPhienDangNhap(maTK, vaiTro)
        deactivate DK_DN
        activate DK_DN
        DK_DN -->> MH_DN: 7: traVeKetQua(thanhCong, vaiTro, token)
        deactivate DK_DN
        activate MH_DN
        MH_DN -->> ND: 8: hienThiTrangChinhTheoVaiTro(vaiTro)
        deactivate MH_DN
    end
```

---

### 2.5. Sơ đồ Tuần tự Chi tiết: Tra cứu & Tìm chuyến xe (UC01)
*(Áp dụng mô hình 3 lớp BCE để mô tả quá trình khách hàng nhập thông tin tìm chuyến xe)*

```mermaid
sequenceDiagram
    autonumber
    actor KH as :KhachHang
    participant MH as :ManHinhTrangChu
    participant DK as :DieuKhienTraCuu
    participant CX as :ChuyenXe
    participant DB as :CoSoDuLieu

    activate KH
    KH ->> MH: 1: nhapThongTinTraCuu(diemDi, diemDen, ngayDi)
    deactivate KH
    activate KH
    KH ->> MH: 2: bamTimChuyenXe()
    deactivate KH
    
    activate MH
    MH ->> DK: 3: xuLyTimChuyenXe(diemDi, diemDen, ngayDi)
    deactivate MH
    activate DK
    DK ->> CX: 4: layDanhSachChuyenXe(diemDi, diemDen, ngayDi)
    deactivate DK
    activate CX
    CX ->> DB: 5: truyVanChuyenXe()
    deactivate CX
    activate DB
    DB -->> CX: 6: traVeTapDuLieu()
    deactivate DB
    activate CX
    CX -->> DK: 7: traVeDanhSachChuyenXe()
    deactivate CX
    
    alt Không tìm thấy chuyến xe
        activate DK
        DK -->> MH: 8: traVeDanhSachRong()
        deactivate DK
        activate MH
        MH -->> KH: 9: hienThiThongBaoKhongCoChuyen()
        deactivate MH
    else Tìm thấy chuyến xe
        activate DK
        DK -->> MH: 10: traVeDanhSachChuyenXe()
        deactivate DK
        activate MH
        MH -->> KH: 11: hienThiDanhSachChuyenXe()
        deactivate MH
    end
```

---

### 2.6. Sơ đồ Tuần tự Chi tiết: Hủy vé trực tuyến (UC05)
*(Áp dụng mô hình 3 lớp BCE để mô tả quá trình khách hàng hủy vé qua website/app và được hoàn tiền điện tử)*

```mermaid
sequenceDiagram
    autonumber
    actor KH as :KhachHang
    participant MH as :ManHinhQuanLyVe
    participant DK as :DieuKhienHuyVe
    participant VE as :VeXe
    participant GH as :Ghe
    participant CTT as :CongThanhToan

    activate KH
    KH ->> MH: 1: chonChucNangHuyVe(maVe)
    deactivate KH
    
    activate MH
    MH ->> DK: 2: xuLyHuyVe(maVe)
    deactivate MH
    activate DK
    DK ->> VE: 3: kiemTraDieuKienHuy(maVe)
    deactivate DK
    activate VE
    VE -->> DK: 4: traVeKetQua(hopLe)
    deactivate VE
    
    alt Không đủ điều kiện hủy
        activate DK
        DK -->> MH: 5: traVeLoi(quaGioHuy)
        deactivate DK
        activate MH
        MH -->> KH: 6: hienThiThongBaoTuChoi()
        deactivate MH
    else Đủ điều kiện hủy
        activate DK
        DK ->> VE: 7: capNhatTrangThai('DA_HUY')
        deactivate DK
        activate VE
        VE -->> DK: 7a: xacNhanDaCapNhat()
        deactivate VE

        activate DK
        DK ->> GH: 8: capNhatTrangThai('TRONG')
        deactivate DK
        activate GH
        GH -->> DK: 8a: xacNhanGheDaMo()
        deactivate GH
        
        activate DK
        DK ->> CTT: 9: yeuCauHoanTien(maVe, soTienHoan)
        deactivate DK
        activate CTT
        CTT -->> DK: 10: xacNhanHoanTienThanhCong()
        deactivate CTT
        
        activate DK
        DK -->> MH: 11: traVeKetQuaHuy(thanhCong)
        deactivate DK
        activate MH
        MH -->> KH: 12: hienThiThongBaoHuyThanhCong()
        deactivate MH
    end
```

---

### 2.7. Sơ đồ Tuần tự Chi tiết: Hủy vé tại quầy (UC06)
*(Áp dụng mô hình 3 lớp BCE để mô tả nhân viên tra cứu vé, hủy vé, trả tiền và in biên nhận hủy cho khách)*

```mermaid
sequenceDiagram
    autonumber
    actor NV as :NhanVienBanVe
    participant MH as :ManHinhBanVeQuay
    participant DK as :DieuKhienHuyVeQuay
    participant VE as :VeXe
    participant GH as :Ghe
    participant MI as :MayInVe

    %% Luồng 1: Tra cứu thông tin vé
    activate NV
    NV ->> MH: 1: nhapMaVeVaTraCuu(maVe)
    deactivate NV
    
    activate MH
    MH ->> DK: 2: truyXuatThongTinVe(maVe)
    deactivate MH
    activate DK
    DK ->> VE: 3: layThongTinVe(maVe)
    deactivate DK
    activate VE
    VE -->> DK: 4: traVeThongTinChiTiet()
    deactivate VE
    activate DK
    DK -->> MH: 5: hienThiThongTinVe()
    deactivate DK
    activate MH
    MH -->> NV: 6: hienThiChiTietVe()
    deactivate MH
    
    %% Luồng 2: Xác nhận hủy & Trả tiền mặt, in biên nhận
    activate NV
    NV ->> MH: 7: bamXacNhanHuyVe()
    deactivate NV
    
    activate MH
    MH ->> DK: 8: xuLyHuyVeQuay(maVe)
    deactivate MH
    activate DK
    DK ->> VE: 9: capNhatTrangThai('DA_HUY')
    deactivate DK
    activate VE
    VE -->> DK: 9a: xacNhanDaCapNhat()
    deactivate VE

    activate DK
    DK ->> GH: 10: capNhatTrangThai('TRONG')
    deactivate DK
    activate GH
    GH -->> DK: 10a: xacNhanGheDaMo()
    deactivate GH
    
    activate DK
    DK ->> MI: 11: guiLenhInBienNhanHuy()
    deactivate DK
    activate MI
    MI -->> DK: 12: xacNhanDaIn()
    deactivate MI
    
    activate DK
    DK -->> MH: 13: traVeKetQuaHuyThanhCong()
    deactivate DK
    
    activate MH
    MH -->> NV: 14: thongBaoYeuCauTraTienMat()
    deactivate MH
```

---

### 2.8. Sơ đồ Tuần tự Chi tiết: Khôi phục mật khẩu (UC10)
*(Áp dụng mô hình 3 lớp BCE để mô tả quá trình xác thực OTP qua SMS và cấp lại mật khẩu)*

```mermaid
sequenceDiagram
    autonumber
    actor KH as :NguoiDung
    participant MH as :ManHinhKhoiPhuc
    participant DK as :DieuKhienXacThuc
    participant SMS as :DichVuSMS
    participant TK as :TaiKhoan

    %% Luồng 1: Nhập số điện thoại & Gửi OTP
    activate KH
    KH ->> MH: 1: nhapSoDienThoai(sdt)
    deactivate KH
    activate KH
    KH ->> MH: 2: bamYeuCauKhoiPhuc()
    deactivate KH
    
    activate MH
    MH ->> DK: 3: xuLyYeuCauKhoiPhuc(sdt)
    deactivate MH
    activate DK
    DK ->> TK: 4: kiemTraTonTai(sdt)
    deactivate DK
    activate TK
    TK -->> DK: 5: traVeKetQua(tonTai)
    deactivate TK
    
    alt Tài khoản không tồn tại
        activate DK
        DK -->> MH: 6: traVeLoi(khongTonTai)
        deactivate DK
        activate MH
        MH -->> KH: 7: hienThiThongBaoLoi()
        deactivate MH
    else Hợp lệ
        activate DK
        DK ->> SMS: 8: yeuCauGuiOTP(sdt)
        deactivate DK
        activate SMS
        SMS -->> KH: 9: guiTinNhanOTP()
        deactivate SMS
        activate DK
        DK -->> MH: 10: yeuCauNhapOTP()
        deactivate DK
        activate MH
        MH -->> KH: 11: hienThiFormNhapOTP()
        deactivate MH
    end
    
    %% Luồng 2: Xác thực OTP
    activate KH
    KH ->> MH: 12: nhapMaOTP(maOTP)
    deactivate KH
    
    activate MH
    MH ->> DK: 13: xacThucOTP(maOTP)
    deactivate MH
    activate DK
    DK -->> MH: 14: xacThucThanhCong()
    deactivate DK
    activate MH
    MH -->> KH: 15: hienThiFormMatKhauMoi()
    deactivate MH
    
    %% Luồng 3: Đặt lại mật khẩu mới
    activate KH
    KH ->> MH: 16: nhapMatKhauMoi(matKhauMoi)
    deactivate KH
    
    activate MH
    MH ->> DK: 17: capNhatMatKhau(sdt, matKhauMoi)
    deactivate MH
    activate DK
    DK ->> TK: 18: luuMatKhauMoi(matKhauMoi)
    deactivate DK
    activate TK
    TK -->> DK: 19: xacNhanLuuThanhCong()
    deactivate TK
    activate DK
    DK -->> MH: 20: traVeKetQua(thanhCong)
    deactivate DK
    activate MH
    MH -->> KH: 21: thongBaoThanhCongVaChuyenTrang()
    deactivate MH
```

---

### 2.9. Sơ đồ Tuần tự Chi tiết: Lịch sử mua vé (UC07)
*(Khách hàng xem lịch sử vé; luồng mở rộng: lọc theo trạng thái vé)*

```mermaid
sequenceDiagram
    autonumber
    actor KH as :KhachHang
    participant MH as :ManHinhLichSuVe
    participant DK as :DieuKhienLichSuVe
    participant VE as :VeXe

    %% Luồng 1: Xem lịch sử vé
    activate KH
    KH ->> MH: 1: chonLichSuMuaVe()
    deactivate KH
    activate MH
    MH ->> DK: 2: xuLyXemLichSu(maKhach)
    deactivate MH
    activate DK
    DK ->> VE: 3: layDanhSachVe(maKhach)
    deactivate DK
    activate VE
    VE -->> DK: 4: traVeDanhSachVe()
    deactivate VE
    activate DK
    DK -->> MH: 5: traVeDanhSachVe()
    deactivate DK
    activate MH
    MH -->> KH: 6: hienThiLichSuVe()
    deactivate MH

    %% Luồng 2: Lọc theo trạng thái
    opt Lọc theo trạng thái (extend)
        activate KH
        KH ->> MH: 7: chonTrangThai('CHUA_DI' / 'DA_HOAN_THANH' / 'DA_HUY')
        deactivate KH
        activate MH
        MH ->> DK: 8: xuLyLocLichSu(maKhach, trangThai)
        deactivate MH
        activate DK
        DK ->> VE: 9: layDanhSachVeTheoTrangThai(maKhach, trangThai)
        deactivate DK
        activate VE
        VE -->> DK: 10: traVeDanhSachVe()
        deactivate VE
        activate DK
        DK -->> MH: 11: traVeDanhSachVe()
        deactivate DK
        activate MH
        MH -->> KH: 12: hienThiDanhSachDaLoc()
        deactivate MH
    end
```

---

### 2.10. Sơ đồ Tuần tự Chi tiết: Quản lý thông tin cá nhân (UC11)
*(Khách hàng / Nhân viên bán vé xem hồ sơ; luồng mở rộng: cập nhật thông tin)*

```mermaid
sequenceDiagram
    autonumber
    actor ND as :NguoiDung
    participant MH as :ManHinhHoSo
    participant DK as :DieuKhienHoSo
    participant TK as :TaiKhoan

    %% Luồng 1: Xem hồ sơ cá nhân
    activate ND
    ND ->> MH: 1: chonHoSoCaNhan()
    deactivate ND
    activate MH
    MH ->> DK: 2: xuLyXemHoSo(maTK)
    deactivate MH
    activate DK
    DK ->> TK: 3: layThongTin(maTK)
    deactivate DK
    activate TK
    TK -->> DK: 4: traVeThongTinCaNhan()
    deactivate TK
    activate DK
    DK -->> MH: 5: traVeThongTinCaNhan()
    deactivate DK
    activate MH
    MH -->> ND: 6: hienThiHoSo()
    deactivate MH

    %% Luồng 2: Cập nhật thông tin
    opt Cập nhật thông tin (extend)
        activate ND
        ND ->> MH: 7: nhapThongTinMoi(hoTen, ngaySinh, diaChi)
        deactivate ND
        activate ND
        ND ->> MH: 8: bamLuuThayDoi()
        deactivate ND
        activate MH
        MH ->> DK: 9: xuLyCapNhatHoSo(maTK, thongTinMoi)
        deactivate MH
        activate DK
        DK ->> TK: 10: capNhatThongTin(thongTinMoi)
        deactivate DK
        activate TK
        TK -->> DK: 11: xacNhanLuuThanhCong()
        deactivate TK
        activate DK
        DK -->> MH: 12: traVeKetQua(thanhCong)
        deactivate DK
        activate MH
        MH -->> ND: 13: hienThiThongBaoCapNhatThanhCong()
        deactivate MH
    end
```

---

### 2.11. Sơ đồ Tuần tự Chi tiết: Đổi mật khẩu (UC12)

```mermaid
sequenceDiagram
    autonumber
    actor KH as :KhachHang
    participant MH as :ManHinhDoiMatKhau
    participant DK as :DieuKhienDoiMatKhau
    participant TK as :TaiKhoan

    activate KH
    KH ->> MH: 1: nhapMatKhau(matKhauCu, matKhauMoi)
    deactivate KH
    activate KH
    KH ->> MH: 2: bamDoiMatKhau()
    deactivate KH
    activate MH
    MH ->> DK: 3: xuLyDoiMatKhau(maTK, matKhauCu, matKhauMoi)
    deactivate MH
    activate DK
    DK ->> TK: 4: kiemTraMatKhauCu(matKhauCu)
    deactivate DK
    activate TK
    TK -->> DK: 5: traVeKetQua(dung)
    deactivate TK

    alt Mật khẩu cũ sai
        activate DK
        DK -->> MH: 6: traVeLoi(saiMatKhauCu)
        deactivate DK
        activate MH
        MH -->> KH: 7: hienThiThongBaoLoi()
        deactivate MH
    else Mật khẩu cũ đúng
        activate DK
        DK ->> TK: 8: luuMatKhauMoi(matKhauMoi)
        deactivate DK
        activate TK
        TK -->> DK: 9: xacNhanLuuThanhCong()
        deactivate TK
        activate DK
        DK -->> MH: 10: traVeKetQua(thanhCong)
        deactivate DK
        activate MH
        MH -->> KH: 11: hienThiThongBaoDoiThanhCong()
        deactivate MH
    end
```

---

### 2.12. Sơ đồ Tuần tự Chi tiết: Quản lý chuyến xe & lịch trình (UC13)
*(Admin xem danh sách, thêm chuyến mới và hủy chuyến kèm hoàn tiền (include). Các thao tác sửa/tìm kiếm tương tự luồng xem/thêm nên không vẽ lặp.)*

```mermaid
sequenceDiagram
    autonumber
    actor AD as :Admin
    participant MH as :ManHinhQuanLyChuyen
    participant DK as :DieuKhienQuanLyChuyen
    participant CX as :ChuyenXe
    participant VE as :VeXe
    participant CTT as :CongThanhToan

    %% Luồng 1: Xem danh sách chuyến
    activate AD
    AD ->> MH: 1: chonQuanLyChuyenXe()
    deactivate AD
    activate MH
    MH ->> DK: 2: xuLyXemDanhSach()
    deactivate MH
    activate DK
    DK ->> CX: 3: layDanhSachChuyen()
    deactivate DK
    activate CX
    CX -->> DK: 4: traVeDanhSachChuyen()
    deactivate CX
    activate DK
    DK -->> MH: 5: traVeDanhSachChuyen()
    deactivate DK
    activate MH
    MH -->> AD: 6: hienThiDanhSachChuyen()
    deactivate MH

    %% Luồng 2: Tìm kiếm chuyến
    opt Tìm kiếm chuyến (extend)
        activate AD
        AD ->> MH: 7: nhapBoLoc(ngay, tuyen)
        deactivate AD
        activate MH
        MH ->> DK: 8: xuLyTimKiem(ngay, tuyen)
        deactivate MH
        activate DK
        DK ->> CX: 9: timChuyen(ngay, tuyen)
        deactivate DK
        activate CX
        CX -->> DK: 10: traVeKetQuaTimKiem()
        deactivate CX
        activate DK
        DK -->> MH: 11: traVeKetQuaTimKiem()
        deactivate DK
        activate MH
        MH -->> AD: 12: hienThiKetQuaTimKiem()
        deactivate MH
    end

    %% Luồng 3: Thao tác Thêm / Hủy chuyến
    alt Thêm chuyến mới
        activate AD
        AD ->> MH: 13: nhapThongTinChuyen(tuyen, ngayGio, xe)
        deactivate AD
        activate MH
        MH ->> DK: 14: xuLyThemChuyen(thongTinChuyen)
        deactivate MH
        activate DK
        DK ->> CX: 15: taoChuyenMoi(thongTinChuyen)
        deactivate DK
        activate CX
        CX -->> DK: 16: xacNhanTaoThanhCong()
        deactivate CX
        activate DK
        DK -->> MH: 17: traVeKetQua(thanhCong)
        deactivate DK
        activate MH
        MH -->> AD: 18: hienThiThongBaoThanhCong()
        deactivate MH
    else Hủy chuyến xe
        activate AD
        AD ->> MH: 19: chonHuyChuyen(maChuyen, lyDo)
        deactivate AD
        activate MH
        MH ->> DK: 20: xuLyHuyChuyen(maChuyen, lyDo)
        deactivate MH
        activate DK
        DK ->> CX: 21: capNhatTrangThai('DA_HUY')
        deactivate DK
        activate CX
        CX -->> DK: 21a: xacNhanHuyChuyen()
        deactivate CX
        activate DK
        DK ->> VE: 22: layDanhSachVeDaThanhToan(maChuyen)
        deactivate DK
        activate VE
        VE -->> DK: 23: traVeDanhSachVe()
        deactivate VE
        loop Từng vé đã thanh toán (include: Hoàn tiền)
            activate DK
            DK ->> CTT: 24: yeuCauHoanTien(maVe, soTien)
            deactivate DK
            activate CTT
            CTT -->> DK: 25: xacNhanHoanTien()
            deactivate CTT
            activate DK
            DK ->> VE: 26: capNhatTrangThai('DA_HUY')
            deactivate DK
            activate VE
            VE -->> DK: 26a: xacNhanCapNhat()
            deactivate VE
        end
        activate DK
        DK -->> MH: 27: traVeKetQua(thanhCong)
        deactivate DK
        activate MH
        MH -->> AD: 28: hienThiThongBaoHuyThanhCong()
        deactivate MH
    end
```

---

### 2.13. Sơ đồ Tuần tự Chi tiết: Quản lý xe & sơ đồ ghế (UC14)
*(Admin xem danh sách xe, thêm xe mới kèm thiết lập sơ đồ ghế (include) và ngừng hoạt động xe)*

```mermaid
sequenceDiagram
    autonumber
    actor AD as :Admin
    participant MH as :ManHinhQuanLyXe
    participant DK as :DieuKhienQuanLyXe
    participant XE as :XeKhach
    participant GH as :Ghe

    %% Luồng 1: Xem danh sách xe
    activate AD
    AD ->> MH: 1: chonQuanLyXe()
    deactivate AD
    activate MH
    MH ->> DK: 2: xuLyXemDanhSachXe()
    deactivate MH
    activate DK
    DK ->> XE: 3: layDanhSachXe()
    deactivate DK
    activate XE
    XE -->> DK: 4: traVeDanhSachXe()
    deactivate XE
    activate DK
    DK -->> MH: 5: traVeDanhSachXe()
    deactivate DK
    activate MH
    MH -->> AD: 6: hienThiDanhSachXe()
    deactivate MH

    %% Luồng 2: Xem sơ đồ ghế của xe
    opt Xem sơ đồ ghế của xe (extend)
        activate AD
        AD ->> MH: 7: chonXemSoDoGhe(maXe)
        deactivate AD
        activate MH
        MH ->> DK: 8: xuLyXemSoDoGhe(maXe)
        deactivate MH
        activate DK
        DK ->> GH: 9: layDanhSachGheTheoXe(maXe)
        deactivate DK
        activate GH
        GH -->> DK: 10: traVeSoDoGhe()
        deactivate GH
        activate DK
        DK -->> MH: 11: traVeSoDoGhe()
        deactivate DK
        activate MH
        MH -->> AD: 12: hienThiSoDoGhe()
        deactivate MH
    end

    %% Luồng 3: Thêm xe mới / Ngừng hoạt động
    alt Thêm xe mới
        activate AD
        AD ->> MH: 13: nhapThongTinXe(bienSo, loaiXe)
        deactivate AD
        activate AD
        AD ->> MH: 14: thietLapSoDoGhe(soTang, soGhe)
        deactivate AD
        activate MH
        MH ->> DK: 15: xuLyThemXe(thongTinXe, soDoGhe)
        deactivate MH
        activate DK
        DK ->> XE: 16: taoXeMoi(thongTinXe)
        deactivate DK
        activate XE
        XE -->> DK: 17: xacNhanTaoXe()
        deactivate XE
        activate DK
        DK ->> GH: 18: taoSoDoGhe(maXe, soDoGhe)
        deactivate DK
        activate GH
        GH -->> DK: 19: xacNhanTaoSoDo()
        deactivate GH
        activate DK
        DK -->> MH: 20: traVeKetQua(thanhCong)
        deactivate DK
        activate MH
        MH -->> AD: 21: hienThiThongBaoThanhCong()
        deactivate MH
    else Ngừng hoạt động xe
        activate AD
        AD ->> MH: 22: chonNgungHoatDong(maXe)
        deactivate AD
        activate MH
        MH ->> DK: 23: xuLyNgungHoatDong(maXe)
        deactivate MH
        activate DK
        DK ->> XE: 24: capNhatTrangThai('NGUNG_HOAT_DONG')
        deactivate DK
        activate XE
        XE -->> DK: 25: xacNhanCapNhat()
        deactivate XE
        activate DK
        DK -->> MH: 26: traVeKetQua(thanhCong)
        deactivate DK
        activate MH
        MH -->> AD: 27: hienThiThongBaoThanhCong()
        deactivate MH
    end
```

---

### 2.14. Sơ đồ Tuần tự Chi tiết: Quản lý giá vé (UC15a)
- **Ngữ cảnh:** Admin tra cứu danh sách bảng giá vé của các tuyến xe và cập nhật giá vé mới cho từng chuyến.
- **Thành phần:**
  - `Boundary`: `:ManHinhGiaVe`
  - `Control`: `:DieuKhienGiaVe`
  - `Entity`: `:ChuyenXe`

```mermaid
sequenceDiagram
    autonumber
    actor AD as :Admin
    participant MH_GV as :ManHinhGiaVe
    participant DK_GV as :DieuKhienGiaVe
    participant CX as :ChuyenXe

    %% Xem bảng giá vé
    activate AD
    AD ->> MH_GV: 1: chonQuanLyGiaVe()
    deactivate AD
    activate MH_GV
    MH_GV ->> DK_GV: 2: layDanhSachBangGia()
    deactivate MH_GV
    activate DK_GV
    DK_GV ->> CX: 3: layBangGiaCacTuyen()
    deactivate DK_GV
    activate CX
    CX -->> DK_GV: 4: traVeBangGia(danhSachGia)
    deactivate CX
    activate DK_GV
    DK_GV -->> MH_GV: 5: traVeBangGia(danhSachGia)
    deactivate DK_GV
    activate MH_GV
    MH_GV -->> AD: 6: hienThiBangGiaVeCacTuyen()
    deactivate MH_GV

    %% Cập nhật giá vé
    activate AD
    AD ->> MH_GV: 7: chonChuyenVaNhapGiaMoi(maChuyen, giaMoi)
    deactivate AD
    activate AD
    AD ->> MH_GV: 8: nhanLuuThayDoi()
    deactivate AD
    activate MH_GV
    MH_GV ->> DK_GV: 9: xuLyCapNhatGia(maChuyen, giaMoi)
    deactivate MH_GV

    alt [giaMoi > 0]
        activate DK_GV
        DK_GV ->> CX: 10: capNhatGiaVe(maChuyen, giaMoi)
        deactivate DK_GV
        activate CX
        CX -->> DK_GV: 11: xacNhanCapNhatThanhCong()
        deactivate CX
        activate DK_GV
        DK_GV -->> MH_GV: 12: traVeKetQua(thanhCong)
        deactivate DK_GV
        activate MH_GV
        MH_GV -->> AD: 13: hienThiThongBaoCapNhatThanhCong()
        deactivate MH_GV
    else [giaMoi <= 0]
        activate DK_GV
        DK_GV -->> MH_GV: 10a: thongBaoLoi("Giá vé phải lớn hơn 0")
        deactivate DK_GV
        activate MH_GV
        MH_GV -->> AD: 11a: hienThiLoiNhapGia()
        deactivate MH_GV
    end
```

---

### 2.15. Sơ đồ Tuần tự Chi tiết: Quản lý khuyến mãi (UC15b)
- **Ngữ cảnh:** Admin xem danh sách mã giảm giá, thêm mã khuyến mãi mới hoặc bật/tắt (kích hoạt/hủy kích hoạt) mã giảm giá.
- **Thành phần:**
  - `Boundary`: `:ManHinhKhuyenMai`
  - `Control`: `:DieuKhienKhuyenMai`
  - `Entity`: `:MaGiamGia`

```mermaid
sequenceDiagram
    autonumber
    actor AD as :Admin
    participant MH_KM as :ManHinhKhuyenMai
    participant DK_KM as :DieuKhienKhuyenMai
    participant KM as :MaGiamGia

    %% Xem danh sách mã
    activate AD
    AD ->> MH_KM: 1: chonQuanLyKhuyenMai()
    deactivate AD
    activate MH_KM
    MH_KM ->> DK_KM: 2: layDanhSachMaGiamGia()
    deactivate MH_KM
    activate DK_KM
    DK_KM ->> KM: 3: truyXuatTatCaMa()
    deactivate DK_KM
    activate KM
    KM -->> DK_KM: 4: traVeDanhSachMa(danhSach)
    deactivate KM
    activate DK_KM
    DK_KM -->> MH_KM: 5: traVeDanhSachMa(danhSach)
    deactivate DK_KM
    activate MH_KM
    MH_KM -->> AD: 6: hienThiDanhSachMaKhuyenMai()
    deactivate MH_KM

    alt Thêm mã giảm giá mới
        activate AD
        AD ->> MH_KM: 7: nhapThongTinMa(maCode, tyLeGiam, soLuong, hanDung)
        deactivate AD
        activate AD
        AD ->> MH_KM: 8: nhanNutThemMa()
        deactivate AD
        activate MH_KM
        MH_KM ->> DK_KM: 9: xuLyThemMa(thongTinMa)
        deactivate MH_KM
        activate DK_KM
        DK_KM ->> KM: 10: taoMaMoi(thongTinMa)
        deactivate DK_KM
        activate KM
        KM -->> DK_KM: 11: xacNhanTaoThanhCong()
        deactivate KM
        activate DK_KM
        DK_KM -->> MH_KM: 12: traVeKetQua(thanhCong)
        deactivate DK_KM
        activate MH_KM
        MH_KM -->> AD: 13: hienThiThongBaoThemThanhCong()
        deactivate MH_KM
    else Bật / Tắt trạng thái mã
        activate AD
        AD ->> MH_KM: 7a: nhanNutBatTatMa(maCode)
        deactivate AD
        activate MH_KM
        MH_KM ->> DK_KM: 8a: yeuCauDoiTrangThai(maCode)
        deactivate MH_KM
        activate DK_KM
        DK_KM ->> KM: 9a: daoTrangThaiHoatDong(maCode)
        deactivate DK_KM
        activate KM
        KM -->> DK_KM: 10a: xacNhanDoiTrangThai()
        deactivate KM
        activate DK_KM
        DK_KM -->> MH_KM: 11a: traVeKetQua(thanhCong)
        deactivate DK_KM
        activate MH_KM
        MH_KM -->> AD: 12a: capNhatCongTacTrangThai()
        deactivate MH_KM
    end
```

---

### 2.16. Sơ đồ Tuần tự Chi tiết: Quản lý tài khoản & phân quyền (UC16)
*(Admin xem danh sách, tạo tài khoản nhân viên kèm phân quyền (include) và khóa/mở khóa tài khoản)*

```mermaid
sequenceDiagram
    autonumber
    actor AD as :Admin
    participant MH as :ManHinhQuanLyTaiKhoan
    participant DK as :DieuKhienQuanLyTaiKhoan
    participant TK as :TaiKhoan

    %% Luồng 1: Xem danh sách tài khoản
    activate AD
    AD ->> MH: 1: chonQuanLyTaiKhoan()
    deactivate AD
    activate MH
    MH ->> DK: 2: xuLyXemDanhSachTaiKhoan()
    deactivate MH
    activate DK
    DK ->> TK: 3: layDanhSachTaiKhoan()
    deactivate DK
    activate TK
    TK -->> DK: 4: traVeDanhSachTaiKhoan()
    deactivate TK
    activate DK
    DK -->> MH: 5: traVeDanhSachTaiKhoan()
    deactivate DK
    activate MH
    MH -->> AD: 6: hienThiDanhSachTaiKhoan()
    deactivate MH

    %% Luồng 2: Tìm kiếm / Xem chi tiết tài khoản
    opt Tìm kiếm / Xem chi tiết & lịch sử hoạt động (extend)
        activate AD
        AD ->> MH: 7: timKiemHoacChonTaiKhoan(tuKhoa / maTK)
        deactivate AD
        activate MH
        MH ->> DK: 8: xuLyTimKiemHoacXemChiTiet(tuKhoa / maTK)
        deactivate MH
        activate DK
        DK ->> TK: 9: layThongTinVaLichSu(maTK)
        deactivate DK
        activate TK
        TK -->> DK: 10: traVeHoSoVaLichSu()
        deactivate TK
        activate DK
        DK -->> MH: 11: traVeHoSoVaLichSu()
        deactivate DK
        activate MH
        MH -->> AD: 12: hienThiChiTietTaiKhoan()
        deactivate MH
    end

    %% Luồng 3: Tạo mới / Khóa tài khoản
    alt Tạo / cập nhật tài khoản nhân viên
        activate AD
        AD ->> MH: 13: nhapThongTinNhanVien(hoTen, sdt, vaiTro)
        deactivate AD
        activate MH
        MH ->> DK: 14: xuLyLuuTaiKhoanNhanVien(thongTin)
        deactivate MH
        activate DK
        DK ->> TK: 15: luuTaiKhoan(thongTin)
        deactivate DK
        activate DK
        DK ->> TK: 16: phanQuyenVaiTro(vaiTro)
        deactivate DK
        activate TK
        TK -->> DK: 17: xacNhanLuuThanhCong()
        deactivate TK
        activate DK
        DK -->> MH: 18: traVeKetQua(thanhCong)
        deactivate DK
        activate MH
        MH -->> AD: 19: hienThiThongBaoThanhCong()
        deactivate MH
    else Khóa / Mở khóa hoặc đặt lại mật khẩu
        activate AD
        AD ->> MH: 20: chonThaoTac(maTK, 'KHOA' / 'MO_KHOA' / 'DAT_LAI_MAT_KHAU')
        deactivate AD
        activate MH
        MH ->> DK: 21: xuLyThaoTacTaiKhoan(maTK, thaoTac)
        deactivate MH
        activate DK
        DK ->> TK: 22: capNhatTrangThaiHoacMatKhau(thaoTac)
        deactivate DK
        activate TK
        TK -->> DK: 23: xacNhanCapNhat()
        deactivate TK
        activate DK
        DK -->> MH: 24: traVeKetQua(thanhCong)
        deactivate DK
        activate MH
        MH -->> AD: 25: hienThiThongBaoThanhCong()
        deactivate MH
    end
```

---

### 2.17. Sơ đồ Tuần tự Chi tiết: Thống kê & báo cáo doanh thu (UC17)
*(Admin xem Dashboard thống kê; luồng mở rộng: lọc theo thời gian và xuất báo cáo)*

```mermaid
sequenceDiagram
    autonumber
    actor AD as :Admin
    participant MH as :ManHinhThongKe
    participant DK as :DieuKhienThongKe
    participant VE as :VeXe
    participant CX as :ChuyenXe

    %% Luồng 1: Xem Dashboard thống kê
    activate AD
    AD ->> MH: 1: chonThongKeBaoCao()
    deactivate AD
    activate MH
    MH ->> DK: 2: xuLyXemThongKe(tuNgay, denNgay)
    deactivate MH
    activate DK
    DK ->> VE: 3: tinhDoanhThuVaSoVe(tuNgay, denNgay)
    deactivate DK
    activate VE
    VE -->> DK: 4: traVeDoanhThu, soVeBan, soVeHuy
    deactivate VE
    activate DK
    DK ->> CX: 5: tinhTyLeLapDay(tuNgay, denNgay)
    deactivate DK
    activate CX
    CX -->> DK: 6: traVeTyLeLapDay()
    deactivate CX
    activate DK
    DK -->> MH: 7: traVeSoLieuThongKe()
    deactivate DK
    activate MH
    MH -->> AD: 8: hienThiBieuDoThongKe()
    deactivate MH

    %% Luồng 2: Lọc khoảng thời gian
    opt Lọc thống kê (extend)
        activate AD
        AD ->> MH: 9: chonKhoangThoiGian(tuNgay, denNgay)
        deactivate AD
        activate MH
        MH ->> DK: 10: xuLyLocThongKe(tuNgay, denNgay)
        deactivate MH
        activate DK
        DK -->> MH: 11: traVeSoLieuDaLoc()
        deactivate DK
        activate MH
        MH -->> AD: 12: capNhatBieuDo()
        deactivate MH
    end

    %% Luồng 3: Xuất báo cáo Excel / PDF
    opt Xuất báo cáo (extend)
        activate AD
        AD ->> MH: 13: chonXuatBaoCao('EXCEL' / 'PDF')
        deactivate AD
        activate MH
        MH ->> DK: 14: xuLyXuatBaoCao(dinhDang)
        deactivate MH
        activate DK
        DK -->> MH: 15: traVeTepBaoCao()
        deactivate DK
        activate MH
        MH -->> AD: 16: taiTepBaoCaoVeMay()
        deactivate MH
    end
```

---

## 3. BẢNG TỔNG KẾT ÁNH XẠ THÔNG ĐIỆP

| Tác nhân / Lớp gửi | Lớp nhận | Thông điệp / Thao tác Tiếng Việt | Vùng hoạt động (Activation) | Ý nghĩa nghiệp vụ |
| :--- | :--- | :--- | :--- | :--- |
| `:KhachHang` | `:ManHinhChonGhe` | `chonViTriGhe(maGhe)` | `:KhachHang` kích hoạt $\rightarrow$ đóng khi gửi | Khách nhấn vào ghế còn trống trên sơ đồ xe |
| `:ManHinhChonGhe` | `:DieuKhienDatVe` | `yeuCauTamGiuGhe(maChuyen, maGhe)` | `:ManHinhChonGhe` kích hoạt xử lý giao diện | Giao diện gửi yêu cầu giữ chỗ xuống tầng điều khiển |
| `:DieuKhienDatVe` | `:QuanLyGhe` | `kiemTraVaKhoaGhe(maChuyen, maGhe)` | `:DieuKhienDatVe` điều phối nghiệp vụ | Tầng nghiệp vụ điều phối kiểm tra và tạm khóa ghế |
| `:QuanLyGhe` | `:Ghe` | `capNhatTrangThai('TAM_KHOA')` | `:QuanLyGhe` & `:Ghe` kích hoạt cập nhật trạng thái | Đổi trạng thái thực thể Ghế để tránh người khác đặt trùng |
| `:DieuKhienDatVe` | `:DonDatVe` | `khoiTaoDon(maKhach, tongTien)` | `:DonDatVe` kích hoạt tạo bản ghi mới | Khởi tạo đơn đặt vé ở trạng thái chờ thanh toán |
| `:CongThanhToan` | `:DieuKhienThanhToan` | `thongBaoGiaoDich(maDon, ketQua)` | `:CongThanhToan` kích hoạt gửi webhook | Cổng thanh toán phản hồi kết quả trừ tiền |
| `:DieuKhienThanhToan`| `:DichVuVe` | `phatHanhVeDienTu(maDon)` | `:DieuKhienThanhToan` điều phối xuất vé | Kích hoạt quy trình xuất vé khi thanh toán thành công |
| `:DichVuVe` | `:VeXe` | `luuThongTinVe(maVe, maQR, ...)` | `:VeXe` kích hoạt lưu trữ bản ghi vé | Lưu thực thể vé điện tử hoàn chỉnh vào hệ thống |
| `:DieuKhienThanhToan`| `:Ghe` | `giaiPhongGhe('TRONG')` | `:Ghe` kích hoạt mở khóa lại | Mở lại ghế trống nếu thanh toán thất bại hoặc hủy đơn |
| `:NhanVienBanVe` | `:ManHinhBanVeQuay` | `traCuuChuyen(diemDi, diemDen, ngayDi)` | `:NhanVienBanVe` kích hoạt thao tác quầy | Nhân viên nhập thông tin hành trình theo yêu cầu khách |
| `:ManHinhBanVeQuay` | `:DieuKhienBanVeQuay` | `xuLyXuatVeTaiQuay(maNV, ...)` | `:ManHinhBanVeQuay` gửi lệnh xử lý | Giao diện quầy chuyển dữ liệu thanh toán xuống tầng nghiệp vụ |
| `:DieuKhienBanVeQuay` | `:HoaDonBanVe` | `taoHoaDon(maNV, tongTien, ...)` | `:HoaDonBanVe` ghi nhận hóa đơn quầy | Lưu thông tin thanh toán tiền mặt/VietQR gắn với mã nhân viên |
| `:DieuKhienBanVeQuay` | `:MayInVe` | `guiLenhInPhieuVe(maVe, maQR, ...)` | `:MayInVe` kích hoạt máy in nhiệt | Tự động in vé giấy vật lý trao cho khách tại quầy |
| `:NguoiDung` | `:ManHinhDangKy` | `nhapThongTinDangKy(hoTen, sdt, ...)` | `:NguoiDung` kích hoạt nhập thông tin | Khách hàng điền thông tin form để đăng ký tài khoản mới |
| `:DieuKhienXacThuc` | `:DichVuSMS` | `yeuCauGuiOTP(sdt)` | `:DichVuSMS` kích hoạt gửi OTP | Yêu cầu bên thứ 3 gửi tin nhắn mã xác thực cho Khách hàng |
| `:NguoiDung` | `:ManHinhDangKy` | `nhapMaOTP(maOTP)` | `:NguoiDung` kích hoạt nhập OTP | Khách hàng nhập mã OTP để xác nhận đăng ký tài khoản |
| `:DieuKhienXacThuc` | `:TaiKhoan` | `luuTaiKhoanMoi(sdt, matKhauBam, ...)` | `:TaiKhoan` kích hoạt tạo tài khoản | Hệ thống lưu trữ thông tin tài khoản thành viên mới sau khi xác thực |
| `:ManHinhDangKy` | `:ManHinhDangNhap` | `chuyenVeTrangDangNhap()` | Chuyển hướng giao diện | Tự động đưa người dùng về lại trang đăng nhập sau khi tạo xong |


