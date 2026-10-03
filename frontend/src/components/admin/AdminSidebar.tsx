import type { View, User } from '../../types'
import { Logo } from '../common/Logo'

export interface AdminSidebarProps {
  currentView: View
  setView: (v: View) => void
  user: User | null
  pendingCancelCount: number
  onLogout: () => void
}

export function AdminSidebar({
  currentView,
  setView,
  user,
  pendingCancelCount,
  onLogout,
}: AdminSidebarProps) {
  const menuItems: { id: View; label: string; icon: string; badge?: number }[] = [
    {
      id: 'admin-dashboard',
      label: 'Tổng quan hệ thống',
      icon: '📊',
    },
    {
      id: 'admin-tickets',
      label: 'Quản lý & Duyệt vé',
      icon: '🎫',
      badge: pendingCancelCount > 0 ? pendingCancelCount : undefined,
    },
    {
      id: 'admin-trips',
      label: 'Quản lý Chuyến xe',
      icon: '🚌',
    },
    {
      id: 'admin-buses',
      label: 'Xe & Sơ đồ ghế',
      icon: '🚐',
    },
    {
      id: 'admin-pricing',
      label: 'Bảng giá & Voucher',
      icon: '🏷️',
    },
    {
      id: 'admin-accounts',
      label: 'Quản lý Tài khoản',
      icon: '👥',
    },
  ]

  return (
    <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col justify-between p-5 min-h-screen shadow-sm">
      <div>
        {/* Brand */}
        <div className="pb-5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Logo />
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-700 border border-amber-200">
              PORTAL QUẢN TRỊ
            </span>
            <span className="text-[11px] text-slate-400 font-medium">v2.4</span>
          </div>
        </div>

        {/* Admin profile snippet */}
        <div className="my-5 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 border border-slate-200/80">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-orange-600 font-bold text-white text-sm shadow-sm">
            AD
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-bold text-slate-800 truncate">{user?.fullName || 'Quản trị viên'}</p>
            <p className="text-[10px] text-slate-500 font-medium truncate">Toàn quyền hệ thống</p>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isActive
                        ? 'bg-white text-orange-600'
                        : 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Switch Portal & Logout */}
      <div className="pt-5 border-t border-slate-100 space-y-2">
        <button
          type="button"
          onClick={() => setView('home')}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          <span>🌐</span>
          <span>Xem trang Khách hàng</span>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
        >
          <span>🚪</span>
          <span>Đăng xuất Admin</span>
        </button>
      </div>
    </aside>
  )
}
