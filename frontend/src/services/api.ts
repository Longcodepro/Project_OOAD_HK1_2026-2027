import axios from 'axios'
import type {
  Trip,
  Seat,
  BookingRequest,
  Ticket,
  CheckinResult,
  User,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 3500,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Trạng thái kết nối Backend
let isBackendLive = false
export const getBackendStatus = () => isBackendLive

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const res = await apiClient.get('/health', { timeout: 2000 })
    isBackendLive = res.status === 200
    return isBackendLive
  } catch {
    isBackendLive = false
    return false
  }
}

// ---------------------------------------------------------
// MOCK DATA CƠ BẢN ĐỂ PHỤC VỤ KHI CHƯA CHẠY BACKEND
const INITIAL_TRIPS: Trip[] = [
  {
    id: 'TRIP-001',
    time: '05:30',
    arrive: '11:45',
    operator: 'Limousine 34 Phòng',
    seats: 14,
    price: 380000,
    priceFormatted: '380.000đ',
    tag: 'Chuyến sớm',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: 'Bến xe Miền Đông mới',
    dropoffPoint: 'VP Đà Lạt, 01 Quang Trung',
    busType: 'Limousine 34 Phòng Luxury',
    amenities: ['Wi-Fi 5G', 'Nước suối', 'Cổng sạc Type-C', 'Rèm che riêng'],
  },
  {
    id: 'TRIP-002',
    time: '07:00',
    arrive: '13:15',
    operator: 'Cabin đơn Royal Suite',
    seats: 9,
    price: 430000,
    priceFormatted: '430.000đ',
    tag: 'Khởi hành sáng',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: '272 Đề Thám, Quận 1',
    dropoffPoint: 'VP Đà Lạt, 01 Quang Trung',
    busType: 'Cabin 22 Phòng VIP',
    amenities: ['Màn hình giải trí', 'Cổng sạc USB', 'Nước suối', 'Chăn ấm'],
  },
  {
    id: 'TRIP-003',
    time: '08:30',
    arrive: '14:45',
    operator: 'Limousine Giường nằm',
    seats: 8,
    price: 390000,
    priceFormatted: '390.000đ',
    tag: 'Phổ biến',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: 'Bến xe Miền Tây',
    dropoffPoint: 'Bến xe liên tỉnh Đà Lạt',
    busType: 'Limousine 34 Phòng Luxury',
    amenities: ['Wi-Fi 5G', 'Nước suối', 'Khăn lạnh', 'Đèn đọc sách'],
  },
  {
    id: 'TRIP-004',
    time: '10:15',
    arrive: '16:20',
    operator: 'Cabin đôi First Class',
    seats: 4,
    price: 520000,
    priceFormatted: '520.000đ',
    tag: 'Được yêu thích',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 05 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: '272 Đề Thám, Quận 1',
    dropoffPoint: 'VP Đà Lạt, 01 Quang Trung',
    busType: 'Cabin đôi First Class',
    amenities: ['Massage', 'Màn hình HD', 'Bữa ăn nhẹ', 'Tai nghe chống ồn'],
  },
  {
    id: 'TRIP-005',
    time: '11:45',
    arrive: '18:00',
    operator: 'SkyBus Luxury Cabin',
    seats: 6,
    price: 460000,
    priceFormatted: '460.000đ',
    tag: 'Giờ trưa',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: 'Bến xe Miền Đông mới',
    dropoffPoint: 'VP Đà Lạt, 01 Quang Trung',
    busType: 'SkyBus 24 Phòng',
    amenities: ['Wi-Fi tốc độ cao', 'Ghế massage', 'Ổ cắm điện 220V', 'Nước suối'],
  },
  {
    id: 'TRIP-006',
    time: '13:30',
    arrive: '19:45',
    operator: 'Limousine 34 Phòng',
    seats: 11,
    price: 390000,
    priceFormatted: '390.000đ',
    tag: 'Giờ đẹp chiều',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: '272 Đề Thám, Quận 1',
    dropoffPoint: 'Bến xe liên tỉnh Đà Lạt',
    busType: 'Limousine 34 Phòng Luxury',
    amenities: ['Wi-Fi 5G', 'Nước suối', 'Cổng sạc Type-C', 'Rèm che'],
  },
  {
    id: 'TRIP-007',
    time: '15:15',
    arrive: '21:30',
    operator: 'Cabin đơn Luxury',
    seats: 7,
    price: 430000,
    priceFormatted: '430.000đ',
    tag: 'Chiều êm dịu',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: 'Bến xe Miền Tây',
    dropoffPoint: 'VP Đà Lạt, 01 Quang Trung',
    busType: 'Cabin 22 Phòng VIP',
    amenities: ['Màn hình TV riêng', 'Chăn gối cao cấp', 'Nước uống', 'Cổng USB'],
  },
  {
    id: 'TRIP-008',
    time: '17:00',
    arrive: '23:15',
    operator: 'Limousine Giường nằm VIP',
    seats: 10,
    price: 410000,
    priceFormatted: '410.000đ',
    tag: 'Hoàng hôn',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: 'Bến xe Miền Đông mới',
    dropoffPoint: 'Bến xe liên tỉnh Đà Lạt',
    busType: 'Limousine 34 Phòng',
    amenities: ['Wi-Fi 5G', 'Khăn lạnh', 'Nước suối', 'Ổ cắm sạc'],
  },
  {
    id: 'TRIP-009',
    time: '19:30',
    arrive: '01:45',
    operator: 'Royal Cabin Suite',
    seats: 5,
    price: 490000,
    priceFormatted: '490.000đ',
    tag: 'Chuyến tối',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: '272 Đề Thám, Quận 1',
    dropoffPoint: 'VP Đà Lạt, 01 Quang Trung',
    busType: 'Royal Cabin Suite 20',
    amenities: ['Massage rung đa điểm', 'Bánh ngọt & Trà', 'Màn hình cảm ứng', 'Wi-Fi'],
  },
  {
    id: 'TRIP-010',
    time: '21:00',
    arrive: '03:15',
    operator: 'Cabin đôi First Class',
    seats: 3,
    price: 540000,
    priceFormatted: '540.000đ',
    tag: 'Chạy đêm êm ái',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: '272 Đề Thám, Quận 1',
    dropoffPoint: 'VP Đà Lạt, 01 Quang Trung',
    busType: 'Cabin đôi First Class',
    amenities: ['Nệm cao su thiên nhiên', 'Chống rung tối tân', 'Đèn ngủ dịu mắt', 'Tai nghe cao cấp'],
  },
  {
    id: 'TRIP-011',
    time: '22:30',
    arrive: '04:45',
    operator: 'Limousine 34 Phòng',
    seats: 12,
    price: 450000,
    priceFormatted: '450.000đ',
    tag: 'Tiết kiệm thời gian',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: 'Bến xe Miền Tây',
    dropoffPoint: 'Bến xe liên tỉnh Đà Lạt',
    busType: 'Limousine 34 Phòng',
    amenities: ['Wi-Fi 5G', 'Nước suối', 'Chăn ấm', 'Đệm gối êm'],
  },
  {
    id: 'TRIP-012',
    time: '23:45',
    arrive: '06:00',
    operator: 'Limousine Giường nằm Express',
    seats: 15,
    price: 390000,
    priceFormatted: '390.000đ',
    tag: 'Chuyến khuya',
    fromCity: 'TP. Hồ Chí Minh',
    toCity: 'Đà Lạt',
    duration: '6 giờ 15 phút · Trực tiếp',
    date: new Date().toISOString().slice(0, 10),
    pickupPoint: 'Bến xe Miền Đông mới',
    dropoffPoint: 'VP Đà Lạt, 01 Quang Trung',
    busType: 'Limousine Giường nằm',
    amenities: ['Wi-Fi', 'Nước khoáng', 'Chăn nhung', 'Cổng sạc'],
  },
]

// Mock tickets storage trong localStorage để lưu giữ qua các trang
const STORAGE_TICKETS_KEY = 'violetline_tickets'
const getStoredTickets = (): Ticket[] => {
  try {
    const data = localStorage.getItem(STORAGE_TICKETS_KEY)
    if (data) return JSON.parse(data)
  } catch (err) {
    console.error('Error reading stored tickets:', err)
  }
  return [
    {
      bookingCode: 'VL-8N4X-27',
      ticketCode: 'TDV-092482',
      tripId: 'TRIP-002',
      route: 'Sài Gòn → Đà Lạt',
      departureTime: '10:15',
      arrivalTime: '16:20',
      date: '24.10.2026',
      busType: 'V01 · Cabin đôi First Class',
      passengerName: 'Nguyễn Minh Anh',
      passengerPhone: '0901234567',
      passengerEmail: 'minhanh.nguyen@gmail.com',
      seatNumber: 'A01',
      pickupPoint: '272 Đề Thám, Quận 1',
      dropoffPoint: '01 Quang Trung, Đà Lạt',
      basePrice: 472727,
      vat: 47273,
      totalAmount: 520000,
      paymentStatus: 'PAID',
      checkinStatus: 'NOT_CHECKED_IN',
      qrData: 'VL-8N4X-27|TDV-092482|A01|NguyenMinhAnh',
      createdAt: new Date().toISOString(),
    },
  ]
}

const saveStoredTickets = (tickets: Ticket[]) => {
  try {
    localStorage.setItem(STORAGE_TICKETS_KEY, JSON.stringify(tickets))
  } catch (err) {
    console.error('Error saving stored tickets:', err)
  }
}

// ---------------------------------------------------------
// SERVICES API (Kết nối Backend với fallback Mock)
// ---------------------------------------------------------

export const tripsApi = {
  // Tìm kiếm chuyến xe
  search: async (fromCity: string, toCity: string, date: string): Promise<Trip[]> => {
    try {
      const res = await apiClient.get<Trip[]>('/trips', {
        params: { from: fromCity, to: toCity, date },
      })
      isBackendLive = true
      return res.data
    } catch (err) {
      console.warn('[API: Mock Mode] Không kết nối được backend /api/trips, dùng mock data:', err)
      isBackendLive = false
      // Trả về mock data phù hợp với tuyến tìm kiếm
      return INITIAL_TRIPS.map((t) => ({
        ...t,
        fromCity: fromCity || t.fromCity,
        toCity: toCity || t.toCity,
        date: date || t.date,
      }))
    }
  },

  // Lấy danh sách ghế của chuyến
  getSeats: async (tripId: string): Promise<Seat[]> => {
    try {
      const res = await apiClient.get<Seat[]>(`/trips/${tripId}/seats`)
      isBackendLive = true
      return res.data
    } catch (err) {
      console.warn(`[API: Mock Mode] Backend /api/trips/${tripId}/seats chưa sẵn sàng, tạo mock seats:`, err)
      isBackendLive = false
      const unavailable = ['A03', 'A08', 'A14', 'B03', 'B08', 'B15']
      const seats: Seat[] = []
      for (const prefix of ['A', 'B']) {
        const floor = prefix === 'A' ? 1 : 2
        for (let i = 1; i <= 18; i++) {
          const label = `${prefix}${String(i).padStart(2, '0')}`
          seats.push({
            id: `${tripId}-${label}`,
            label,
            floor: floor as 1 | 2,
            status: unavailable.includes(label) ? 'booked' : 'available',
            price: 520000,
          })
        }
      }
      return seats
    }
  },
}

export const bookingsApi = {
  // Tạm khóa chỗ (Giữ chỗ 5 phút theo quy trình OOAD)
  holdSeat: async (tripId: string, seatLabel: string): Promise<{ success: boolean; expirySeconds: number }> => {
    try {
      const res = await apiClient.post('/bookings/hold', { tripId, seatLabel })
      isBackendLive = true
      return res.data
    } catch (err) {
      console.warn('[API: Mock Mode] Backend /api/bookings/hold chưa chạy, mô phỏng tạm khóa ghế:', err)
      return { success: true, expirySeconds: 300 }
    }
  },

  // Tạo đơn đặt vé và thanh toán
  create: async (data: BookingRequest): Promise<Ticket> => {
    try {
      const res = await apiClient.post<Ticket>('/bookings', data)
      isBackendLive = true
      const ticket = res.data
      const current = getStoredTickets()
      saveStoredTickets([ticket, ...current])
      return ticket
    } catch (err) {
      console.warn('[API: Mock Mode] Backend /api/bookings chưa chạy, tạo vé mô phỏng:', err)
      const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase()
      const randomTicketNum = Math.floor(100000 + Math.random() * 900000)
      const basePrice = Math.round(data.totalAmount / 1.1)
      const vat = data.totalAmount - basePrice

      const newTicket: Ticket = {
        bookingCode: `VL-${randomCode}-27`,
        ticketCode: `TDV-${randomTicketNum}`,
        tripId: data.tripId,
        route: `${data.pickupPoint.includes('Sài Gòn') || data.pickupPoint.includes('Quận 1') ? 'Sài Gòn' : 'TP. Hồ Chí Minh'} → ${data.dropoffPoint.includes('Đà Lạt') ? 'Đà Lạt' : 'Nha Trang'}`,
        departureTime: '10:15',
        arrivalTime: '16:20',
        date: new Date().toLocaleDateString('vi-VN'),
        busType: 'V01 · Cabin đôi First Class',
        passengerName: data.passenger.fullName || 'Nguyễn Minh Anh',
        passengerPhone: data.passenger.phone || '090 123 4567',
        passengerEmail: data.passenger.email || 'minhanh.nguyen@gmail.com',
        seatNumber: `${data.seatLabel} · ${data.seatLabel.startsWith('A') ? 'Tầng 1' : 'Tầng 2'}`,
        pickupPoint: data.pickupPoint,
        dropoffPoint: data.dropoffPoint,
        basePrice,
        vat,
        totalAmount: data.totalAmount,
        paymentStatus: 'PAID',
        checkinStatus: 'NOT_CHECKED_IN',
        qrData: `VL-${randomCode}-27|TDV-${randomTicketNum}|${data.seatLabel}|${data.passenger.fullName}`,
        createdAt: new Date().toISOString(),
      }

      const current = getStoredTickets()
      saveStoredTickets([newTicket, ...current])
      return newTicket
    }
  },
}

export const ticketsApi = {
  // Lấy danh sách vé đã đặt
  getAll: async (): Promise<Ticket[]> => {
    try {
      const res = await apiClient.get<Ticket[]>('/tickets')
      isBackendLive = true
      return res.data
    } catch {
      return getStoredTickets()
    }
  },

  // Tra cứu vé theo mã
  getByCode: async (code: string, phone?: string): Promise<Ticket | null> => {
    try {
      const res = await apiClient.get<Ticket>(`/tickets/${code}`, {
        params: { phone },
      })
      isBackendLive = true
      return res.data
    } catch {
      const list = getStoredTickets()
      return list.find((t) => t.bookingCode === code || t.ticketCode === code) || null
    }
  },
}

export const crewApi = {
  // Soát vé / quét mã QR lên xe
  verifyTicket: async (qrDataOrCode: string): Promise<CheckinResult> => {
    try {
      const res = await apiClient.post<CheckinResult>('/crew/checkin', { qrData: qrDataOrCode })
      isBackendLive = true
      return res.data
    } catch (err) {
      console.warn('[API: Mock Mode] Backend /api/crew/checkin chưa chạy, mô phỏng quét QR:', err)
      const list = getStoredTickets()
      const found = list.find((t) =>
        qrDataOrCode.includes(t.ticketCode) ||
        qrDataOrCode.includes(t.bookingCode) ||
        t.qrData.includes(qrDataOrCode),
      ) || list[0]

      if (found) {
        found.checkinStatus = 'CHECKED_IN'
        saveStoredTickets(list)
        return {
          valid: true,
          message: 'Vé hợp lệ — Xác nhận lên xe thành công',
          ticket: found,
        }
      }

      return {
        valid: false,
        message: 'Mã vé không tồn tại hoặc chưa thanh toán',
      }
    }
  },
}

export const authApi = {
  // Gửi OTP qua Phone / Email
  sendOtp: async (identifier: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiClient.post('/auth/otp', { identifier })
      isBackendLive = true
      return res.data
    } catch {
      return { success: true, message: `Mã OTP xác thực đã gửi tới ${identifier}: 123456` }
    }
  },

  // Xác thực OTP
  verifyOtp: async (identifier: string, otp: string): Promise<{ success: boolean; user: User }> => {
    try {
      const res = await apiClient.post('/auth/verify', { identifier, otp })
      isBackendLive = true
      return res.data
    } catch {
      return {
        success: true,
        user: {
          id: 'USR-01',
          fullName: 'Nguyễn Minh Anh',
          phone: identifier.includes('@') ? '0901234567' : identifier,
          email: identifier.includes('@') ? identifier : 'minhanh.nguyen@gmail.com',
          tier: 'Violet Explorer',
          points: 1250,
        },
      }
    }
  },

  // Đăng nhập bằng Email & Mật khẩu
  loginWithEmail: async (email: string, _password: string): Promise<{ success: boolean; user: User; message?: string }> => {
    try {
      const res = await apiClient.post('/auth/login', { email, password: _password })
      isBackendLive = true
      return res.data
    } catch {
      return {
        success: true,
        user: {
          id: 'USR-01',
          fullName: 'Nguyễn Minh Anh',
          phone: '0901234567',
          email,
          tier: 'Violet Explorer',
          points: 1250,
        },
      }
    }
  },

  // Gửi mã đặt lại mật khẩu qua Email
  sendPasswordResetEmail: async (email: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiClient.post('/auth/forgot-password', { email })
      isBackendLive = true
      return res.data
    } catch {
      return {
        success: true,
        message: `Mã xác nhận đặt lại mật khẩu đã gửi tới ${email}. Mã OTP mẫu: 654321`,
      }
    }
  },

  // Xác nhận đổi/đặt lại mật khẩu
  resetPassword: async (email: string, otp: string, _newPass: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await apiClient.post('/auth/reset-password', { email, otp, newPassword: _newPass })
      isBackendLive = true
      return res.data
    } catch {
      return {
        success: true,
        message: 'Đổi mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.',
      }
    }
  },

  // Đăng ký tài khoản mới bằng Email
  register: async (userData: { fullName: string; phone: string; email: string; password?: string }): Promise<{ success: boolean; user: User }> => {
    try {
      const res = await apiClient.post('/auth/register', userData)
      isBackendLive = true
      return res.data
    } catch {
      return {
        success: true,
        user: {
          id: `USR-${Date.now().toString().slice(-4)}`,
          fullName: userData.fullName || 'Hành khách Violetline',
          phone: userData.phone,
          email: userData.email,
          tier: 'Violet Explorer',
          points: 100, // Điểm thưởng chào mừng thành viên mới
        },
      }
    }
  },
}

