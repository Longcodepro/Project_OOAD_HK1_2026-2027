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
    if (data) {
      const parsed = JSON.parse(data)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (err) {
    console.error('Error reading stored tickets:', err)
  }
  const defaultTickets: Ticket[] = [
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
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      bookingCode: 'VL-3P9K-12',
      ticketCode: 'TDV-048192',
      tripId: 'TRIP-003',
      route: 'Sài Gòn → Đà Lạt',
      departureTime: '08:30',
      arrivalTime: '14:45',
      date: '26.10.2026',
      busType: 'Limousine 34 Phòng Luxury',
      passengerName: 'Trần Hoàng Long',
      passengerPhone: '0912345678',
      passengerEmail: 'long.tran@example.com',
      seatNumber: 'B04',
      pickupPoint: 'Bến xe Miền Tây',
      dropoffPoint: 'Bến xe liên tỉnh Đà Lạt',
      basePrice: 354545,
      vat: 35455,
      totalAmount: 390000,
      paymentStatus: 'PENDING_CANCEL',
      checkinStatus: 'NOT_CHECKED_IN',
      cancelReason: 'Bận lịch công tác đột xuất, mong nhà xe hoàn tiền',
      cancelRequestedAt: new Date(Date.now() - 1800000).toISOString(),
      qrData: 'VL-3P9K-12|TDV-048192|B04|TranHoangLong',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      bookingCode: 'VL-1A7D-05',
      ticketCode: 'TDV-031209',
      tripId: 'TRIP-001',
      route: 'Sài Gòn → Đà Lạt',
      departureTime: '05:30',
      arrivalTime: '11:45',
      date: '18.10.2026',
      busType: 'Limousine 34 Phòng Luxury',
      passengerName: 'Phạm Thu Trang',
      passengerPhone: '0988776655',
      passengerEmail: 'thutrang@example.com',
      seatNumber: 'A07',
      pickupPoint: 'Bến xe Miền Đông mới',
      dropoffPoint: 'VP Đà Lạt, 01 Quang Trung',
      basePrice: 345455,
      vat: 34545,
      totalAmount: 380000,
      paymentStatus: 'CANCELLED',
      checkinStatus: 'NOT_CHECKED_IN',
      cancelReason: 'Thay đổi kế hoạch nghỉ dưỡng',
      cancelAdminNote: 'Đã hoàn tiền 100% qua VietQR ngày 17/10',
      qrData: 'VL-1A7D-05|TDV-031209|A07|PhamThuTrang',
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ]
  saveStoredTickets(defaultTickets)
  return defaultTickets
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
      // Trả về mock data phù hợp với tuyến tìm kiếm từ kho lưu trữ chung
      const storedTrips = getStoredTrips()
      return storedTrips.map((t) => ({
        ...t,
        fromCity: fromCity || t.fromCity,
        toCity: toCity || t.toCity,
        date: date || t.date,
      }))
    }
  },

  // Lấy danh sách ghế của chuyến (Tự động cập nhật ghế đã đặt từ vé & giải phóng khi hủy vé)
  getSeats: async (tripId: string): Promise<Seat[]> => {
    try {
      const res = await apiClient.get<Seat[]>(`/trips/${tripId}/seats`)
      isBackendLive = true
      return res.data
    } catch (err) {
      console.warn(`[API: Mock Mode] Backend /api/trips/${tripId}/seats chưa sẵn sàng, tạo mock seats:`, err)
      isBackendLive = false

      // Lấy danh sách ghế từ các vé đang hợp lệ (PAID hoặc PENDING_CANCEL)
      const bookedFromTickets = getStoredTickets()
        .filter((t) => (t.paymentStatus === 'PAID' || t.paymentStatus === 'PENDING_CANCEL'))
        .map((t) => t.seatNumber.slice(0, 3).trim())

      const baseUnavailable = ['A03', 'A08', 'A14', 'B03', 'B08', 'B15']
      const unavailable = Array.from(new Set([...baseUnavailable, ...bookedFromTickets]))

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
      const search = code.trim().toUpperCase()
      const phoneClean = phone ? phone.trim().replace(/\s+/g, '') : ''
      return list.find((t) => {
        const matchesCode = t.bookingCode.toUpperCase() === search || t.ticketCode.toUpperCase() === search
        if (!phoneClean) return matchesCode
        return matchesCode && t.passengerPhone.replace(/\s+/g, '') === phoneClean
      }) || null
    }
  },

  // Khách hàng gửi Yêu cầu hủy vé -> Chuyển sang PENDING_CANCEL
  requestCancel: async (code: string, reason: string): Promise<Ticket> => {
    try {
      const res = await apiClient.post<Ticket>(`/tickets/${code}/cancel-request`, { reason })
      isBackendLive = true
      return res.data
    } catch {
      const list = getStoredTickets()
      const index = list.findIndex(
        (t) => t.bookingCode === code || t.ticketCode === code,
      )
      if (index === -1) throw new Error('Không tìm thấy mã vé này')

      list[index] = {
        ...list[index],
        paymentStatus: 'PENDING_CANCEL',
        cancelReason: reason || 'Khách yêu cầu hủy vì việc cá nhân',
        cancelRequestedAt: new Date().toISOString(),
      }
      saveStoredTickets(list)
      return list[index]
    }
  },

  // Quản trị viên (Admin) Phê duyệt yêu cầu hủy vé -> CANCELLED & hoàn tiền
  approveCancel: async (code: string, adminNote?: string): Promise<Ticket> => {
    try {
      const res = await apiClient.post<Ticket>(`/tickets/${code}/approve-cancel`, { adminNote })
      isBackendLive = true
      return res.data
    } catch {
      const list = getStoredTickets()
      const index = list.findIndex(
        (t) => t.bookingCode === code || t.ticketCode === code,
      )
      if (index === -1) throw new Error('Không tìm thấy vé cần duyệt')

      list[index] = {
        ...list[index],
        paymentStatus: 'CANCELLED',
        cancelAdminNote: adminNote || 'Đã duyệt hủy và gửi lệnh hoàn tiền qua cổng thanh toán.',
      }
      saveStoredTickets(list)
      return list[index]
    }
  },

  // Quản trị viên (Admin) Từ chối yêu cầu hủy vé -> quay về PAID
  rejectCancel: async (code: string, note?: string): Promise<Ticket> => {
    try {
      const res = await apiClient.post<Ticket>(`/tickets/${code}/reject-cancel`, { note })
      isBackendLive = true
      return res.data
    } catch {
      const list = getStoredTickets()
      const index = list.findIndex(
        (t) => t.bookingCode === code || t.ticketCode === code,
      )
      if (index === -1) throw new Error('Không tìm thấy vé')

      list[index] = {
        ...list[index],
        paymentStatus: 'PAID',
        cancelAdminNote: note || 'Từ chối hủy do cận giờ khởi hành (dưới 24h).',
      }
      saveStoredTickets(list)
      return list[index]
    }
  },
}

// ---------------------------------------------------------
// CÁC DỊCH VỤ DÀNH RIÊNG CHO QUẢN TRỊ VIÊN (ADMIN PORTAL)
// ---------------------------------------------------------

export interface AdminBus {
  id: string
  plateNumber: string
  busType: string
  totalSeats: number
  driverName: string
  driverPhone: string
  status: 'ACTIVE' | 'MAINTENANCE'
}

export interface AdminVoucher {
  id: string
  code: string
  discountPercent: number
  maxDiscount: number
  minSpend: number
  expiryDate: string
  active: boolean
  usageCount: number
}

const STORAGE_TRIPS_KEY = 'violetline_admin_trips'
const getStoredTrips = (): Trip[] => {
  try {
    const raw = localStorage.getItem(STORAGE_TRIPS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return INITIAL_TRIPS
}

const saveStoredTrips = (trips: Trip[]) => {
  try {
    localStorage.setItem(STORAGE_TRIPS_KEY, JSON.stringify(trips))
  } catch {}
}

export const adminTripsApi = {
  getAll: async (): Promise<Trip[]> => {
    return getStoredTrips()
  },
  create: async (newTrip: Omit<Trip, 'id'>): Promise<Trip> => {
    const trips = getStoredTrips()
    const trip: Trip = {
      ...newTrip,
      id: `TRIP-${String(trips.length + 1).padStart(3, '0')}`,
    }
    const updated = [trip, ...trips]
    saveStoredTrips(updated)
    return trip
  },
  update: async (id: string, updates: Partial<Trip>): Promise<Trip> => {
    const trips = getStoredTrips()
    const idx = trips.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Trip not found')
    trips[idx] = { ...trips[idx], ...updates }
    saveStoredTrips(trips)
    return trips[idx]
  },
  delete: async (id: string): Promise<boolean> => {
    const trips = getStoredTrips().filter((t) => t.id !== id)
    saveStoredTrips(trips)
    return true
  },
}

export const adminBusesApi = {
  getAll: async (): Promise<AdminBus[]> => {
    return [
      {
        id: 'BUS-01',
        plateNumber: '51B-289.44',
        busType: 'Limousine 34 Phòng Luxury',
        totalSeats: 34,
        driverName: 'Nguyễn Văn Hùng',
        driverPhone: '0918 334 221',
        status: 'ACTIVE',
      },
      {
        id: 'BUS-02',
        plateNumber: '51B-310.82',
        busType: 'Cabin đôi First Class',
        totalSeats: 22,
        driverName: 'Lê Minh Tuấn',
        driverPhone: '0903 881 992',
        status: 'ACTIVE',
      },
      {
        id: 'BUS-03',
        plateNumber: '51B-199.05',
        busType: 'Royal Cabin Suite 20',
        totalSeats: 20,
        driverName: 'Phạm Quốc Bảo',
        driverPhone: '0977 122 344',
        status: 'MAINTENANCE',
      },
      {
        id: 'BUS-04',
        plateNumber: '51B-455.19',
        busType: 'Limousine Giường nằm Express',
        totalSeats: 34,
        driverName: 'Hoàng Hải Nam',
        driverPhone: '0933 661 772',
        status: 'ACTIVE',
      },
    ]
  },
}

export const adminPricingApi = {
  getVouchers: async (): Promise<AdminVoucher[]> => {
    return [
      {
        id: 'VOUCHER-01',
        code: 'VIOLET20',
        discountPercent: 20,
        maxDiscount: 100000,
        minSpend: 300000,
        expiryDate: '31.12.2026',
        active: true,
        usageCount: 142,
      },
      {
        id: 'VOUCHER-02',
        code: 'DALATVIP',
        discountPercent: 15,
        maxDiscount: 80000,
        minSpend: 250000,
        expiryDate: '15.11.2026',
        active: true,
        usageCount: 89,
      },
      {
        id: 'VOUCHER-03',
        code: 'SUMMER2026',
        discountPercent: 10,
        maxDiscount: 50000,
        minSpend: 200000,
        expiryDate: '30.09.2026',
        active: false,
        usageCount: 320,
      },
    ]
  },
}

export const adminAccountsApi = {
  getAll: async () => {
    return [
      {
        id: 'USR-001',
        fullName: 'Nguyễn Minh Anh',
        phone: '0901234567',
        email: 'minhanh.nguyen@gmail.com',
        role: 'customer' as const,
        tier: 'Violet Explorer',
        status: 'ACTIVE' as const,
        createdAt: '12.01.2026',
        bookingsCount: 4,
      },
      {
        id: 'USR-002',
        fullName: 'Trần Hoàng Long',
        phone: '0912345678',
        email: 'long.tran@example.com',
        role: 'customer' as const,
        tier: 'Silver Member',
        status: 'ACTIVE' as const,
        createdAt: '03.02.2026',
        bookingsCount: 2,
      },
      {
        id: 'ADM-001',
        fullName: 'Quản trị viên Tổng (Admin)',
        phone: '0909999888',
        email: 'admin@violetline.vn',
        role: 'admin' as const,
        tier: 'Super Admin',
        status: 'ACTIVE' as const,
        createdAt: '01.01.2026',
        bookingsCount: 0,
      },
      {
        id: 'USR-003',
        fullName: 'Lê Văn Khang (Tài khoản thử)',
        phone: '0988112233',
        email: 'khang.le@spam.test',
        role: 'customer' as const,
        tier: 'Standard',
        status: 'LOCKED' as const,
        createdAt: '15.03.2026',
        bookingsCount: 1,
      },
    ]
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

