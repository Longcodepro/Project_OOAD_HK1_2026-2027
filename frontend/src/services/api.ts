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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
  headers: { 'Content-Type': 'application/json' },
})

// Gắn token của cổng đang mở (khách hoặc quản trị) vào mọi request
apiClient.interceptors.request.use((config) => {
  const token = getToken(currentPortal())
  if (token && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/** Lấy thông báo lỗi tiếng Việt do backend trả (`detail` / `message` / `error`), hoặc thông báo chung. */
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

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const res = await apiClient.get('/health', { timeout: 3000 })
    return res.status === 200 && res.data?.status === 'ok'
  } catch {
    return false
  }
}

// ---------------------------------------------------------
// Định dạng dùng chung
// ---------------------------------------------------------
export const formatVnd = (n: number) => `${Math.round(n).toLocaleString('vi-VN')} ₫`

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

export const formatDuration = (minutes: number | null | undefined): string => {
  if (!minutes || minutes <= 0) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h && m ? `${h} giờ ${m} phút` : h ? `${h} giờ` : `${m} phút`
}

// ---------------------------------------------------------
// Kiểu dữ liệu backend
// ---------------------------------------------------------
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

interface BackendSeatOut {
  seat_id: number
  code: string
  floor: number
  row_no: number
  col_no: number
  state: 'TRONG' | 'TAM_KHOA' | 'DA_BAN'
  hold_until?: string | null
}

export interface BackendTicketOut {
  id: number
  code?: string | null
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

interface BackendPayOut {
  result: 'THANH_CONG' | 'THAT_BAI' | 'DANG_XU_LY'
  message?: string | null
  qr_content?: string | null
  order: BackendOrderOut
}

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
// Bộ ánh xạ duy nhất: backend → kiểu của giao diện
// ---------------------------------------------------------
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
  }
}

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

/** "VE-261112-0017", "VE-17", "17" → 17; không phải mã vé số thì trả null. */
export const parseTicketId = (code: string): number | null => {
  const m = code.trim().match(/^(?:VE-)?(?:(?:\d{6}-)?(\d+))$/i)
  return m ? Number(m[1]) : null
}

// ---------------------------------------------------------
// TUYẾN & CHUYẾN (công khai)
// ---------------------------------------------------------
export const routesApi = {
  /** Các tuyến đang có chuyến sắp chạy, kèm giá thấp nhất. */
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

export const tripsApi = {
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
// ĐẶT VÉ (khách hàng đã đăng nhập)
// ---------------------------------------------------------
const PAY_METHOD: Record<BookingRequest['paymentMethod'], string> = {
  vietqr: 'VIETQR',
  'e-wallet': 'MOMO',
  'domestic-card': 'THE',
}

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

export const bookingsApi = {
  /** Giữ chỗ tạm thời; trả về số giây còn lại theo backend. */
  holdSeat: async (tripId: string | number, seatId: string | number): Promise<{ secondsLeft: number }> => {
    const res = await apiClient.post<{ seconds_left?: number }>(`/trips/${tripId}/hold`, {
      seat_ids: [Number(seatId)],
    })
    return { secondsLeft: res.data?.seconds_left ?? 0 }
  },

  /** Giữ nhiều ghế một lúc (bán vé tại quầy). */
  holdSeats: async (tripId: string | number, seatIds: Array<string | number>): Promise<HoldInfo> => {
    const res = await apiClient.post(`/trips/${tripId}/hold`, { seat_ids: seatIds.map(Number) })
    return toHold(res.data)
  },

  /** Các ghế mình đang giữ ở một chuyến (null nếu không giữ ghế nào). */
  myHold: async (tripId: string | number): Promise<HoldInfo | null> => {
    try {
      const res = await apiClient.get(`/trips/${tripId}/hold`)
      return res.data?.seats?.length ? toHold(res.data) : null
    } catch (err) {
      if ((err as AxiosError).response?.status === 404) return null
      throw err
    }
  },

  /** Nhả ghế đang giữ (bỏ trống `seatIds` = nhả hết). */
  releaseSeats: async (tripId: string | number, seatIds?: Array<string | number>): Promise<void> => {
    await apiClient.post(`/trips/${tripId}/release`, { seat_ids: seatIds ? seatIds.map(Number) : null })
  },

  create: async (data: BookingRequest): Promise<Ticket> => {
    const seat = (await tripsApi.getSeats(data.tripId)).find((s) => s.label === data.seatLabel)
    if (!seat) throw new Error(`Không tìm thấy ghế ${data.seatLabel} của chuyến này`)

    // Giữ chỗ (nếu đã giữ rồi thì backend gia hạn); lỗi thật được ném ra cho giao diện
    await bookingsApi.holdSeat(data.tripId, seat.id)

    const orderRes = await apiClient.post<BackendOrderOut>('/orders', {
      trip_id: Number(data.tripId),
      items: [
        {
          seat_id: Number(seat.id),
          passenger_name: data.passengerName,
          passenger_phone: data.passengerPhone,
          pickup_stop_id: data.pickupStopId ?? null,
          dropoff_stop_id: data.dropoffStopId ?? null,
        },
      ],
      coupon_code: data.couponCode?.trim() ? data.couponCode.trim().toUpperCase() : null,
    })

    // Cổng thanh toán của hệ thống là cổng giả (backend hỗ trợ tham số `simulate`);
    // chưa có cổng thật nên luôn mô phỏng thanh toán thành công.
    const pay = await apiClient.post<BackendPayOut>(`/orders/${orderRes.data.id}/pay`, {
      method: PAY_METHOD[data.paymentMethod],
      simulate: 'success',
    })
    if (pay.data.result === 'THAT_BAI') throw new Error(pay.data.message || 'Thanh toán không thành công')

    const ticket = pay.data.order.tickets[0]
    if (!ticket) throw new Error('Đơn hàng không có vé')
    return { ...toTicket(ticket), orderId: pay.data.order.id }
  },
}

/** Đơn hàng của khách đang đăng nhập. */
export const ordersApi = {
  list: async (): Promise<Order[]> => {
    const res = await apiClient.get<BackendOrderOut[]>('/orders')
    return (res.data || []).map(toOrder)
  },

  get: async (orderId: number): Promise<Order> => {
    const res = await apiClient.get<BackendOrderOut>(`/orders/${orderId}`)
    return toOrder(res.data)
  },

  /** Hủy đơn đang chờ thanh toán (nhả ghế ngay). */
  cancelPending: async (orderId: number): Promise<Order> => {
    const res = await apiClient.post<BackendOrderOut>(`/orders/${orderId}/cancel-pending`)
    return toOrder(res.data)
  },
}

export interface CouponCheck {
  code: string
  discount: number
  finalAmount: number
}

export const couponsApi = {
  /** Kiểm tra mã giảm giá cho một số tiền; ném lỗi tiếng Việt của backend nếu mã không dùng được. */
  validate: async (code: string, amount: number): Promise<CouponCheck> => {
    const res = await apiClient.post<{ code: string; discount: number; final_amount: number }>('/coupons/validate', {
      code: code.trim().toUpperCase(),
      amount,
    })
    return { code: res.data.code, discount: Number(res.data.discount), finalAmount: Number(res.data.final_amount) }
  },
}

// ---------------------------------------------------------
// QUẦY BÁN VÉ (nhân viên bán vé)
// ---------------------------------------------------------
export interface CounterItem {
  seatId: number
  passengerName: string
  passengerPhone: string
  pickupStopId?: number
  dropoffStopId?: number
}

export const counterApi = {
  /** Lập phiếu bán vé tại quầy. Nhân viên phải giữ chỗ ghế trước (bookingsApi.holdSeats). */
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
    return toOrder(res.data)
  },

  /** Đối soát doanh thu quầy của chính nhân viên trong ngày (mặc định hôm nay). */
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

  /** Nội dung vé giấy (gọi lại để in lại khi máy in lỗi). */
  receipts: async (orderId: number): Promise<string[]> => {
    const res = await apiClient.get<{ order_id: number; receipts: string[] }>(`/counter/orders/${orderId}/receipts`)
    return res.data.receipts || []
  },

  /** Hủy vé tại quầy: trả thông tin hoàn tiền và biên nhận hủy để in. */
  cancelTicket: async (ticketId: number): Promise<{ refund: TicketRefund; receipt: string }> => {
    const res = await apiClient.post<BackendRefundOut & { receipt: string }>(`/counter/tickets/${ticketId}/cancel`, {})
    return { refund: toRefund(res.data), receipt: res.data.receipt }
  },
}

// ---------------------------------------------------------
// VÉ
// ---------------------------------------------------------
export interface CancelQuote {
  canCancel: boolean
  reason?: string
  hoursLeft: number
  feePercent: number
  fee: number
  refundAmount: number
}

export const ticketsApi = {
  /** Tải file vé điện tử PDF. */
  downloadPdf: async (ticketId: number, filename?: string) => {
    const res = await apiClient.get(`/tickets/${ticketId}/pdf`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename || `VeXe-${ticketId}.pdf`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
  },

  /** Lịch sử vé của khách đang đăng nhập. */
  mine: async (): Promise<Ticket[]> => {
    const res = await apiClient.get<{ items: BackendTicketOut[] }>('/me/tickets')
    return (res.data?.items || []).map((t) => toTicket(t))
  },

  /** Tra cứu các vé của khách có số điện thoại khớp (dựa trên danh sách vé của tài khoản). */
  findByPhone: async (phone: string): Promise<Ticket[]> => {
    const p = cleanPhone(phone)
    const list = await ticketsApi.mine()
    return list.filter((t) => cleanPhone(t.passengerPhone) === p)
  },

  /** Xem một vé theo mã (khách chỉ xem được vé của mình). Không có thì trả null. */
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

  /** Phí và số tiền hoàn nếu hủy ngay bây giờ (theo chính sách của backend). */
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

  /** Hủy vé: có hiệu lực ngay, backend tự hoàn tiền (hoặc chuyển xử lý thủ công nếu cổng từ chối). */
  cancel: async (ticketId: number): Promise<TicketRefund> => {
    const res = await apiClient.post<BackendRefundOut>(`/tickets/${ticketId}/cancel`, {})
    return toRefund(res.data)
  },
}

// ---------------------------------------------------------
// ĐĂNG NHẬP / TÀI KHOẢN (số điện thoại + mật khẩu, đúng như backend)
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

export const cleanPhone = (phone: string) => phone.replace(/[\s.-]/g, '')

const ALLOWED: Record<Portal, UserRole[]> = {
  customer: ['customer'],
  admin: ['admin', 'clerk'],
}

const WRONG_PORTAL: Record<Portal, string> = {
  customer: 'Đây là tài khoản nội bộ. Vui lòng đăng nhập tại cổng quản trị.',
  admin: 'Tài khoản này không có quyền quản trị. Khách hàng vui lòng đăng nhập ở trang đặt vé.',
}

export interface OtpTicket {
  expiresInSeconds: number
  /** Chỉ có khi backend chạy chế độ SMS thử nghiệm (SMS_MOCK): mã OTP được trả thẳng về. */
  testCode?: string
}

const toOtp = (d: { expires_in_seconds: number; mock_otp?: string | null }): OtpTicket => ({
  expiresInSeconds: d.expires_in_seconds,
  testCode: d.mock_otp ?? undefined,
})

export const authApi = {
  /**
   * Đăng nhập vào một cổng. Token chỉ được lưu khi vai trò của tài khoản
   * thuộc về cổng đó; ngược lại phiên bị thu hồi ngay.
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

  /** Kiểm tra token đã lưu còn hiệu lực không; trả user mới nhất hoặc null (và xóa phiên hỏng). */
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
      if (status && status !== 401 && status !== 403) return cached // lỗi máy chủ tạm thời: giữ phiên cũ
      clearSession(portal)
      return null
    }
  },

  requestRegisterOtp: async (phone: string): Promise<OtpTicket> => {
    const res = await apiClient.post('/auth/register/otp', { phone: cleanPhone(phone) })
    return toOtp(res.data)
  },

  /** Đăng ký rồi đăng nhập luôn vào cổng khách. */
  register: async (data: { fullName: string; phone: string; password: string; otp: string }): Promise<User> => {
    await apiClient.post('/auth/register', {
      full_name: data.fullName.trim(),
      phone: cleanPhone(data.phone),
      password: data.password,
      otp: data.otp,
    })
    return authApi.login('customer', data.phone, data.password)
  },

  requestResetOtp: async (phone: string): Promise<OtpTicket> => {
    const res = await apiClient.post('/auth/password/forgot/otp', { phone: cleanPhone(phone) })
    return toOtp(res.data)
  },

  resetPassword: async (phone: string, otp: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/password/reset', { phone: cleanPhone(phone), otp, new_password: newPassword })
  },

  /** Đổi mật khẩu: backend cấp token mới và vô hiệu token cũ. */
  changePassword: async (portal: Portal, current: string, next: string): Promise<void> => {
    const res = await apiClient.post<{ access_token: string }>('/auth/password/change', {
      current_password: current,
      new_password: next,
    })
    replaceToken(portal, res.data.access_token)
  },

  /** Cập nhật hồ sơ (chỉ gửi trường có giá trị) và làm mới phiên đã lưu. */
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

  /** Gửi OTP tới SỐ MỚI để xác nhận bạn sở hữu số đó. */
  requestPhoneChangeOtp: async (newPhone: string): Promise<OtpTicket> => {
    const res = await apiClient.post('/auth/phone/otp', { new_phone: cleanPhone(newPhone) })
    return toOtp(res.data)
  },

  /** Đổi SĐT: backend cấp token mới; phiên và hồ sơ đã lưu được cập nhật theo. */
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

  logout: async (portal: Portal): Promise<void> => {
    const token = getToken(portal)
    try {
      if (token) await apiClient.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } })
    } catch {
      // token đã hết hạn thì cũng coi như đã đăng xuất
    } finally {
      clearSession(portal)
    }
  },
}

// ---------------------------------------------------------
// ADMIN: BÁO CÁO, VÉ & HOÀN TIỀN
// ---------------------------------------------------------
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

export type ReportFormat = 'csv' | 'xlsx' | 'pdf'

/** Bộ lọc báo cáo: theo tuyến và/hoặc kênh bán. */
export interface ReportFilter {
  routeId?: number
  channel?: 'TRUC_TUYEN' | 'TAI_QUAY'
}

export const adminReportsApi = {
  /** Mặc định: 45 ngày trước đến 15 ngày tới. */
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

  /** Tải báo cáo về máy (CSV / Excel / PDF) với cùng bộ lọc như getSummary. */
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

export const adminRefundsApi = {
  /** Mặc định backend chỉ trả các lệnh đang CHO_XU_LY_THU_CONG. */
  list: async (status?: string): Promise<BackendRefundOut[]> => {
    const res = await apiClient.get<BackendRefundOut[]>('/admin/refunds', {
      params: status !== undefined ? { status } : undefined,
    })
    return res.data || []
  },

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

export const adminOrdersApi = {
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

/** Vé trong các đơn gần nhất, kèm lệnh hoàn tiền đang chờ (nếu có). */
export const adminTicketsApi = {
  // ponytail: backend chưa có API liệt kê vé cho admin nên gom từ N đơn gần nhất (1 request/đơn);
  // thêm GET /admin/tickets nếu cần xem toàn bộ.
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
    // Lệnh hoàn đang chờ có thể thuộc đơn cũ hơn N đơn gần nhất: nạp riêng vé đó để không bị sót
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
// ADMIN: TUYẾN, CHUYẾN, XE
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

export const adminRoutesApi = {
  list: async (): Promise<AdminRoute[]> => adminRoutesApi.getAll(),

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

  create: async (data: { origin: string; destination: string; distanceKm?: number | null; expectedMinutes?: number | null }): Promise<void> => {
    await apiClient.post('/admin/routes', {
      origin: data.origin.trim(),
      destination: data.destination.trim(),
      distance_km: data.distanceKm ?? null,
      expected_minutes: data.expectedMinutes ?? null,
    })
  },

  /** `status`: 'HOAT_DONG' (đang chạy) hoặc 'NGUNG' (ngừng). */
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

/** Chuyến trong màn quản trị: thêm mã tuyến/xe để thao tác. */
export interface AdminTrip extends Trip {
  routeId: number
  vehicleId: number
}

export const adminTripsApi = {
  list: async (): Promise<AdminTrip[]> => adminTripsApi.getAll(),

  getAll: async (): Promise<AdminTrip[]> => {
    const res = await apiClient.get<BackendTripOut[]>('/admin/trips')
    return (res.data || []).map((t) => ({ ...toTrip(t), routeId: t.route_id, vehicleId: t.vehicle_id }))
  },

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

  /** Đổi giờ/ngày/xe/ghi chú; backend tự báo SMS cho hành khách đã có vé. Trả số hành khách được báo. */
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

  updatePrice: async (tripId: string | number, price: number): Promise<void> => {
    await apiClient.patch(`/admin/trips/${tripId}/price`, { price })
  },

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
  floors: number // 1–2
  rows: number // 1–30
  seatsPerRow: number // 1–6
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

export const adminBusesApi = {
  getAll: async (): Promise<AdminBus[]> => {
    const res = await apiClient.get<BackendVehicle[]>('/admin/vehicles')
    return (res.data || []).map(toBus)
  },

  getDetail: async (vehicleId: number) => {
    const res = await apiClient.get<{
      seats: Array<{ id: number; code: string; floor: number; row_no: number; col_no: number }>
    }>(`/admin/vehicles/${vehicleId}`)
    return res.data
  },

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

  /** Ngừng/kích hoạt xe (backend từ chối nếu xe còn chuyến sắp chạy và báo lý do). */
  setActive: async (id: number, active: boolean): Promise<AdminBus> => {
    const res = await apiClient.post<BackendVehicle>(`/admin/vehicles/${id}/${active ? 'activate' : 'deactivate'}`)
    return toBus(res.data)
  },

  /** Dựng lại sơ đồ ghế theo số tầng/hàng/ghế mỗi hàng. */
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
// ADMIN: MÃ GIẢM GIÁ
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

export const adminPricingApi = {
  getVouchers: async (): Promise<AdminVoucher[]> => {
    const res = await apiClient.get<BackendCoupon[]>('/admin/coupons')
    return (res.data || []).map(toVoucher)
  },

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

  /** Bật/tắt mã giảm giá (PATCH với trạng thái mong muốn). */
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
// ADMIN: TÀI KHOẢN
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

export const adminAccountsApi = {
  list: async (): Promise<AdminAccount[]> => adminAccountsApi.getAll(),
  get: async (userId: number): Promise<AdminAccountDetail> => adminAccountsApi.getDetail(userId),
  createStaff: async (data: { phone: string; fullName: string; role?: UserRole }) => adminAccountsApi.create(data),

  getAll: async (): Promise<AdminAccount[]> => {
    const res = await apiClient.get<BackendAccount[]>('/admin/users')
    return (res.data || []).map(toAdminAccount)
  },

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

  /** Tạo tài khoản nhân viên; mật khẩu tạm chỉ hiện đúng một lần. */
  create: async (data: { phone: string; fullName: string; role?: UserRole }): Promise<{ account: AdminAccount; tempPassword: string }> => {
    const res = await apiClient.post<BackendAccount & { temp_password: string }>('/admin/users', {
      phone: cleanPhone(data.phone),
      full_name: data.fullName.trim(),
      role: ROLE_API[data.role ?? 'clerk'],
    })
    return { account: toAdminAccount(res.data), tempPassword: res.data.temp_password }
  },

  update: async (userId: number, data: { fullName?: string; role?: UserRole }): Promise<AdminAccount> => {
    const res = await apiClient.patch<BackendAccount>(`/admin/users/${userId}`, {
      ...(data.fullName !== undefined && { full_name: data.fullName.trim() }),
      ...(data.role !== undefined && { role: ROLE_API[data.role] }),
    })
    return toAdminAccount(res.data)
  },

  /** Đặt lại mật khẩu: trả mật khẩu tạm (chỉ hiện một lần). */
  resetPassword: async (userId: number): Promise<string> => {
    const res = await apiClient.post<{ temp_password: string }>(`/admin/users/${userId}/reset-password`)
    return res.data.temp_password
  },

  /** Khóa tài khoản; `warning` (nếu có) cho biết ví dụ còn vé chưa đi. */
  lock: async (userId: number): Promise<{ account: AdminAccount; warning?: string }> => {
    const res = await apiClient.post<BackendAccount & { warning?: string | null }>(`/admin/users/${userId}/lock`)
    return { account: toAdminAccount(res.data), warning: res.data.warning ?? undefined }
  },

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
// ADMIN: THAM SỐ HỆ THỐNG
// ---------------------------------------------------------
export interface AdminSetting {
  name: string // THOI_GIAN_GIU_CHO_PHUT | PHI_HUY_PHAN_TRAM | HAN_HUY_VE_GIO
  value: string
  description: string
}

export const adminSettingsApi = {
  list: async (): Promise<AdminSetting[]> => {
    const res = await apiClient.get<Array<{ name: string; value: string; description?: string | null }>>('/admin/settings')
    return (res.data || []).map((s) => ({ name: s.name, value: s.value, description: s.description ?? '' }))
  },

  update: async (name: string, value: number): Promise<AdminSetting> => {
    const res = await apiClient.patch<{ name: string; value: string; description?: string | null }>(`/admin/settings/${name}`, { value })
    return { name: res.data.name, value: res.data.value, description: res.data.description ?? '' }
  },
}

// ---------------------------------------------------------
// NHÂN VIÊN: SOÁT VÉ (tra cứu thật; backend chưa có API ghi nhận lên xe)
// ---------------------------------------------------------
export const staffApi = {
  /** Tra cứu vé theo mã vé (VE-261112-0001 / VE-17 / 17), nội dung QR, hoặc SĐT (có thể ra nhiều vé). */
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

  /** Kết luận hợp lệ hay không dựa trên trạng thái vé trong cơ sở dữ liệu. */
  verify: async (input: string): Promise<CheckinResult> => {
    let tickets: Ticket[]
    try {
      tickets = await staffApi.lookup(input)
    } catch (err) {
      if ((err as AxiosError).response?.status === 404) return { valid: false, message: 'Không tìm thấy vé trong hệ thống' }
      throw err
    }
    if (tickets.length === 0) return { valid: false, message: 'Không tìm thấy vé trong hệ thống' }
    // Cùng SĐT có thể có nhiều vé: ưu tiên vé còn hiệu lực
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
