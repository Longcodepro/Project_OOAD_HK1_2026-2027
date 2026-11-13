import type { View, User } from '../../types'
import { Logo } from '../common/Logo'

export interface AdminSidebarProps {
  currentView: View
  setView: (v: View) => void
  user: User
  pendingRefunds: number
}

export function AdminSidebar({ currentView, setView, user, pendingRefunds }: AdminSidebarProps) {
  const adminItems: { id: View; label: string; icon: string; badge?: number }[] = [
    {
      id: 'admin-dashboard',
      label: 'Tổng quan',
      icon: 'dashboard',
    },
    {
      id: 'admin-tickets',
      label: 'Quản lý vé & hoàn tiền',
      icon: 'confirmation_number',
      badge: pendingRefunds > 0 ? pendingRefunds : undefined,
    },
    {
      id: 'admin-routes',
      label: 'Tuyến đường',
      icon: 'route',
    },
    {
      id: 'admin-trips',
      label: 'Điều hành chuyến xe',
      icon: 'alt_route',
    },
    {
      id: 'admin-buses',
      label: 'Đội xe & Sơ đồ ghế',
      icon: 'directions_bus',
    },
    {
      id: 'admin-pricing',
      label: 'Bảng giá & voucher',
      icon: 'sell',
    },
    {
      id: 'admin-accounts',
      label: 'Tài khoản',
      icon: 'group',
    },
    {
      id: 'admin-settings',
      label: 'Cấu hình hệ thống',
      icon: 'tune',
    },
    {
      id: 'admin-scan',
      label: 'Soát vé',
      icon: 'qr_code_scanner',
    },
  ]
  // Nhân viên bán vé: quầy bán vé và soát vé
  const clerkItems: { id: View; label: string; icon: string; badge?: number }[] = [
    { id: 'admin-counter', label: 'Bán vé tại quầy', icon: 'point_of_sale' },
    { id: 'admin-scan', label: 'Soát vé', icon: 'qr_code_scanner' },
  ]
  const menuItems = user.role === 'admin' ? adminItems : clerkItems
  const roleLabel = user.role === 'admin' ? 'Quản trị viên' : 'Nhân viên'
  const initials = user.fullName.trim().split(/\s+/).slice(-2).map((w) => w[0]).join('').toUpperCase()

  return (
    <aside className="w-[240px] shrink-0 bg-paper-deep border-r border-hairline flex flex-col justify-between p-4 h-screen overflow-y-auto text-ink select-none">
      <div className="space-y-5">
        {/* Brand */}
        <div className="pb-4 border-b border-hairline">
          <div
            onClick={() => setView('home')}
            className="cursor-pointer"
            title="Về Trang chủ VéXe Việt"
          >
            <Logo size="md" />
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-widest text-terracotta uppercase">
              {roleLabel}
            </span>
            <button
              onClick={() => setView('home')}
              className="text-[11px] text-ink-soft hover:text-terracotta transition cursor-pointer flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-xs">arrow_back</span>
              <span>Trang khách</span>
            </button>
          </div>
        </div>

        {/* Navigation Items  */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`w-full flex items-center justify-between rounded px-3 py-2 text-xs font-semibold transition cursor-pointer relative ${
                  isActive
                    ? 'bg-paper text-ink font-bold border-l-3 border-terracotta shadow-2xs'
                    : 'text-ink-soft hover:bg-paper/50 hover:text-ink'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`material-symbols-outlined text-base ${isActive ? 'text-terracotta' : 'text-ink-soft'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="rounded-full bg-bronze px-1.5 py-0.2 text-[10px] font-bold text-paper">
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Admin Profile bottom */}
      <div className="pt-4 border-t border-hairline space-y-3">
        <div className="flex items-center gap-2.5">
          {/* Avatar tròn chữ cái đầu của tên; đăng xuất nằm trong menu tài khoản ở header */}
          <div className="w-8 h-8 rounded-full bg-paper border border-hairline text-ink font-bold text-xs flex items-center justify-center">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-ink truncate">{user.fullName}</p>
            <p className="text-[10.5px] text-celadon font-semibold">{roleLabel}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
