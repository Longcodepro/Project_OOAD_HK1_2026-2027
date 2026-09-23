import { useState, useRef, useEffect } from 'react'
import { Button } from '../common/Button'

export interface SearchBoxProps {
  onSearch: (from: string, to: string, date: string) => void
  initialFrom?: string
  initialTo?: string
  initialDate?: string
}

interface PlaceSelectProps {
  label: string
  value: string
  onChange: (val: string) => void
  options: string[]
  excludeValue?: string
}

function PlaceSelect({
  label,
  value,
  onChange,
  options,
  excludeValue,
}: PlaceSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setQuery('')
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        setQuery('')
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const filtered = options
    .filter((p) => p !== excludeValue)
    .filter((p) => p.toLowerCase().includes(query.trim().toLowerCase()))

  return (
    <div
      ref={containerRef}
      className={`search-cell search-select ${isOpen ? 'is-active' : ''}`}
      onClick={() => setIsOpen((prev) => !prev)}
    >
      <span className="field-icon">◉</span>
      <div className="min-w-0 flex-1">
        <p>{label}</p>
        <div className="search-display-value" title={value}>
          {value}
        </div>
        <small>Chọn tỉnh hoặc thành phố</small>
      </div>
      <span className={`select-caret ${isOpen ? 'rotate-180' : ''}`}>⌄</span>

      {isOpen && (
        <div
          className="place-dropdown-menu"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="place-dropdown-search">
            <input
              type="text"
              placeholder="🔍 Tìm nhanh tỉnh thành..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <div className="place-dropdown-list">
            {filtered.length > 0 ? (
              filtered.map((place) => (
                <button
                  key={place}
                  type="button"
                  className={`place-dropdown-item ${place === value ? 'is-selected' : ''}`}
                  onClick={() => {
                    onChange(place)
                    setIsOpen(false)
                    setQuery('')
                  }}
                >
                  <span>{place}</span>
                  {place === value && <span className="check-icon">✓</span>}
                </button>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-gray-400">
                Không tìm thấy tỉnh thành phù hợp
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function SearchBox({
  onSearch,
  initialFrom = 'TP. Hồ Chí Minh',
  initialTo = 'Đà Lạt',
  initialDate,
}: SearchBoxProps) {
  const places = [
    // Miền Nam & Đông Nam Bộ
    'TP. Hồ Chí Minh',
    'Bà Rịa - Vũng Tàu',
    'Bình Dương',
    'Đồng Nai',
    'Tây Ninh',
    'Bình Phước',

    // Tây Nguyên
    'Đà Lạt (Lâm Đồng)',
    'Bảo Lộc (Lâm Đồng)',
    'Buôn Ma Thuột (Đắk Lắk)',
    'Pleiku (Gia Lai)',
    'Kon Tum',
    'Gia Nghĩa (Đắk Nông)',

    // Duyên hải Nam Trung Bộ & Miền Trung
    'Nha Trang (Khánh Hòa)',
    'Cam Ranh (Khánh Hòa)',
    'Phan Thiết (Bình Thuận)',
    'Phan Rang (Ninh Thuận)',
    'Tuy Hòa (Phú Yên)',
    'Quy Nhơn (Bình Định)',
    'Quảng Ngãi',
    'Quảng Nam (Hội An)',
    'Đà Nẵng',
    'Huế (Thừa Thiên Huế)',
    'Quảng Trị',
    'Đồng Hới (Quảng Bình)',
    'Hà Tĩnh',
    'Vinh (Nghệ An)',
    'Thanh Hóa',

    // Miền Tây (Đồng bằng Sông Cửu Long)
    'Cần Thơ',
    'An Giang (Châu Đốc)',
    'Kiên Giang (Rạch Giá)',
    'Hà Tiên (Kiên Giang)',
    'Cà Mau',
    'Bạc Liêu',
    'Sóc Trăng',
    'Trà Vinh',
    'Bến Tre',
    'Vĩnh Long',
    'Tiền Giang (Mỹ Tho)',
    'Đồng Tháp (Cao Lãnh)',
    'Hậu Giang',

    // Miền Bắc
    'Hà Nội',
    'Hải Phòng',
    'Quảng Ninh (Hạ Long)',
    'Ninh Bình',
    'Nam Định',
    'Sa Pa (Lào Cai)',
  ]
  const [from, setFrom] = useState(initialFrom)
  const [to, setTo] = useState(initialTo)
  const today = new Date()
  const maxBookingDate = new Date()
  maxBookingDate.setDate(today.getDate() + 30)
  const asInputDate = (value: Date) => value.toISOString().slice(0, 10)
  const [date, setDate] = useState(initialDate || asInputDate(today))

  const swap = () => {
    setFrom(to)
    setTo(from)
  }

  const handleSearch = () => {
    onSearch(from, to, date)
  }

  return (
    <section className="search-panel relative z-10 mx-auto mt-8 max-w-[1140px] rounded-[28px] border border-white/15 p-3 shadow-2xl shadow-[#080b26]/50">
      <div className="grid gap-2 md:grid-cols-[1.1fr_42px_1.1fr_.85fr_auto]">
        <PlaceSelect
          label="Điểm đi"
          value={from}
          onChange={setFrom}
          options={places}
        />
        <button
          onClick={swap}
          type="button"
          aria-label="Đảo điểm đi và đến"
          className="swap hidden h-10 w-10 self-center rounded-full border border-white/15 text-violet-300 md:block"
        >
          ⇄
        </button>
        <PlaceSelect
          label="Điểm đến"
          value={to}
          onChange={setTo}
          options={places}
          excludeValue={from}
        />
        <label className="search-cell search-select">
          <span className="field-icon">▦</span>
          <div>
            <p>Ngày đi</p>
            <input
              type="date"
              value={date}
              min={asInputDate(today)}
              max={asInputDate(maxBookingDate)}
              onChange={(e) => setDate(e.target.value)}
            />
            <small>Trong 30 ngày tới</small>
          </div>
        </label>
        <Button onClick={handleSearch} className="min-h-16 px-7">
          Tìm chuyến <span>→</span>
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 px-2 pb-1 text-xs text-white/50">
        <span>Tuyến phổ biến:</span>
        {['Sài Gòn → Đà Lạt', 'Sài Gòn → Nha Trang', 'Đà Nẵng → Huế'].map(
          (route, index) => (
            <button
              type="button"
              onClick={() => {
                const [a, b] = route.split(' → ')
                setFrom(index === 0 || index === 1 ? 'TP. Hồ Chí Minh' : a)
                setTo(b)
              }}
              className="rounded-full border border-white/10 px-2.5 py-1 hover:border-violet-300/60 hover:text-violet-200"
              key={route}
            >
              {route}
            </button>
          ),
        )}
      </div>
    </section>
  )
}
