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
| UC19 OTP | Gửi lại OTP phải cách nhau ≥ 60 giây (429); tối đa 5 lần nhập sai/OTP; hiệu lực 120 giây. Các ngưỡng OTP, số lần đăng nhập sai và thời gian khóa nay đọc từ bảng `settings` (8 tham số, Admin chỉnh qua `/admin/settings`, có kiểm khoảng hợp lệ và ghi nhật ký); giá trị trong `app/config.py` chỉ là mặc định khi thiếu |
| UC20 Giữ chỗ | Mỗi tài khoản giữ tối đa 10 ghế/chuyến. Giữ **tất cả hoặc không ghế nào**. Giữ lại ghế mình đang giữ thì không gia hạn |
| UC02/UC04 Đơn | Đơn chưa trả tiền hết hạn khi ghế không còn do chủ đơn giữ (kiểm tra lười khi đọc/thanh toán). Lượt dùng mã giảm giá được giữ từ lúc tạo đơn và trả lại khi đơn bị hủy/hết hạn |
| UC21 Thanh toán | Đổi phương thức: thanh toán `DANG_XU_LY` cũ chuyển `DA_HUY`. Webhook báo thành công đến **muộn** (đơn đã hết hạn, hoặc giao dịch đã bị hủy do đổi phương thức) thì tự tạo lệnh hoàn 100% với lý do mới `THANH_TOAN_QUA_HAN` (gắn vào vé đầu của đơn, ghi `source_transaction_id` là giao dịch gốc); cổng từ chối thì vào hàng đợi Admin ở UC18 |
| UC22 Hoàn tiền | Vé thanh toán tiền mặt hoàn bằng tiền mặt: nhân viên hủy ở quầy thì `DA_HOAN` ngay; nhà xe hủy chuyến thì `CHO_XU_LY_THU_CONG` để chi tại quầy, Admin xác nhận ở UC18 |
| UC13 Hủy chuyến | Đơn đang `CHO_THANH_TOAN` của chuyến bị hủy cũng được đóng (`DA_HUY`) và nhả ghế |
| UC13 Sửa chuyến | Đổi giờ hoặc đổi xe đều báo SMS cho mọi vé đã thanh toán. Đổi xe được cả khi đã bán vé: ghế đang bán/giữ chuyển sang **cùng mã ghế** trên xe mới; xe mới thiếu mã ghế đó thì từ chối và nêu mã thiếu; xe mới phải đang hoạt động và không trùng lịch |
| UC14 Xe | Sơ đồ ghế sinh tự động từ (số tầng 1–2, số hàng, số ghế/hàng): tầng 1 đánh `A01...`, tầng 2 đánh `B01...`. Không sửa được sơ đồ khi xe đã từng có chuyến |
| UC16 Tài khoản | Không chuyển qua lại Khách hàng ↔ nhân viên; mật khẩu tạm 10 ký tự, hiện đúng một lần |
| UC17 Báo cáo | Doanh thu tính theo ngày thanh toán, hoàn tiền theo ngày lập lệnh hoàn, lấp đầy theo ngày khởi hành. Xuất **CSV, Excel (.xlsx) và PDF** (PDF dùng font DejaVu kèm theo trong `app/assets/fonts` để in đúng tiếng Việt) |
| UC11 Hồ sơ | Thêm đổi số điện thoại: OTP gửi tới **số mới** + nhập lại mật khẩu; thành công thì thu hồi mọi phiên và cấp token mới. Dùng mục đích OTP mới `DOI_SO_DIEN_THOAI` (RDM chưa liệt kê) |
| `activity_logs` | Ghi cả đăng nhập/đăng xuất lẫn thao tác Admin lên tài khoản |

## 3. Chưa làm / cần quyết định thêm
- Chưa đối chiếu từng bước với Sequence diagram và Class diagram (chỉ bám Đặc tả + RDM + BFD).
- Cổng thanh toán, SMS vẫn là bản giả; chưa có tích hợp thật.
- Chưa có giới hạn tốc độ (rate limit) ngoài việc khóa đăng nhập và giới hạn gửi lại OTP.
