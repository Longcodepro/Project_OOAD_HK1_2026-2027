# Thay đổi và quyết định bổ sung khi code backend

Ghi lại những chỗ code **khác hoặc chi tiết hơn** so với RDM/Đặc tả/Sequence để nhóm cập nhật sơ đồ `.drawio` sau khi xong sản phẩm. Theo quy ước: khi Markdown ≠ drawio thì theo Markdown.

## 1. Quy ước chung
| Nội dung | Quyết định | Lý do |
|---|---|---|
| Tên bảng, cột, endpoint | Tiếng Anh, `snake_case` (bảng ánh xạ ở `backend/README.md`) | Thống nhất với code; tên tiếng Việt vẫn nằm trong chú thích model |
| Giờ lưu DB | `created_at`, `hold_until`, `paid_at`... lưu **UTC**; ngày giờ khởi hành chuyến hiểu theo **giờ Việt Nam** (UTC+7) | Tránh lệch múi giờ khi so sánh hạn giữ chỗ và hạn hủy vé |
| Tiền | `Numeric(15,2)` trong DB, JSON trả về dạng số | Khớp RDM; client không phải parse chuỗi |
| Mock | Cổng thanh toán, SMS đều giả; `simulate=success/fail/pending` và `fail_refund` để ép kết quả khi test | Yêu cầu đồ án |

## 2. Chỗ code chi tiết hơn RDM
| Mã UC / bảng | Chi tiết bổ sung |
|---|---|
| UC19 OTP | Gửi lại OTP phải cách nhau ≥ 60 giây (429); tối đa 5 lần nhập sai/OTP; hiệu lực 120 giây. Các ngưỡng này đang để trong `app/config.py`, **chưa đọc từ bảng `settings`** (bảng chỉ có 3 giá trị: giữ chỗ 5 phút, hạn hủy 24 giờ, phí hủy 15%) |
| UC20 Giữ chỗ | Mỗi tài khoản giữ tối đa 10 ghế/chuyến. Giữ **tất cả hoặc không ghế nào**. Giữ lại ghế mình đang giữ thì không gia hạn |
| UC02/UC04 Đơn | Đơn chưa trả tiền hết hạn khi ghế không còn do chủ đơn giữ (kiểm tra lười khi đọc/thanh toán). Lượt dùng mã giảm giá được giữ từ lúc tạo đơn và trả lại khi đơn bị hủy/hết hạn |
| UC21 Thanh toán | Đổi phương thức: thanh toán `DANG_XU_LY` cũ chuyển `DA_HUY`. Webhook báo thành công đến **sau** khi đơn hết hạn: thanh toán ghi `THANH_CONG` kèm ghi chú "cần hoàn tiền thủ công" (chưa có lệnh hoàn vì `HoanTien` gắn với vé) |
| UC22 Hoàn tiền | Vé thanh toán tiền mặt hoàn bằng tiền mặt: nhân viên hủy ở quầy thì `DA_HOAN` ngay; nhà xe hủy chuyến thì `CHO_XU_LY_THU_CONG` để chi tại quầy, Admin xác nhận ở UC18 |
| UC13 Hủy chuyến | Đơn đang `CHO_THANH_TOAN` của chuyến bị hủy cũng được đóng (`DA_HUY`) và nhả ghế |
| UC14 Xe | Sơ đồ ghế sinh tự động từ (số tầng 1–2, số hàng, số ghế/hàng): tầng 1 đánh `A01...`, tầng 2 đánh `B01...`. Không sửa được sơ đồ khi xe đã từng có chuyến |
| UC16 Tài khoản | Không chuyển qua lại Khách hàng ↔ nhân viên; mật khẩu tạm 10 ký tự, hiện đúng một lần |
| UC17 Báo cáo | Doanh thu tính theo ngày thanh toán, hoàn tiền theo ngày lập lệnh hoàn, lấp đầy theo ngày khởi hành. Xuất **CSV** (mở bằng Excel); chưa xuất PDF/xlsx |
| `activity_logs` | Ghi cả đăng nhập/đăng xuất lẫn thao tác Admin lên tài khoản |

## 3. Chưa làm / cần quyết định thêm
- Đổi số điện thoại qua OTP riêng (UC11 ghi "quy trình riêng", chưa có use case mô tả).
- Thông báo SMS khi Admin sửa giờ chuyến (UC13 bước 3): chưa gửi.
- Đổi xe của chuyến đã tạo: từ chối (hủy chuyến rồi tạo lại) vì vé gắn với ghế của xe.
- Đọc `OTP_*` và `DANG_NHAP_SAI_TOI_DA` từ bảng `settings`.
