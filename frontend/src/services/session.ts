/**
 * @file session.ts
 * @description Quản lý phiên đăng nhập độc lập (Dual-Session Architecture) cho Cổng Khách hàng (Customer)
 * và Cổng Quản trị / Nhân viên (Admin/Clerk).
 *
 * ĐẶC TÍNH KIẾN TRÚC:
 * 1. Cơ chế 2 cổng độc lập (Customer vs Admin): Lưu trữ token và thông tin người dùng trong các key riêng biệt
 *    tại `localStorage`. Điều này đảm bảo quản trị viên hoặc nhân viên bán vé có thể vừa mở tab mua vé với
 *    tư cách khách hàng, vừa mở tab quản trị nghiệp vụ mà không bị ghi đè phiên (session collision).
 * 2. Khả năng chịu lỗi (Fault-tolerant Storage): Toàn bộ thao tác đọc/ghi `localStorage` và `sessionStorage`
 *    đều được bọc trong khối `try/catch` để tránh crash ứng dụng khi chạy trong chế độ ẩn danh (Private Browsing)
 *    hoặc khi trình duyệt chặn quyền truy cập LocalStorage / QuotaExceeded.
 * 3. Giao tiếp liên tab/component thông qua Event Bus (CustomEvent): Hỗ trợ chuyển tab hồ sơ nhanh từ Header
 *    vào ProfilePage (`vexe:profile-tab`).
 */

import type { User } from '../types'

/**
 * Định nghĩa hai cổng ứng dụng độc lập:
 * - 'customer': Cổng dành cho hành khách công cộng, tra cứu, giữ chỗ và thanh toán vé (#/ ...)
 * - 'admin': Cổng dành cho ban điều hành, quản trị viên hệ thống và nhân viên bán vé quầy / soát vé (#/admin ...)
 */
export type Portal = 'customer' | 'admin'

/**
 * Bảng ánh xạ định danh khóa (Storage Keys) lưu trữ trên LocalStorage cho từng cổng.
 * - Customer: `vexe_token`, `vexe_user`
 * - Admin: `vexe_admin_token`, `vexe_admin_user`
 */
const KEYS: Record<Portal, { token: string; user: string }> = {
  customer: { token: 'vexe_token', user: 'vexe_user' },
  admin: { token: 'vexe_admin_token', user: 'vexe_admin_user' },
}

/** Hash tiền tố xác định routing của cổng quản trị trên URL. */
export const ADMIN_HASH = '#/admin'

/** Tên sự kiện CustomEvent kích hoạt khi người dùng chọn một mục trong AccountMenu để mở đúng tab trên ProfilePage */
export const PROFILE_TAB_EVENT = 'vexe:profile-tab'
const PROFILE_TAB_KEY = 'vexe_profile_tab'

/**
 * Yêu cầu mở một tab cụ thể trên trang Hồ sơ cá nhân.
 * Lưu tạm tên tab vào `sessionStorage` và phát sự kiện `vexe:profile-tab` trên `window` để component ProfilePage lắng nghe.
 *
 * @param tab - Tên tab cần chuyển tới (ví dụ: 'Lịch sử chuyến', 'Đơn hàng', 'Thông tin cá nhân')
 */
export const requestProfileTab = (tab: string) => {
  try {
    sessionStorage.setItem(PROFILE_TAB_KEY, tab)
  } catch {
    /* Không lưu được sessionStorage (do chặn cookie/storage) thì vẫn phát event để mở tab mặc định */
  }
  window.dispatchEvent(new Event(PROFILE_TAB_EVENT))
}

/**
 * Đọc và dọn dẹp (consume) tab được yêu cầu từ `sessionStorage`.
 * Dùng một lần khi ProfilePage mount hoặc khi bắt được sự kiện chuyển tab.
 *
 * @returns Tên tab đã lưu hoặc null nếu không có yêu cầu nào.
 */
export const takeProfileTab = (): string | null => {
  try {
    const tab = sessionStorage.getItem(PROFILE_TAB_KEY)
    sessionStorage.removeItem(PROFILE_TAB_KEY)
    return tab
  } catch {
    return null
  }
}

/**
 * Xác định cổng hiện tại dựa trên chuỗi định tuyến hash của trình duyệt (`window.location.hash`).
 * Nếu hash bắt đầu bằng '#/admin' => 'admin', ngược lại coi như 'customer'.
 *
 * @returns 'admin' hoặc 'customer'
 */
export const currentPortal = (): Portal =>
  window.location.hash.startsWith(ADMIN_HASH) ? 'admin' : 'customer'

/**
 * Đọc giá trị từ LocalStorage một cách an toàn.
 * Trả về null nếu khóa không tồn tại hoặc trình duyệt ném ngoại lệ bảo mật.
 */
const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Lấy Access Token dạng chuỗi JWT của cổng chỉ định.
 *
 * @param portal - Cổng cần lấy token ('customer' hoặc 'admin')
 * @returns Chuỗi token Bearer hoặc null nếu chưa đăng nhập
 */
export const getToken = (portal: Portal): string | null => read(KEYS[portal].token)

/**
 * Phục hồi đối tượng thông tin người dùng (`User`) từ LocalStorage.
 * Chỉ trả về đối tượng hợp lệ nếu CẢ token và chuỗi JSON user đều tồn tại và parse thành công.
 *
 * @param portal - Cổng cần phục hồi người dùng
 * @returns Đối tượng `User` hoặc null nếu phiên không tồn tại/không hợp lệ
 */
export const loadUser = (portal: Portal): User | null => {
  const raw = read(KEYS[portal].user)
  if (!raw || !getToken(portal)) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

/**
 * Lưu trữ phiên làm việc mới khi đăng nhập thành công.
 * Ghi nhận đồng thời token và thông tin user đã serialize sang JSON vào các khóa riêng của cổng tương ứng.
 *
 * @param portal - Cổng làm việc ('customer' | 'admin')
 * @param token - JWT Access token nhận từ backend
 * @param user - Thông tin tài khoản người dùng đã được chuẩn hóa
 */
export const saveSession = (portal: Portal, token: string, user: User) => {
  try {
    localStorage.setItem(KEYS[portal].token, token)
    localStorage.setItem(KEYS[portal].user, JSON.stringify(user))
  } catch {
    // Trình duyệt chặn lưu trữ (Private mode / Quota exceeded): phiên chỉ sống tạm trong memory của React state
  }
}

/**
 * Thay thế Token trong trường hợp backend cấp lại token mới
 * (ví dụ: sau khi đổi mật khẩu, xác nhận đổi số điện thoại thành công).
 * Giữ nguyên đối tượng user hiện hành, chỉ cập nhật token mới.
 *
 * @param portal - Cổng tương ứng
 * @param token - Token mới được backend cấp
 */
export const replaceToken = (portal: Portal, token: string) => {
  try {
    localStorage.setItem(KEYS[portal].token, token)
  } catch {
    // Bỏ qua lỗi lưu trữ nếu bị chặn
  }
}

/**
 * Xóa hoàn toàn phiên làm việc của một cổng (được gọi khi Đăng xuất hoặc khi token hết hạn / 401).
 * Không ảnh hưởng tới phiên làm việc của cổng còn lại.
 *
 * @param portal - Cổng cần xóa phiên ('customer' | 'admin')
 */
export const clearSession = (portal: Portal) => {
  try {
    localStorage.removeItem(KEYS[portal].token)
    localStorage.removeItem(KEYS[portal].user)
  } catch {
    // Bỏ qua nếu có lỗi storage
  }
}
