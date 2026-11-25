/**
 * @file index.ts
 * @description Định nghĩa toàn bộ hệ thống kiểu dữ liệu (TypeScript Interfaces & Types) của ứng dụng Frontend.
 *
 * MỤC ĐÍCH & NGUYÊN TẮC:
 * 1. Kiểu dữ liệu UI chuẩn hóa: Ánh xạ 1-1 từ cấu trúc dữ liệu của backend FastAPI (theo Clean Architecture),
 *    đảm bảo tính nhất quán giữa client và server, không tự ý bịa thêm trường ngoài luồng nghiệp vụ.
 * 2. Phân tách rõ ràng giữa 2 cổng người dùng (Customer Portal vs Admin/Clerk Portal).
 * 3. Chuẩn hóa trạng thái đơn hàng (OrderStatus), trạng thái vé (TicketStatus), trạng thái thanh toán (PaymentStatus),
 *    và sơ đồ trạng thái ghế (SeatState).
 */

/**
 * Danh sách toàn bộ các View (màn hình) trong hệ thống định tuyến phía client:
 *
 * --- CỔNG KHÁCH HÀNG (Customer Portal) ---
 * - 'home': Trang chủ tìm kiếm tuyến đường, chọn điểm đi/đến, ngày đi
 * - 'results': Trang hiển thị danh sách các chuyến xe phù hợp, bộ lọc giờ/giá
 * - 'seats': Trang hiển thị sơ đồ ghế real-time, chọn ghế và giữ chỗ tạm
 * - 'checkout': Trang nhập thông tin hành khách từng ghế, áp dụng mã giảm giá và thanh toán
 * - 'success': Trang thông báo đặt vé thành công, hiển thị vé điện tử và mã QR
 * - 'profile': Trang quản lý tài khoản khách hàng, lịch sử vé, đơn hàng, đổi thông tin/mật khẩu
 * - 'lookup': Trang tra cứu vé công khai bằng mã vé hoặc số điện thoại
 * - 'login': Trang đăng nhập tài khoản khách hàng (bằng SĐT và mật khẩu)
 * - 'register': Trang đăng ký tài khoản khách hàng mới xác thực qua mã OTP
 *
 * --- CỔNG QUẢN TRỊ & NHÂN VIÊN (#/admin) ---
 * - 'admin-login': Trang đăng nhập dành riêng cho Admin và Nhân viên bán vé
 * - 'admin-dashboard': Bảng điều khiển trung tâm, biểu đồ doanh thu, tỷ lệ lấp đầy, xuất báo cáo
 * - 'admin-tickets': Quản lý danh sách vé đã bán, xử lý lại lệnh hoàn tiền bị lỗi thủ công
 * - 'admin-trips': Điều hành danh sách chuyến xe, thêm chuyến mới, hoãn chuyến hoặc hủy chuyến (hoàn 100%)
 * - 'admin-buses': Quản lý đội xe, phân loại xe, dựng cấu hình sơ đồ ghế (layout)
 * - 'admin-pricing': Quản lý bảng giá, tạo và kích hoạt mã giảm giá (coupon/voucher)
 * - 'admin-accounts': Quản lý danh sách tài khoản người dùng, tạo tài khoản nhân viên, khóa/mở tài khoản
 * - 'admin-routes': Quản lý danh mục tuyến đường liên tỉnh, cự ly và thời gian chạy dự kiến
 * - 'admin-settings': Cấu hình tham số hệ thống (thời gian giữ chỗ tạm, % phí hủy vé, hạn hủy vé)
 * - 'admin-counter': Quầy bán vé tại bến (POS), thu tiền mặt, in phôi vé giấy nhiệt cho khách
 * - 'admin-scan': Màn hình soát vé lên xe bằng camera quét mã QR hoặc nhập mã vé trực tiếp
 */
export type View =
  // Cổng khách hàng
  | 'home'
  | 'results'
  | 'seats'
  | 'checkout'
  | 'success'
  | 'profile'
  | 'lookup'
  | 'login'
  | 'register'
  // Cổng quản trị & nhân viên (#/admin)
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-tickets'
  | 'admin-trips'
  | 'admin-buses'
  | 'admin-pricing'
  | 'admin-accounts'
  | 'admin-routes'
  | 'admin-settings'
  | 'admin-counter'
  | 'admin-scan'

/**
 * Thông tin một chuyến xe khách, ánh xạ từ `BackendTripOut`.
 */
export interface Trip {
  /** ID định danh duy nhất của chuyến xe (dạng chuỗi trên giao diện) */
  id: string
  /** Mã hiển thị của chuyến (ví dụ: "CX-261118-001") nếu có */
  code?: string
  /** Tỉnh/thành phố xuất phát */
  fromCity: string
  /** Tỉnh/thành phố nơi đến */
  toCity: string
  /** Ngày khởi hành (định dạng chuẩn ISO: YYYY-MM-DD) */
  date: string
  /** Giờ khởi hành (định dạng HH:MM) */
  time: string
  /** Giờ đến bến dự kiến (định dạng HH:MM, tính từ arrival_at) */
  arrive: string
  /** Thời gian di chuyển ước tính (ví dụ: "6 giờ 30 phút") */
  duration: string
  /** Tên loại xe / nhà xe vận hành (ví dụ: "Limousine 34 phòng", "Giường nằm 40 chỗ") */
  operator: string
  /** Biển số xe vận hành (ví dụ: "51B-123.45") */
  plate: string
  /** Số ghế hiện còn trống có thể đặt */
  seats: number
  /** Tổng số ghế thiết kế trên xe */
  totalSeats: number
  /** Giá vé gốc của một ghế (VNĐ) */
  price: number
  /** Chuỗi giá vé đã định dạng hiển thị tiếng Việt (ví dụ: "250.000 ₫") */
  priceFormatted: string
  /** Trạng thái chuyến: 'MO_BAN' (đang mở bán), 'DA_KHOA' (khóa đặt vé), 'DA_HUY' (hủy chuyến) */
  status: string
}

/**
 * Điểm dừng đón hoặc trả khách trên lộ trình của chuyến xe.
 */
export interface Stop {
  /** ID định danh của điểm dừng */
  id: number
  /** Tên bến xe, văn phòng đại diện hoặc vị trí đón/trả khách */
  name: string
}

/**
 * Chi tiết mở rộng của một chuyến xe, bao gồm danh sách các điểm đón và trả thực tế.
 */
export interface TripDetail extends Trip {
  /** Danh sách các điểm đón khách dọc tuyến */
  pickupStops: Stop[]
  /** Danh sách các điểm trả khách dọc tuyến */
  dropoffStops: Stop[]
}

/**
 * Thông tin ưu đãi / tóm tắt tuyến đường đang có chuyến sắp khởi hành.
 * Phục vụ hiển thị trên trang chủ để khách dễ dàng lựa chọn tuyến phổ biến.
 */
export interface RouteOffer {
  /** Mã định danh tuyến (nếu có) */
  code?: string
  /** Tỉnh/thành phố điểm đi */
  origin: string
  /** Tỉnh/thành phố điểm đến */
  destination: string
  /** Thời gian chạy ước tính (phút) */
  expectedMinutes: number | null
  /** Mức giá khởi điểm thấp nhất trong các chuyến sắp chạy (VNĐ) */
  fromPrice: number
  /** Số lượng chuyến xe sắp khởi hành trong ngày */
  upcomingTrips: number
}

/**
 * Đại diện cho một vị trí ghế ngồi/giường nằm trên sơ đồ xe.
 */
export interface Seat {
  /** ID duy nhất của ghế trong cơ sở dữ liệu */
  id: string
  /** Ký hiệu mã ghế hiển thị cho hành khách (ví dụ: "A01", "B05") */
  label: string
  /** Tầng xe: 1 (tầng dưới) hoặc 2 (tầng trên đối với xe giường nằm 2 tầng) */
  floor: 1 | 2
  /** Tọa độ hàng trên sơ đồ ghế (bắt đầu từ hàng 1) */
  row: number
  /** Tọa độ cột trên sơ đồ ghế (bắt đầu từ cột 1) */
  col: number
  /**
   * Trạng thái ghế trên giao diện:
   * - 'available': Ghế đang trống, sẵn sàng chọn
   * - 'held': Ghế đang bị giữ tạm bởi người khác (trong thời gian chờ thanh toán)
   * - 'booked': Ghế đã bán thành công hoặc bị khóa
   */
  status: 'available' | 'held' | 'booked'
}

/**
 * Thông tin chi tiết hành khách được gắn riêng với từng ghế đặt.
 */
export interface BookingPassenger {
  /** Mã ghế hành khách ngồi (ví dụ: "A01") */
  seatLabel: string
  /** Họ và tên của hành khách */
  passengerName: string
  /** Số điện thoại liên hệ của hành khách */
  passengerPhone: string
}

/**
 * Dữ liệu payload gửi lên backend khi tiến hành tạo đơn đặt vé.
 */
export interface BookingRequest {
  /** ID của chuyến xe */
  tripId: string
  /** Danh sách thông tin hành khách tương ứng với từng ghế (tối đa 10 ghế/đơn) */
  passengers: BookingPassenger[]
  /** ID điểm đón khách được chọn */
  pickupStopId?: number
  /** ID điểm trả khách được chọn */
  dropoffStopId?: number
  /**
   * Phương thức thanh toán lựa chọn:
   * - 'vietqr': Chuyển khoản ngân hàng quét mã QR động chuẩn VietQR
   * - 'e-wallet': Ví điện tử (MoMo, ZaloPay)
   * - 'domestic-card': Thẻ ngân hàng ATM nội địa qua cổng thanh toán
   * - 'cash': Tiền mặt tại quầy bán vé bến xe
   */
  paymentMethod: 'e-wallet' | 'domestic-card' | 'vietqr' | 'cash'
  /** Mã giảm giá khuyến mãi (nếu có) */
  couponCode?: string
}

/**
 * Thông tin giao dịch hoàn tiền của vé bị hủy.
 */
export interface TicketRefund {
  /** ID giao dịch hoàn tiền */
  id?: number
  /** Mã phiếu hoàn tiền (ví dụ: "HT-261118-001") */
  code?: string
  /**
   * Trạng thái hoàn tiền:
   * - 'DA_HOAN': Đã hoàn tiền tự động qua cổng thanh toán
   * - 'CHO_XU_LY_THU_CONG': Cổng thanh toán từ chối hoặc lỗi, chuyển cho kế toán xử lý thủ công
   */
  status: 'DA_HOAN' | 'CHO_XU_LY_THU_CONG'
  /** Số tiền thực tế được hoàn lại cho khách sau khi trừ phí (VNĐ) */
  amount: number
  /** Phí hủy vé bị khấu trừ (VNĐ) - mặc định 15% theo quy định */
  fee: number
  /** Lý do hủy vé */
  reason?: string
  /** Ghi chú lỗi kỹ thuật từ cổng thanh toán (nếu có) */
  errorNote?: string
  /** Thời điểm thực hiện yêu cầu hoàn tiền */
  createdAt?: string
}

/**
 * Đại diện cho một tấm vé xe điện tử hoàn chỉnh trong hệ thống.
 */
export interface Ticket {
  /** ID vé trong cơ sở dữ liệu */
  id: number
  /** Mã vé nghiệp vụ sinh ra (ví dụ: "VE-261118-0001") */
  code?: string
  /** Mã hiển thị tiện ích (code hoặc VE-<id>) */
  ticketCode: string
  /** ID chuyến xe của vé */
  tripId: string
  /** Tên lộ trình tuyến (ví dụ: "Hà Nội → Sapa") */
  route: string
  /** Thời điểm khởi hành dạng chuỗi ISO đầy đủ */
  departureAt: string
  /** Giờ khởi hành dạng HH:MM */
  departureTime: string
  /** Ngày khởi hành dạng dd/mm/yyyy */
  date: string
  /** Biển số xe khách phục vụ */
  plate: string
  /** Tên hành khách đi xe */
  passengerName: string
  /** Số điện thoại hành khách */
  passengerPhone: string
  /** Mã vị trí ghế (ví dụ: "A02") */
  seatNumber: string
  /** Điểm đón khách */
  pickupPoint: string
  /** Điểm trả khách */
  dropoffPoint: string
  /** Giá vé gốc trước khi giảm trừ (VNĐ) */
  originalPrice: number
  /** Số tiền được giảm giá phân bổ cho vé này (VNĐ) */
  discount: number
  /** Số tiền thực tế phải thanh toán cho vé (VNĐ) */
  totalAmount: number
  /**
   * Trạng thái nghiệp vụ gốc của vé:
   * - 'CHO_THANH_TOAN': Đơn hàng đang chờ thanh toán
   * - 'CHUA_DI': Đã thanh toán thành công, vé hợp lệ sẵn sàng khởi hành
   * - 'DA_HOAN_THANH': Khách đã lên xe và chuyến đi đã kết thúc
   * - 'DA_HUY': Vé đã bị hủy (hủy online bởi khách hoặc hủy tại quầy)
   */
  status: string
  /** Trạng thái thanh toán của vé ('PAID', 'PENDING', 'CANCELLED') */
  paymentStatus: 'PAID' | 'PENDING' | 'CANCELLED'
  /** Chuỗi dữ liệu mã hóa trong QR Code dùng để soát vé nhanh tại cửa xe */
  qrData: string
  /** Kênh phát hành vé: 'TRUC_TUYEN' (khách tự đặt online) hoặc 'TAI_QUAY' (bán tại bến) */
  channel?: string
  /** Hình thức thanh toán đã sử dụng */
  paymentMethod?: string
  /** Chi tiết lệnh hoàn tiền gắn kèm (nếu vé đã hủy) */
  refund?: TicketRefund
  /** ID đơn hàng chứa vé này */
  orderId?: number
}

/**
 * Thông tin bản ghi thanh toán của một đơn hàng.
 */
export interface OrderPayment {
  /** ID giao dịch thanh toán */
  id: number
  /** Phương thức thanh toán (VIETQR, MOMO, TIEN_MAT, THE...) */
  method: string
  /** Số tiền đã thanh toán (VNĐ) */
  amount: number
  /** Trạng thái giao dịch (THANH_CONG, THAT_BAI, CHO_XU_LY) */
  status: string
  /** Thời điểm ghi nhận giao dịch thành công */
  paidAt?: string
}

/**
 * Thông tin một Đơn hàng (Order), có thể bao gồm từ 1 đến nhiều vé xe.
 */
export interface Order {
  /** ID đơn hàng */
  id: number
  /** Mã đơn hàng (ví dụ: "DH-261118-0001") */
  code?: string
  /** Kênh tạo đơn: 'TRUC_TUYEN' hoặc 'TAI_QUAY' */
  channel: string
  /**
   * Trạng thái đơn hàng:
   * - 'CHO_THANH_TOAN': Đang chờ khách thanh toán, ghế đang được giữ tạm
   * - 'DA_THANH_TOAN': Đã thanh toán thành công toàn bộ số tiền
   * - 'THAT_BAI': Thanh toán thất bại hoặc quá hạn thời gian giữ chỗ
   * - 'DA_HUY': Đơn đã bị hủy chủ động
   */
  status: string
  /** Thời điểm tạo đơn */
  createdAt: string
  /** Tổng số tiền của đơn hàng sau giảm giá (VNĐ) */
  total: number
  /** Tổng số tiền giảm giá áp dụng cho đơn (VNĐ) */
  discount: number
  /** Mã giảm giá đã sử dụng (nếu có) */
  couponCode?: string
  /** Hạn chót thanh toán (hết hạn sẽ tự động nhả ghế) */
  holdUntil?: string
  /** Danh sách các vé thuộc đơn hàng này */
  tickets: Ticket[]
  /** Danh sách các lượt thanh toán của đơn */
  payments: OrderPayment[]
}

/**
 * Báo cáo đối soát doanh thu ca trực của nhân viên bán vé tại quầy.
 */
export interface CounterSummary {
  /** Danh sách các đơn hàng đã tạo trong ngày */
  orders: Order[]
  /** Số lượng đơn hàng đã thu tiền thành công */
  paidOrders: number
  /** Tổng số vé đã in/bán ra */
  ticketsSold: number
  /** Tổng doanh thu thu được (VNĐ) */
  revenue: number
  /** Cơ cấu doanh thu chia theo từng phương thức thanh toán (Tiền mặt, QR, Ví điện tử...) */
  revenueByMethod: Record<string, number>
}

/**
 * Kết quả thẩm tra khi nhân viên soát vé lên xe (bằng quét mã QR hoặc nhập mã vé).
 */
export interface CheckinResult {
  /** Vé có hợp lệ và được phép lên xe hay không */
  valid: boolean
  /** Thông điệp giải thích kết quả soát vé bằng tiếng Việt */
  message: string
  /** Chi tiết tấm vé được tra cứu (nếu tìm thấy) */
  ticket?: Ticket
}

/**
 * Phân quyền vai trò người dùng trong hệ thống:
 * - 'customer': Khách hàng mua vé
 * - 'admin': Quản trị viên toàn quyền hệ thống
 * - 'clerk': Nhân viên bán vé tại quầy bến xe / nhân viên soát vé
 */
export type UserRole = 'customer' | 'admin' | 'clerk'

/**
 * Thông tin tài khoản người dùng đã đăng nhập.
 */
export interface User {
  /** ID người dùng */
  id: string
  /** Họ và tên đầy đủ */
  fullName: string
  /** Số điện thoại (dùng làm tên đăng nhập chính thức) */
  phone: string
  /** Vai trò phân quyền trong hệ thống */
  role: UserRole
  /** Ngày tháng năm sinh (định dạng YYYY-MM-DD) */
  birthDate?: string
  /** Địa chỉ liên hệ / thường trú */
  address?: string
}
