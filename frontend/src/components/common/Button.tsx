/**
 * @file Button.tsx
 * @description Nút bấm tương tác đa dụng chuẩn giao diện VéXe Việt (Custom Button Component).
 *
 * BIẾN THỂ (Variants / Kinds):
 * - `primary`: Nút hành động chính màu đất nung (`cta-terracotta`), hiệu ứng hover đậm màu.
 * - `ghost`: Nút viền mỏng hairline, nền card nhẹ, hover viền màu đồng bronze.
 * - `secondary`: Nút phụ nền giấy trầm (`paper-deep`), viền hairline.
 * - `dark`: Nút nền tối (`ink`), chữ màu giấy (`paper`).
 */

import React from 'react'

export interface ButtonProps {
  /** Nội dung nhãn hoặc biểu tượng bên trong nút */
  children: React.ReactNode
  /** Callback kích hoạt khi người dùng nhấp chuột */
  onClick?: () => void
  /** Kiểu biến thể thị giác của nút */
  kind?: 'primary' | 'ghost' | 'dark' | 'secondary'
  /** Lớp CSS tùy biến bổ sung */
  className?: string
  /** Trạng thái vô hiệu hóa nút (mờ đục 50%, chặn tương tác) */
  disabled?: boolean
  /** Thuộc tính loại nút HTML ('button' | 'submit' | 'reset') */
  type?: 'button' | 'submit' | 'reset'
}

/**
 * Thành phần Nút bấm tiêu chuẩn dùng chung trong toàn bộ ứng dụng.
 */
export function Button({
  children,
  onClick,
  kind = 'primary',
  className = '',
  disabled = false,
  type = 'button',
}: ButtonProps) {
  const types = {
    primary: 'cta-terracotta hover:bg-terracotta-hover',
    ghost: 'border border-hairline bg-card text-ink hover:border-bronze hover:bg-paper-deep',
    secondary: 'border border-hairline bg-paper-deep text-ink hover:border-bronze',
    dark: 'bg-ink text-paper hover:bg-ink/85',
  }
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded px-5 py-2.5 text-sm font-semibold transition disabled:opacity-50 cursor-pointer ${types[kind]} ${className}`}
    >
      {children}
    </button>
  )
}
