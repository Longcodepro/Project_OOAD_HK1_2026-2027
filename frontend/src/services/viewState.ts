/**
 * @file viewState.ts
 * @description Quản lý lưu trữ trạng thái giao diện (State Persistence) và đồng bộ URL Hash hai chiều.
 *
 * MỤC TIÊU KỸ THUẬT:
 * 1. Lưu giữ trạng thái khi F5 (Reload Persistence):
 *    - Khi người dùng làm mới trang (F5) hoặc vô tình đóng/mở lại tab, các thông tin quan trọng
 *      gồm: tham số tìm kiếm (searchParams), chuyến xe đã chọn (selectedTrip), danh sách ghế đang giữ (chosenSeats),
 *      vé vừa thanh toán (currentTicket, orderTickets) được khôi phục nguyên vẹn từ `sessionStorage`.
 * 2. Đồng bộ URL Hash hai chiều (Bidirectional Hash Routing):
 *    - Ánh xạ trực tiếp mọi màn hình (`View`) sang URL Hash chuẩn:
 *      * Khách hàng: `#/`, `#/results`, `#/seats`, `#/checkout`, `#/success`, `#/profile`, `#/lookup`, `#/login`, `#/register`
 *      * Quản trị: `#/admin`, `#/admin/counter`, `#/admin/trips`, `#/admin/tickets`, `#/admin/buses`,
 *                  `#/admin/pricing`, `#/admin/accounts`, `#/admin/routes`, `#/admin/settings`, `#/admin/scan`
 *    - Hỗ trợ nút Back/Forward của trình duyệt và chia sẻ liên kết trực tiếp.
 * 3. Chế độ tối ưu hiệu năng mượt mà (Performance / Smooth Mode):
 *    - Lưu cấu hình `vexe_perf_mode` trong `localStorage` để tự động kích hoạt hoặc ghi nhớ lựa chọn
 *      giảm thiểu hiệu ứng đồ họa nặng (như xoay mặt trống đồng SVG kích thước lớn), giúp máy chạy mát và mượt mà 60fps.
 */

import type { Ticket, Trip, View } from '../types'
import type { Portal } from './session'

// Các khóa lưu trữ an toàn trong sessionStorage và localStorage
const KEY_SEARCH_PARAMS = 'vexe_search_params'
const KEY_SELECTED_TRIP = 'vexe_selected_trip'
const KEY_CHOSEN_SEATS = 'vexe_chosen_seats'
const KEY_CURRENT_TICKET = 'vexe_current_ticket'
const KEY_ORDER_TICKETS = 'vexe_order_tickets'
const KEY_PENDING_VIEW = 'vexe_pending_view'
const KEY_PERF_MODE = 'vexe_perf_mode'

export interface SearchParamsState {
  from: string
  to: string
  date: string
}

/**
 * Bảng ánh xạ từ View sang URL Hash
 */
export const VIEW_TO_HASH: Record<View, string> = {
  home: '#/',
  results: '#/results',
  seats: '#/seats',
  checkout: '#/checkout',
  success: '#/success',
  profile: '#/profile',
  lookup: '#/lookup',
  login: '#/login',
  register: '#/register',
  'admin-login': '#/admin/login',
  'admin-dashboard': '#/admin',
  'admin-tickets': '#/admin/tickets',
  'admin-trips': '#/admin/trips',
  'admin-buses': '#/admin/buses',
  'admin-pricing': '#/admin/pricing',
  'admin-accounts': '#/admin/accounts',
  'admin-routes': '#/admin/routes',
  'admin-settings': '#/admin/settings',
  'admin-counter': '#/admin/counter',
  'admin-scan': '#/admin/scan',
}

/**
 * Bảng ánh xạ ngược từ URL Hash path sang View
 */
const HASH_TO_VIEW: Record<string, View> = {
  '': 'home',
  '/': 'home',
  '/results': 'results',
  '/seats': 'seats',
  '/checkout': 'checkout',
  '/success': 'success',
  '/profile': 'profile',
  '/lookup': 'lookup',
  '/login': 'login',
  '/register': 'register',
  '/admin': 'admin-dashboard',
  '/admin/': 'admin-dashboard',
  '/admin/login': 'admin-login',
  '/admin/dashboard': 'admin-dashboard',
  '/admin/tickets': 'admin-tickets',
  '/admin/trips': 'admin-trips',
  '/admin/buses': 'admin-buses',
  '/admin/pricing': 'admin-pricing',
  '/admin/accounts': 'admin-accounts',
  '/admin/routes': 'admin-routes',
  '/admin/settings': 'admin-settings',
  '/admin/counter': 'admin-counter',
  '/admin/scan': 'admin-scan',
}

/**
 * Chuyển đổi tên View thành chuỗi URL hash tương ứng.
 * Với màn hình 'results', tự động nối tham số tìm kiếm (from, to, date) vào hash query.
 */
export function viewToHash(view: View, params?: SearchParamsState | null): string {
  if (view === 'results' && params && params.from && params.to) {
    const q = new URLSearchParams()
    q.set('from', params.from)
    q.set('to', params.to)
    if (params.date) q.set('date', params.date)
    return `#/results?${q.toString()}`
  }
  return VIEW_TO_HASH[view] ?? '#/'
}

/**
 * Phân tích URL hash hiện tại trên thanh địa chỉ thành Portal, View và SearchParams tương ứng.
 * An toàn với mọi chuỗi hash có query parameters (ví dụ: `#/results?from=Hà%20Nội&to=Hải%20Phòng&date=2026-11-20`).
 */
export function parseHash(hashString = window.location.hash): {
  portal: Portal
  view: View
  searchParams?: SearchParamsState
} {
  const clean = hashString.replace(/^#/, '').trim()
  const [rawPath, rawQuery] = clean.split('?')
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`

  // Nhận diện cổng quản trị nếu hash bắt đầu bằng /admin
  const isToAdmin = path === '/admin' || path.startsWith('/admin/')
  const portal: Portal = isToAdmin ? 'admin' : 'customer'

  const matchedView = HASH_TO_VIEW[path] ?? (isToAdmin ? 'admin-dashboard' : 'home')

  let searchParams: SearchParamsState | undefined
  if (rawQuery) {
    try {
      const q = new URLSearchParams(rawQuery)
      const from = q.get('from') || ''
      const to = q.get('to') || ''
      const date = q.get('date') || ''
      if (from || to || date) {
        searchParams = { from, to, date }
      }
    } catch {
      // Bỏ qua lỗi parse query
    }
  }

  return { portal, view: matchedView, searchParams }
}

// -------------------------------------------------------------
// TIỆN ÍCH SESSION STORAGE AN TOÀN (CÓ TRY / CATCH)
// -------------------------------------------------------------

function safeGetItem(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    // Trình duyệt chặn cookie/storage trong tab ẩn danh
  }
}

function safeRemoveItem(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Bỏ qua lỗi
  }
}

// -------------------------------------------------------------
// QUẢN LÝ BỘ THAM SỐ TÌM KIẾM (SEARCH PARAMS)
// -------------------------------------------------------------

export function loadSavedSearchParams(): SearchParamsState {
  const raw = safeGetItem(KEY_SEARCH_PARAMS)
  if (!raw) return { from: '', to: '', date: '' }
  try {
    const parsed = JSON.parse(raw) as Partial<SearchParamsState>
    return {
      from: typeof parsed.from === 'string' ? parsed.from : '',
      to: typeof parsed.to === 'string' ? parsed.to : '',
      date: typeof parsed.date === 'string' ? parsed.date : '',
    }
  } catch {
    return { from: '', to: '', date: '' }
  }
}

export function saveSearchParams(params: SearchParamsState): void {
  safeSetItem(KEY_SEARCH_PARAMS, JSON.stringify(params))
}

// -------------------------------------------------------------
// QUẢN LÝ CHUYẾN XE ĐƯỢC CHỌN (SELECTED TRIP)
// -------------------------------------------------------------

export function loadSavedTrip(): Trip | null {
  const raw = safeGetItem(KEY_SELECTED_TRIP)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Trip
  } catch {
    return null
  }
}

export function saveSelectedTrip(trip: Trip | null): void {
  if (!trip) {
    safeRemoveItem(KEY_SELECTED_TRIP)
  } else {
    safeSetItem(KEY_SELECTED_TRIP, JSON.stringify(trip))
  }
}

// -------------------------------------------------------------
// QUẢN LÝ GHẾ ĐANG CHỌN (CHOSEN SEATS)
// -------------------------------------------------------------

export function loadSavedSeats(): string[] {
  const raw = safeGetItem(KEY_CHOSEN_SEATS)
  if (!raw) return []
  try {
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.map(String) : []
  } catch {
    return []
  }
}

export function saveChosenSeats(seats: string[]): void {
  safeSetItem(KEY_CHOSEN_SEATS, JSON.stringify(seats))
}

// -------------------------------------------------------------
// QUẢN LÝ VÉ ĐANG XEM / ĐƠN HÀNG VỪA THANH TOÁN (CURRENT TICKET)
// -------------------------------------------------------------

export function loadSavedCurrentTicket(): Ticket | null {
  const raw = safeGetItem(KEY_CURRENT_TICKET)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Ticket
  } catch {
    return null
  }
}

export function saveCurrentTicket(ticket: Ticket | null): void {
  if (!ticket) {
    safeRemoveItem(KEY_CURRENT_TICKET)
  } else {
    safeSetItem(KEY_CURRENT_TICKET, JSON.stringify(ticket))
  }
}

export function loadSavedOrderTickets(): Ticket[] {
  const raw = safeGetItem(KEY_ORDER_TICKETS)
  if (!raw) return []
  try {
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function saveOrderTickets(tickets: Ticket[]): void {
  safeSetItem(KEY_ORDER_TICKETS, JSON.stringify(tickets))
}

// -------------------------------------------------------------
// QUẢN LÝ MÀN HÌNH CHỜ ĐĂNG NHẬP (PENDING VIEW)
// -------------------------------------------------------------

export function loadSavedPendingView(): View | null {
  const raw = safeGetItem(KEY_PENDING_VIEW)
  return (raw as View) || null
}

export function savePendingView(view: View | null): void {
  if (!view) {
    safeRemoveItem(KEY_PENDING_VIEW)
  } else {
    safeSetItem(KEY_PENDING_VIEW, view)
  }
}

/**
 * Xóa dữ liệu phiên đặt vé khi hoàn tất quy trình hoặc khi người dùng quay về Trang chủ
 */
export function clearBookingFlow(): void {
  safeRemoveItem(KEY_CHOSEN_SEATS)
  safeRemoveItem(KEY_SELECTED_TRIP)
}

// -------------------------------------------------------------
// QUẢN LÝ CHẾ ĐỘ HIỆU NĂNG MƯỢT MÀ (SMOOTH / LOW GRAPHICS MODE)
// -------------------------------------------------------------

/**
 * Kiểm tra xem người dùng có bật chế độ mượt mà hay không.
 * Mặc định tự động bật nếu màn hình có hỗ trợ `prefers-reduced-motion` hoặc đã lưu trong localStorage.
 */
export function loadPerfMode(): boolean {
  try {
    const saved = localStorage.getItem(KEY_PERF_MODE)
    if (saved !== null) {
      return saved === 'true'
    }
    // Tự động kiểm tra cài đặt giảm chuyển động của hệ điều hành
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches
    }
  } catch {
    // Bỏ qua lỗi
  }
  return false
}

export function savePerfMode(enabled: boolean): void {
  try {
    localStorage.setItem(KEY_PERF_MODE, String(enabled))
  } catch {
    // Bỏ qua lỗi
  }
}
