import { useEffect, useRef, useState } from 'react'

/** YYYY-MM-DD theo giờ máy (toISOString lệch sang hôm qua trước 7h sáng giờ VN). */
export const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const fromYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Bỏ dấu để gõ "ha noi" vẫn ra "Hà Nội"
const plain = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase()

/** Đóng popover khi bấm ra ngoài hoặc nhấn Esc. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open, close])
  return ref
}

/* ---------------- Chọn tỉnh / thành ---------------- */

export interface PlacePickerProps {
  value: string
  onChange: (v: string) => void
  options: string[]
  /** Tỉnh đang là đầu kia của tuyến, không cho chọn trùng. */
  disabledValue?: string
  label: string
}

export function PlacePicker({ value, onChange, options, disabledValue, label }: PlacePickerProps) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const close = () => {
    setOpen(false)
    setQ('')
  }
  const ref = useDismiss(open, close)

  const list = options.filter((o) => plain(o).includes(plain(q.trim())))
  const pick = (o: string) => {
    if (o === disabledValue) return
    onChange(o)
    close()
  }

  return (
    <div className="pop-field" ref={ref}>
      <button
        type="button"
        className="pop-trigger"
        aria-label={`${label}: ${value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className="truncate">{value}</span>
        <span className="material-symbols-outlined pop-caret">expand_more</span>
      </button>

      {open && (
        <div className="pop">
          <div className="pop-search">
            <span className="material-symbols-outlined text-base">search</span>
            <input
              autoFocus
              value={q}
              placeholder="Gõ tên tỉnh, thành phố…"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const first = list.find((o) => o !== disabledValue)
                  if (first) pick(first)
                }
              }}
            />
          </div>
          <div className="pop-list" role="listbox" aria-label={label}>
            {list.length === 0 && <div className="pop-empty">Không có tỉnh thành phù hợp</div>}
            {list.map((o) => (
              <button
                key={o}
                type="button"
                role="option"
                aria-selected={o === value}
                aria-disabled={o === disabledValue}
                className={`pop-item ${o === value ? 'is-selected' : ''}`}
                onClick={() => pick(o)}
              >
                <span>{o}</span>
                {o === value && <span className="material-symbols-outlined text-base">check</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------------- Chọn ngày ---------------- */

const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export interface DatePickerProps {
  value: string // YYYY-MM-DD
  onChange: (v: string) => void
  min?: string
  max?: string
  label: string
}

export function DatePicker({ value, onChange, min, max, label }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState(() => fromYmd(value)) // tháng đang xem
  const ref = useDismiss(open, () => setOpen(false))

  const y = view.getFullYear()
  const m = view.getMonth()
  const lead = (new Date(y, m, 1).getDay() + 6) % 7 // thứ Hai là cột đầu
  const days = new Date(y, m + 1, 0).getDate()
  const today = toYmd(new Date())
  const shift = (n: number) => setView(new Date(y, m + n, 1))

  const prevDisabled = !!min && toYmd(new Date(y, m, 0)) < min
  const nextDisabled = !!max && toYmd(new Date(y, m + 1, 1)) > max

  return (
    <div className="pop-field" ref={ref}>
      <button
        type="button"
        className="pop-trigger"
        aria-label={`${label}: ${value}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setView(fromYmd(value))
          setOpen((o) => !o)
        }}
      >
        <span className="truncate">
          {fromYmd(value).toLocaleDateString('vi-VN', {
            weekday: 'short',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}
        </span>
        <span className="material-symbols-outlined pop-caret">expand_more</span>
      </button>

      {open && (
        <div className="pop cal" role="dialog" aria-label={`Chọn ${label}`}>
          <div className="cal-head">
            <button type="button" className="cal-nav" aria-label="Tháng trước" disabled={prevDisabled} onClick={() => shift(-1)}>
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <span>
              Tháng {m + 1}, {y}
            </span>
            <button type="button" className="cal-nav" aria-label="Tháng sau" disabled={nextDisabled} onClick={() => shift(1)}>
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>
          <div className="cal-grid">
            {DOW.map((d) => (
              <span key={d} className="cal-dow">
                {d}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: days }, (_, i) => {
              const ymd = toYmd(new Date(y, m, i + 1))
              const off = (!!min && ymd < min) || (!!max && ymd > max)
              return (
                <button
                  key={ymd}
                  type="button"
                  disabled={off}
                  aria-pressed={ymd === value}
                  className={`cal-day ${ymd === value ? 'is-selected' : ''} ${ymd === today ? 'is-today' : ''}`}
                  onClick={() => {
                    onChange(ymd)
                    setOpen(false)
                  }}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
