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

/** Chuyến xe, ánh xạ 1-1 từ dữ liệu backend (không có trường tự bịa). */
export interface Trip {
  id: string
  code?: string
  fromCity: string
  toCity: string
  date: string // YYYY-MM-DD
  time: string // HH:MM giờ khởi hành
  arrive: string // HH:MM giờ đến dự kiến (từ arrival_at)
  duration: string // "6 giờ 30 phút", tính từ giờ đi và giờ đến
  operator: string // loại xe
  plate: string
  seats: number // số ghế còn trống
  totalSeats: number
  price: number
  priceFormatted: string
  status: string
}

export interface Stop {
  id: number
  name: string
}

/** Chi tiết chuyến: có thêm điểm đón/trả thật của chuyến. */
export interface TripDetail extends Trip {
  pickupStops: Stop[]
  dropoffStops: Stop[]
}

/** Tuyến đang có chuyến sắp chạy + giá thấp nhất (GET /routes). */
export interface RouteOffer {
  code?: string
  origin: string
  destination: string
  expectedMinutes: number | null
  fromPrice: number
  upcomingTrips: number
}

export interface Seat {
  id: string
  label: string // ví dụ "A01"
  floor: 1 | 2
  row: number
  col: number
  status: 'available' | 'held' | 'booked'
}

export interface BookingRequest {
  tripId: string
  seatLabel: string
  passengerName: string
  passengerPhone: string
  pickupStopId?: number
  dropoffStopId?: number
  paymentMethod: 'e-wallet' | 'domestic-card' | 'vietqr'
  /** Mã giảm giá (đã kiểm tra bằng couponsApi.validate); bỏ trống nếu không dùng. */
  couponCode?: string
}

/** Thông tin hoàn tiền của một vé (nếu đã bị hủy). */
export interface TicketRefund {
  id?: number
  code?: string
  status: 'DA_HOAN' | 'CHO_XU_LY_THU_CONG'
  amount: number
  fee: number
  reason?: string
  errorNote?: string
  createdAt?: string
}

export interface Ticket {
  id: number
  code?: string
  ticketCode: string // VE-... hoặc VE-<id>
  tripId: string
  route: string
  departureAt: string
  departureTime: string
  date: string
  plate: string
  passengerName: string
  passengerPhone: string
  seatNumber: string
  pickupPoint: string
  dropoffPoint: string
  originalPrice: number
  discount: number
  totalAmount: number
  /** Trạng thái gốc của backend: CHO_THANH_TOAN | CHUA_DI | DA_HOAN_THANH | DA_HUY */
  status: string
  paymentStatus: 'PAID' | 'PENDING' | 'CANCELLED'
  qrData: string
  channel?: string
  paymentMethod?: string
  refund?: TicketRefund
  /** Đơn hàng chứa vé (có khi vé đến từ một đơn vừa tạo/tải). */
  orderId?: number
}

export interface OrderPayment {
  id: number
  method: string
  amount: number
  status: string
  paidAt?: string
}

/** Đơn hàng: một lần đặt có thể gồm nhiều vé. */
export interface Order {
  id: number
  code?: string
  channel: string // TRUC_TUYEN | TAI_QUAY
  status: string // CHO_THANH_TOAN | DA_THANH_TOAN | THAT_BAI | DA_HUY
  createdAt: string
  total: number
  discount: number
  couponCode?: string
  holdUntil?: string
  tickets: Ticket[]
  payments: OrderPayment[]
}

/** Đối soát doanh thu bán vé tại quầy trong một ngày. */
export interface CounterSummary {
  orders: Order[]
  paidOrders: number
  ticketsSold: number
  revenue: number
  revenueByMethod: Record<string, number>
}

/** Kết quả soát vé của nhân viên, tính từ trạng thái thật của vé. */
export interface CheckinResult {
  valid: boolean
  message: string
  ticket?: Ticket
}

export type UserRole = 'customer' | 'admin' | 'clerk'

export interface User {
  id: string
  fullName: string
  phone: string
  role: UserRole
  birthDate?: string // YYYY-MM-DD
  address?: string
}
