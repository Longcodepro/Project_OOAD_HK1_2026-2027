/**
 * @file DongSonSpinner.tsx
 * @description Biểu tượng Tải Trang Hoạt Họa Trống Đồng (Dong Son Loading Spinner).
 *
 * CÁC VÀNH HỌA TIẾT XOAY ĐỒNG TÂM:
 * 1. Vành răng cưa ngoài cùng (`s-saw`).
 * 2. Vành chấm tiếp tuyến ở giữa (`s-tan`).
 * 3. Ngôi sao trung tâm (`s-star`).
 */

interface DongSonSpinnerProps {
  /** Kích thước đường kính spinner (px hoặc chuỗi CSS, mặc định 48px) */
  size?: number | string
  /** Lớp CSS tùy biến */
  className?: string
  /** Nhãn chữ hiển thị bên dưới spinner */
  label?: string
}

/**
 * Spinner hiển thị trạng thái chờ tải dữ liệu mang phong cách họa tiết trống đồng Đông Sơn.
 */
export function DongSonSpinner({
  size = 48,
  className = '',
  label,
}: DongSonSpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2.5 ${className}`}>
      <svg
        viewBox="-100 -100 200 200"
        width={size}
        height={size}
        className="motif spinner text-bronze"
        aria-hidden="true"
      >
        {/* Vành răng cưa */}
        <g className="s-saw">
          <circle r="86" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="6 4" />
        </g>
        {/* Vành chấm tiếp tuyến */}
        <g className="s-tan">
          <circle r="60" fill="none" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4 8" />
          <circle r="50" fill="none" stroke="currentColor" strokeWidth="1" />
        </g>
        {/* Vành ngôi sao trung tâm */}
        <g className="s-star">
          <circle r="28" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 3" />
          <polygon
            points="0,-24 7,-8 24,-7 11,4 15,21 0,11 -15,21 -11,4 -24,-7 -7,-8"
            fill="currentColor"
            opacity="0.3"
          />
        </g>
      </svg>
      {label && (
        <span className="text-xs font-semibold text-ink-soft tracking-wider uppercase">
          {label}
        </span>
      )}
    </div>
  )
}
