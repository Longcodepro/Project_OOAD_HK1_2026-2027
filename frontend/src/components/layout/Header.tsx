import type { View, User } from '../../types'
import { Logo } from '../common/Logo'

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

  // Get initials for user avatar circle (e.g. "Nguyễn Văn An" -> "NA")
  const getInitials = (name?: string) => {
    if (!name) return 'KH'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  return (
    <header className="sticky top-0 left-0 w-full z-50 bg-paper/95 backdrop-blur-sm border-b border-hairline">
      <div className="h-16 max-w-[1080px] mx-auto px-4 md:px-6 flex items-center justify-between gap-4">
        {/* Logo */}
        <div
          onClick={() => setView('home')}
          className="cursor-pointer flex items-center gap-2.5"
          title="Trang chủ VéXe Việt"
        >
          <Logo size="md" />
        </div>

        {/* Navigation */}
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

        {/* User / Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('profile')}
                className="flex items-center gap-2 p-1 rounded hover:bg-paper-deep transition cursor-pointer"
                title="Hồ sơ cá nhân"
              >
                {/* Avatar tròn chữ cái đầu - không dùng ảnh người thật */}
                <div className="w-8 h-8 rounded-full bg-paper-deep border border-hairline text-ink font-bold text-xs flex items-center justify-center select-none ring-1 ring-hairline hover:ring-terracotta">
                  {getInitials(user.fullName)}
                </div>
                <span className="text-xs font-semibold text-ink hidden sm:inline max-w-[120px] truncate">
                  {user.fullName}
                </span>
              </button>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Đăng xuất"
                  className="p-1.5 text-xs text-ink-soft hover:text-terracotta transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('login')}
                className="inline-flex items-center justify-center h-9 px-3.5 rounded border border-hairline bg-transparent text-xs font-semibold text-ink hover:border-ink transition cursor-pointer"
              >
                Đăng nhập
              </button>
              <button
                onClick={() => setView('register')}
                className="cta-terracotta inline-flex items-center justify-center h-9 px-3.5 rounded text-xs font-semibold text-paper shadow-none hover:bg-terracotta-hover transition cursor-pointer"
              >
                Đăng ký
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
