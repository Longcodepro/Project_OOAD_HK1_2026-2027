import { useEffect, useRef, useState } from 'react'
import type { User } from '../../types'

export interface AccountMenuItem {
  label: string
  icon: string
  onSelect: () => void
  danger?: boolean
  separatorBefore?: boolean
}

interface AccountMenuProps {
  user: User | null
  /** Dòng phụ dưới họ tên trong menu (số điện thoại hoặc vai trò). */
  subtitle?: string
  items: AccountMenuItem[]
}

/** "Nguyễn Văn An" -> "NA" */
const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Icon tài khoản + menu thả: dùng chung cho cổng khách và cổng quản trị. */
export function AccountMenu({ user, subtitle, items }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const menuItems = () =>
      Array.from(wrapRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    const onPointerDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const els = menuItems()
        if (!els.length) return
        const i = els.indexOf(document.activeElement as HTMLElement)
        const next = e.key === 'ArrowDown' ? (i + 1) % els.length : (i - 1 + els.length) % els.length
        els[next].focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    menuItems()[0]?.focus()
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Tài khoản"
        title={user ? user.fullName : 'Tài khoản'}
        onClick={() => setOpen((o) => !o)}
        className="grid h-10 w-10 cursor-pointer select-none place-items-center rounded-full border border-hairline bg-paper-deep text-xs font-bold text-ink transition hover:border-terracotta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
      >
        {user ? initialsOf(user.fullName) : <span className="material-symbols-outlined text-2xl">account_circle</span>}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Menu tài khoản"
          className="absolute right-0 top-full z-[60] mt-2 w-60 max-w-[calc(100vw-2rem)] rounded border border-hairline bg-paper py-1 shadow-lg"
        >
          {user && (
            <div className="border-b border-hairline px-4 py-3">
              <p className="truncate text-sm font-bold text-ink">{user.fullName}</p>
              {subtitle && <p className="mt-0.5 truncate text-xs font-medium text-ink-soft">{subtitle}</p>}
            </div>
          )}
          {items.map((it) => (
            <div key={it.label}>
              {it.separatorBefore && <div className="my-1 border-t border-hairline" />}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  it.onSelect()
                }}
                className={`flex min-h-11 w-full cursor-pointer items-center gap-2.5 px-4 text-left text-xs font-semibold transition hover:bg-paper-deep focus-visible:bg-paper-deep focus-visible:outline-none ${
                  it.danger ? 'text-terracotta' : 'text-ink'
                }`}
              >
                <span className="material-symbols-outlined text-base">{it.icon}</span>
                {it.label}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
