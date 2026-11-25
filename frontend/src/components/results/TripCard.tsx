/**
 * @file TripCard.tsx
 * @description Thẻ hiển thị tóm tắt thông tin một chuyến xe trong danh sách kết quả tìm kiếm (Trip Search Result Card).
 *
 * THÔNG TIN HIỂN THỊ:
 * 1. Khung giờ & Thời lượng: Giờ xuất bến, giờ đến dự kiến và tổng thời gian di chuyển (ví dụ: "6 giờ 30 phút").
 * 2. Phương tiện vận chuyển: Dòng xe (Limousine, Giường nằm...), biển số xe kiểm soát.
 * 3. Giá vé & Tình trạng ghế: Giá vé niêm yết (VNĐ), số lượng ghế còn trống trên tổng số ghế xe.
 * 4. Nút hành động: "Chọn ghế" (chuyển sang SeatsPage) hoặc "Hết chỗ" (nếu số ghế trống <= 0).
 */

import type { Trip } from '../../types'

export interface TripCardProps {
  /** Dữ liệu chuyến xe */
  trip: Trip
  /** Callback kích hoạt khi bấm nút "Chọn ghế" */
  onSelectTrip: (trip: Trip) => void
}

export function TripCard({ trip, onSelectTrip }: TripCardProps) {
  return (
    <article className="bg-[#FFFDF9] border border-hairline p-5 rounded grid gap-4 lg:grid-cols-[160px_1fr_160px] lg:items-center hover:border-terracotta transition shadow-2xs group">
      {/* Cột 1: Giờ đi & Giờ đến */}
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-ink">{trip.time}</span>
          {trip.arrive && <span className="text-xs text-ink-soft">→ {trip.arrive}</span>}
        </div>
        {trip.duration && <p className="mt-1 text-xs text-terracotta font-semibold">{trip.duration}</p>}
      </div>

      {/* Cột 2: Loại xe & biển số */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-celadon bg-celadon/10 border border-celadon px-2.5 py-0.5 rounded">
          {trip.operator}
        </span>
        <span className="text-xs font-medium text-ink-soft bg-paper-deep px-2 py-0.5 rounded">
          Biển số {trip.plate}
        </span>
      </div>

      {/* Cột 3: Giá vé & Nút chọn */}
      <div className="flex items-center justify-between lg:block lg:text-right border-t lg:border-t-0 border-hairline pt-3 lg:pt-0">
        <div>
          <span className="text-xl font-black text-terracotta block">
            {trip.priceFormatted}
          </span>
          <p className="text-[11px] text-ink-soft">
            Còn <b className="text-ink font-semibold">{trip.seats}</b>/{trip.totalSeats} chỗ trống
          </p>
        </div>
        <button
          type="button"
          onClick={() => onSelectTrip(trip)}
          disabled={trip.seats <= 0}
          className="cta-terracotta px-4 py-2 text-xs font-bold text-paper rounded shadow-none hover:bg-terracotta-hover transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed lg:mt-2.5"
        >
          {trip.seats <= 0 ? 'Hết chỗ' : 'Chọn ghế'}
        </button>
      </div>
    </article>
  )
}
