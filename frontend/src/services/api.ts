/**
 * @file api.ts
 * @description Lớp giao tiếp API trung tâm của ứng dụng Frontend (API Gateway Client).
 *
 * TỔNG QUAN KIẾN TRÚC & CHỨC NĂNG:
 * 1. Khởi tạo Axios Client với `baseURL`, timeout và interceptor tự động gắn `Authorization: Bearer <token>`
 *    phù hợp với cổng đang truy cập (`customer` hoặc `admin`).
 * 2. Cơ chế bóc tách thông báo lỗi tiếng Việt thân thiện (`apiErrorMessage`) từ cấu trúc phản hồi của FastAPI
 *    (hỗ trợ cả chuỗi đơn, mảng lỗi validation của Pydantic, trường detail, message, error).
 * 3. Bộ ánh xạ dữ liệu chuẩn hóa (Data Mappers): chuyển đổi cấu trúc DTO từ backend (snake_case)
 *    sang kiểu dữ liệu nghiệp vụ của giao diện (camelCase).
 * 4. Các dịch vụ API phân theo miền nghiệp vụ:
 *    - `routesApi`, `tripsApi`: Tra cứu tuyến đường, tìm chuyến xe, lấy sơ đồ ghế.
 *    - `bookingsApi`: Giữ chỗ tạm thời, kiểm tra hạn giữ chỗ, nhả ghế, tạo đơn và thanh toán.
 *    - `ordersApi`: Quản lý đơn hàng của tài khoản, hủy đơn đang chờ thanh toán.
 *    - `couponsApi`: Kiểm tra và thẩm định mã giảm giá trực tuyến.
 *    - `counterApi`: Nghiệp vụ quầy bán vé (POS), in phôi vé nhiệt, đối soát ca trực, hủy vé quầy.
 *    - `ticketsApi`: Xem vé, tra cứu theo SĐT, tải PDF, dự toán phí hủy và xác nhận hủy vé.
 *    - `authApi`: Đăng ký, đăng nhập theo cổng, xác thực OTP, đổi mật khẩu, đổi SĐT, cập nhật hồ sơ.
 *    - `adminReportsApi`, `adminRefundsApi`, `adminOrdersApi`, `adminTicketsApi`: Báo cáo, hoàn tiền, quản lý đơn và vé.
 *    - `adminRoutesApi`, `adminTripsApi`, `adminBusesApi`, `adminPricingApi`, `adminAccountsApi`, `adminSettingsApi`:
 *      Quản trị toàn diện tuyến, chuyến, phương tiện, sơ đồ ghế, giá vé, tài khoản và tham số hệ thống.
 *    - `staffApi`: Nghiệp vụ soát vé lên xe bằng camera quét mã QR hoặc nhập mã vé.
 */

import axios, { type AxiosError } from 'axios'
import type {
  Trip,
  TripDetail,
  RouteOffer,
  Seat,
  BookingRequest,
  Ticket,
  TicketRefund,
  Order,
  CounterSummary,
  CheckinResult,
  User,
  UserRole,
} from '../types'
import { clearSession, currentPortal, getToken, replaceToken, saveSession, type Portal } from './session'

/** Đường dẫn gốc của API server lấy từ biến môi trường Vite hoặc mặc định '/api' (proxy qua dev server) */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

/**
 * Instance Axios cấu hình sẵn dùng chung cho toàn bộ ứng dụng.
 * - Timeout: 8000ms tránh trường hợp request treo vô tận khi mạng chập chờn.
 * - Content-Type mặc định: application/json.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
})

/**
 * Request Interceptor: Tự động trích xuất token của cổng hiện hành (`customer` hoặc `admin`)
 * và đính kèm vào header `Authorization: Bearer <token>` của mọi request ra ngoài.
 */
apiClient.interceptors.request.use((config) => {
  const token = getToken(currentPortal())
  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Bóc tách và chuyển đổi lỗi từ phản hồi Axios hoặc Exception sang câu thông báo tiếng Việt dễ hiểu cho người dùng.
 *
 * Luồng xử lý:
 * 1. Nếu là lỗi JavaScript thông thường (không phải Axios): trả về `err.message`.
 * 2. Nếu không nhận được response từ máy chủ (Network Error, Server Down, Timeout): trả về thông báo mất kết nối.
 * 3. Nếu backend FastAPI trả về:
 *    - Ưu tiên đọc trường `detail`, `message`, hoặc `error`.
 *    - Nếu là mảng lỗi validate của Pydantic (ví dụ: `[{ msg: '...' }]`): lấy thông điệp đầu tiên.
 * 4. Fallback: trả về câu thông báo mặc định được truyền vào.
 *
 * @param err - Lỗi bắt được từ khối catch
 * @param fallback - Thông điệp dự phòng mặc định
 * @returns Chuỗi thông báo lỗi tiếng Việt
 */
export const apiErrorMessage = (err: unknown, fallback = 'Có lỗi xảy ra, vui lòng thử lại'): string => {
  if (err instanceof Error && !(err as AxiosError).isAxiosError) return err.message
  const e = err as AxiosError<{ detail?: unknown; message?: unknown; error?: unknown }>
  if (!e?.response) return 'Không kết nối được máy chủ, vui lòng thử lại'
  const data = e.response.data
  const d = data?.detail ?? data?.message ?? data?.error
  if (typeof d === 'string') return d
  if (Array.isArray(d) && d[0]?.msg) return String(d[0].msg)
  return fallback
}

/**
 * Kiểm tra trạng thái hoạt động của máy chủ backend thông qua endpoint `GET /health`.
 *
 * @returns Promise<boolean> - true nếu máy chủ phản hồi HTTP 200 và status: 'ok', ngược lại false.
 */
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const res = await apiClient.get('/health', { timeout: 3000 })
    return res.status === 200 && res.data?.status === 'ok'
  } catch {
    return false
  }
}

// ---------------------------------------------------------
// ĐỊNH DẠNG DÙNG CHUNG (Formatters)
// ---------------------------------------------------------

/**
 * Định dạng số tiền sang chuẩn tiền tệ Việt Nam Đồng (VNĐ).
 * Ví dụ: 250000 -> "250.000 ₫"
 */
export const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`

/** Đệm số thành 2 chữ số (ví dụ: 5 -> "05") */
const pad = (n: number) => String(n).padStart(2, '0')

/** Lấy chuỗi giờ:phút (HH:MM) từ đối tượng Date */
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

/**
 * Chuyển đổi số phút sang chuỗi thời lượng thân thiện tiếng Việt.
 * Ví dụ: 150 phút -> "2 giờ 30 phút", 60 phút -> "1 giờ", 45 phút -> "45 phút".
 */
export const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes || minutes <= 0) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h && m ? `${h} giờ ${m} phút` : h ? `${h} giờ` : `${m} phút`
}

// ---------------------------------------------------------
// KIỂU DỮ LIỆU DTO BACKEND (Backend Outbound Schemas)
// ---------------------------------------------------------

/** Cấu trúc chuyến xe từ backend FastAPI */
export interface BackendTripOut {
  id: number
  code?: string | null
  route_id: number
  vehicle_id: number
  origin: string
  destination: string
  plate: string
  vehicle_type: string
  departure_date: string
  departure_time: string
  arrival_at: string
  price: number
  status: string
  cancel_reason?: string | null
  available_seats: number
  total_seats: number
  stops?: Array<{ id: number; name: string; kind: string; order: number }>
}

/** Cấu trúc ghế ngồi từ backend */
interface BackendSeatOut {
  seat_id: number
  code: string
  floor: number
  row_no: number
  col_no: number
  state: 'TRONG' | 'TAM_KHOA' | 'DA_BAN'
  hold_until?: string | null
}

/** Cấu trúc vé điện tử từ backend */
export interface BackendTicketOut {
  id: number
  code?: string | null
  order_id?: number | null
  trip_id: number
  seat_id: number
  seat_code?: string | null
  passenger_name: string
  passenger_phone: string
  origin?: string | null
  destination?: string | null
  departure_at?: string | null
  plate?: string | null
  pickup_name?: string | null
  dropoff_name?: string | null
  original_price: number
  discount: number
  amount: number
  status: string
  qr_code?: string | null
  channel?: string
  payment_method?: string | null
}

/** Cấu trúc đơn hàng từ backend */
interface BackendOrderOut {
  id: number
  code?: string | null
  channel?: string
  status: string
  created_at: string
  total: number
  discount: number
  coupon_code?: string | null
  hold_until?: string | null
  tickets: BackendTicketOut[]
  payments?: Array<{ id: number; method: string; amount: number; status: string; paid_at?: string | null }>
}

/** Kết quả phản hồi thanh toán đơn hàng */
interface BackendPayOut {
  result: 'THANH_CONG' | 'THAT_BAI' | 'DANG_XU_LY'
  message?: string | null
  qr_content?: string | null
  order: BackendOrderOut
}

/** Cấu trúc bản ghi hoàn tiền từ backend */
export interface BackendRefundOut {
  id: number
  code?: string | null
  ticket_id: number
  amount: number
  fee: number
  status: 'DA_HOAN' | 'CHO_XU_LY_THU_CONG'
  reason: string
  error_note?: string | null
  created_at: string
}

// ---------------------------------------------------------
// BỘ ÁNH XẠ DUY NHẤT (Data Mappers: Backend -> Frontend UI Types)
// ---------------------------------------------------------

/**
 * Chuyển đổi dữ liệu chuyến xe từ Backend sang đối tượng `Trip` dùng trên UI.
 * Tự động tính toán thời lượng di chuyển (`duration`), giờ đến (`arrive`), và định dạng tiền tệ (`priceFormatted`).
 */
const toTrip = (t: BackendTripOut): Trip => {
  const dep = new Date(`${t.departure_date}T${t.departure_time}`)
  const arr = new Date(t.arrival_at)
  const minutes =
    !isNaN(dep.getTime()) && !isNaN(arr.getTime()) ? Math.round((arr.getTime() - dep.getTime()) / 60000) : 0
  return {
    id: String(t.id),
    code: t.code ?? undefined,
    fromCity: t.origin,
    toCity: t.destination,
    date: t.departure_date,
    time: t.departure_time.slice(0, 5),
    arrive: !isNaN(arr.getTime()) ? hhmm(arr) : '',
    duration: formatDuration(minutes),
    operator: t.vehicle_type,
    plate: t.plate,
    seats: t.available_seats,
    totalSeats: t.total_seats,
    price: Number(t.price),
    priceFormatted: formatVnd(Number(t.price)),
    status: t.status,
  }
}

/**
 * Chuyển đổi bản ghi hoàn tiền từ Backend sang `TicketRefund`.
 */
const toRefund = (r: BackendRefundOut): TicketRefund => ({
  id: r.id,
  code: r.code ?? undefined,
  status: r.status,
  amount: Number(r.amount),
  fee: Number(r.fee),
  reason: r.reason,
  errorNote: r.error_note ?? undefined,
  createdAt: r.created_at,
})

/**
 * Chuyển đổi vé xe từ Backend sang đối tượng `Ticket` hoàn chỉnh.
 * Xử lý định dạng ngày giờ khởi hành, ánh xạ trạng thái thanh toán và thông tin hoàn tiền gắn kèm.
 */
export const toTicket = (t: BackendTicketOut, refund?: BackendRefundOut): Ticket => {
  const dep = t.departure_at ? new Date(t.departure_at) : null
  const valid = !!dep && !isNaN(dep.getTime())
  return {
    id: t.id,
    code: t.code ?? undefined,
    ticketCode: t.code || `VE-${t.id}`,
    tripId: String(t.trip_id),
    route: t.origin && t.destination ? `${t.origin} → ${t.destination}` : '',
    departureAt: t.departure_at ?? '',
    departureTime: valid ? hhmm(dep!) : '',
    date: valid ? dep!.toLocaleDateString('vi-VN') : '',
    plate: t.plate ?? '',
    passengerName: t.passenger_name,
    passengerPhone: t.passenger_phone,
    seatNumber: t.seat_code ?? '',
    pickupPoint: t.pickup_name ?? '',
    dropoffPoint: t.dropoff_name ?? '',
    originalPrice: Number(t.original_price),
    discount: Number(t.discount),
    totalAmount: Number(t.amount),
    status: t.status,
    paymentStatus: t.status === 'DA_HUY' ? 'CANCELLED' : t.status === 'CHO_THANH_TOAN' ? 'PENDING' : 'PAID',
    qrData: t.qr_code ?? '',
    channel: t.channel,
    paymentMethod: t.payment_method ?? undefined,
    refund: refund ? toRefund(refund) : undefined,
    orderId: t.order_id ?? undefined,
  }
}

/**
 * Chuyển đổi dữ liệu đơn hàng từ Backend sang đối tượng `Order` hoàn chỉnh.
 */
const toOrder = (o: BackendOrderOut): Order => ({
  id: o.id,
  code: o.code ?? undefined,
  channel: o.channel ?? '',
  status: o.status,
  createdAt: o.created_at,
  total: Number(o.total),
  discount: Number(o.discount),
  couponCode: o.coupon_code ?? undefined,
  holdUntil: o.hold_until ?? undefined,
  tickets: (o.tickets || []).map((t) => ({ ...toTicket(t), orderId: o.id })),
  payments: (o.payments || []).map((p) => ({
    id: p.id,
    method: p.method,
    amount: Number(p.amount),
    status: p.status,
    paidAt: p.paid_at ?? undefined,
  })),
})

/**
 * Trích xuất ID số nguyên của vé từ chuỗi mã vé người dùng nhập.
 * Hỗ trợ các định dạng: "VE-261112-0017", "VE-17", hoặc chuỗi số thuần "17".
 * Trả về null nếu chuỗi không thể phân tích thành ID vé.
 */
export const parseTicketId = (code: string): number | null => {
  const m = code.trim().match(/^(?:VE-)?(?:(?:\d{6}-)?(\d+))$/i)
  return m ? Number(m[1]) : null
}

// ---------------------------------------------------------
// TUYẾN & CHUYẾN (Cổng khách hàng công khai)
// ---------------------------------------------------------

/**
 * Dịch vụ API Tuyến đường công khai.
 */
export const routesApi = {
  /**
   * Lấy danh sách các tuyến đường đang có chuyến xe sắp khởi hành, kèm giá vé khởi điểm thấp nhất.
   * Endpoint: `GET /routes`
   */
  offers: async (): Promise<RouteOffer[]> => {
    const res = await apiClient.get<
      Array<{ origin: string; destination: string; expected_minutes: number | null; from_price: number; upcoming_trips: number }>
    >('/routes')
    return (res.data || []).map((o) => ({
      origin: o.origin,
      destination: o.destination,
      expectedMinutes: o.expected_minutes,
      fromPrice: Number(o.from_price),
      upcomingTrips: o.upcoming_trips,
    }))
  },
}

/**
 * Dịch vụ API Chuyến xe công khai.
 */
export const tripsApi = {
  /**
   * Tìm kiếm các chuyến xe theo điểm đi, điểm đến và ngày khởi hành.
   * Endpoint: `GET /trips/search?origin=...&destination=...&date=...`
   *
   * @param origin - Tỉnh/thành xuất phát
   * @param destination - Tỉnh/thành đến
   * @param date - Ngày đi (YYYY-MM-DD)
   * @returns Danh sách chuyến xe (`trips`) và các ngày lân cận gợi ý (`suggestedDates`)
   */
  search: async (
    origin: string,
    destination: string,
    date: string,
  ): Promise<{ trips: Trip[]; suggestedDates: string[] }> => {
    const res = await apiClient.get<{ items: BackendTripOut[]; suggested_dates: string[] }>('/trips/search', {
      params: { origin, destination, date },
    })
    return { trips: (res.data?.items || []).map(toTrip), suggestedDates: res.data?.suggested_dates || [] }
  },

  /**
   * Lấy thông tin chi tiết của một chuyến xe, bao gồm danh sách điểm đón và trả khách thực tế.
   * Endpoint: `GET /trips/{id}`
   *
   * @param tripId - ID chuyến xe
   */
  getDetail: async (tripId: string | number): Promise<TripDetail> => {
    const res = await apiClient.get<BackendTripOut>(`/trips/${tripId}`)
    const stops = res.data.stops || []
    const pick = (kind: string) =>
      stops
        .filter((s) => s.kind === kind)
        .sort((a, b) => a.order - b.order)
        .map((s) => ({ id: s.id, name: s.name }))
    return { ...toTrip(res.data), pickupStops: pick('DON'), dropoffStops: pick('TRA') }
  },

  /**
   * Lấy sơ đồ ghế và trạng thái hiện tại (TRONG, TAM_KHOA, DA_BAN) của tất cả các ghế trên chuyến xe.
   * Endpoint: `GET /trips/{id}/seats`
   *
   * @param tripId - ID chuyến xe
   */
  getSeats: async (tripId: string | number): Promise<Seat[]> => {
    const res = await apiClient.get<BackendSeatOut[]>(`/trips/${tripId}/seats`)
    return (res.data || []).map((s) => ({
      id: String(s.seat_id),
      label: s.code,
      floor: s.floor === 2 ? 2 : 1,
      row: s.row_no,
      col: s.col_no,
      status: s.state === 'TRONG' ? 'available' : s.state === 'TAM_KHOA' ? 'held' : 'booked',
    }))
  },
}

// ---------------------------------------------------------
// ĐẶT VÉ (Khách hàng đã đăng nhập)
// ---------------------------------------------------------

/** Bảng ánh xạ phương thức thanh toán giao diện sang định dạng backend */
const PAY_METHOD: Record<BookingRequest['paymentMethod'], string> = {
  vietqr: 'VIETQR',
  'e-wallet': 'MOMO',
  'domestic-card': 'THE',
  cash: 'TIEN_MAT',
}

/** Thông tin phiên giữ chỗ ghế tạm thời */
export interface HoldInfo {
  tripId: number
  seatIds: number[]
  seatCodes: string[]
  secondsLeft: number
}

const toHold = (d: { trip_id: number; seats: Array<{ seat_id: number; code: string }>; seconds_left: number }): HoldInfo => ({
  tripId: d.trip_id,
  seatIds: d.seats.map((x) => x.seat_id),
  seatCodes: d.seats.map((x) => x.code),
  secondsLeft: d.seconds_left,
})

/**
 * Dịch vụ API Đặt vé và Quản lý Giữ chỗ.
 */
export const bookingsApi = {
  /**
   * Giữ chỗ tạm thời cho cả tập ghế (nguyên tử: tất cả thành công hoặc không ghế nào được giữ, tối đa 10 ghế).
   * Endpoint: `POST /trips/{id}/hold`
   *
   * @param tripId - ID chuyến xe
   * @param seatIds - Mảng ID các ghế cần giữ
   * @returns Thông tin giữ chỗ và số giây còn lại trước khi hết hạn
   */
  holdSeats: async (tripId: string | number, seatIds: Array<string | number>): Promise<HoldInfo> => {
    const res = await apiClient.post(`/trips/${tripId}/hold`, { seat_ids: seatIds.map(Number) })
    return toHold(res.data)
  },

  /**
   * Kiểm tra thông tin các ghế tài khoản hiện tại đang giữ chỗ tại chuyến xe này.
   * Endpoint: `GET /trips/{id}/hold`
   * Trả về null nếu không giữ ghế nào hoặc trả về 404.
   */
  myHold: async (tripId: string | number): Promise<HoldInfo | null> => {
    try {
      const res = await apiClient.get(`/trips/${tripId}/hold`)
      return res.data?.seats?.length ? toHold(res.data) : null
    } catch (err) {
      if ((err as AxiosError).response?.status === 404) return null
      throw err
    }
  },

  /**
   * Nhả ghế đang giữ chỗ (giải phóng vị trí để người khác có thể đặt).
   * Bỏ trống tham số `seatIds` sẽ nhả toàn bộ các ghế đang giữ trên chuyến.
   * Endpoint: `POST /trips/{id}/release`
   */
  releaseSeats: async (tripId: string | number, seatIds?: Array<string | number>): Promise<void> => {
    await apiClient.post(`/trips/${tripId}/release`, { seat_ids: seatIds ? seatIds.map(Number) : null })
  },

  /**
   * Luồng hoàn chỉnh Tạo Đơn và Thanh Toán vé trực tuyến:
   * 1. Tra cứu thông tin toàn bộ ghế để map nhãn ghế sang seatId.
   * 2. Gọi API `holdSeats` để xác nhận giữ chỗ nguyên tử.
   * 3. Gọi `POST /orders` tạo đơn hàng với danh sách hành khách từng ghế, điểm đón/trả và mã coupon.
   * 4. Gọi `POST /orders/{id}/pay` với tham số `simulate: 'success'` để thực hiện giao dịch thanh toán.
   * 5. Trả về danh sách vé điện tử đã phát hành.
   *
   * @param data - Thông tin yêu cầu đặt vé
   * @returns Danh sách các vé điện tử thuộc đơn
   */
  create: async (data: BookingRequest): Promise<Ticket[]> => {
    const allSeats = await tripsApi.getSeats(data.tripId)
    const picked = data.passengers.map((p) => {
      const seat = allSeats.find((s) => s.label === p.seatLabel)
      if (!seat) throw new Error(`Không tìm thấy ghế ${p.seatLabel} của chuyến này`)
      return { seat, p }
    })

    // Giữ cả tập ghế (nếu đã giữ ở trang chọn ghế thì backend giữ nguyên thời gian)
    await bookingsApi.holdSeats(data.tripId, picked.map(({ seat }) => seat.id))

    const orderRes = await apiClient.post<BackendOrderOut>('/orders', {
      trip_id: Number(data.tripId),
      items: picked.map(({ seat, p }) => ({
        seat_id: Number(seat.id),
        passenger_name: p.passengerName,
        passenger_phone: p.passengerPhone,
        pickup_stop_id: data.pickupStopId ?? null,
        dropoff_stop_id: data.dropoffStopId ?? null,
      })),
      coupon_code: data.couponCode?.trim() ? data.couponCode.trim().toUpperCase() : null,
    })

    // Nếu phương thức là Tiền mặt tại quầy:
    // Đơn hàng tạo xong ở trạng thái PENDING (Chờ thanh toán). Không gọi API cổng thanh toán online
    // vì nghiệp vụ backend quy định tiền mặt thu trực tiếp tại quầy vé.
    if (data.paymentMethod === 'cash') {
      const tickets = orderRes.data.tickets
      if (!tickets.length) throw new Error('Đơn hàng không có vé')
      return tickets.map((t) => ({ ...toTicket(t), orderId: orderRes.data.id }))
    }

    // Thanh toán đơn hàng trực tuyến: hệ thống tích hợp sandbox mô phỏng thanh toán thành công
    const pay = await apiClient.post<BackendPayOut>(`/orders/${orderRes.data.id}/pay`, {
      method: PAY_METHOD[data.paymentMethod],
      simulate: 'success',
    })
    if (pay.data.result === 'THAT_BAI') throw new Error(pay.data.message || 'Thanh toán không thành công')

    const tickets = pay.data.order.tickets
    if (!tickets.length) throw new Error('Đơn hàng không có vé')
    return tickets.map((t) => ({ ...toTicket(t), orderId: pay.data.order.id }))
  },
}

/**
 * Dịch vụ API Đơn hàng của khách hàng đang đăng nhập.
 */
export const ordersApi = {
  /** Lấy danh sách lịch sử đơn hàng của tài khoản (`GET /orders`) */
  list: async (): Promise<Order[]> => {
    const res = await apiClient.get<BackendOrderOut[]>('/orders')
    return (res.data || []).map(toOrder)
  },

  /** Xem chi tiết một đơn hàng theo ID (`GET /orders/{id}`) */
  get: async (orderId: number): Promise<Order> => {
    const res = await apiClient.get<BackendOrderOut>(`/orders/${orderId}`)
    return toOrder(res.data)
  },

  /** Hủy đơn hàng đang ở trạng thái chờ thanh toán để nhả ghế ngay lập tức (`POST /orders/{id}/cancel-pending`) */
  cancelPending: async (orderId: number): Promise<Order> => {
    const res = await apiClient.post<BackendOrderOut>(`/orders/${orderId}/cancel-pending`)
    return toOrder(res.data)
  },
}

/** Kết quả thẩm định mã giảm giá */
export interface CouponCheck {
  code: string
  discount: number
  finalAmount: number
}

/**
 * Dịch vụ API Mã giảm giá khuyến mãi (Coupons).
 */
export const couponsApi = {
  /**
   * Thẩm định mã giảm giá đối với tổng số tiền của đơn hàng.
   * Endpoint: `POST /coupons/validate`
   *
   * @param code - Mã giảm giá khách nhập
   * @param amount - Tổng tiền tạm tính trước giảm
   * @returns Số tiền được giảm và số tiền còn lại phải thanh toán
   */
  validate: async (code: string, amount: number): Promise<CouponCheck> => {
    const res = await apiClient.post<{ code: string; discount: number; final_amount: number }>('/coupons/validate', {
      code: code.trim().toUpperCase(),
      amount,
    })
    return { code: res.data.code, discount: Number(res.data.discount), finalAmount: Number(res.data.final_amount) }
  },
}

// ---------------------------------------------------------
// QUẦY BÁN VÉ (Nhân viên bán vé POS)
// ---------------------------------------------------------

/** Thông tin ghế và hành khách bán tại quầy */
export interface CounterItem {
  seatId: number
  passengerName: string
  passengerPhone: string
  pickupStopId?: number
  dropoffStopId?: number
}

/**
 * Dịch vụ API Quầy bán vé tại bến xe.
 */
export const counterApi = {
  /**
   * Lập đơn bán vé tại quầy và tự động thu tiền mặt (`method: 'TIEN_MAT'`).
   * Nhân viên cần giữ chỗ trước bằng `bookingsApi.holdSeats`.
   * Nếu thu tiền thất bại, hệ thống tự động hủy đơn chờ để nhả ghế, tránh kẹt chỗ.
   *
   * @param tripId - ID chuyến xe
   * @param items - Danh sách ghế và hành khách
   * @param couponCode - Mã giảm giá nếu có
   */
  createOrder: async (tripId: number, items: CounterItem[], couponCode?: string): Promise<Order> => {
    const res = await apiClient.post<BackendOrderOut>('/counter/orders', {
      trip_id: tripId,
      items: items.map((i) => ({
        seat_id: i.seatId,
        passenger_name: i.passengerName,
        passenger_phone: i.passengerPhone,
        pickup_stop_id: i.pickupStopId ?? null,
        dropoff_stop_id: i.dropoffStopId ?? null,
      })),
      coupon_code: couponCode?.trim() ? couponCode.trim().toUpperCase() : null,
    })
    // Thu tiền mặt để chốt đơn; không chốt được thì nhả ghế, tránh đơn kẹt CHO_THANH_TOAN giữ ghế mãi
    try {
      const pay = await apiClient.post<BackendPayOut>(`/orders/${res.data.id}/pay`, { method: 'TIEN_MAT' })
      if (pay.data.result !== 'THANH_CONG') throw new Error(pay.data.message || 'Thu tiền mặt không thành công')
      return toOrder(pay.data.order)
    } catch (err) {
      await apiClient.post(`/orders/${res.data.id}/cancel-pending`).catch(() => undefined)
      throw err
    }
  },

  /**
   * Đối soát doanh thu ca trực của nhân viên bán vé trong ngày.
   * Endpoint: `GET /counter/orders?date=...`
   *
   * @param date - Ngày đối soát (mặc định hôm nay nếu bỏ trống)
   */
  summary: async (date?: string): Promise<CounterSummary> => {
    const res = await apiClient.get<{
      orders: BackendOrderOut[]
      paid_orders: number
      tickets_sold: number
      revenue: number
      revenue_by_method: Record<string, number>
    }>('/counter/orders', { params: date ? { date } : undefined })
    const d = res.data
    return {
      orders: (d.orders || []).map(toOrder),
      paidOrders: d.paid_orders,
      ticketsSold: d.tickets_sold,
      revenue: Number(d.revenue),
      revenueByMethod: d.revenue_by_method || {},
    }
  },

  /**
   * Lấy lại nội dung phôi vé in nhiệt của đơn hàng (dùng khi in lại vé do kẹt giấy máy in).
   * Endpoint: `GET /counter/orders/{id}/receipts`
   */
  receipts: async (orderId: number): Promise<string[]> => {
    const res = await apiClient.get<{ order_id: number; receipts: string[] }>(`/counter/orders/${orderId}/receipts`)
    return res.data.receipts || []
  },

  /**
   * Hủy vé tại quầy: thực hiện hoàn tiền theo quy định và trả về biên nhận hủy vé để in giấy xác nhận.
   * Endpoint: `POST /counter/tickets/{id}/cancel`
   */
  cancelTicket: async (ticketId: number): Promise<{ refund: TicketRefund; receipt: string }> => {
    const res = await apiClient.post<BackendRefundOut & { receipt: string }>(`/counter/tickets/${ticketId}/cancel`, {})
    return { refund: toRefund(res.data), receipt: res.data.receipt }
  },
}

// ---------------------------------------------------------
// VÉ & HOÀN HỦY VÉ (Customer Tickets & Cancellation)
// ---------------------------------------------------------

/** Báo giá phí hủy vé và số tiền thực tế được hoàn */
export interface CancelQuote {
  canCancel: boolean
  reason?: string
  hoursLeft: number
  feePercent: number
  fee: number
  refundAmount: number
}

/**
 * Dịch vụ API Quản lý vé điện tử của khách hàng.
 */
export const ticketsApi = {
  /**
   * Tải tệp vé điện tử định dạng PDF về máy của người dùng.
   * Endpoint: `GET /tickets/{id}/pdf` (Blob)
   */
  downloadPdf: async (ticketId: number, filename?: string) => {
    try {
      const res = await apiClient.get(`/tickets/${ticketId}/pdf`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename || `VeXe-${ticketId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      const axiosErr = err as AxiosError
      if (axiosErr?.response?.data instanceof Blob) {
        try {
          const text = await axiosErr.response.data.text()
          const json = JSON.parse(text)
          if (json?.detail) {
            throw new Error(typeof json.detail === 'string' ? json.detail : JSON.stringify(json.detail))
          }
        } catch (parseErr) {
          if (parseErr instanceof Error && parseErr.message && !parseErr.message.includes('JSON')) {
            throw parseErr
          }
        }
      }
      throw err
    }
  },

  /** Lấy danh sách toàn bộ vé của tài khoản khách hàng đang đăng nhập (`GET /me/tickets`) */
  mine: async (): Promise<Ticket[]> => {
    const res = await apiClient.get<{ items: BackendTicketOut[] }>('/me/tickets')
    return (res.data?.items || []).map((t) => toTicket(t))
  },

  /** Tra cứu vé thuộc tài khoản theo số điện thoại hành khách khớp */
  findByPhone: async (phone: string): Promise<Ticket[]> => {
    const p = cleanPhone(phone)
    const list = await ticketsApi.mine()
    return list.filter((t) => cleanPhone(t.passengerPhone) === p)
  },

  /**
   * Xem thông tin chi tiết một vé theo mã vé (khách chỉ xem được vé thuộc sở hữu của mình).
   * Trả về null nếu mã vé không tồn tại hoặc lỗi 404.
   */
  get: async (code: string): Promise<Ticket | null> => {
    const id = parseTicketId(code)
    if (id === null) return null
    try {
      const res = await apiClient.get<BackendTicketOut>(`/tickets/${id}`)
      return toTicket(res.data)
    } catch (err) {
      if ((err as AxiosError).response?.status === 404) return null
      throw err
    }
  },

  /**
   * Dự toán chi phí hủy vé và số tiền hoàn trước khi hủy thực sự.
   * Backend kiểm tra thời gian khởi hành: trước 24h thu 15% phí, sát giờ không được hủy.
   * Endpoint: `GET /tickets/{id}/cancel-quote`
   */
  cancelQuote: async (ticketId: number): Promise<CancelQuote> => {
    const res = await apiClient.get<{
      can_cancel: boolean
      reason?: string | null
      hours_left: number
      fee_percent: number
      fee: number
      refund_amount: number
    }>(`/tickets/${ticketId}/cancel-quote`)
    const q = res.data
    return {
      canCancel: q.can_cancel,
      reason: q.reason ?? undefined,
      hoursLeft: q.hours_left,
      feePercent: q.fee_percent,
      fee: Number(q.fee),
      refundAmount: Number(q.refund_amount),
    }
  },

  /**
   * Xác nhận hủy vé chính thức: có hiệu lực ngay lập tức, ghế được trả về trạng thái trống,
   * backend tiến hành lệnh hoàn tiền qua cổng thanh toán tự động.
   * Endpoint: `POST /tickets/{id}/cancel`
   */
  cancel: async (ticketId: number): Promise<TicketRefund> => {
    const res = await apiClient.post<BackendRefundOut>(`/tickets/${ticketId}/cancel`, {})
    return toRefund(res.data)
  },
}

// ---------------------------------------------------------
// XÁC THỰC & TÀI KHOẢN (Authentication & Account Management)
// ---------------------------------------------------------

interface BackendAccount {
  id: number
  phone: string
  full_name: string
  role: 'KHACH_HANG' | 'NHAN_VIEN_BAN_VE' | 'ADMIN'
  status: string
  birth_date?: string | null
  address?: string | null
  must_change_password?: boolean
}

const ROLE: Record<BackendAccount['role'], UserRole> = {
  KHACH_HANG: 'customer',
  NHAN_VIEN_BAN_VE: 'clerk',
  ADMIN: 'admin',
}

const ROLE_API: Record<UserRole, BackendAccount['role']> = {
  customer: 'KHACH_HANG',
  clerk: 'NHAN_VIEN_BAN_VE',
  admin: 'ADMIN',
}

const toUser = (a: BackendAccount): User => ({
  id: String(a.id),
  fullName: a.full_name,
  phone: a.phone,
  role: ROLE[a.role],
  birthDate: a.birth_date ?? undefined,
  address: a.address ?? undefined,
})

/** Loại bỏ khoảng trắng và ký tự phân cách trong chuỗi số điện thoại */
export const cleanPhone = (phone: string) => phone.replace(/[\s.-]/g, '')

/** Danh sách các role được phép đăng nhập vào từng cổng */
const ALLOWED: Record<Portal, UserRole[]> = {
  customer: ['customer'],
  admin: ['admin', 'clerk'],
}

/** Thông báo lỗi khi người dùng đăng nhập nhầm cổng */
const WRONG_PORTAL: Record<Portal, string> = {
  customer: 'Đây là tài khoản nội bộ. Vui lòng đăng nhập tại cổng quản trị.',
  admin: 'Tài khoản này không có quyền quản trị. Khách hàng vui lòng đăng nhập ở trang đặt vé.',
}

/** Thông tin phản hồi khi yêu cầu mã xác nhận OTP */
export interface OtpTicket {
  expiresInSeconds: number
  /** Mã OTP trả trực tiếp khi backend chạy ở môi trường phát triển (SMS_MOCK) */
  testCode?: string
}

const toOtp = (d: { expires_in_seconds: number; mock_otp?: string | null }): OtpTicket => ({
  expiresInSeconds: d.expires_in_seconds,
  testCode: d.mock_otp ?? undefined,
})

/**
 * Dịch vụ API Xác thực tài khoản người dùng và bảo mật phiên.
 */
export const authApi = {
  /**
   * Đăng nhập vào một cổng cụ thể bằng SĐT và mật khẩu.
   * Kiểm tra nghiêm ngặt vai trò người dùng (Customer không được vào Admin và ngược lại).
   * Nếu sai cổng, token bị thu hồi ngay lập tức để bảo vệ hệ thống.
   *
   * @param portal - Cổng đăng nhập ('customer' hoặc 'admin')
   * @param phone - Số điện thoại
   * @param password - Mật khẩu
   */
  login: async (portal: Portal, phone: string, password: string): Promise<User> => {
    const tokenRes = await apiClient.post<{ access_token: string; must_change_password: boolean }>(
      '/auth/login',
      { phone: cleanPhone(phone), password },
    )
    const token = tokenRes.data.access_token
    const headers = { Authorization: `Bearer ${token}` }
    const me = (await apiClient.get<BackendAccount>('/auth/me', { headers })).data
    const user = toUser(me)
    if (!ALLOWED[portal].includes(user.role)) {
      await apiClient.post('/auth/logout', null, { headers }).catch(() => {})
      throw new Error(WRONG_PORTAL[portal])
    }
    saveSession(portal, token, user)
    return user
  },

  /**
   * Phục hồi phiên làm việc đã lưu trong LocalStorage khi tải lại trang.
   * Gọi `GET /auth/me` để xác thực lại tính hợp lệ của token. Nếu token hết hạn (401/403),
   * phiên lưu trữ sẽ bị xóa sạch để yêu cầu đăng nhập lại.
   */
  restore: async (portal: Portal, cached: User | null): Promise<User | null> => {
    const token = getToken(portal)
    if (!token) return null
    try {
      const me = (await apiClient.get<BackendAccount>('/auth/me', { headers: { Authorization: `Bearer ${token}` } })).data
      const user = toUser(me)
      if (!ALLOWED[portal].includes(user.role)) throw new Error('role')
      saveSession(portal, token, user)
      return user
    } catch (err) {
      const status = (err as AxiosError).response?.status
      if (status && status !== 401 && status !== 403) return cached // Giữ phiên nếu là lỗi máy chủ tạm thời
      clearSession(portal)
      return null
    }
  },

  /** Yêu cầu gửi mã OTP để đăng ký tài khoản khách hàng mới (`POST /auth/register/otp`) */
  requestRegisterOtp: async (phone: string): Promise<OtpTicket> => {
    const res = await apiClient.post('/auth/register/otp', { phone: cleanPhone(phone) })
    return toOtp(res.data)
  },

  /** Đăng ký tài khoản mới bằng thông tin và mã OTP, tự động đăng nhập ngay sau khi tạo */
  register: async (data: { fullName: string; phone: string; password: string; otp: string }): Promise<User> => {
    await apiClient.post('/auth/register', {
      full_name: data.fullName.trim(),
      phone: cleanPhone(data.phone),
      password: data.password,
      otp: data.otp,
    })
    return authApi.login('customer', data.phone, data.password)
  },

  /** Yêu cầu mã OTP khôi phục mật khẩu quên (`POST /auth/password/forgot/otp`) */
  requestResetOtp: async (phone: string): Promise<OtpTicket> => {
    const res = await apiClient.post('/auth/password/forgot/otp', { phone: cleanPhone(phone) })
    return toOtp(res.data)
  },

  /** Đặt lại mật khẩu mới bằng mã OTP xác thực (`POST /auth/password/reset`) */
  resetPassword: async (phone: string, otp: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/password/reset', { phone: cleanPhone(phone), otp, new_password: newPassword })
  },

  /** Đổi mật khẩu tài khoản hiện tại: backend sẽ cấp token mới và hủy token cũ (`POST /auth/password/change`) */
  changePassword: async (portal: Portal, current: string, next: string): Promise<void> => {
    const res = await apiClient.post<{ access_token: string }>('/auth/password/change', {
      current_password: current,
      new_password: next,
    })
    replaceToken(portal, res.data.access_token)
  },

  /** Cập nhật thông tin hồ sơ người dùng (`PATCH /auth/me`) và làm mới phiên lưu trữ */
  updateProfile: async (
    portal: Portal,
    data: { fullName?: string; birthDate?: string | null; address?: string | null },
  ): Promise<User> => {
    const res = await apiClient.patch<BackendAccount>('/auth/me', {
      ...(data.fullName !== undefined && { full_name: data.fullName.trim() }),
      ...(data.birthDate !== undefined && { birth_date: data.birthDate || null }),
      ...(data.address !== undefined && { address: data.address?.trim() || null }),
    })
    const user = toUser(res.data)
    const token = getToken(portal)
    if (token) saveSession(portal, token, user)
    return user
  },

  /** Yêu cầu gửi OTP đến số điện thoại MỚI để xác nhận quyền sở hữu (`POST /auth/phone/otp`) */
  requestPhoneChangeOtp: async (newPhone: string): Promise<OtpTicket> => {
    const res = await apiClient.post('/auth/phone/otp', { new_phone: cleanPhone(newPhone) })
    return toOtp(res.data)
  },

  /** Xác nhận đổi số điện thoại bằng OTP và mật khẩu: backend cấp token mới theo SĐT mới */
  changePhone: async (portal: Portal, data: { newPhone: string; otp: string; password: string }): Promise<User> => {
    const res = await apiClient.post<{ access_token: string }>('/auth/phone/change', {
      new_phone: cleanPhone(data.newPhone),
      otp: data.otp,
      password: data.password,
    })
    const headers = { Authorization: `Bearer ${res.data.access_token}` }
    const me = (await apiClient.get<BackendAccount>('/auth/me', { headers })).data
    const user = toUser(me)
    saveSession(portal, res.data.access_token, user)
    return user
  },

  /** Đăng xuất: gửi request vô hiệu hóa token lên backend và xóa bỏ phiên ở LocalStorage */
  logout: async (portal: Portal): Promise<void> => {
    const token = getToken(portal)
    try {
      if (token) await apiClient.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } })
    } catch {
      // Token hết hạn thì coi như đã đăng xuất thành công
    } finally {
      clearSession(portal)
    }
  },
}

// ---------------------------------------------------------
// ADMIN: BÁO CÁO DOANH THU & HOÀN TIỀN
// ---------------------------------------------------------

/** Dữ liệu tổng hợp báo cáo quản trị */
export interface AdminReportData {
  date_from: string
  date_to: string
  gross: number
  refunded: number
  net: number
  net_by_channel: Record<string, number>
  tickets_sold: number
  tickets_cancelled: number
  cancel_rate: number
  occupancy: number
  by_route: Array<{
    route_id: number
    route: string
    gross: number
    refunded: number
    net: number
    tickets_sold: number
    tickets_cancelled: number
  }>
  fill_by_route: Array<{ route_id: number; route: string; sold: number; total: number; rate: number }>
  trips: Array<{ trip_id: number; route: string; departure_at: string; sold: number; total: number; rate: number }>
}

const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Định dạng xuất báo cáo hỗ trợ */
export type ReportFormat = 'csv' | 'xlsx' | 'pdf'

/** Bộ lọc báo cáo */
export interface ReportFilter {
  routeId?: number
  channel?: 'TRUC_TUYEN' | 'TAI_QUAY'
}

/**
 * Dịch vụ API Báo cáo thống kê dành cho Quản trị viên.
 */
export const adminReportsApi = {
  /** Lấy dữ liệu tổng hợp báo cáo doanh thu, tỷ lệ lấp đầy xe và số vé bán theo khoảng thời gian (`GET /admin/reports`) */
  getSummary: async (dateFrom?: string, dateTo?: string, filter: ReportFilter = {}): Promise<AdminReportData> => {
    const now = Date.now()
    const res = await apiClient.get<AdminReportData>('/admin/reports', {
      params: {
        date_from: dateFrom || ymd(new Date(now - 45 * 86400000)),
        date_to: dateTo || ymd(new Date(now + 15 * 86400000)),
        route_id: filter.routeId,
        channel: filter.channel,
      },
    })
    return res.data
  },

  /** Xuất và tải báo cáo định dạng CSV, Excel (.xlsx) hoặc PDF về máy tính */
  download: async (format: ReportFormat, dateFrom: string, dateTo: string, filter: ReportFilter = {}): Promise<void> => {
    const url = { csv: '/admin/reports/export.csv', xlsx: '/admin/reports/export.xlsx', pdf: '/admin/reports/export.pdf' }[format]
    const res = await apiClient.get<Blob>(url, {
      params: { date_from: dateFrom, date_to: dateTo, route_id: filter.routeId, channel: filter.channel },
      responseType: 'blob',
      timeout: 30000,
    })
    const name = /filename="?([^";]+)"?/.exec(res.headers['content-disposition'] ?? '')?.[1] ?? `bao-cao-${dateFrom}-${dateTo}.${format}`
    const href = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = href
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  },
}

/**
 * Dịch vụ API Quản lý Hoàn tiền cho Quản trị viên.
 */
export const adminRefundsApi = {
  /** Lấy danh sách các lệnh hoàn tiền (mặc định các lệnh CHO_XU_LY_THU_CONG) (`GET /admin/refunds`) */
  list: async (status?: string): Promise<BackendRefundOut[]> => {
    const res = await apiClient.get<BackendRefundOut[]>('/admin/refunds', {
      params: status !== undefined ? { status } : undefined,
    })
    return res.data || []
  },

  /** Xử lý lại lệnh hoàn tiền bị lỗi kết nối cổng thanh toán (`POST /admin/refunds/{id}/retry`) */
  retry: async (refundId: number): Promise<TicketRefund> => {
    const res = await apiClient.post<BackendRefundOut>(`/admin/refunds/${refundId}/retry`)
    return toRefund(res.data)
  },
}

export interface AdminOrderRow {
  id: number
  code?: string
  customer: string
  channel: 'TRUC_TUYEN' | 'TAI_QUAY'
  clerkId: number | null
  ticketCount: number
  total: number
  status: 'CHO_THANH_TOAN' | 'DA_THANH_TOAN' | 'DA_HUY'
  createdAt: string
}

export interface AdminOrderListOut {
  items: AdminOrderRow[]
  total: number
  message?: string | null
}

export interface AdminOrderDetailData extends Order {
  clerkId?: number | null
  refunds: TicketRefund[]
}

export interface AdminOrderFilter {
  status?: string
  channel?: string
  date_from?: string
  date_to?: string
  phone?: string
  order_id?: number
  ticket_id?: number
  page?: number
  limit?: number
}

/**
 * Dịch vụ API Quản trị Đơn hàng.
 */
export const adminOrdersApi = {
  /** Lấy danh sách đơn hàng có phân trang và bộ lọc nâng cao (`GET /admin/orders`) */
  list: async (params?: AdminOrderFilter): Promise<AdminOrderListOut> => {
    const res = await apiClient.get<{
      items: Array<{
        id: number
        customer: string
        channel: 'TRUC_TUYEN' | 'TAI_QUAY'
        clerk_id: number | null
        ticket_count: number
        total: number | string
        status: 'CHO_THANH_TOAN' | 'DA_THANH_TOAN' | 'DA_HUY'
        created_at: string
      }>
      total: number
      message?: string | null
    }>('/admin/orders', { params })
    return {
      items: (res.data?.items || []).map((o) => ({
        id: o.id,
        code: (o as any).code,
        customer: o.customer,
        channel: o.channel,
        clerkId: o.clerk_id,
        ticketCount: o.ticket_count,
        total: Number(o.total),
        status: o.status,
        createdAt: o.created_at,
      })),
      total: res.data?.total ?? 0,
      message: res.data?.message ?? undefined,
    }
  },

  /** Xem chi tiết một đơn hàng kèm thông tin nhân viên xử lý và danh sách lệnh hoàn tiền */
  get: async (orderId: number): Promise<AdminOrderDetailData> => {
    const res = await apiClient.get<BackendOrderOut & { clerk_id?: number | null; refunds?: BackendRefundOut[] }>(
      `/admin/orders/${orderId}`,
    )
    const base = toOrder(res.data)
    const refunds = (res.data.refunds || []).map(toRefund)
    return {
      ...base,
      clerkId: res.data.clerk_id,
      refunds,
    }
  },
}

/**
 * Dịch vụ API Quản trị Vé xe.
 * Tổng hợp vé từ các đơn gần nhất kèm trạng thái hoàn tiền đang chờ.
 */
export const adminTicketsApi = {
  list: async (orderLimit = 30): Promise<Ticket[]> => {
    const [orders, refunds] = await Promise.all([
      apiClient.get<{ items: Array<{ id: number }> }>('/admin/orders', { params: { limit: orderLimit } }),
      adminRefundsApi.list(),
    ])
    const byTicket = new Map<number, BackendRefundOut>(refunds.map((r) => [r.ticket_id, r]))
    const details = await Promise.all(
      (orders.data?.items || []).map((o) =>
        apiClient
          .get<{ tickets: BackendTicketOut[]; channel?: string; refunds?: BackendRefundOut[] }>(`/admin/orders/${o.id}`)
          .then((r) => r.data)
          .catch(() => null),
      ),
    )
    const tickets: Ticket[] = []
    for (const d of details) {
      const doneRefunds = new Map<number, BackendRefundOut>((d?.refunds || []).map((r) => [r.ticket_id, r]))
      for (const t of d?.tickets || []) {
        tickets.push(toTicket({ ...t, channel: t.channel ?? d?.channel }, byTicket.get(t.id) ?? doneRefunds.get(t.id)))
      }
    }
    const have = new Set(tickets.map((t) => t.id))
    const missing = refunds.filter((r) => !have.has(r.ticket_id))
    const extra = await Promise.all(
      missing.map((r) =>
        apiClient
          .get<BackendTicketOut>(`/tickets/${r.ticket_id}`)
          .then((res) => toTicket(res.data, r))
          .catch(() => null),
      ),
    )
    return [...extra.filter((t): t is Ticket => t !== null), ...tickets]
  },
}

// ---------------------------------------------------------
// ADMIN: QUẢN TRỊ TUYẾN ĐƯỜNG, CHUYẾN XE, XE KHÁCH
// ---------------------------------------------------------

export interface AdminRoute {
  id: number
  code?: string
  origin: string
  destination: string
  distanceKm: number | null
  expectedMinutes: number | null
  status: string
}

/**
 * Dịch vụ API Quản trị Danh mục Tuyến đường.
 */
export const adminRoutesApi = {
  list: async (): Promise<AdminRoute[]> => adminRoutesApi.getAll(),

  /** Lấy danh sách toàn bộ các tuyến đường (`GET /admin/routes`) */
  getAll: async (): Promise<AdminRoute[]> => {
    const res = await apiClient.get<
      Array<{ id: number; code?: string | null; origin: string; destination: string; distance_km: number | null; expected_minutes: number | null; status: string }>
    >('/admin/routes')
    return (res.data || []).map((r) => ({
      id: r.id,
      code: r.code ?? undefined,
      origin: r.origin,
      destination: r.destination,
      distanceKm: r.distance_km,
      expectedMinutes: r.expected_minutes,
      status: r.status,
    }))
  },

  /** Tạo mới một tuyến đường xe chạy (`POST /admin/routes`) */
  create: async (data: { origin: string; destination: string; distanceKm?: number | null; expectedMinutes?: number | null }): Promise<void> => {
    await apiClient.post('/admin/routes', {
      origin: data.origin.trim(),
      destination: data.destination.trim(),
      distance_km: data.distanceKm ?? null,
      expected_minutes: data.expectedMinutes ?? null,
    })
  },

  /** Cập nhật thông tin tuyến đường hoặc bật/ngừng khai thác (`PATCH /admin/routes/{id}`) */
  update: async (
    id: number,
    data: { origin?: string; destination?: string; distanceKm?: number | null; expectedMinutes?: number | null; status?: 'HOAT_DONG' | 'NGUNG' },
  ): Promise<void> => {
    await apiClient.patch(`/admin/routes/${id}`, {
      ...(data.origin !== undefined && { origin: data.origin.trim() }),
      ...(data.destination !== undefined && { destination: data.destination.trim() }),
      ...(data.distanceKm !== undefined && { distance_km: data.distanceKm }),
      ...(data.expectedMinutes !== undefined && { expected_minutes: data.expectedMinutes }),
      ...(data.status !== undefined && { status: data.status }),
    })
  },
}

export interface AdminTrip extends Trip {
  routeId: number
  vehicleId: number
}

export interface AdminTripQuery {
  date?: string
  dateFrom?: string
}

/**
 * Dịch vụ API Quản trị Chuyến xe.
 */
export const adminTripsApi = {
  list: async (query?: AdminTripQuery): Promise<AdminTrip[]> => (await adminTripsApi.listPage(query)).items,

  /** Lấy danh sách chuyến xe theo ngày/khoảng ngày với giới hạn tối đa 500 dòng/lần (`GET /admin/trips`) */
  listPage: async (query: AdminTripQuery = {}): Promise<{ items: AdminTrip[]; total: number }> => {
    const res = await apiClient.get<BackendTripOut[]>('/admin/trips', {
      params: { limit: 500, date: query.date, date_from: query.dateFrom },
    })
    const items = (res.data || []).map((t) => ({ ...toTrip(t), routeId: t.route_id, vehicleId: t.vehicle_id }))
    return { items, total: Number(res.headers['x-total-count'] ?? items.length) }
  },

  /** Lập lịch một chuyến xe mới với tuyến, phương tiện, giờ khởi hành, giá vé và các điểm đón/trả (`POST /admin/trips`) */
  create: async (data: {
    routeId: number
    vehicleId: number
    date: string
    time: string
    price: number
    pickupPoints: string[]
    dropoffPoints: string[]
  }): Promise<AdminTrip> => {
    const res = await apiClient.post<BackendTripOut>('/admin/trips', {
      route_id: data.routeId,
      vehicle_id: data.vehicleId,
      departure_date: data.date,
      departure_time: data.time.length === 5 ? `${data.time}:00` : data.time,
      price: data.price,
      pickup_points: data.pickupPoints,
      dropoff_points: data.dropoffPoints,
    })
    return { ...toTrip(res.data), routeId: res.data.route_id, vehicleId: res.data.vehicle_id }
  },

  /**
   * Điều chỉnh lịch chạy (ngày/giờ/xe/ghi chú): backend tự động gửi SMS thông báo tới toàn bộ hành khách đã mua vé.
   * Trả về số lượng hành khách đã được gửi thông báo.
   */
  update: async (
    tripId: string | number,
    data: { date?: string; time?: string; vehicleId?: number; note?: string | null },
  ): Promise<{ notifiedPassengers: number }> => {
    const res = await apiClient.patch<{ notified_passengers?: number }>(`/admin/trips/${tripId}`, {
      ...(data.date !== undefined && { departure_date: data.date }),
      ...(data.time !== undefined && { departure_time: data.time.length === 5 ? `${data.time}:00` : data.time }),
      ...(data.vehicleId !== undefined && { vehicle_id: data.vehicleId }),
      ...(data.note !== undefined && { note: data.note }),
    })
    return { notifiedPassengers: res.data?.notified_passengers ?? 0 }
  },

  /** Điều chỉnh giá vé của chuyến xe (`PATCH /admin/trips/{id}/price`) */
  updatePrice: async (tripId: string | number, price: number): Promise<void> => {
    await apiClient.patch(`/admin/trips/${tripId}/price`, { price })
  },

  /** Hủy chuyến xe: backend tự động hoàn tiền 100% cho mọi hành khách đã thanh toán vé (`POST /admin/trips/{id}/cancel`) */
  cancel: async (tripId: string | number, reason: string): Promise<void> => {
    await apiClient.post(`/admin/trips/${tripId}/cancel`, { reason })
  },
}

export interface AdminBus {
  id: number
  plate: string
  brand: string
  typeName: string
  vehicleTypeId: number
  seatCount: number
  active: boolean
  manufactureYear: number | null
  note: string
}

export interface VehicleType {
  id: number
  name: string
  description: string
}

export interface VehicleLayout {
  floors: number // 1–2 tầng
  rows: number // 1–30 hàng
  seatsPerRow: number // 1–6 ghế mỗi hàng
}

interface BackendVehicle {
  id: number
  plate: string
  vehicle_type_id: number
  vehicle_type_name?: string | null
  brand?: string | null
  manufacture_year?: number | null
  status: string
  note?: string | null
  seat_count: number
}

const toBus = (v: BackendVehicle): AdminBus => ({
  id: v.id,
  plate: v.plate,
  brand: v.brand ?? '',
  typeName: v.vehicle_type_name ?? '',
  vehicleTypeId: v.vehicle_type_id,
  seatCount: v.seat_count,
  active: v.status === 'HOAT_DONG',
  manufactureYear: v.manufacture_year ?? null,
  note: v.note ?? '',
})

const layoutBody = (l: VehicleLayout) => ({ floors: l.floors, rows: l.rows, seats_per_row: l.seatsPerRow })

/**
 * Dịch vụ API Quản trị Đội xe và Sơ đồ Ghế.
 */
export const adminBusesApi = {
  /** Lấy danh sách toàn bộ xe khách trong hệ thống (`GET /admin/vehicles`) */
  getAll: async (): Promise<AdminBus[]> => {
    const res = await apiClient.get<BackendVehicle[]>('/admin/vehicles')
    return (res.data || []).map(toBus)
  },

  /** Xem chi tiết thông số xe và danh sách ghế thực tế (`GET /admin/vehicles/{id}`) */
  getDetail: async (vehicleId: number) => {
    const res = await apiClient.get<{
      seats: Array<{ id: number; code: string; floor: number; row_no: number; col_no: number }>
    }>(`/admin/vehicles/${vehicleId}`)
    return res.data
  },

  /** Thêm mới xe vào đội xe kèm sơ đồ ghế khởi tạo (`POST /admin/vehicles`) */
  create: async (data: {
    plate: string
    vehicleTypeId: number
    brand?: string
    manufactureYear?: number | null
    note?: string
    layout: VehicleLayout
  }): Promise<AdminBus> => {
    const res = await apiClient.post<BackendVehicle>('/admin/vehicles', {
      plate: data.plate.trim().toUpperCase(),
      vehicle_type_id: data.vehicleTypeId,
      brand: data.brand?.trim() || null,
      manufacture_year: data.manufactureYear ?? null,
      note: data.note?.trim() || null,
      layout: layoutBody(data.layout),
    })
    return toBus(res.data)
  },

  /** Cập nhật thông số biển số, thương hiệu, năm sản xuất của xe (`PATCH /admin/vehicles/{id}`) */
  update: async (
    id: number,
    data: { plate?: string; vehicleTypeId?: number; brand?: string | null; manufactureYear?: number | null; note?: string | null },
  ): Promise<AdminBus> => {
    const res = await apiClient.patch<BackendVehicle>(`/admin/vehicles/${id}`, {
      ...(data.plate !== undefined && { plate: data.plate.trim().toUpperCase() }),
      ...(data.vehicleTypeId !== undefined && { vehicle_type_id: data.vehicleTypeId }),
      ...(data.brand !== undefined && { brand: data.brand }),
      ...(data.manufactureYear !== undefined && { manufacture_year: data.manufactureYear }),
      ...(data.note !== undefined && { note: data.note }),
    })
    return toBus(res.data)
  },

  /** Kích hoạt hoặc tạm ngừng hoạt động xe (backend từ chối nếu xe đang có chuyến sắp chạy) */
  setActive: async (id: number, active: boolean): Promise<AdminBus> => {
    const res = await apiClient.post<BackendVehicle>(`/admin/vehicles/${id}/${active ? 'activate' : 'deactivate'}`)
    return toBus(res.data)
  },

  /** Tái thiết kế lại toàn bộ sơ đồ ghế của xe theo số tầng, số hàng và số ghế mỗi hàng (`PUT /admin/vehicles/{id}/seats`) */
  replaceLayout: async (id: number, layout: VehicleLayout) => {
    const res = await apiClient.put<{ seats: Array<{ id: number; code: string; floor: number; row_no: number; col_no: number }> }>(
      `/admin/vehicles/${id}/seats`,
      layoutBody(layout),
    )
    return res.data
  },
}

export const adminVehiclesApi = {
  list: async (): Promise<AdminBus[]> => adminBusesApi.getAll(),
  get: async (vehicleId: number) => adminBusesApi.getDetail(vehicleId),
  create: async (data: Parameters<typeof adminBusesApi.create>[0]) => adminBusesApi.create(data),
  update: async (id: number, data: Parameters<typeof adminBusesApi.update>[1]) => adminBusesApi.update(id, data),
  activate: async (id: number): Promise<AdminBus> => adminBusesApi.setActive(id, true),
  deactivate: async (id: number): Promise<AdminBus> => adminBusesApi.setActive(id, false),
  replaceLayout: async (id: number, layout: VehicleLayout) => adminBusesApi.replaceLayout(id, layout),
}

/**
 * Dịch vụ API Quản trị Loại phương tiện (Ghế ngồi, Giường nằm, Limousine...).
 */
export const adminVehicleTypesApi = {
  list: async (): Promise<VehicleType[]> => {
    const res = await apiClient.get<Array<{ id: number; name: string; description?: string | null }>>('/admin/vehicle-types')
    return (res.data || []).map((t) => ({ id: t.id, name: t.name, description: t.description ?? '' }))
  },

  create: async (data: { name: string; description?: string }): Promise<VehicleType> => {
    const res = await apiClient.post<{ id: number; name: string; description?: string | null }>('/admin/vehicle-types', {
      name: data.name.trim(),
      description: data.description?.trim() || null,
    })
    return { id: res.data.id, name: res.data.name, description: res.data.description ?? '' }
  },
}

// ---------------------------------------------------------
// ADMIN: BẢNG GIÁ & VOUCHER KHUYẾN MÃI
// ---------------------------------------------------------

export interface AdminVoucher {
  id: number
  code: string
  kind: 'PHAN_TRAM' | 'SO_TIEN'
  value: number
  maxDiscount: number | null
  minOrder: number
  validTo: string
  active: boolean
  used: number
  quantity: number
}

interface BackendCoupon {
  id: number
  code: string
  kind: 'PHAN_TRAM' | 'SO_TIEN'
  value: number
  max_discount?: number | null
  min_order: number
  quantity: number
  valid_to: string
  status: string
  used: number
}

const toVoucher = (c: BackendCoupon): AdminVoucher => ({
  id: c.id,
  code: c.code,
  kind: c.kind,
  value: Number(c.value),
  maxDiscount: c.max_discount != null ? Number(c.max_discount) : null,
  minOrder: Number(c.min_order),
  validTo: c.valid_to,
  active: c.status === 'BAT',
  used: c.used,
  quantity: c.quantity,
})

/**
 * Dịch vụ API Quản trị Bảng giá & Voucher khuyến mãi.
 */
export const adminPricingApi = {
  /** Lấy danh sách toàn bộ các mã giảm giá trong hệ thống (`GET /admin/coupons`) */
  getVouchers: async (): Promise<AdminVoucher[]> => {
    const res = await apiClient.get<BackendCoupon[]>('/admin/coupons')
    return (res.data || []).map(toVoucher)
  },

  /** Tạo mới một mã giảm giá khuyến mãi (`POST /admin/coupons`) */
  createVoucher: async (data: {
    code: string
    kind: 'PHAN_TRAM' | 'SO_TIEN'
    value: number
    maxDiscount?: number | null
    minOrder: number
    quantity: number
    validFrom: string
    validTo: string
  }): Promise<AdminVoucher> => {
    const res = await apiClient.post<BackendCoupon>('/admin/coupons', {
      code: data.code.trim().toUpperCase(),
      kind: data.kind,
      value: data.value,
      max_discount: data.maxDiscount ?? null,
      min_order: data.minOrder,
      quantity: data.quantity,
      valid_from: data.validFrom,
      valid_to: data.validTo,
    })
    return toVoucher(res.data)
  },

  /** Bật hoặc tắt trạng thái kích hoạt của mã giảm giá (`PATCH /admin/coupons/{id}`) */
  setVoucherActive: async (voucherId: number, active: boolean): Promise<AdminVoucher> => {
    const res = await apiClient.patch<BackendCoupon>(`/admin/coupons/${voucherId}`, { status: active ? 'BAT' : 'TAT' })
    return toVoucher(res.data)
  },
}

export const adminCouponsApi = {
  list: async (): Promise<AdminVoucher[]> => adminPricingApi.getVouchers(),
  create: async (data: Parameters<typeof adminPricingApi.createVoucher>[0]) => adminPricingApi.createVoucher(data),
  toggle: async (voucherId: number, active: boolean): Promise<AdminVoucher> =>
    adminPricingApi.setVoucherActive(voucherId, active),
}

// ---------------------------------------------------------
// ADMIN: QUẢN TRỊ TÀI KHOẢN NGƯỜI DÙNG & NHÂN VIÊN
// ---------------------------------------------------------

export interface AdminAccount {
  id: number
  fullName: string
  phone: string
  role: UserRole
  locked: boolean
  mustChangePassword: boolean
}

export interface AccountActivity {
  action: string
  at: string
  byAccountId: number
  objectType?: string
  objectId?: number
  detail?: string
}

export interface AdminAccountDetail extends AdminAccount {
  unusedTickets: number
  activity: AccountActivity[]
}

const toAdminAccount = (u: BackendAccount): AdminAccount => ({
  id: u.id,
  fullName: u.full_name,
  phone: u.phone,
  role: ROLE[u.role],
  locked: u.status !== 'HOAT_DONG',
  mustChangePassword: !!u.must_change_password,
})

/**
 * Dịch vụ API Quản trị Tài khoản người dùng và phân quyền.
 */
export const adminAccountsApi = {
  list: async (): Promise<AdminAccount[]> => adminAccountsApi.getAll(),
  get: async (userId: number): Promise<AdminAccountDetail> => adminAccountsApi.getDetail(userId),
  createStaff: async (data: { phone: string; fullName: string; role?: UserRole }) => adminAccountsApi.create(data),

  /** Lấy danh sách toàn bộ tài khoản trong hệ thống (`GET /admin/users`) */
  getAll: async (): Promise<AdminAccount[]> => {
    const res = await apiClient.get<BackendAccount[]>('/admin/users')
    return (res.data || []).map(toAdminAccount)
  },

  /** Xem chi tiết tài khoản kèm lịch sử nhật ký hoạt động (`GET /admin/users/{id}`) */
  getDetail: async (userId: number): Promise<AdminAccountDetail> => {
    const res = await apiClient.get<
      BackendAccount & {
        unused_tickets: number
        activity: Array<{ action: string; at: string; by_account_id: number; object_type?: string | null; object_id?: number | null; detail?: string | null }>
      }
    >(`/admin/users/${userId}`)
    const d = res.data
    return {
      ...toAdminAccount(d),
      unusedTickets: d.unused_tickets,
      activity: (d.activity || []).map((a) => ({
        action: a.action,
        at: a.at,
        byAccountId: a.by_account_id,
        objectType: a.object_type ?? undefined,
        objectId: a.object_id ?? undefined,
        detail: a.detail ?? undefined,
      })),
    }
  },

  /** Tạo mới tài khoản nhân viên; mật khẩu tạm chỉ được hiển thị một lần duy nhất (`POST /admin/users`) */
  create: async (data: { phone: string; fullName: string; role?: UserRole }): Promise<{ account: AdminAccount; tempPassword: string }> => {
    const res = await apiClient.post<BackendAccount & { temp_password: string }>('/admin/users', {
      phone: cleanPhone(data.phone),
      full_name: data.fullName.trim(),
      role: ROLE_API[data.role ?? 'clerk'],
    })
    return { account: toAdminAccount(res.data), tempPassword: res.data.temp_password }
  },

  /** Cập nhật họ tên hoặc thay đổi vai trò phân quyền của tài khoản (`PATCH /admin/users/{id}`) */
  update: async (userId: number, data: { fullName?: string; role?: UserRole }): Promise<AdminAccount> => {
    const res = await apiClient.patch<BackendAccount>(`/admin/users/${userId}`, {
      ...(data.fullName !== undefined && { full_name: data.fullName.trim() }),
      ...(data.role !== undefined && { role: ROLE_API[data.role] }),
    })
    return toAdminAccount(res.data)
  },

  /** Đặt lại mật khẩu tài khoản về mật khẩu tạm ngẫu nhiên (`POST /admin/users/{id}/reset-password`) */
  resetPassword: async (userId: number): Promise<string> => {
    const res = await apiClient.post<{ temp_password: string }>(`/admin/users/${userId}/reset-password`)
    return res.data.temp_password
  },

  /** Khóa tài khoản người dùng (`POST /admin/users/{id}/lock`), có cảnh báo nếu người dùng còn vé chưa đi */
  lock: async (userId: number): Promise<{ account: AdminAccount; warning?: string }> => {
    const res = await apiClient.post<BackendAccount & { warning?: string | null }>(`/admin/users/${userId}/lock`)
    return { account: toAdminAccount(res.data), warning: res.data.warning ?? undefined }
  },

  /** Mở khóa tài khoản người dùng (`POST /admin/users/{id}/unlock`) */
  unlock: async (userId: number): Promise<AdminAccount> => {
    const res = await apiClient.post<BackendAccount>(`/admin/users/${userId}/unlock`)
    return toAdminAccount(res.data)
  },
}

export const adminUsersApi = {
  list: async (): Promise<AdminAccount[]> => adminAccountsApi.getAll(),
  get: async (userId: number): Promise<AdminAccountDetail> => adminAccountsApi.getDetail(userId),
  createStaff: async (data: { phone: string; fullName: string; role?: UserRole }) => adminAccountsApi.create(data),
  update: async (userId: number, data: { fullName?: string; role?: UserRole }) => adminAccountsApi.update(userId, data),
  lock: async (userId: number) => adminAccountsApi.lock(userId),
  unlock: async (userId: number) => adminAccountsApi.unlock(userId),
  resetPassword: async (userId: number) => adminAccountsApi.resetPassword(userId),
}

// ---------------------------------------------------------
// ADMIN: THAM SỐ CẤU HÌNH HỆ THỐNG
// ---------------------------------------------------------

export interface AdminSetting {
  name: string // THOI_GIAN_GIU_CHO_PHUT | PHI_HUY_PHAN_TRAM | HAN_HUY_VE_GIO
  value: string
  description: string
}

/**
 * Dịch vụ API Quản trị Tham số Hệ thống.
 */
export const adminSettingsApi = {
  /** Lấy danh mục các tham số cấu hình toàn cục (`GET /admin/settings`) */
  list: async (): Promise<AdminSetting[]> => {
    const res = await apiClient.get<Array<{ name: string; value: string; description?: string | null }>>('/admin/settings')
    return (res.data || []).map((s) => ({ name: s.name, value: s.value, description: s.description ?? '' }))
  },

  /** Cập nhật giá trị một tham số cấu hình hệ thống (`PATCH /admin/settings/{name}`) */
  update: async (name: string, value: number): Promise<AdminSetting> => {
    const res = await apiClient.patch<{ name: string; value: string; description?: string | null }>(`/admin/settings/${name}`, { value })
    return { name: res.data.name, value: res.data.value, description: res.data.description ?? '' }
  },
}

// ---------------------------------------------------------
// NHÂN VIÊN: SOÁT VÉ LÊN XE (Ticket Check-in / Verification)
// ---------------------------------------------------------

/**
 * Dịch vụ API Dành cho Nhân viên Soát vé tại cửa xe.
 */
export const staffApi = {
  /**
   * Tra cứu vé linh hoạt theo:
   * - Mã vé định dạng chuẩn ("VE-261112-0001")
   * - ID số nguyên vé ("17" hoặc "VE-17")
   * - Số điện thoại hành khách ("0912345678")
   * - Nội dung chuỗi quét mã QR
   * Endpoint: `GET /tickets/lookup`
   */
  lookup: async (input: string): Promise<Ticket[]> => {
    const q = input.trim()
    const id = parseTicketId(q)
    const params: Record<string, string | number> = {}
    if (/^VE-\d{6}-\d+$/i.test(q)) {
      params.code = q.toUpperCase()
    } else if (id !== null) {
      params.ticket_id = id
    } else if (/^0\d{9,10}$/.test(cleanPhone(q))) {
      params.phone = cleanPhone(q)
    } else {
      params.qr = q
    }
    const res = await apiClient.get<BackendTicketOut[]>('/tickets/lookup', { params })
    return (res.data || []).map((t) => toTicket(t))
  },

  /**
   * Thẩm tra và đưa ra kết luận hợp lệ để khách lên xe dựa trên trạng thái thực tế của vé trong CSDL.
   * Quy tắc nghiệp vụ:
   * - 'CHUA_DI': HỢP LỆ (khách được phép lên xe).
   * - 'DA_HOAN_THANH': KHÔNG HỢP LỆ (vé đã được sử dụng trước đó).
   * - 'DA_HUY': KHÔNG HỢP LỆ (vé đã bị hủy hoàn tiền).
   * - 'CHO_THANH_TOAN': KHÔNG HỢP LỆ (chưa hoàn tất thanh toán).
   */
  verify: async (input: string): Promise<CheckinResult> => {
    let tickets: Ticket[]
    try {
      tickets = await staffApi.lookup(input)
    } catch (err) {
      if ((err as AxiosError).response?.status === 404) return { valid: false, message: 'Không tìm thấy vé trong hệ thống' }
      throw err
    }
    if (tickets.length === 0) return { valid: false, message: 'Không tìm thấy vé trong hệ thống' }
    // Nếu cùng số điện thoại có nhiều vé, ưu tiên lấy vé hợp lệ đang chờ đi (CHUA_DI)
    const ticket = tickets.find((t) => t.status === 'CHUA_DI') ?? tickets[0]
    switch (ticket.status) {
      case 'CHUA_DI':
        return { valid: true, message: 'Vé hợp lệ, đã thanh toán', ticket }
      case 'DA_HOAN_THANH':
        return { valid: false, message: 'Vé đã hoàn thành chuyến đi', ticket }
      case 'DA_HUY':
        return { valid: false, message: 'Vé đã bị hủy', ticket }
      case 'CHO_THANH_TOAN':
        return { valid: false, message: 'Vé chưa thanh toán', ticket }
      default:
        return { valid: false, message: `Trạng thái vé không xác định: ${ticket.status}`, ticket }
    }
  },
}
