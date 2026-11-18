/**
 * @file SeatItem.tsx
 * @description Thành phần biểu diễn một Vị trí Ghế ngồi / Giường nằm trên Sơ đồ xe (Seat Grid Cell).
 *
 * TRẠNG THÁI HIỂN THỊ:
 * 1. Ghế trống (Available): Nền giấy sáng, viền hairline, hiệu ứng hover viền màu đất nung (terracotta).
 * 2. Ghế đang chọn (Active): Nền màu đất nung nổi bật, chữ trắng, kèm chấm tròn xanh ngọc celadon ở góc trên.
 * 3. Ghế đang giữ / Đã bán (Unavailable/Held): Nền xám mờ, con trỏ `not-allowed`, tooltip giải thích rõ
 *    "Ghế đang được giữ" (held) hay "Ghế đã có người đặt" (booked).
 */

export interface SeatItemProps {
  /** Nhãn định danh ghế (ví dụ: "A01", "B04") */
  label: string
  /** Ghế đang được hành khách chọn */
  active?: boolean
  /** Ghế không khả dụng (đã bán hoặc đang bị người khác giữ) */
  unavailable?: boolean
  /** Ghế đang được giữ tạm thời bởi phiên khác */
  held?: boolean
  /** Callback khi nhấp chọn ghế */
  onClick?: () => void
}

export function SeatItem({
  label,
  active,
  unavailable,
  held,
  onClick,
}: SeatItemProps) {
  let stateClasses = 'bg-[#FFFDF9] text-ink border-hairline hover:border-terracotta hover:bg-paper-deep/40'

  if (active) {
    stateClasses = 'bg-terracotta text-paper border-terracotta font-bold shadow-xs'
  } else if (unavailable) {
    stateClasses = 'bg-paper-deep/50 text-ink-soft/40 border-hairline/50 cursor-not-allowed'
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={unavailable}
      className={`relative flex flex-col items-center justify-center p-2 rounded border text-xs font-medium transition cursor-pointer min-h-[52px] ${stateClasses}`}
      title={unavailable ? (held ? `Ghế ${label} đang được giữ` : `Ghế ${label} đã có người đặt`) : `Ghế ${label}`}
    >
      <span className="material-symbols-outlined text-base leading-none mb-0.5 opacity-80">
        airline_seat_recline_extra
      </span>
      <span className="font-bold tracking-tight">{label}</span>
      {active && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-celadon border-2 border-paper" />
      )}
    </button>
  )
}
