# PHÂN HỆ 05: SƠ ĐỒ TUẦN TỰ (SEQUENCE DIAGRAM)
*(Tương ứng Bài thực hành BTH 5)*

> **File này là nguồn sự thật của sơ đồ tuần tự.** Các khối ```mermaid``` dưới đây sinh ra
> `Sequence_DatVeXeKhach.drawio` (22 tab). Muốn sửa sơ đồ thì **sửa mermaid ở đây**, rồi chạy:
>
> ```bash
> python docs/sequence/gen_sequence_drawio.py
> ```
>
> **Không sửa trực tiếp trong draw.io** — lần sau chạy script là mất. Kiểm tra hai bên còn
> khớp: `python -m pytest docs/sequence/test_gen_sequence.py -q`.
>
> Đây là **ngoại lệ** của quy ước chung "drawio là nguồn, md mô tả lại": riêng sơ đồ tuần tự
> thì md là nguồn, vì trước đây sửa tay hai nơi đã làm 6/20 sơ đồ lệch khỏi tài liệu.
>
> Mọi giá trị trạng thái phải nằm trong danh sách enum ở `docs/rdm/RDM.md` mục 5.

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
│   ├── 2.2. Xử lý Thanh toán & Xuất vé điện tử (UC22)
│   ├── 2.3. Bán vé & in vé tại quầy (UC04)
│   ├── 2.4. Đăng ký tài khoản (UC08)
│   ├── 2.5. Đăng nhập Hệ thống (UC09)
│   ├── 2.6. Tra cứu & Tìm chuyến xe (UC01)
│   ├── 2.7. Hủy vé trực tuyến (UC05)
│   ├── 2.8. Hủy vé tại quầy (UC06)
│   ├── 2.9. Khôi phục mật khẩu (UC10)
│   ├── 2.10. Lịch sử mua vé (UC07)
│   ├── 2.11. Quản lý thông tin cá nhân (UC11)
│   ├── 2.12. Đổi mật khẩu (UC12)
│   ├── 2.13. Quản lý chuyến xe & lịch trình (UC13)
│   ├── 2.14. Quản lý xe & sơ đồ ghế (UC14)
│   ├── 2.15. Quản lý giá vé (UC15a)
│   ├── 2.16. Quản lý khuyến mãi (UC15b)
│   ├── 2.17. Quản lý tài khoản & phân quyền (UC16)
│   ├── 2.18. Thống kê & báo cáo doanh thu (UC17)
│   ├── 2.19. Quản lý đơn đặt vé (UC18)
│   └── 2.20. Quản lý tham số hệ thống (UC19)
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
    activate KH
    deactivate KH
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
    activate KH
    deactivate KH
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
        activate KH
        deactivate KH
    end
```

---

### 2.2. Sơ đồ Tuần tự Chi tiết: Xử lý Thanh toán & Xuất vé điện tử (UC22)
- **Ngữ cảnh:** Cổng thanh toán gửi thông báo webhook kết quả giao dịch, hệ thống đối soát, cập nhật vé chính thức và sinh mã QR. Webhook báo thành công nhưng về **muộn** (đơn đã hết hạn giữ chỗ) thì hệ thống tự lập lệnh hoàn 100% với lý do `THANH_TOAN_QUA_HAN`.
- **Thành phần:**
  - `Boundary / External`: `:CongThanhToan`
  - `Control`: `:DieuKhienThanhToan`, `:DichVuVe`, `:DichVuThongBao`
  - `Entity`: `:DonDatVe`, `:VeXe`, `:Ghe`, `:HoanTien`
  - `Actor`: `:KhachHang`

```mermaid
sequenceDiagram
    autonumber
    participant CTT    as :CongThanhToan
    participant DK_TT  as :DieuKhienThanhToan
    participant DV_Ve  as :DichVuVe
    participant DON    as :DonDatVe
    participant VE     as :VeXe
    participant GHE    as :Ghe
    participant DV_TB  as :DichVuThongBao
    participant HT     as :HoanTien
    actor KH     as :KhachHang

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
        DK_TT -->> CTT: 3a: phanHoiLoiGiaoDich()
        deactivate DK_TT
        activate DK_TT
        DK_TT -->> KH: 4a: thongBaoThanhToanThatBai(choThuLaiTrong5Phut)
        deactivate DK_TT
    end
    opt [Hết 5 phút giữ chỗ mà chưa thanh toán thành công]
        activate DK_TT
        DK_TT ->> DON: 5a: capNhatTrangThai('THAT_BAI')
        deactivate DK_TT
        activate DON
        DON -->> DK_TT: 6a: xacNhanHuyDon()
        deactivate DON
        activate DK_TT
        DK_TT ->> GHE: 7a: giaiPhongGhe('TRONG')
        deactivate DK_TT
        activate GHE
        GHE -->> DK_TT: 8a: xacNhanGheDaMoLai()
        deactivate GHE
    end
    opt [Tiền về muộn: đơn đã THAT_BAI hoặc giao dịch đã bị hủy do đổi phương thức]
        activate CTT
        CTT ->> DK_TT: 9a: thongBaoGiaoDich(maGiaoDich, 'THANH_CONG')
        deactivate CTT
        activate DK_TT
        DK_TT ->> CTT: 10a: yeuCauHoanTien(maGiaoDich, soTien)
        deactivate DK_TT
        Note over DK_TT: hoàn 100%, không phí
        activate CTT
        CTT -->> DK_TT: 11a: xacNhanHoanTien() / tuChoiHoanTien(lyDo)
        deactivate CTT
        activate DK_TT
        DK_TT ->> HT: 12a: ghiNhanHoanTien(maVeDau, soTien, 0, 'DA_HOAN' / 'CHO_XU_LY_THU_CONG', 'THANH_TOAN_QUA_HAN')
        deactivate DK_TT
    end
```

---

### 2.3. Sơ đồ Tuần tự Chi tiết: Bán vé & in vé tại quầy (UC04)
- **Ngữ cảnh:** Nhân viên quầy bán vé cho **khách vãng lai không cần tài khoản**: tra chuyến → chọn ghế và giữ chỗ → nhập họ tên / SĐT khách → thu tiền mặt hoặc VietQR → in vé giấy. Đơn có `KenhBan='TAI_QUAY'`, `DonDatVe.MaTK` để **NULL**, và đúng một bản ghi `BanVeQuay` ghi nhân viên bán kèm thời điểm. Họ tên và SĐT khách lưu ở `VeXe.HoTenHK` / `VeXe.SDTHK`.
- **Thành phần:**
  - `Actor`: `:NhanVienBanVe`, `:KhachHang`
  - `Boundary`: `:ManHinhBanVeQuay`
  - `Control`: `:DieuKhienBanVeQuay`, `:QuanLyGhe`
  - `Entity`: `:Ghe`, `:DonDatVe`, `:VeXe`, `:BanVeQuay`
  - `External / Device`: `:CongThanhToan`, `:MayInVe`

```mermaid
sequenceDiagram
    autonumber
    actor NV as :NhanVienBanVe
    actor KH as :KhachHang
    participant MH as :ManHinhBanVeQuay
    participant DK as :DieuKhienBanVeQuay
    participant QLG as :QuanLyGhe
    participant GH as :Ghe
    participant DON as :DonDatVe
    participant VE as :VeXe
    participant BQ as :BanVeQuay
    participant CTT as :CongThanhToan
    participant MI as :MayInVe

    %% Luồng 1: Tra chuyến và chọn ghế
    activate NV
    NV ->> MH: 1: traCuuChuyen(diemDi, diemDen, ngayDi)
    deactivate NV
    activate MH
    MH ->> DK: 2: timChuyenXe(thongTinTimKiem)
    deactivate MH
    activate DK
    DK -->> MH: 3: traVeDanhSachChuyen()
    deactivate DK
    activate MH
    MH -->> NV: 4: hienThiKetQuaTimKiem()
    deactivate MH
    activate NV
    NV ->> MH: 5: chonChuyenXe(maChuyen)
    deactivate NV
    activate MH
    MH ->> DK: 6: laySoDoGhe(maChuyen)
    deactivate MH
    activate DK
    DK ->> GH: 7: layTrangThai(maChuyen)
    deactivate DK
    activate GH
    GH -->> DK: 8: traVeTrangThaiTungGhe()
    deactivate GH
    activate DK
    DK -->> MH: 9: traVeSoDoGhe()
    deactivate DK
    activate MH
    MH -->> NV: 10: hienThiSoDoGhe()
    deactivate MH

    %% Luồng 2: Giữ chỗ (include UC21 Giữ chỗ tạm thời)
    activate NV
    NV ->> MH: 11: chonViTriGhe(maGhe)
    deactivate NV
    activate MH
    MH ->> DK: 12: yeuCauKhoaGhe(maChuyen, maGhe)
    deactivate MH
    activate DK
    DK ->> QLG: 13: kiemTraVaKhoaGhe(maGhe)
    deactivate DK
    alt [Ghế đã bán hoặc người khác đang giữ]
        activate QLG
        QLG -->> DK: 14a: baoGheKhongKhaDung()
        deactivate QLG
        activate DK
        DK -->> MH: 15a: traVeLoi(gheKhongKhaDung)
        deactivate DK
        activate MH
        MH -->> NV: 16a: hienThiCanhBaoChonLai()
        deactivate MH
    else [Ghế còn trống]
        activate QLG
        QLG ->> GH: 14: capNhatTrangThai('TAM_KHOA')
        deactivate QLG
        activate GH
        GH -->> QLG: 15: xacNhanDaKhoaGhe()
        deactivate GH
        activate QLG
        QLG -->> DK: 16: baoKhoaThanhCong()
        deactivate QLG
        activate MH
        MH -->> NV: 17: doiMauGheTrenSoDo()
        deactivate MH

        %% Luồng 3: Lập phiếu bán vé
        activate NV
        NV ->> MH: 18: nhapThongTinKhach(hoTen, sdt, diemDon, diemTra)
        deactivate NV
        activate MH
        MH ->> DK: 19: xuLyXuatVeTaiQuay(maNV, thongTinVe, tongTien)
        deactivate MH
        activate DK
        DK ->> DON: 20: taoDon(KenhBan='TAI_QUAY', MaTK=NULL, tongTien)
        deactivate DK
        activate DON
        DON -->> DK: 21: traVeMaDon()
        deactivate DON
        activate DK
        DK ->> VE: 22: khoiTaoVe(maDon, maChuyen, maGhe, hoTenHK, sdtHK)
        deactivate DK
        activate VE
        VE -->> DK: 23: xacNhanDaTaoVe()
        deactivate VE
        activate DK
        DK ->> BQ: 24: ghiNhanNguoiBan(maDon, maNV, thoiGian)
        deactivate DK
        activate BQ
        BQ -->> DK: 25: xacNhanDaGhi()
        deactivate BQ
        activate DK
        DK -->> MH: 26: traVePhieuChoThanhToan(tongTien)
        deactivate DK

        %% Luồng 4: Thu tiền (include UC22 Thanh toán)
        activate NV
        NV ->> MH: 27: chonHinhThucThanhToan(loaiThanhToan)
        deactivate NV
        alt [Tiền mặt]
            activate NV
            NV ->> MH: 28: nhapTienKhachDua(tienKhachDua)
            deactivate NV
            activate MH
            MH ->> DK: 29: thanhToanTienMat(maDon, tongTien)
            deactivate MH
            activate DK
            DK ->> DON: 30: capNhatTrangThai('DA_THANH_TOAN')
            deactivate DK
            activate MH
            MH -->> NV: 31: tinhVaHienThiTienThua(tienThua)
            deactivate MH
        else [VietQR]
            activate MH
            MH ->> DK: 28b: thanhToanQuaCong(maDon, 'VIETQR')
            deactivate MH
            activate DK
            DK ->> CTT: 29b: yeuCauThanhToan(maDon, tongTien)
            deactivate DK
            activate CTT
            CTT -->> DK: 30b: traVeNoiDungQR(maGiaoDich, noiDungQR)
            deactivate CTT
            activate MH
            MH -->> KH: 31b: hienThiQRTaiManHinhPhu()
            deactivate MH
            activate KH
            KH ->> MH: 32b: quetMaChuyenKhoanXong()
            deactivate KH
            activate CTT
            CTT -->> DK: 33b: thongBaoGiaoDich(maDon, 'THANH_CONG')
            deactivate CTT
            activate DK
            DK ->> DON: 34b: capNhatTrangThai('DA_THANH_TOAN')
            deactivate DK
        end

        %% Luồng 5: Phát hành và in vé
        activate DK
        DK ->> GH: 35: capNhatTrangThai('DA_BAN')
        deactivate DK
        activate DK
        DK ->> VE: 36: luuThongTinVe(maVe, maQR, 'CHUA_DI')
        deactivate DK
        activate VE
        VE -->> DK: 37: xacNhanDaPhatHanhVe()
        deactivate VE
        activate DK
        DK ->> MI: 38: guiLenhInPhieuVe(maVe, maQR, maChuyen, viTriGhe, giaVe)
        deactivate DK
        activate MI
        MI -->> DK: 39: xacNhanDaIn()
        deactivate MI
        activate MH
        MH -->> NV: 40: hienThiThongBaoHoanTat()
        deactivate MH
        activate NV
        NV ->> KH: 41: traoVeGiayVaTienThoi()
        deactivate NV
    end
```

---

### 2.4. Sơ đồ Tuần tự Chi tiết: Đăng ký tài khoản (UC08)
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
    ND ->> MH_DK: 1: nhapThongTinDangKy(hoTen, sdt, matKhau)
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
            DK_DK ->> TK: 13: taoTaiKhoanMoi(hoTen, sdt, hashMatKhau)
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
            activate ND
            deactivate ND
        end
    end
```

---

### 2.5. Sơ đồ Tuần tự Chi tiết: Đăng nhập Hệ thống (UC09)
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
    ND ->> MH_DN: 1: nhapThongTin(sdt, matKhau)
    ND ->> MH_DN: 2: nhanNutDangNhap()
    deactivate ND
    activate MH_DN
    MH_DN ->> DK_DN: 3: xuLyDangNhap(sdt, matKhau)
    deactivate MH_DN

    activate DK_DN
    DK_DN ->> TK: 4: timTaiKhoan(sdt)
    deactivate DK_DN
    activate TK
    TK -->> DK_DN: 5: traVeThongTin(taiKhoan, hashMatKhau, trangThai, vaiTro)
    deactivate TK

    alt [Khong tim thay hoac Sai mat khau]
        activate DK_DN
        DK_DN -->> MH_DN: 6a: thongBaoLoi("Số điện thoại hoặc mật khẩu không đúng")
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
        DK_DN -->> MH_DN: 7: traVeKetQua(thanhCong, vaiTro, token)
        deactivate DK_DN
        activate MH_DN
        MH_DN -->> ND: 8: hienThiTrangChinhTheoVaiTro(vaiTro)
        deactivate MH_DN
        activate ND
        deactivate ND
    end
```

---

### 2.6. Sơ đồ Tuần tự Chi tiết: Tra cứu & Tìm chuyến xe (UC01)
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
        activate KH
        deactivate KH
    end
```

---

### 2.7. Sơ đồ Tuần tự Chi tiết: Hủy vé trực tuyến (UC05)
*(Áp dụng mô hình 3 lớp BCE để mô tả quá trình khách hàng hủy vé qua website/app và được hoàn tiền điện tử. Lệnh hoàn được ghi vào `:HoanTien`: cổng chấp nhận → `DA_HOAN`, cổng từ chối → `CHO_XU_LY_THU_CONG` và vé **vẫn hủy**, Admin xử lý tiếp ở UC18.)*

```mermaid
sequenceDiagram
    autonumber
    actor KH     as :KhachHang
    participant MH     as :ManHinhQuanLyVe
    participant DK     as :DieuKhienHuyVe
    participant VE     as :VeXe
    participant GH     as :Ghe
    participant CTT    as :CongThanhToan
    participant HT     as :HoanTien

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
    VE -->> DK: 4: traVeKetQua(hopLe, phiHuy, soTienHoan)
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
        alt [Cổng xác nhận hoàn tiền thành công]
            activate CTT
            CTT -->> DK: 10: xacNhanHoanTienThanhCong()
            deactivate CTT
            activate DK
            DK ->> HT: 10a: ghiNhanHoanTien(maVe, soTienHoan, phiHuy, 'DA_HOAN')
            deactivate DK
        else [Cổng từ chối - vé vẫn hủy, chờ Admin xử lý (UC18)]
            activate CTT
            CTT -->> DK: 10b: tuChoiHoanTien(lyDo)
            deactivate CTT
            activate DK
            DK ->> HT: 10c: ghiNhanHoanTien(maVe, soTienHoan, phiHuy, 'CHO_XU_LY_THU_CONG')
            deactivate DK
        end
        activate DK
        DK -->> MH: 11: traVeKetQuaHuy(thanhCong)
        deactivate DK
        activate MH
        MH -->> KH: 12: hienThiThongBaoHuyThanhCong()
        deactivate MH
    end
```

---

### 2.8. Sơ đồ Tuần tự Chi tiết: Hủy vé tại quầy (UC06)
*(Áp dụng mô hình 3 lớp BCE để mô tả nhân viên tra cứu vé, hủy vé, trả tiền và in biên nhận hủy cho khách. Vé trả bằng tiền mặt thì hoàn tiền mặt ngay tại quầy (`DA_HOAN`); vé trả qua cổng thì gọi `:CongThanhToan`, bị từ chối thì ghi `CHO_XU_LY_THU_CONG`.)*

```mermaid
sequenceDiagram
    autonumber
    actor NV     as :NhanVienBanVe
    participant MH     as :ManHinhBanVeQuay
    participant DK     as :DieuKhienHuyVeQuay
    participant VE     as :VeXe
    participant GH     as :Ghe
    participant MI     as :MayInVe
    participant CTT    as :CongThanhToan
    participant HT     as :HoanTien

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
    alt [Vé thanh toán tiền mặt]
        activate DK
        DK ->> HT: 10b: ghiNhanHoanTien(maVe, soTienHoan, phiHuy, 'TIEN_MAT')
        deactivate DK
    else [Vé thanh toán qua cổng]
        activate DK
        DK ->> CTT: 10c: yeuCauHoanTien(maVe, soTienHoan)
        deactivate DK
        alt [Cổng xác nhận]
            activate CTT
            CTT -->> DK: 10d: xacNhanHoanTienThanhCong()
            deactivate CTT
            activate DK
            DK ->> HT: 10e: ghiNhanHoanTien(maVe, soTienHoan, phiHuy, 'CONG_THANH_TOAN', 'DA_HOAN')
            deactivate DK
        else [Cổng từ chối - vé vẫn hủy, chờ Admin xử lý (UC18)]
            activate CTT
            CTT -->> DK: 10f: tuChoiHoanTien(lyDo)
            deactivate CTT
            activate DK
            DK ->> HT: 10g: ghiNhanHoanTien(maVe, soTienHoan, phiHuy, 'CONG_THANH_TOAN', 'CHO_XU_LY_THU_CONG')
            deactivate DK
        end
    end
    activate DK
    DK ->> MI: 11: guiLenhInBienNhanHuy(maVe, phiHuy, soTienHoan, hinhThuc)
    deactivate DK
    Note over DK: nội dung trả về trường receipt
    activate MI
    MI -->> DK: 12: xacNhanDaIn()
    deactivate MI
    activate DK
    DK -->> MH: 13: traVeKetQuaHuyThanhCong()
    deactivate DK
    activate MH
    MH -->> NV: 14: thongBaoKetQuaHoanTien(hinhThuc)
    deactivate MH
```

---

### 2.9. Sơ đồ Tuần tự Chi tiết: Khôi phục mật khẩu (UC10)
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
    activate KH
    deactivate KH
```

---

### 2.10. Sơ đồ Tuần tự Chi tiết: Lịch sử mua vé (UC07)
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
        activate KH
        deactivate KH
    end
```

---

### 2.11. Sơ đồ Tuần tự Chi tiết: Quản lý thông tin cá nhân (UC11)
*(Khách hàng / Nhân viên bán vé / Admin xem hồ sơ của chính mình; hai luồng mở rộng: cập nhật thông tin, và **đổi số điện thoại** — gửi OTP tới số mới kèm nhập lại mật khẩu, thành công thì tăng `PhienBanToken` để thu hồi mọi phiên cũ và cấp token mới.)*

```mermaid
sequenceDiagram
    autonumber
    actor ND     as :NguoiDung
    participant MH     as :ManHinhHoSo
    participant DK     as :DieuKhienHoSo
    participant TK     as :TaiKhoan
    participant SMS    as :DichVuSMS

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
    opt Đổi số điện thoại (extend)
        activate ND
        ND ->> MH: 14: nhapSoMoi(sdtMoi)
        deactivate ND
        activate MH
        MH ->> DK: 15: yeuCauOTPDoiSDT(maTK, sdtMoi)
        deactivate MH
        activate DK
        DK ->> TK: 16: kiemTraTonTai(sdtMoi)
        deactivate DK
        activate TK
        TK -->> DK: 17: traVeKetQua(daTonTai)
        deactivate TK
        alt [sdtMoi trùng số hiện tại hoặc đã có tài khoản khác]
            activate DK
            DK -->> MH: 18a: traVeLoi(sdtKhongHopLe)
            deactivate DK
            activate MH
            MH -->> ND: 19a: hienThiThongBaoLoi()
            deactivate MH
        else [hợp lệ]
            activate DK
            DK ->> SMS: 18: guiOTP(sdtMoi, 'DOI_SO_DIEN_THOAI')
            deactivate DK
            activate SMS
            SMS -->> ND: 19: guiSMSChuaMaOTP()
            deactivate SMS
            activate ND
            ND ->> MH: 20: nhapOTPVaMatKhau(maOTP, matKhau)
            deactivate ND
            activate MH
            MH ->> DK: 21: xuLyDoiSDT(maTK, sdtMoi, maOTP, matKhau)
            deactivate MH
            activate DK
            DK ->> TK: 22: kiemTraMatKhau(matKhau)
            deactivate DK
            activate DK
            DK ->> DK: 23: xacThucOTP(maOTP)
            deactivate DK
            alt [mật khẩu và OTP đúng]
                activate DK
                DK ->> TK: 24: capNhatSDT(sdtMoi)
                deactivate DK
                Note over DK: tăng PhienBanToken, thu hồi phiên cũ
                activate TK
                TK -->> DK: 25: xacNhanLuuThanhCong()
                deactivate TK
                activate DK
                DK -->> MH: 26: traVeKetQua(thanhCong, tokenMoi)
                deactivate DK
                activate MH
                MH -->> ND: 27: hienThiThongBaoDoiSDTThanhCong()
                deactivate MH
            else [sai mật khẩu hoặc OTP]
                activate DK
                DK -->> MH: 26a: traVeLoi()
                deactivate DK
                activate MH
                MH -->> ND: 27a: hienThiLoiNhapLai()
                deactivate MH
            end
        end
    end
```

---

### 2.12. Sơ đồ Tuần tự Chi tiết: Đổi mật khẩu (UC12)

```mermaid
sequenceDiagram
    autonumber
    actor ND as :NguoiDung
    participant MH as :ManHinhDoiMatKhau
    participant DK as :DieuKhienDoiMatKhau
    participant TK as :TaiKhoan

    activate ND
    ND ->> MH: 1: nhapMatKhau(matKhauCu, matKhauMoi)
    ND ->> MH: 2: bamDoiMatKhau()
    deactivate ND
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
        MH -->> ND: 7: hienThiThongBaoLoi()
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
        MH -->> ND: 11: hienThiThongBaoDoiThanhCong()
        deactivate MH
        activate ND
        deactivate ND
    end
```

---

### 2.13. Sơ đồ Tuần tự Chi tiết: Quản lý chuyến xe & lịch trình (UC13)
*(Admin xem danh sách, thêm chuyến mới và hủy chuyến kèm hoàn tiền (include). Hủy chuyến thì hoàn **100%** mọi vé đã thanh toán (`PhiHuy=0`, lý do `NHA_XE_HUY_CHUYEN`), nhả ghế về `TRONG` và báo SMS cho khách. Các thao tác sửa/tìm kiếm tương tự luồng xem/thêm nên không vẽ lặp.)*

```mermaid
sequenceDiagram
    autonumber
    actor AD     as :Admin
    participant MH     as :ManHinhQuanLyChuyen
    participant DK     as :DieuKhienQuanLyChuyen
    participant CX     as :ChuyenXe
    participant VE     as :VeXe
    participant CTT    as :CongThanhToan
    participant HT     as :HoanTien
    participant GH     as :Ghe
    participant SMS    as :DichVuSMS

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
    else Sửa chuyến (đổi giờ / đổi xe)
        activate AD
        AD ->> MH: 29: nhapThongTinSua(gioMoi / xeMoi)
        deactivate AD
        activate MH
        MH ->> DK: 30: xuLySuaChuyen(maChuyen, thongTinSua)
        deactivate MH
        activate DK
        DK ->> CX: 31: kiemTraTrungLich(maXe, ngay, gio)
        deactivate DK
        activate CX
        CX -->> DK: 32: traVeKetQua(hopLe)
        deactivate CX
        opt [đổi xe]
            activate DK
            DK ->> GH: 33: kiemTraXeMoiDuSoGhe(maXeMoi, danhSachSoGheDangBan)
            deactivate DK
            activate GH
            GH -->> DK: 34: traVeKetQua(thieuSoGhe)
            deactivate GH
        end
        alt [hợp lệ]
            activate DK
            DK ->> CX: 35: capNhat(thongTinSua)
            deactivate DK
            Note over DK: đổi xe: dựng lại GheChuyen, vé giữ nguyên số ghế
            activate CX
            CX -->> DK: 36: xacNhanCapNhat()
            deactivate CX
            activate DK
            DK ->> VE: 37: layDanhSachVeDaThanhToan(maChuyen)
            deactivate DK
            activate VE
            VE -->> DK: 38: traVeDanhSachVe()
            deactivate VE
            loop Từng hành khách (khi đổi giờ hoặc đổi xe)
                activate DK
                DK ->> SMS: 39: guiSMSThayDoi(sdtHK, thongTinMoi)
                deactivate DK
            end
            activate DK
            DK -->> MH: 40: traVeKetQua(thanhCong, soHanhKhachDuocBao)
            deactivate DK
            activate MH
            MH -->> AD: 41: hienThiThongBaoSuaThanhCong()
            deactivate MH
        else [trùng lịch / xe thiếu số ghế]
            activate DK
            DK -->> MH: 35a: traVeLoi(lyDo)
            deactivate DK
            activate MH
            MH -->> AD: 36a: hienThiLoi()
            deactivate MH
        end
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
            DK ->> HT: 25a: ghiNhanHoanTien(maVe, soTien, 0, 'DA_HOAN', 'NHA_XE_HUY_CHUYEN')
            deactivate DK
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

### 2.14. Sơ đồ Tuần tự Chi tiết: Quản lý xe & sơ đồ ghế (UC14)
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
        activate AD
        deactivate AD
    end
```

---

### 2.15. Sơ đồ Tuần tự Chi tiết: Quản lý giá vé (UC15a)
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
        activate AD
        deactivate AD
    end
```

---

### 2.16. Sơ đồ Tuần tự Chi tiết: Quản lý khuyến mãi (UC15b)
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
        activate AD
        deactivate AD
    end
```

---

### 2.17. Sơ đồ Tuần tự Chi tiết: Quản lý tài khoản & phân quyền (UC16)
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
        activate AD
        deactivate AD
    end
```

---

### 2.18. Sơ đồ Tuần tự Chi tiết: Thống kê & báo cáo doanh thu (UC17)
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
        activate AD
        deactivate AD
    end
```

---

### 2.19. Sơ đồ Tuần tự Chi tiết: Quản lý đơn đặt vé (UC18)
- **Ngữ cảnh:** Admin tra cứu danh sách đơn đặt vé, tìm kiếm / lọc theo điều kiện, xem chi tiết vé và lịch sử hoàn tiền của đơn, rồi **xử lý lại một lệnh hoàn đang `CHO_XU_LY_THU_CONG`** (tab 17 của `UseCase_DatVeXeKhach.drawio`). Use case này **không hủy đơn, không hủy vé** — việc hủy đã xảy ra trước đó ở UC05 / UC06 / UC13; ở đây chỉ gọi lại cổng cho lệnh hoàn bị từ chối.
- **Thành phần:**
  - `Actor`: `:Admin`, `:CongThanhToan`
  - `Boundary`: `:ManHinhQuanLyDon`
  - `Control`: `:DieuKhienQuanLyDon`
  - `Entity`: `:DonDatVe`, `:VeXe`, `:HoanTien`

```mermaid
sequenceDiagram
    autonumber
    actor AD     as :Admin
    participant MH     as :ManHinhQuanLyDon
    participant DK     as :DieuKhienQuanLyDon
    participant DON    as :DonDatVe
    participant VE     as :VeXe
    participant HT     as :HoanTien
    participant CTT    as :CongThanhToan

    activate AD
    AD ->> MH: 1: chonQuanLyDonDatVe()
    deactivate AD
    activate MH
    MH ->> DK: 2: xuLyXemDanhSachDon()
    deactivate MH
    activate DK
    DK ->> DON: 3: layDanhSachDon()
    deactivate DK
    activate DON
    DON -->> DK: 4: traVeDanhSachDon()
    deactivate DON
    activate DK
    DK -->> MH: 5: traVeDanhSachDon()
    deactivate DK
    activate MH
    MH -->> AD: 6: hienThiDanhSachDon()
    deactivate MH
    opt Tìm kiếm / Lọc đơn (extend)
        activate AD
        AD ->> MH: 7: nhapBoLoc(trangThai, tuNgay, denNgay, kenh, soDienThoai, maDon)
        deactivate AD
        activate MH
        MH ->> DK: 8: xuLyLocDon(boLoc)
        deactivate MH
        activate DK
        DK ->> DON: 9: timDon(boLoc)
        deactivate DK
        activate DON
        DON -->> DK: 10: traVeKetQuaLoc()
        deactivate DON
        activate DK
        DK -->> MH: 11: traVeKetQuaLoc()
        deactivate DK
        activate MH
        MH -->> AD: 12: hienThiKetQuaLoc()
        deactivate MH
    end
    opt Xem chi tiết đơn (extend)
        activate AD
        AD ->> MH: 13: chonXemChiTietDon(maDon)
        deactivate AD
        activate MH
        MH ->> DK: 14: xuLyXemChiTietDon(maDon)
        deactivate MH
        activate DK
        DK ->> DON: 15: layChiTietDon(maDon)
        deactivate DK
        activate DON
        DON -->> DK: 16: traVeChiTietDon()
        deactivate DON
        activate DK
        DK ->> VE: 17: layDanhSachVeCuaDon(maDon)
        deactivate DK
        activate VE
        VE -->> DK: 18: traVeDanhSachVe()
        deactivate VE
        activate DK
        DK ->> HT: 19: layLichSuHoanTienCuaDon(maDon)
        deactivate DK
        activate HT
        HT -->> DK: 20: traVeLichSuHoanTien()
        deactivate HT
        activate DK
        DK -->> MH: 21: traVeChiTietDayDu()
        deactivate DK
        activate MH
        MH -->> AD: 22: hienThiChiTietDon()
        deactivate MH
    end
    activate AD
    AD ->> MH: 23: chonXuLyHoanTienThuCong(maHT)
    deactivate AD
    activate MH
    MH ->> DK: 24: xuLyHoanTienThuCong(maHT)
    deactivate MH
    activate DK
    DK ->> HT: 25: layLenhHoanChoXuLy(maHT)
    deactivate DK
    activate HT
    HT -->> DK: 26: traVeLenhHoan()
    deactivate HT
    activate DK
    DK ->> CTT: 27: yeuCauHoanTien(maVe, soTienHoan)
    deactivate DK
    alt [Cổng xác nhận hoàn thành công]
        activate CTT
        CTT -->> DK: 28: xacNhanHoanTienThanhCong()
        deactivate CTT
        activate DK
        DK ->> HT: 29: capNhatTrangThai('DA_HOAN')
        deactivate DK
        activate HT
        HT -->> DK: 30: xacNhanCapNhat()
        deactivate HT
        activate DK
        DK -->> MH: 31: traVeKetQua(thanhCong)
        deactivate DK
        activate MH
        MH -->> AD: 32: hienThiThongBaoHoanThanhCong()
        deactivate MH
    else [Cổng từ chối]
        activate CTT
        CTT -->> DK: 28a: tuChoiHoanTien(lyDo)
        deactivate CTT
        activate DK
        DK ->> HT: 29a: ghiLyDoLoi(lyDo)
        deactivate DK
        activate HT
        HT -->> DK: 30a: xacNhanDaGhi()
        deactivate HT
        activate DK
        DK -->> MH: 31a: traVeLoi(lyDo)
        deactivate DK
        activate MH
        MH -->> AD: 32a: hienThiLoiHoanTien()
        deactivate MH
    end
```

---

### 2.20. Sơ đồ Tuần tự Chi tiết: Quản lý tham số hệ thống (UC19)
- **Ngữ cảnh:** Admin xem và chỉnh **8 tham số vận hành**: `THOI_GIAN_GIU_CHO_PHUT`, `HAN_HUY_VE_GIO`, `PHI_HUY_PHAN_TRAM`, `OTP_HIEU_LUC_GIAY`, `OTP_SO_LAN_THU_TOI_DA`, `OTP_GUI_LAI_GIAY`, `DANG_NHAP_SAI_TOI_DA`, `DANG_NHAP_KHOA_PHUT`. Mỗi tham số có khoảng hợp lệ riêng; lưu xong thì ghi `NhatKyHoatDong` và **áp dụng ngay** cho các yêu cầu sau, không cần khởi động lại hệ thống.
- **Thành phần:**
  - `Actor`: `:Admin`
  - `Boundary`: `:ManHinhThamSo`
  - `Control`: `:DieuKhienThamSo`
  - `Entity`: `:ThamSo`, `:NhatKyHoatDong`

```mermaid
sequenceDiagram
    autonumber
    actor AD as :Admin
    participant MH as :ManHinhThamSo
    participant DK as :DieuKhienThamSo
    participant TS as :ThamSo
    participant NK as :NhatKyHoatDong

    %% Luồng 1: Xem danh sách tham số
    activate AD
    AD ->> MH: 1: chonQuanLyThamSo()
    deactivate AD
    activate MH
    MH ->> DK: 2: xuLyXemThamSo()
    deactivate MH
    activate DK
    DK ->> TS: 3: layTatCaThamSo()
    deactivate DK
    activate TS
    TS -->> DK: 4: traVeDanhSachThamSo()
    deactivate TS
    activate DK
    DK -->> MH: 5: traVeDanhSachThamSo()
    deactivate DK
    activate MH
    MH -->> AD: 6: hienThiBangThamSo(ten, giaTri, moTa, khoangHopLe)
    deactivate MH

    %% Luồng 2: Cập nhật một tham số
    opt Cập nhật tham số (extend)
        activate AD
        AD ->> MH: 7: nhapGiaTriMoi(tenThamSo, giaTriMoi)
        AD ->> MH: 8: bamLuuThayDoi()
        deactivate AD
        activate MH
        MH ->> DK: 9: xuLyCapNhatThamSo(tenThamSo, giaTriMoi)
        deactivate MH
        activate DK
        DK ->> DK: 10: kiemTraKhoangHopLe(tenThamSo, giaTriMoi)
        deactivate DK
        alt [Không có tham số này hoặc giá trị ngoài khoảng hợp lệ]
            activate DK
            DK -->> MH: 11a: traVeLoi(tenThamSo, khoangHopLe)
            deactivate DK
            activate MH
            MH -->> AD: 12a: hienThiThongBaoLoi()
            deactivate MH
        else [Giá trị hợp lệ]
            activate DK
            DK ->> TS: 11: layGiaTriCu(tenThamSo)
            deactivate DK
            activate TS
            TS -->> DK: 12: traVeGiaTriCu()
            deactivate TS
            activate DK
            DK ->> TS: 13: luuGiaTriMoi(tenThamSo, giaTriMoi)
            deactivate DK
            activate TS
            TS -->> DK: 14: xacNhanDaLuu()
            deactivate TS
            activate DK
            DK ->> NK: 15: ghiNhatKy(maTK, 'DOI_THAM_SO', 'THAM_SO', 'ten: cu -> moi')
            deactivate DK
            Note over DK: giá trị mới áp dụng ngay cho yêu cầu sau, không khởi động lại
            activate NK
            NK -->> DK: 16: xacNhanDaGhiNhatKy()
            deactivate NK
            activate DK
            DK -->> MH: 17: traVeKetQua(thanhCong, thamSoMoi)
            deactivate DK
            activate MH
            MH -->> AD: 18: hienThiThongBaoLuuThanhCong()
            deactivate MH
        end
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
| `:Admin` | `:ManHinhQuanLyDon` | `chonQuanLyDonDatVe()` | `:Admin` kích hoạt thao tác | Quản trị viên truy cập màn hình quản lý đơn đặt vé |
| `:DieuKhienQuanLyDon` | `:CongThanhToan` | `yeuCauHoanTien(maVe, soTienHoan)` | Gọi API Cổng thanh toán | Gọi lại cổng cho lệnh hoàn đã bị từ chối trước đó |
| `:DieuKhienQuanLyDon` | `:HoanTien` | `capNhatTrangThai('DA_HOAN')` | Cập nhật thực thể lệnh hoàn | Cổng xác nhận → lệnh hoàn chuyển `CHO_XU_LY_THU_CONG` sang `DA_HOAN` |
| `:DieuKhienQuanLyDon` | `:HoanTien` | `ghiLyDoLoi(lyDo)` | Cập nhật thực thể lệnh hoàn | Cổng từ chối lần nữa → ghi `LyDoLoi`, lệnh hoàn vẫn chờ xử lý thủ công |

> **Lưu ý về trạng thái:** mọi giá trị trạng thái trong tài liệu này phải nằm trong danh sách
> enum ở `docs/rdm/RDM.md` mục 5. `DonDatVe.TrangThai` chỉ có `CHO_THANH_TOAN`,
> `DA_THANH_TOAN`, `THAT_BAI`, `DA_HUY`; `VeXe.TrangThai` chỉ có `CHO_THANH_TOAN`,
> `CHUA_DI`, `DA_HOAN_THANH`, `DA_HUY`. Việc hoàn tiền được ghi ở `HoanTien.TrangThai`
> (`DA_HOAN` / `CHO_XU_LY_THU_CONG`), **không** có trạng thái "đã hoàn tiền" trên đơn hay vé.


