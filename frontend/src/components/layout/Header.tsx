import type { View, User } from '../../types'
import { Logo } from '../common/Logo'
import { Button } from '../common/Button'

const navItems: { label: string; view: View }[] = [
  { label: 'Tìm chuyến', view: 'home' },
  { label: 'Hành trình', view: 'profile' },
  { label: 'Ưu đãi', view: 'home' },
]

export interface HeaderProps {
  setView: (v: View) => void
  openLogin?: () => void
  openRegister?: () => void
  user: User | null
  backendOnline: boolean
  onLogout?: () => void
}

export function Header({
  setView,
  openLogin,
  openRegister,
  user,
  backendOnline: _backendOnline,
  onLogout,
}: HeaderProps) {
  const handleLoginClick = () => {
    if (openLogin) openLogin()
    else setView('login')
  }

  const handleRegisterClick = () => {
    if (openRegister) openRegister()
    else setView('register')
  }

  return (
    <header className="relative z-30 mx-auto flex max-w-[1320px] items-center justify-between px-5 py-5 lg:px-8">
      <div className="flex items-center gap-4">
        <div onClick={() => setView('home')} className="cursor-pointer">
          <Logo />
        </div>
      </div>

      <nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
        {navItems.map((i) => (
          <button
            key={i.label}
            onClick={() => setView(i.view)}
            className="hover:text-white"
          >
            {i.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        {user ? (
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setView('profile')}
              kind="ghost"
              className="px-3.5 py-2 text-xs"
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="max-w-[120px] truncate">{user.fullName}</span>
            </Button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Đăng xuất tài khoản"
                className="rounded-xl px-2.5 py-1.5 text-xs text-white/50 hover:bg-white/10 hover:text-rose-400 transition"
              >
                Đăng xuất
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              onClick={handleLoginClick}
              kind="ghost"
              className="px-4 py-2.5 text-xs"
            >
              Đăng nhập
            </Button>
            <Button
              onClick={handleRegisterClick}
              kind="primary"
              className="px-4 py-2.5 text-xs"
            >
              Đăng ký
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
