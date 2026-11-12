export interface FilterOptions {
  earlyMorning: boolean // 00:00 - 06:00
  morning: boolean      // 06:00 - 12:00
  afternoon: boolean    // 12:00 - 18:00
  evening: boolean      // 18:00 - 24:00
}

export interface FilterSidebarProps {
  filters: FilterOptions
  onFilterChange: (filters: FilterOptions) => void
}

export function FilterSidebar({ filters, onFilterChange }: FilterSidebarProps) {
  const handleChange = (key: keyof FilterOptions, value: boolean) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const handleReset = () => {
    onFilterChange({
      earlyMorning: true,
      morning: true,
      afternoon: true,
      evening: true,
    })
  }

  return (
    <aside className="w-full bg-[#FFFDF9] border border-hairline p-5 rounded space-y-5 shadow-2xs">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <span className="text-[11px] font-bold tracking-widest text-ink uppercase">
          BỘ LỌC CHUYẾN XE
        </span>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs font-semibold text-terracotta hover:underline cursor-pointer"
        >
          Đặt lại
        </button>
      </div>

      {/* Khoảng giờ xuất bến (4 khung giờ đầy đủ) */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-ink block">Giờ khởi hành</span>
        <div className="space-y-2.5 text-xs text-ink">
          <label className="flex items-center gap-2.5 cursor-pointer hover:text-terracotta transition">
            <input
              type="checkbox"
              checked={filters.earlyMorning}
              onChange={(e) => handleChange('earlyMorning', e.target.checked)}
              className="w-4 h-4 rounded border-hairline accent-terracotta"
            />
            <span>Sáng sớm (00:00 đến 06:00)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer hover:text-terracotta transition">
            <input
              type="checkbox"
              checked={filters.morning}
              onChange={(e) => handleChange('morning', e.target.checked)}
              className="w-4 h-4 rounded border-hairline accent-terracotta"
            />
            <span>Buổi sáng (06:00 đến 12:00)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer hover:text-terracotta transition">
            <input
              type="checkbox"
              checked={filters.afternoon}
              onChange={(e) => handleChange('afternoon', e.target.checked)}
              className="w-4 h-4 rounded border-hairline accent-terracotta"
            />
            <span>Buổi chiều (12:00 đến 18:00)</span>
          </label>

          <label className="flex items-center gap-2.5 cursor-pointer hover:text-terracotta transition">
            <input
              type="checkbox"
              checked={filters.evening}
              onChange={(e) => handleChange('evening', e.target.checked)}
              className="w-4 h-4 rounded border-hairline accent-terracotta"
            />
            <span>Buổi tối (18:00 đến 24:00)</span>
          </label>
        </div>
      </div>

      {/* Cam kết hệ thống */}
      <div className="border-t border-hairline pt-4 space-y-2 text-xs text-ink-soft">
        <span className="text-[11px] font-bold text-ink uppercase tracking-wider block">
          Cam kết dịch vụ
        </span>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-celadon">check_circle</span>
          <span>Chọn đúng ghế bạn muốn</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-bronze">timer</span>
          <span>Giữ chỗ tạm thời khi đặt vé</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-sm text-terracotta">currency_exchange</span>
          <span>Hoàn tiền theo thời điểm hủy</span>
        </div>
      </div>
    </aside>
  )
}
