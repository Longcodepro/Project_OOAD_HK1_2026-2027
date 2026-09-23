import { useState } from 'react'

export interface FilterOptions {
  morning: boolean
  afternoon: boolean
  evening: boolean
}

export interface FilterSidebarProps {
  onFilterChange?: (filters: FilterOptions) => void
}

export function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    morning: true,
    afternoon: true,
    evening: true,
  })

  const handleChange = (key: keyof FilterOptions, value: boolean) => {
    const updated = { ...filters, [key]: value }
    setFilters(updated)
    onFilterChange?.(updated)
  }

  return (
    <aside className="hidden lg:block">
      <div className="flex items-center justify-between mb-5">
        <p className="font-mono text-xs tracking-widest text-white/50">BỘ LỌC CHUYẾN</p>
        <button
          type="button"
          onClick={() => {
            const reset = { morning: true, afternoon: true, evening: true }
            setFilters(reset)
            onFilterChange?.(reset)
          }}
          className="text-[11px] text-violet-300 hover:text-white transition"
        >
          Đặt lại
        </button>
      </div>

      <div className="border-y border-white/10 py-5">
        <div className="flex justify-between text-sm">
          <b>Khoảng giờ xuất phát</b>
          <span className="text-violet-300">▼</span>
        </div>
        <div className="mt-4 space-y-3 text-sm text-white/60">
          <label className="flex items-center gap-2 cursor-pointer hover:text-white transition">
            <input
              type="checkbox"
              checked={filters.morning}
              onChange={(e) => handleChange('morning', e.target.checked)}
              className="accent-violet-400 rounded"
            />
            <span>Sáng (06:00 — 12:00)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-white transition">
            <input
              type="checkbox"
              checked={filters.afternoon}
              onChange={(e) => handleChange('afternoon', e.target.checked)}
              className="accent-violet-400 rounded"
            />
            <span>Chiều (12:00 — 18:00)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer hover:text-white transition">
            <input
              type="checkbox"
              checked={filters.evening}
              onChange={(e) => handleChange('evening', e.target.checked)}
              className="accent-violet-400 rounded"
            />
            <span>Đêm (18:00 — 24:00 & sáng sớm)</span>
          </label>
        </div>
      </div>
    </aside>
  )
}
