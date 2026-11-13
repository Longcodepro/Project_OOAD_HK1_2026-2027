import type { View } from '../../types'

interface BottomBarProps {
  currentView: View
  setView: (v: View) => void
}

const TABS: { label: string; icon: string; view: View; group: View[] }[] = [
  { label: 'Tìm chuyến', icon: 'search', view: 'home', group: ['home', 'results', 'seats', 'checkout', 'success'] },
  { label: 'Tra cứu vé', icon: 'qr_code_2', view: 'lookup', group: ['lookup'] },
  { label: 'Hành trình', icon: 'luggage', view: 'profile', group: ['profile'] },
]

/**
 * Thanh cố định ở đáy màn hình, luôn thấy khi cuộn:
 *  - điện thoại (< md): 3 tab điều hướng chính (trên điện thoại header không có menu);
 *  - máy tính (≥ md): chân trang mỏng một dòng.
 */
export function BottomBar({ currentView, setView }: BottomBarProps) {
  return (
    <>
      <nav
        aria-label="Điều hướng chính"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-hairline bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
      >
        {TABS.map((t) => {
          const active = t.group.includes(currentView)
          return (
            <button
              key={t.view}
              type="button"
              onClick={() => setView(t.view)}
              aria-current={active ? 'page' : undefined}
              className={`flex h-14 cursor-pointer flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition ${
                active ? 'text-terracotta' : 'text-ink-soft hover:text-ink'
              }`}
            >
              <span className="material-symbols-outlined text-2xl">{t.icon}</span>
              {t.label}
            </button>
          )
        })}
      </nav>

      <div className="fixed inset-x-0 bottom-0 z-40 hidden h-9 border-t border-hairline bg-paper/95 text-xs text-ink-soft backdrop-blur-sm md:block">
        <div className="mx-auto flex h-full max-w-[1080px] items-center justify-between px-6">
          <span>© 2026 VéXe Việt · Đồ án OOAD</span>
          <span className="font-semibold text-bronze">Khởi hành trọn vẹn · Kết nối non sông</span>
        </div>
      </div>
    </>
  )
}
