---
tai_lieu: Đặc tả Use Case
du_an: Hệ thống đặt vé xe khách trực tuyến (đồ án OOAD)
khuon_mau: Chương 4 — Tóm tắt, Tiền điều kiện, Dòng sự kiện chính, Dòng sự kiện phụ, Hậu điều kiện
phien_ban: 3.0 — đồng bộ với bộ 17 sơ đồ Use Case và BFD v3.0
cap_nhat: 2026-10-07
lien_quan: [USECASE.md, ../BFD/bfd.md, ../RDM (Markdown)/rdm.md]
---

# Đặc tả Use Case

> **Cách đọc:** mỗi use case có cùng một khung. Bước trong luồng chính đánh số `1, 2, 3…`;
> luồng phụ đánh `Ax` (thay thế — alternative) hoặc `Ex` (ngoại lệ — exception) và ghi rõ
> **rẽ ra từ bước nào**.
>
> **Khi sửa:** đổi một quy định (ví dụ giữ chỗ 5 phút → 10 phút) thì chỉ sửa ở bảng
> **Quy định nghiệp vụ** dưới đây; các use case chỉ trích mã `QDxx`, không ghi lại con số.

---

## Quy định nghiệp vụ dùng chung

Các giá trị có dấu ⚙️ lưu trong bảng `THAM_SO` (đổi không cần sửa code).
Giá trị có dấu *(giả định)* là đặt tạm — nhóm thống nhất lại.

| Mã | Quy định | Giá trị | Mã tham số |
|----|----------|---------|------------|
| QD01 | Thời gian giữ ghế sau khi chọn | 5 phút ⚙️ | `THOI_GIAN_GIU_CHO_PHUT` |
| QD02 | Mã OTP có hiệu lực | 5 phút ⚙️ | `OTP_HIEU_LUC_PHUT` |
| QD03 | Chỉ được hủy vé trước giờ khởi hành ít nhất | 24 giờ ⚙️ | `GIO_TOI_THIEU_TRUOC_KHI_HUY` |
| QD04 | Tỷ lệ hoàn tiền khi khách tự hủy | 90% ⚙️ | `PHAN_TRAM_HOAN_TIEN` |
| QD05 | Số ghế tối đa trong 1 lần đặt | 5 ghế ⚙️ *(giả định)* | `SO_GHE_TOI_DA_MOI_VE` |
| QD06 | Nhà xe hủy chuyến | Hoàn 100%, không áp QD03, QD04 | — |
| QD07 | Mật khẩu | Tối thiểu 8 ký tự, có chữ và số | — |
| QD08 | Tài khoản `BI_KHOA` | Không đăng nhập được | — |
| QD09 | Khung giờ khi lọc chuyến | Sáng 05:00–11:59, Chiều 12:00–17:59, Đêm 18:00–04:59 | — |
| QD10 | Ghế được coi là "đã có người" | Thuộc vé `DA_THANH_TOAN`, hoặc vé `GIU_CHO` chưa quá hạn giữ chỗ | — |
| QD11 | **Không thu phí hủy vé tách riêng**, chỉ áp dụng tỷ lệ hoàn tiền QD04 trên số tiền thực trả (`thanhTien`) | — | — |
| QD12 | **Hoàn tiền về đúng nguồn đã thanh toán**: trả online → hoàn qua cổng; trả tiền mặt → hoàn tiền mặt tại quầy | — | — |
| QD13 | **Vé thanh toán bằng tiền mặt chỉ hủy được tại quầy**, không hủy online được | — | — |
| QD14 | Mã giảm giá **không sửa, không xóa** — chỉ thêm, xem, bật/tắt | — | — |
| QD15 | OTP gửi qua **SMS tới số điện thoại**, không qua email | — | — |

---

## Mục lục

| Mã | Use Case | Sơ đồ | Tác nhân |
|----|----------|-------|----------|
| [UC01](#uc01--đăng-nhập) | Đăng nhập | 1 | Cả 3 |
| [UC02](#uc02--đăng-xuất) | Đăng xuất | 1 | Cả 3 |
| [UC03](#uc03--đăng-ký-tài-khoản) | Đăng ký tài khoản | 2 | Khách hàng |
| [UC04](#uc04--xác-thực-số-điện-thoại-bằng-otp) | Xác thực số điện thoại bằng OTP | 2, 3 | *(dùng chung)* |
| [UC05](#uc05--khôi-phục-mật-khẩu) | Khôi phục mật khẩu | 3 | Khách hàng |
| [UC06](#uc06--đổi-mật-khẩu) | Đổi mật khẩu | 4 | Cả 3 |
| [UC07](#uc07--xem-thông-tin-cá-nhân) | Xem thông tin cá nhân | 5 | Cả 3 |
| [UC08](#uc08--xem-lịch-sử-mua-vé) | Xem lịch sử mua vé | 6 | Khách hàng |
| [UC09](#uc09--tra-cứu-chuyến-xe) | Tra cứu chuyến xe | 7 | Khách hàng, Nhân viên |
| [UC10](#uc10--đặt-vé-trực-tuyến) | Đặt vé trực tuyến | 8 | Khách hàng |
| [UC11](#uc11--giữ-chỗ-tạm-thời) | Giữ chỗ tạm thời | 8, 9 | *(dùng chung)* |
| [UC12](#uc12--thanh-toán) | Thanh toán | 8, 9 | *(dùng chung)* |
| [UC13](#uc13--áp-dụng-mã-giảm-giá) | Áp dụng mã giảm giá | 8, 9 | Khách hàng, Nhân viên |
| [UC14](#uc14--bán-vé--in-vé-tại-quầy) | Bán vé & in vé tại quầy | 9 | Nhân viên |
| [UC15](#uc15--hủy-vé-trực-tuyến) | Hủy vé trực tuyến | 10 | Khách hàng |
| [UC16](#uc16--tra-cứu-vé) | Tra cứu vé | 11 | Nhân viên |
| [UC17](#uc17--hủy-vé-tại-quầy) | Hủy vé tại quầy | 11 | Nhân viên |
| [UC18](#uc18--hoàn-tiền) | Hoàn tiền | 10, 11, 12 | *(dùng chung)* |
| [UC19](#uc19--quản-lý-chuyến-xe--lịch-trình) | Quản lý chuyến xe & lịch trình | 12 | Admin |
| [UC20](#uc20--quản-lý-xe--sơ-đồ-ghế) | Quản lý xe & sơ đồ ghế | 13 | Admin |
| [UC21](#uc21--quản-lý-giá-vé--khuyến-mãi) | Quản lý giá vé & khuyến mãi | 14 | Admin |
| [UC22](#uc22--quản-lý-tài-khoản--phân-quyền) | Quản lý tài khoản & phân quyền | 15 | Admin |
| [UC23](#uc23--thống-kê--báo-cáo-doanh-thu) | Thống kê & báo cáo doanh thu | 16 | Admin |

---

## UC01 — Đăng nhập

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 1. Đăng nhập & Đăng xuất |
| Tác nhân | Khách hàng, Nhân viên bán vé, Admin |
| Quan hệ | Không có «include» / «extend» trên sơ đồ. Là **tiền điều kiện** của nhiều use case khác |
| Bảng CSDL | `NGUOI_DUNG`, `VAI_TRO`, `NHAT_KY_HOAT_DONG` |

**Tóm tắt:** Người dùng nhập tài khoản và mật khẩu để vào hệ thống. Hệ thống xác định vai trò và mở giao diện tương ứng.

**Tiền điều kiện:**
1. Người dùng đã có tài khoản ở trạng thái `HOAT_DONG`.
2. Người dùng chưa đăng nhập.

**Dòng sự kiện chính:**
1. Người dùng chọn "Đăng nhập".
2. Hệ thống hiển thị form gồm email (hoặc số điện thoại) và mật khẩu.
3. Người dùng nhập thông tin và bấm "Đăng nhập".
4. Hệ thống kiểm tra tài khoản tồn tại, đang `HOAT_DONG` (QD08) và mật khẩu đúng.
5. Hệ thống tạo phiên đăng nhập (token JWT), cập nhật `lanDangNhapCuoi`, ghi nhật ký `DANG_NHAP`.
6. Hệ thống chuyển tới trang chủ theo vai trò: Khách hàng → trang tìm chuyến; Nhân viên → màn hình bán vé; Admin → trang quản trị.

**Dòng sự kiện phụ:**
- **E1 (bước 4) — Sai tài khoản hoặc mật khẩu:** báo "Thông tin đăng nhập không đúng" (không nói rõ sai cái nào), quay lại bước 3.
- **E2 (bước 4) — Tài khoản bị khóa:** báo "Tài khoản đã bị khóa, liên hệ quản trị viên". Use case kết thúc.
- **E3 (bước 4) — Tài khoản chưa xác thực OTP (`CHO_XAC_THUC`):** báo cần xác thực, chuyển sang UC04.
- **A1 (bước 3) — Quên mật khẩu:** người dùng bấm "Quên mật khẩu" → chuyển sang UC05.

**Hậu điều kiện:**
1. Thành công: người dùng ở trạng thái đã đăng nhập, có token hợp lệ.
2. Thất bại: hệ thống giữ nguyên, không tạo phiên.

---

## UC02 — Đăng xuất

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 1. Đăng nhập & Đăng xuất |
| Tác nhân | Khách hàng, Nhân viên bán vé, Admin |
| Quan hệ | Không có «include» / «extend» trên sơ đồ |
| Bảng CSDL | `NGUOI_DUNG`, `NHAT_KY_HOAT_DONG` |

**Tóm tắt:** Người dùng kết thúc phiên làm việc.

**Tiền điều kiện:** Người dùng đang đăng nhập.

**Dòng sự kiện chính:**
1. Người dùng bấm "Đăng xuất".
2. Hệ thống hủy token hiện tại, ghi nhật ký `DANG_XUAT`.
3. Hệ thống chuyển về trang chủ ở trạng thái chưa đăng nhập.

**Dòng sự kiện phụ:**
- **A1 (bước 1) — Nhân viên đang có phiên bán vé dở (ghế đang giữ):** hệ thống hỏi xác nhận; nếu đồng ý thì hủy phiên giao dịch và nhả ghế (như UC14 luồng A2) rồi tiếp tục bước 2.

**Hậu điều kiện:** Token không còn dùng được; các chức năng cần đăng nhập bị chặn.

---

## UC03 — Đăng ký tài khoản

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 2. Đăng ký tài khoản |
| Tác nhân | Khách hàng |
| Quan hệ | «include» UC04 (Xác thực số điện thoại bằng OTP) |
| Bảng CSDL | `NGUOI_DUNG`, `VAI_TRO`, `MA_XAC_THUC` |
| Hệ thống ngoài | DỊCH VỤ SMS |

**Tóm tắt:** Khách hàng tạo tài khoản bằng số điện thoại và mật khẩu, xác thực qua mã OTP gửi bằng SMS (QD15).

**Tiền điều kiện:** Khách hàng chưa đăng nhập và chưa có tài khoản với số điện thoại đó.

**Dòng sự kiện chính:**
1. Khách hàng chọn "Đăng ký".
2. Hệ thống hiển thị form: họ tên, số điện thoại, email (tùy chọn), mật khẩu, nhập lại mật khẩu.
3. Khách hàng nhập thông tin và bấm "Đăng ký".
4. Hệ thống kiểm tra: số điện thoại đúng định dạng và chưa được dùng; mật khẩu theo QD07; hai lần nhập mật khẩu khớp.
5. Hệ thống tạo `NGUOI_DUNG` với vai trò `KHACH_HANG`, trạng thái `CHO_XAC_THUC`, mật khẩu đã băm.
6. Hệ thống gọi **UC04** để xác thực số điện thoại.
7. Hệ thống đổi trạng thái tài khoản sang `HOAT_DONG` và báo "Đăng ký thành công".

**Dòng sự kiện phụ:**
- **E1 (bước 4) — Số điện thoại đã tồn tại:** báo "Số điện thoại đã được đăng ký", gợi ý Đăng nhập hoặc Khôi phục mật khẩu. Quay lại bước 3.
- **E2 (bước 4) — Dữ liệu không hợp lệ:** báo lỗi ngay dưới ô sai, quay lại bước 3.
- **E3 (bước 6) — Xác thực OTP thất bại:** tài khoản vẫn ở `CHO_XAC_THUC`; khách có thể xác thực lại khi đăng nhập (UC01 E3).

**Hậu điều kiện:**
1. Thành công: có tài khoản mới `HOAT_DONG`, đăng nhập được.
2. Chưa xác thực: tài khoản ở `CHO_XAC_THUC`, chưa đăng nhập được.

---

## UC04 — Xác thực số điện thoại bằng OTP

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 2. Đăng ký tài khoản · 3. Khôi phục mật khẩu |
| Tác nhân | Không nối trực tiếp actor người. Actor phụ: **DỊCH VỤ SMS** |
| Quan hệ | Được «include» bởi UC03 và UC05 |
| Bảng CSDL | `MA_XAC_THUC`, `NGUOI_DUNG`, `THAM_SO` |

**Tóm tắt:** Hệ thống sinh mã OTP, gửi tới số điện thoại qua dịch vụ SMS và kiểm tra mã người dùng nhập vào. Dùng chung cho đăng ký và khôi phục mật khẩu.

**Tiền điều kiện:** Có một số điện thoại cần xác thực, do use case gọi nó truyền sang.

**Dòng sự kiện chính:**
1. Hệ thống sinh mã OTP 6 số, lưu vào `MA_XAC_THUC` kèm mục đích (`DANG_KY` hoặc `QUEN_MAT_KHAU`) và hạn dùng theo QD02.
2. Hệ thống gửi mã tới DỊCH VỤ SMS.
3. DỊCH VỤ SMS gửi tin nhắn tới số điện thoại của người dùng.
4. Hệ thống hiển thị ô nhập OTP kèm đồng hồ đếm ngược.
5. Người dùng nhập mã.
6. Hệ thống kiểm tra mã đúng, chưa hết hạn, chưa dùng.
7. Hệ thống đánh dấu mã đã dùng và trả kết quả thành công cho use case gọi nó.

**Dòng sự kiện phụ:**
- **E1 (bước 6) — OTP sai:** báo lỗi, quay lại bước 5. Sai quá 5 lần thì khóa việc nhập trong 15 phút.
- **E2 (bước 6) — OTP hết hạn:** báo hết hạn, hiện nút "Gửi lại mã".
- **A1 (bước 4) — Gửi lại mã:** người dùng bấm "Gửi lại mã" → hệ thống vô hiệu mã cũ, quay lại bước 1.
- **E3 (bước 3) — Dịch vụ SMS lỗi:** báo "Không gửi được mã, thử lại sau". Trả kết quả thất bại cho use case gọi nó.

**Hậu điều kiện:**
1. Thành công: số điện thoại được xác thực, mã đánh dấu đã dùng.
2. Thất bại: số điện thoại chưa xác thực.

---

## UC05 — Khôi phục mật khẩu

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 3. Khôi phục mật khẩu |
| Tác nhân | Khách hàng |
| Quan hệ | «include» UC04 (Xác thực số điện thoại bằng OTP) |
| Bảng CSDL | `NGUOI_DUNG`, `MA_XAC_THUC`, `NHAT_KY_HOAT_DONG` |
| Hệ thống ngoài | DỊCH VỤ SMS |

**Tóm tắt:** Người dùng quên mật khẩu, xác minh bằng OTP gửi qua SMS rồi đặt mật khẩu mới.

**Tiền điều kiện:** Người dùng chưa đăng nhập.

**Dòng sự kiện chính:**
1. Người dùng bấm "Quên mật khẩu" ở màn hình đăng nhập.
2. Người dùng nhập số điện thoại đã đăng ký.
3. Hệ thống tìm thấy tài khoản và gọi **UC04** để xác thực.
4. Hệ thống hiển thị form mật khẩu mới + nhập lại.
5. Người dùng nhập mật khẩu mới.
6. Hệ thống kiểm tra QD07, lưu mật khẩu mới (đã băm), ghi nhật ký `DOI_MAT_KHAU`.
7. Hệ thống báo thành công và chuyển về màn hình đăng nhập.

**Dòng sự kiện phụ:**
- **A1 (bước 3) — Số điện thoại không tồn tại:** hệ thống **vẫn** báo "Nếu số điện thoại tồn tại, mã đã được gửi" để không lộ số nào có tài khoản. Không gửi OTP.
- **E1 (bước 3) — OTP sai hoặc hết hạn:** như UC04 E1, E2.
- **E2 (bước 6) — Mật khẩu mới không hợp lệ:** báo lỗi, quay lại bước 5.
- **E3 (bước 3) — Tài khoản bị khóa:** không cho đặt lại mật khẩu, báo liên hệ Admin.

**Hậu điều kiện:** Mật khẩu cũ hết hiệu lực; người dùng đăng nhập bằng mật khẩu mới.

---

## UC06 — Đổi mật khẩu

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 4. Đổi mật khẩu |
| Tác nhân | Khách hàng, Nhân viên bán vé, Admin |
| Quan hệ | Không có «include» / «extend» trên sơ đồ |
| Bảng CSDL | `NGUOI_DUNG`, `NHAT_KY_HOAT_DONG` |

**Tóm tắt:** Người dùng đang đăng nhập tự đổi mật khẩu của mình.

**Tiền điều kiện:** Người dùng đã đăng nhập (ghi trong đặc tả, không vẽ «include» tới UC01).

**Dòng sự kiện chính:**
1. Người dùng chọn "Đổi mật khẩu".
2. Hệ thống hiển thị form: mật khẩu hiện tại, mật khẩu mới, nhập lại mật khẩu mới.
3. Người dùng nhập và bấm "Lưu".
4. Hệ thống kiểm tra mật khẩu hiện tại đúng, mật khẩu mới theo QD07, hai lần nhập khớp, mật khẩu mới khác mật khẩu cũ.
5. Hệ thống lưu mật khẩu mới (đã băm), ghi nhật ký `DOI_MAT_KHAU`.
6. Hệ thống báo thành công và yêu cầu đăng nhập lại.

**Dòng sự kiện phụ:**
- **E1 (bước 4) — Mật khẩu hiện tại sai:** báo lỗi, giữ form, quay lại bước 3.
- **E2 (bước 4) — Mật khẩu mới không hợp lệ hoặc trùng mật khẩu cũ:** báo lỗi tại ô sai, quay lại bước 3.

**Hậu điều kiện:** Mật khẩu được đổi; các phiên đăng nhập cũ bị thu hồi.

---

## UC07 — Xem thông tin cá nhân

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 5. Quản lý thông tin cá nhân |
| Tác nhân | Khách hàng, Nhân viên bán vé, Admin |
| Quan hệ | "Cập nhật thông tin cá nhân" «extend» use case này |
| Bảng CSDL | `NGUOI_DUNG`, `NHAT_KY_HOAT_DONG` |

**Tóm tắt:** Người dùng xem hồ sơ của mình; nếu muốn thì sửa họ tên, số điện thoại, email.

**Tiền điều kiện:** Người dùng đã đăng nhập.

**Dòng sự kiện chính:**
1. Người dùng chọn "Thông tin cá nhân".
2. Hệ thống hiển thị: họ tên, số điện thoại, email, vai trò, ngày tạo. Vai trò và ngày tạo chỉ đọc.

**Dòng sự kiện phụ:**
- **A1 (bước 2) — Cập nhật thông tin cá nhân** *(use case mở rộng)*:
  1. Người dùng bấm "Cập nhật", sửa họ tên / số điện thoại / email, bấm "Lưu".
  2. Hệ thống kiểm tra họ tên không rỗng, số điện thoại đúng định dạng và chưa thuộc tài khoản khác, email đúng định dạng.
  3. Hệ thống lưu, ghi nhật ký, hiển thị lại thông tin mới.
- **E1 (A1 bước 2) — Dữ liệu không hợp lệ hoặc số điện thoại trùng:** báo lỗi tại ô sai, giữ form.
- **A2 (A1) — Đổi số điện thoại:** hệ thống gọi **UC04** để xác thực số mới trước khi lưu.

**Hậu điều kiện:** Thông tin cá nhân được cập nhật, hoặc giữ nguyên nếu người dùng chỉ xem.

---

## UC08 — Xem lịch sử mua vé

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 6. Xem lịch sử mua vé |
| Tác nhân | Khách hàng |
| Quan hệ | "Lọc lịch sử theo trạng thái vé" «extend» use case này |
| Bảng CSDL | `VE`, `CHI_TIET_VE`, `CHUYEN_XE`, `TUYEN_XE` |

**Tóm tắt:** Khách hàng xem lại các vé mình đã mua, kèm trạng thái từng vé.

**Tiền điều kiện:** Khách hàng đã đăng nhập.

**Dòng sự kiện chính:**
1. Khách hàng chọn "Lịch sử mua vé".
2. Hệ thống lấy các vé có `maNguoiDat` là khách hàng này, sắp theo thời gian đặt giảm dần.
3. Hệ thống hiển thị: mã vé, tuyến, giờ khởi hành, số ghế, tổng tiền, trạng thái (`GIU_CHO`, `DA_THANH_TOAN`, `DA_HUY`, `HET_HAN`).
4. Khách hàng bấm vào một vé để xem chi tiết: từng ghế, điểm đón/trả, mã giảm giá đã dùng, lịch sử thanh toán.

**Dòng sự kiện phụ:**
- **A1 (bước 3) — Lọc lịch sử theo trạng thái vé** *(use case mở rộng)*: khách chọn một trạng thái → hệ thống lọc lại danh sách ở bước 3.
- **A2 (bước 4) — Hủy vé:** từ màn hình chi tiết, nếu vé đủ điều kiện hủy thì khách bấm "Hủy vé" → chuyển sang **UC15**.
- **A3 (bước 2) — Chưa mua vé nào:** hiển thị "Bạn chưa có vé nào" kèm nút tìm chuyến.

**Hậu điều kiện:** Dữ liệu hệ thống không thay đổi (trừ khi khách đi tiếp sang UC15).

---

## UC09 — Tra cứu chuyến xe

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 7. Tra cứu & tìm chuyến xe |
| Tác nhân | Khách hàng (**không cần đăng nhập**), Nhân viên bán vé |
| Quan hệ | "Lọc kết quả tra cứu" «extend» use case này |
| Bảng CSDL | `CHUYEN_XE`, `TUYEN_XE`, `DIEM_DUNG`, `GHE`, `CHI_TIET_VE` |

**Tóm tắt:** Người dùng chọn điểm đi, điểm đến, ngày khởi hành và xem danh sách chuyến xe phù hợp kèm giá vé và số ghế còn trống.

**Tiền điều kiện:** Không có.

**Dòng sự kiện chính:**
1. Người dùng chọn điểm đi và điểm đến.
2. Người dùng chọn ngày khởi hành.
3. Người dùng bấm "Tìm chuyến".
4. Hệ thống tìm các chuyến `MO_BAN` thuộc tuyến tương ứng, khởi hành trong ngày đã chọn và chưa tới giờ chạy.
5. Với mỗi chuyến, hệ thống tính số ghế trống theo QD10.
6. Hệ thống hiển thị danh sách: giờ đi, giờ đến dự kiến, loại xe, giá vé, số ghế trống; sắp theo giờ đi.
7. Người dùng chọn một chuyến → chuyển sang **UC10** (khách hàng) hoặc **UC14** (nhân viên).

**Dòng sự kiện phụ:**
- **A1 (bước 6) — Lọc kết quả tra cứu** *(use case mở rộng)*: người dùng lọc theo khung giờ (QD09), khoảng giá hoặc loại xe → hệ thống lọc lại danh sách ở bước 6.
- **E1 (bước 3) — Thiếu thông tin, điểm đi trùng điểm đến, hoặc ngày trong quá khứ:** báo lỗi, quay lại bước 1.
- **E2 (bước 4) — Không có chuyến nào:** hiển thị "Không có chuyến phù hợp", gợi ý chọn ngày khác.
- **A2 (bước 6) — Chuyến hết ghế:** vẫn hiển thị nhưng ghi "Hết chỗ" và không cho chọn.

**Hậu điều kiện:** Danh sách chuyến được hiển thị. Dữ liệu hệ thống không thay đổi.

---

## UC10 — Đặt vé trực tuyến

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 8. Đặt vé trực tuyến |
| Tác nhân | Khách hàng |
| Quan hệ | «include» UC11 (Giữ chỗ tạm thời), «include» UC12 (Thanh toán); UC13 (Áp dụng mã giảm giá) «extend» use case này |
| Bảng CSDL | `VE`, `CHI_TIET_VE`, `CHUYEN_XE`, `GHE`, `DIEM_DUNG`, `MA_GIAM_GIA` |

**Tóm tắt:** Khách hàng chọn ghế trên sơ đồ, nhập thông tin hành khách, tùy chọn nhập mã giảm giá, rồi thanh toán để nhận vé điện tử.

**Tiền điều kiện:**
1. Khách hàng đã chọn một chuyến `MO_BAN` ở UC09.
2. Khách hàng **bắt buộc phải đăng nhập** để đặt vé trực tuyến.

**Dòng sự kiện chính:**
1. Hệ thống hiển thị sơ đồ ghế của xe chạy chuyến đó; ghế trống và ghế đã có người (QD10) hiển thị khác màu.
2. Khách hàng chọn một hoặc nhiều ghế trống, tối đa QD05.
3. Khách hàng bấm "Tiếp tục".
4. Hệ thống gọi **UC11** để giữ các ghế đã chọn.
5. Hệ thống hiển thị form thông tin hành khách: họ tên, số điện thoại, email (tùy chọn) và chọn điểm đón, điểm trả trong danh sách của tuyến.
6. Khách hàng nhập thông tin và bấm "Tiếp tục".
7. Hệ thống hiển thị tóm tắt: chuyến, ghế, điểm đón/trả, `giaGoc`, `tienGiam`, `thanhTien`.
8. Khách hàng bấm "Thanh toán".
9. Hệ thống gọi **UC12** với phương thức online (Ví MoMo/ZaloPay hoặc VietQR/Thẻ).
10. Hệ thống đổi vé sang `DA_THANH_TOAN`, sinh mã QR của vé, tăng lượt dùng mã giảm giá nếu có.
11. Hệ thống hiển thị vé điện tử và gửi mã vé qua SMS.

**Dòng sự kiện phụ:**
- **A1 (bước 7) — Áp dụng mã giảm giá** *(use case mở rộng)*: khách nhập mã → chuyển sang **UC13** → hệ thống tính lại `tienGiam`, `thanhTien` và hiển thị lại bước 7.
- **E1 (bước 2) — Chọn quá QD05 ghế:** báo lỗi, không cho chọn thêm.
- **E2 (bước 4) — Ghế vừa bị người khác giữ:** báo "Ghế X vừa có người chọn", tải lại sơ đồ ghế, quay lại bước 2.
- **E3 (bước 6) — Thông tin hành khách sai định dạng:** báo lỗi tại ô sai, quay lại bước 5.
- **E4 (bất kỳ bước nào trước bước 10) — Hết thời gian giữ chỗ (QD01):** vé chuyển `HET_HAN`, ghế được nhả, báo khách chọn lại từ bước 1.
- **E5 (bước 9) — Thanh toán thất bại hoặc khách hủy trên cổng:** nếu vé còn hạn giữ chỗ thì cho chọn lại phương thức (quay lại bước 8); hết hạn thì như E4.
- **A2 (bước 11) — Gửi SMS lỗi:** vé vẫn hợp lệ; hệ thống ghi nhận và cho gửi lại; khách vẫn xem được vé trong UC08.

**Hậu điều kiện:**
1. Thành công: vé `DA_THANH_TOAN`, có mã QR, ghế thuộc về khách; có một giao dịch `THANH_CONG`.
2. Thất bại: vé `GIU_CHO` (còn hạn) hoặc `HET_HAN`; không trừ tiền khách.

---

## UC11 — Giữ chỗ tạm thời

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 8. Đặt vé trực tuyến · 9. Bán vé & in vé tại quầy |
| Tác nhân | Không nối trực tiếp actor người |
| Quan hệ | Được «include» bởi UC10 và UC14 |
| Bảng CSDL | `VE`, `CHI_TIET_VE`, `GHE`, `THAM_SO` |

**Tóm tắt:** Hệ thống khóa tạm các ghế khách đang chọn trong khoảng QD01 để người khác không đặt trùng, trong lúc khách hoàn tất thanh toán.

**Tiền điều kiện:** Có danh sách ghế đang trống do use case gọi nó truyền sang.

**Dòng sự kiện chính:**
1. Hệ thống kiểm tra lại từng ghế vẫn còn trống theo QD10.
2. Hệ thống tạo `VE` ở trạng thái `GIU_CHO`, đặt `hanGiuCho` = thời điểm hiện tại + QD01.
3. Hệ thống tạo `CHI_TIET_VE` cho từng ghế, lưu giá hiện tại của chuyến vào từng dòng.
4. Hệ thống trả mã vé tạm cho use case gọi nó và bắt đầu đếm ngược hiển thị cho người dùng.

**Dòng sự kiện phụ:**
- **E1 (bước 1) — Có ghế vừa bị người khác giữ:** không giữ ghế nào, trả lỗi kèm danh sách ghế đã mất cho use case gọi nó.
- **A1 — Quá hạn giữ chỗ mà chưa thanh toán:** hệ thống đổi vé sang `HET_HAN`; các ghế trở lại trạng thái trống.
- **A2 — Người dùng chủ động quay lại hoặc đổi ghế:** hệ thống đổi vé đang giữ sang `HET_HAN` và nhả ghế ngay.

**Hậu điều kiện:**
1. Thành công: các ghế được giữ cho người dùng trong QD01; người khác thấy là "đã có người".
2. Thất bại: không ghế nào bị giữ.

---

## UC12 — Thanh toán

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 8. Đặt vé trực tuyến · 9. Bán vé & in vé tại quầy |
| Tác nhân | Không nối trực tiếp actor người. Actor phụ: **CỔNG THANH TOÁN** |
| Quan hệ | Được «include» bởi UC10 và UC14. Các use case «extend» nó: *Ví MoMo/ZaloPay*, *VietQR/Thẻ* (online); *Tiền mặt*, *VietQR* (tại quầy) |
| Bảng CSDL | `THANH_TOAN`, `VE` |

**Tóm tắt:** Hệ thống thu tiền cho một vé đang giữ chỗ. Kênh online đi qua CỔNG THANH TOÁN; kênh tại quầy có thêm lựa chọn tiền mặt do nhân viên thu trực tiếp.

**Tiền điều kiện:** Có vé ở trạng thái `GIU_CHO` còn hạn, đã biết `thanhTien`.

**Dòng sự kiện chính:**
1. Hệ thống hiển thị các phương thức thanh toán phù hợp với kênh bán.
2. Người dùng (khách hàng hoặc nhân viên) chọn một phương thức.
3. Hệ thống tạo bản ghi `THANH_TOAN` trạng thái `DANG_CHO`, số tiền = `thanhTien`.
4. **Nếu là phương thức online:** hệ thống gửi yêu cầu sang CỔNG THANH TOÁN, hiển thị mã QR hoặc chuyển tới trang của cổng; người trả tiền hoàn tất trên ứng dụng ngân hàng hoặc ví; cổng báo kết quả về hệ thống.
5. **Nếu là tiền mặt tại quầy:** nhân viên thu tiền và bấm "Đã nhận tiền mặt"; không gọi CỔNG THANH TOÁN.
6. Hệ thống cập nhật `THANH_TOAN` = `THANH_CONG`, ghi lại phương thức đã dùng.
7. Hệ thống trả kết quả thành công cho use case gọi nó.

**Dòng sự kiện phụ:**
- **E1 (bước 4) — Cổng báo thất bại hoặc người dùng hủy:** `THANH_TOAN` = `THAT_BAI`; nếu vé còn hạn giữ chỗ thì cho chọn lại phương thức (quay lại bước 1).
- **E2 (bước 4) — Cổng không phản hồi:** giữ `DANG_CHO`, hệ thống hỏi lại trạng thái giao dịch; quá thời gian chờ thì chuyển `THAT_BAI`.
- **E3 (bước 5) — Khách không đủ tiền mặt:** nhân viên hủy phiên thanh toán; vé giữ nguyên `GIU_CHO` tới khi hết hạn.
- **E4 (bất kỳ bước nào) — Vé hết hạn giữ chỗ:** dừng thanh toán, báo lỗi cho use case gọi nó. Nếu tiền đã bị trừ thì hệ thống tự tạo giao dịch hoàn 100%.

**Hậu điều kiện:**
1. Thành công: có một giao dịch `THANH_CONG`, phương thức được ghi lại (dùng để xác định cách hoàn tiền theo QD12).
2. Thất bại: không có giao dịch thành công; khách không bị trừ tiền.

---

## UC13 — Áp dụng mã giảm giá

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 8. Đặt vé trực tuyến · 9. Bán vé & in vé tại quầy |
| Tác nhân | Khách hàng, Nhân viên bán vé |
| Quan hệ | «extend» UC10 và UC14 — tùy chọn, có thể không dùng |
| Bảng CSDL | `MA_GIAM_GIA`, `VE` |

**Tóm tắt:** Người mua nhập mã giảm giá; hệ thống kiểm tra và tính lại số tiền phải trả. Áp dụng được ở **cả hai kênh** bán vé.

**Tiền điều kiện:** Đang trong luồng đặt vé hoặc bán vé, đã biết `giaGoc`.

**Dòng sự kiện chính:**
1. Người mua nhập mã giảm giá và bấm "Áp dụng".
2. Hệ thống kiểm tra mã: tồn tại, đang bật, trong khoảng ngày hiệu lực, còn lượt dùng, `giaGoc` đạt mức đơn tối thiểu.
3. Hệ thống tính `tienGiam` theo loại giảm (phần trăm hoặc số tiền), không vượt mức giảm tối đa.
4. Hệ thống cập nhật `thanhTien` = `giaGoc` − `tienGiam` và hiển thị lại tóm tắt đơn.

**Dòng sự kiện phụ:**
- **E1 (bước 2) — Mã không tồn tại, đã tắt, hết hạn, hết lượt hoặc chưa đạt đơn tối thiểu:** báo rõ lý do, giữ nguyên giá, quay lại bước 1.
- **A1 (bước 4) — Gỡ mã:** người mua bấm "Bỏ mã" → `tienGiam` = 0, `thanhTien` = `giaGoc`.

**Hậu điều kiện:** Vé lưu đủ ba giá trị `giaGoc`, `tienGiam`, `thanhTien`. Lượt dùng của mã chỉ tăng khi thanh toán thành công, không tăng ở bước này.

---

## UC14 — Bán vé & in vé tại quầy

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 9. Bán vé & in vé tại quầy |
| Tác nhân | Nhân viên bán vé |
| Quan hệ | «include» UC11 (Giữ chỗ tạm thời), «include» UC12 (Thanh toán); UC13 «extend» use case này |
| Bảng CSDL | `VE`, `CHI_TIET_VE`, `CHUYEN_XE`, `GHE`, `THANH_TOAN`, `NHAT_KY_HOAT_DONG` |

**Tóm tắt:** Nhân viên bán vé cho khách tại quầy: tìm chuyến, chọn ghế, nhập thông tin khách, thu tiền mặt hoặc VietQR, rồi in vé.

**Tiền điều kiện:** Nhân viên đã đăng nhập.

**Dòng sự kiện chính:**
1. Nhân viên tra cứu chuyến theo yêu cầu của khách (như UC09).
2. Hệ thống hiển thị sơ đồ ghế; nhân viên chọn ghế cho khách.
3. Hệ thống gọi **UC11** để giữ ghế.
4. Nhân viên nhập họ tên, số điện thoại của khách, chọn điểm đón và điểm trả.
5. Hệ thống hiển thị tóm tắt đơn và `thanhTien`.
6. Nhân viên bấm "Thanh toán"; hệ thống hỏi chọn **tiền mặt** hay **VietQR**.
7. Hệ thống gọi **UC12** với phương thức đã chọn.
8. Hệ thống đổi vé sang `DA_THANH_TOAN`, kênh bán `TAI_QUAY`, ghi lại nhân viên bán, sinh mã QR lên vé.
9. Nhân viên bấm "In vé"; hệ thống tạo phiếu vé (mã vé, chuyến, ghế, điểm đón/trả, số tiền, QR) và gửi tới máy in.
10. Hệ thống ghi nhật ký `BAN_VE`.

**Dòng sự kiện phụ:**
- **A1 (bước 5) — Áp dụng mã giảm giá** *(use case mở rộng)*: như **UC13**.
- **A2 (bước 6) — Khách đổi ý, hủy phiên giao dịch:** nhân viên bấm "Hủy giao dịch" → vé chuyển `HET_HAN`, ghế được nhả, giao dịch `DANG_CHO` chuyển `THAT_BAI`.
- **E1 (bước 3) — Ghế vừa bị người khác giữ:** như UC11 E1; tải lại sơ đồ ghế, quay lại bước 2.
- **E2 (bước 7) — Quá hạn giữ chỗ trước khi thu được tiền:** như UC12 E4.
- **E3 (bước 9) — Máy in lỗi:** vé vẫn hợp lệ; nhân viên in lại từ màn hình tra cứu vé (**UC16**).

**Hậu điều kiện:**
1. Thành công: vé `DA_THANH_TOAN` kênh `TAI_QUAY`, ghi nhận nhân viên bán; phiếu vé đã in.
2. Hủy phiên: không ghế nào bị giữ, không phát sinh tiền.

---

## UC15 — Hủy vé trực tuyến

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 10. Hủy vé trực tuyến |
| Tác nhân | Khách hàng |
| Quan hệ | «include» UC18 (Hoàn tiền) |
| Bảng CSDL | `VE`, `CHI_TIET_VE`, `THANH_TOAN`, `THAM_SO` |

**Tóm tắt:** Khách hàng tự hủy vé đã mua online và nhận lại tiền qua cổng thanh toán.

**Tiền điều kiện:**
1. Khách hàng **đã đăng nhập** — cần biết vé nào là của ai mới hủy được.
2. Vé ở trạng thái `DA_THANH_TOAN` và thuộc về khách hàng này.

**Dòng sự kiện chính:**
1. Khách hàng mở một vé từ lịch sử mua vé (UC08) và bấm "Hủy vé".
2. Hệ thống kiểm tra điều kiện hủy: vé `DA_THANH_TOAN`, còn cách giờ khởi hành ít nhất QD03, và vé **không** thanh toán bằng tiền mặt (QD13).
3. Hệ thống tính số tiền hoàn: `thanhTien` × QD04 (phí hủy tính trên số tiền thực trả — QD11).
4. Hệ thống hiển thị số tiền hoàn và hỏi xác nhận.
5. Khách hàng xác nhận.
6. Hệ thống đổi vé sang `DA_HUY`, lưu thời điểm và lý do hủy; các ghế trở lại trống.
7. Hệ thống gọi **UC18** để hoàn tiền qua CỔNG THANH TOÁN.
8. Hệ thống báo "Hủy vé thành công, tiền sẽ được hoàn trong X ngày".

**Dòng sự kiện phụ:**
- **E1 (bước 2) — Quá sát giờ khởi hành, vé đã hủy, hoặc chuyến đã chạy:** hiển thị lý do, ẩn nút hủy. Use case kết thúc.
- **E2 (bước 2) — Vé thanh toán bằng tiền mặt (QD13):** báo "Vé thanh toán tiền mặt chỉ hủy được tại quầy", hướng dẫn khách ra quầy (**UC17**). Use case kết thúc.
- **A1 (bước 5) — Khách không xác nhận:** quay lại bước 1, vé không đổi.
- **E3 (bước 7) — Cổng hoàn tiền lỗi:** vé vẫn `DA_HUY`; giao dịch hoàn ở `DANG_CHO` để thử lại; báo khách tiền sẽ được xử lý sau.

**Hậu điều kiện:**
1. Thành công: vé `DA_HUY`, ghế trống trở lại, có giao dịch hoàn tiền.
2. Không đủ điều kiện: vé giữ nguyên.

---

## UC16 — Tra cứu vé

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 11. Hủy vé tại quầy |
| Tác nhân | Nhân viên bán vé |
| Quan hệ | Được «include» bởi UC17 |
| Bảng CSDL | `VE`, `CHI_TIET_VE`, `CHUYEN_XE` |

**Tóm tắt:** Nhân viên tìm vé của khách theo mã vé hoặc số điện thoại để xem chi tiết trước khi xử lý.

**Tiền điều kiện:** Nhân viên đã đăng nhập.

**Dòng sự kiện chính:**
1. Nhân viên nhập mã vé hoặc số điện thoại của khách.
2. Hệ thống tìm các vé khớp.
3. Hệ thống hiển thị: mã vé, chuyến, giờ khởi hành, ghế, điểm đón/trả, `giaGoc`, `tienGiam`, `thanhTien`, phương thức đã thanh toán, trạng thái vé.
4. Nhân viên chọn một vé để thao tác tiếp.

**Dòng sự kiện phụ:**
- **E1 (bước 2) — Không tìm thấy:** báo "Không tìm thấy vé", quay lại bước 1.
- **A1 (bước 3) — Nhiều vé trùng số điện thoại:** hiển thị danh sách để nhân viên chọn đúng vé.
- **A2 (bước 4) — In lại vé:** nhân viên bấm "In lại" → hệ thống in lại phiếu vé (dùng cho UC14 E3).

**Hậu điều kiện:** Thông tin vé được hiển thị. Dữ liệu không thay đổi.

---

## UC17 — Hủy vé tại quầy

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 11. Hủy vé tại quầy |
| Tác nhân | Nhân viên bán vé |
| Quan hệ | «include» UC16 (Tra cứu vé), «include» UC18 (Hoàn tiền); "In biên nhận hủy vé" «extend» use case này |
| Bảng CSDL | `VE`, `CHI_TIET_VE`, `THANH_TOAN`, `NHAT_KY_HOAT_DONG` |

**Tóm tắt:** Nhân viên hủy vé hộ khách tại quầy. Đây là **cách duy nhất** để hủy vé đã thanh toán bằng tiền mặt và để khách vãng lai (không có tài khoản) hủy vé.

**Tiền điều kiện:** Nhân viên đã đăng nhập; khách có mặt tại quầy với mã vé hoặc số điện thoại.

**Dòng sự kiện chính:**
1. Hệ thống gọi **UC16** để tìm vé của khách.
2. Nhân viên bấm "Hủy vé".
3. Hệ thống kiểm tra điều kiện hủy: vé `DA_THANH_TOAN` và còn cách giờ khởi hành ít nhất QD03.
4. Hệ thống tính số tiền hoàn: `thanhTien` × QD04 (QD11).
5. Hệ thống hiển thị số tiền hoàn và **cách hoàn tiền** được phép theo QD12: vé trả tiền mặt → hoàn tiền mặt; vé trả online → hoàn qua cổng.
6. Nhân viên xác nhận với khách và bấm "Xác nhận hủy".
7. Hệ thống đổi vé sang `DA_HUY`, lưu thời điểm, lý do và nhân viên thực hiện; các ghế trở lại trống.
8. Hệ thống gọi **UC18** để hoàn tiền theo cách đã xác định ở bước 5.
9. Hệ thống ghi nhật ký `HUY_VE`.

**Dòng sự kiện phụ:**
- **A1 (sau bước 9) — In biên nhận hủy vé** *(use case mở rộng)*: nhân viên bấm "In biên nhận" → hệ thống tạo biên nhận gồm mã vé, ghế, số tiền hoàn, cách hoàn, thời điểm hủy, tên nhân viên; gửi tới máy in.
- **E1 (bước 3) — Không đủ điều kiện hủy:** hiển thị lý do, ẩn nút hủy. Use case kết thúc.
- **A2 (bước 6) — Khách đổi ý:** quay lại bước 1, vé không đổi.
- **E2 (bước 8) — Quầy không đủ tiền mặt để hoàn:** ghi nhận khoản phải trả, hẹn khách; vé vẫn `DA_HUY`.

**Hậu điều kiện:**
1. Thành công: vé `DA_HUY`, ghế trống trở lại, tiền đã hoàn theo đúng nguồn, có ghi nhận nhân viên thực hiện.
2. Không đủ điều kiện: vé giữ nguyên.

---

## UC18 — Hoàn tiền

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 10. Hủy vé trực tuyến · 11. Hủy vé tại quầy · 12. Quản lý chuyến xe & lịch trình |
| Tác nhân | Không nối trực tiếp actor người. Actor phụ: **CỔNG THANH TOÁN** |
| Quan hệ | Được «include» bởi UC15, UC17 và UC19. Các use case «extend» nó: *Hoàn tiền mặt*, *Hoàn qua cổng thanh toán* |
| Bảng CSDL | `THANH_TOAN`, `VE`, `THAM_SO` |

**Tóm tắt:** Hệ thống trả lại tiền cho khách sau khi vé bị hủy. Tiền luôn về **đúng nguồn đã thanh toán** (QD12).

**Tiền điều kiện:** Có một vé vừa chuyển sang `DA_HUY` và một số tiền hoàn đã được tính.

**Dòng sự kiện chính:**
1. Hệ thống đọc phương thức của giao dịch thanh toán gốc.
2. Hệ thống tạo bản ghi `THANH_TOAN` loại `HOAN_TIEN`, trạng thái `DANG_CHO`, số tiền = số tiền hoàn.
3. **Nếu gốc là thanh toán online:** hệ thống gửi yêu cầu hoàn tiền sang CỔNG THANH TOÁN; cổng trả kết quả.
4. **Nếu gốc là tiền mặt:** nhân viên trả tiền mặt cho khách tại quầy và bấm "Đã hoàn tiền mặt"; không gọi CỔNG THANH TOÁN.
5. Hệ thống cập nhật giao dịch hoàn tiền sang `THANH_CONG`.
6. Hệ thống trả kết quả cho use case gọi nó.

**Dòng sự kiện phụ:**
- **E1 (bước 3) — Cổng hoàn tiền lỗi hoặc không phản hồi:** giữ giao dịch ở `DANG_CHO` để thử lại; vé vẫn `DA_HUY`; báo khách tiền sẽ được xử lý sau.
- **A1 — Nhà xe hủy chuyến:** số tiền hoàn là 100% `thanhTien`, không áp QD03 và QD04 (QD06).

**Hậu điều kiện:**
1. Thành công: có giao dịch `HOAN_TIEN` ở `THANH_CONG`, tiền về đúng nguồn.
2. Chờ xử lý: giao dịch ở `DANG_CHO`, cần thử lại.

---

## UC19 — Quản lý chuyến xe & lịch trình

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 12. Quản lý chuyến xe & lịch trình |
| Tác nhân | Admin |
| Quan hệ | "Tìm kiếm chuyến xe" «extend» "Xem danh sách chuyến xe"; "Xử lý vé của chuyến bị hủy" «extend» "Hủy chuyến xe" và «include» UC18 (Hoàn tiền) |
| Bảng CSDL | `CHUYEN_XE`, `TUYEN_XE`, `XE`, `DIEM_DUNG`, `VE`, `THANH_TOAN`, `NHAT_KY_HOAT_DONG` |

**Tóm tắt:** Admin xem, tìm, thêm chuyến xe mới, sửa lịch trình và hủy chuyến. Khi hủy chuyến đã bán vé, hệ thống xử lý vé và hoàn tiền 100% cho khách.

**Tiền điều kiện:** Admin đã đăng nhập; đã có dữ liệu tuyến xe và xe (nạp sẵn khi khởi tạo CSDL).

**Dòng sự kiện chính — Thêm chuyến xe mới:**
1. Admin mở "Quản lý chuyến xe"; hệ thống hiển thị danh sách chuyến, mới nhất trước.
2. Admin bấm "Thêm chuyến xe mới".
3. Hệ thống hiển thị form: tuyến, xe, thời gian khởi hành, thời gian đến dự kiến, giá vé, **danh sách điểm đón và điểm trả** của chuyến.
4. Admin nhập thông tin và bấm "Lưu".
5. Hệ thống kiểm tra: thời gian khởi hành ở tương lai; giờ đến sau giờ đi; xe đang `HOAT_DONG`; **xe không trùng lịch** với chuyến khác trong khoảng thời gian đó; giá vé > 0.
6. Hệ thống lưu chuyến ở trạng thái `MO_BAN`, ghi nhật ký, cập nhật danh sách.

**Dòng sự kiện phụ:**
- **A1 (bước 1) — Tìm kiếm chuyến xe** *(use case mở rộng)*: Admin lọc theo tuyến, ngày hoặc trạng thái → hệ thống lọc lại danh sách.
- **A2 — Sửa lịch trình chuyến xe:** Admin chọn một chuyến `MO_BAN` → sửa giờ hoặc đổi xe → hệ thống kiểm tra như bước 5. Nếu chuyến đã bán vé: chỉ cho đổi sang xe **cùng loại** (giữ nguyên sơ đồ ghế) và gửi thông báo thay đổi giờ cho khách đã mua.
- **A3 — Hủy chuyến xe:** Admin chọn chuyến chưa khởi hành → nhập lý do → xác nhận → hệ thống đổi chuyến sang `DA_HUY`.
  - **A3.1 — Chuyến chưa bán vé nào:** hủy thẳng, không phát sinh hoàn tiền.
  - **A3.2 — Xử lý vé của chuyến bị hủy** *(use case mở rộng)*: với mỗi vé `DA_THANH_TOAN` của chuyến, hệ thống đổi sang `DA_HUY` và gọi **UC18** hoàn **100%** `thanhTien` (QD06, không áp QD03 và QD04); vé `GIU_CHO` chuyển `HET_HAN`; gửi thông báo cho tất cả khách bị ảnh hưởng.
- **E1 (bước 5) — Dữ liệu không hợp lệ hoặc xe trùng lịch:** báo lỗi cụ thể, quay lại bước 4.
- **E2 (A2, A3) — Chuyến đã khởi hành hoặc đã hoàn thành:** không cho sửa, không cho hủy.

**Hậu điều kiện:** Danh sách chuyến được cập nhật. Chuyến mới `MO_BAN` xuất hiện ở UC09. Chuyến bị hủy không còn bán được và khách đã được hoàn tiền đủ.

---

## UC20 — Quản lý xe & sơ đồ ghế

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 13. Quản lý xe & sơ đồ ghế |
| Tác nhân | Admin |
| Quan hệ | "Xem sơ đồ ghế của xe" «extend» "Xem danh sách xe"; "Thêm xe mới" «include» "Thiết lập sơ đồ ghế" |
| Bảng CSDL | `XE`, `LOAI_XE`, `GHE`, `CHUYEN_XE` |

**Tóm tắt:** Admin quản lý danh sách xe. **Sơ đồ ghế khai báo theo từng xe**, để khách chọn chỗ trên app dùng lại được đúng sơ đồ đó.

**Tiền điều kiện:** Admin đã đăng nhập.

**Dòng sự kiện chính — Thêm xe mới:**
1. Admin mở "Quản lý xe"; hệ thống hiển thị danh sách xe (biển số, loại, số ghế, trạng thái).
2. Admin bấm "Thêm xe mới".
3. Admin nhập biển số, chọn loại xe, năm sản xuất.
4. Hệ thống kiểm tra biển số đúng định dạng và chưa tồn tại.
5. Hệ thống gọi **Thiết lập sơ đồ ghế**: sinh danh sách ghế theo cấu hình tầng / hàng / cột của loại xe — tầng 1 đặt tên A01, A02…; tầng 2 đặt tên B01, B02…
6. Hệ thống lưu xe ở trạng thái `HOAT_DONG` cùng toàn bộ ghế của nó.
7. Hệ thống hiển thị sơ đồ ghế vừa tạo để Admin kiểm tra.

**Dòng sự kiện phụ:**
- **A1 (bước 1) — Xem sơ đồ ghế của xe** *(use case mở rộng)*: Admin bấm vào một xe → hệ thống vẽ sơ đồ ghế theo tầng / hàng / cột.
- **A2 — Sửa thông tin xe:** sửa biển số, năm sản xuất, trạng thái. **Không cho đổi loại xe** nếu xe đã gán cho chuyến nào, vì sơ đồ ghế đã gắn với vé đã bán.
- **A3 — Ngừng hoạt động xe:** hệ thống kiểm tra xe không còn chuyến `MO_BAN` nào phía trước → chuyển trạng thái `NGUNG_SU_DUNG`; xe không còn được chọn khi thêm chuyến mới.
- **E1 (bước 4) — Biển số trùng hoặc sai định dạng:** báo lỗi, quay lại bước 3.
- **E2 (A3) — Xe còn chuyến sắp chạy:** báo "Xe còn chuyến chưa khởi hành", không cho ngừng.

**Hậu điều kiện:** Danh sách xe và sơ đồ ghế được cập nhật; xe `HOAT_DONG` có thể gán cho chuyến mới.

---

## UC21 — Quản lý giá vé & khuyến mãi

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 14. Quản lý giá vé & khuyến mãi |
| Tác nhân | Admin |
| Quan hệ | "Bật / Tắt mã giảm giá" «extend» "Xem danh sách mã giảm giá" |
| Bảng CSDL | `CHUYEN_XE`, `MA_GIAM_GIA`, `NHAT_KY_HOAT_DONG` |

**Tóm tắt:** Admin xem và cập nhật giá vé của từng chuyến; thêm mã giảm giá mới, xem danh sách và bật/tắt mã. **Không có sửa và xóa mã** (QD14).

**Tiền điều kiện:** Admin đã đăng nhập.

**Dòng sự kiện chính — Cập nhật giá vé chuyến xe:**
1. Admin mở "Giá vé & khuyến mãi"; hệ thống hiển thị các chuyến `MO_BAN` kèm giá hiện tại.
2. Admin chọn một chuyến, nhập giá mới, bấm "Lưu".
3. Hệ thống kiểm tra giá > 0, lưu giá mới, ghi nhật ký.
4. Hệ thống báo thành công. Giá mới **chỉ áp dụng cho vé đặt sau thời điểm này**; vé cũ giữ nguyên giá đã lưu trong `CHI_TIET_VE`.

**Dòng sự kiện phụ:**
- **A1 — Thêm mã giảm giá mới:** Admin nhập mã, loại giảm (phần trăm hoặc số tiền), giá trị, mức giảm tối đa, đơn tối thiểu, ngày bắt đầu, ngày kết thúc, số lượt tối đa → hệ thống kiểm tra mã chưa tồn tại, giá trị hợp lệ (≤ 100 nếu là phần trăm), ngày bắt đầu ≤ ngày kết thúc → lưu ở trạng thái bật.
- **A2 — Xem danh sách mã giảm giá:** hiển thị mã, loại giảm, giá trị, hạn dùng, số lượt đã dùng / tối đa, trạng thái bật-tắt.
- **A3 (A2) — Bật / Tắt mã giảm giá** *(use case mở rộng)*: Admin gạt công tắc → hệ thống đảo trạng thái. Mã tắt không dùng được ở UC13.
- **E1 (bước 3, A1) — Dữ liệu không hợp lệ hoặc mã trùng:** báo lỗi, giữ form.

**Hậu điều kiện:** Giá vé và danh sách mã được cập nhật, có hiệu lực ngay cho các lần đặt sau.

> **Lưu ý thiết kế:** không có chức năng sửa và xóa mã giảm giá. Lý do: vé đã dùng mã nào thì phải giữ được đúng điều kiện tại thời điểm mua. Muốn ngừng một mã thì tắt nó.

---

## UC22 — Quản lý tài khoản & phân quyền

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 15. Quản lý tài khoản & phân quyền |
| Tác nhân | Admin |
| Quan hệ | "Tìm kiếm tài khoản" và "Xem chi tiết hồ sơ & lịch sử hoạt động" «extend» "Xem danh sách người dùng"; "Tạo tài khoản nhân viên" và "Cập nhật tài khoản nhân viên" «include» "Phân quyền vai trò" |
| Bảng CSDL | `NGUOI_DUNG`, `VAI_TRO`, `NHAT_KY_HOAT_DONG` |

**Tóm tắt:** Admin quản lý người dùng: tạo và cập nhật tài khoản nhân viên kèm phân quyền, khóa / mở khóa tài khoản, đặt lại mật khẩu cho nhân viên, xem lịch sử hoạt động.

**Tiền điều kiện:** Admin đã đăng nhập.

**Dòng sự kiện chính — Tạo tài khoản nhân viên:**
1. Admin mở "Quản lý tài khoản"; hệ thống hiển thị danh sách người dùng (họ tên, số điện thoại, email, vai trò, trạng thái).
2. Admin bấm "Tạo tài khoản nhân viên".
3. Admin nhập họ tên, số điện thoại, email và **chọn vai trò** `NHAN_VIEN_BAN_VE` hoặc `ADMIN` *(Phân quyền vai trò — «include»)*.
4. Hệ thống kiểm tra số điện thoại và email chưa tồn tại; sinh mật khẩu tạm.
5. Hệ thống lưu tài khoản ở trạng thái `HOAT_DONG`, gửi mật khẩu tạm qua SMS tới nhân viên, ghi nhật ký.
6. Hệ thống báo thành công và cập nhật danh sách.

**Dòng sự kiện phụ:**
- **A1 (bước 1) — Tìm kiếm tài khoản** *(use case mở rộng)*: Admin nhập số điện thoại, email hoặc họ tên → hệ thống lọc danh sách.
- **A2 (bước 1) — Xem chi tiết hồ sơ & lịch sử hoạt động** *(use case mở rộng)*: hiển thị hồ sơ và các bản ghi nhật ký gần nhất (đăng nhập, bán vé, hủy vé…).
- **A3 — Cập nhật tài khoản nhân viên:** sửa họ tên, số điện thoại, email và **đổi vai trò** *(Phân quyền vai trò — «include»)*.
- **A4 — Khóa / Mở khóa tài khoản người dùng:** Admin bấm khóa → xác nhận → tài khoản `BI_KHOA`, mọi phiên đăng nhập của người đó bị hủy (QD08). Mở khóa → `HOAT_DONG`.
- **A5 — Đặt lại mật khẩu cho nhân viên:** hệ thống sinh mật khẩu tạm mới và gửi SMS cho nhân viên đó.
- **E1 (A4) — Admin tự khóa chính mình hoặc khóa Admin cuối cùng:** không cho phép, báo lỗi.
- **E2 (bước 4) — Số điện thoại hoặc email đã tồn tại:** báo lỗi, quay lại bước 3.

**Hậu điều kiện:** Tài khoản, vai trò và trạng thái được cập nhật, có hiệu lực ngay ở lần đăng nhập kế tiếp.

---

## UC23 — Thống kê & báo cáo doanh thu

| Mục | Nội dung |
|-----|----------|
| Sơ đồ | 16. Thống kê & báo cáo doanh thu |
| Tác nhân | Admin |
| Quan hệ | "Lọc thống kê" và "Xuất báo cáo" «extend» cả ba use case thống kê |
| Bảng CSDL | `VE`, `CHI_TIET_VE`, `THANH_TOAN`, `CHUYEN_XE`, `TUYEN_XE`, `GHE` |

**Tóm tắt:** Admin xem bảng điều khiển tổng quan và ba nhóm thống kê: doanh thu, vé bán và vé hủy, tỷ lệ lấp đầy chỗ ngồi. Có thể lọc theo khoảng thời gian và xuất báo cáo ra file.

**Tiền điều kiện:** Admin đã đăng nhập.

**Dòng sự kiện chính:**
1. Admin mở "Thống kê".
2. Hệ thống lấy mặc định khoảng thời gian = tháng hiện tại.
3. Hệ thống hiển thị **bảng điều khiển tổng quan**: tổng doanh thu, tổng vé bán, tổng vé hủy, tỷ lệ lấp đầy trung bình.
4. Admin chọn **Thống kê doanh thu** → hệ thống tính doanh thu theo từng tuyến = tổng tiền thu − tổng tiền hoàn, và hiển thị biểu đồ cột.
5. Admin chọn **Thống kê vé bán & vé hủy** → hệ thống đếm số vé `DA_THANH_TOAN` và `DA_HUY` theo ngày, hiển thị biểu đồ đường.
6. Admin chọn **Thống kê tỷ lệ lấp đầy chỗ ngồi** → hệ thống tính (số ghế đã bán ÷ tổng số ghế) theo từng chuyến, hiển thị bảng.

**Dòng sự kiện phụ:**
- **A1 (bước 4, 5, 6) — Lọc thống kê** *(use case mở rộng)*: Admin chọn khoảng ngày, tuyến hoặc kênh bán (online / tại quầy) → hệ thống tính lại số liệu.
- **A2 (bước 4, 5, 6) — Xuất báo cáo** *(use case mở rộng)*: Admin bấm "Xuất báo cáo" → hệ thống tạo file (Excel hoặc PDF) chứa bảng số liệu của màn hình đang xem và tải về.
- **E1 (A1) — Khoảng ngày sai** (từ ngày > đến ngày): báo lỗi, giữ khoảng cũ.
- **A3 — Không có dữ liệu trong khoảng đã chọn:** hiển thị số 0 và dòng "Chưa có giao dịch trong khoảng này".

**Hậu điều kiện:** Báo cáo được hiển thị hoặc xuất ra file. **Dữ liệu hệ thống không thay đổi** — mọi số liệu đều tính lại từ truy vấn, không lưu bảng thống kê riêng.

---

## Phụ lục — Những chỗ khác với bản đặc tả 01/10/2026

| Nội dung | Bản cũ (v1, 15 use case) | Bản này (v3.0, 23 use case) |
|----------|--------------------------|------------------------------|
| OTP | Gửi qua **email** | Gửi qua **SMS** tới số điện thoại (QD15) |
| Đổi mật khẩu | Nằm trong UC05 như một luồng phụ | Tách thành **UC06** riêng, đúng với sơ đồ 4 |
| Khôi phục mật khẩu | UC04 "Quên mật khẩu" | **UC05**, dùng chung UC04 Xác thực OTP với đăng ký |
| Chọn ghế | **UC07** riêng ("Chọn ghế & tạm khóa chỗ") | Là **bước trong luồng** của UC10 và UC14; phần khóa ghế tách thành **UC11 Giữ chỗ tạm thời** dùng chung |
| Hủy vé | **UC09** gộp tra cứu và hủy, cho cả khách và nhân viên | Tách **UC15 Hủy vé trực tuyến** (khách, bắt buộc đăng nhập) và **UC17 Hủy vé tại quầy** (nhân viên); **UC16 Tra cứu vé** tách riêng |
| Thanh toán tiền mặt | **Ngoài phạm vi** | Có, tại quầy (UC12 bước 5) |
| Hoàn tiền | Nằm trong UC09 | Tách **UC18** dùng chung cho UC15, UC17, UC19; hoàn về **đúng nguồn** đã trả (QD12) |
| Phí hủy | Tính trên giá trị vé | Tính trên **số tiền thực trả** `thanhTien` (QD11) |
| Mã giảm giá | Có thêm / sửa / xóa | Chỉ **thêm, xem, bật/tắt** (QD14) |
| Sơ đồ ghế | Sinh theo **loại xe** | Khai báo theo **từng xe** (UC20) |
| Yêu cầu đăng nhập | Phải đăng nhập mới đặt vé được | **Không bắt buộc** để mua vé; **bắt buộc** để hủy vé online |

### Điểm chưa chốt

| Vấn đề | Trạng thái |
|--------|------------|
| Use case "Quản lý đơn đặt vé" cho Admin | **Chưa quyết định**. Chưa có sơ đồ, chưa có đặc tả. Hỏi trước khi cài đặt. |
