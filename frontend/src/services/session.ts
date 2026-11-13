import type { User } from '../types'

/**
 * Hai cổng đăng nhập tách biệt, mỗi cổng có token và thông tin tài khoản riêng:
 *  - customer: trang đặt vé của khách (#/ …)
 *  - admin:    cổng quản trị & nhân viên (#/admin …)
 * Đăng nhập ở cổng này không ảnh hưởng phiên ở cổng kia.
 */
export type Portal = 'customer' | 'admin'

const KEYS: Record<Portal, { token: string; user: string }> = {
  customer: { token: 'vexe_token', user: 'vexe_user' },
  admin: { token: 'vexe_admin_token', user: 'vexe_admin_user' },
}

export const ADMIN_HASH = '#/admin'

/** Menu tài khoản chọn sẵn tab của trang Hồ sơ (kể cả khi trang đó đang mở). */
export const PROFILE_TAB_EVENT = 'vexe:profile-tab'
const PROFILE_TAB_KEY = 'vexe_profile_tab'

export const requestProfileTab = (tab: string) => {
  try {
    sessionStorage.setItem(PROFILE_TAB_KEY, tab)
  } catch {
    /* không lưu được thì mở tab mặc định */
  }
  window.dispatchEvent(new Event(PROFILE_TAB_EVENT))
}

/** Lấy (và xoá) tab được yêu cầu. */
export const takeProfileTab = (): string | null => {
  try {
    const tab = sessionStorage.getItem(PROFILE_TAB_KEY)
    sessionStorage.removeItem(PROFILE_TAB_KEY)
    return tab
  } catch {
    return null
  }
}

/** Cổng đang mở, suy ra từ URL. */
export const currentPortal = (): Portal =>
  window.location.hash.startsWith(ADMIN_HASH) ? 'admin' : 'customer'

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const getToken = (portal: Portal): string | null => read(KEYS[portal].token)

export const loadUser = (portal: Portal): User | null => {
  const raw = read(KEYS[portal].user)
  if (!raw || !getToken(portal)) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export const saveSession = (portal: Portal, token: string, user: User) => {
  try {
    localStorage.setItem(KEYS[portal].token, token)
    localStorage.setItem(KEYS[portal].user, JSON.stringify(user))
  } catch {
    // trình duyệt chặn lưu trữ: phiên chỉ sống trong bộ nhớ trang
  }
}

/** Backend đổi token khi đổi mật khẩu/SĐT: giữ nguyên user, thay token. */
export const replaceToken = (portal: Portal, token: string) => {
  try {
    localStorage.setItem(KEYS[portal].token, token)
  } catch {
    // bỏ qua
  }
}

export const clearSession = (portal: Portal) => {
  try {
    localStorage.removeItem(KEYS[portal].token)
    localStorage.removeItem(KEYS[portal].user)
  } catch {
    // bỏ qua
  }
}
