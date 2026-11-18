/**
 * @file Header.tsx
 * @description Thanh tiêu đề cố định trên đầu trang Cổng Khách hàng (Sticky Application Header).
 *
 * TÍNH NĂNG CHÍNH:
 * 1. Logo nhận diện thương hiệu: Nhấp chuột điều hướng về trang chủ (`setView('home')`).
 * 2. Thanh điều hướng liên kết chính (Desktop Navigation):
 *    - Tìm chuyến (`home`), Tra cứu vé của tôi (`lookup`), Hành trình của tôi (`profile`).
 *    - Tự động gạch chân và đổi màu đất nung cho mục đang hoạt động (`currentView`).
 * 3. Menu Tài khoản thông minh (`AccountMenu`):
 *    - Khi chưa đăng nhập: Hiển thị các nút "Đăng nhập" và "Đăng ký tài khoản".
 *    - Khi đã đăng nhập: Hiển thị avatar viết tắt họ tên, số điện thoại, và các mục menu nhanh:
 *      Hồ sơ cá nhân, Hành trình của tôi, Đổi mật khẩu (gọi `requestProfileTab` để mở đúng tab trên ProfilePage),
 *      và nút Đăng xuất.
 */

import type { View, User } from '../../types'
import { Logo } from '../common/Logo'
import { AccountMenu, type AccountMenuItem } from '../common/AccountMenu'
import { requestProfileTab } from '../../services/session'

export interface HeaderProps {
  currentView?: View
  setView: (v: View) => void
  openLogin?: () => void
  openRegister?: () => void
  user: User | null
  backendOnline?: boolean
  onLogout?: () => void
}

export function Header({
  currentView = 'home',
  setView,
  user,
  onLogout,
}: HeaderProps) {
  const navLinks: { label: string; view: View }[] = [
    { label: 'Tìm chuyến', view: 'home' },
    { label: 'Tra cứu vé của tôi', view: 'lookup' },
    { label: 'Hành trình của tôi', view: 'profile' },
  ]

  const openProfile = (tab: string) => () => {
    requestProfileTab(tab)
    setView('profile')
  }
  const accountItems: AccountMenuItem[] = user
    ? [
        { label: 'Hồ sơ cá nhân', icon: 'person', onSelect: openProfile('Thông tin cá nhân') },
        { label: 'Hành trình của tôi', icon: 'confirmation_number', onSelect: openProfile('Lịch sử chuyến') },
        { label: 'Đổi mật khẩu', icon: 'lock', onSelect: openProfile('Đổi mật khẩu') },
        ...(onLogout
          ? [{ label: 'Đăng xuất', icon: 'logout', onSelect: onLogout, danger: true, separatorBefore: true }]
          : []),
      ]
    : [
        { label: 'Đăng nhập', icon: 'login', onSelect: () => setView('login') },
        { label: 'Đăng ký tài khoản', icon: 'person_add', onSelect: () => setView('register') },
      ]

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-paper/95 backdrop-blur-sm border-b border-hairline">
      <div className="h-16 max-w-[1080px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Logo thương hiệu */}
        <div
          onClick={() => setView('home')}
          className="cursor-pointer flex items-center gap-2.5"
          title="Trang chủ VéXe Việt"
        >
          <Logo size="md" />
        </div>

        {/* Thanh liên kết điều hướng desktop */}
        <nav className="hidden md:flex items-center gap-7">
          {navLinks.map((item) => {
            const isActive = currentView === item.view
            return (
              <button
                key={item.view}
                onClick={() => setView(item.view)}
                className={`text-sm font-medium transition-colors cursor-pointer relative py-1 ${
                  isActive
                    ? 'text-terracotta font-bold border-b-2 border-terracotta'
                    : 'text-ink-soft hover:text-ink'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Menu tài khoản / Hành động đăng nhập */}
        <AccountMenu user={user} subtitle={user?.phone} items={accountItems} />
      </div>
    </header>
  )
}
